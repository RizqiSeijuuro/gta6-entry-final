// missions.js - a short sequential mission chain state machine
// Steps: 1) reach the contact at the Docks  2) steal a car  3) deliver it to
// the Downtown garage  4) shake the police back down to wanted level 0.

export const MARKERS = {
  contact: { x: 2950, y: 3150, label: 'Contact (Salt Row Docks)' },
  garage: { x: 2650, y: 260, label: 'Garage (Marrow Downtown)' },
};

const STEPS = [
  {
    id: 'reach_contact',
    title: 'The Setup',
    text: 'Head to the Salt Row Docks and meet your contact (yellow marker).',
  },
  {
    id: 'steal_car',
    title: 'Grab a Ride',
    text: 'Boost a car — walk up to any parked car and press E to hot-wire it.',
  },
  {
    id: 'deliver_car',
    title: 'The Delivery',
    text: 'Drive the car to the garage in Marrow Downtown (yellow marker).',
  },
  {
    id: 'lose_heat',
    title: 'Ghost Protocol',
    text: 'You tripped the alarm — lose the police (get Wanted back to 0 stars).',
  },
  {
    id: 'done',
    title: 'Job Complete',
    text: 'Contract finished. Lay low, or keep roaming Bayfront.',
  },
];

export class MissionChain {
  constructor() {
    this.stepIndex = 0;
    this.flash = null;
    this.flashTimer = 0;
    this.requiredWantedSeen = false;
  }

  current() {
    return STEPS[Math.min(this.stepIndex, STEPS.length - 1)];
  }

  setStep(i) {
    this.stepIndex = Math.min(i, STEPS.length - 1);
  }

  showFlash(msg) {
    this.flash = msg;
    this.flashTimer = 3;
  }

  advance(reward, state) {
    this.stepIndex = Math.min(this.stepIndex + 1, STEPS.length - 1);
    if (reward) {
      state.cash += reward;
      this.showFlash(`Objective complete! +$${reward}`);
    }
  }

  update(dt, state) {
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) this.flash = null;
    }
    const step = this.current();
    const { player, wanted, cars } = state;
    switch (step.id) {
      case 'reach_contact': {
        const d = Math.hypot(player.x - MARKERS.contact.x, player.y - MARKERS.contact.y);
        if (d < 70) this.advance(150, state);
        break;
      }
      case 'steal_car': {
        if (player.inCar) this.advance(100, state);
        break;
      }
      case 'deliver_car': {
        if (player.inCar) {
          const d = Math.hypot(player.x - MARKERS.garage.x, player.y - MARKERS.garage.y);
          if (d < 90) {
            this.advance(300, state);
            this.requiredWantedSeen = wanted.level > 0;
          }
        }
        break;
      }
      case 'lose_heat': {
        if (wanted.level > 0.4) this.requiredWantedSeen = true;
        if (this.requiredWantedSeen && wanted.level <= 0) {
          this.advance(250, state);
        } else if (!this.requiredWantedSeen) {
          // nudge heat on so the final step is meaningful even if the player
          // slipped through step 3 without the cops noticing
          if (Math.random() < 0.002) wanted.registerCrime(1.2);
        }
        break;
      }
      default:
        break;
    }
  }
}
