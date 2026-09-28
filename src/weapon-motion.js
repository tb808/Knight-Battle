import { BALANCE, WEAPONS } from './config.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// A damped, acceleration-limited weapon follows the mouse in character space.
// Camera/body movement cannot generate a swing: only these joint angles can.
export class WeaponMotion {
  constructor() { this.reset(); }
  reset() {
    this.yaw = this.targetYaw = .45;
    this.pitch = this.targetPitch = .18;
    this.velocityX = this.velocityY = this.speed = 0;
    this.held = false;
    this.previous = null;
    this.hit = false;
    this.travel = 0;
    this.strokeX = this.strokeY = 0;
    this.contactCooldown = 0;
    this.sounded = false;
  }
  aim(dx, dy) {
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
    const { sensitivity, yawLimit, pitchMin, pitchMax } = BALANCE.weaponMotion;
    this.targetYaw = clamp(this.targetYaw + dx * sensitivity, -yawLimit, yawLimit);
    this.targetPitch = clamp(this.targetPitch - dy * sensitivity, pitchMin, pitchMax);
  }
  ready(direction) {
    const poses = { left: [-1.15, .1], right: [1.15, .1], overhead: [0, 1.1], low: [.65, -.7] };
    [this.targetYaw, this.targetPitch] = poses[direction] || [.45, .18];
  }
  engage(held) {
    if (held === this.held) return;
    this.held = held;
    this.previous = null;
    this.travel = 0;
    this.hit = false;
    this.strokeX = this.strokeY = 0;
    this.sounded = false;
  }
  stop() {
    this.engage(false);
    this.targetYaw = this.yaw;
    this.targetPitch = this.pitch;
    this.velocityX = this.velocityY = this.speed = 0;
    this.previous = null;
  }
  impact() {
    this.hit = true;
    this.contactCooldown = BALANCE.weaponMotion.contactCooldown;
    // Arrest the blade at contact; the next mouse motion must pull it away.
    this.targetYaw = this.yaw;
    this.targetPitch = this.pitch;
    this.velocityX *= -.18;
    this.velocityY *= -.18;
  }
  update(dt, actor) {
    this.contactCooldown = Math.max(0, this.contactCooldown - dt);
    if (!actor.alive || actor.attack || actor.blocking || actor.stagger > 0 || actor.dodge > 0) {
      this.stop();
      return;
    }
    const weapon = WEAPONS[actor.weaponKey], tuning = BALANCE.weaponMotion;
    const strength = (.4 + .6 * actor.anatomy.modifiers.attack) * (.5 + .5 * actor.stamina / 100);
    const response = tuning.response * weapon.speed * strength / Math.sqrt(weapon.mass);
    const acceleration = tuning.acceleration * strength / Math.sqrt(weapon.mass);
    const maxSpeed = tuning.maxSpeed * weapon.speed * strength;
    const oldYaw = this.yaw, oldPitch = this.pitch;
    const follow = (angle, target, velocity) => {
      const wanted = clamp((target - angle) * response, -maxSpeed, maxSpeed);
      return velocity + clamp(wanted - velocity, -acceleration * dt, acceleration * dt);
    };
    this.velocityX = follow(this.yaw, this.targetYaw, this.velocityX);
    this.velocityY = follow(this.pitch, this.targetPitch, this.velocityY);
    this.yaw = clamp(this.yaw + this.velocityX * dt, -tuning.yawLimit, tuning.yawLimit);
    this.pitch = clamp(this.pitch + this.velocityY * dt, tuning.pitchMin, tuning.pitchMax);
    if (Math.abs(this.yaw) === tuning.yawLimit) this.velocityX = 0;
    if (this.pitch === tuning.pitchMin || this.pitch === tuning.pitchMax) this.velocityY = 0;
    const dx = this.yaw - oldYaw, dy = this.pitch - oldPitch, distance = Math.hypot(dx, dy);
    this.speed = distance / Math.max(dt, .001);
    if (!this.held) return;
    // Only a deliberate return stroke rearms a held swing, never resting contact.
    if (this.speed > .8) {
      const x = dx / distance, y = dy / distance;
      if (this.travel > tuning.rearmTravel && x * this.strokeX + y * this.strokeY < -.45) {
        this.hit = false;
        this.travel = 0;
        this.sounded = false;
        this.strokeX = x; this.strokeY = y;
      }
      if (!this.strokeX && !this.strokeY) { this.strokeX = x; this.strokeY = y; }
      this.travel += distance;
    }
    actor.stamina = Math.max(0, actor.stamina - distance * weapon.stamina * .3 * (actor.stance === 'Aggressive' ? 1.15 : 1));
    if (actor.stamina < 2) this.stop();
  }
  get striking() {
    return this.held && !this.hit && this.contactCooldown === 0 && this.travel >= BALANCE.weaponMotion.minimumTravel && this.speed >= BALANCE.weaponMotion.minimumSpeed;
  }
}
