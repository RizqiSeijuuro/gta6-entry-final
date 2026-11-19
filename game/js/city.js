// city.js - city/district map generation & rendering
// Builds an original top-down city out of four hand-authored districts
// (Suburbs, Downtown, Industrial, Docks), a road grid, buildings and a
// shoreline, and exposes a World object with collision + draw helpers.

export const WORLD_W = 4000;
export const WORLD_H = 4000;

export const DISTRICTS = [
  { name: 'Suburbia Heights', x: 0, y: 0, w: 2000, h: 2000, ground: '#3f6b36', accent: '#4c7d41' },
  { name: 'Marrow Downtown', x: 2000, y: 0, w: 2000, h: 2000, ground: '#55555e', accent: '#696974' },
  { name: 'Forge Industrial', x: 0, y: 2000, w: 2000, h: 2000, ground: '#6b5636', accent: '#7c6540' },
  { name: 'Salt Row Docks', x: 2000, y: 2000, w: 2000, h: 2000, ground: '#275266', accent: '#2f6279' },
];

const ROAD_W = 90;
const ROAD_SPACING = 400;

function seededRng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
  }
  return DISTRICTS[0];
}

function buildRoads() {
  const roads = [];
  for (let x = ROAD_SPACING; x < WORLD_W; x += ROAD_SPACING) {
    roads.push({ x: x - ROAD_W / 2, y: 0, w: ROAD_W, h: WORLD_H, vertical: true });
  }
  for (let y = ROAD_SPACING; y < WORLD_H; y += ROAD_SPACING) {
    roads.push({ x: 0, y: y - ROAD_W / 2, w: WORLD_W, h: ROAD_W, vertical: false });
  }
  return roads;
}

function onRoad(x, y, w, h, roads) {
  for (const r of roads) {
    if (x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y) return true;
  }
  return false;
}

function buildBuildings(roads) {
  const rng = seededRng(1337);
  const buildings = [];
  for (const d of DISTRICTS) {
    for (let cx = d.x + ROAD_SPACING / 2; cx < d.x + d.w; cx += ROAD_SPACING) {
      for (let cy = d.y + ROAD_SPACING / 2; cy < d.y + d.h; cy += ROAD_SPACING) {
        if (d.name === 'Salt Row Docks' && cx > d.x + d.w - ROAD_SPACING) continue; // shoreline strip, left clear
        if (rng() < 0.12) continue; // leave the occasional empty lot / plaza
        if (d.name === 'Suburbia Heights') {
          // two or three small houses per block
          const n = 2 + Math.floor(rng() * 2);
          for (let i = 0; i < n; i++) {
            const w = 70 + rng() * 40;
            const h = 60 + rng() * 40;
            const bx = cx - 150 + rng() * 300;
            const by = cy - 150 + rng() * 300;
            if (onRoad(bx, by, w, h, roads)) continue;
            buildings.push({ x: bx, y: by, w, h, color: rng() > 0.5 ? '#b58b5e' : '#c9a268', roof: '#7a4f33', district: d.name });
          }
        } else if (d.name === 'Marrow Downtown') {
          const w = 140 + rng() * 120;
          const h = 140 + rng() * 120;
          const bx = cx - w / 2 + (rng() - 0.5) * 40;
          const by = cy - h / 2 + (rng() - 0.5) * 40;
          if (onRoad(bx, by, w, h, roads)) continue;
          const shade = 60 + Math.floor(rng() * 70);
          buildings.push({ x: bx, y: by, w, h, color: `rgb(${shade},${shade + 6},${shade + 16})`, roof: null, district: d.name, windows: true });
        } else if (d.name === 'Forge Industrial') {
          const w = 180 + rng() * 100;
          const h = 110 + rng() * 80;
          const bx = cx - w / 2;
          const by = cy - h / 2;
          if (onRoad(bx, by, w, h, roads)) continue;
          buildings.push({ x: bx, y: by, w, h, color: '#8a6a3c', roof: '#5c4322', district: d.name, stripes: true });
        } else {
          // Docks: warehouses + stacked shipping containers
          const w = 120 + rng() * 90;
          const h = 90 + rng() * 60;
          const bx = cx - w / 2;
          const by = cy - h / 2;
          if (onRoad(bx, by, w, h, roads)) continue;
          buildings.push({ x: bx, y: by, w, h, color: rng() > 0.5 ? '#3c6b47' : '#9c4a3c', roof: null, district: d.name, container: true });
        }
      }
    }
  }
  return buildings;
}

function buildWater() {
  // Shoreline strip along the outer edge of the Docks quadrant.
  return [
    { x: 3820, y: 2000, w: 180, h: 2000 },
    { x: 2000, y: 3820, w: 1820, h: 180 },
  ];
}

export class World {
  constructor() {
    this.roads = buildRoads();
    this.buildings = buildBuildings(this.roads);
    this.water = buildWater();
    this.solids = [...this.buildings, ...this.water];
  }

  districtNameAt(x, y) {
    return districtAt(x, y).name;
  }

  collidesCircle(x, y, r) {
    if (x - r < 0 || y - r < 0 || x + r > WORLD_W || y + r > WORLD_H) return true;
    for (const s of this.solids) {
      const cx = Math.max(s.x, Math.min(x, s.x + s.w));
      const cy = Math.max(s.y, Math.min(y, s.y + s.h));
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy < r * r) return true;
    }
    return false;
  }

  clamp(x, y) {
    return { x: Math.max(0, Math.min(WORLD_W, x)), y: Math.max(0, Math.min(WORLD_H, y)) };
  }

  randomPointInDistrict(name, marginFromEdge = 150) {
    const d = DISTRICTS.find((dd) => dd.name === name) || DISTRICTS[0];
    for (let tries = 0; tries < 60; tries++) {
      const x = d.x + marginFromEdge + Math.random() * (d.w - marginFromEdge * 2);
      const y = d.y + marginFromEdge + Math.random() * (d.h - marginFromEdge * 2);
      if (!this.collidesCircle(x, y, 20)) return { x, y };
    }
    return { x: d.x + d.w / 2, y: d.y + d.h / 2 };
  }

  draw(ctx, cam) {
    // ground per district (only draw what's visible)
    for (const d of DISTRICTS) {
      const sx = d.x - cam.x, sy = d.y - cam.y;
      if (sx + d.w < 0 || sy + d.h < 0 || sx > cam.vw || sy > cam.vh) continue;
      ctx.fillStyle = d.ground;
      ctx.fillRect(sx, sy, d.w, d.h);
    }
    // subtle district label watermark grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(2000 - cam.x, 0 - cam.y);
    ctx.lineTo(2000 - cam.x, WORLD_H - cam.y);
    ctx.moveTo(0 - cam.x, 2000 - cam.y);
    ctx.lineTo(WORLD_W - cam.x, 2000 - cam.y);
    ctx.stroke();

    // roads
    ctx.fillStyle = '#39393f';
    for (const r of this.roads) {
      const sx = r.x - cam.x, sy = r.y - cam.y;
      if (sx + r.w < 0 || sy + r.h < 0 || sx > cam.vw || sy > cam.vh) continue;
      ctx.fillRect(sx, sy, r.w, r.h);
      ctx.strokeStyle = '#eeeeee55';
      ctx.setLineDash([22, 18]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (r.vertical) {
        ctx.moveTo(sx + r.w / 2, sy);
        ctx.lineTo(sx + r.w / 2, sy + r.h);
      } else {
        ctx.moveTo(sx, sy + r.h / 2);
        ctx.lineTo(sx + r.w, sy + r.h / 2);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // water
    ctx.fillStyle = '#1b4659';
    for (const w of this.water) {
      const sx = w.x - cam.x, sy = w.y - cam.y;
      if (sx + w.w < 0 || sy + w.h < 0 || sx > cam.vw || sy > cam.vh) continue;
      ctx.fillRect(sx, sy, w.w, w.h);
    }

    // buildings
    for (const b of this.buildings) {
      const sx = b.x - cam.x, sy = b.y - cam.y;
      if (sx + b.w < 0 || sy + b.h < 0 || sx > cam.vw || sy > cam.vh) continue;
      ctx.fillStyle = b.color;
      ctx.fillRect(sx, sy, b.w, b.h);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.strokeRect(sx, sy, b.w, b.h);
      if (b.roof) {
        ctx.fillStyle = b.roof;
        ctx.fillRect(sx + 4, sy + 4, b.w - 8, 10);
      }
      if (b.windows) {
        ctx.fillStyle = 'rgba(255,230,150,0.5)';
        for (let wx = sx + 10; wx < sx + b.w - 10; wx += 20) {
          for (let wy = sy + 10; wy < sy + b.h - 10; wy += 24) {
            ctx.fillRect(wx, wy, 8, 10);
          }
        }
      }
      if (b.stripes) {
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        for (let i = 0; i < b.w; i += 16) ctx.fillRect(sx + i, sy, 6, b.h);
      }
      if (b.container) {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(sx + 6, sy + b.h - 14, b.w - 12, 6);
      }
    }
  }
}
