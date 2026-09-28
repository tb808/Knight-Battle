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
| WASD | Move relative to the camera |
| Mouse | Look around freely, with no modifier key |
| Q / E | Cut to the left / right; each press starts that attack |
| R / F | Overhead / low cut |
| Space | Thrust |
| Right mouse, held | Weapon guard; raise just before contact to parry |
| X | Kick; disrupts guard on contact |
| Shift | Quick step; movement direction or backward |
| Alt / middle mouse | Toggle facing the opponent; camera always stays free |
| Scroll | Adjust camera distance |
| Z | Balanced / aggressive / defensive stance |
| T | Half-sword grip for longsword / arming sword |
| 1–4 | Longsword / dagger / battle axe / spear |
| 5 / 6 | Mace / arming sword |
| F2 | Injury laboratory |
| Escape | Release the mouse |

The gear button opens the field manual and editable keyboard bindings, saved in local storage. Mouse buttons are fixed. Clicking the weapon slots also equips weapons. The **YOU ⇄** button switches the injury display between the player and opponent. The circular-arrow button restarts a duel.

Every attack key starts a distinct wind-up, contact and recovery animation. The mouse only controls the camera; left-click captures the pointer and never attacks. If pointer lock is unavailable, moving the mouse over the arena still rotates the camera without a held button. The new bindings use their own saved settings so older Q/E/R assignments do not conflict.

Both fighters wear linen trousers and have bare heads, torsos, arms and feet. They carry no shields. These exposed regions have no armor protection, including after a reset. Cuts follow the strike direction, punctures leave smaller marks, and blunt impacts leave bruises. Skin remains visible around injuries.

## Injury simulation

Both combatants instantiate the exact same `AnatomySystem`. Each has 15 independent regions: head, neck, torso, and upper arm / forearm / hand / thigh / lower leg / foot on both sides.

Every region stores structural condition, tissue damage, pain, bleeding, cumulative blood lost, fracture state, armor condition, injuries, and derived functionality/mobility. The top condition bar is an aggregate readout; it is **not** an HP pool from which attacks subtract health.

Weapon contacts carry attacker, target, weapon data, body part, attack type, relative velocity, an impact-force proxy, hit position, and direction. Continuous blade-segment sweeps sample between animation frames against moving anatomical sphere colliders. Swinging near an opponent is insufficient: the blade must cross a collider. Kicks sweep the animated foot. Each attack can register one region contact. Impact strength uses blade speed at that contact point and weapon mass. Contacts briefly arrest the swing, recoil the struck region, and apply a small damped push through arena collision. Weapon blocks recoil the attacker. Flesh uses a short, low impact sound; sparks and metallic sounds are reserved for weapon guards.

The live duel uses bare skin and thin trousers. The reusable anatomy model still supports armor for comparison tests. Punctures and exposed regions can bleed heavily. Major neck injury produces sustained blood loss rather than automatic death.

Injuries affect movement speed, limping, attack duration/power, blocking, stamina recovery, dodges, weapon steadiness, and AI aggression. Collapse follows blood depletion, loss of consciousness, or critical head/torso structural failure. Cuts and bruises appear on the struck skin or cloth mesh. Bleeding produces capped particles and persistent, recycled ground marks. Blunt bruises do not produce external blood.

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
| `src/actor.js` | Unarmored fighters, animated damage zones, directional reactions, visible wounds |
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

The impact tests verify the new bindings, left/right travel, unarmored resets, skin protection, impact pauses, recoil, knockback, weapon blocks, and cut-versus-bruise effects.

`tests/browser-smoke.playwright.js`, `tests/browser-ai.playwright.js`, and `tests/browser-weapon.playwright.js` are Playwright CLI `run-code --filename` scenarios. They verify the live UI, input, lab, mesh wounds, movement, blood loss, duel result, enemy attacks, camera bounds, a smaller viewport, each attack key, free mouse look, and visible skin wounds. Screenshots are written under `output/playwright/`. `window.__IRON_SINEW__` exposes the same live game instance for reproducible development checks.

## First-playable scope

One player and one AI sparring partner, six weapons, a single arena, and the complete injury-to-visual/HUD/gameplay loop. Art, procedural animations, and synthesized audio are functional placeholders. This is an injury simulation with kinematic combat, not a full rigid-body/ragdoll simulator. Colliders approximate regions with spheres; major-vessel damage uses per-region risk factors. There is no dismemberment, treatment, campaign, save system, multiplayer, or validated ten-enemy performance target. The architecture and effect budgets support expanding the roster, but this milestone is tested as a duel.
