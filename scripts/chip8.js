import Renderer from "./renderer.js";
import Keyboard from "./keyboard.js";
import Speaker from "./speaker.js";
import CPU from "./cpu.js";

const renderer = new Renderer(10);
const keyboard = new Keyboard();
const speaker = new Speaker();
const cpu = new CPU(renderer, keyboard, speaker);

let loop;
let fps = 60,
  fpsInterval,
  startTime,
  now,
  then,
  elapsed;

function init() {
  fpsInterval = 1000 / fps;
  then = Date.now();
  startTime = then;

  cpu.loadSpritesIntoMemory();
  cpu.loadRom("RPS.ch8");
  window.requestAnimationFrame(step);
}

function step() {
  now = Date.now();
  elapsed = now - then;

  if (elapsed > fpsInterval) {
    // Cycle the CPU
    cpu.cycle();
  }

  window.requestAnimationFrame(step);
}

init();
