// city.js — owns the world map: district layout, terrain colours, roads and solid
// obstacles. Nothing else in the game draws the ground or decides what blocks movement;
// every other module asks this one "what's at (x, y)" or "draw yourself".

export const WORLD_W = 2400;
export const WORLD_H = 1800;
const TILE = 40;

// Four distinct districts, laid out in a 2x2 grid of city blocks, each with its own
// palette and a short name shown nowhere but here (the HUD/minimap colour them too).
export const DISTRICTS = [
  { id: 'downtown', name: 'Downtown', x: 0, y: 0, w: WORLD_W / 2, h: WORLD_H / 2, ground: '#3a3f47', accent: '#53606e' },
  { id: 'docks', name: 'The Docks', x: WORLD_W / 2, y: 0, w: WORLD_W / 2, h: WORLD_H / 2, ground: '#1f3a44', accent: '#2d5b68' },
  { id: 'suburbs', name: 'Palm Suburbs', x: 0, y: WORLD_H / 2, w: WORLD_W / 2, h: WORLD_H / 2, ground: '#3d4a2e', accent: '#5c7340' },
  { id: 'industrial', name: 'Industrial Flats', x: WORLD_W / 2, y: WORLD_H / 2, w: WORLD_W / 2, h: WORLD_H / 2, ground: '#463a2e', accent: '#6b5742' },
];

export function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
  }
  return DISTRICTS[0];
}

// Roads: a simple grid of horizontal/vertical strips, wide enough to drive on.
const ROAD_W = 90;
const roadsV = [200, 600, 1000, 1400, 1800, 2200];
const roadsH = [160, 520, 900, 1280, 1620];

export function isOnRoad(x, y) {
  for (const rx of roadsV) if (x > rx - ROAD_W / 2 && x < rx + ROAD_W / 2) return true;
  for (const ry of roadsH) if (y > ry - ROAD_W / 2 && y < ry + ROAD_W / 2) return true;
  return false;
}

// Solid obstacles (buildings): rectangles the player/car/peds/police cannot walk through.
export const BUILDINGS = [];
function block(x, y, w, h) { BUILDINGS.push({ x, y, w, h }); }

(function layoutBuildings() {
  const rand = mulberry32(1337);
  for (const d of DISTRICTS) {
    const cols = 4;
    const rows = 4;
    const cellW = d.w / cols;
    const cellH = d.h / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = d.x + c * cellW + cellW / 2;
        const cy = d.y + r * cellH + cellH / 2;
        if (isOnRoad(cx, cy)) continue;
        const bw = cellW * (0.45 + rand() * 0.25);
        const bh = cellH * (0.45 + rand() * 0.25);
        const bx = cx - bw / 2;
        const by = cy - bh / 2;
        if (isOnRoad(bx, by) || isOnRoad(bx + bw, by + bh)) continue;
        block(bx, by, bw, bh);
      }
    }
  }
})();

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function collidesWithBuildings(x, y, radius) {
  const box = { x: x - radius, y: y - radius, w: radius * 2, h: radius * 2 };
  for (const b of BUILDINGS) if (rectsOverlap(box, b)) return true;
  return false;
}

export function clampToWorld(x, y, radius) {
  return {
    x: Math.max(radius, Math.min(WORLD_W - radius, x)),
    y: Math.max(radius, Math.min(WORLD_H - radius, y)),
  };
}

// Safety net against ever getting permanently wedged inside a building (a bad spawn
// point, or a corner case the per-axis collision check lets through): if the circle at
// (x, y) overlaps a building, push it straight out along the shallowest overlap axis.
// Idempotent — safe to call every frame for every moving thing.
export function pushOutOfBuildings(x, y, radius) {
  for (const b of BUILDINGS) {
    const box = { x: x - radius, y: y - radius, w: radius * 2, h: radius * 2 };
    if (!rectsOverlap(box, b)) continue;
    const overlapLeft = x + radius - b.x;
    const overlapRight = b.x + b.w - (x - radius);
    const overlapTop = y + radius - b.y;
    const overlapBottom = b.y + b.h - (y - radius);
    const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
    if (minOverlap === overlapLeft) x = b.x - radius - 0.5;
    else if (minOverlap === overlapRight) x = b.x + b.w + radius + 0.5;
    else if (minOverlap === overlapTop) y = b.y - radius - 0.5;
    else y = b.y + b.h + radius + 0.5;
  }
  return { x, y };
}

// Draws the visible slice of the world (camera-relative) onto ctx.
export function drawWorld(ctx, cam, viewW, viewH) {
  // Ground per district.
  for (const d of DISTRICTS) {
    ctx.fillStyle = d.ground;
    ctx.fillRect(d.x - cam.x, d.y - cam.y, d.w, d.h);
  }
  // District seams, subtle.
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(WORLD_W / 2 - cam.x, 0 - cam.y);
  ctx.lineTo(WORLD_W / 2 - cam.x, WORLD_H - cam.y);
  ctx.moveTo(0 - cam.x, WORLD_H / 2 - cam.y);
  ctx.lineTo(WORLD_W - cam.x, WORLD_H / 2 - cam.y);
  ctx.stroke();

  // Roads.
  ctx.fillStyle = '#2b2b2f';
  for (const rx of roadsV) ctx.fillRect(rx - ROAD_W / 2 - cam.x, 0 - cam.y, ROAD_W, WORLD_H);
  for (const ry of roadsH) ctx.fillRect(0 - cam.x, ry - ROAD_W / 2 - cam.y, WORLD_W, ROAD_W);
  // Lane markings.
  ctx.fillStyle = '#d8c23a';
  for (const rx of roadsV) {
    for (let y = 0; y < WORLD_H; y += 50) ctx.fillRect(rx - 2 - cam.x, y - cam.y, 4, 26);
  }
  for (const ry of roadsH) {
    for (let x = 0; x < WORLD_W; x += 50) ctx.fillRect(x - cam.x, ry - 2 - cam.y, 26, 4);
  }

  // Buildings, coloured by the district accent they sit in.
  for (const b of BUILDINGS) {
    const d = districtAt(b.x + b.w / 2, b.y + b.h / 2);
    if (b.x + b.w < cam.x || b.x > cam.x + viewW || b.y + b.h < cam.y || b.y > cam.y + viewH) continue;
    ctx.fillStyle = d.accent;
    ctx.fillRect(b.x - cam.x, b.y - cam.y, b.w, b.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x - cam.x, b.y - cam.y, b.w, b.h);
  }

  // District labels near their center, faint.
  ctx.font = 'bold 16px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  for (const d of DISTRICTS) {
    const lx = d.x + 20 - cam.x;
    const ly = d.y + 28 - cam.y;
    if (lx > -200 && lx < viewW + 200 && ly > -40 && ly < viewH + 40) ctx.fillText(d.name.toUpperCase(), lx, ly);
  }
}

export function drawMinimap(ctx, player, w, h) {
  ctx.clearRect(0, 0, w, h);
  const sx = w / WORLD_W;
  const sy = h / WORLD_H;
  for (const d of DISTRICTS) {
    ctx.fillStyle = d.ground;
    ctx.fillRect(d.x * sx, d.y * sy, d.w * sx, d.h * sy);
  }
  ctx.fillStyle = '#ffcc33';
  ctx.beginPath();
  ctx.arc(player.x * sx, player.y * sy, 3, 0, Math.PI * 2);
  ctx.fill();
}

export { TILE, ROAD_W };
