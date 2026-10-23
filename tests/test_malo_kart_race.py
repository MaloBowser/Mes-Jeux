"""Courses et objets : python tests/test_malo_kart_race.py (Playwright + Edge)."""
import functools
import json
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.tmp/malo-race-checks'
OUT.mkdir(parents=True, exist_ok=True)


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
source = (ROOT / 'web/malo-kart-phase1/game.js').read_text(encoding='utf-8')
hook = '''window.testRace = {start,tick,input,garage,menus,menu,audio,
  get race(){return race;},get simulation(){return simulation;},get track(){return track;},
  get mode(){return mode;},
  render(){view.update(simulation.state,0,false,true);raceView.update(0,true);updateHUD();renderer.render(view.scene,view.camera);},
  stop(){window.requestAnimationFrame=()=>0;}
};'''
script = source.replace('  applyQuality(); menu();', hook + '\n  applyQuality(); menu();')
audio_source = (ROOT / 'web/malo-kart-phase1/audio.js').read_text(encoding='utf-8')
audio_hook = '''window.testAudio={get context(){return context;},get engine(){return engine;},
  get engineGain(){return engineGain;},get effects(){return effects.size;}};'''
audio_script = audio_source.replace('    return { unlock,', audio_hook + '\n    return { unlock,')
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='msedge', headless=True)
        page = browser.new_page(viewport={'width': 1440, 'height': 900})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
        page.route('**/malo-kart-phase1/game.js', lambda route: route.fulfill(body=script, content_type='application/javascript'))
        page.route('**/malo-kart-phase1/audio.js', lambda route: route.fulfill(body=audio_script, content_type='application/javascript'))
        page.goto(f'http://127.0.0.1:{server.server_port}/web/malo-kart-phase1/')
        page.wait_for_function('window.testRace')
        page.screenshot(path=str(OUT / 'home.png'))
        page.evaluate('testRace.stop()')
        page.wait_for_timeout(100)
        page.locator('#home [data-screen=course]').click()
        assert page.evaluate('testAudio.context===undefined')
        page.locator('#start').click()
        page.wait_for_function('testAudio.context && testAudio.context.state==="running"')
        assert page.evaluate('testRace.race.racers.length') == 6
        page.evaluate('testRace.render()')
        page.screenshot(path=str(OUT / 'grid.png'))
        page.evaluate('for(let i=0;i<361;i++)testRace.tick(1/120)')
        initial = page.evaluate('testRace.race.rivals[0].progress')
        page.keyboard.down('ArrowUp')
        page.evaluate('for(let i=0;i<240;i++)testRace.tick(1/120);testRace.render()')
        page.keyboard.up('ArrowUp')
        assert page.evaluate('testRace.race.rivals[0].progress') > initial
        page.evaluate('''()=>{
          window.soundMeter=testAudio.context.createAnalyser();
          testAudio.engineGain.connect(soundMeter);
          window.soundLevel=()=>{
            const samples=new Float32Array(soundMeter.fftSize);soundMeter.getFloatTimeDomainData(samples);
            return Math.max(...samples.map(Math.abs));
          };
          testRace.audio.update(testRace.simulation.state,true);
        }''')
        page.wait_for_timeout(150)
        assert page.evaluate('soundLevel()') > .001, 'The engine must generate a non-silent audio signal'
        assert page.evaluate('testAudio.engine.frequency.value') > 70
        page.screenshot(path=str(OUT / 'race.png'))
        mechanics = page.evaluate('''()=>{
          const t=testRace, api=MaloPrototype, track=t.track, sim=api.createSimulation(track);
          const race=api.createRace(track,sim,t.garage.state,()=>0), s=sim.state, player=race.player;
          const checks={grid:race.standings().indexOf(player)===5};
          const box=race.boxes[0];
          Object.assign(s,{x:box.x,z:box.z});race.step(1/120);
          checks.pickup=player.item==='turbo' && box.cooldown>0;
          race.useItem();checks.turbo=s.boost===2 && player.item===null;
          race.step(1/120);checks.noDoublePickup=player.item===null;
          checks.emptyUse=!race.useItem();
          let roll=0;
          const queue=api.createRace(track,sim,t.garage.state,()=>roll), q=queue.player;
          function collect(index){
            const b=queue.boxes[index];Object.assign(s,{x:b.x,z:b.z});queue.step(1/120);
          }
          sim.reset();collect(0);roll=.99;collect(1);
          checks.twoItems=q.item==='turbo' && q.reserveItem==='trap';
          collect(2);
          checks.fullInventory=q.item==='turbo' && q.reserveItem==='trap' && queue.boxes[2].cooldown===0;
          queue.useItem();
          checks.queueOrder=s.boost===2 && q.item==='trap' && q.reserveItem===null;
          collect(2);
          checks.refill=q.item==='trap' && q.reserveItem==='trap' && queue.boxes[2].cooldown>0;
          queue.useItem();queue.useItem();
          checks.useBoth=q.item===null && q.reserveItem===null && queue.hazards.length===2;
          q.item='orb';q.reserveItem='shield';
          queue.rivals.forEach(r=>{r.state.finished=true;});
          checks.keepBothWithoutTarget=!queue.useItem() && q.item==='orb' && q.reserveItem==='shield';
          queue.reset();
          const rival=queue.rivals[0];rival.item='turbo';rival.reserveItem='shield';
          queue.step(.01);
          checks.rivalQueue=rival.state.boost>0 && rival.item==='shield' && rival.reserveItem===null;
          queue.reset();
          checks.clearBoth=queue.racers.every(r=>r.item===null && r.reserveItem===null);
          sim.reset();race.reset();player.item='orb';
          checks.orb=race.useItem() && race.shots.length===1;
          checks.orbHit=false;
          for(let i=0;i<360;i++){
            race.step(1/120);
            checks.orbHit ||= race.rivals.some(r=>r.state.stun>0);
          }
          sim.reset();race.reset();
          s.stun=1;player.item='shield';race.useItem();
          checks.starActivation=s.shield===6 && s.boost===6 && s.stun===0;
          const hazard=()=>race.hazards.push({x:s.x,z:s.z,owner:1,ttl:14});
          hazard();race.step(1/120);
          checks.starBlocks=s.shield===6 && s.stun===0 && race.hazards.length===0;
          hazard();race.step(1/120);
          checks.starRepeated=s.shield===6 && s.stun===0;
          player.item='turbo';race.useItem();
          checks.mushroomPreservesStar=s.boost===6;
          const contact=race.rivals[0];
          Object.assign(s,{x:contact.state.x,z:contact.state.z,speed:25,vx:25,vz:0});
          race.step(1/120);
          checks.starContact=s.speed===25 && contact.state.stun>0;
          for(let i=0;i<721;i++)sim.step(1/120,{});
          checks.starExpires=s.shield===0 && s.boost===0;
          sim.reset();race.reset();
          s.grace=0;hazard();race.step(1/120);
          checks.trapHit=s.stun>0;
          for(let i=0;i<250;i++)sim.step(1/120,{gas:true});
          checks.recovery=s.stun===0 && s.speed>8;
          sim.reset();race.reset();player.item='trap';race.useItem();
          const own=race.hazards[0];Object.assign(s,{x:own.x,z:own.z});race.step(1/120);
          checks.ownTrap=s.stun===0 && race.hazards.length===1;
          for(let i=0;i<1800;i++)race.step(1/120);
          checks.expiry=race.hazards.length===0;
          sim.reset();race.reset();
          const end=track.points[479];Object.assign(s,{x:end.x,z:end.z});
          race.step(1/120);
          checks.noShortcut=player.progress<=track.length/8;
          for(let i=0;i<120*120;i++)race.step(1/120);
          checks.rivalsFinish=race.rivals.every(r=>r.state.finished && r.finishTime>0);
          s.finished=true;race.step(1/120);
          checks.lastPlace=race.standings()[5]===player && player.finishTime>0;
          sim.reset();race.reset();s.finished=true;race.step(1/120);
          for(let i=0;i<120*120;i++)race.step(1/120);
          checks.firstPlace=race.standings()[0]===player;
          sim.reset();race.reset();player.item='orb';
          for(const rival of race.rivals){rival.state.finished=true;rival.finishTime=1;}
          checks.noTarget=!race.useItem() && player.item==='orb';
          sim.reset();race.reset();
          checks.reset=race.elapsed===0 && race.racers.every(r=>r.item===null && r.reserveItem===null && r.finishTime===null)
            && race.boxes.every(b=>b.cooldown===0) && race.shots.length===0 && race.hazards.length===0;
          const wide={...track,halfWidth:1000},drift=api.createSimulation(wide);
          const d=drift.state;d.speed=24;d.vx=Math.sin(d.yaw)*24;d.vz=Math.cos(d.yaw)*24;
          for(let i=0;i<110;i++)drift.step(1/120,{gas:true,left:true,drift:true});
          checks.charged=d.driftCharge>=.8;drift.step(1/120,{gas:true});
          checks.miniTurbo=d.boost>0 && d.driftCharge===0;
          function topSpeed(boost){
            const sim=api.createSimulation(wide),s=sim.state;
            Object.assign(s,{speed:34,vx:Math.sin(s.yaw)*34,vz:Math.cos(s.yaw)*34,boost});
            for(let i=0;i<90;i++)sim.step(1/120,{gas:true});
            return s.speed;
          }
          checks.realAcceleration=topSpeed(2)>topSpeed(0)+5;
          return checks;
        }''')
        print('RACE_MECHANICS', json.dumps(mechanics), flush=True)
        assert all(mechanics.values()), mechanics
        page.evaluate("testRace.race.player.item='turbo';testRace.race.player.reserveItem='shield';testRace.render()")
        assert page.locator('#item-name').inner_text() == 'Champignon'
        assert page.locator('#reserve-name').inner_text() == 'Étoile'
        for item, filename in [('turbo', 'mushroom'), ('orb', 'shell'), ('shield', 'star'), ('trap', 'banana')]:
            page.evaluate('(item)=>{testRace.race.player.item=item;testRace.render()}', item)
            assert filename + '.svg' in page.locator('#item-symbol').evaluate('(el)=>getComputedStyle(el).backgroundImage')
            assert page.locator('#use-item').get_attribute('aria-label').startswith('Utiliser : ')
            assert page.evaluate('''async (filename)=>{
              const image=new Image();image.src=`assets/items/${filename}.svg`;
              await image.decode();return image.naturalWidth>0;
            }''', filename)
        page.evaluate("testRace.race.player.item='turbo';testRace.render()")
        page.screenshot(path=str(OUT / 'two-items.png'))
        page.keyboard.press('KeyE')
        assert page.evaluate('testRace.simulation.state.boost') == 2
        assert page.locator('#item-name').inner_text() == 'Étoile'
        assert page.locator('#reserve-name').inner_text() == 'Vide'
        page.locator('#use-item').click()
        assert page.evaluate('testRace.simulation.state.shield') == 6
        assert page.locator('#use-item').is_disabled()
        page.evaluate('''()=>{
          const r=testRace.race,s=testRace.simulation.state;
          const point=(side)=>({x:s.x+Math.sin(s.yaw)*5+Math.cos(s.yaw)*side,z:s.z+Math.cos(s.yaw)*5-Math.sin(s.yaw)*side});
          r.hazards.push({...point(-2),owner:0,ttl:14});
          r.shots.push({...point(2),target:r.rivals[0],owner:0,ttl:3});
          testRace.render();
        }''')
        page.screenshot(path=str(OUT / 'items-3d.png'))
        page.evaluate('testRace.race.hazards.pop();testRace.race.shots.pop()')
        page.evaluate("testRace.race.player.item='turbo';testRace.race.player.reserveItem='shield'")
        page.keyboard.press('Escape')
        page.wait_for_function('testAudio.engineGain.gain.value===0 && testAudio.effects===0')
        before = page.evaluate('JSON.stringify([testRace.race.elapsed,testRace.race.racers])')
        page.evaluate('for(let i=0;i<240;i++)testRace.tick(1/120)')
        page.keyboard.press('KeyE')
        assert page.evaluate('JSON.stringify([testRace.race.elapsed,testRace.race.racers])') == before
        page.locator('#resume').click()
        results = page.evaluate('''()=>{
          const t=testRace,results=[];
          for(const course of ['azur','neon','desert']){
            t.menu();t.menus.show('course');
            document.querySelector(`[data-choice="${course}"]`).click();t.start();
            for(let i=0;i<361;i++)t.tick(1/120);
            let frames=0;
            while(t.mode==='race' && frames<24000){
              const s=t.simulation.state,track=t.track,n=MaloPrototype.nearestPoint(track.points,s.x,s.z);
              const target=track.points[(n.index+12)%480],desired=Math.atan2(target.x-s.x,target.z-s.z);
              const error=Math.atan2(Math.sin(desired-s.yaw),Math.cos(desired-s.yaw));
              const slow=Math.abs(error)>.32 && s.speed>22;
              Object.assign(t.input,{gas:!slow,brake:slow,left:error>.025,right:error<-.025});
              if(frames%180===0)t.race.useItem();
              t.tick(1/120);frames++;
            }
            t.render();
            results.push({course,finished:t.mode==='finished',laps:t.simulation.state.laps,
              rank:t.race.standings().indexOf(t.race.player)+1,time:t.race.elapsed,
              rows:document.querySelectorAll('#results li').length,
              unique:new Set(t.race.standings().map(r=>r.id)).size===6});
          }
          return results;
        }''')
        print('THREE_FULL_RACES', json.dumps(results), flush=True)
        assert all(result['finished'] and result['laps'] == 2 and result['rows'] == 6 and result['unique'] for result in results)
        page.screenshot(path=str(OUT / 'finish.png'))
        page.evaluate("testRace.race.player.item='turbo';testRace.race.player.reserveItem='shield'")
        page.locator('#replay').click()
        assert page.evaluate('testRace.race.elapsed===0 && testRace.race.racers.every(r=>r.item===null && r.reserveItem===null && r.finishTime===null)')
        page.set_viewport_size({'width': 800, 'height': 600})
        page.wait_for_timeout(100)
        page.evaluate('''()=>{
          for(let i=0;i<361;i++)testRace.tick(1/120);
          testRace.race.player.item='shield';testRace.race.player.reserveItem='turbo';
          testRace.race.useItem();testRace.race.player.reserveItem='trap';testRace.render();
        }''')
        assert page.evaluate('document.getElementById("race-notice").getBoundingClientRect().top > document.querySelector(".item-slots").getBoundingClientRect().bottom')
        page.screenshot(path=str(OUT / 'compact.png'))
        page.evaluate('testRace.menu()')
        page.locator('#options').click()
        page.locator('#sound-enabled').uncheck()
        page.evaluate("testRace.audio.play('go');testRace.audio.update(testRace.simulation.state,true)")
        assert page.evaluate('testAudio.effects===0')
        page.wait_for_timeout(100)
        assert page.evaluate('soundLevel()') < .00001
        page.locator('#sound-enabled').check()
        page.evaluate("testRace.audio.play('pickup');testRace.audio.update(testRace.simulation.state,true)")
        assert page.evaluate('testAudio.effects') > 0
        page.wait_for_timeout(150)
        assert page.evaluate('soundLevel()') > .001
        page.evaluate("window.dispatchEvent(new Event('blur'))")
        page.wait_for_function('testAudio.engineGain.gain.value===0 && testAudio.effects===0')
        silent = browser.new_page()
        silent.on('pageerror', lambda error: errors.append(str(error)))
        silent.add_init_script('window.AudioContext=undefined;window.webkitAudioContext=undefined;')
        silent.goto(f'http://127.0.0.1:{server.server_port}/web/malo-kart-phase1/')
        silent.locator('#home [data-screen=course]').click()
        silent.locator('#start').click()
        assert silent.locator('#hud').get_attribute('hidden') is None
        assert silent.locator('#lap').is_visible()
        print('AUDIO_SIGNAL_ENGINE_PITCH_MUTE_REENABLE_FOCUS_AND_FALLBACK_OK', flush=True)
        assert not errors, errors
        print('ITEM_KEYS_PAUSE_REPLAY_AND_CONSOLE_OK', flush=True)
        browser.close()
finally:
    server.shutdown()
    server.server_close()
