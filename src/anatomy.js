import { ARMOR, BALANCE, BODY_PARTS, INJURIES } from './config.js';

const clamp = (n, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));

export class BodyPart {
  constructor(definition) {
    Object.assign(this, definition);
    this.structure = 100;
    this.tissue = 0;
    this.pain = 0;
    this.bleeding = 0;
    this.bloodLost = 0;
    this.fracture = 0;
    this.armorCondition = 100;
    this.injuries = [];
  }
  get functionality() { return clamp(1 - this.tissue / 165 - this.fracture * .26 - this.pain / 350, .06, 1); }
  get mobility() { return 1 - this.functionality; }
  get severity() { return Math.max(this.tissue, 100 - this.structure, this.fracture * 34, this.bleeding * 19); }
  get labelState() { return this.injuries.at(-1)?.label || (this.armorCondition < 72 ? 'Armor damaged' : 'Good'); }
}

export class AnatomySystem {
  constructor({ unarmored = false } = {}) { this.unarmored = unarmored; this.reset(); }
  reset() {
    this.parts = Object.fromEntries(BODY_PARTS.map(def => [def.id, new BodyPart(def)]));
    if(this.unarmored)for(const part of Object.values(this.parts))part.armor=/Thigh|LowerLeg/.test(part.id)?'trousers':'none';
    this.blood = BALANCE.blood.capacity;
    this.consciousness = 100;
    this.collapsed = false;
    this.cause = '';
    this.lastHit = null;
    this.time = 0;
  }
  get bleeding() { return Object.values(this.parts).reduce((sum, p) => sum + p.bleeding, 0); }
  get pain() { return clamp(Object.values(this.parts).reduce((sum, p) => sum + p.pain, 0) / 3.2); }
  get bloodRatio() { return this.blood / BALANCE.blood.capacity; }
  get condition() {
    const trauma = Object.values(this.parts).reduce((sum, p) => sum + p.tissue * (p.vital || .4), 0) / 5;
    return clamp(Math.min(100 - trauma, this.bloodRatio * 100, this.consciousness));
  }
  get modifiers() {
    const p = this.parts;
    const legs = (p.leftThigh.functionality + p.rightThigh.functionality + p.leftLowerLeg.functionality + p.rightLowerLeg.functionality + p.leftFoot.functionality + p.rightFoot.functionality) / 6;
    const rightArm = (p.rightUpperArm.functionality + p.rightForearm.functionality + p.rightHand.functionality) / 3;
    const leftArm = (p.leftUpperArm.functionality + p.leftForearm.functionality + p.leftHand.functionality) / 3;
    const circulation = clamp(this.blood / BALANCE.blood.weak, .12, 1);
    return {
      movement: clamp(legs * circulation * (1 - this.pain / 240), .14, 1),
      attack: clamp(rightArm * circulation * (1 - this.pain / 280), .15, 1),
      block: clamp(leftArm * circulation, .15, 1),
      regeneration: circulation * (1 - this.pain / 145),
      coordination: circulation * clamp(this.consciousness / 90, .15, 1),
      limpLeft: 1 - (p.leftThigh.functionality + p.leftLowerLeg.functionality) / 2,
      limpRight: 1 - (p.rightThigh.functionality + p.rightLowerLeg.functionality) / 2,
    };
  }
  groups() {
    const groups = {};
    for (const part of Object.values(this.parts)) {
      if (!groups[part.group] || part.severity > groups[part.group].severity) groups[part.group] = part;
    }
    return groups;
  }
  addInjury(partId, type, magnitude) {
    const part = this.parts[partId], def = INJURIES[type];
    if (!part || !def) return null;
    const amount = Math.max(0, magnitude);
    part.tissue = clamp(part.tissue + amount * def.tissue);
    part.structure = clamp(part.structure - amount * (def.fracture ? 1.25 : .45));
    part.pain = clamp(part.pain + amount * def.pain * BALANCE.injury.painMultiplier);
    part.bleeding = Math.min(14, part.bleeding + amount * def.bleed);
    part.fracture = Math.max(part.fracture, def.fracture || 0);
    const injury = { type, label: def.label, magnitude: amount, time: this.time };
    part.injuries.push(injury);
    if (part.injuries.length > 20) part.injuries.shift();
    if (type === 'concussion') this.consciousness = clamp(this.consciousness - amount * 1.05);
    return injury;
  }
  receiveHit(hit) {
    if (this.collapsed) return null;
    const part = this.parts[hit.bodyPart];
    if (!part) return null;
    const weapon = hit.weapon;
    const type = hit.attackType === 'thrust' || hit.halfSword ? 'pierce' : weapon.type;
    const armor = ARMOR[part.armor];
    const energy = clamp(hit.relativeVelocity / 5.5, .48, 1.6) * (hit.power ?? 1);
    const protection = armor[type] * (.25 + .75 * part.armorCondition / 100);
    const penetration = type === 'pierce' ? weapon.penetration * .53 : weapon.penetration * .13;
    const damage = (type === 'blunt' ? weapon.blunt : weapon.cutting) * energy * (1 - Math.max(0, protection - penetration));
    const trauma = weapon.blunt * energy * (1 - armor.blunt) * (type === 'blunt' ? 1 : .58);
    const armorLoss = (damage * .32 + trauma * .27) * (weapon.mass / 1.6);
    if(armor.durability>0)part.armorCondition = clamp(part.armorCondition - armorLoss);
    let injuryType = 'bruise';
    if (type === 'blunt') {
      if (trauma >= BALANCE.injury.severeFractureThreshold) injuryType = 'severeFracture';
      else if (trauma >= BALANCE.injury.fractureThreshold) injuryType = 'fracture';
      else if (part.id === 'head' && trauma > 12) injuryType = 'concussion';
    } else if (damage > 6) {
      injuryType = type === 'pierce' ? 'puncture' : damage > 18 ? 'deepCut' : 'cut';
      if (part.artery && damage * part.artery > BALANCE.injury.arteryThreshold) injuryType = 'hemorrhage';
    }
    const magnitude = injuryType === 'bruise' || type === 'blunt' ? Math.max(trauma, damage * .6) : damage;
    this.addInjury(part.id, injuryType, magnitude);
    if (type !== 'blunt' && trauma > BALANCE.injury.fractureThreshold) this.addInjury(part.id, 'fracture', trauma * .7);
    if (part.armorCondition < 55 && !part.injuries.some(i => i.type === 'armorDamage')) this.addInjury(part.id, 'armorDamage', 0);
    if (part.id === 'head' && trauma > 17 && injuryType !== 'concussion') this.addInjury(part.id, 'concussion', trauma * .55);
    this.lastHit = { ...hit, damageType: type, injuryType, injury: INJURIES[injuryType].label, magnitude, armor: armor.label, protection, bleedingRate: part.bleeding, impactForce: hit.impactForce ?? energy * weapon.mass * 32 };
    return this.lastHit;
  }
  update(dt) {
    if (this.collapsed) return;
    this.time += dt;
    for (const p of Object.values(this.parts)) {
      const lost = Math.min(this.blood, p.bleeding * dt);
      this.blood -= lost;
      p.bloodLost += lost;
      // Only superficial wounds clot on their own. Arterial wounds remain dangerous.
      if (p.bleeding < .7) p.bleeding = Math.max(0, p.bleeding - BALANCE.blood.clotPerSecond * dt);
      p.pain = Math.max(0, p.pain - .08 * dt);
    }
    if (this.blood < BALANCE.blood.severe) this.consciousness = clamp(this.consciousness - (BALANCE.blood.severe - this.blood) * .045 * dt);
    if (this.blood < BALANCE.blood.critical) this.consciousness = Math.min(this.consciousness, this.blood * 1.8);
    const catastrophic = this.parts.head.structure < 12 || this.parts.torso.structure < 7;
    if (this.blood <= BALANCE.blood.collapse || this.consciousness < 8 || catastrophic) {
      this.collapsed = true;
      this.cause = this.blood <= BALANCE.blood.collapse ? 'Blood loss' : catastrophic ? 'Critical structural trauma' : 'Loss of consciousness';
    }
  }
  conditions() {
    const parts = Object.values(this.parts), result = [];
    if (this.bleeding > .08) result.push({ icon: 'drop', name: 'Bleeding', detail: this.bleeding > 3 ? 'Severe' : this.bleeding > .8 ? 'Moderate' : 'Light', tone: 'red' });
    const fracture = parts.find(p => p.fracture > 0);
    if (fracture) result.push({ icon: 'bone', name: fracture.fracture > 1 ? 'Severe fracture' : 'Fracture', detail: fracture.label, tone: 'gold' });
    if (this.blood < BALANCE.blood.weak) result.push({ icon: 'drop', name: 'Major blood loss', detail: `${Math.round(this.bloodRatio * 100)}% remaining`, tone: 'red' });
    if (this.pain > 15) result.push({ icon: 'bolt', name: this.pain > 40 ? 'Severe pain' : 'Pain', detail: 'Reduced stamina', tone: 'red' });
    if (parts.some(p => p.armorCondition < 55)) result.push({ icon: 'shield', name: 'Armor damaged', detail: 'Less protection', tone: 'gold' });
    if (parts.some(p => p.injuries.some(i => i.type === 'concussion'))) result.push({ icon: 'head', name: 'Concussion', detail: 'Impaired coordination', tone: 'gold' });
    if (this.modifiers.movement < .83) result.push({ icon: 'boot', name: 'Mobility impaired', detail: 'Slower movement', tone: 'gold' });
    return result;
  }
}
