"""Tests navigateur autonomes : python tests/test_malo_kart_phase1.py."""
import functools
import json
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.tmp' / 'malo-phase1-checks'
OUT.mkdir(parents=True, exist_ok=True)


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='msedge', headless=True)
        page = browser.new_page(viewport={'width':1440, 'height':900})
        errors, requests = [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)
        page.on('requestfailed', lambda request: requests.append(request.url))
        source = (ROOT / 'web/malo-kart-phase1/game.js').read_text(encoding='utf-8')
        hook = '''window.testKart={simulation,track,view,input,renderer,tick,start,menu,frame,
          get mode(){return mode;},get resolution(){return resolution;},
          render(){view.update(simulation.state,0,false,true);updateHUD();renderer.render(view.scene,view.camera);},
          stopFrames(){window.requestAnimationFrame=()=>0;}
        };'''
        page.route('**/malo-kart-phase1/game.js', lambda route: route.fulfill(body=source.replace('  applyQuality(); menu();', hook+'\n  applyQuality(); menu();'), content_type='application/javascript'))
        page.goto(f'http://127.0.0.1:{server.server_port}/web/malo-kart-phase1/')
        page.wait_for_function('window.testKart && !document.getElementById("start").disabled')
        page.screenshot(path=str(OUT / 'menu.png'))
        page.evaluate('testKart.stopFrames()')
        page.wait_for_timeout(100)
        page.locator('#home [data-screen=course]').click()
        page.locator('#start').click()
        page.evaluate('for(let i=0;i<361;i++)testKart.tick(1/120)')
        assert page.evaluate('testKart.mode') == 'race'
        page.keyboard.down('ArrowUp')
        page.keyboard.down('ArrowLeft')
        assert page.evaluate('testKart.input.gas && testKart.input.left')
        page.keyboard.down('KeyQ')
        page.keyboard.up('ArrowLeft')
        assert page.evaluate('testKart.input.left'), 'Releasing an alias must preserve the other held key'
        page.keyboard.up('KeyQ')
        page.evaluate('for(let i=0;i<240;i++)testKart.tick(1/120)')
        assert page.evaluate('testKart.simulation.state.speed') > 20
        page.keyboard.up('ArrowUp')
        for key, direction in [('ArrowLeft', -1), ('ArrowRight', 1), ('KeyQ', -1), ('KeyD', 1)]:
            before = page.evaluate('''()=>{
              const t=testKart;t.simulation.reset();const s=t.simulation.state;
              s.vx=Math.sin(s.yaw)*20;s.vz=Math.cos(s.yaw)*20;s.speed=20;
              t.render();window.fixedCamera=t.view.camera.clone();
              return t.view.kart.position.clone().project(fixedCamera).x;
            }''')
            page.keyboard.down(key)
            after = page.evaluate('''()=>{
              for(let i=0;i<45;i++)testKart.tick(1/120);
              testKart.view.update(testKart.simulation.state,0,false,true);
              return testKart.view.kart.position.clone().project(fixedCamera).x;
            }''')
            page.keyboard.up(key)
            assert (after-before)*direction > .02, f'{key}: wrong screen direction'
        print('KEYBOARD_AND_SIMULTANEOUS_INPUT_OK', flush=True)
        page.keyboard.down('ArrowUp')
        page.keyboard.press('Escape')
        assert page.locator('#pause-dialog').is_visible()
        before = page.evaluate('({...testKart.simulation.state})')
        page.evaluate('for(let i=0;i<120;i++)testKart.tick(1/120)')
        assert page.evaluate('({...testKart.simulation.state})') == before
        page.keyboard.up('ArrowUp')
        page.locator('#resume').click()
        assert not page.evaluate('testKart.input.gas')
        print('PAUSE_OK', flush=True)
        mechanics = page.evaluate('''()=>{
          const t=testKart, api=MaloPrototype, sim=api.createSimulation(t.track),s=sim.state;
          const gate=t.track.gates[0];
          const forward={gas:true};
          function cross(g,back=false,offset=0){
            const sign=back?-1:1;
            Object.assign(s,{x:g.x-g.tx*.12*sign+g.tz*offset,z:g.z-g.tz*.12*sign-g.tx*offset,yaw:Math.atan2(g.tx*sign,g.tz*sign),vx:g.tx*20*sign,vz:g.tz*20*sign,speed:20});
            sim.step(1/60,forward);
          }
          Object.assign(s,{x:gate.x,z:gate.z,vx:0,vz:0,speed:0});
          for(let i=0;i<1000;i++)sim.step(1/120,{});
          const stationary=s.laps===0 && s.nextGate===1;
          cross(gate);const skipped=s.laps===0 && s.nextGate===1;
          cross(t.track.gates[1],true);const reverse=s.nextGate===1;
          cross(t.track.gates[2]);const order=s.nextGate===1;
          for(let i=1;i<8;i++)cross(t.track.gates[i]);
          cross(gate,true);const backwardsFinish=s.laps===0 && s.nextGate===0;
          cross(gate);const complete=s.laps===1 && s.nextGate===1 && !s.finished;
          cross(gate);const repeatedFinish=s.laps===1;
          sim.reset();s.vx=25;s.vz=25;s.speed=Math.hypot(s.vx,s.vz);
          for(let i=0;i<180;i++)sim.step(1/120,{});
          const barrier=api.nearestPoint(t.track.points,s.x,s.z).distance<=t.track.halfWidth-1.25+1e-6;
          for(let i=0;i<300;i++)sim.step(1/120,{brake:true});const brake=s.speed<.001;
          function slip(drift){sim.reset();s.vx=Math.sin(s.yaw)*22;s.vz=Math.cos(s.yaw)*22;s.speed=22;for(let i=0;i<45;i++)sim.step(1/120,{gas:true,left:true,drift});return Math.abs(s.vx*Math.cos(s.yaw)-s.vz*Math.sin(s.yaw));}
          const normal=slip(false),drift=slip(true);
          return {stationary,skipped,reverse,order,backwardsFinish,complete,repeatedFinish,barrier,brake,drift:drift>normal*1.5};
        }''')
        print('MECHANICS', json.dumps(mechanics), flush=True)
        assert all(mechanics.values()), mechanics
        race = page.evaluate('''()=>{
          const t=testKart;t.start();for(let i=0;i<361;i++)t.tick(1/120);
          let frames=0, cameraBehind=true,maxDistance=0;
          while(t.mode==='race' && frames<36000){
            const s=t.simulation.state,n=MaloPrototype.nearestPoint(t.track.points,s.x,s.z);
            const target=t.track.points[(n.index+12)%t.track.points.length];
            const desired=Math.atan2(target.x-s.x,target.z-s.z);
            const error=Math.atan2(Math.sin(desired-s.yaw),Math.cos(desired-s.yaw));
            t.input.gas=true;t.input.left=error>.025;t.input.right=error<-.025;
            t.tick(1/120);t.view.update(s,1/120,false);
            const behind=(t.view.camera.position.x-s.x)*Math.sin(s.yaw)+(t.view.camera.position.z-s.z)*Math.cos(s.yaw);
            cameraBehind &&= behind<0;maxDistance=Math.max(maxDistance,n.distance);frames++;
          }
          t.render();return {mode:t.mode,laps:t.simulation.state.laps,frames,cameraBehind,maxDistance,finite:Object.values(t.simulation.state).filter(v=>typeof v==='number').every(Number.isFinite)};
        }''')
        print('FULL_RACE', json.dumps(race), flush=True)
        assert race['mode']=='finished' and race['laps']==2 and race['cameraBehind'] and race['finite'], race
        assert page.locator('#finish-dialog').is_visible()
        page.screenshot(path=str(OUT / 'finish.png'))
        page.locator('#replay').click()
        assert page.evaluate('testKart.mode')=='countdown'
        assert page.evaluate('testKart.simulation.state.laps')==0
        assert page.evaluate('testKart.simulation.state.nextGate')==1
        page.evaluate('for(let i=0;i<361;i++)testKart.tick(1/120)')
        page.keyboard.down('ArrowUp')
        page.evaluate('for(let i=0;i<380;i++)testKart.tick(1/120);testKart.render()')
        page.keyboard.up('ArrowUp')
        page.screenshot(path=str(OUT / 'race.png'))
        page.evaluate("window.dispatchEvent(new Event('blur'))")
        assert page.locator('#pause-dialog').is_visible()
        page.locator('#restart').click()
        assert page.evaluate('testKart.mode')=='countdown'
        page.locator('#pause').click()
        page.locator('#back').click()
        assert page.locator('#intro').is_visible()
        assert page.locator('#hud').get_attribute('hidden') is not None
        quality = page.evaluate('''()=>{
          const t=testKart;t.start();const before=t.resolution;
          for(let i=0;i<400;i++)t.frame(10000+i*34);
          return {before,after:t.resolution,shadows:t.renderer.shadowMap.enabled};
        }''')
        assert quality['after'] < quality['before'] and not quality['shadows'], quality
        print('ADAPTIVE_QUALITY',json.dumps(quality),flush=True)
        page.evaluate("document.getElementById('game').dispatchEvent(new Event('webglcontextlost',{cancelable:true}))")
        assert page.locator('#error').is_visible()
        assert not errors, errors
        assert not requests, requests
        offline=browser.new_page()
        offline.on('pageerror',lambda error:errors.append(str(error)))
        offline.goto((ROOT/'web/malo-kart-phase1/index.html').as_uri())
        offline.locator('#home [data-screen=course]').click()
        offline.locator('#start').click()
        assert offline.locator('#hud').get_attribute('hidden') is None
        assert not errors, errors
        print('REPLAY_BUTTONS_FOCUS_CONTEXT_LOSS_OFFLINE_OK',flush=True)
        print('ERRORS', errors, 'FAILED_REQUESTS', requests,flush=True)
        browser.close()
finally:
    server.shutdown()
    server.server_close()
