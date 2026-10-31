"""Tracés distincts, ponts, courses complètes et captures réelles du jeu."""
import functools
import json
import threading
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'.tmp/malo-tracks-checks'
OUT.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
    def log_message(self,*_): pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
source=(ROOT/'web/malo-kart-phase1/game.js').read_text(encoding='utf-8')
hook="""window.trackTest={start,tick,menus,garage,get track(){return track},get sim(){return simulation},get view(){return view},get race(){return race},get renderer(){return renderer},
render(){view.update(simulation.state,0,false,true);raceView.update(0,true);renderer.render(view.scene,view.camera)},stop(){window.requestAnimationFrame=()=>0}};"""
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='msedge',headless=True)
        page=browser.new_page(viewport={'width':1200,'height':800},device_scale_factor=1,service_workers='block')
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
        page.route('**/malo-kart-phase1/game.js',lambda r:r.fulfill(body=source.replace('  applyQuality(); menu();',hook+'\n  applyQuality(); menu();'),content_type='application/javascript'))
        page.goto(f'http://127.0.0.1:{server.server_port}/web/malo-kart-phase1/')
        page.wait_for_function('window.trackTest')
        page.evaluate('trackTest.stop()');page.wait_for_timeout(100)
        checks=page.evaluate("""()=>{
          const api=MaloPrototype,results=[];
          for(const id of Object.keys(api.courses)){
            const track=api.createTrack(THREE,id),sim=api.createSimulation(track);let frames=0,minDistance=Infinity;
            for(let i=0;i<480;i+=4)for(let j=i+40;j<480;j+=4){if(480-j+i<40)continue;minDistance=Math.min(minDistance,Math.hypot(track.points[i].x-track.points[j].x,track.points[i].z-track.points[j].z));}
            while(!sim.state.finished&&frames<40000){const s=sim.state,n=api.nearestPoint(track.points,s.x,s.z),p=track.points[(n.index+12)%480];
              const a=Math.atan2(p.x-s.x,p.z-s.z)-s.yaw,e=Math.atan2(Math.sin(a),Math.cos(a)),slow=Math.abs(e)>.32&&s.speed>22;
              sim.step(1/120,{gas:!slow,brake:slow,left:e>.025,right:e<-.025});frames++;
            }
            results.push({id,finished:sim.state.finished,laps:sim.state.laps,frames,minDistance,height:Math.max(...track.points.map(p=>p.y))});
          }
          return results;
        }""")
        print('TRACKS',json.dumps(checks),flush=True)
        assert all(c['finished'] and c['laps']==2 for c in checks),checks
        assert all(c['minDistance']>18.6 for c in checks),checks
        assert sum(c['height']>13 for c in checks)==6
        previews=[]
        page.evaluate('trackTest.menus.show("course")')
        for cup in range(6):
            page.locator(f'[data-cup="{cup}"]').click()
            page.wait_for_function('Array.from(document.querySelectorAll(".card img")).every(i=>i.complete&&i.naturalWidth>0)')
            previews.extend(page.locator('.card img').evaluate_all('(images)=>images.map(i=>i.src)'))
            page.screenshot(path=str(OUT/f'cup-{cup}.png'))
        assert len(set(previews))==24
        page.evaluate("""()=>{
          const t=trackTest;t.garage.select('course','magma');t.menus.show('course');document.querySelector('[data-choice=magma]').click();t.start();
          const p=t.track.points[120];Object.assign(t.sim.state,{x:p.x,z:p.z,y:0,yaw:Math.atan2(p.tx,p.tz)});t.render();
        }""")
        bridge=page.evaluate('({height:trackTest.view.kart.position.y,ground:trackTest.track.heightAt(trackTest.sim.state.x,trackTest.sim.state.z)})')
        assert bridge['height']>13 and abs(bridge['height']-bridge['ground']-.08)<.001,bridge
        page.screenshot(path=str(OUT/'bridge-race.png'))
        page.evaluate("""()=>{
          const t=trackTest;for(let i=0;i<361;i++)t.tick(1/120);const s=t.sim.state;s.y=5;t.render();
        }""")
        assert page.evaluate('Math.abs(trackTest.view.kart.position.y-trackTest.track.heightAt(trackTest.sim.state.x,trackTest.sim.state.z)-5.08)<.001')
        assert not errors,errors
        print('24_DISTINCT_PREVIEWS_BRIDGES_FLIGHT_AND_CONSOLE_OK',flush=True)
        browser.close()
finally:
    server.shutdown();server.server_close()
