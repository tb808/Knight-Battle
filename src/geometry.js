import * as THREE from 'three';

export const mat = (color, metalness = 0, roughness = .9) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness, metalness });
export function mesh(geometry, material, parent, position = [0, 0, 0]) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(...position);
  object.castShadow = true;
  object.receiveShadow = true;
  parent?.add(object);
  return object;
}
export function box(parent, size, position, material) { return mesh(new THREE.BoxGeometry(...size), material, parent, position); }
export function cylinder(parent, top, bottom, height, sides, position, material) { return mesh(new THREE.CylinderGeometry(top, bottom, height, sides), material, parent, position); }
export function beam(parent, start, end, width, material, depth = width) {
  const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end);
  const object = box(parent, [width, a.distanceTo(b), depth], a.clone().add(b).multiplyScalar(.5).toArray(), material);
  object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
  return object;
}

export function shield(parent, material, trim, scale = 1) {
  const shape = new THREE.Shape();
  shape.moveTo(-.3, .43); shape.lineTo(.3, .43); shape.lineTo(.32, .02); shape.lineTo(.22, -.3); shape.lineTo(0, -.53); shape.lineTo(-.22, -.3); shape.lineTo(-.32, .02); shape.closePath();
  const group = new THREE.Group();
  const body = mesh(new THREE.ExtrudeGeometry(shape, { depth: .045, bevelEnabled: true, bevelSize: .016, bevelThickness: .01, bevelSegments: 1 }), trim, group);
  const face = mesh(new THREE.ShapeGeometry(shape), material, group, [0, 0, .064]);
  face.scale.set(.91, .93, 1);
  const crossMat = mat('#bdaf8a');
  box(group, [.065, .7, .012], [0, -.015, .077], crossMat);
  box(group, [.42, .067, .012], [0, .14, .08], crossMat);
  cylinder(group, .05, .05, .028, 8, [0, .13, .096], trim).rotation.x = Math.PI / 2;
  group.scale.setScalar(scale);
  parent.add(group);
  return { group, body };
}

export function weaponModel(key, parent) {
  const group = new THREE.Group();
  const steel = mat('#c2c6bf', .68, .32), edge = mat('#e1dfca', .68, .3), dark = mat('#343c3b', .65), wood = mat('#493528'), bronze = mat('#a08b58', .7);
  // All weapons extend along local +Y, from the hilt to the tip.
  const length = { longsword: 1.48, dagger: .68, axe: 1.2, spear: 2.05, mace: 1.12, arming: 1.15 }[key];
  let blade;
  if (key === 'spear') {
    cylinder(group, .023, .026, length - .32, 7, [0, (length - .32) / 2, 0], wood);
    blade = mesh(new THREE.ConeGeometry(.09, .39, 4), steel, group, [0, length - .19, 0]);
    blade.scale.z = .3;
    cylinder(group, .042, .035, .13, 6, [0, length - .38, 0], bronze);
  } else if (key === 'axe') {
    cylinder(group, .027, .031, 1.08, 7, [0, .5, 0], wood);
    const shape = new THREE.Shape();
    shape.moveTo(-.03, .68); shape.lineTo(-.33, .62); shape.lineTo(-.4, .78); shape.lineTo(-.4, 1.12); shape.lineTo(-.28, 1.22); shape.lineTo(-.03, 1.03); shape.lineTo(.13, 1.05); shape.lineTo(.17, .82); shape.closePath();
    blade = mesh(new THREE.ExtrudeGeometry(shape, { depth: .045, bevelEnabled: false }), steel, group, [0, 0, -.023]);
    box(group, [.1, .26, .08], [0, .92, 0], dark);
  } else if (key === 'mace') {
    cylinder(group, .03, .035, .9, 8, [0, .4, 0], dark);
    blade = mesh(new THREE.IcosahedronGeometry(.15, 0), steel, group, [0, .96, 0]);
    for (let i = 0; i < 6; i++) {
      const fin = box(group, [.035, .29, .31], [0, .96, 0], steel); fin.rotation.y = i * Math.PI / 3;
    }
  } else {
    const shape = new THREE.Shape();
    shape.moveTo(-.037, .12); shape.lineTo(.037, .12); shape.lineTo(.027, length - .18); shape.lineTo(0, length); shape.lineTo(-.027, length - .18); shape.closePath();
    blade = mesh(new THREE.ExtrudeGeometry(shape, { depth: .025, bevelEnabled: false }), steel, group, [0, 0, -.012]);
    box(group, [.012, length - .32, .029], [0, (length - .08) / 2, 0], edge);
    box(group, [key === 'dagger' ? .15 : .3, .035, .055], [0, .09, 0], bronze);
  }
  cylinder(group, .032, .032, .2, 8, [0, -.045, 0], wood);
  for (let i = 0; i < 5; i++) cylinder(group, .034, .034, .009, 8, [0, -.12 + i * .034, 0], dark);
  mesh(new THREE.IcosahedronGeometry(.048, 0), bronze, group, [0, -.17, 0]);
  parent.add(group);
  group.userData.blade = blade;
  return group;
}
