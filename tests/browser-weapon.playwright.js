async (page) => {
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.bringToFront();await page.setViewportSize({width:1600,height:950});
  await page.getByRole('button',{name:'Enter the yard →'}).click();
  await page.keyboard.press('Escape');
  await page.evaluate(()=>{const g=window.__IRON_SINEW__;g.reset();g.ai.passive=true;});
  await page.mouse.move(520,430);await page.mouse.move(600,430,{steps:4});
  const ready=await page.evaluate(()=>{
    const g=window.__IRON_SINEW__;return {phase:g.player.weaponControl.phase,direction:g.player.weaponControl.aimName,camera:g.cameraYaw};
  });
  if(ready.phase!=='ready'||ready.direction!=='RIGHT CUT')throw new Error('Mouse direction selection failed');
  await page.mouse.down();await page.mouse.up();
  await page.waitForFunction(()=>window.__IRON_SINEW__.player.weaponControl.attackId===1);
  await page.waitForFunction(()=>window.__IRON_SINEW__.player.weaponControl.phase==='ready');
  const click=await page.evaluate(()=>({id:window.__IRON_SINEW__.player.weaponControl.attackId,camera:window.__IRON_SINEW__.cameraYaw}));
  if(Math.abs(click.camera-ready.camera)>.08)throw new Error('Locked camera moved during mouse selection');
  await page.mouse.down({button:'right'});
  await page.waitForFunction(()=>window.__IRON_SINEW__.player.blocking);
  await page.evaluate(()=>{window.__IRON_SINEW__.player.stagger=.12;});
  await page.waitForFunction(()=>!window.__IRON_SINEW__.player.blocking);
  await page.waitForFunction(()=>window.__IRON_SINEW__.player.blocking);
  await page.mouse.up({button:'right'});
  if(await page.evaluate(()=>window.__IRON_SINEW__.player.blocking))throw new Error('Right mouse release left guard active');
  await page.keyboard.press('Space');
  const thrust=await page.evaluate(()=>window.__IRON_SINEW__.player.weaponControl.attack?.type);
  if(thrust!=='thrust')throw new Error('Space did not start thrust');
  await page.waitForFunction(()=>window.__IRON_SINEW__.player.weaponControl.phase==='ready');
  await page.keyboard.press('KeyV');if(!await page.locator('#weapon-debug').isVisible())throw new Error('Weapon diagnostics missing');
  const impact=await page.evaluate(()=>{
    const g=window.__IRON_SINEW__;g.reset();g.ai.passive=true;g.paused=false;
    g.player.position.set(0,0,0);g.enemy.position.set(0,0,-1.4);
    g.player.root.rotation.y=0;g.enemy.root.rotation.y=Math.PI;
    g.player.animate(0,g.time);g.enemy.animate(0,g.time);
    g.player.weaponControl.requestAttack();for(let i=0;i<90;i++)g.step(1/60);
    const hit=g.enemy.anatomy.lastHit;
    return {part:hit?.bodyPart,speed:hit?.relativeVelocity,edge:hit?.edgeAlignment,wounds:g.enemy.wounds.length,phase:g.player.weaponControl.phase};
  });
  if(!impact.part||impact.speed<=1||impact.edge<.6||!impact.wounds||impact.phase!=='ready')throw new Error('Directional contact failed: '+JSON.stringify(impact));
  // Escape/focus changes must clear both buffered attacks and held defense.
  await page.mouse.down({button:'right'});await page.keyboard.press('Escape');await page.mouse.up({button:'right'});
  if(await page.evaluate(()=>window.__IRON_SINEW__.player.weaponControl.guardHeld))throw new Error('Escape left guard held');
  await page.screenshot({path:'output/playwright/directional-combat.png'});
  const report={ready,click,thrust,impact,errors};
  await page.evaluate(report=>{window.__WEAPON_TEST_REPORT__=report;},report);
  if(errors.length)throw new Error(errors.join('\n'));
  console.log(JSON.stringify(report));
}
