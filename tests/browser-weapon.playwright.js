async (page) => {
  const errors=[],attacks=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.bringToFront();await page.setViewportSize({width:1600,height:950});
  await page.evaluate(()=>{window.__IRON_SINEW__.ai.passive=true;});
  await page.getByRole('button',{name:'Enter the yard →'}).click();
  const prepare=async(distance=1.35)=>page.evaluate(distance=>{
    const g=window.__IRON_SINEW__;g.reset();g.started=true;g.paused=false;g.ai.passive=true;
    g.player.position.set(0,0,0);g.enemy.position.set(0,0,-distance);
    g.player.root.rotation.y=0;g.enemy.root.rotation.y=Math.PI;g.cameraYaw=0;g.cameraPitch=.17;
    g.player.animate(0,g.time);g.enemy.animate(0,g.time);g.updateCamera(1);
  },distance);
  await prepare();
  await page.mouse.move(500,450);
  const yawBefore=await page.evaluate(()=>window.__IRON_SINEW__.cameraYaw);
  await page.mouse.move(630,400,{steps:5});
  const mouse=await page.evaluate(()=>({yaw:window.__IRON_SINEW__.cameraYaw,attack:window.__IRON_SINEW__.player.attack}));
  if(Math.abs(mouse.yaw-yawBefore)<.1||mouse.attack)throw new Error('Mouse did not look freely without keys, or started an attack');
  await page.keyboard.press('AltLeft');
  await page.mouse.move(720,400,{steps:4});
  const lockYaw=await page.evaluate(()=>window.__IRON_SINEW__.cameraYaw);
  await page.evaluate(()=>{for(let i=0;i<30;i++)window.__IRON_SINEW__.step(1/60);});
  if(Math.abs(await page.evaluate(()=>window.__IRON_SINEW__.cameraYaw)-lockYaw)>.001)throw new Error('Target facing pulled the camera back');
  await prepare();
  await page.mouse.click(720,400);
  if(await page.evaluate(()=>!!window.__IRON_SINEW__.player.attack))throw new Error('Left mouse still attacks');
  for(const [key,direction]of [['KeyQ','left'],['KeyE','right'],['KeyR','overhead'],['KeyF','low'],['Space','thrust'],['KeyX','kick']]){
    await prepare(direction==='kick'?.95:1.35);
    await page.keyboard.press(key);
    const result=await page.evaluate(()=>{
      const g=window.__IRON_SINEW__,direction=g.player.attack?.direction;
      for(let i=0;i<100&&!g.enemy.anatomy.lastHit;i++)g.step(1/60);
      const hit=g.enemy.anatomy.lastHit;
      const impact={pause:g.player.attack?.hitPause,reaction:g.enemy.reaction?.part,push:g.enemy.impactVelocity.length()};
      return {direction,hit:hit?.bodyPart,type:hit?.attackType,armor:hit?.armor,force:hit?.impactForce,wounds:g.enemy.wounds.length,impact};
    });
    if(result.direction!==direction||result.type!==direction||!result.hit||!result.wounds||!(result.impact.pause>0)||!(result.impact.push>0))throw new Error(key+' failed: '+JSON.stringify(result));
    if(direction==='low'&&!/Leg|Foot|Thigh/.test(result.hit))throw new Error('Low key did not hit a leg');
    attacks.push(result);
  }
  await prepare();
  await page.mouse.down({button:'right'});
  if(!await page.evaluate(()=>window.__IRON_SINEW__.player.blocking))throw new Error('Weapon guard failed');
  await page.keyboard.press('Escape');await page.mouse.up({button:'right'});
  await page.waitForFunction(()=>!document.pointerLockElement);
  if(await page.evaluate(()=>window.__IRON_SINEW__.player.blocking))throw new Error('Escape left guard active');
  await page.mouse.move(740,420);
  const fallbackBefore=await page.evaluate(()=>window.__IRON_SINEW__.cameraYaw);
  await page.mouse.move(810,440);
  if(Math.abs(await page.evaluate(()=>window.__IRON_SINEW__.cameraYaw)-fallbackBefore)<.05)throw new Error('Free mouse fallback required a button');
  await page.getByRole('button',{name:'Controls and settings',exact:true}).click();
  await page.keyboard.press('KeyQ');
  if(await page.evaluate(()=>!!window.__IRON_SINEW__.player.attack))throw new Error('An attack started behind settings');
  await page.getByRole('button',{name:'Close settings',exact:true}).click();
  await prepare();
  const appearance=await page.evaluate(()=>{
    const g=window.__IRON_SINEW__;
    g.enemy.anatomy.addInjury('torso','deepCut',24);
    const chest=g.enemy.parts.torso.node.localToWorld(g.scratch.set(.10,.10,-.18));
    g.enemy.addWound('torso',{magnitude:24,injuryType:'deepCut',hitDirection:[1,.2,0]},chest);
    g.enemy.anatomy.addInjury('leftUpperArm','bruise',20);g.enemy.addWound('leftUpperArm',{magnitude:20});
    g.player.position.set(-.5,0,.9);g.enemy.animate(0,g.time);g.player.animate(0,g.time);
    g.cameraYaw=.12;g.cameraDistance=2.8;g.updateCamera(1);g.paused=true;
    g.ui.inspectEnemy=true;g.ui.update(g.time,true);
    return g.actors.map(a=>({armor:a.anatomy.parts.torso.armor,head:a.anatomy.parts.head.armor,shield:!!a.shield,cape:!!a.cape,wounds:a.wounds.length}));
  });
  if(appearance.some(a=>a.armor!=='none'||a.head!=='none'||a.shield||a.cape))throw new Error('Fighters still have armor');
  await page.screenshot({path:'output/playwright/keyboard-combat-wounds.png'});
  await page.evaluate(report=>{window.__WEAPON_TEST_REPORT__=report;},{mouse,attacks,appearance,errors});
  if(errors.length)throw new Error(errors.join('\n'));
}
