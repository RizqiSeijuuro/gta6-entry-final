// car.js — owns drivable vehicles: simple arcade driving physics (acceleration,
// braking, turning, a speed cap and light drift), entering/exiting, and drawing
// cars. Spawns a small fixed set of cars scattered around the city for the player
// (and later, police) to use.

import { collidesWithBuildings, clampToWorld, pushOutOfBuildings } from './city.js';
import { isDown } from './input.js';

const ACCEL = 260; // px/s^2
const BRAKE = 420;
const FRICTION = 90; // natural deceleration px/s^2
const MAX_SPEED = 340;
const REVERSE_MAX = 140;
const TURN_RATE = 2.6; // rad/s at speed

export function createCar(x, y, color = '#c2432b') {
  return {
    x, y,
    w: 34, h: 18,
    angle: 0,
    speed: 0, // signed: + forward, - reverse
    color,
    occupied: false,
    isPolice: false,
  };
}

export function spawnCityCars() {
  const spots = [
    [360, 420, '#c2432b'],
    [1718, 250, '#2b6fc2'],
    [500, 1200, '#3fae5a'],
    [1800, 1460, '#c2a62b'],
    [1100, 760, '#8e4fc2'],
  ];
  return spots.map(([x, y, c]) => createCar(x, y, c));
}

export function tryEnterNearestCar(player, cars, maxDist = 50) {
  if (player.inCar) return false;
  let nearest = null;
  let best = maxDist;
  for (const car of cars) {
    if (car.occupied) continue;
    const d = Math.hypot(car.x - player.x, car.y - player.y);
    if (d < best) { best = d; nearest = car; }
  }
  if (!nearest) return false;
  nearest.occupied = true;
  player.inCar = nearest;
  return true;
}

export function exitCar(player) {
  if (!player.inCar) return;
  const car = player.inCar;
  car.occupied = false;
  player.x = car.x + Math.cos(car.angle + Math.PI / 2) * 30;
  player.y = car.y + Math.sin(car.angle + Math.PI / 2) * 30;
  player.inCar = null;
}

export function updatePlayerCar(player, dt) {
  const car = player.inCar;
  if (!car) return;

  const forward = isDown('KeyW') || isDown('ArrowUp');
  const backward = isDown('KeyS') || isDown('ArrowDown');
  const left = isDown('KeyA') || isDown('ArrowLeft');
  const right = isDown('KeyD') || isDown('ArrowRight');

  if (forward) car.speed += ACCEL * dt;
  else if (backward) car.speed -= BRAKE * dt;
  else {
    // Natural friction toward 0.
    if (car.speed > 0) car.speed = Math.max(0, car.speed - FRICTION * dt);
    else if (car.speed < 0) car.speed = Math.min(0, car.speed + FRICTION * dt);
  }
  car.speed = Math.max(-REVERSE_MAX, Math.min(MAX_SPEED, car.speed));

  const turnFactor = Math.min(1, Math.abs(car.speed) / 80);
  if (left) car.angle -= TURN_RATE * dt * turnFactor * (car.speed < 0 ? -1 : 1);
  if (right) car.angle += TURN_RATE * dt * turnFactor * (car.speed < 0 ? -1 : 1);

  const dx = Math.cos(car.angle) * car.speed * dt;
  const dy = Math.sin(car.angle) * car.speed * dt;

  const radius = 16;
  const tryX = car.x + dx;
  if (!collidesWithBuildings(tryX, car.y, radius)) car.x = tryX;
  else car.speed *= 0.3;
  const tryY = car.y + dy;
  if (!collidesWithBuildings(car.x, tryY, radius)) car.y = tryY;
  else car.speed *= 0.3;

  const clamped = clampToWorld(car.x, car.y, radius);
  car.x = clamped.x;
  car.y = clamped.y;
  const unstuck = pushOutOfBuildings(car.x, car.y, radius);
  car.x = unstuck.x;
  car.y = unstuck.y;

  player.x = car.x;
  player.y = car.y;
}

export function drawCar(ctx, car, cam) {
  const x = car.x - cam.x;
  const y = car.y - cam.y;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(car.angle);
  ctx.fillStyle = car.color;
  ctx.fillRect(-car.w / 2, -car.h / 2, car.w, car.h);
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(-car.w / 2, -car.h / 2, car.w, car.h);
  // windshield
  ctx.fillStyle = 'rgba(200,230,255,0.7)';
  ctx.fillRect(car.w / 2 - 10, -car.h / 2 + 3, 6, car.h - 6);
  if (car.isPolice) {
    ctx.fillStyle = Math.sin(performance.now() / 100) > 0 ? '#3355ff' : '#ff3333';
    ctx.fillRect(-4, -car.h / 2 - 3, 8, 3);
  }
  ctx.restore();
}
