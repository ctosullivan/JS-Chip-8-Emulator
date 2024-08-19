class CPU {
  constructor(renderer, keyboard, speaker) {
    this.renderer = renderer;
    this.keyboard = keyboard;
    this.speaker = speaker;

    // 4Kb (4,096 bytes) of memory
    this.memory = new Uint8Array(4096);

    // 16 8-bit registers
    this.v = new Uint8Array(16);

    // variable to store memory addresses - set this to zero since we aren't currently storing anything at initilization
    this.i = 0;

    // Timers
    this.delayTimer = 0;
    this.soundTimer = 0;

    // Program counter. Stores the currently executing address
    this.pc = 0x200;

    // Stack - don't initialize this with a size to avoid empty results
    this.stack = new Array();

    // Some instructions require pausing, such as Fx0A
    this.paused = false;

    this.speed = 10;
  }
  loadSpritesIntoMemory() {
    const sprites = [
      0xf0,
      0x90,
      0x90,
      0x90,
      0xf0, // 0
      0x20,
      0x60,
      0x20,
      0x20,
      0x70, // 1
      0xf0,
      0x10,
      0xf0,
      0x80,
      0xf0, // 2
      0xf0,
      0x10,
      0xf0,
      0x10,
      0xf0, // 3
      0x90,
      0x90,
      0xf0,
      0x10,
      0x10, // 4
      0xf0,
      0x80,
      0xf0,
      0x10,
      0xf0, // 5
      0xf0,
      0x80,
      0xf0,
      0x90,
      0xf0, // 6
      0xf0,
      0x10,
      0x20,
      0x40,
      0x40, // 7
      0xf0,
      0x90,
      0xf0,
      0x90,
      0xf0, // 8
      0xf0,
      0x90,
      0xf0,
      0x10,
      0xf0, // 9
      0xf0,
      0x90,
      0xf0,
      0x90,
      0x90, // A
      0xe0,
      0x90,
      0xe0,
      0x90,
      0xe0, // B
      0xf0,
      0x80,
      0x80,
      0x80,
      0xf0, // C
      0xe0,
      0x90,
      0x90,
      0x90,
      0xe0, // D
      0xf0,
      0x80,
      0xf0,
      0x80,
      0xf0, // E
      0xf0,
      0x80,
      0xf0,
      0x80,
      0x80, // F
    ];

    // According to the technical reference, sprites are stored in the interpreter section of memory starting at hex 0x000

    for (let i = 0; i < sprites.length; i++) {
      this.memory[i] = sprites[i];
    }
  }

  loadProgramIntoMemory(program) {
    for (let loc = 0; loc < program.length; loc++) {
      this.memory[0x200 + loc] = program[loc];
    }
  }
  loadRom(romName) {
    var request = new XMLHttpRequest();
    var self = this;

    // Handles response received from sending our request - request.send()
    request.onload = function () {
      // If the request response has context
      if (request.response) {
        // Store the contents of the response in an 8-bit array
        let program = new Uint8Array(request.response);

        // Load the rom program into memory
        self.loadProgramIntoMemory(program);
      }
    };

    // Initialize a GET request to retrieve the ROM from our request.open('GET', '/roms' + romName);
    request.open("GET", "roms/" + romName);
    request.responseType = "arraybuffer";

    // Send the GET request
    request.send();
  }
  cycle() {
    for (let i = 0; i < this.speed; i++) {
      if (!this.paused) {
        let opcode = (this.memory[this.pc] << 8) | this.memory[this.pc + 1];
        this.executeInstruction(opcode);
      }
    }
    if (!this.paused) {
      this.updateTimers();
    }
    this.playSound();
    this.renderer.render();
  }

  updateTimers() {
    if (this.delayTimer > 0) {
      this.delayTimer -= 1;
    }
    if (this.soundTimer > 0) {
      this.soundTimer -= 1;
    }
  }
  playSound() {
    if (this.soundTimer > 0) {
      this.speaker.play(440);
    } else {
      this.speaker.stop();
    }
  }
  executeInstruction(opcode) {
    this.pc += 2;
    // We only need the 2nd nibble, so grab the value of the 2nd nibble and shift it right 8 bits to get rid of everything but that 2nd nibble

    let x = (opcode & 0x0f00) >> 8;
    // We only need the 3rd nibble, so grab the value of the 3rd nibble and shift it right 4 bits to get rid of everything but that 3rd nibble
    let y = (opcode & 0x00f0) >> 4;

    switch (opcode & 0xf000) {
      case 0x0000:
        switch (opcode) {
          case 0x00e0:
            // 00E0 - CLS - clear display
            this.renderer.clear();
            break;
          case 0x00ee:
            // 00EE - RET - pop the last element in the stack array and store it in this.pc - return from subroutine. Spec says to subtract 1 from SP, however can ignore this as it is handled by the stack array
            this.pc = this.stack.pop();
            break;
        }

        break;
      case 0x1000:
        // 1nnn - JP addr - set the pc to the value stored in nnn
        this.pc = opcode & 0xfff;
        break;
      case 0x2000:
        // 2nnn - CALL addr - push pc onto stack
        this.stack.push(this.pc);
        this.pc = opcode & 0xfff;
        break;
      case 0x3000:
        // 3xkk - SE Vx, byte - compare value in x register to value of kk -> if they are equal we increment the pc by 2, effectively skipping the next instruction
        if (this.v[x] === (opcode & 0xff)) {
          this.pc += 2;
        }
        break;
      case 0x4000:
        // 4xkk - SNE Vx, byte - similar to 3xkk, but instead skips the next instruction if vx and kk are NOT equal
        if (this.v[x] !== (opcode & 0xff)) {
          this.pc += 2;
        }
        break;
      case 0x5000:
        // 5xy0 - SE Vx, Vy -> will skip the next instruction if Vx is equal to Vy
        if (this.v[x] === this.v[y]) {
          this.pc += 2;
        }
        break;
      case 0x6000:
        // 6xkk - LD Vx, byte -> instruction set the value of Vx to the value of kk
        this.v[x] = opcode & 0xff;
        break;
      case 0x7000:
        // 7xkk - ADD Vx, byte -> instruction adds kk to Vx
        this.v[x] += opcode & 0xff;
        break;
      case 0x8000:
        switch (opcode & 0xf) {
          case 0x0:
            // last nibble is 0 - 8xy0 - LD Vx, Vy -> Vx is set to the value of Vy
            this.v[x] = this.v[y];
            break;
          case 0x1:
            // last nibble is 1 - 8xy1 - OR Vx, Vy -> Sets Vx to the value of bitwise Vx OR Vy
            this.v[x] |= this.v[y];
            break;
          case 0x2:
            // last nibble is 2 - 8xy2 - AND Vx, Vy -> Sets Vx to the value of bitwise Vx AND Vy
            this.v[x] &= this.v[y];
            break;
          case 0x3:
            // last nibble is 3 -8xy3 - XOR Vx, Vy -> Sets Vx to the value of bitwise Vx XOR Vy
            this.v[x] ^= this.v[y];
            break;
          case 0x4:
            // last nibble is 4 -8xy4 - ADD Vx, Vy -> Sets Vx to sum of Vx + Vy -> if the result is greater than 8 bits (i.e. >255), Vf is set to 1, otherwise 0. Only the lowest 8 bits of the result are kept, and stored in Vx
            let sum = (this.v[x] += this.v[y]);
            this.v[0xf] = 0;
            if (sum > 0xff) {
              this.v[0xf] = 1;
            }
            this.v[x] = sum;
            break;
          case 0x5:
            // 8xy SUB Vx Vy -> instruction subtracts Vy from Vx. Only the lowest 8 bits of the result are kept, and stored in Vx.
            // As this.v is a Uint8array, any value over 8 bits automatically has the lower 8 bits taken & stored in the array
            this.v[0xf] = 0;

            if (this.v[x] > this.v[y]) {
              this.v[0xf] = 1;
            }
            this.v[x] -= this.v[y];
            break;
          case 0x6:
            // 8xy6 - SHR Vx {Vy}
            // First line determines the least significant bit and sets F accordingly
            this.v[0xf] = this.v[x] & 0x1;
            this.v[x] >>= 1;
            break;
          case 0x7:
            // 8xy7 - SUBN Vx, Vy -> Subtracts Vx from Vy and stores the result in Vx. If Vy is larger than Vx, we need to store 1 in Vf, otherwise we store 0
            this.v[0xf] = 0;
            if (this.v[y] > this.v[x]) {
              this.v[0xf] = 1;
            }
            this.v[x] = this.v[y] - this.v[x];
            break;
          case 0xe:
            // 8xyE - SHL Vx {Vy} -> Shifts Vx left 1, but also sets VF to either 1 or 0 depending on if a condition is met.
            // First line of code is grabbing the most significant bit of Vx and storing that in Vy
            this.v[0xf] = this.v[x] & 0x80;
            this.v[x] <<= 1;
            break;
        }

        break;
      case 0x9000:
        // 9xy0 - SNE Vx, Vy -> This instruction simply increments the PC by 2 if Vx and Vy are not equal
        if (this.v[x] !== this.v[y]) {
          this.pc += 2;
        }
        break;
      case 0xa000:
        // Annn - LD I, addr
        // Sets the value of register I to nnn -> if the opcode is 0xA740 then (opcode & 0xFFF) will return 0x740)
        this.i = opcode & 0xfff;
        break;
      case 0xb000:
        // Bnnn - JP V0, addr
        // Sets the PC to nnn plus the value of register 0 (V0)
        this.pc = (opcode & 0xfff) + this.v[0];
        break;
      case 0xc000:
        // Generate a random number in the range 0-255 and then AND that with the lowest byte of the opcode
        let rand = Math.floor(Math.random() * 0xff);
        this.v[x] = rand & (opcode & 0xff);
        break;
      case 0xd000:
        // Dxyn - DRW Vx, Vy, nibble -> handles drawing of pixels on screen
        let width = 8;
        let height = opcode & 0xf;
        this.v[0xf] = 0;

        for (let row = 0; row < height; row++) {
          let sprite = this.memory[this.i + row];

          for (let col = 0; col < width; col++) {
            // If the leftmost bit (of sprite) is not 0, render/erase the pixel
            if ((sprite & 0x80) > 0) {
              // If setPixel returns 1, which means a pixel was erased, set Vf to 1
              if (this.renderer.setPixel(this.v[x] + col, this.v[y] + row)) {
                this.v[0xf] = 1;
              }
            }
            // Shift the sprite left 1. This will move the next col/bit of the sprite into the first position.
            // Ex. 10010000 << 1 will become 00010000
            sprite <<= 1;
          }
        }
        break;
      case 0xe000:
        switch (opcode & 0xff) {
          case 0x9e:
            // Ex9E SKP Vx -> Skips next instruction if key stored in Vx is pressed by incrementing PC by 2
            if (this.keyboard.isKeyPressed(this.v[x])) {
              this.pc += 2;
            }
            break;
          case 0xa1:
            // ExA1 - SKNP Vx -> Does the opposite of previous instruction -> if specified key is not pressed, skip next instruction
            if (!this.keyboard.isKeyPressed(this.v[x])) {
              this.pc += 2;
            }
            break;
        }

        break;
      case 0xf000:
        switch (opcode & 0xff) {
          case 0x07:
            // Fx07 - LD Vx, DT => Sets Vx to the value stored in Delay Timer
            this.v[x] = this.delayTimer;
            break;
          case 0x0a:
            // Fx0A - LD Vx, K -> This instruction pauses the emulator until a key is pressed
            this.paused = true;

            this.keyboard.onNextKeyPress = function (key) {
              this.v[x] = key;
              this.paused = false;
            }.bind(this);
            break;
          case 0x15:
            // Fx15 - LD DT, Vx -> sets value of delay timer to value stored in register Vx
            this.delayTimer = this.v[x];
            break;
          case 0x18:
            // Fx18 - LD ST, Vx -> similar to Fx15 but sets the sound timer to Vx instead of delay timer
            this.soundTimer = this.v[x];
            break;
          case 0x1e:
            // Fx1E - ADD I, Vx -> Add Vx to I
            this.i += this.v[x];
            break;
          case 0x29:
            // FX29 - LD F, Vx - Add I, Vx -> setting I to the location of sprite at Vx -> multiplied by 5 because each sprite is 5 bytes long
            this.i = this.v[x] * 5;
            break;
          case 0x33:
            // Fx33 - LD B, Vx -> Grab the hundreds, tens and ones from register v and store them in registers I, I+1, I+2 respectively

            // Get the hundreds digit and place it in I.
            this.memory[this.i] = parseInt(this.v[x] / 100);

            // Get the tens digit and place it in I+1. Gets a value between 0 and 99
            this.memory[this.i + 1] = parseInt((this.v[x] % 100) / 10);

            // Get the value of ones (last) digit and place it in I+2.
            this.memory[this.i + 2] = parseInt(this.v[x] % 10);
            break;
          case 0x55:
            // Fx55 - LD [I], Vx -> In this instruction we are looping through registers V0 through Vx and storing them in memory starting at I
            for (let registerIndex = 0; registerIndex <= x; registerIndex++) {
              this.memory[this.i + registerIndex] = this.v[registerIndex];
            }
            break;
          case 0x65:
            // Fx65 - LD Vx, [I] - opposite of Fx55 -> reads values from memory starting at I and stores them in registers V0 through Vx
            for (let registerIndex = 0; registerIndex <= x; registerIndex++) {
              this.v[registerIndex] = this.memory[this.i + registerIndex];
            }
            break;
        }

        break;

      default:
        throw new Error("Unknown opcode " + opcode);
    }
  }
}

export default CPU;
