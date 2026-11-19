// pedestrians.js - wandering pedestrian NPCs
export class Pedestrian {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.angle = Math.random() * Math.PI * 2;
    this.speed = 40 + Math.random() * 35;
    this.radius = 9;
    this.state = 'idle';
    this.timer = 1 + Math.random() * 2;
    this.target = null;
    this.alive = true;
    this.downTimer = 0;
    this.color = ['#7b4b8a', '#2f6b6b', '#a3542f', '#5a6b8a', '#8a3f4f'][Math.floor(Math.random() * 5)];
  }

  knockDown() {
    this.alive = false;
    this.downTimer = 6 + Math.random() * 4; // respawns after a while
  }

  update(dt, world) {
    if (!this.alive) {
      this.downTimer -= dt;
      if (this.downTimer <= 0) {
        this.alive = true;
        this.state = 'idle';
        this.timer = 1;
      }
      return;
    }
    this.timer -= dt;
    if (this.timer <= 0) {
      if (this.state === 'idle') {
        const ang = Math.random() * Math.PI * 2;
        const dist = 80 + Math.random() * 220;
        const clamped = world.clamp(this.x + Math.cos(ang) * dist, this.y + Math.sin(ang) * dist);
        this.target = clamped;
        this.state = 'walk';
        this.timer = 6;
      } else {
        this.state = 'idle';
        this.timer = 1 + Math.random() * 3;
      }
    }
    if (this.state === 'walk' && this.target) {
      const dx = this.target.x - this.x, dy = this.target.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d < 6) {
        this.state = 'idle';
        this.timer = 1 + Math.random() * 3;
      } else {
        this.angle = Math.atan2(dy, dx);
        const nx = this.x + (dx / d) * this.speed * dt;
        const ny = this.y + (dy / d) * this.speed * dt;
        if (!world.collidesCircle(nx, ny, this.radius)) {
          this.x = nx;
          this.y = ny;
        } else {
          this.state = 'idle';
          this.timer = 0.8;
        }
      }
    }
  }

  draw(ctx, cam) {
    const sx = this.x - cam.x, sy = this.y - cam.y;
    if (!this.alive) {
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = this.color;
      ctx.fillRect(-this.radius, -4, this.radius * 2, 8);
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.translate(sx, sy);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.stroke();
    ctx.restore();
  }
}

export function spawnPedestrians(world, count, districtNames) {
  const peds = [];
  for (let i = 0; i < count; i++) {
    const name = districtNames[i % districtNames.length];
    const p = world.randomPointInDistrict(name, 120);
    peds.push(new Pedestrian(p.x, p.y));
  }
  return peds;
}
