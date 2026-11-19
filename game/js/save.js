// save.js — owns localStorage persistence: serializing the subset of game state
// that matters (player position/health/cash, mission progress) and restoring it.
// No other module talks to localStorage directly.

const KEY = 'bayfrontHeat2.save.v1';

export function hasSave() {
  try {
    return localStorage.getItem(KEY) !== null;
  } catch {
    return false;
  }
}

export function saveGame(player, missionState) {
  const data = {
    player: { x: player.x, y: player.y, health: player.health, cash: player.cash },
    mission: { stepIndex: missionState.stepIndex, complete: missionState.complete, flags: missionState.flags },
    savedAt: Date.now(),
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function applySave(data, player, missionState) {
  if (!data) return;
  if (data.player) {
    player.x = data.player.x;
    player.y = data.player.y;
    player.health = data.player.health;
    player.cash = data.player.cash;
  }
  if (data.mission) {
    missionState.stepIndex = data.mission.stepIndex;
    missionState.complete = data.mission.complete;
    missionState.flags = data.mission.flags || missionState.flags;
  }
}
