// player.js — owns the player's on-foot state and movement: position, facing,
// health, walk/sprint speed and collision against buildings/world bounds. Driving
// physics live in car.js; this module only knows "am I in a car or not".

import { collidesWithBuildings, clampToWorld, pushOutOfBuildings } from './city.js';
import { axis, isDown } from './input.js';

export function createPlayer() {
  return {
    x: 300,
    y: 300,
    radius: 10,
    angle: 0,
    health: 100,
    maxHealth: 100,
    cash: 150,
    speed: 0,
    inCar: null, // set to a Car instance when driving
  };
}

const WALK_SPEED = 130; // px/s
const SPRINT_SPEED = 220;

export function updatePlayer(player, dt) {
  if (player.inCar) return; // car.js moves the player while driving

  const a = axis();
  if (a.x === 0 && a.y === 0) {
    player.speed = 0;
    return;
  }
  const len = Math.hypot(a.x, a.y) || 1;
  const nx = a.x / len;
  const ny = a.y / len;
  const sprinting = isDown('ShiftLeft') || isDown('ShiftRight');
  const spd = sprinting ? SPRINT_SPEED : WALK_SPEED;
  player.speed = spd;
  player.angle = Math.atan2(ny, nx);

  const dx = nx * spd * dt;
  const dy = ny * spd * dt;

  const tryX = player.x + dx;
  if (!collidesWithBuildings(tryX, player.y, player.radius)) player.x = tryX;
  const tryY = player.y + dy;
  if (!collidesWithBuildings(player.x, tryY, player.radius)) player.y = tryY;

  const clamped = clampToWorld(player.x, player.y, player.radius);
  player.x = clamped.x;
  player.y = clamped.y;
  const unstuck = pushOutOfBuildings(player.x, player.y, player.radius);
  player.x = unstuck.x;
  player.y = unstuck.y;
}

export function drawPlayer(ctx, player, cam) {
  if (player.inCar) return; // drawn as part of the car
  const x = player.x - cam.x;
  const y = player.y - cam.y;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(player.angle);
  ctx.fillStyle = '#ffd76a';
  ctx.beginPath();
  ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8a6a1a';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Facing nub.
  ctx.fillStyle = '#8a6a1a';
  ctx.beginPath();
  ctx.arc(player.radius - 3, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function damagePlayer(player, amount) {
  player.health = Math.max(0, player.health - amount);
  return player.health <= 0;
}

export function healPlayer(player, amount) {
  player.health = Math.min(player.maxHealth, player.health + amount);
}
