// missions.js — owns the short sequential job chain for Freddy the fixer: mission
// definitions, current step tracking, completion checks against world state, and
// the rewards/toasts that fire on each step. main.js calls checkMissionProgress
// every frame with the current player/car/wanted state.

const STEPS = [
  {
    id: 'meet_freddy',
    title: 'Job 1: Meet Freddy',
    desc: 'Freddy is waiting at the docks (blue marker). Walk to him.',
    target: { x: 1740, y: 300, radius: 60 },
    reward: 0,
  },
  {
    id: 'steal_car',
    title: 'Job 2: Grab Wheels',
    desc: 'Freddy needs a getaway car. Jack any vehicle.',
    reward: 50,
  },
  {
    id: 'deliver_car',
    title: 'Job 3: Deliver It',
    desc: 'Drive the car to the industrial drop point (red marker).',
    target: { x: 1800, y: 1460, radius: 70 },
    reward: 100,
  },
  {
    id: 'lose_heat',
    title: 'Job 4: Lose the Heat',
    desc: "You're hot now — survive until your wanted level drops to 0.",
    reward: 200,
  },
];

export function createMissionState() {
  return {
    stepIndex: 0,
    complete: false,
    flags: { stolenCarEver: false, triggeredHeat: false },
  };
}

export function currentStep(state) {
  if (state.complete) return null;
  return STEPS[state.stepIndex];
}

export function onCarEntered(state) {
  state.flags.stolenCarEver = true;
}

export function checkMissionProgress(state, ctx) {
  const step = currentStep(state);
  if (!step) return null;
  let advanced = false;

  if (step.id === 'meet_freddy') {
    const d = Math.hypot(ctx.player.x - step.target.x, ctx.player.y - step.target.y);
    if (d < step.target.radius) advanced = true;
  } else if (step.id === 'steal_car') {
    if (ctx.player.inCar) advanced = true;
  } else if (step.id === 'deliver_car') {
    if (ctx.player.inCar) {
      const d = Math.hypot(ctx.player.x - step.target.x, ctx.player.y - step.target.y);
      if (d < step.target.radius) advanced = true;
    }
  } else if (step.id === 'lose_heat') {
    if (!state.flags.triggeredHeat && ctx.wanted.level > 0) state.flags.triggeredHeat = true;
    if (state.flags.triggeredHeat && ctx.wanted.level === 0) advanced = true;
  }

  if (advanced) {
    const reward = step.reward;
    ctx.player.cash += reward;
    state.stepIndex++;
    if (state.stepIndex >= STEPS.length) {
      state.complete = true;
      return { type: 'complete', reward };
    }
    return { type: 'advance', reward, next: STEPS[state.stepIndex] };
  }
  return null;
}

export function missionMarkers(state) {
  const step = currentStep(state);
  if (!step || !step.target) return [];
  return [{ x: step.target.x, y: step.target.y, color: step.id === 'meet_freddy' ? '#3355ff' : '#ff3333' }];
}

export { STEPS };
