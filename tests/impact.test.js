import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Character } from '../src/actor.js';
import { CombatSystem } from '../src/combat.js';
import { AnatomySystem } from '../src/anatomy.js';
import { DEFAULT_CONTROLS, WEAPONS, WEAPON_CONTROL } from '../src/config.js';
import { sweepWeapons } from '../src/collision.js';

function yard(distance=1.6,guard=false){
  const scene=new THREE.Scene(),events=[];
  const player=new Character(scene,{name:'Player',player:true});
  const enemy=new Character(scene,{name:'Enemy',position:[0,0,-distance]});
  enemy.root.rotation.y=Math.PI;
  if(!guard){enemy.weaponControl.yaw=enemy.weaponControl.desiredYaw=1.2;enemy.weaponControl.pitch=enemy.weaponControl.desiredPitch=.7;}
  enemy.animate(0,0);
  const combat=new CombatSystem({sound(){},burst(){}},event=>events.push(event));
  const step=(thrust=false)=>{
    combat.time+=1/60;
    player.weaponPrevious=player.bladeWorld();enemy.weaponPrevious=enemy.bladeWorld();
    player.weaponControl.step(1/60,thrust);player.animate(1/60,combat.time);enemy.animate(1/60,combat.time);
    combat.resolve(player,[enemy],1/60);
  };
  return {player,enemy,combat,events,step};
}

test('Bindings leave the mouse as the only player swing input',()=>{
  assert.equal(new Set(Object.values(DEFAULT_CONTROLS)).size,Object.keys(DEFAULT_CONTROLS).length);
  for(const key of ['leftSlash','rightSlash','overhead','low'])assert.equal(DEFAULT_CONTROLS[key],undefined);
  const {player,combat}=yard();
  assert.equal('startAttack' in combat,false);
  assert.equal(player.attack,undefined);
});

test('Mouse deltas set free angular targets while inertia delays movement and reversal',()=>{
  const {player,step}=yard(4);const control=player.weaponControl;
  control.setActive(true);control.addMouseDelta(180,-40);
  assert.ok(control.desiredYaw>0&&control.desiredPitch>WEAPON_CONTROL.readyPitch);
  step();assert.ok(control.yaw<0&&control.pitch<control.desiredPitch);
  for(let i=0;i<8;i++)step();
  assert.ok(control.yaw>0&&control.yawVelocity>0,'the sword should cross center within 150 ms');
  const before=control.yaw;
  control.addMouseDelta(-300,0);step();
  assert.ok(control.yaw>before,'a moving sword should keep some momentum when reversing');
  for(let i=0;i<70;i++)step();
  assert.ok(control.yaw<before,'it should eventually follow the reversed target');
  assert.ok(Math.abs(control.yaw)<=WEAPON_CONTROL.horizontalRange);
});

test('Every weapon completes a mouse swing promptly and settles on target',()=>{
  for(const weaponKey of Object.keys(WEAPONS)){
    const {player,step}=yard(4);
    player.equip(weaponKey);
    const control=player.weaponControl;
    control.setActive(true);control.addMouseDelta(180,0);
    for(let i=0;i<12;i++)step();
    assert.ok(control.yaw>0,`${weaponKey} should swing across center within 200 ms`);
    for(let i=0;i<18;i++)step();
    assert.ok(Math.abs(control.desiredYaw-control.yaw)<.2,`${weaponKey} should settle without wobbling`);
  }
});

test('Vertical, horizontal and diagonal input move the actual blade tip',()=>{
  const {player,step}=yard();const c=player.weaponControl;c.setActive(true);
  const initial=player.bladeWorld().tip.clone();
  c.addMouseDelta(100,-100);for(let i=0;i<35;i++)step();
  const diagonal=player.bladeWorld().tip.clone();
  assert.ok(diagonal.x>initial.x+.4&&diagonal.y>initial.y+.25);
  c.addMouseDelta(-200,200);for(let i=0;i<60;i++)step();
  const reverse=player.bladeWorld().tip;
  assert.ok(reverse.x<diagonal.x-.5&&reverse.y<diagonal.y-.4);
});

test('Holding thrust pushes the grip forward and release pulls it back',()=>{
  const {player,step}=yard(4);const control=player.weaponControl;control.setActive(true);
  const ready=player.bladeWorld().hilt.z;
  for(let i=0;i<25;i++)step(true);
  const extended=player.bladeWorld().hilt.z;
  assert.ok(extended<ready-.2&&control.reach>.2);
  for(let i=0;i<60;i++)step(false);
  assert.ok(player.bladeWorld().hilt.z>extended+.2&&control.reach<.1);
});

test('A fast manual crossing injures more than a slow crossing of the same enemy',()=>{
  const run=fast=>{
    const d=yard();d.player.weaponControl.setActive(true);
    for(let i=0;i<100;i++){
      if(fast&&i===0)d.player.weaponControl.addMouseDelta(180,0);
      if(!fast&&i<60)d.player.weaponControl.addMouseDelta(3,0);
      d.step();
    }
    return d.events.find(event=>event.type==='hit')?.result;
  };
  const fast=run(true),slow=run(false);
  assert.ok(fast&&slow);
  assert.ok(fast.relativeVelocity>slow.relativeVelocity);
  assert.ok(fast.magnitude>slow.magnitude*2);
  assert.ok(fast.bodyPart in new AnatomySystem({unarmored:true}).parts);
});

test('A crossed sword blocks the blade path without applying a body hit',()=>{
  const d=yard(1.35,true),control=d.player.weaponControl;
  control.setActive(true);control.addMouseDelta(180,0);
  for(let i=0;i<90;i++)d.step();
  assert.equal(d.events.filter(event=>event.type==='block').length,1);
  assert.equal(d.events.filter(event=>event.type==='hit').length,0);
  assert.equal(d.enemy.anatomy.lastHit,null);
  assert.ok(control.yaw<0,'the weapon should stop at the opposing blade');
});

test('A continuous fast sweep generates one contact event',()=>{
  const d=yard();d.player.weaponControl.setActive(true);d.player.weaponControl.addMouseDelta(180,0);
  for(let i=0;i<90;i++)d.step();
  assert.equal(d.events.filter(event=>event.type==='hit').length,1);
});

test('Blade sweeps detect crossing segments between frames',()=>{
  const a={hilt:new THREE.Vector3(-1,0,0),tip:new THREE.Vector3(-1,1,0)};
  const b={hilt:new THREE.Vector3(1,0,0),tip:new THREE.Vector3(1,1,0)};
  const fixed={hilt:new THREE.Vector3(0,.2,-.5),tip:new THREE.Vector3(0,.8,.5)};
  assert.ok(sweepWeapons(a,b,fixed,fixed));
});

test('Slow contact causes negligible trauma and flat sword contact loses cutting power',()=>{
  const bare=new AnatomySystem({unarmored:true});
  const base={weapon:WEAPONS.longsword,bodyPart:'torso',attackType:'manual',relativeVelocity:.5};
  assert.equal(bare.receiveHit(base).magnitude,0);
  const clean=new AnatomySystem({unarmored:true}).receiveHit({...base,relativeVelocity:7,edgeAlignment:1});
  const flat=new AnatomySystem({unarmored:true}).receiveHit({...base,relativeVelocity:7,edgeAlignment:0});
  assert.equal(clean.damageType,'cut');assert.equal(flat.damageType,'blunt');
  assert.ok(clean.magnitude>flat.magnitude);
});
