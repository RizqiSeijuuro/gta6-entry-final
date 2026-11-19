# gta6-entry-final

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/RizqiSeijuuro/gta6-entry-final/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/RizqiSeijuuro/gta6-entry-final/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Bayfront Heat** is an original top-down 2D open-world crime game built from scratch in
plain HTML5 Canvas and vanilla JavaScript (no engine, no external assets). Roam the four
hand-built districts of Bayfront — Suburbia Heights, Marrow Downtown, Forge Industrial and
Salt Row Docks — on foot or behind the wheel of a boosted car, with simple arcade driving
physics (acceleration, turning, friction, a speed cap). Wandering pedestrian NPCs populate
the streets; running them over or stealing cars raises your Wanted level and spawns police
cruisers that chase you down. A four-step mission chain ("The Setup" → "Grab a Ride" → "The
Delivery" → "Ghost Protocol") is tracked through a state machine with live HUD feedback. The
HUD shows a minimap, health bar and cash, plus Wanted stars. Progress (cash, mission step,
Wanted level, health and position) autosaves to `localStorage` and resumes on reload.

All art is drawn procedurally with Canvas 2D primitives (rectangles, arcs, paths) — no
copied sprites, tiles or code from any existing game.

## Run it

```sh
node serve.ts --port 8199
```

Then open `http://localhost:8199` in a browser, click **Start Game**, and play with
`WASD`/arrow keys to move or drive, and `E` to enter/exit a car.

---

<sub>Entered on [make.fun](https://make.fun/?ref={referral_code}&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
