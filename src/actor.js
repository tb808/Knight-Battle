import * as THREE from 'three';
import { AnatomySystem } from './anatomy.js';
import { BALANCE, BODY_PARTS, WEAPONS } from './config.js';
import { box, mesh, cylinder, beam, mat, shield, weaponModel } from './geometry.js';

export class Character {
  constructor(scene, { name, player = false, color = '#75372e', position = [0, 0, 0] }) {
    this.name = name; this.isPlayer = player;
    this.anatomy = new AnatomySystem();
    this.root = new THREE.Group(); this.root.position.set(...position); scene.add(this.root);
    this.rig = new THREE.Group(); this.root.add(this.rig);
    this.stamina = 100; this.guard = 100; this.weaponKey = 'longsword';
    this.attack = null; this.blocking = false; this.blockStarted = -100; this.stagger = 0;
    this.dodge = 0; this.dodgeVector = new THREE.Vector3(); this.cooldown = 0;
    this.moving = 0; this.step = 0; this.collapse = 0; this.halfSword = false; this.stance = 'Balanced';
    this.parts = {}; this.wounds = []; this.hitFlash = 0;
    this.build(color);
    this.equip('longsword');
    this.blade = { hilt: new THREE.Vector3(), tip: new THREE.Vector3() };
    this.animate(0, 0);
  }
  get position() { return this.root.position; }
  get alive() { return !this.anatomy.collapsed; }
  build(color) {
    this.cloth = mat(color); this.metal = mat('#a4adae', .36, .47);
    const silver = this.metal, dark = mat('#242b2a', .25), leather = mat('#493528'), gold = mat('#8c7849', .58);
    for (const def of BODY_PARTS) {
      const node = new THREE.Group(); node.position.set(...def.at); node.userData.base = node.position.clone(); this.rig.add(node);
      let piece;
      const ownMetal = silver.clone();
      if (def.id === 'head') {
        piece = cylinder(node, .13, .185, .37, 7, [0, 0, 0], ownMetal);
        mesh(new THREE.ConeGeometry(.146, .12, 7), ownMetal, node, [0, .242, 0]);
        box(node, [.275, .034, .017], [0, .045, -.163], dark);
        box(node, [.045, .19, .035], [0, -.028, -.174], ownMetal);
        for (const side of [-1, 1]) for (let i = 0; i < 3; i++) box(node, [.014, .009, .02], [side * (.064 + i * .026), -.045, -.165], dark);
        const brim = cylinder(node, .192, .184, .024, 7, [0, -.181, 0], gold);
        brim.scale.z = .97;
      } else if (def.id === 'neck') piece = cylinder(node, .103, .13, .14, 8, [0, 0, 0], dark);
      else if (def.id === 'torso') {
        piece = cylinder(node, .275, .215, .53, 6, [0, 0, 0], ownMetal); piece.scale.z = .68;
        const tabard = box(node, [.36, .48, .07], [0, -.008, -.184], this.cloth);
        box(node, [.065, .31, .009], [0, .01, -.224], mat('#c0b294'));
        box(node, [.235, .065, .009], [0, .065, -.226], mat('#c0b294'));
        box(node, [.44, .072, .34], [0, -.26, 0], leather);
        box(node, [.085, .08, .037], [0, -.262, -.185], gold);
        // Split skirt panels expose articulated legs below the plate cuirass.
        for (const side of [-1, 1]) {
          const skirt = box(node, [.21, .36, .07], [side * .12, -.43, -.13], this.cloth); skirt.rotation.z = side * .11;
          const tasset = box(node, [.16, .2, .075], [side * .215, -.32, .012], ownMetal); tasset.rotation.z = side * .22;
        }
        const cloakGeo = new THREE.BufferGeometry(), capeVertices=[];
        const capePoint=(x,y)=>[(x/4-.5)*(.53+y*.045),.23-y*.2,.22+Math.sin(x*1.8+y)*.024+y*.025];
        for(let y=0;y<5;y++)for(let x=0;x<4;x++){const a=capePoint(x,y),b=capePoint(x+1,y),c=capePoint(x,y+1),d=capePoint(x+1,y+1);capeVertices.push(...a,...b,...c,...b,...d,...c);}
        cloakGeo.setAttribute('position', new THREE.Float32BufferAttribute(capeVertices,3)); cloakGeo.computeVertexNormals();
        this.cape = mesh(cloakGeo, new THREE.MeshStandardMaterial({color,side:THREE.DoubleSide,flatShading:true,roughness:1}),node);
        this.cape.receiveShadow=false;
        beam(node,[-.23,.24,-.23],[.19,-.25,-.23],.045,leather,.025);
      } else if (def.id.endsWith('UpperArm')) {
        piece = cylinder(node, .151, .106, .29, 6, [0, -.01, 0], ownMetal);
        mesh(new THREE.IcosahedronGeometry(.185, 0), ownMetal, node, [0, .11, 0]).scale.set(1.13,.74,1.04);
        box(node, [.14,.13,.025], [0,.08,-.15], this.cloth);
      } else if (def.id.endsWith('Forearm')) {
        piece = cylinder(node, .099, .079, .27, 6, [0, 0, 0], ownMetal);
        mesh(new THREE.IcosahedronGeometry(.105,0),silver,node,[0,.14,0]);
        cylinder(node,.095,.095,.04,6,[0,-.1,0],gold);
      } else if (def.id.endsWith('Hand')) piece = box(node,[.11,.15,.105],[0,0,0],ownMetal);
      else if (def.id.endsWith('Thigh')) {
        piece = cylinder(node,.138,.113,.37,6,[0,0,0],ownMetal);
        box(node,[.17,.25,.04],[0,.015,-.113],this.cloth);
      } else if (def.id.endsWith('LowerLeg')) {
        piece = cylinder(node,.103,.067,.39,6,[0,-.015,0],ownMetal);
        mesh(new THREE.IcosahedronGeometry(.12,0),ownMetal,node,[0,.17,-.016]).scale.set(1,.9,.9);
      } else piece = box(node,[.16,.13,.29],[0,0,-.025],ownMetal);
      this.parts[def.id] = { node, piece, material: ownMetal, baseColor: ownMetal.color.clone(), wounds: 0 };
    }
    this.shield = shield(this.rig, this.cloth, silver, .8).group;
    this.shield.position.set(-.55,1.12,-.2); this.shield.rotation.set(0,Math.PI+.2,-.12);
    this.weaponHolder = new THREE.Group(); this.rig.add(this.weaponHolder);
  }
  equip(key) {
    if (!WEAPONS[key]) return;
    if (this.weapon) { this.weaponHolder.remove(this.weapon); this.weapon.traverse(o => { if(o.isMesh){o.geometry.dispose(); o.material.dispose();} }); }
    this.weaponKey = key; this.weapon = weaponModel(key,this.weaponHolder);
  }
  face(target, dt = 1) {
    const angle = Math.atan2(this.position.x - target.x, this.position.z - target.z);
    const difference = Math.atan2(Math.sin(angle-this.root.rotation.y),Math.cos(angle-this.root.rotation.y));
    this.root.rotation.y += difference * Math.min(1,dt*10);
  }
  colliders() {
    this.root.updateMatrixWorld(true);
    return BODY_PARTS.map(def => ({id:def.id, radius:def.radius, center:this.parts[def.id].node.getWorldPosition(new THREE.Vector3())}));
  }
  bladeWorld() {
    this.root.updateMatrixWorld(true);
    const shortened=this.halfSword?.35:0;
    const hilt = this.weaponHolder.localToWorld(new THREE.Vector3(0,.13,0));
    const tip = this.weaponHolder.localToWorld(new THREE.Vector3(0,WEAPONS[this.weaponKey].reach-shortened,0));
    return {hilt,tip};
  }
  addWound(partId, result, hitPosition) {
    const part = this.parts[partId]; if (!part) return;
    const bleeding = this.anatomy.parts[partId].bleeding > .02;
    if (part.wounds < BALANCE.performance.maxWoundsPerPart) {
      const local = hitPosition ? part.node.worldToLocal(new THREE.Vector3(hitPosition.x,hitPosition.y,hitPosition.z)) : new THREE.Vector3(0,0,this.isPlayer?.13:-.13);
      const normal = local.clone().normalize(); if(normal.lengthSq()<.1) normal.set(0,0,-1);
      const center=part.node.getWorldPosition(new THREE.Vector3()),rotation=part.node.getWorldQuaternion(new THREE.Quaternion());
      const worldNormal=normal.clone().applyQuaternion(rotation);
      const ray=new THREE.Raycaster(center.clone().addScaledVector(worldNormal,1),worldNormal.clone().negate(),0,2);
      const surface=ray.intersectObject(part.piece,false)[0];
      const surfacePoint=surface?part.node.worldToLocal(surface.point.clone()):normal.clone().multiplyScalar(this.anatomy.parts[partId].radius*.98);
      if(surface?.face){normal.copy(surface.face.normal).transformDirection(part.piece.matrixWorld).applyQuaternion(rotation.invert()).normalize();}
      const size = Math.min(.115,.026+(result?.magnitude || 20)*.002);
      const mark = mesh(new THREE.CircleGeometry(size,6),new THREE.MeshStandardMaterial({color:bleeding?'#681d1c':'#4d4540',roughness:.9,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2}),part.node);
      mark.position.copy(surfacePoint).addScaledVector(normal,.004);
      mark.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal.normalize()); mark.scale.set(.65,1.5,1);
      part.wounds++; this.wounds.push(mark);
      if(this.anatomy.parts[partId].armorCondition<85){
        const scratch=box(part.node,[.006,size*2.3,.002],mark.position.toArray(),mat('#ded7ba',.4));scratch.quaternion.copy(mark.quaternion);scratch.rotateZ(.35);this.wounds.push(scratch);
      }
    }
    this.hitFlash = .23;
  }
  reset(position) {
    this.anatomy.reset(); this.stamina=100; this.guard=100; this.attack=null; this.blocking=false; this.cooldown=0; this.stagger=0; this.collapse=0; this.dodge=0;
    for(const mark of this.wounds){mark.removeFromParent();mark.geometry.dispose();mark.material.dispose();} this.wounds=[];
    for(const part of Object.values(this.parts))part.wounds=0;
    this.equip(this.weaponKey);
    if(position)this.position.set(...position);
    this.animate(0,0);
  }
  animate(dt,time) {
    const modifiers = this.anatomy.modifiers;
    this.step += dt*this.moving*6;
    this.hitFlash=Math.max(0,this.hitFlash-dt);
    for(const [id,part] of Object.entries(this.parts)){
      const injury=this.anatomy.parts[id];
      part.node.position.copy(part.node.userData.base); part.node.rotation.set(0,0,0);
      const bloodTint=injury.bleeding>0?new THREE.Color('#612a25'):new THREE.Color('#706655');
      part.material.color.copy(part.baseColor).lerp(bloodTint,Math.min(.74,injury.severity/110));
      part.material.roughness=.47+(100-injury.armorCondition)*.004;
      if(id.includes('Thigh')||id.includes('LowerLeg')||id.includes('Foot')){
        const left=id.startsWith('left'), limp=left?modifiers.limpLeft:modifiers.limpRight;
        const step=Math.sin(this.step+(left?0:Math.PI)) * Math.min(.17,this.moving*.065)*(1-limp*.8);
        part.node.position.z+=step; part.node.position.y+=Math.max(0,Math.cos(this.step+(left?0:Math.PI)))*this.moving*.017;
        part.node.rotation.x=step*1.5+injury.fracture*.11;
      }
    }
    this.rig.position.y=Math.sin(time*2)*.012+Math.abs(Math.sin(this.step))*this.moving*.008;
    this.rig.rotation.z=(modifiers.limpLeft-modifiers.limpRight)*Math.sin(this.step)*.16 + (this.hitFlash>0?Math.sin(this.hitFlash*30)*.035:0);
    this.cape.rotation.x=Math.sin(time*3+this.step)*(.015+this.moving*.02);
    const hilt=new THREE.Vector3(.46,1.0,-.27),tip=this.isPlayer?new THREE.Vector3(1.7,.69,-.75):new THREE.Vector3(.4,2.2,-.95);
    const idleHilt=hilt.clone(),idleTip=tip.clone();
    if(this.blocking){hilt.set(.17,1.36,-.44);tip.set(-.2,2.05,-.64);}
    if(this.attack){
      const a=this.attack, p=Math.min(1,a.time/a.duration);
      const swing=THREE.MathUtils.smoothstep(p,.22,.72);
      if(a.direction==='thrust'){
        const extension=Math.sin(swing*Math.PI);hilt.set(.16,1.32,-.15-extension*.58);tip.set(.09,a.aimHeight||1.32,-2.1);
      }else if(a.direction==='overhead'){
        const angle=-.5+swing*2.5;hilt.set(.1,1.45,-.22);tip.set(.05,1.4+Math.cos(angle)*1.25,-.4-Math.sin(angle)*1.5);
      }else if(a.direction==='kick'){
        this.parts.rightThigh.node.rotation.x=-Math.sin(p*Math.PI)*1.0;
        this.parts.rightLowerLeg.node.position.set(.2,.55,-Math.sin(p*Math.PI)*.8);
        this.parts.rightFoot.node.position.set(.2,.52,-Math.sin(p*Math.PI)*1.04);
      }else{
        const sign=a.direction==='right'?-1:1,angle=sign*(-1.28+swing*2.56);
        const height=a.direction==='low'?.46:1.25;
        hilt.set(.15,height,-.2);tip.set(Math.sin(angle)*1.8,height+(a.direction==='low'?0:Math.cos(angle)*.05),-.2-Math.cos(angle)*1.8);
      }
      const blend=p<.22?THREE.MathUtils.smoothstep(p,0,.2):p>.76?1-THREE.MathUtils.smoothstep(p,.76,1):1;
      hilt.lerpVectors(idleHilt,hilt.clone(),blend);tip.lerpVectors(idleTip,tip.clone(),blend);
    }
    hilt.x+=Math.sin(time*11)*.06*(1-modifiers.coordination);tip.x+=Math.sin(time*8.3)*.16*(1-modifiers.coordination);
    this.weaponHolder.position.copy(hilt);
    const bladeDirection=tip.sub(hilt).normalize();
    this.weaponHolder.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),bladeDirection);
    this.weapon.position.y=this.halfSword?-.35:0;
    this.parts.rightHand.node.position.copy(hilt); this.parts.rightForearm.node.position.lerp(hilt,.52);
    this.parts.rightForearm.node.rotation.x=-.65; this.parts.rightUpperArm.node.rotation.x=-.25;
    const armDrop=1-modifiers.attack;this.parts.rightUpperArm.node.rotation.z=-armDrop*.22;
    this.shield.position.set(this.blocking?-.12:-.54,this.blocking?1.38:1.09,this.blocking?-.55:-.08);
    this.shield.rotation.y=this.blocking?Math.PI:Math.PI+.35; this.shield.rotation.z=this.blocking?.06:-.18;
    this.shield.visible=!this.halfSword;
    if(this.halfSword){this.parts.leftHand.node.position.copy(hilt).addScaledVector(bladeDirection,.4);this.parts.leftForearm.node.position.lerp(this.parts.leftHand.node.position,.5);}
    if(!this.alive){this.collapse=Math.min(1,this.collapse+dt*1.8);this.rig.rotation.x=-this.collapse*1.45;this.rig.position.y=-this.collapse*.015;}
    else this.rig.rotation.x=this.stagger>0?.08:0;
    this.root.updateMatrixWorld(true);
  }
}
