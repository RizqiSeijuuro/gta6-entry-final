// input.js — owns keyboard state. One module tracks which keys are currently held
// (and single-press "just pressed" edges), everyone else reads it; nobody else
// registers a keydown/keyup listener.

const held = new Set();
const justPressed = new Set();

export function initInput() {
  window.addEventListener('keydown', (e) => {
    if (!held.has(e.code)) justPressed.add(e.code);
    held.add(e.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    held.delete(e.code);
  });
}

export function isDown(code) {
  return held.has(code);
}

export function wasPressed(code) {
  if (justPressed.has(code)) {
    justPressed.delete(code);
    return true;
  }
  return false;
}

// Convenience combined axes for movement, -1..1 each.
export function axis() {
  let x = 0, y = 0;
  if (isDown('KeyA') || isDown('ArrowLeft')) x -= 1;
  if (isDown('KeyD') || isDown('ArrowRight')) x += 1;
  if (isDown('KeyW') || isDown('ArrowUp')) y -= 1;
  if (isDown('KeyS') || isDown('ArrowDown')) y += 1;
  return { x, y };
}
