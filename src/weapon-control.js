import * as THREE from 'three';
import { WEAPONS, WEAPON_CONTROL, WEAPON_DYNAMICS } from './config.js';

const clamp = THREE.MathUtils.clamp;

export class WeaponControl {
  constructor(actor, config = WEAPON_CONTROL) {
    this.actor = actor;
    this.config = { ...config };
    this.active = false;
    this.desiredYaw = this.yaw = config.readyYaw;
    this.desiredPitch = this.pitch = config.readyPitch;
    this.yawVelocity = this.pitchVelocity = 0;
    this.desiredReach = this.reach = this.reachVelocity = 0;
    this.mouseX = this.mouseY = this.springForce = this.controlError = this.damping = 0;
    this.lastMouseX = this.lastMouseY = 0;
    this.bladeSpeed = 0;
    this.previousYaw = this.yaw;
    this.previousPitch = this.pitch;
    this.previousReach = this.reach;
    this.contactUntil = 0;
    this.weaponContact = null;
    this.lastImpact = null;
  }
  reset() {
    this.active = false;
    this.desiredYaw = this.yaw = this.config.readyYaw;
    this.desiredPitch = this.pitch = this.config.readyPitch;
    this.yawVelocity = this.pitchVelocity = 0;
    this.desiredReach = this.reach = this.reachVelocity = 0;
    this.mouseX = this.mouseY = this.springForce = this.controlError = this.bladeSpeed = this.damping = 0;
    this.lastMouseX = this.lastMouseY = 0;
    this.previousYaw = this.yaw; this.previousPitch = this.pitch;
    this.previousReach = this.reach;
    this.contactUntil = 0; this.lastImpact = null;
    this.weaponContact = null;
  }
  setActive(active) {
    this.active = active;
    this.mouseX = this.mouseY = 0;
    if (!active) this.desiredReach = 0;
  }
  addMouseDelta(x, y) {
    if (!this.active) return;
    const c = this.config;
    this.mouseX += x; this.mouseY += y;
    this.desiredYaw = clamp(this.desiredYaw + x * c.horizontalSensitivity, -c.horizontalRange, c.horizontalRange);
    this.desiredPitch = clamp(this.desiredPitch - y * c.verticalSensitivity, c.verticalMin, c.verticalMax);
  }
  step(dt, thrust = false) {
    const c = this.config, weapon = WEAPONS[this.actor.weaponKey], dynamics = WEAPON_DYNAMICS[this.actor.weaponKey];
    this.previousYaw = this.yaw; this.previousPitch = this.pitch;
    this.previousReach = this.reach;
    if (!this.active) {
      const returnRate = 1 - Math.exp(-dt * dynamics.recoverySpeed * 3);
      this.desiredYaw += (c.readyYaw - this.desiredYaw) * returnRate;
      this.desiredPitch += (c.readyPitch - this.desiredPitch) * returnRate;
    }
    this.desiredReach = this.active && thrust ? c.maxReach : 0;
    const inertia = Math.max(.15, weapon.mass * weapon.reach * weapon.reach * dynamics.inertiaMultiplier);
    const strength = (this.active ? c.springStrength : c.returnStrength) * dynamics.controlResponsiveness * this.actor.anatomy.modifiers.attack * (.45+.55*this.actor.stamina/100);
    const damping = (this.active ? c.springDamping : c.returnDamping) * Math.sqrt(inertia);
    this.damping = damping;
    const accelerationLimit = c.maxAngularAcceleration / inertia;
    const velocityLimit = c.maxAngularVelocity / Math.sqrt(inertia);
    const yawError = this.desiredYaw - this.yaw, pitchError = this.desiredPitch - this.pitch;
    const yawTorque = yawError * strength - this.yawVelocity * damping;
    const pitchTorque = pitchError * strength - this.pitchVelocity * damping;
    this.yawVelocity = clamp(this.yawVelocity + clamp(yawTorque / inertia, -accelerationLimit, accelerationLimit) * dt, -velocityLimit, velocityLimit);
    this.pitchVelocity = clamp(this.pitchVelocity + clamp(pitchTorque / inertia, -accelerationLimit, accelerationLimit) * dt, -velocityLimit, velocityLimit);
    this.yaw = clamp(this.yaw + this.yawVelocity * dt, -c.horizontalRange, c.horizontalRange);
    this.pitch = clamp(this.pitch + this.pitchVelocity * dt, c.verticalMin, c.verticalMax);
    if(this.active)this.actor.stamina=Math.max(0,this.actor.stamina-dt*(Math.abs(this.yawVelocity)+Math.abs(this.pitchVelocity))*weapon.mass*.55);
    if (Math.abs(this.yaw) >= c.horizontalRange) this.yawVelocity = 0;
    if (this.pitch === c.verticalMin || this.pitch === c.verticalMax) this.pitchVelocity = 0;
    const reachForce = (this.desiredReach - this.reach) * c.reachSpring - this.reachVelocity * c.reachDamping;
    this.reachVelocity = clamp(this.reachVelocity + reachForce * dt, -c.thrustSpeed, c.thrustSpeed);
    this.reach = clamp(this.reach + this.reachVelocity * dt, 0, c.maxReach);
    this.controlError = Math.hypot(yawError, pitchError);
    this.springForce = Math.hypot(yawTorque, pitchTorque);
    this.lastMouseX = this.mouseX || this.lastMouseX * Math.exp(-dt*8);
    this.lastMouseY = this.mouseY || this.lastMouseY * Math.exp(-dt*8);
    this.mouseX = this.mouseY = 0;
  }
  direction(yaw = this.yaw, pitch = this.pitch) {
    return new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
  }
  stopAtContact() {
    this.yaw = this.previousYaw; this.pitch = this.previousPitch;
    this.reach = this.previousReach;
    this.yawVelocity *= -.12; this.pitchVelocity *= -.12; this.reachVelocity *= -.12;
  }
  get telemetry() {
    return { mouseX:this.lastMouseX, mouseY:this.lastMouseY, desiredYaw:this.desiredYaw, desiredPitch:this.desiredPitch,
      yaw:this.yaw, pitch:this.pitch, angularVelocity:Math.hypot(this.yawVelocity,this.pitchVelocity),
      bladeSpeed:this.bladeSpeed, controlError:this.controlError, springForce:this.springForce,
      damping:this.damping, reach:this.reach, active:this.active };
  }
}
