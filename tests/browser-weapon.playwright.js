async (page) => {
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.bringToFront();
  await page.setViewportSize({width:1600,height:950});
  await page.evaluate(()=>{window.__IRON_SINEW__.ai.passive=true;});
  await page.getByRole('button',{name:'Enter the yard →'}).click();
  const prepare=async()=>page.evaluate(()=>{
    const g=window.__IRON_SINEW__;g.reset();g.started=true;g.paused=false;g.ai.passive=true;
    g.player.position.set(0,0,0);g.enemy.position.set(0,0,-1.35);
    g.player.root.rotation.y=0;g.enemy.root.rotation.y=Math.PI;g.cameraYaw=0;
    g.player.weaponMotion.targetYaw=-1.15;g.player.weaponMotion.targetPitch=.05;
    for(let i=0;i<90;i++)g.step(1/60);
    g.ui.inspectEnemy=false;g.ui.update(0,true);
  });
  await prepare();
  const pointerLocked=await page.evaluate(()=>document.pointerLockElement===window.__IRON_SINEW__.canvas);
  if(!pointerLocked)throw new Error('Pointer-lock test did not acquire the pointer');
  await page.mouse.move(650,480);
  await prepare();
  await page.mouse.down();
  await page.waitForTimeout(180);
  if(await page.evaluate(()=>!!window.__IRON_SINEW__.enemy.anatomy.lastHit))throw new Error('Click alone produced damage');
  await page.mouse.move(1040,480,{steps:12});
  await page.waitForTimeout(450);
  const sweep=await page.evaluate(()=>{
    const g=window.__IRON_SINEW__;
    return {hit:g.enemy.anatomy.lastHit?.bodyPart,force:g.enemy.anatomy.lastHit?.impactForce,cameraYaw:g.cameraYaw,scripted:!!g.player.attack,held:g.player.weaponMotion.held};
  });
  if(!sweep.hit||sweep.scripted||!sweep.held||Math.abs(sweep.cameraYaw)>.001)throw new Error('Native mouse sweep failed: '+JSON.stringify(sweep));
  await page.mouse.up();
  const aimBefore=await page.evaluate(()=>window.__IRON_SINEW__.player.weaponMotion.targetYaw);
  await page.keyboard.down('KeyC');
  await page.mouse.move(1130,520,{steps:4});
  const look=await page.evaluate(()=>({yaw:window.__IRON_SINEW__.cameraYaw,aim:window.__IRON_SINEW__.player.weaponMotion.targetYaw}));
  if(Math.abs(look.yaw)<.02||Math.abs(look.aim-aimBefore)>.001)throw new Error('Free look also moved weapon or failed to rotate camera');
  await page.keyboard.up('KeyC');
  await page.mouse.down({button:'right'});
  if(!await page.evaluate(()=>window.__IRON_SINEW__.player.blocking))throw new Error('Right mouse did not guard');
  await page.mouse.up({button:'right'});
  await page.mouse.down();
  await page.keyboard.press('Escape');
  await page.mouse.up();
  if(await page.evaluate(()=>window.__IRON_SINEW__.swingHeld||window.__IRON_SINEW__.player.weaponMotion.held))throw new Error('Escape left attack engaged');

  // Exercise the supported drag fallback with pointer capture unavailable.
  await page.evaluate(()=>{const g=window.__IRON_SINEW__;g.testCapturePointer=g.capturePointer;g.capturePointer=()=>{};});
  await page.mouse.move(600,480);
  await prepare();
  await page.mouse.down();
  await page.mouse.move(990,480,{steps:12});
  await page.waitForTimeout(450);
  const fallback=await page.evaluate(()=>window.__IRON_SINEW__.enemy.anatomy.lastHit?.bodyPart);
  if(!fallback)throw new Error('Drag fallback did not produce a real contact');
  await page.mouse.up();
  await page.mouse.down();
  await page.keyboard.press('F2');
  if(await page.evaluate(()=>window.__IRON_SINEW__.swingHeld||window.__IRON_SINEW__.player.weaponMotion.held))throw new Error('Opening laboratory left swing engaged');
  await page.mouse.up();
  await page.getByRole('button',{name:'Close injury laboratory',exact:true}).click();
  await page.evaluate(()=>{const g=window.__IRON_SINEW__;g.capturePointer=g.testCapturePointer;delete g.testCapturePointer;g.paused=true;g.ui.update(0,true);});
  await page.screenshot({path:'output/playwright/mouse-weapon-control.png'});
  await page.evaluate(report=>{window.__WEAPON_TEST_REPORT__=report;},{pointerLocked,sweep,look,fallback,errors});
  if(errors.length)throw new Error(errors.join('\n'));
}
