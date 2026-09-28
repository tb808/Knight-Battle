import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Character } from '../src/actor.js';
import { CombatSystem, EnemyAI } from '../src/combat.js';

function duel(distance=1.6){
  const scene=new THREE.Scene(),events=[];
  const player=new Character(scene,{name:'Player',player:true});
  const enemy=new Character(scene,{name:'Enemy',position:[0,0,-distance]});enemy.root.rotation.y=Math.PI;
  const combat=new CombatSystem({sound(){},burst(){}},event=>events.push(event));
  const ai=new EnemyAI(enemy);
  const step=()=>{
    combat.time+=1/60;
    player.weaponPrevious=player.bladeWorld();enemy.weaponPrevious=enemy.bladeWorld();
    combat.tick(player,1/60);combat.tick(enemy,1/60);
    player.weaponControl.step(1/60);ai.update(1/60,player,combat,()=>{});enemy.weaponControl.step(1/60);
    player.animate(1/60,combat.time);enemy.animate(1/60,combat.time);
    combat.resolve(enemy,[player],1/60);combat.resolve(player,[enemy],1/60);
  };
  return {player,enemy,combat,ai,events,step};
}

test('Enemy drives the same spring-controlled weapon and can hit an anatomical region',()=>{
  const d=duel();d.ai.attackTimer=0;
  for(let i=0;i<120;i++)d.step();
  assert.ok(d.events.some(event=>event.type==='hit'&&event.actor===d.player));
  assert.equal(d.enemy.attack,undefined);
  assert.ok(d.enemy.weaponControl.bladeSpeed>=0);
});

test('Passive opponent settles its sword without attacking',()=>{
  const d=duel();d.ai.passive=true;d.ai.attackTimer=0;
  for(let i=0;i<120;i++)d.step();
  assert.equal(d.events.length,0);
  assert.equal(d.enemy.weaponControl.active,false);
});

test('Distant blade sweeps cannot injure an opponent',()=>{
  const d=duel(4);d.ai.passive=true;d.player.weaponControl.setActive(true);d.player.weaponControl.addMouseDelta(180,0);
  for(let i=0;i<90;i++)d.step();
  assert.equal(d.events.length,0);assert.equal(d.enemy.anatomy.condition,100);
});
