# Iron & Sinew

A playable third-person medieval combat prototype built around anatomical injuries. Original procedural low-poly fighters and a castle training yard follow the supplied reference's warm light, red banners, shoulder camera, weapon slots, and live injury diagram.

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
| WASD | Move toward, away from, or around the opponent while target locked |
| Left mouse, held + mouse movement | Continuously guide and swing the weapon |
| Mouse without left button | Turn the camera when target lock is off |
| Space while guiding | Push the weapon forward for a thrust; release to pull back |
| Shift | Quick step; movement direction or backward |
| Alt / middle mouse | Toggle target lock and automatic camera follow |
| Scroll | Adjust camera distance |
| Z | Balanced / aggressive / defensive stance |
| T | Half-sword grip for longsword / arming sword |
| 1–4 | Longsword / dagger / battle axe / spear |
| 5 / 6 | Mace / arming sword |
| F2 | Injury laboratory |
| V | Weapon target, sweep, impact, and motion diagnostics |
| Escape | Release the mouse |

The gear button opens the field manual and editable keyboard bindings, saved in local storage. Mouse buttons are fixed. Clicking the weapon slots also equips weapons. The **YOU ⇄** button switches the injury display between the player and opponent. The circular-arrow button restarts a duel.

Holding left mouse routes raw browser mouse deltas to a desired weapon direction. A spring, damping, angular acceleration limit, and inertia move the weapon toward that target. Releasing the button lets it settle into its ready pose. No button starts a canned player attack. The enemy drives the same weapon controller through AI targets. Arm segments follow the weapon grips using two-bone IK, and the torso reacts to the swing. The longsword uses two hands. Other weapons have separate inertia and grip settings, though the longsword is the primary tuning target.

Target lock starts enabled. The camera follows the opponent while locked, allowing the mouse to control the weapon. Without lock, mouse movement turns the camera when left mouse is released. Press V to inspect live mouse deltas, desired/current angles, angular velocity, blade speed, control error, spring force, damping, and last impact. F2 includes editable weapon tuning values for the current session; permanent defaults are in `src/config.js`.

Both fighters wear linen trousers and have bare heads, torsos, arms and feet. They carry no shields. These exposed regions have no armor protection, including after a reset. Cuts follow the strike direction, punctures leave smaller marks, and blunt impacts leave bruises. Skin remains visible around injuries.

## Injury simulation

Both combatants instantiate the exact same `AnatomySystem`. Each has 15 independent regions: head, neck, torso, and upper arm / forearm / hand / thigh / lower leg / foot on both sides.

Every region stores structural condition, tissue damage, pain, bleeding, cumulative blood lost, fracture state, armor condition, injuries, and derived functionality/mobility. The top condition bar is an aggregate readout; it is **not** an HP pool from which attacks subtract health.

Weapon contacts carry attacker, target, weapon data, body part, relative velocity, impact point, blade region, and edge alignment. Fixed-step blade sweeps sample between weapon positions against anatomical colliders. Hits below the minimum speed cause no impact; faster hits produce more damage. Clean edge alignment cuts better than flat contact, while the blade base is less effective than the middle. A contact latch prevents repeated damage every frame. Swept blade-to-blade tests stop both weapons on contact, so a crossed sword can block a swing. Flesh uses a short impact sound; metallic effects mark weapon contact.

The live duel uses bare skin and thin trousers. The reusable anatomy model still supports armor for comparison tests. Punctures and exposed regions can bleed heavily. Major neck injury produces sustained blood loss rather than automatic death.

Injuries affect movement speed, limping, weapon control, stamina recovery, dodges, and AI aggression. Collapse follows blood depletion, loss of consciousness, or critical head/torso structural failure. Cuts and bruises appear on the struck skin or cloth mesh. Bleeding produces capped particles and persistent, recycled ground marks. Blunt bruises do not produce external blood.

### Laboratory

Press **F2**, choose a subject, body region, injury, and magnitude, then **Apply injury**. Presets cover the head, neck, arms, and leg fractures. Toggle passive AI or pause simulation to inspect injuries. Reset either character independently. The overlay reports the last impact and the selected region's current state. `N*` denotes a gameplay force proxy, not a physically calibrated force measurement.

### Balancing

Edit **src/config.js** to tune weapons, material resistance, blood thresholds, injury definitions, fracture thresholds, pain, stamina, movement, input defaults, and effect budgets. Injury thresholds are deterministic for reproducible balancing. The simulation runs at fixed 60 Hz with frame-independent blood loss.

## Code map

| Module | Responsibility |
| --- | --- |
| `src/config.js` | Data-driven weapons, regions, armor, injuries, balance, bindings |
| `src/anatomy.js` | Shared regional damage, blood, pain, function, consciousness |
| `src/collision.js` | Swept blade/body and blade/blade collision |
| `src/weapon-control.js` | Mouse target, spring/damping, inertia, and return motion |
| `src/combat.js` | Impact resolution, physical blocking, stamina, dodge, enemy decisions |
| `src/actor.js` | Fighters, two-hand grip and IK, damage zones, wounds |
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

The Node tests cover regional injuries, bleeding, mouse-driven blade travel, delayed reversals, fast-versus-slow impact damage, edge alignment, one-hit contact handling, weapon blocks, range misses, and AI use of the shared controller.

`tests/browser-smoke.playwright.js`, `tests/browser-ai.playwright.js`, and `tests/browser-weapon.playwright.js` are Playwright CLI `run-code --filename` scenarios for the live UI, injury lab, AI, camera bounds, and manual weapon input. Screenshots are written under `output/playwright/`. `window.__IRON_SINEW__` exposes the live game instance for reproducible development checks.

## First-playable scope

One player and one AI sparring partner, six configurable weapons, and one arena. The control and collision milestone is tuned around the longsword. It uses procedural weapon motion and approximate anatomical sphere colliders, rather than a full rigid-body or ragdoll simulation. Art and synthesized audio are functional placeholders.
