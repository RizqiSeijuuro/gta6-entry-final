// hud.js - HUD rendering: minimap, health, cash, wanted stars, mission panel
import { WORLD_W, WORLD_H, DISTRICTS } from './city.js';
import { MARKERS } from './missions.js';

const MM_SIZE = 170;
const MM_MARGIN = 16;

export function drawHUD(ctx, vw, vh, state) {
  drawHealthAndCash(ctx, state);
  drawWanted(ctx, vw, state);
  drawMissionPanel(ctx, vh, state);
  drawMinimap(ctx, vw, vh, state);
  drawInteractHint(ctx, vw, vh, state);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(10,10,15,0.55)';
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);
}

function drawHealthAndCash(ctx, state) {
  panel(ctx, 16, 16, 230, 66);
  ctx.fillStyle = '#cfcfe0';
  ctx.font = 'bold 12px Segoe UI, Arial';
  ctx.fillText('HEALTH', 26, 32);
  ctx.fillStyle = '#2a2a33';
  ctx.fillRect(26, 37, 180, 14);
  const hp = Math.max(0, state.player.health) / state.player.maxHealth;
  ctx.fillStyle = hp > 0.5 ? '#4caf50' : hp > 0.25 ? '#e0a62b' : '#d9453f';
  ctx.fillRect(26, 37, 180 * hp, 14);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.strokeRect(26, 37, 180, 14);

  ctx.fillStyle = '#ffce3d';
  ctx.font = 'bold 18px Segoe UI, Arial';
  ctx.fillText(`$${Math.floor(state.cash)}`, 26, 70);
  ctx.fillStyle = '#9f9fb0';
  ctx.font = '11px Segoe UI, Arial';
  ctx.fillText(state.currentDistrict || '', 95, 70);
}

function drawWanted(ctx, vw, state) {
  const stars = state.wanted.stars();
  const totalW = 5 * 26;
  const startX = vw / 2 - totalW / 2;
  panel(ctx, startX - 10, 16, totalW + 20, 40);
  for (let i = 0; i < 5; i++) {
    const x = startX + i * 26 + 13;
    const y = 36;
    drawStar(ctx, x, y, 11, i < stars ? '#ffce3d' : '#4a4a55');
  }
}

function drawStar(ctx, cx, cy, r, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    const a2 = a + Math.PI / 5;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    ctx.lineTo(Math.cos(a2) * r * 0.45, Math.sin(a2) * r * 0.45);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawMissionPanel(ctx, vh, state) {
  const step = state.missions.current();
  const w = 360, h = 70;
  const x = 16, y = vh - h - 16;
  panel(ctx, x, y, w, h);
  ctx.fillStyle = '#ffce3d';
  ctx.font = 'bold 13px Segoe UI, Arial';
  ctx.fillText(`MISSION ${Math.min(state.missions.stepIndex + 1, 4)}/4: ${step.title}`, x + 12, y + 22);
  ctx.fillStyle = '#e6e6f0';
  ctx.font = '12px Segoe UI, Arial';
  wrapText(ctx, step.text, x + 12, y + 42, w - 24, 16);

  if (state.missions.flash) {
    ctx.save();
    ctx.font = 'bold 15px Segoe UI, Arial';
    ctx.fillStyle = '#ffce3d';
    const tw = ctx.measureText(state.missions.flash).width;
    panel(ctx, x, y - 40, tw + 24, 30);
    ctx.fillText(state.missions.flash, x + 12, y - 19);
    ctx.restore();
  }
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const test = line + w + ' ';
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = w + ' ';
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, yy);
}

function drawMinimap(ctx, vw, vh, state) {
  const x = vw - MM_SIZE - MM_MARGIN;
  const y = vh - MM_SIZE - MM_MARGIN;
  ctx.save();
  ctx.fillStyle = 'rgba(10,10,15,0.65)';
  ctx.fillRect(x - 6, y - 6, MM_SIZE + 12, MM_SIZE + 12);
  ctx.beginPath();
  ctx.rect(x, y, MM_SIZE, MM_SIZE);
  ctx.clip();
  const scale = MM_SIZE / WORLD_W;
  for (const d of DISTRICTS) {
    ctx.fillStyle = d.ground;
    ctx.fillRect(x + d.x * scale, y + d.y * scale, d.w * scale, d.h * scale);
  }
  // mission marker
  const mk = state.missions.current().id === 'deliver_car' || state.missions.stepIndex >= 2 ? MARKERS.garage : MARKERS.contact;
  if (state.missions.stepIndex < 3) {
    ctx.fillStyle = '#ffce3d';
    ctx.beginPath();
    ctx.arc(x + mk.x * scale, y + mk.y * scale, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // police
  ctx.fillStyle = '#ff3b3b';
  for (const u of state.police.units) {
    ctx.beginPath();
    ctx.arc(x + u.car.x * scale, y + u.car.y * scale, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // player
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x + state.player.x * scale, y + state.player.y * scale, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.strokeRect(x, y, MM_SIZE, MM_SIZE);
}

function drawInteractHint(ctx, vw, vh, state) {
  if (!state.interactHint) return;
  ctx.save();
  ctx.font = 'bold 14px Segoe UI, Arial';
  const tw = ctx.measureText(state.interactHint).width;
  const x = vw / 2 - tw / 2;
  const y = vh - 110;
  panel(ctx, x - 12, y - 20, tw + 24, 28);
  ctx.fillStyle = '#9fe0ff';
  ctx.fillText(state.interactHint, x, y);
  ctx.restore();
}
