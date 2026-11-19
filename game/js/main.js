// main.js — the game's entry point and loop. Owns the canvas/camera, start-screen
// wiring, and ties every other module together each frame: input -> player/car ->
// pedestrians -> police/wanted -> missions -> draw -> hud. No game rules live here
// beyond "what order do things happen in".

import { WORLD_W, WORLD_H, drawWorld, districtAt } from './city.js';
import { createPlayer, updatePlayer, drawPlayer, damagePlayer, healPlayer } from './player.js';
import { spawnCityCars, tryEnterNearestCar, exitCar, updatePlayerCar, drawCar } from './car.js';
import { spawnPedestrians, updatePedestrians, drawPedestrians, knockPedestriansNear } from './pedestrians.js';
import { createWantedState, raiseWanted, updateWanted, drawPolice } from './police.js';
import { createMissionState, currentStep, checkMissionProgress, missionMarkers, onCarEntered } from './missions.js';
import { initHud, showHud, updateHud, toast } from './hud.js';
import { initInput, wasPressed } from './input.js';
import { hasSave, saveGame, loadGame, applySave } from './save.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const VIEW_W = canvas.width;
const VIEW_H = canvas.height;

const player = createPlayer();
const cars = spawnCityCars();
const peds = spawnPedestrians(24);
const wanted = createWantedState();
const missionState = createMissionState();

let lastTime = performance.now();
let running = false;
let lastSpeedWatch = 0;
let crimeCooldown = 0;

function randomEdgeSpawn() {
  // Spawn police just off-screen from the player, biased toward a road.
  const angle = Math.random() * Math.PI * 2;
  const dist = 420;
  return {
    x: Math.max(40, Math.min(WORLD_W - 40, player.x + Math.cos(angle) * dist)),
    y: Math.max(40, Math.min(WORLD_H - 40, player.y + Math.sin(angle) * dist)),
  };
}

function getCamera() {
  return {
    x: Math.max(0, Math.min(WORLD_W - VIEW_W, player.x - VIEW_W / 2)),
    y: Math.max(0, Math.min(WORLD_H - VIEW_H, player.y - VIEW_H / 2)),
  };
}

function handleCrimeChecks(dt) {
  crimeCooldown -= dt;
  // Speeding while driving is a minor crime; hitting peds with the car is bigger.
  if (player.inCar && Math.abs(player.inCar.speed) > 300 && crimeCooldown <= 0) {
    raiseWanted(wanted, 1);
    crimeCooldown = 3;
    toast('Reckless driving! Wanted level up.');
  }
}

function handlePedCollisions() {
  if (!player.inCar) return;
  const car = player.inCar;
  if (Math.abs(car.speed) < 40) return;
  for (const p of peds) {
    if (p.knocked > 0) continue;
    if (Math.hypot(p.x - car.x, p.y - car.y) < 20) {
      knockPedestriansNear(peds, car.x, car.y, 24);
      raiseWanted(wanted, 1);
      crimeCooldown = 3;
      toast('You hit a pedestrian! Wanted level up.');
    }
  }
}

function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  if (running) {
    if (wasPressed('KeyE')) {
      if (player.inCar) exitCar(player);
      else if (tryEnterNearestCar(player, cars)) onCarEntered(missionState);
    }
    if (wasPressed('KeyP')) {
      saveGame(player, missionState);
      toast('Game saved.');
    }

    updatePlayer(player, dt);
    updatePlayerCar(player, dt);
    updatePedestrians(peds, dt);
    handlePedCollisions();
    handleCrimeChecks(dt);

    const caught = updateWanted(wanted, player, dt, randomEdgeSpawn);
    if (caught) {
      damagePlayer(player, 12 * dt); // being caught drains health while touching, not instantly
      wanted.level = Math.max(0, wanted.level - 0.3 * dt); // slow fade once caught/busted
    }
    if (player.health <= 0) {
      // Busted/wasted: a soft respawn, not a dead end — lose some cash, clear heat, heal up.
      player.cash = Math.max(0, player.cash - 30);
      wanted.level = 0;
      wanted.units.length = 0;
      healPlayer(player, player.maxHealth);
      if (player.inCar) exitCar(player);
      player.x = 300;
      player.y = 300;
      toast('Busted! Lost $30 and woke up downtown.');
    }

    const progress = checkMissionProgress(missionState, { player, wanted });
    if (progress) {
      if (progress.type === 'complete') toast(`All jobs done! +$${progress.reward}`);
      else toast(`${progress.next ? 'Job complete' : 'Progress'} +$${progress.reward}`);
    }

    const cam = getCamera();
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    drawWorld(ctx, cam, VIEW_W, VIEW_H);
    drawPedestrians(ctx, peds, cam, VIEW_W, VIEW_H);
    for (const car of cars) if (!car.occupied) drawCar(ctx, car, cam);
    drawPolice(ctx, wanted, cam);
    drawMissionMarkers(cam);
    if (player.inCar) drawCar(ctx, player.inCar, cam);
    drawPlayer(ctx, player, cam);

    updateHud(player, wanted, missionState, currentStep);
  }

  requestAnimationFrame(frame);
}

function drawMissionMarkers(cam) {
  for (const m of missionMarkers(missionState)) {
    const x = m.x - cam.x;
    const y = m.y - cam.y;
    if (x < -50 || x > VIEW_W + 50 || y < -50 || y > VIEW_H + 50) continue;
    ctx.save();
    ctx.translate(x, y);
    const bob = Math.sin(performance.now() / 200) * 4;
    ctx.translate(0, bob);
    ctx.fillStyle = m.color;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(10, 0);
    ctx.lineTo(0, 18);
    ctx.lineTo(-10, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function startGame(fromSave) {
  document.getElementById('start-screen').classList.add('hidden');
  showHud();
  if (fromSave) {
    const data = loadGame();
    applySave(data, player, missionState);
    toast('Saved game loaded.');
  }
  running = true;
  lastTime = performance.now();
}

function boot() {
  initInput();
  initHud();

  const startBtn = document.getElementById('start-btn');
  const continueBtn = document.getElementById('continue-btn');
  if (hasSave()) continueBtn.classList.remove('hidden');

  startBtn.addEventListener('click', () => startGame(false));
  continueBtn.addEventListener('click', () => startGame(true));

  window.addEventListener('beforeunload', () => {
    if (running) saveGame(player, missionState);
  });

  requestAnimationFrame(frame);
}

boot();
