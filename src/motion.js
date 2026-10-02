// Keep authoritative simulation transforms separate from the displayed pose.
// Rendering can run faster than the 60 Hz collision/animation simulation.
export class PoseInterpolation {
  constructor(objects) {
    this.poses = objects.map(object => ({ object, previous: this.read(object), current: this.read(object) }));
  }
  read(object) { return { position: object.position.clone(), quaternion: object.quaternion.clone() }; }
  restore() {
    for (const { object, current } of this.poses) {
      object.position.copy(current.position); object.quaternion.copy(current.quaternion);
    }
  }
  beforeStep() {
    for (const pose of this.poses) pose.previous = this.read(pose.object);
  }
  afterStep() {
    for (const pose of this.poses) pose.current = this.read(pose.object);
  }
  snap() { this.afterStep(); this.beforeStep(); }
  render(alpha) {
    for (const { object, previous, current } of this.poses) {
      object.position.copy(previous.position).lerp(current.position, alpha);
      object.quaternion.copy(previous.quaternion).slerp(current.quaternion, alpha);
    }
  }
}

export function accelerate(velocity, target, rate, dt) {
  const delta = target.clone().sub(velocity);
  const length = delta.length();
  if (length > rate * dt) delta.multiplyScalar(rate * dt / length);
  velocity.add(delta);
  return velocity;
}
