// player.js - player entity: on-foot movement, walking state, enter/exit sync with a car
export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.angle = -Math.PI / 2;
    this.radius = 13;
    this.walkSpeed = 190;
    this.health = 100;
    this.maxHealth = 100;
    this.inCar = null; // reference to a Car when driving
    this.moving = false;
  }

  update(dt, input, world) {
    if (this.inCar) {
      // position/heading follow the car while driving
      this.x = this.inCar.x;
      this.y = this.inCar.y;
      this.angle = this.inCar.angle;
      this.moving = Math.abs(this.inCar.vel) > 4;
      return;
    }
    let dx = 0, dy = 0;
    if (input.isDown('KeyW') || input.isDown('ArrowUp')) dy -= 1;
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) dy += 1;
    if (input.isDown('KeyA') || input.isDown('ArrowLeft')) dx -= 1;
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) dx += 1;
    const len = Math.hypot(dx, dy);
    this.moving = len > 0;
    if (len > 0) {
      dx /= len;
      dy /= len;
      this.angle = Math.atan2(dy, dx);
      const nx = this.x + dx * this.walkSpeed * dt;
      const ny = this.y + dy * this.walkSpeed * dt;
      if (!world.collidesCircle(nx, this.y, this.radius)) this.x = nx;
      if (!world.collidesCircle(this.x, ny, this.radius)) this.y = ny;
    }
    const clamped = world.clamp(this.x, this.y);
    this.x = clamped.x;
    this.y = clamped.y;
  }

  draw(ctx, cam) {
    if (this.inCar) return; // drawn as part of the car while driving
    const sx = this.x - cam.x, sy = this.y - cam.y;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(this.angle);
    ctx.fillStyle = '#f2d9a0';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a6b33';
    ctx.lineWidth = 2;
    ctx.stroke();
    // facing indicator
    ctx.fillStyle = '#2d2d2d';
    ctx.beginPath();
    ctx.moveTo(this.radius - 1, 0);
    ctx.lineTo(this.radius - 7, -4);
    ctx.lineTo(this.radius - 7, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // simple walking bob legs
    if (this.moving) {
      ctx.fillStyle = '#394a63';
      ctx.fillRect(sx - 3, sy + this.radius - 2, 6, 5);
    }
  }
}
