// pedestrians.js — owns wandering NPC pedestrians: spawning, autonomous random-walk
// movement, and drawing. Pedestrians don't interact with missions or police; they're
// background life for the city and a thing the player can (accidentally) bump.

import { collidesWithBuildings, clampToWorld, WORLD_W, WORLD_H } from './city.js';

export function spawnPedestrians(count = 24) {
  const peds = [];
  for (let i = 0; i < count; i++) {
    peds.push({
      x: 100 + Math.random() * (WORLD_W - 200),
      y: 100 + Math.random() * (WORLD_H - 200),
      radius: 7,
      angle: Math.random() * Math.PI * 2,
      speed: 25 + Math.random() * 35,
      wanderTimer: Math.random() * 2,
      color: PED_COLORS[Math.floor(Math.random() * PED_COLORS.length)],
      knocked: 0,
    });
  }
  return peds;
}

const PED_COLORS = ['#7fa8d6', '#d67f9c', '#9cd67f', '#d6c27f', '#b07fd6', '#7fd6c2'];

export function updatePedestrians(peds, dt) {
  for (const p of peds) {
    if (p.knocked > 0) {
      p.knocked -= dt;
      continue;
    }
    p.wanderTimer -= dt;
    if (p.wanderTimer <= 0) {
      p.angle += (Math.random() - 0.5) * 2.4;
      p.wanderTimer = 1 + Math.random() * 2;
    }
    const dx = Math.cos(p.angle) * p.speed * dt;
    const dy = Math.sin(p.angle) * p.speed * dt;
    const tryX = p.x + dx;
    const tryY = p.y + dy;
    if (collidesWithBuildings(tryX, p.y, p.radius) || collidesWithBuildings(p.x, tryY, p.radius)) {
      p.angle += Math.PI / 2 + Math.random();
      continue;
    }
    p.x = tryX;
    p.y = tryY;
    const clamped = clampToWorld(p.x, p.y, p.radius);
    p.x = clamped.x;
    p.y = clamped.y;
  }
}

export function knockPedestriansNear(peds, x, y, radius) {
  for (const p of peds) {
    if (Math.hypot(p.x - x, p.y - y) < radius) {
      p.knocked = 1.2;
      p.angle += Math.PI;
    }
  }
}

export function drawPedestrians(ctx, peds, cam, viewW, viewH) {
  for (const p of peds) {
    const x = p.x - cam.x;
    const y = p.y - cam.y;
    if (x < -20 || x > viewW + 20 || y < -20 || y > viewH + 20) continue;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(x, y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
