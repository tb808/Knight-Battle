import * as THREE from 'three';
import { BALANCE, WEAPONS } from './config.js';
import { sweepBlade } from './collision.js';

export class CombatSystem {
  constructor(effects,onEvent){this.effects=effects;this.onEvent=onEvent;this.time=0;}
  startAttack(actor,direction='left'){
    if(!actor.alive||actor.attack||actor.stagger>0||actor.cooldown>0||actor.dodge>0)return false;
    const weapon=WEAPONS[actor.weaponKey];const cost=direction==='kick'?BALANCE.combat.kickCost:weapon.stamina*(actor.stance==='Aggressive'?1.15:1);
    if(actor.stamina<cost){this.onEvent({type:'tired',actor});return false;}
    const fatigue=.7+.3*actor.stamina/100;
    actor.stamina-=cost;actor.blocking=false;
    actor.attack={direction,time:0,duration:(direction==='kick'?.68:.94)/(weapon.speed*(.45+.55*actor.anatomy.modifiers.attack)*fatigue),hit:false,previous:null,aimHeight:actor.halfSword?1.59:1.29};
    this.effects.sound('swing',.7);return true;
  }
  setBlock(actor,blocking){
    if(blocking&&!actor.blocking&&!actor.attack&&actor.stagger<=0&&actor.stamina>2&&actor.alive){actor.blockStarted=this.time;actor.blocking=true;}
    if(!blocking)actor.blocking=false;
  }
  dodge(actor,direction){
    if(!actor.alive||actor.attack||actor.stagger>0||actor.dodge>0||actor.stamina<BALANCE.combat.dodgeCost)return false;
    actor.stamina-=BALANCE.combat.dodgeCost;actor.dodge=.22*actor.anatomy.modifiers.movement+.1;actor.dodgeVector.copy(direction).normalize();actor.blocking=false;return true;
  }
  tick(actor,dt){
    actor.anatomy.update(dt);actor.cooldown=Math.max(0,actor.cooldown-dt);actor.stagger=Math.max(0,actor.stagger-dt);actor.dodge=Math.max(0,actor.dodge-dt);
    if(!actor.alive){actor.attack=null;actor.blocking=false;return;}
    const mod=actor.anatomy.modifiers;
    if(!actor.attack&&actor.stagger<=0){actor.stamina=Math.min(100,actor.stamina+dt*BALANCE.combat.staminaRecovery*mod.regeneration*(actor.blocking?.22:1));actor.guard=Math.min(100,actor.guard+dt*BALANCE.combat.guardRecovery*(actor.blocking?.15:1));}
    if(actor.attack){actor.attack.time+=dt;if(actor.attack.time>=actor.attack.duration){actor.attack=null;actor.cooldown=.18+(1-mod.attack)*.3;}}
  }
  resolve(attacker,targets,dt){
    const attack=attacker.attack;if(!attack||!attacker.alive)return;
    let current;
    if(attack.direction==='kick'){
      const foot=attacker.parts.rightFoot.node.getWorldPosition(new THREE.Vector3());
      current={hilt:foot.clone().add(new THREE.Vector3(0,.13,0)),tip:foot};
    }else current=attacker.bladeWorld();
    const phase=attack.time/attack.duration;
    if(!attack.previous){attack.previous=current;return;}
    if(phase>=.22&&phase<=.76&&!attack.hit){
      for(const target of targets){
        if(target===attacker||!target.alive)continue;
        const hit=sweepBlade(attack.previous,current,target.colliders(),attack.direction==='kick'?.12:.05);
        if(!hit)continue;
        attack.hit=true;
        const position=new THREE.Vector3(hit.point.x,hit.point.y,hit.point.z);
        const toward=attacker.position.clone().sub(target.position).normalize();
        const forward=new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0),target.root.rotation.y);
        const canBlock=target.blocking&&forward.dot(toward)>.12&&target.guard>0&&target.stamina>2;
        if(canBlock&&attack.direction!=='kick'){
          const parry=this.time-target.blockStarted<=BALANCE.combat.parryWindow*(.65+.35*target.anatomy.modifiers.block);
          if(parry){attacker.stagger=.75;attacker.guard=Math.max(0,attacker.guard-25);target.stamina=Math.min(100,target.stamina+8);}
          else{
            const cost=(WEAPONS[attacker.weaponKey].mass*7+7)/target.anatomy.modifiers.block*(target.stance==='Defensive'?.76:1);
            target.stamina=Math.max(0,target.stamina-cost*.6);target.guard=Math.max(0,target.guard-cost);
            if(target.guard<=0||target.stamina<=0){target.blocking=false;target.stagger=1.05;}
          }
          this.effects.burst(position,false,18);this.effects.sound(parry?'parry':'armor');
          this.onEvent({type:parry?'parry':target.guard<=0?'guardBreak':'block',actor:target,attacker,position});
          break;
        }
        const velocity=Math.max(2.8,Math.min(11,current.tip.distanceTo(attack.previous.tip)/Math.max(dt,.001)));
        const weapon=attack.direction==='kick'?{...WEAPONS.mace,name:'Kick',blunt:13,mass:2,cutting:0}:WEAPONS[attacker.weaponKey];
        const result=target.anatomy.receiveHit({attacker:attacker.name,target:target.name,weapon,bodyPart:hit.bodyPart,attackType:attack.direction,relativeVelocity:velocity,impactForce:weapon.mass*velocity*8,hitPosition:hit.point,hitDirection:toward.toArray(),halfSword:attacker.halfSword,power:(.55+.45*attacker.anatomy.modifiers.attack)*(attacker.stance==='Aggressive'?1.12:attacker.stance==='Defensive'?.85:1)});
        if(result){
          target.addWound(hit.bodyPart,result,hit.point);target.stagger=attack.direction==='kick'?.65:.19;
          if(attack.direction==='kick'){target.guard=Math.max(0,target.guard-33);target.blocking=false;}
          const blood=target.anatomy.parts[hit.bodyPart].bleeding>.03;
          this.effects.burst(position,blood,blood?16:11);this.effects.sound(blood?'hit':'armor');
          if(blood)attacker.weapon.userData.blade.material.color.lerp(new THREE.Color('#742e29'),.18);
          this.onEvent({type:'hit',actor:target,attacker,result,position});
        }
        break;
      }
    }
    attack.previous=current;
  }
}

export class EnemyAI {
  constructor(actor){this.actor=actor;this.think=.5;this.attackTimer=2.2;this.blockTimer=0;this.orbit=1;this.passive=false;}
  update(dt,target,combat,move){
    const actor=this.actor;if(this.passive||!actor.alive||!target.alive){combat.setBlock(actor,false);actor.moving=0;return;}
    actor.face(target.position,dt);this.think-=dt;this.attackTimer-=dt;this.blockTimer-=dt;
    const distance=actor.position.distanceTo(target.position),mod=actor.anatomy.modifiers;
    if(this.think<=0){
      this.think=.25+Math.random()*.35;
      if(Math.random()<.14)this.orbit*=-1;
      if(target.attack&&target.attack.time/target.attack.duration<.42&&Math.random()<.52*mod.coordination&&actor.stamina>24){combat.setBlock(actor,true);this.blockTimer=.48;}
    }
    if(this.blockTimer<=0)combat.setBlock(actor,false);
    if(actor.attack||actor.stagger>0){actor.moving=0;return;}
    const toward=target.position.clone().sub(actor.position);toward.y=0;toward.normalize();
    const preferred=WEAPONS[actor.weaponKey].reach+.2;
    const retreat=actor.stamina<24||actor.anatomy.blood<49;
    let step=0;
    if(distance>preferred+.15)step=retreat?.28:1;
    else if(distance<preferred-.42||retreat&&distance<3)step=-.8;
    const direction=toward.clone().multiplyScalar(step);
    if(distance<3.2)direction.add(new THREE.Vector3(toward.z,0,-toward.x).multiplyScalar(.15*this.orbit));
    move(actor,direction,dt,1.8*mod.movement*(actor.blocking?.55:1));
    if(distance<preferred+.35&&this.attackTimer<=0&&actor.stamina>WEAPONS[actor.weaponKey].stamina+10&&!retreat){
      const options=['left','right','overhead','low','thrust'];
      if(combat.startAttack(actor,options[Math.floor(Math.random()*options.length)]))this.attackTimer=1.45+Math.random()*.9+(1-mod.attack)*1.4;
    }
  }
}
