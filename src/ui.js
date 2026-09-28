import { BODY_PARTS, COLORS, DEFAULT_CONTROLS, INJURIES, WEAPONS } from './config.js';

const paths={
  sword:'M7 27 26 4 29 2 28 7 10 29M6 23l7 6M4 31l4-5',
  dagger:'M12 24 26 7 28 3 24 5 10 21M8 20l7 6M6 29l5-6',
  axe:'M9 31 22 5M18 10c6 3 7 1 9-2l3 10c-5 3-9 0-11-2',
  spear:'M5 32 23 9M22 12l-1-7 8-4-2 9Z',
  mace:'M10 31 22 9M19 5l6-3 5 5-3 7-7-2Z',
  shield:'M7 4h20v12c0 8-10 14-10 14S7 24 7 16ZM17 5v22',
  heart:'M17 28S3 19 3 10c0-8 10-9 14-2 5-7 14-6 14 2 0 9-14 18-14 18Z',
  bolt:'m20 2-12 17h8l-3 13 13-19h-9Z',
  drop:'M17 2C15 9 7 17 7 23a10 10 0 0 0 20 0C27 17 19 9 17 2ZM12 21q-2 5 3 6',
  bone:'M11 26 25 10c7 1 8-5 3-6-1-5-7-3-6 3L8 23c-7-2-8 5-3 6 2 5 7 3 6-3Z',
  boot:'M11 3h12l-1 18 7 5v4H6v-8h6Z',
  head:'M10 30v-7L5 17l3-3V9C8-2 28-2 28 10v8l-6 6v6M12 11h3m5 0h3',
  mouse:'M10 3h12a5 5 0 0 1 5 5v17a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5ZM16 3v10M6 14h20',
  sound:'M4 13h6l9-8v24l-9-8H4ZM23 11q7 6 0 12M27 6q12 11 0 22',
  gear:'M17 9a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM17 2v5m0 20v5M2 17h5m20 0h5M6 6l4 4m14 14 4 4M6 28l4-4M24 10l4-4',
  reset:'M7 9a12 12 0 1 1-2 13M7 2v9H0',
};
export function icon(name,cls=''){return `<svg class="icon ${cls}" viewBox="0 0 34 34" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.sword}"/></svg>`;}
const crest=`<svg viewBox="0 0 58 73" class="crest" aria-hidden="true"><path d="M3 3h52v43L29 69 3 46Z" fill="#743d32" stroke="#b19b6c" stroke-width="2"/><path d="M8 8h42v35L29 62 8 43Z" fill="none" stroke="#a98958" stroke-width=".6"/><path d="m29 16 4 12 11 3-11 4-4 17-4-17-11-4 11-3Z" fill="#d2c4a1"/><path d="m18 18 5 3-2 5-5-3ZM40 18l-5 3 2 5 5-3Z" fill="#d2c4a1"/></svg>`;

function bodySvg(){
  return `<svg class="anatomy-figure" viewBox="0 0 160 290" aria-label="Live anatomical injury diagram">
    <g stroke="#c2bfb0" stroke-width="1" stroke-linejoin="round">
      <path data-part="head" d="M66 8 80 3 94 8 97 24 91 39 81 45 70 39 63 24Z"/>
      <path data-part="neck" d="M72 42 88 42 89 54 80 62 71 54Z"/>
      <path data-part="torso" d="M60 51 70 49 80 61 90 49 101 52 108 73 97 101 95 126 81 137 65 125 63 101 52 73Z"/>
      <path data-part="leftUpperArm" d="M51 55 62 60 60 81 48 99 36 94 39 73Z"/>
      <path data-part="leftForearm" d="M36 99 48 103 40 132 30 150 22 146 28 119Z"/>
      <path data-part="leftHand" d="M21 149 31 153 29 171 24 179 20 175 20 167 16 169 17 155Z"/>
      <path data-part="rightUpperArm" d="M109 55 98 60 100 81 112 99 124 94 121 73Z"/>
      <path data-part="rightForearm" d="M124 99 112 103 120 132 130 150 138 146 132 119Z"/>
      <path data-part="rightHand" d="M139 149 129 153 131 171 136 179 140 175 140 167 144 169 143 155Z"/>
      <path data-part="leftThigh" d="M65 130 79 141 73 177 67 196 50 192 52 162Z"/>
      <path data-part="rightThigh" d="M95 130 81 141 87 177 93 196 110 192 108 162Z"/>
      <path data-part="leftLowerLeg" d="M51 198 66 201 62 227 56 257 46 257 45 232Z"/>
      <path data-part="rightLowerLeg" d="M109 198 94 201 98 227 104 257 114 257 115 232Z"/>
      <path data-part="leftFoot" d="M46 261 56 261 57 275 51 283 31 283 31 278Z"/>
      <path data-part="rightFoot" d="M114 261 104 261 103 275 109 283 129 283 129 278Z"/>
    </g><g stroke="#242723" fill="none" opacity=".7"><path d="M70 24h7m7 0h7M80 30v8M63 78l17 9 17-9M66 113h29M79 143l-7-4m9 4 7-4"/></g>
  </svg>`;
}
function status(side,name){return `<section class="status ${side}" aria-label="${name} status">${crest}<div class="status-inner"><div class="status-title"><span>${name}</span><small>${side==='player'?'HOUSE OF ASH':'SPARRING PARTNER'}</small></div>${[['heart','condition'],['bolt','stamina'],['shield','guard']].map(([i,id])=>`<div class="stat-row ${id}">${icon(i)}<div class="meter"><div id="${side}-${id}" class="meter-fill"></div></div><span id="${side}-${id}-value">100 <em>/ 100</em></span></div>`).join('')}</div></section>`;}
const keyName=code=>code.replace('Key','').replace('Arrow','').replace('Left','').replace('Digit','');

export class UI {
  constructor(game){
    this.game=game;this.inspectEnemy=false;this.debugOpen=false;this.lastMessage=0;this.lastHud=0;
    document.querySelector('#ui').innerHTML=`
    <div class="vignette"></div><div id="hurt-screen"></div>
    <header>${status('player','PLAYER')}<div class="brand"><div class="brand-name">IRON <i>&</i> SINEW</div><div class="brand-rule"><span></span> THE TRAINING YARD <span></span></div><div class="location">ASHENHOLD · EARLY AUTUMN</div></div>${status('enemy','TRAINING KNIGHT')}</header>
    <div class="chapter"><span class="eyebrow">COMBAT TRIAL · 01</span><h1>A lesson in steel</h1><p>Every wound leaves its mark.</p></div>
    <div id="target-marker"><span class="target-diamond"></span><small id="enemy-state">LOCKED</small></div>
    <div id="reticle"><i></i><i></i><i></i><i></i></div>
    <div class="controls-hint"><div class="hint-heading">THE ART OF COMBAT <span></span></div>
      <div><kbd>W A S D</kbd><span>Move</span></div><div>${icon('mouse')}<span>Swing <small>Hold left + move mouse</small></span></div><div>${icon('mouse')}<span>Block / Parry <small>Right click</small></span></div><div><kbd data-control="freeLook">C</kbd><span>Look around <small>Hold</small></span></div><div><kbd data-control="thrust">SPACE</kbd><span>Thrust</span></div><div><kbd data-control="kick">E</kbd><span>Kick</span></div><div><kbd data-control="dodge">SHIFT</kbd><span>Quick step</span></div><div><kbd data-control="lock">ALT</kbd><span>Target lock</span></div><div class="hint-secondary"><kbd>F2</kbd><span>Injury laboratory</span></div>
    </div>
    <div id="combat-message" class="combat-message"><strong></strong><span></span></div>
    <div id="event-log" aria-live="polite"></div>
    <section class="weapons"><div class="section-overline">ARMAMENT <span id="stance-label">BALANCED STANCE</span></div><div class="weapon-slots">${['longsword','dagger','axe','spear'].map((key,i)=>`<button class="weapon-slot ${i===0?'selected':''}" data-weapon="${key}" title="Equip ${WEAPONS[key].name} (${i+1})"><kbd>${i+1}</kbd>${icon(WEAPONS[key].icon)}<span>${WEAPONS[key].name}</span><i></i></button>`).join('')}</div><div class="weapon-footer"><button data-action="armory">+ Armory <span>Mace · Arming sword</span></button><span><kbd>R</kbd> Half-sword</span></div></section>
    <section class="direction-control" aria-label="Weapon position and ready poses"><div class="direction-label">FREE WEAPON CONTROL</div><div class="compass"><button class="dir up" data-direction="overhead" aria-label="Overhead attack direction">↑</button><button class="dir left active" data-direction="left" aria-label="Left slash direction">←</button><button class="dir right" data-direction="right" aria-label="Right slash direction">→</button><button class="dir down" data-direction="low" aria-label="Low strike direction">↓</button><div class="compass-center">${icon('sword')}</div><i id="weapon-aim-dot"></i><i id="weapon-position-dot"></i><span class="up-label">OVERHEAD</span><span class="left-label">LEFT<br>READY</span><span class="right-label">RIGHT<br>READY</span><span class="down-label">LOW STRIKE</span></div><span id="combat-state">MOUSE GUIDES BLADE</span><div class="swing-meter"><i id="swing-power"></i></div><small class="swing-instruction">HOLD LEFT + MOVE MOUSE</small></section>
    <section class="injury-panel"><div class="panel-heading"><div>${icon('head')}<span>PHYSICAL CONDITION</span></div><button id="inspect-toggle" title="Inspect the opponent's injuries">YOU <span>⇄</span></button></div><div class="injury-content"><div class="anatomy"><div class="body-label head-label" data-group="head"><b>Head</b><span>Good</span></div><div class="body-label torso-label" data-group="torso"><b>Torso</b><span>Good</span></div><div class="body-label left-arm-label" data-group="leftArm"><b>Left arm</b><span>Good</span></div><div class="body-label right-arm-label" data-group="rightArm"><b>Right arm</b><span>Good</span></div><div class="body-label left-leg-label" data-group="leftLeg"><b>Left leg</b><span>Good</span></div><div class="body-label right-leg-label" data-group="rightLeg"><b>Right leg</b><span>Good</span></div>${bodySvg()}</div><div class="conditions"><span class="eyebrow">ACTIVE CONDITIONS</span><div id="conditions-list"></div><div class="blood-volume"><div>${icon('drop')} BLOOD VOLUME <strong id="blood-value">100%</strong></div><div class="blood-meter"><i id="blood-bar"></i></div><span id="bleeding-rate">No active bleeding</span></div></div></div><div class="panel-footer"><span><i class="status-dot"></i><span id="condition-summary">Combat ready</span></span><button data-action="debug">EXAMINE <span>↗</span></button></div></section>
    <footer class="bottom-bar"><span class="build-mark">I&S <i></i> ANATOMICAL COMBAT PROTOTYPE</span><span id="pointer-hint">CLICK THE ARENA · HOLD LEFT MOUSE + DRAG TO SWING</span><div><button id="sound-button" title="Toggle sound" aria-label="Toggle sound">${icon('sound')}</button><button data-action="help" title="Controls and settings" aria-label="Controls and settings">${icon('gear')}</button><button data-action="reset" title="Restart duel" aria-label="Restart duel">${icon('reset')}</button></div></footer>
    <div id="start-prompt"><span class="eyebrow">STEEL BREAKS. BODIES REMEMBER.</span><button id="start-button">Enter the yard <span>→</span></button><span class="start-note">Move mouse to guide steel · Hold left mouse to strike</span></div>
    <div id="result" class="modal-shade hidden"><div class="result-card"><span class="eyebrow" id="result-eyebrow">THE DUEL IS OVER</span><h2 id="result-title">The body yields.</h2><p id="result-detail"></p><div id="result-stats"></div><button class="primary" data-action="reset">Return to the yard <span>→</span></button><button class="text-button" id="inspect-result">Inspect injuries</button></div></div>
    <aside id="debug-panel" class="hidden"><div class="debug-heading"><div><span class="eyebrow">DEVELOPER TOOLS</span><h2>Injury laboratory</h2></div><button data-action="debug" aria-label="Close injury laboratory">×</button></div><p>Apply controlled trauma to any body region. Both knights share the same simulation.</p><div class="debug-fields"><label>Subject<select id="debug-target"><option value="enemy">Training knight</option><option value="player">Player</option></select></label><label>Body region<select id="debug-part">${BODY_PARTS.map(p=>`<option value="${p.id}">${p.label}</option>`).join('')}</select></label><label>Injury<select id="debug-injury">${Object.entries(INJURIES).filter(([key])=>!['armorDamage','bloodLoss'].includes(key)).map(([key,value])=>`<option value="${key}" ${key==='deepCut'?'selected':''}>${value.label}</option>`).join('')}</select></label><label>Magnitude <output id="magnitude-value">28</output><input id="debug-magnitude" type="range" min="5" max="70" value="28"/></label></div><button class="primary" id="apply-injury">Apply injury</button><div class="debug-presets"><button data-injury="head">Damage head</button><button data-injury="neck">Neck bleeding</button><button data-injury="leftForearm">Left arm cut</button><button data-injury="rightForearm">Right arm cut</button><button data-injury="leftLowerLeg">Left leg fracture</button><button data-injury="rightLowerLeg">Right leg fracture</button></div><label class="checkbox"><input type="checkbox" id="passive-ai"/> Passive opponent</label><label class="checkbox"><input type="checkbox" id="pause-simulation"/> Pause simulation</label><button class="text-button" id="heal-subject">Reset selected character</button><h3>LAST HIT / LIVE TELEMETRY</h3><dl id="debug-readout"></dl></aside>
    <div id="settings" class="modal-shade hidden"><section class="settings-card"><button class="close-modal" id="close-settings" aria-label="Close settings">×</button><span class="eyebrow">FIELD MANUAL</span><h2>The art of survival</h2><p>Strike exposed limbs. Steel turns a blade; a mace transmits force through armor. A wounded enemy can still be dangerous.</p><div class="manual-grid"><div><h3>Deliberate combat</h3><p>Move the mouse to guide your weapon freely. Hold left mouse and sweep sideways, up, down or diagonally to strike. Wind up, then sweep through your opponent; speed and weapon weight determine impact. Reverse your mouse motion for a return cut. Release left mouse to rest and recover stamina. Arrow keys set ready positions. Hold C to look around without moving the weapon. Hold right click to guard; raise it just before impact to parry. Space thrusts. Q cycles stances. R toggles half-swording for precise, shortened thrusts. Scroll to adjust camera distance.</p><h3>Read the body</h3><p>Inspect your opponent using YOU ⇄ in the anatomy panel. Wounds persist, fractures weaken limbs, and bleeding reduces blood volume until collapse. F2 opens the laboratory.</p><h3>Armory</h3><div class="extra-weapons"><button data-weapon="mace">${icon('mace')} Mace <kbd>5</kbd></button><button data-weapon="arming">${icon('sword')} Arming sword <kbd>6</kbd></button></div></div><div><h3>Key bindings <small>Click a key, then press a replacement</small></h3><div id="key-bindings">${Object.entries(DEFAULT_CONTROLS).map(([action,code])=>`<div><span>${action.replace(/([A-Z])/g,' $1')}</span><button data-bind="${action}">${keyName(game.controls[action]||code)}</button></div>`).join('')}</div></div></div><button class="primary" id="resume-button">Return to training <span>→</span></button></section></div>
    <div id="pause-badge" class="hidden">SIMULATION PAUSED</div>`;
    this.bind();
  }
  bind(){
    const game=this.game;
    document.querySelectorAll('[data-weapon]').forEach(button=>button.onclick=()=>{game.equip(button.dataset.weapon);});
    document.querySelectorAll('[data-direction]').forEach(button=>button.onclick=()=>{game.readyWeapon(button.dataset.direction);});
    document.querySelector('#start-button').onclick=()=>game.start();
    document.querySelector('#inspect-toggle').onclick=()=>{this.inspectEnemy=!this.inspectEnemy;document.querySelector('#inspect-toggle').innerHTML=`${this.inspectEnemy?'ENEMY':'YOU'} <span>⇄</span>`;this.update(0,true);};
    document.querySelectorAll('[data-action]').forEach(button=>button.onclick=()=>{
      const action=button.dataset.action;if(action==='reset')game.reset();if(action==='debug')this.toggleDebug();if(action==='help'||action==='armory')this.settings(true);
    });
    document.querySelector('#sound-button').onclick=()=>{game.effects.muted=!game.effects.muted;document.querySelector('#sound-button').classList.toggle('muted',game.effects.muted);};
    document.querySelector('#close-settings').onclick=()=>this.settings(false);document.querySelector('#resume-button').onclick=()=>this.settings(false);
    document.querySelector('#inspect-result').onclick=()=>{document.querySelector('#result').classList.add('hidden');this.inspectEnemy=game.player.alive;this.toggleDebug(true);};
    document.querySelector('#debug-magnitude').oninput=e=>document.querySelector('#magnitude-value').textContent=e.target.value;
    document.querySelector('#apply-injury').onclick=()=>this.inject();
    document.querySelectorAll('[data-injury]').forEach(button=>button.onclick=()=>{const part=button.dataset.injury;document.querySelector('#debug-part').value=part;document.querySelector('#debug-injury').value=part==='neck'?'hemorrhage':part.includes('Leg')?'fracture':part==='head'?'concussion':'deepCut';this.inject();});
    document.querySelector('#passive-ai').onchange=e=>game.ai.passive=e.target.checked;
    document.querySelector('#pause-simulation').onchange=e=>{game.paused=e.target.checked;if(game.paused)game.releaseInput();document.querySelector('#pause-badge').classList.toggle('hidden',!game.paused);};
    document.querySelector('#heal-subject').onclick=()=>{const actor=game[document.querySelector('#debug-target').value];actor.reset();game.ended=false;this.update(0,true);};
    document.querySelectorAll('[data-bind]').forEach(button=>button.onclick=()=>{this.binding=button.dataset.bind;button.textContent='Press key…';});
  }
  inject(){
    const actor=this.game[document.querySelector('#debug-target').value],part=document.querySelector('#debug-part').value,type=document.querySelector('#debug-injury').value,magnitude=Number(document.querySelector('#debug-magnitude').value);
    actor.anatomy.addInjury(part,type,magnitude);actor.addWound(part,{magnitude});
    actor.anatomy.lastHit={weapon:{name:'Laboratory'},bodyPart:part,damageType:'controlled trauma',impactForce:0,armor:actor.anatomy.parts[part].armor,injury:INJURIES[type].label,injuryType:type,magnitude};
    this.game.effects.burst(actor.parts[part].node.getWorldPosition(this.game.scratch),actor.anatomy.parts[part].bleeding>0,9);
    actor.animate(0,this.game.time);
    this.notify(INJURIES[type].label,`${actor.name} · ${actor.anatomy.parts[part].label}`);this.update(0,true);
  }
  toggleDebug(value){this.debugOpen=value??!this.debugOpen;document.querySelector('#debug-panel').classList.toggle('hidden',!this.debugOpen);if(this.debugOpen){this.game.releaseInput();document.exitPointerLock?.();}}
  settings(open){document.querySelector('#settings').classList.toggle('hidden',!open);this.game.menuOpen=open;if(open){this.game.releaseInput();document.exitPointerLock?.();}}
  updateDirection(){document.querySelectorAll('[data-direction]').forEach(b=>b.classList.toggle('active',b.dataset.direction===this.game.direction));}
  notify(title,detail){const el=document.querySelector('#combat-message');el.querySelector('strong').textContent=title;el.querySelector('span').textContent=detail;el.classList.add('visible');this.lastMessage=performance.now();}
  event(event){
    if(event.type==='hit'){
      const result=event.result;this.notify(result.injury,`${event.actor.isPlayer?'You':event.actor.name} · ${event.actor.anatomy.parts[result.bodyPart].label}`);
      const log=document.querySelector('#event-log'),row=document.createElement('div');row.className=event.actor.isPlayer?'received':'dealt';row.innerHTML=`<span>${event.actor.isPlayer?'RECEIVED':'DEALT'}</span> ${result.injury} <i>· ${event.actor.anatomy.parts[result.bodyPart].label}</i>`;log.prepend(row);while(log.children.length>3)log.lastChild.remove();
    }else if(event.type==='parry')this.notify('Perfect parry',`${event.actor.isPlayer?'Their':'Your'} guard is broken. An opening.`);
    else if(event.type==='guardBreak')this.notify('Guard broken','Staggered · exposed');
    else if(event.type==='block')this.notify('Steel meets steel','Attack blocked');
    else if(event.type==='tired'&&event.actor.isPlayer)this.notify('Catch your breath','Not enough stamina');
  }
  update(time,force=false){
    if(!force&&time-this.lastHud<.075)return;this.lastHud=time;
    for(const side of ['player','enemy']){
      const actor=this.game[side];
      for(const key of ['condition','stamina','guard']){
        const value=key==='condition'?actor.anatomy.condition:actor[key];
        document.querySelector(`#${side}-${key}`).style.width=`${value}%`;
        document.querySelector(`#${side}-${key}-value`).innerHTML=`${Math.round(value)} <em>/ 100</em>`;
      }
    }
    const subject=this.inspectEnemy?this.game.enemy:this.game.player,anatomy=subject.anatomy;
    for(const path of document.querySelectorAll('[data-part]')){const severity=anatomy.parts[path.dataset.part].severity;path.style.fill=severity<3?COLORS.healthy:severity<20?COLORS.minor:severity<42?COLORS.medium:severity<72?COLORS.severe:COLORS.critical;}
    for(const [group,part] of Object.entries(anatomy.groups())){const label=document.querySelector(`[data-group="${group}"] span`);label.textContent=part.labelState;label.style.color=part.severity<3?'#9eae8c':part.severity<20?COLORS.minor:part.severity<42?COLORS.medium:COLORS.severe;}
    const conditions=anatomy.conditions();const html=conditions.length?conditions.slice(0,4).map(c=>`<div class="condition ${c.tone}">${icon(c.icon)}<div><b>${c.name}</b><span>${c.detail}</span></div></div>`).join(''):`<div class="healthy-state">${icon('shield')}<b>No active injuries</b><span>Your body is your armor.<br>Keep it intact.</span></div>`;
    const list=document.querySelector('#conditions-list');if(list.innerHTML!==html)list.innerHTML=html;
    document.querySelector('#blood-value').textContent=`${Math.round(anatomy.bloodRatio*100)}%`;
    document.querySelector('#blood-bar').style.width=`${anatomy.bloodRatio*100}%`;
    document.querySelector('#bleeding-rate').textContent=anatomy.bleeding>.02?`Losing ${anatomy.bleeding.toFixed(2)}% / second`:'No active bleeding';
    document.querySelector('#condition-summary').textContent=anatomy.collapsed?anatomy.cause:conditions.length?`${conditions.length} active condition${conditions.length>1?'s':''}`:'Combat ready';
    document.querySelector('.status-dot').classList.toggle('injured',conditions.length>0);
    const p=this.game.player;
    document.querySelector('#combat-state').textContent=!p.alive?'COLLAPSED':p.stagger>0?'STAGGERED':p.attack?p.attack.direction.toUpperCase():p.blocking?'GUARDING':p.stamina<22?'EXHAUSTED':p.weaponMotion.held?(p.weaponMotion.striking?'SWINGING':'WIND UP & SWEEP'):p.halfSword?'HALF-SWORD':'MOUSE GUIDES BLADE';
    const motion=p.weaponMotion;
    for(const [id,yaw,pitch] of [['weapon-aim-dot',motion.targetYaw,motion.targetPitch],['weapon-position-dot',motion.yaw,motion.pitch]]){
      const dot=document.getElementById(id);dot.style.transform=`translate(${yaw*24}px,${-pitch*27}px)`;
    }
    document.querySelector('#weapon-position-dot').classList.toggle('striking',motion.striking);
    document.querySelector('#swing-power').style.width=`${Math.min(100,motion.speed/8*100)}%`;
    document.querySelector('#stance-label').textContent=`${p.stance.toUpperCase()} STANCE`;
    document.querySelectorAll('.weapon-slot').forEach(b=>b.classList.toggle('selected',b.dataset.weapon===p.weaponKey));
    document.querySelector('#hurt-screen').style.opacity=p.hitFlash>0?'.5':String(Math.max(0,(60-p.anatomy.blood)*.009));
    document.querySelector('#enemy-state').textContent=this.game.enemy.anatomy.blood<49?'WEAKENED':this.game.enemy.blocking?'GUARDING':this.game.locked?'LOCKED':'TARGET';
    if(performance.now()-this.lastMessage>2200)document.querySelector('#combat-message').classList.remove('visible');
    if(this.debugOpen){
      const a=this.game[document.querySelector('#debug-target').value].anatomy,hit=a.lastHit,part=a.parts[document.querySelector('#debug-part').value];
      const readout={Weapon:hit?.weapon.name||'—','Last region':hit?.bodyPart||'—',Type:hit?.damageType||'—','Impact force':hit?`${hit.impactForce.toFixed(1)} N*`:'—',Armor:hit?.armor||part.armor,'Bleeding rate':`${a.bleeding.toFixed(2)}% / s`,'Blood volume':`${a.blood.toFixed(1)}%`,Pain:`${a.pain.toFixed(1)} / 100`,Fracture:part.fracture===2?'Severe':part.fracture?'Yes':'No',Structure:`${part.structure.toFixed(1)}%`,Tissue:`${part.tissue.toFixed(1)}% damaged`,Functionality:`${Math.round(part.functionality*100)}%`,Mobility:`${Math.round(a.modifiers.movement*100)}%`,Consciousness:`${a.consciousness.toFixed(1)}%`};
      document.querySelector('#debug-readout').innerHTML=Object.entries(readout).map(([k,v])=>`<dt>${k}</dt><dd>${v}</dd>`).join('');
    }
  }
  showResult(){
    const won=this.game.player.alive,loser=won?this.game.enemy:this.game.player;
    document.querySelector('#result-eyebrow').textContent=won?'THE YARD IS YOURS':'A LESSON LEARNED';
    document.querySelector('#result-title').textContent=won?'The body yields.':'Even steel has limits.';
    document.querySelector('#result-detail').textContent=`${loser.name} collapsed from ${loser.anatomy.cause.toLowerCase()}.`;
    document.querySelector('#result-stats').innerHTML=`<div><strong>${Math.round(loser.anatomy.blood)}%</strong><span>Blood remaining</span></div><div><strong>${Object.values(loser.anatomy.parts).filter(p=>p.injuries.length).length}</strong><span>Regions injured</span></div><div><strong>${Math.round(this.game.elapsed)}s</strong><span>Time in the yard</span></div>`;
    document.querySelector('#result').classList.remove('hidden');document.exitPointerLock?.();
  }
}
