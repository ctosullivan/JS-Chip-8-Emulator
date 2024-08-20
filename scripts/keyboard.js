class Keyboard {
  constructor() {
    this.KEYMAP = {
      1: 0x1, // 1
      2: 0x2, // 2
      3: 0x3, // 3
      4: 0xc, // 4
      q: 0x4, // Q
      w: 0x5, // W
      W: 0x5, // W
      e: 0x6, // E
      E: 0x6, // E
      r: 0xd, // R
      R: 0xd, // R
      a: 0x7, // A
      A: 0x7, // A
      s: 0x8, // S
      S: 0x8, // S
      d: 0x9, // D
      D: 0x9, // D
      f: 0xe, // F
      F: 0xe, // F
      z: 0xa, // Z
      Z: 0xa, // Z
      x: 0x0, // X
      X: 0x0, // X
      c: 0xb, // C
      C: 0xb, // C
      v: 0xf, // V
      V: 0xf, // V
    };

    this.keysPressed = [];

    // Some Chip-8 instructions require waiting for the next keypress. We will initialise this function elsewhere when needed

    this.onNextKeyPress = null;

    // Add event listeners for handling keyboard input
    // Firstly keydown listener is defined - callback is called onKeyDown in tutorial
    window.addEventListener(
      "keydown",
      (e) => {
        let key = this.KEYMAP[e.key];
        this.keysPressed[key] = true;
        console.log(key, typeof key);
        // Make sure onNextKeyPressed is initialised & pressed key actually maps to a Chip-8 key
        // May have been an error in the original code as value of x key would be 0 which is falsy
        if (this.onNextKeyPress !== null && key !== undefined) {
          this.onNextKeyPress(parseInt(key));
          this.onNextKeyPress = null;
        }
      },
      false
    );

    // /keyup listener is defined - callback is called onKeyUp in tutorial doc
    window.addEventListener(
      "keyup",
      (e) => {
        let key = this.KEYMAP[e.key];
        this.keysPressed[key] = false;
      },
      false
    );
  }
  // Add function to check if a certain key is pressed

  isKeyPressed(keyCode) {
    return this.keysPressed[keyCode];
  }
}

export default Keyboard;
