// hud.js — owns all on-screen UI outside the canvas world: health bar, cash,
// wanted stars, mission box, minimap and toast notifications. main.js feeds it
// state each frame (or on events); it only ever reads DOM elements it owns.

import { drawMinimap } from './city.js';

let els = null;

export function initHud() {
  els = {
    hud: document.getElementById('hud'),
    healthBar: document.getElementById('health-bar'),
    cashValue: document.getElementById('cash-value'),
    wantedStars: document.getElementById('wanted-stars'),
    missionTitle: document.getElementById('mission-title'),
    missionDesc: document.getElementById('mission-desc'),
    minimap: document.getElementById('minimap-canvas'),
    toastBox: document.getElementById('toast-box'),
  };
  els.wantedStars.innerHTML = '★★★★★'.split('').map((s) => `<span class="star">${s}</span>`).join('');
  return els;
}

export function showHud() {
  els.hud.classList.remove('hidden');
}

export function updateHud(player, wanted, missionState, currentStepFn) {
  const pct = Math.max(0, Math.min(100, (player.health / player.maxHealth) * 100));
  els.healthBar.style.width = `${pct}%`;
  els.cashValue.textContent = Math.floor(player.cash);

  const stars = els.wantedStars.querySelectorAll('.star');
  stars.forEach((s, i) => s.classList.toggle('on', i < wanted.level));

  const step = currentStepFn(missionState);
  if (missionState.complete) {
    els.missionTitle.textContent = 'All jobs complete!';
    els.missionDesc.textContent = "You're a Bayfront legend. Keep roaming the city.";
  } else if (step) {
    els.missionTitle.textContent = step.title;
    els.missionDesc.textContent = step.desc;
  } else {
    els.missionTitle.textContent = 'No active mission';
    els.missionDesc.textContent = '';
  }

  const mmCtx = els.minimap.getContext('2d');
  drawMinimap(mmCtx, player, els.minimap.width, els.minimap.height);
}

export function toast(message) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = message;
  els.toastBox.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}
