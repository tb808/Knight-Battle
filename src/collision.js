// Closest point on a segment: the blade itself, never a proximity attack sphere.
export function segmentSphere(a, b, center, radius) {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  const lengthSq = dx * dx + dy * dy + dz * dz;
  const t = lengthSq ? Math.max(0, Math.min(1, ((center.x - a.x) * dx + (center.y - a.y) * dy + (center.z - a.z) * dz) / lengthSq)) : 0;
  const point = { x: a.x + dx * t, y: a.y + dy * t, z: a.z + dz * t };
  const distanceSq = (point.x - center.x) ** 2 + (point.y - center.y) ** 2 + (point.z - center.z) ** 2;
  return distanceSq <= radius * radius ? { point, t, distanceSq } : null;
}

export function sweepBlade(previous, current, colliders, radius = .055, minT = .1) {
  const travel = Math.hypot(current.tip.x - previous.tip.x, current.tip.y - previous.tip.y, current.tip.z - previous.tip.z);
  const steps = Math.max(2, Math.ceil(travel / .055));
  const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t });
  for (let step = 0; step <= steps; step++) {
    const alpha = step / steps;
    const base = lerp(previous.hilt, current.hilt, alpha), tip = lerp(previous.tip, current.tip, alpha);
    const hilt = lerp(base, tip, minT);
    let nearest = null;
    for (const collider of colliders) {
      const hit = segmentSphere(hilt, tip, collider.center, collider.radius + radius);
      if (hit && (!nearest || hit.t < nearest.t)) nearest = { ...hit, bodyPart: collider.id, sweepTime: alpha };
    }
    if (nearest) return { ...nearest, t: minT + (1 - minT) * nearest.t };
  }
  return null;
}

export function segmentDistance(a, b, c, d) {
  const u = {x:b.x-a.x,y:b.y-a.y,z:b.z-a.z};
  const v = {x:d.x-c.x,y:d.y-c.y,z:d.z-c.z};
  const w = {x:a.x-c.x,y:a.y-c.y,z:a.z-c.z};
  const dot = (p,q)=>p.x*q.x+p.y*q.y+p.z*q.z;
  const A=dot(u,u), B=dot(u,v), C=dot(v,v), D=dot(u,w), E=dot(v,w);
  const denominator=A*C-B*B;
  let s=denominator<1e-9?0:Math.max(0,Math.min(1,(B*E-C*D)/denominator));
  let t=Math.max(0,Math.min(1,(B*s+E)/C));
  s=Math.max(0,Math.min(1,(B*t-D)/A));
  t=Math.max(0,Math.min(1,(B*s+E)/C));
  const x=w.x+s*u.x-t*v.x,y=w.y+s*u.y-t*v.y,z=w.z+s*u.z-t*v.z;
  return {distance:Math.hypot(x,y,z),point:{x:a.x+s*u.x,y:a.y+s*u.y,z:a.z+s*u.z},t:s};
}

export function sweepWeapons(previousA,currentA,previousB,currentB,radius=.095) {
  const lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
  const travel=Math.max(Math.hypot(currentA.tip.x-previousA.tip.x,currentA.tip.y-previousA.tip.y,currentA.tip.z-previousA.tip.z),Math.hypot(currentB.tip.x-previousB.tip.x,currentB.tip.y-previousB.tip.y,currentB.tip.z-previousB.tip.z));
  const steps=Math.max(2,Math.ceil(travel/.06));
  for(let i=0;i<=steps;i++){
    const t=i/steps;
    const a=lerp(previousA.hilt,currentA.hilt,t),b=lerp(previousA.tip,currentA.tip,t);
    const c=lerp(previousB.hilt,currentB.hilt,t),d=lerp(previousB.tip,currentB.tip,t);
    const hit=segmentDistance(a,b,c,d);
    if(hit.distance<=radius)return {...hit,sweepTime:t};
  }
  return null;
}
