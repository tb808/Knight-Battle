import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Character } from '../src/actor.js';
import { CombatSystem } from '../src/combat.js';

function setup({distance=1.35,weapon='longsword',pitch=.05}={}) {
  const scene=new THREE.Scene(),events=[];
  const player=new Character(scene,{name:'Player',player:true});
  const enemy=new Character(scene,{name:'Enemy',position:[0,0,-distance]});
  player.equip(weapon);enemy.root.rotation.y=Math.PI;
  const combat=new CombatSystem({sound(){},burst(){}},e=>events.push(e));
  const motion=player.weaponMotion;
  const step=(count=1,dt=1/60)=>{
    for(let i=0;i<count;i++){
      combat.time+=dt;combat.tick(player,dt);combat.tick(enemy,dt);
      player.animate(dt,combat.time);enemy.animate(dt,combat.time);
      combat.resolve(player,[enemy],dt);
    }
  };
  motion.targetYaw=-1.15;motion.targetPitch=pitch;step(90);
  return {player,enemy,combat,motion,events,step};
}

test('Mouse controls a continuous diagonal blade pose without starting an animation',()=>{
  const {player,motion,step,events}=setup();
  const before=player.bladeWorld().tip.clone();motion.aim(150,-95);step(30);
  assert.ok(motion.yaw>-.4);assert.ok(motion.pitch>.5);
  assert.ok(player.bladeWorld().tip.distanceTo(before)>.5);
  assert.equal(player.attack,null);assert.equal(events.length,0);
});

test('Holding attack or repositioning without attack cannot damage an opponent',()=>{
  const {player,enemy,combat,motion,events,step}=setup();
  motion.aim(190,0);step(120);
  combat.setSwing(player,true);step(120);
  assert.equal(events.length,0);assert.equal(enemy.anatomy.condition,100);
});

test('A held mouse sweep hits once and resting contact cannot repeat damage',()=>{
  const {player,combat,motion,events,step}=setup();
  combat.setSwing(player,true);motion.aim(390,0);step(120);
  assert.equal(events.filter(e=>e.type==='hit').length,1);
  assert.equal(player.attack,null);assert.ok(player.stamina<100);
  step(120);assert.equal(events.filter(e=>e.type==='hit').length,1);
});

test('A deliberate return sweep rearms without releasing the mouse',()=>{
  const {player,combat,motion,events,step}=setup();
  combat.setSwing(player,true);motion.aim(390,0);step(40);
  motion.aim(240,0);step(40); // Pull out of the target on the far side.
  motion.aim(-450,0);step(60);
  assert.equal(events.filter(e=>e.type==='hit').length,2);
});

test('Mouse-driven low sweeps hit a lower body region and range still matters',()=>{
  const low=setup({pitch:-.55});low.combat.setSwing(low.player,true);low.motion.aim(390,0);low.step(60);
  assert.match(low.events.find(e=>e.type==='hit')?.result.bodyPart||'',/Thigh|Leg|Foot/);
  const far=setup({distance:4});far.combat.setSwing(far.player,true);far.motion.aim(390,0);far.step(90);
  assert.equal(far.events.length,0);
});

test('Actual manual blade contacts can be blocked and parried',()=>{
  for(const parry of [false,true]){
    const {player,enemy,combat,motion,events,step}=setup();
    combat.setBlock(enemy,true);enemy.blockStarted=-100;
    combat.setSwing(player,true);motion.aim(390,0);
    for(let i=0;i<60;i++){if(parry)enemy.blockStarted=combat.time;step();}
    assert.equal(events[0]?.type,parry?'parry':'block');
    assert.equal(enemy.anatomy.condition,100);
    assert.ok(motion.hit||!motion.held);
  }
});

test('Heavy weapons accelerate more slowly and injured arms reduce control',()=>{
  const dagger=setup({weapon:'dagger'}),axe=setup({weapon:'axe'}),injured=setup({weapon:'dagger'});
  injured.player.anatomy.addInjury('rightForearm','severeFracture',50);
  for(const d of [dagger,axe,injured]){d.motion.aim(350,0);d.step(5);}
  assert.ok(dagger.motion.yaw>axe.motion.yaw);
  assert.ok(dagger.motion.yaw>injured.motion.yaw);
});

test('Slow movements stay harmless, fast movements create greater impact',()=>{
  const run=(pixels)=>{
    const d=setup();d.combat.setSwing(d.player,true);
    for(let i=0;i<240;i++){d.motion.aim(pixels,0);d.step();}
    return d.events.find(e=>e.type==='hit')?.result;
  };
  assert.equal(run(1),undefined);
  const measured=run(5),fast=run(16);
  assert.ok(measured&&fast);assert.ok(fast.impactForce>measured.impactForce);
});

test('Moving the character into an enemy with a stationary blade does no swing damage',()=>{
  const {player,combat,motion,events,step}=setup({distance:3});
  motion.targetYaw=0;step(90);combat.setSwing(player,true);
  for(let i=0;i<50;i++){player.position.z-=.035;step();}
  assert.equal(events.length,0);
});

test('Release, guard, dodge, thrust, death and equip clear manual swing history',()=>{
  for(const action of ['release','guard','dodge','thrust','death','equip']){
    const d=setup({distance:4});d.combat.setSwing(d.player,true);d.motion.aim(300,0);d.step(4);
    if(action==='release')d.combat.setSwing(d.player,false);
    if(action==='guard')d.combat.setBlock(d.player,true);
    if(action==='dodge')d.combat.dodge(d.player,new THREE.Vector3(1,0,0));
    if(action==='thrust')d.combat.startAttack(d.player,'thrust');
    if(action==='death'){d.player.anatomy.collapsed=true;d.step();}
    if(action==='equip')d.player.equip('axe');
    assert.equal(d.motion.held,false,action);assert.equal(d.motion.previous,null,action);
  }
});

test('Bounded motion stays finite and converges at different update rates',()=>{
  const angles=[];
  for(const hz of [30,60,120]){
    const d=setup();d.motion.aim(100000,-100000);d.step(hz*2,1/hz);
    assert.ok(Number.isFinite(d.motion.yaw)&&Number.isFinite(d.motion.pitch));
    angles.push([d.motion.yaw,d.motion.pitch]);
  }
  for(const a of angles){assert.ok(Math.abs(a[0]-angles[0][0])<.01);assert.ok(Math.abs(a[1]-angles[0][1])<.01);}
});
