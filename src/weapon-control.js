import * as THREE from 'three';
import { WEAPONS, WEAPON_CONTROL, WEAPON_DYNAMICS } from './config.js';

const clamp = THREE.MathUtils.clamp;
const smooth = t => t * t * (3 - 2 * t);

// Mouse movement chooses a cut. A stroke has a preparation, a committed sweep,
// and a recovery; cursor position never accumulates into an unreachable pose.
export class WeaponControl {
  constructor(actor, config = WEAPON_CONTROL) {
    this.actor = actor;
    this.config = { ...config };
    this.reset();
  }
  reset() {
    const c = this.config;
    this.active = this.guarding = this.guardHeld = this.canDamage = false;
    this.phase = 'ready'; this.attack = this.queued = null;
    this.attackId = this.swingSoundId = 0; this.hitTargets = new Set();
    this.desiredYaw = this.yaw = this.previousYaw = c.readyYaw;
    this.desiredPitch = this.pitch = this.previousPitch = c.readyPitch;
    this.desiredReach = this.reach = this.previousReach = 0;
    this.yawVelocity = this.pitchVelocity = this.reachVelocity = 0;
    this.roll = 0;
    this.mouseX = this.mouseY = this.lastMouseX = this.lastMouseY = 0;
    this.gestureX = this.gestureY = this.gestureAge = 0;
    this.aim = { x: 1, y: 0 }; this.aimName = 'RIGHT CUT';
    this.bladeSpeed = this.springForce = this.controlError = this.damping = 0;
    this.guardTime = this.recoil = 0;
    this.lastImpact = null;
    this.actor.blocking = false;
  }
  cancel() {
    this.attack = this.queued = null; this.phase = 'ready';
    this.active = this.canDamage = this.guarding = this.guardHeld = false;
    this.actor.blocking = false;
    this.desiredReach = 0;
  }
  setGuard(held) {
    this.guardHeld = held;
    if (held && this.phase === 'windup') {
      this.attack = this.queued = null; this.phase = 'ready';
    }
    if (!held) { this.guarding = false; this.actor.blocking = false; }
  }
  addMouseDelta(x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    x = clamp(x, -120, 120); y = clamp(y, -120, 120);
    this.mouseX += x; this.mouseY += y;
    if (this.gestureAge > .14) this.gestureX = this.gestureY = 0;
    if (x * this.gestureX < 0 && Math.abs(x) > 3) this.gestureX = 0;
    if (-y * this.gestureY < 0 && Math.abs(y) > 3) this.gestureY = 0;
    if (Math.abs(x) >= 4 && Math.abs(y) <= 2) this.gestureY *= .35;
    if (Math.abs(y) >= 4 && Math.abs(x) <= 2) this.gestureX *= .35;
    this.gestureAge = 0;
    this.gestureX = clamp(this.gestureX + x, -90, 90);
    this.gestureY = clamp(this.gestureY - y, -90, 90);
    if (Math.hypot(this.gestureX, this.gestureY) < 6) return;
    let dx = this.gestureX, dy = this.gestureY;
    if (Math.abs(dx) > Math.abs(dy) * 1.8) dy = 0;
    if (Math.abs(dy) > Math.abs(dx) * 1.8) dx = 0;
    const length = Math.hypot(dx, dy);
    this.aim = { x: dx / length, y: dy / length };
    this.aimName = dx === 0 ? (dy < 0 ? 'OVERHEAD' : 'RISING CUT') :
      `${dx > 0 ? 'RIGHT' : 'LEFT'}${dy ? ' DIAGONAL' : ' CUT'}`;
    if (this.phase === 'windup' && this.attack?.type === 'cut') this.attack.direction = { ...this.aim };
  }
  requestAttack(type = 'cut', direction = this.aim) {
    if (!this.actor.alive || this.actor.stagger > 0 || this.actor.dodge > 0 || this.guardHeld) return false;
    const request = { type, direction: { ...direction }, age: 0 };
    if (this.attack || this.recoil > 0) {
      this.queued = request;
      return true;
    }
    return this.beginAttack(request);
  }
  beginAttack(request) {
    const weapon = WEAPONS[this.actor.weaponKey];
    const cost = weapon.stamina * (request.type === 'thrust' ? .65 : .8) *
      (this.actor.stance === 'Aggressive' ? 1.15 : 1);
    if (this.actor.stamina < cost || !this.actor.alive || this.actor.stagger > 0 || this.actor.dodge > 0) return false;
    this.actor.stamina -= cost;
    const pace = weapon.speed * (.82 + .18 * this.actor.anatomy.modifiers.attack) *
      (.85 + .15 * this.actor.stamina / 100);
    this.attack = { ...request, time: 0, fromYaw: this.yaw, fromPitch: this.pitch,
      fromReach: this.reach, windup: .12 / pace, swing: (request.type === 'thrust' ? .18 : .24) / pace,
      recovery: .22 / pace };
    this.attackId++; this.hitTargets.clear();
    this.phase = 'windup'; this.active = true;
    this.guarding = this.actor.blocking = false;
    return true;
  }
  step(dt) {
    const c = this.config, dynamics = WEAPON_DYNAMICS[this.actor.weaponKey];
    this.previousYaw = this.yaw; this.previousPitch = this.pitch; this.previousReach = this.reach;
    this.canDamage = false;
    this.gestureAge += dt;
    if (this.queued) { this.queued.age += dt; if (this.queued.age > c.inputBuffer) this.queued = null; }
    this.recoil = Math.max(0, this.recoil - dt);
    if (!this.actor.alive || this.actor.stagger > 0) this.cancel();
    if (!this.attack && this.queued && this.recoil <= 0 && !this.guardHeld) {
      const next = this.queued; this.queued = null; this.beginAttack(next);
    }
    const a = this.attack;
    let rate = c.returnStrength;
    this.desiredYaw = c.readyYaw; this.desiredPitch = c.readyPitch; this.desiredReach = 0;
    if (a) {
      const wasSwing = this.phase === 'swing';
      a.time += dt;
      const thrust = a.type === 'thrust';
      const dx = a.direction.x, dy = a.direction.y;
      const startYaw = thrust ? 0 : -dx * 1.05;
      const endYaw = thrust ? 0 : dx * 1.15;
      const startPitch = thrust ? .04 : .18 - dy * .85;
      const endPitch = thrust ? .04 : .06 + dy * .85;
      if (a.time < a.windup) {
        this.phase = 'windup'; const t = smooth(a.time / a.windup);
        this.desiredYaw = THREE.MathUtils.lerp(a.fromYaw, startYaw, t);
        this.desiredPitch = THREE.MathUtils.lerp(a.fromPitch, startPitch, t);
        this.desiredReach = THREE.MathUtils.lerp(a.fromReach, 0, t);
      } else if (a.time < a.windup + a.swing) {
        this.phase = 'swing'; const t = smooth((a.time - a.windup) / a.swing);
        this.desiredYaw = THREE.MathUtils.lerp(startYaw, endYaw, t);
        this.desiredPitch = THREE.MathUtils.lerp(startPitch, endPitch, t);
        this.desiredReach = thrust ? c.maxReach * Math.sin(t * Math.PI * .5) : .09 * Math.sin(t * Math.PI);
      } else {
        this.phase = 'recovery'; const t = clamp((a.time - a.windup - a.swing) / a.recovery, 0, 1);
        this.desiredYaw = THREE.MathUtils.lerp(endYaw, c.readyYaw, smooth(t));
        this.desiredPitch = THREE.MathUtils.lerp(endPitch, c.readyPitch, smooth(t));
        this.desiredReach = thrust ? c.maxReach * (1 - smooth(t)) : 0;
        if ((this.queued && t > .3) || t >= 1) {
          this.attack = null; this.phase = 'ready';
          const next = this.queued; this.queued = null;
          if (next && !this.guardHeld) this.beginAttack(next);
        }
      }
      this.canDamage = (this.phase === 'swing' || wasSwing) && (!thrust || a.time > a.windup + a.swing * .3);
      rate = c.springStrength;
    }
    const guard = this.guardHeld && !this.attack && this.recoil <= 0 && this.actor.stagger <= 0 && this.actor.dodge <= 0 && this.actor.alive && this.actor.guard > 0;
    if (guard) {
      this.guardTime = this.guarding ? this.guardTime + dt : 0;
      this.phase = 'guard'; this.desiredYaw = -.12; this.desiredPitch = .8;
      rate = c.springStrength;
    } else if (!this.attack) this.phase = this.recoil > 0 ? 'recoil' : 'ready';
    this.guarding = this.actor.blocking = guard;
    this.active = !!this.attack || guard || this.recoil > 0;
    const frequency = Math.sqrt(rate) * dynamics.controlResponsiveness;
    const damping = this.damping = frequency * 2;
    let remaining = dt;
    while (remaining > 1e-7) {
      const h = Math.min(remaining, 1 / 120); remaining -= h;
      for (const [angle, velocity, desired, limit] of [
        ['yaw', 'yawVelocity', 'desiredYaw', c.maxAngularVelocity],
        ['pitch', 'pitchVelocity', 'desiredPitch', c.maxAngularVelocity],
        ['reach', 'reachVelocity', 'desiredReach', c.thrustSpeed],
      ]) {
        const acceleration = (this[desired] - this[angle]) * frequency * frequency - this[velocity] * damping;
        this[velocity] = clamp(this[velocity] + acceleration * h, -limit, limit);
        this[angle] += this[velocity] * h;
      }
    }
    this.yaw = clamp(this.yaw, -c.horizontalRange, c.horizontalRange);
    this.pitch = clamp(this.pitch, c.verticalMin, c.verticalMax);
    this.reach = clamp(this.reach, 0, c.maxReach);
    const stroke=this.attack?.direction||{x:1,y:0};
    let roll=Math.atan2(stroke.y,stroke.x);
    if(roll>Math.PI/2)roll-=Math.PI;
    if(roll<-Math.PI/2)roll+=Math.PI;
    this.roll+=(roll-this.roll)*(1-Math.exp(-dt*24));
    this.controlError = Math.hypot(this.desiredYaw - this.yaw, this.desiredPitch - this.pitch);
    this.springForce = this.controlError * rate;
    this.lastMouseX = this.mouseX || this.lastMouseX * Math.exp(-dt * 12);
    this.lastMouseY = this.mouseY || this.lastMouseY * Math.exp(-dt * 12);
    this.mouseX = this.mouseY = 0;
  }
  direction(yaw = this.yaw, pitch = this.pitch) {
    return new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
  }
  stopAtContact(alpha = 0) {
    this.yaw = THREE.MathUtils.lerp(this.previousYaw, this.yaw, clamp(alpha, 0, 1));
    this.pitch = THREE.MathUtils.lerp(this.previousPitch, this.pitch, clamp(alpha, 0, 1));
    this.reach = THREE.MathUtils.lerp(this.previousReach, this.reach, clamp(alpha, 0, 1));
    this.yawVelocity *= -.18; this.pitchVelocity *= -.18; this.reachVelocity *= -.18;
    this.attack = null; this.canDamage = false; this.recoil = .12; this.phase = 'recoil';
  }
  get telemetry() {
    return { mouseX: this.lastMouseX, mouseY: this.lastMouseY, desiredYaw: this.desiredYaw, desiredPitch: this.desiredPitch,
      yaw: this.yaw, pitch: this.pitch, angularVelocity: Math.hypot(this.yawVelocity, this.pitchVelocity),
      bladeSpeed: this.bladeSpeed, controlError: this.controlError, springForce: this.springForce,
      damping: this.damping, reach: this.reach, active: this.active, phase: this.phase, direction: this.aimName };
  }
}
