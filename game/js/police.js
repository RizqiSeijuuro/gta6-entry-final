// police.js - wanted level tracking and police NPC chase AI
import { Car } from './car.js';

export class WantedSystem {
  constructor() {
    this.level = 0; // 0..5, fractional internally, stars shown as ceil
    this.maxLevel = 5;
    this.sinceLastCrime = 0;
    this.busted = false;
  }

  registerCrime(amount) {
    this.level = Math.min(this.maxLevel, this.level + amount);
    this.sinceLastCrime = 0;
  }

  stars() {
    return Math.ceil(this.level);
  }

  update(dt) {
    this.sinceLastCrime += dt;
    if (this.sinceLastCrime > 5 && this.level > 0) {
      this.level = Math.max(0, this.level - 0.18 * dt * 5);
    }
  }
}

export class PoliceUnit {
  constructor(x, y) {
    this.car = new Car(x, y, '#1c2c54');
    this.car.maxSpeed = 390; // slightly slower than the player's car so a chase is escapable
    this.car.driver = 'police';
    this.state = 'chase';
    this.lightTimer = 0;
  }

  update(dt, target, world) {
    this.lightTimer += dt;
    this.car.updateSeeking(dt, target.x, target.y, world);
  }

  distanceTo(target) {
    return Math.hypot(this.car.x - target.x, this.car.y - target.y);
  }

  draw(ctx, cam) {
    this.car.draw(ctx, cam, false);
    const sx = this.car.x - cam.x, sy = this.car.y - cam.y;
    const flashing = Math.floor(this.lightTimer * 6) % 2 === 0;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.fillStyle = flashing ? '#ff3b3b' : '#3b6bff';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class PoliceManager {
  constructor(world) {
    this.world = world;
    this.units = [];
  }

  sync(wanted, target) {
    const desired = wanted.stars();
    if (desired > this.units.length && this.units.length < 5) {
      const spawnDist = 520;
      const ang = Math.random() * Math.PI * 2;
      let x = target.x + Math.cos(ang) * spawnDist;
      let y = target.y + Math.sin(ang) * spawnDist;
      const clamped = this.world.clamp(x, y);
      this.units.push(new PoliceUnit(clamped.x, clamped.y));
    } else if (desired < this.units.length) {
      // peel off the furthest unit when heat cools down
      this.units.sort((a, b) => b.distanceTo(target) - a.distanceTo(target));
      this.units.pop();
    }
  }

  update(dt, target) {
    for (const u of this.units) u.update(dt, target, this.world);
  }

  draw(ctx, cam) {
    for (const u of this.units) u.draw(ctx, cam);
  }

  nearestDistance(target) {
    if (this.units.length === 0) return Infinity;
    return Math.min(...this.units.map((u) => u.distanceTo(target)));
  }
}
