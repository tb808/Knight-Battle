// All balance data lives here. The anatomy simulation is shared by every actor.
export const BALANCE = {
  blood: { capacity: 100, weak: 76, severe: 49, critical: 29, collapse: 17, clotPerSecond: .002 },
  injury: { painMultiplier: 1, fractureThreshold: 23, severeFractureThreshold: 40, arteryThreshold: 22 },
  combat: { guardRecovery: 10, staminaRecovery: 14, dodgeCost: 22 },
  impact: { minSpeed: 1.1, recoilDuration: .38, maxImpulse: 1.35 },
  movement: { speed: 2.5, sprint: 3.7, dodgeSpeed: 7.5, arenaRadius: 10.5 },
  performance: { particles: 180, groundMarks: 90, maxWoundsPerPart: 3, pixelRatio: 1.6 },
};

export const WEAPONS = {
  longsword: { name: 'Longsword', type: 'cut', mass: 1.6, speed: 1, penetration: .45, cutting: 34, blunt: 13, reach: 1.48, stamina: 19, icon: 'sword' },
  dagger: { name: 'Dagger', type: 'pierce', mass: .5, speed: 1.55, penetration: .82, cutting: 15, blunt: 5, reach: .68, stamina: 11, icon: 'dagger' },
  axe: { name: 'Battle Axe', type: 'cut', mass: 2.6, speed: .78, penetration: .53, cutting: 45, blunt: 27, reach: 1.2, stamina: 27, icon: 'axe' },
  spear: { name: 'Spear', type: 'pierce', mass: 2, speed: .9, penetration: .83, cutting: 26, blunt: 11, reach: 2.05, stamina: 23, icon: 'spear' },
  mace: { name: 'Mace', type: 'blunt', mass: 2.8, speed: .85, penetration: .18, cutting: 0, blunt: 47, reach: 1.12, stamina: 25, icon: 'mace' },
  arming: { name: 'Arming Sword', type: 'cut', mass: 1.1, speed: 1.18, penetration: .4, cutting: 29, blunt: 10, reach: 1.15, stamina: 16, icon: 'sword' },
};

// Mouse motion changes intent; the weapon reaches that intent through torque.
export const WEAPON_CONTROL = {
  horizontalSensitivity: .008, verticalSensitivity: .007,
  horizontalRange: 100 * Math.PI / 180, verticalMin: -70 * Math.PI / 180,
  verticalMax: 80 * Math.PI / 180, readyYaw: -.72, readyPitch: .28,
  springStrength: 100, springDamping: 15, maxAngularAcceleration: 48,
  maxAngularVelocity: 8, returnStrength: 26, returnDamping: 11,
  maxReach: .48, thrustSpeed: 3.1, reachSpring: 70, reachDamping: 13,
  torsoRotationInfluence: .19, ikStrength: 1,
  minimumDamageVelocity: 1.1, heavyDamageVelocity: 8,
  contactCooldown: .24, bladeRadius: .045,
};

export const WEAPON_DYNAMICS = {
  longsword: { inertiaMultiplier: 1, controlResponsiveness: 1, recoverySpeed: 1, secondaryGrip: -.17 },
  dagger: { inertiaMultiplier: .4, controlResponsiveness: 1.5, recoverySpeed: 1.4 },
  axe: { inertiaMultiplier: 2.1, controlResponsiveness: .76, recoverySpeed: .7, secondaryGrip: -.13 },
  spear: { inertiaMultiplier: 2.4, controlResponsiveness: .68, recoverySpeed: .7, secondaryGrip: -.2 },
  mace: { inertiaMultiplier: 1.7, controlResponsiveness: .82, recoverySpeed: .8 },
  arming: { inertiaMultiplier: .7, controlResponsiveness: 1.18, recoverySpeed: 1.18 },
};

export const ARMOR = {
  none: { label: 'Bare skin', cut: 0, pierce: 0, blunt: 0, durability: 0 },
  trousers: { label: 'Linen trousers', cut: .025, pierce: .01, blunt: 0, durability: 0 },
  plate: { label: 'Steel plate', cut: .88, pierce: .55, blunt: .28, durability: 100 },
  mail: { label: 'Chainmail', cut: .64, pierce: .29, blunt: .12, durability: 75 },
  leather: { label: 'Leather', cut: .28, pierce: .14, blunt: .08, durability: 50 },
  cloth: { label: 'Gambeson', cut: .15, pierce: .05, blunt: .14, durability: 35 },
};

export const BODY_PARTS = [
  { id: 'head', label: 'Head', group: 'head', armor: 'plate', vital: 1.7, at: [0, 1.84, 0], radius: .205 },
  { id: 'neck', label: 'Neck', group: 'head', armor: 'mail', vital: 1.65, artery: 1.7, at: [0, 1.59, 0], radius: .12 },
  { id: 'torso', label: 'Torso', group: 'torso', armor: 'plate', vital: 1.3, artery: .65, at: [0, 1.29, 0], radius: .31 },
  ...['left', 'right'].flatMap((side, i) => {
    const s = i ? 1 : -1;
    return [
      { id: `${side}UpperArm`, label: `${side} upper arm`, group: `${side}Arm`, armor: 'plate', at: [s * .4, 1.39, 0], radius: .17 },
      { id: `${side}Forearm`, label: `${side} forearm`, group: `${side}Arm`, armor: 'mail', artery: .8, at: [s * .48, 1.1, -.07], radius: .145 },
      { id: `${side}Hand`, label: `${side} hand`, group: `${side}Arm`, armor: 'leather', at: [s * .49, .88, -.12], radius: .105 },
      { id: `${side}Thigh`, label: `${side} thigh`, group: `${side}Leg`, armor: 'mail', artery: 1.1, at: [s * .19, .78, 0], radius: .205 },
      { id: `${side}LowerLeg`, label: `${side} lower leg`, group: `${side}Leg`, armor: 'plate', at: [s * .2, .39, 0], radius: .155 },
      { id: `${side}Foot`, label: `${side} foot`, group: `${side}Leg`, armor: 'leather', at: [s * .2, .1, -.11], radius: .14 },
    ];
  }),
];

export const INJURIES = {
  bruise: { label: 'Bruise', bleed: 0, pain: .65, tissue: .45, color: '#b99a57' },
  cut: { label: 'Small cut', bleed: .012, pain: .7, tissue: .65, color: '#cf9a51' },
  deepCut: { label: 'Deep cut', bleed: .044, pain: 1, tissue: 1.1, color: '#c85339' },
  puncture: { label: 'Puncture', bleed: .055, pain: 1.1, tissue: 1.05, color: '#c85339' },
  hemorrhage: { label: 'Heavy bleeding', bleed: .16, pain: 1.2, tissue: 1.15, color: '#a82429' },
  fracture: { label: 'Fracture', bleed: .003, pain: 1.7, tissue: .5, fracture: 1, color: '#d85f3c' },
  severeFracture: { label: 'Severe fracture', bleed: .018, pain: 2.1, tissue: .85, fracture: 2, color: '#a82429' },
  concussion: { label: 'Concussion', bleed: 0, pain: 1.6, tissue: .65, color: '#c85339' },
  armorDamage: { label: 'Armor damage', bleed: 0, pain: 0, tissue: 0, color: '#b99a57' },
  bloodLoss: { label: 'Major blood loss', bleed: 0, pain: 0, tissue: 0, color: '#a82429' },
};

export const DEFAULT_CONTROLS = {
  forward: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD', dodge: 'ShiftLeft',
  stance: 'KeyZ', halfSword: 'KeyT', lock: 'AltLeft', thrust: 'Space', debug: 'F2',
};

export const COLORS = { healthy: '#969b95', minor: '#c6ab66', medium: '#d28a49', severe: '#bd4d40', critical: '#6d2429' };
