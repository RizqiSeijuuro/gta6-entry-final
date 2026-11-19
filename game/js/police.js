// police.js — owns the wanted-level system and police chase behaviour: tracking
// wanted stars, spawning police cars/officers when wanted > 0, and chasing/catching
// the player. Other modules call raiseWanted() when the player commits a crime;
// this module decides what the police do about it.

import { createCar, drawCar } from './car.js';
import { collidesWithBuildings, clampToWorld, pushOutOfBuildings } from './city.js';

export function createWantedState() {
  return {
    level: 0, // 0-5 stars
    maxLevel: 5,
    decayTimer: 0,
    units: [], // active police cars chasing
  };
}

export function raiseWanted(state, amount = 1) {
  state.level = Math.min(state.maxLevel, state.level + amount);
  state.decayTimer = 8; // seconds of no new crime before it starts cooling
}

const POLICE_SPEED = 230;
const CATCH_DIST = 24;

export function updateWanted(state, player, dt, worldSpawnFn) {
  if (state.level > 0) {
    state.decayTimer -= dt;
    if (state.decayTimer <= 0 && state.units.length === 0) {
      state.level = Math.max(0, state.level - 1);
      state.decayTimer = 6;
    }
  }

  const desiredUnits = state.level;
  if (state.units.length < desiredUnits && state.level > 0) {
    const spot = worldSpawnFn();
    const car = createCar(spot.x, spot.y, '#1f3a8f');
    car.isPolice = true;
    car.angle = Math.random() * Math.PI * 2;
    state.units.push(car);
  }
  if (state.level === 0 && state.units.length > 0) {
    state.units.length = 0; // chase called off
  }

  let caughtPlayer = false;
  for (const car of state.units) {
    const dx = player.x - car.x;
    const dy = player.y - car.y;
    const dist = Math.hypot(dx, dy);
    car.angle = Math.atan2(dy, dx);
    const speed = POLICE_SPEED * (0.85 + 0.15 * Math.min(1, state.level / 5));
    const moveX = Math.cos(car.angle) * speed * dt;
    const moveY = Math.sin(car.angle) * speed * dt;
    const tryX = car.x + moveX;
    const tryY = car.y + moveY;
    if (!collidesWithBuildings(tryX, car.y, 16)) car.x = tryX;
    if (!collidesWithBuildings(car.x, tryY, 16)) car.y = tryY;
    const clamped = clampToWorld(car.x, car.y, 16);
    car.x = clamped.x;
    car.y = clamped.y;
    const unstuck = pushOutOfBuildings(car.x, car.y, 16);
    car.x = unstuck.x;
    car.y = unstuck.y;
    if (dist < CATCH_DIST) caughtPlayer = true;
  }
  return caughtPlayer;
}

export function drawPolice(ctx, state, cam) {
  for (const car of state.units) drawCar(ctx, car, cam);
}
