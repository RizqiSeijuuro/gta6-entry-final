// main.js - entry point: wires city, player, car, police, pedestrians,
// missions, HUD, input and save systems together into one game loop.
import { World, WORLD_W, WORLD_H } from './city.js';
import { Player } from './player.js';
import { Car, spawnParkedCars } from './car.js';
import { spawnPedestrians } from './pedestrians.js';
import { WantedSystem, PoliceManager } from './police.js';
import { MissionChain, MARKERS } from './missions.js';
import { drawHUD } from './hud.js';
import { Input } from './input.js';
import { saveGame, loadGame } from './save.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const flashEl = document.getElementById('hud-flash');
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const continueNote = document.getElementById('continue-note');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

const input = new Input();
const world = new World();

const existingSave = loadGame();
if (existingSave) {
  const shownStep = Math.min(4, (existingSave.missionStep ?? 0) + 1);
  continueNote.textContent = `Saved game found — $${Math.floor(existingSave.cash)} on hand, mission step ${shownStep}/4. Starting will continue it.`;
}

const state = {
  cash: 500,
  player: null,
  cars: [],
  pedestrians: [],
  wanted: new WantedSystem(),
  police: null,
  missions: new MissionChain(),
  interactHint: '',
  currentDistrict: '',
};

function newGame() {
  const spawn = world.randomPointInDistrict('Salt Row Docks', 200);
  state.player = new Player(spawn.x, spawn.y);
  state.cars = spawnParkedCars(world, 14, ['Suburbia Heights', 'Marrow Downtown', 'Forge Industrial', 'Salt Row Docks']);
  state.pedestrians = spawnPedestrians(world, 22, ['Suburbia Heights', 'Marrow Downtown', 'Forge Industrial', 'Salt Row Docks']);
  state.police = new PoliceManager(world);
  state.wanted = new WantedSystem();
  state.missions = new MissionChain();
  state.cash = 500;
}

function applySave(save) {
  state.player.x = save.x ?? state.player.x;
  state.player.y = save.y ?? state.player.y;
  state.player.health = save.health ?? 100;
  state.cash = save.cash ?? 500;
  state.missions.setStep(save.missionStep ?? 0);
  state.wanted.level = save.wanted ?? 0;
}

newGame();
if (existingSave) applySave(existingSave);

const camera = { x: 0, y: 0, vw: canvas.width, vh: canvas.height };

let lastSave = 0;
let lastTime = performance.now();
let running = false;

function showFlashDom(msg) {
  flashEl.textContent = msg;
  flashEl.style.display = 'block';
  clearTimeout(flashEl._t);
  flashEl._t = setTimeout(() => (flashEl.style.display = 'none'), 2200);
}

function nearestCar(maxDist) {
  let best = null, bestD = maxDist;
  for (const c of state.cars) {
    const d = Math.hypot(c.x - state.player.x, c.y - state.player.y);
    if (d < bestD) {
      best = c;
      bestD = d;
    }
  }
  return best;
}

function handleInteract() {
  if (!input.wasPressed('KeyE')) return;
  if (state.player.inCar) {
    const car = state.player.inCar;
    car.driver = null;
    state.player.inCar = null;
    state.player.x = car.x + Math.cos(car.angle + Math.PI / 2) * 28;
    state.player.y = car.y + Math.sin(car.angle + Math.PI / 2) * 28;
    showFlashDom('Exited vehicle');
  } else {
    const car = nearestCar(55);
    if (car && !car.driver) {
      car.driver = 'player';
      state.player.inCar = car;
      if (!car.stolen) {
        car.stolen = true;
        state.wanted.registerCrime(0.8);
        showFlashDom('Vehicle stolen! Police notified.');
      } else {
        showFlashDom('Back in the car');
      }
    }
  }
}

function updateInteractHint() {
  if (state.player.inCar) {
    state.interactHint = 'Press E to exit the car';
  } else {
    const car = nearestCar(55);
    state.interactHint = car ? 'Press E to boost this car' : '';
  }
}

function updatePedestrianHits(dt) {
  const car = state.player.inCar;
  if (!car || car.speed() < 130) return;
  for (const p of state.pedestrians) {
    if (!p.alive) continue;
    const d = Math.hypot(p.x - car.x, p.y - car.y);
    if (d < p.radius + car.collideRadius * 0.7) {
      p.knockDown();
      state.wanted.registerCrime(1.3);
      showFlashDom('Pedestrian hit! Wanted level rising');
    }
  }
}

function updatePoliceContact(dt) {
  if (state.police.units.length === 0) return;
  const target = { x: state.player.x, y: state.player.y };
  const hitRadius = (state.player.inCar ? state.player.inCar.collideRadius : state.player.radius) + 18;
  for (const u of state.police.units) {
    if (u.distanceTo(target) < hitRadius) {
      state.player.health -= 28 * dt;
    }
  }
  if (state.player.health <= 0) bustPlayer();
}

function bustPlayer() {
  state.wanted.level = 0;
  state.police.units = [];
  state.player.health = state.player.maxHealth * 0.6;
  if (state.player.inCar) {
    state.player.inCar.driver = null;
    state.player.inCar = null;
  }
  const spot = world.clamp(2000, 120);
  state.player.x = spot.x;
  state.player.y = spot.y;
  state.cash = Math.max(0, state.cash - 80);
  state.missions.showFlash('Busted! Fined $80 and dumped near the precinct.');
  showFlashDom('BUSTED — the cops cuffed you and seized the heat.');
}

function updateCamera() {
  camera.vw = canvas.width;
  camera.vh = canvas.height;
  const targetX = state.player.x - camera.vw / 2;
  const targetY = state.player.y - camera.vh / 2;
  camera.x += (targetX - camera.x) * 0.15;
  camera.y += (targetY - camera.y) * 0.15;
  camera.x = Math.max(0, Math.min(WORLD_W - camera.vw, camera.x));
  camera.y = Math.max(0, Math.min(WORLD_H - camera.vh, camera.y));
}

function drawMarkers() {
  const step = state.missions.current().id;
  let marker = null;
  if (step === 'reach_contact') marker = MARKERS.contact;
  else if (step === 'deliver_car') marker = MARKERS.garage;
  if (!marker) return;
  const sx = marker.x - camera.x, sy = marker.y - camera.y;
  const t = performance.now() / 300;
  const bob = Math.sin(t) * 6;
  ctx.save();
  ctx.translate(sx, sy + bob);
  ctx.beginPath();
  ctx.moveTo(0, -30);
  ctx.lineTo(0, 0);
  ctx.strokeStyle = '#ffce3d';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#ffce3d';
  ctx.beginPath();
  ctx.arc(0, -36, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.stroke();
  ctx.restore();
  // ground ring
  ctx.save();
  ctx.translate(sx, sy);
  ctx.strokeStyle = 'rgba(255,206,61,0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, 36, 14, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function update(dt) {
  handleInteract();
  updateInteractHint();

  if (state.player.inCar) {
    state.player.inCar.updateFromInput(dt, input, world);
  }
  state.player.update(dt, input, world);

  for (const p of state.pedestrians) p.update(dt, world);
  updatePedestrianHits(dt);

  state.wanted.update(dt);
  state.police.sync(state.wanted, state.player);
  state.police.update(dt, state.player);
  updatePoliceContact(dt);

  state.missions.update(dt, state);
  state.currentDistrict = world.districtNameAt(state.player.x, state.player.y);

  updateCamera();
  input.endFrame();

  lastSave += dt;
  if (lastSave > 4) {
    lastSave = 0;
    saveGame(state);
  }
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  world.draw(ctx, camera);
  drawMarkers();
  for (const p of state.pedestrians) p.draw(ctx, camera);
  for (const c of state.cars) c.draw(ctx, camera, c === state.player.inCar);
  state.police.draw(ctx, camera);
  state.player.draw(ctx, camera);
  drawHUD(ctx, canvas.width, canvas.height, state);
}

function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  if (running) {
    update(dt);
    render();
  }
  requestAnimationFrame(loop);
}

startBtn.addEventListener('click', () => {
  startScreen.classList.add('hidden');
  running = true;
  lastTime = performance.now();
});

// Exposed for QA/debugging only (read-only inspection); gameplay state is
// still driven entirely by the normal input + update loop above.
window.__game = state;
window.__world = world;
window.__markers = MARKERS;

window.addEventListener('beforeunload', () => {
  if (running) saveGame(state);
});

requestAnimationFrame(loop);
