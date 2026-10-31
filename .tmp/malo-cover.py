import functools,threading
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path.cwd()
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*_):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
source=(root/'web/malo-kart-phase1/game.js').read_text(encoding='utf-8')
hook='window.cover={start,menus,garage,get track(){return track},get sim(){return simulation},get view(){return view},get race(){return race},get raceView(){return raceView},renderer};window.requestAnimationFrame=()=>0;'
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(channel='msedge',headless=True)
  page=browser.new_page(viewport={'width':1040,'height':600},device_scale_factor=1,service_workers='block')
  page.route('**/malo-kart-phase1/game.js',lambda r:r.fulfill(body=source.replace('  applyQuality(); menu();',hook+'\n  applyQuality(); menu();'),content_type='application/javascript'))
  page.goto(f'http://127.0.0.1:{server.server_port}/web/malo-kart-phase1/')
  page.wait_for_function('window.cover')
  page.evaluate('''()=>{
    const t=cover;t.menus.show('course');document.querySelector('[data-cup="5"]').click();document.querySelector('[data-choice="rainbowRoad"]').click();t.start();
    const p=t.track.points[120],s=t.sim.state;Object.assign(s,{x:p.x,z:p.z,y:0,yaw:Math.atan2(p.tx,p.tz),speed:24});
    t.race.rivals.forEach((r,i)=>{const q=t.track.points[117-i*3];Object.assign(r.state,{x:q.x+q.tz*(i%2?2.5:-2.5),z:q.z-q.tx*(i%2?2.5:-2.5),yaw:Math.atan2(q.tx,q.tz),y:0});});
    t.view.update(s,0,false,true);t.raceView.update(0,true);
    const f={x:Math.sin(s.yaw),z:Math.cos(s.yaw)},g=t.track.heightAt(s.x,s.z),camera=t.view.camera;
    camera.fov=46;camera.position.set(s.x+f.x*6+f.z*4,g+3.5,s.z+f.z*6-f.x*4);camera.lookAt(s.x-f.z*1.8,g+1.6,s.z+f.x*1.8);camera.updateProjectionMatrix();
    const fill=new THREE.DirectionalLight('#fff5dc',3);fill.position.copy(camera.position);fill.target=t.view.kart;t.view.scene.add(fill);t.renderer.setPixelRatio(1);t.renderer.render(t.view.scene,camera);
    document.querySelectorAll('body > :not(canvas):not(script)').forEach(el=>el.style.display='none');
    const title=document.createElement('div');title.id='cover-title';title.innerHTML='<small>LES JEUX DE MALO</small><h1>MALO<br><span>KART</span></h1><p>24 CIRCUITS<br>À CONQUÉRIR</p>';document.body.append(title);
  }''')
  page.add_style_tag(content='''#cover-title{position:fixed;inset:0;pointer-events:none;padding:65px 50px;color:white;background:linear-gradient(90deg,#101c45e6,transparent 70%);text-align:left;font-family:Arial,sans-serif}#cover-title small{font-size:15px;letter-spacing:4px;color:#a4efff}#cover-title h1{font-size:100px;font-style:italic;line-height:.9;margin:35px 0 28px;letter-spacing:-5px;text-shadow:0 5px 0 #182746,0 9px 25px #0a152a}#cover-title h1 span{color:#ffdf59}#cover-title p{font-weight:900;font-size:21px;letter-spacing:2px;line-height:1.45;color:#d1faff}''')
  page.screenshot(path=str(root/'web/malo-kart-phase1/preview.png'))
  browser.close()
finally:server.shutdown();server.server_close()
