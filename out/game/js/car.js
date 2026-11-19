// car.js - drivable car entity: simple arcade driving physics, enter/exit logic
let nextCarId = 1;

export class Car {
  constructor(x, y, color = '#c23b3b') {
    this.id = nextCarId++;
    this.x = x;
    this.y = y;
    this.angle = -Math.PI / 2;
    this.vel = 0; // signed speed along heading, px/s
    this.color = color;
    this.w = 30;
    this.h = 17;
    this.collideRadius = 18;
    this.maxSpeed = 430;
    this.maxReverse = 150;
    this.accel = 300;
    this.brakeDecel = 420;
    this.friction = 160;
    this.turnRate = 2.5;
    this.stolen = false;
    this.driver = null; // 'player' | PoliceCar owner tag | null
  }

  // Drives the car from direct player input.
  updateFromInput(dt, input, world) {
    let throttle = 0;
    let steer = 0;
    if (input.isDown('KeyW') || input.isDown('ArrowUp')) throttle = 1;
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) throttle = -1;
    if (input.isDown('KeyA') || input.isDown('ArrowLeft')) steer -= 1;
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) steer += 1;
    this._step(dt, throttle, steer, world);
  }

  // Drives the car toward a target point (used by police AI).
  updateSeeking(dt, targetX, targetY, world) {
    const dx = targetX - this.x, dy = targetY - this.y;
    const dist = Math.hypot(dx, dy);
    const desired = Math.atan2(dy, dx);
    let diff = desired - this.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const steer = Math.max(-1, Math.min(1, diff / 0.6));
    const throttle = dist > 60 ? 1 : dist > 25 ? 0.4 : -0.3;
    this._step(dt, throttle, steer, world);
    return dist;
  }

  _step(dt, throttle, steer, world) {
    if (throttle > 0) this.vel += this.accel * dt;
    else if (throttle < 0) this.vel -= this.brakeDecel * dt * (this.vel > 0 ? 1.6 : 1);
    else {
      if (this.vel > 0) this.vel = Math.max(0, this.vel - this.friction * dt);
      else this.vel = Math.min(0, this.vel + this.friction * dt);
    }
    this.vel = Math.max(-this.maxReverse, Math.min(this.maxSpeed, this.vel));

    const speedFrac = Math.min(1, Math.abs(this.vel) / 160);
    if (Math.abs(this.vel) > 2) {
      this.angle += steer * this.turnRate * dt * speedFrac * Math.sign(this.vel || 1);
    }

    const nx = this.x + Math.cos(this.angle) * this.vel * dt;
    const ny = this.y + Math.sin(this.angle) * this.vel * dt;
    if (world.collidesCircle(nx, ny, this.collideRadius)) {
      this.vel *= -0.25; // bounce off on collision
    } else {
      this.x = nx;
      this.y = ny;
    }
  }

  speed() {
    return Math.abs(this.vel);
  }

  draw(ctx, cam, highlight) {
    const sx = this.x - cam.x, sy = this.y - cam.y;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(this.angle);
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
    ctx.fillStyle = 'rgba(180,220,255,0.75)';
    ctx.fillRect(this.w / 2 - 9, -this.h / 2 + 2, 7, this.h - 4);
    ctx.strokeStyle = highlight ? '#fff6b0' : 'rgba(0,0,0,0.5)';
    ctx.lineWidth = highlight ? 2.5 : 1.5;
    ctx.strokeRect(-this.w / 2, -this.h / 2, this.w, this.h);
    ctx.restore();
  }
}

export function spawnParkedCars(world, count, districts) {
  const cars = [];
  const colors = ['#c23b3b', '#2f7fc1', '#e0a62b', '#49a862', '#8a56b0', '#d9772b'];
  for (let i = 0; i < count; i++) {
    const district = districts[i % districts.length];
    const p = world.randomPointInDistrict(district, 180);
    cars.push(new Car(p.x, p.y, colors[i % colors.length]));
  }
  return cars;
}
