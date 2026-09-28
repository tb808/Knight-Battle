# Iron & Sinew

A playable third-person medieval combat prototype built around anatomical injuries. Original procedural low-poly knights and a castle training yard follow the supplied reference's warm light, red banners, shoulder camera, weapon slots, and live injury diagram.

## Play

Double-click **Start-Game.cmd**, or run:

```sh
npm install
npm run dev
```

Open the local address printed by Vite, normally **http://127.0.0.1:5173**. Click **Enter the yard**. Requires a desktop browser with WebGL and a keyboard/mouse. Google Fonts is optional; local fallback fonts are provided by CSS. Gameplay and art run locally.

The current machine has a broken global npm shim. `Start-Game.cmd` runs the installed project directly. If dependencies need reinstalling here:

```powershell
node 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js' install --cache .npm-cache
```

## Controls

| Input | Action |
| --- | --- |
| WASD | Move relative to the camera |
| Mouse | Guide the weapon freely: sideways, vertically or diagonally |
| Left mouse, held + mouse movement | Swing; wind up and sweep through the opponent, reverse for a return cut |
| C, held + mouse | Look around; target lock resumes when released |
| Arrow keys | Move the weapon to a left / right / overhead / low ready position |
| Space | Thrust |
| Right mouse, held | Guard; raise just before contact to parry |
| E | Kick; disrupts guard on contact |
| Shift | Quick step; movement direction or backward |
| Alt / middle mouse | Toggle target lock |
| Scroll | Adjust camera distance |
| Q | Balanced / aggressive / defensive stance |
| R | Half-sword grip for longsword / arming sword |
| 1–4 | Longsword / dagger / battle axe / spear |
| 5 / 6 | Mace / arming sword |
| F2 | Injury laboratory |
| Escape | Release the mouse |

The gear button opens the field manual and editable keyboard bindings, saved in local storage. Mouse buttons are fixed. Clicking the weapon slots also equips weapons. The **YOU ⇄** button switches the injury display between the player and opponent. The circular-arrow button restarts a duel.

The player's cuts follow continuous mouse-driven weapon motion instead of canned attack animations. The hollow dot shows the requested weapon position; the solid dot follows the blade, and the small meter shows swing speed. Heavy weapons accelerate more slowly. Arm injuries and exhaustion weaken control. Holding left mouse engages the weapon; a click or a stationary blade causes no damage. Release it to recover stamina. If pointer lock is unavailable, hold left mouse and drag across the arena to swing, or hold C while dragging to look around. Space thrusts and E kicks remain timed actions.

## Injury simulation

Both combatants instantiate the exact same `AnatomySystem`. Each has 15 independent regions: head, neck, torso, and upper arm / forearm / hand / thigh / lower leg / foot on both sides.

Every region stores structural condition, tissue damage, pain, bleeding, cumulative blood lost, fracture state, armor condition, injuries, and derived functionality/mobility. The top condition bar is an aggregate readout; it is **not** an HP pool from which attacks subtract health.

Weapon contacts carry attacker, target, weapon data, body part, attack type, relative velocity, an impact-force proxy, hit position, and direction. Continuous blade-segment sweeps sample between animation frames against moving anatomical sphere colliders. Swinging near an opponent is insufficient: the blade must cross a collider. Kicks sweep the animated foot. Each attack can register one region contact.

Armor transforms/reduces cutting, piercing, and blunt injury differently and wears down. Plate resists slashes; a mace transmits structural trauma. Punctures and exposed regions can bleed heavily. Major neck injury produces sustained blood loss rather than automatic death.

Injuries affect movement speed, limping, attack duration/power, blocking, stamina recovery, dodges, weapon steadiness, and AI aggression. Collapse follows blood depletion, loss of consciousness, or critical head/torso structural failure. Cuts appear on the struck mesh; damaged armor receives scratches and material changes. Bleeding produces capped particles and persistent, recycled ground marks. Blunt bruises do not produce external blood.

### Laboratory

Press **F2**, choose a subject, body region, injury, and magnitude, then **Apply injury**. Presets cover the head, neck, arms, and leg fractures. Toggle passive AI or pause simulation to inspect injuries. Reset either character independently. The overlay reports the last impact and the selected region's current state. `N*` denotes a gameplay force proxy, not a physically calibrated force measurement.

### Balancing

Edit **src/config.js** to tune weapons, material resistance, blood thresholds, injury definitions, fracture thresholds, pain, stamina, movement, input defaults, and effect budgets. Injury thresholds are deterministic for reproducible balancing. The simulation runs at fixed 60 Hz with frame-independent blood loss.

## Code map

| Module | Responsibility |
| --- | --- |
| `src/config.js` | Data-driven weapons, regions, armor, injuries, balance, bindings |
| `src/anatomy.js` | Shared regional damage, blood, pain, function, consciousness |
| `src/collision.js` | Pure segment/sphere and swept blade collision |
| `src/combat.js` | Attack lifecycle, guard, parry, stamina, dodge, enemy decisions |
| `src/weapon-motion.js` | Mouse-guided blade motion, inertia, swing speed, contact and return strokes |
| `src/actor.js` | Procedural knight, animated damage zones, visible injury surfaces |
| `src/effects.js` | Bounded blood/sparks/ground marks and synthesized placeholder audio |
| `src/environment.js` | Separate procedural arena assets, props, background, lights |
| `src/geometry.js` | Shared mesh builders and weapon/shield art |
| `src/ui.js` | Live HUD, body diagram, telemetry, laboratory, manual, settings |
| `src/main.js` | Input, camera collision, movement, simulation and rendering |

## Verification

```sh
npm test
npm run build
```

The Node tests cover regional isolation, armor versus weapons, fractures and limb function, bleeding time steps/collapse, resets, swept collision, animated strike directions, range misses, held guards, timed parries, and spear versus dagger reach.

The weapon-motion tests also verify continuous diagonal control, stationary/slow blade safety, actual mouse-driven hits, return cuts, low cuts, guard/parry contacts, weapon weight, arm injuries, input cancellation and update-rate stability.

`tests/browser-smoke.playwright.js` and `tests/browser-ai.playwright.js` are Playwright CLI `run-code --filename` scenarios. They verify the live UI, input, lab, mesh wounds, movement, blood loss, duel result, enemy attacks, camera bounds, and a smaller viewport. Screenshots are written under `output/playwright/`. `window.__IRON_SINEW__` exposes the same live game instance for reproducible development checks.

## First-playable scope

One player and one AI training knight, six weapons, a single arena, and the complete injury-to-visual/HUD/gameplay loop. Art, procedural animations, and synthesized audio are functional placeholders. This is an injury simulation with kinematic combat, not a full rigid-body/ragdoll simulator. Colliders approximate regions with spheres; major-vessel damage uses per-region risk factors. There is no dismemberment, treatment, campaign, save system, multiplayer, or validated ten-enemy performance target. The architecture and effect budgets support expanding the roster, but this milestone is tested as a duel.
