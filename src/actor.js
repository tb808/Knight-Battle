import * as THREE from 'three';
import { AnatomySystem } from './anatomy.js';
import { BALANCE, BODY_PARTS, WEAPONS } from './config.js';
import { box, mesh, cylinder, mat, weaponModel } from './geometry.js';
import { WeaponControl } from './weapon-control.js';
import { WEAPON_CONTROL, WEAPON_DYNAMICS } from './config.js';

export class Character {
  constructor(scene, { name, player = false, color = '#75372e', position = [0, 0, 0] }) {
    this.name = name; this.isPlayer = player;
    this.anatomy = new AnatomySystem({unarmored:true});
    this.root = new THREE.Group(); this.root.position.set(...position); scene.add(this.root);
    this.rig = new THREE.Group(); this.root.add(this.rig);
    this.stamina = 100; this.guard = 100; this.weaponKey = 'longsword';
    this.blocking = false; this.stagger = 0;
    this.dodge = 0; this.dodgeVector = new THREE.Vector3();
    this.moving = 0; this.step = 0; this.collapse = 0; this.halfSword = false; this.stance = 'Balanced';
    this.parts = {}; this.wounds = []; this.hitFlash = 0;
    this.impactVelocity = new THREE.Vector3(); this.frameVelocity = new THREE.Vector3(); this.reaction = null;
    this.build(color);
    this.weaponControl = new WeaponControl(this);
    this.equip('longsword');
    this.blade = { hilt: new THREE.Vector3(), tip: new THREE.Vector3() };
    this.animate(0, 0);
  }
  get position() { return this.root.position; }
  get alive() { return !this.anatomy.collapsed; }
  build(color) {
    this.cloth = mat(this.isPlayer ? '#4a5557' : color);
    const skin = mat(this.isPlayer ? '#c09372' : '#ba8869', 0, .86);
    const hair = mat(this.isPlayer ? '#352c25' : '#4a3325'), eyes = mat('#302a27');
    for (const def of BODY_PARTS) {
      const node = new THREE.Group(); node.position.set(...def.at); node.userData.base = node.position.clone(); this.rig.add(node);
      const clothed = /Thigh|LowerLeg/.test(def.id), material = (clothed ? this.cloth : skin).clone();
      let piece;
      if (def.id === 'head') {
        piece = mesh(new THREE.SphereGeometry(1,12,10),material,node);piece.scale.set(.167,.224,.17);
        mesh(new THREE.SphereGeometry(1,12,6,0,Math.PI*2,0,Math.PI*.4),hair,node).scale.set(.171,.228,.174);
        box(node,[.053,.074,.058],[0,-.01,-.17],material);
        for(const side of [-1,1]){
          box(node,[.037,.016,.014],[side*.065,.036,-.157],eyes);
          box(node,[.051,.013,.014],[side*.065,.065,-.153],hair);
          mesh(new THREE.SphereGeometry(.043,7,6),material,node,[side*.16,-.015,0]).scale.set(.55,1,.7);
        }
        box(node,[.061,.009,.01],[0,-.091,-.154],mat('#875e4c'));
      } else if(def.id==='neck')piece=cylinder(node,.092,.105,.17,10,[0,0,0],material);
      else if(def.id==='torso'){
        // A continuous skin surface keeps contact decals visible across chest and back.
        const profile=[new THREE.Vector2(.19,-.31),new THREE.Vector2(.21,-.19),new THREE.Vector2(.245,.02),new THREE.Vector2(.29,.19),new THREE.Vector2(.245,.27),new THREE.Vector2(.12,.31)];
        piece=mesh(new THREE.LatheGeometry(profile,16),material,node);piece.scale.z=.65;
        const detail=mat('#a5775d');
        for(const side of [-1,1]){
          const collar=box(node,[.135,.009,.006],[side*.115,.215,-.145],detail);collar.rotation.z=-side*.13;
        }
        box(node,[.008,.036,.007],[0,-.19,-.135],detail);
      } else if(def.id.endsWith('UpperArm')){
        piece=cylinder(node,.128,.096,.33,10,[0,0,0],material);
        mesh(new THREE.SphereGeometry(.132,10,8),material,node,[0,.13,0]).scale.set(1,.85,1);
      } else if(def.id.endsWith('Forearm'))piece=cylinder(node,.093,.067,.29,10,[0,0,0],material);
      else if(def.id.endsWith('Hand'))piece=box(node,[.10,.15,.075],[0,0,0],material);
      else if(def.id.endsWith('Thigh'))piece=cylinder(node,.139,.117,.42,10,[0,0,0],material);
      else if(def.id.endsWith('LowerLeg'))piece=cylinder(node,.116,.071,.43,10,[0,-.005,0],material);
      else piece=box(node,[.14,.12,.26],[0,0,-.04],material);
      this.parts[def.id]={node,piece,material,baseColor:material.color.clone(),wounds:0};
    }
    const waist=box(this.rig,[.43,.23,.29],[0,.955,0],this.cloth);
    box(waist,[.44,.042,.30],[0,.09,0],mat('#3e3930'));
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
    const injuryType=result?.injuryType||this.anatomy.parts[partId].injuries.at(-1)?.type;
    const bleeding = ['cut','deepCut','puncture','hemorrhage'].includes(injuryType);
    if (part.wounds < BALANCE.performance.maxWoundsPerPart) {
      const local = hitPosition ? part.node.worldToLocal(new THREE.Vector3(hitPosition.x,hitPosition.y,hitPosition.z)) : new THREE.Vector3(0,0,this.isPlayer?.13:-.13);
      const normal = local.clone().normalize(); if(normal.lengthSq()<.1) normal.set(0,0,-1);
      const center=part.node.getWorldPosition(new THREE.Vector3()),rotation=part.node.getWorldQuaternion(new THREE.Quaternion());
      const worldNormal=normal.clone().applyQuaternion(rotation);
      const ray=new THREE.Raycaster(center.clone().addScaledVector(worldNormal,1),worldNormal.clone().negate(),0,2);
      const surface=ray.intersectObject(part.piece,false)[0];
      const surfacePoint=surface?part.node.worldToLocal(surface.point.clone()):normal.clone().multiplyScalar(this.anatomy.parts[partId].radius*.98);
      if(surface?.face){normal.copy(surface.face.normal).applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(part.piece.matrixWorld)).applyQuaternion(rotation.invert()).normalize();}
      const size = Math.min(.12,.035+(result?.magnitude || 20)*.0015);
      const mark = mesh(new THREE.CircleGeometry(size,12),new THREE.MeshStandardMaterial({color:bleeding?'#792a25':'#66465b',roughness:.95,transparent:true,opacity:bleeding?.94:.65,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2}),part.node);
      mark.position.copy(surfacePoint).addScaledVector(normal,.004);
      mark.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal.normalize());
      mark.scale.set(bleeding?(injuryType==='puncture'?.34:.2):.85,bleeding?(injuryType==='puncture'?.55:1.35):1,1);
      if(result?.hitDirection){
        const tangent=new THREE.Vector3(...result.hitDirection).applyQuaternion(part.node.getWorldQuaternion(new THREE.Quaternion()).invert()).applyQuaternion(mark.quaternion.clone().invert());
        mark.rotateZ(Math.atan2(tangent.y,tangent.x)-Math.PI/2);
      }else mark.rotateZ(.6);
      mark.userData.injuryType=injuryType;mark.castShadow=false;mark.receiveShadow=false;
      part.wounds++; this.wounds.push(mark);
      if(!this.anatomy.unarmored&&this.anatomy.parts[partId].armorCondition<85){
        const scratch=box(part.node,[.006,size*2.3,.002],mark.position.toArray(),mat('#ded7ba',.4));scratch.quaternion.copy(mark.quaternion);scratch.rotateZ(.35);this.wounds.push(scratch);
      }
    }
    this.hitFlash = .23;
  }
  reset(position) {
    this.impactVelocity.set(0,0,0);this.frameVelocity.set(0,0,0);this.reaction=null;this.hitFlash=0;
    this.anatomy.reset(); this.stamina=100; this.guard=100; this.blocking=false; this.stagger=0; this.collapse=0; this.dodge=0;
    for(const mark of this.wounds){mark.removeFromParent();mark.geometry.dispose();mark.material.dispose();} this.wounds=[];
    for(const part of Object.values(this.parts))part.wounds=0;
    this.equip(this.weaponKey);
    this.weaponControl?.reset();
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
      part.material.color.copy(part.baseColor).lerp(bloodTint,Math.min(.22,injury.severity/350));
      part.material.roughness=.86;
      if(id.includes('Thigh')||id.includes('LowerLeg')||id.includes('Foot')){
        const left=id.startsWith('left'), limp=left?modifiers.limpLeft:modifiers.limpRight;
        const step=Math.sin(this.step+(left?0:Math.PI)) * Math.min(.17,this.moving*.065)*(1-limp*.8);
        part.node.position.z+=step; part.node.position.y+=Math.max(0,Math.cos(this.step+(left?0:Math.PI)))*this.moving*.017;
        part.node.rotation.x=step*1.5+injury.fracture*.11;
      }
    }
    this.rig.position.y=Math.sin(time*2)*.012+Math.abs(Math.sin(this.step))*this.moving*.008;
    this.rig.rotation.z=(modifiers.limpLeft-modifiers.limpRight)*Math.sin(this.step)*.16 + (this.hitFlash>0?Math.sin(this.hitFlash*30)*.035:0);
    const hilt=new THREE.Vector3(.28,1.13,-.34),tip=new THREE.Vector3(.5,1.95,-1.12);
    const control=this.weaponControl, direction=control.direction();
    hilt.set(.27+Math.sin(control.yaw)*.12,1.27+Math.sin(control.pitch)*.08,-.31-control.reach);
    tip.copy(hilt).addScaledVector(direction,WEAPONS[this.weaponKey].reach-(this.halfSword?.35:0));
    this.parts.torso.node.rotation.y+=control.yaw*control.config.torsoRotationInfluence;
    this.parts.torso.node.rotation.x-=control.pitch*.09;
    this.weaponHolder.position.copy(hilt);
    const bladeDirection=tip.sub(hilt).normalize();
    this.weaponHolder.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),bladeDirection);
    this.weapon.position.y=this.halfSword?-.35:0;
    // Two-bone arm IK: a single weapon grip drives each arm, with fixed segment lengths.
    const poseArm=(side,grip)=>{
      const left=side==='left',sign=left?-1:1;
      const shoulder=new THREE.Vector3(sign*.38,1.51,0);
      const offset=grip.clone().sub(shoulder),distance=Math.max(.001,offset.length());
      const direction=offset.clone().divideScalar(distance),upper=.43,lower=.44;
      const along=THREE.MathUtils.clamp((upper*upper-lower*lower+distance*distance)/(2*distance),-upper,upper);
      const bend=new THREE.Vector3(sign*.8,-.7,.45).addScaledVector(direction,-new THREE.Vector3(sign*.8,-.7,.45).dot(direction)).normalize();
      const elbow=shoulder.clone().addScaledVector(direction,along).addScaledVector(bend,Math.sqrt(Math.max(0,upper*upper-along*along))*(this.weaponControl?.config.ikStrength??WEAPON_CONTROL.ikStrength));
      this.parts[`${side}Hand`].node.position.copy(grip);
      for(const [id,from,to] of [[`${side}UpperArm`,shoulder,elbow],[`${side}Forearm`,elbow,grip]]){
        const node=this.parts[id].node;node.position.copy(from).lerp(to,.5);
        node.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),from.clone().sub(to).normalize());
      }
    };
    poseArm('right',hilt);
    const armDrop=1-modifiers.attack;this.parts.rightUpperArm.node.rotation.z-=armDrop*.22;
    if(this.halfSword||['longsword','spear','axe'].includes(this.weaponKey)){
      const leftGrip=hilt.clone().addScaledVector(bladeDirection,this.halfSword?.4:(WEAPON_DYNAMICS[this.weaponKey].secondaryGrip??-.12));
      poseArm('left',leftGrip);
    }
    this.rig.rotation.y=this.weaponControl?this.weaponControl.yaw*this.weaponControl.config.torsoRotationInfluence:0;
    if(this.weaponControl)this.rig.rotation.z-=this.weaponControl.yawVelocity*WEAPONS[this.weaponKey].mass*.012;
    if(this.reaction){
      this.reaction.time+=dt;
      const r=this.reaction,t=r.time/BALANCE.impact.recoilDuration;
      if(t>=1)this.reaction=null;
      else{
        const envelope=Math.sin(Math.min(1,t*3)*Math.PI/2)*(1-t);
        const local=r.direction.clone().applyAxisAngle(new THREE.Vector3(0,1,0),-this.root.rotation.y);
        this.rig.rotation.z-=local.x*r.strength*.13*envelope;
        this.rig.rotation.y+=r.side*r.strength*.13*envelope;
        const part=this.parts[r.part].node;
        part.rotation.x+=local.z*r.strength*.3*envelope;
        part.rotation.z-=local.x*r.strength*.25*envelope;
        this.parts.torso.node.rotation.x+=local.z*r.strength*.12*envelope;
      }
    }
    if(!this.alive){this.collapse=Math.min(1,this.collapse+dt*1.8);this.rig.rotation.x=-this.collapse*1.45;this.rig.position.y=-this.collapse*.015;}
    else this.rig.rotation.x=this.stagger>0?.08:0;
    this.root.updateMatrixWorld(true);
  }
}
