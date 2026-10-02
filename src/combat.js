import * as THREE from 'three';
import { BALANCE, WEAPONS, WEAPON_CONTROL } from './config.js';
import { sweepBlade, sweepWeapons, segmentDistance } from './collision.js';

export class CombatSystem {
  constructor(effects,onEvent){this.effects=effects;this.onEvent=onEvent;this.time=0;}
  dodge(actor,direction){
    if(!actor.alive||actor.stagger>0||actor.dodge>0||actor.stamina<BALANCE.combat.dodgeCost)return false;
    actor.stamina-=BALANCE.combat.dodgeCost;actor.dodge=.22*actor.anatomy.modifiers.movement+.1;
    actor.weaponControl.cancel();
    actor.dodgeVector.copy(direction).normalize();return true;
  }
  tick(actor,dt){
    actor.anatomy.update(dt);
    actor.stagger=Math.max(0,actor.stagger-dt);actor.dodge=Math.max(0,actor.dodge-dt);
    if(!actor.alive){actor.weaponControl.cancel();actor.blocking=false;return;}
    const mod=actor.anatomy.modifiers;
    actor.stamina=Math.min(100,actor.stamina+dt*BALANCE.combat.staminaRecovery*mod.regeneration*(actor.weaponControl.active?.42:1));
    actor.guard=Math.min(100,actor.guard+dt*BALANCE.combat.guardRecovery*(actor.blocking?.15:1));
  }
  block(attacker,target,position,speed,alpha=1){
    const control=attacker.weaponControl,defense=target.weaponControl;
    const parry=defense.guarding&&defense.guardTime<BALANCE.combat.parryWindow;
    const cost=(8+speed*1.8)*(target.stance==='Defensive'?.65:1);
    target.guard=Math.max(0,target.guard-(parry?cost*.25:cost));
    target.stamina=Math.max(0,target.stamina-(parry?2:5));
    control.stopAtContact(alpha);
    control.hitTargets.add(target);
    if(!defense.guarding)defense.stopAtContact(alpha);
    if(target.guard<=0){target.stagger=.42;defense.cancel();}
    if(parry){attacker.stagger=.22;control.queued=null;}
    attacker.animate(0,this.time);target.animate(0,this.time);
    this.effects.burst(position,false,parry?12:7);this.effects.sound('armor',parry?1:.75);
    this.onEvent({type:target.guard<=0?'guardBreak':parry?'parry':'block',actor:target,attacker,position,impact:.5});
  }
  resolve(attacker,targets,dt){
    const control=attacker.weaponControl;
    if(!attacker.alive||!attacker.weaponPrevious)return;
    const previous=attacker.weaponPrevious,current=attacker.bladeWorld();
    const tipVelocity=current.tip.clone().sub(previous.tip).divideScalar(Math.max(dt,.001));
    control.bladeSpeed=tipVelocity.length();
    if(control.phase==='swing'&&control.swingSoundId!==control.attackId){
      control.swingSoundId=control.attackId;this.effects.sound('swing',.45+WEAPONS[attacker.weaponKey].mass*.12);
    }
    if(!control.canDamage||attacker.stagger>0||attacker.dodge>0)return;
    for(const target of targets){
      if(target===attacker||!target.alive||control.hitTargets.has(target)||target.dodge>.12)continue;
      const hit=sweepBlade(previous,current,target.colliders(),WEAPON_CONTROL.bladeRadius,['spear','axe','mace'].includes(attacker.weaponKey)?.72:.1);
      if(target.weaponPrevious&&(target.weaponControl.guarding||target.weaponControl.canDamage)){
        const targetBlade=target.bladeWorld();
        const clash=sweepWeapons(previous,current,target.weaponPrevious,targetBlade);
        const beforeDistance=segmentDistance(previous.hilt,previous.tip,target.weaponPrevious.hilt,target.weaponPrevious.tip).distance;
        const afterDistance=segmentDistance(current.hilt,current.tip,targetBlade.hilt,targetBlade.tip).distance;
        const separating=beforeDistance<.095&&afterDistance>beforeDistance+.001;
        if(clash&&!separating&&control.bladeSpeed>WEAPON_CONTROL.minimumDamageVelocity&&(!hit||clash.sweepTime<=hit.sweepTime)){
          this.block(attacker,target,new THREE.Vector3(clash.point.x,clash.point.y,clash.point.z),control.bladeSpeed,clash.sweepTime);
          return;
        }
      }
      if(!hit)continue;
      if(hit.t<.1)continue; // Handle and guard do not cut.
      const before=previous.hilt.clone().lerp(previous.tip,hit.t);
      const after=current.hilt.clone().lerp(current.tip,hit.t);
      const contactVelocity=after.sub(before).divideScalar(Math.max(dt,.001)).sub(target.frameVelocity);
      const speed=Math.min(15,contactVelocity.length());
      if(speed<WEAPON_CONTROL.minimumDamageVelocity)continue;
      const toward=attacker.position.clone().sub(target.position).setY(0).normalize();
      const forward=new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0),target.root.rotation.y);
      if(target.weaponControl.guarding&&toward.dot(forward)>.35){
        this.block(attacker,target,new THREE.Vector3(hit.point.x,hit.point.y,hit.point.z),speed,hit.sweepTime);return;
      }
      const direction=contactVelocity.clone().normalize();
      const bladeDirection=current.tip.clone().sub(current.hilt).normalize();
      if(control.attack?.type==='thrust'&&(direction.dot(bladeDirection)<.55||control.reachVelocity<.4))continue;
      const thrust=control.attack?.type==='thrust'&&direction.dot(bladeDirection)>.55;
      const edge=new THREE.Vector3(1,0,0).applyQuaternion(attacker.weaponHolder.getWorldQuaternion(new THREE.Quaternion()));
      const alignment=thrust?1:Math.abs(direction.dot(edge));
      const bladeRegion=hit.t<.35?'base':hit.t>.8?'tip':'middle';
      const weapon=WEAPONS[attacker.weaponKey];
      const result=target.anatomy.receiveHit({attacker:attacker.name,target:target.name,weapon,bodyPart:hit.bodyPart,
        attackType:thrust?'thrust':'cut',halfSword:attacker.halfSword,relativeVelocity:speed,heavyDamageVelocity:thrust?2.2:WEAPON_CONTROL.heavyDamageVelocity-WEAPON_CONTROL.minimumDamageVelocity,
        edgeAlignment:alignment,bladeRegion,impactForce:weapon.mass*speed*8,hitPosition:hit.point,hitDirection:direction.toArray(),
        power:.72*attacker.anatomy.modifiers.attack*(attacker.stance==='Aggressive'?1.12:attacker.stance==='Defensive'?.85:1)});
      if(!result)continue;
      control.hitTargets.add(target);
      control.lastImpact={point:hit.point,speed,alignment,bodyPart:hit.bodyPart,direction:direction.clone()};
      const position=new THREE.Vector3(hit.point.x,hit.point.y,hit.point.z);
      target.addWound(hit.bodyPart,result,hit.point);
      const impact=Math.min(1.5,weapon.mass*speed/12);
      target.stagger=Math.min(.3,.06+impact*.12);
      target.weaponControl.cancel();
      target.reaction={part:hit.bodyPart,direction:direction.clone(),strength:.4+impact,time:0,side:hit.bodyPart.startsWith('left')?-1:1};
      target.impactVelocity.addScaledVector(direction.clone().setY(0).normalize(),Math.min(BALANCE.impact.maxImpulse,impact*.6));
      const blood=result.damageType!=='blunt'&&target.anatomy.parts[hit.bodyPart].bleeding>.03;
      if(blood)this.effects.burst(position,true,Math.round(4+impact*6),direction);
      this.effects.sound('flesh',.65+impact*.4);
      if(blood)attacker.weapon.userData.blade.material.color.lerp(new THREE.Color('#742e29'),.18);
      this.onEvent({type:'hit',actor:target,attacker,result,position,impact});
      return;
    }
  }
}

export class EnemyAI {
  constructor(actor){this.actor=actor;this.think=.5;this.attackTimer=2.2;this.phase='idle';this.phaseTime=0;this.orbit=1;this.passive=false;}
  update(dt,target,combat,move){
    const actor=this.actor,control=actor.weaponControl;
    if(this.passive||!actor.alive||!target.alive){control.cancel();actor.moving=0;this.phase='idle';return;}
    actor.face(target.position,dt);
    this.think-=dt;this.attackTimer-=dt;
    const distance=actor.position.distanceTo(target.position),mod=actor.anatomy.modifiers;
    if(actor.stagger>0){control.cancel();actor.blocking=false;this.phase='idle';actor.moving=0;return;}
    if(this.think<=0){this.think=.25+Math.random()*.35;if(Math.random()<.14)this.orbit*=-1;}
    if(this.phase!=='idle'){
      this.phaseTime-=dt;move(actor,new THREE.Vector3(),dt,0);
      if(this.phaseTime<=0){
        this.phase='idle';control.setGuard(false);
      }
      return;
    }
    if(!control.attack&&target.weaponControl.phase==='windup'&&distance<2.3&&Math.random()<dt*2.2*mod.coordination){
      control.setGuard(true);this.phase='guard';this.phaseTime=.6;return;
    }
    const toward=target.position.clone().sub(actor.position);toward.y=0;toward.normalize();
    // Close to a distance where the committed arc can reach the body, rather
    // than stopping at the full straight-blade reach and swinging short.
    const preferred=WEAPONS[actor.weaponKey].reach-.05;
    const retreat=actor.stamina<24||actor.anatomy.blood<49;
    let stride=0;
    if(distance>preferred+.05)stride=retreat?.28:1;
    else if(distance<preferred-.42||retreat&&distance<3)stride=-.8;
    const direction=toward.clone().multiplyScalar(stride);
    if(distance<3.2)direction.add(new THREE.Vector3(toward.z,0,-toward.x).multiplyScalar(.15*this.orbit));
    move(actor,direction,dt,1.8*mod.movement*(control.attack?.75:1));
    if(distance<preferred+.18&&this.attackTimer<=0&&!retreat&&!control.attack){
      const direction=[{x:1,y:0},{x:-1,y:0},{x:0,y:-1}][Math.floor(Math.random()*3)];
      control.requestAttack(['spear','dagger'].includes(actor.weaponKey)?'thrust':'cut',direction);
      this.attackTimer=1.15+Math.random()*.75;
    }
  }
}
