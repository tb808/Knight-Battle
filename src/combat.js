import * as THREE from 'three';
import { BALANCE, WEAPONS, WEAPON_CONTROL } from './config.js';
import { sweepBlade, sweepWeapons, segmentDistance } from './collision.js';

export class CombatSystem {
  constructor(effects,onEvent){this.effects=effects;this.onEvent=onEvent;this.time=0;}
  dodge(actor,direction){
    if(!actor.alive||actor.stagger>0||actor.dodge>0||actor.stamina<BALANCE.combat.dodgeCost)return false;
    actor.stamina-=BALANCE.combat.dodgeCost;actor.dodge=.22*actor.anatomy.modifiers.movement+.1;
    actor.dodgeVector.copy(direction).normalize();return true;
  }
  tick(actor,dt){
    actor.anatomy.update(dt);
    actor.stagger=Math.max(0,actor.stagger-dt);actor.dodge=Math.max(0,actor.dodge-dt);
    if(!actor.alive){actor.weaponControl.setActive(false);actor.blocking=false;return;}
    const mod=actor.anatomy.modifiers;
    actor.stamina=Math.min(100,actor.stamina+dt*BALANCE.combat.staminaRecovery*mod.regeneration*(actor.weaponControl.active?.42:1));
    actor.guard=Math.min(100,actor.guard+dt*BALANCE.combat.guardRecovery);
  }
  resolve(attacker,targets,dt){
    const control=attacker.weaponControl;
    if(!attacker.alive||!attacker.weaponPrevious)return;
    const previous=attacker.weaponPrevious,current=attacker.bladeWorld();
    const tipVelocity=current.tip.clone().sub(previous.tip).divideScalar(Math.max(dt,.001));
    control.bladeSpeed=tipVelocity.length();
    for(const target of targets){
      if(target===attacker||!target.alive)continue;
      if(target.weaponPrevious){
        const targetBlade=target.bladeWorld();
        const clash=sweepWeapons(previous,current,target.weaponPrevious,targetBlade);
        const beforeDistance=segmentDistance(previous.hilt,previous.tip,target.weaponPrevious.hilt,target.weaponPrevious.tip).distance;
        const afterDistance=segmentDistance(current.hilt,current.tip,targetBlade.hilt,targetBlade.tip).distance;
        const separating=beforeDistance<.095&&afterDistance>beforeDistance+.001;
        if(!clash&&afterDistance>.15&&control.weaponContact===target)control.weaponContact=null;
        if(clash&&!separating&&control.bladeSpeed>.05){
          control.stopAtContact();target.weaponControl.stopAtContact();
          attacker.animate(0,this.time);target.animate(0,this.time);
          if(control.weaponContact!==target&&this.time>=control.contactUntil){
            control.weaponContact=target;target.weaponControl.weaponContact=attacker;
            control.contactUntil=this.time+WEAPON_CONTROL.contactCooldown;
            target.weaponControl.contactUntil=control.contactUntil;
            attacker.guard=Math.max(0,attacker.guard-5);target.guard=Math.max(0,target.guard-5);
            const position=new THREE.Vector3(clash.point.x,clash.point.y,clash.point.z);
            this.effects.burst(position,false,8);this.effects.sound('armor',.8);
            this.onEvent({type:'block',actor:target,attacker,position,impact:.5});
          }
          return;
        }
      }
      const hit=sweepBlade(previous,current,target.colliders(),WEAPON_CONTROL.bladeRadius);
      if(!hit){if(control.lastContact?.target===target)control.lastContact.separated=true;continue;}
      if(hit.t<.1)continue; // Handle and guard do not cut.
      const before=previous.hilt.clone().lerp(previous.tip,hit.t);
      const after=current.hilt.clone().lerp(current.tip,hit.t);
      const contactVelocity=after.sub(before).divideScalar(Math.max(dt,.001)).sub(target.frameVelocity);
      const speed=Math.min(15,contactVelocity.length());
      if(speed<WEAPON_CONTROL.minimumDamageVelocity)continue;
      const direction=contactVelocity.clone().normalize();
      const old=control.lastContact;
      if(old?.target===target&&(this.time<old.until||(!old.separated&&direction.dot(old.direction)>-.4)))continue;
      const bladeDirection=current.tip.clone().sub(current.hilt).normalize();
      const thrust=direction.dot(bladeDirection)>.8;
      const edge=new THREE.Vector3(1,0,0).applyQuaternion(attacker.weaponHolder.getWorldQuaternion(new THREE.Quaternion()));
      const alignment=thrust?1:Math.abs(direction.dot(edge));
      const bladeRegion=hit.t<.35?'base':hit.t>.8?'tip':'middle';
      const weapon=WEAPONS[attacker.weaponKey];
      const result=target.anatomy.receiveHit({attacker:attacker.name,target:target.name,weapon,bodyPart:hit.bodyPart,
        attackType:thrust?'thrust':'manual',relativeVelocity:speed,heavyDamageVelocity:WEAPON_CONTROL.heavyDamageVelocity-WEAPON_CONTROL.minimumDamageVelocity,
        edgeAlignment:alignment,bladeRegion,impactForce:weapon.mass*speed*8,hitPosition:hit.point,hitDirection:direction.toArray(),
        power:attacker.anatomy.modifiers.attack*(attacker.stance==='Aggressive'?1.12:attacker.stance==='Defensive'?.85:1)});
      if(!result)continue;
      control.lastContact={target,bodyPart:hit.bodyPart,until:this.time+WEAPON_CONTROL.contactCooldown,direction,separated:false};
      control.lastImpact={point:hit.point,speed,alignment,bodyPart:hit.bodyPart};
      const position=new THREE.Vector3(hit.point.x,hit.point.y,hit.point.z);
      target.addWound(hit.bodyPart,result,hit.point);
      const impact=Math.min(1.5,weapon.mass*speed/12);
      target.stagger=Math.min(.48,.08+impact*.2);
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
  begin(phase,duration,yaw,pitch){
    this.phase=phase;this.phaseTime=duration;
    this.actor.weaponControl.setActive(true);
    this.actor.weaponControl.desiredYaw=yaw;
    this.actor.weaponControl.desiredPitch=pitch;
    this.actor.blocking=phase==='guard';
  }
  update(dt,target,combat,move){
    const actor=this.actor,control=actor.weaponControl;
    if(this.passive||!actor.alive||!target.alive){control.setActive(false);actor.blocking=false;actor.moving=0;this.phase='idle';return;}
    actor.face(target.position,dt);
    this.think-=dt;this.attackTimer-=dt;
    const distance=actor.position.distanceTo(target.position),mod=actor.anatomy.modifiers;
    if(actor.stagger>0){control.setActive(false);actor.blocking=false;this.phase='idle';actor.moving=0;return;}
    if(this.think<=0){this.think=.25+Math.random()*.35;if(Math.random()<.14)this.orbit*=-1;}
    if(this.phase!=='idle'){
      this.phaseTime-=dt;actor.moving=0;
      if(this.phaseTime<=0){
        if(this.phase==='windup')this.begin('swing',.55,1.15,control.desiredPitch);
        else {this.phase='idle';control.setActive(false);actor.blocking=false;this.attackTimer=1.4+Math.random()*.9;}
      }
      return;
    }
    if(target.weaponControl.active&&target.weaponControl.bladeSpeed>3&&distance<2.3&&Math.random()<dt*.8*mod.coordination){
      this.begin('guard',.5,-.1,.7);return;
    }
    const toward=target.position.clone().sub(actor.position);toward.y=0;toward.normalize();
    const preferred=WEAPONS[actor.weaponKey].reach+.2;
    const retreat=actor.stamina<24||actor.anatomy.blood<49;
    let stride=0;
    if(distance>preferred+.15)stride=retreat?.28:1;
    else if(distance<preferred-.42||retreat&&distance<3)stride=-.8;
    const direction=toward.clone().multiplyScalar(stride);
    if(distance<3.2)direction.add(new THREE.Vector3(toward.z,0,-toward.x).multiplyScalar(.15*this.orbit));
    move(actor,direction,dt,1.8*mod.movement);
    if(distance<preferred+.35&&this.attackTimer<=0&&!retreat){
      const pitch=[-.25,.05,.32][Math.floor(Math.random()*3)];
      this.begin('windup',.25,-1.1,pitch);
      actor.stamina=Math.max(0,actor.stamina-WEAPONS[actor.weaponKey].stamina*.4);
    }
  }
}
