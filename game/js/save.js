// save.js - localStorage save/load of progress (cash, mission state, etc.)
const SAVE_KEY = 'bayfront_heat_save_v1';

export function saveGame(state) {
  const payload = {
    cash: state.cash,
    missionStep: state.missions.stepIndex,
    wanted: state.wanted.level,
    health: state.player.health,
    x: state.player.x,
    y: state.player.y,
    savedAt: Date.now(),
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('save failed', err);
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (err) {
    /* ignore */
  }
}
