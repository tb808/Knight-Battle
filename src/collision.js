// Closest point on a segment: the blade itself, never a proximity attack sphere.
export function segmentSphere(a, b, center, radius) {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  const lengthSq = dx * dx + dy * dy + dz * dz;
  const t = lengthSq ? Math.max(0, Math.min(1, ((center.x - a.x) * dx + (center.y - a.y) * dy + (center.z - a.z) * dz) / lengthSq)) : 0;
  const point = { x: a.x + dx * t, y: a.y + dy * t, z: a.z + dz * t };
  const distanceSq = (point.x - center.x) ** 2 + (point.y - center.y) ** 2 + (point.z - center.z) ** 2;
  return distanceSq <= radius * radius ? { point, t, distanceSq } : null;
}

export function sweepBlade(previous, current, colliders, radius = .055) {
  const travel = Math.hypot(current.tip.x - previous.tip.x, current.tip.y - previous.tip.y, current.tip.z - previous.tip.z);
  const steps = Math.max(2, Math.ceil(travel / .055));
  const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t });
  for (let step = 0; step <= steps; step++) {
    const alpha = step / steps;
    const hilt = lerp(previous.hilt, current.hilt, alpha), tip = lerp(previous.tip, current.tip, alpha);
    let nearest = null;
    for (const collider of colliders) {
      const hit = segmentSphere(hilt, tip, collider.center, collider.radius + radius);
      if (hit && (!nearest || hit.t < nearest.t)) nearest = { ...hit, bodyPart: collider.id, sweepTime: alpha };
    }
    if (nearest) return nearest;
  }
  return null;
}
