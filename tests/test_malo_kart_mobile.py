"""Mobile layouts and real multi-touch input in Edge emulation."""
import functools
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.tmp/malo-mobile-checks'
OUT.mkdir(parents=True, exist_ok=True)


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def handle(self):
        try:
            super().handle()
        except ConnectionError:
            pass


source = (ROOT / 'web/malo-kart-phase1/game.js').read_text(encoding='utf-8')
hook = '''window.testMobile={input,tick,start,menu,menus,garage,pause,resume,
  get mode(){return mode;},get simulation(){return simulation;},get race(){return race;},
  get view(){return view;},get renderer(){return renderer;},
  render(){view.update(simulation.state,0,mode==='menu',true);raceView.update(0,mode!=='menu');updateHUD();renderer.render(view.scene,view.camera);},
  stop(){window.requestAnimationFrame=()=>0;}
};'''
script = source.replace('  applyQuality(); menu();', hook + '\n  applyQuality(); menu();')
server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{server.server_port}/'


def reachable(page, selector):
    result = page.locator(selector).evaluate('''el=>{
      const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
      return r.width>=44 && r.height>=44 && r.left>=0 && r.right<=innerWidth+.5 && r.top>=0 && r.bottom<=innerHeight+.5 && (hit===el || el.contains(hit));
    }''')
    assert result, selector


try:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='msedge', headless=True)
        context = browser.new_context(viewport={'width':390, 'height':844}, has_touch=True, is_mobile=True, device_scale_factor=2, service_workers='block')
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda e: (errors.append(str(e)), print('PAGE_ERROR', str(e), flush=True)))
        page.route('**/malo-kart-phase1/game.js', lambda route: route.fulfill(body=script, content_type='application/javascript'))
        page.goto(url)
        page.locator('[name=username]').fill('Test tactile')
        save = page.get_by_role('button', name='Enregistrer', exact=True)
        save.scroll_into_view_if_needed()
        reachable(page, '.malo-dialog button[type=submit]')
        save.tap()
        page.locator('a[href="web/malo-kart-phase1/index.html"]').tap()
        page.wait_for_url('**/malo-kart-phase1/index.html')
        page.wait_for_function('window.testMobile')
        assert page.locator('#auto-gas').is_checked()
        assert page.evaluate('testMobile.renderer.getPixelRatio()') == 1
        assert not page.evaluate('testMobile.renderer.shadowMap.enabled')
        page.evaluate('testMobile.stop()')
        page.wait_for_timeout(100)
        print('ROOT_PROFILE_LINK_AND_MOBILE_QUALITY_OK', flush=True)

        for width, height in [(320,568), (390,844), (844,390), (768,1024), (1024,768)]:
            page.set_viewport_size({'width':width, 'height':height})
            page.evaluate('testMobile.menu()')
            page.wait_for_timeout(100)
            page.evaluate('testMobile.render()')
            page.locator('#play').scroll_into_view_if_needed()
            reachable(page, '#play')
            page.locator('#play').tap()
            for screen in ['driver', 'vehicle', 'course', 'shop']:
                page.evaluate('(screen)=>testMobile.menus.show(screen)', screen)
                page.wait_for_timeout(80)
                page.evaluate('testMobile.render()')
                last = page.locator('.card').last
                last.scroll_into_view_if_needed()
                last.tap()
                page.evaluate('testMobile.render()')
                reachable(page, '#menu-back')
                if screen != 'shop':
                    reachable(page, '#start' if screen == 'course' else '#continue')
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
                page.screenshot(path=str(OUT / f'{width}-{height}-{screen}.png'))
            page.evaluate('testMobile.menus.show("course")')
            page.locator('#start').tap()
            page.evaluate('for(let i=0;i<361;i++)testMobile.tick(1/120);testMobile.render()')
            for selector in ['[data-drive=left]', '[data-drive=right]', '[data-drive=brake]', '[data-drive=drift]', '#pause']:
                reachable(page, selector)
            page.evaluate("testMobile.race.player.item='turbo';testMobile.render()")
            reachable(page, '#use-item')
            page.screenshot(path=str(OUT / f'{width}-{height}-race.png'))
            page.locator('#pause').tap()
            reachable(page, '#resume')
            page.locator('#back').scroll_into_view_if_needed()
            page.locator('#back').tap()
        print('FIVE_PHONE_TABLET_LAYOUTS_MENUS_RACE_AND_PAUSE_OK', flush=True)

        page.set_viewport_size({'width':844, 'height':390})
        page.evaluate('testMobile.start();for(let i=0;i<361;i++)testMobile.tick(1/120);for(let i=0;i<120;i++)testMobile.tick(1/120);testMobile.render()')
        assert page.evaluate('testMobile.simulation.state.speed') > 10
        cdp = context.new_cdp_session(page)

        def point(selector, pointer_id):
            rect = page.locator(selector).bounding_box()
            return {'x':rect['x']+rect['width']/2, 'y':rect['y']+rect['height']/2, 'id':pointer_id}

        left, drift = point('[data-drive=left]', 1), point('[data-drive=drift]', 2)
        cdp.send('Input.dispatchTouchEvent', {'type':'touchStart', 'touchPoints':[left, drift]})
        assert page.evaluate('testMobile.input.left && testMobile.input.drift && testMobile.input.gas')
        page.evaluate('for(let i=0;i<110;i++)testMobile.tick(1/120);testMobile.render()')
        assert page.evaluate('testMobile.simulation.state.driftCharge') >= .8
        page.screenshot(path=str(OUT/'drift-sparks.png'))
        cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd', 'touchPoints':[]})
        assert page.evaluate('!testMobile.input.left && !testMobile.input.drift')
        page.evaluate('testMobile.tick(1/120)')
        assert page.evaluate('testMobile.simulation.state.boost') > 0
        brake = point('[data-drive=brake]', 3)
        cdp.send('Input.dispatchTouchEvent', {'type':'touchStart', 'touchPoints':[brake]})
        assert page.evaluate('testMobile.input.brake && !testMobile.input.gas')
        cdp.send('Input.dispatchTouchEvent', {'type':'touchCancel', 'touchPoints':[]})
        assert page.evaluate('!testMobile.input.brake && testMobile.input.gas')

        cdp.send('Input.dispatchTouchEvent', {'type':'touchStart', 'touchPoints':[left]})
        page.keyboard.down('KeyQ')
        cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd', 'touchPoints':[]})
        assert page.evaluate('testMobile.input.left')
        page.keyboard.up('KeyQ')
        assert not page.evaluate('testMobile.input.left')
        cdp.send('Input.dispatchTouchEvent', {'type':'touchStart', 'touchPoints':[left]})
        cdp.send('Input.dispatchTouchEvent', {'type':'touchMove', 'touchPoints':[{'x':420, 'y':160, 'id':1}]})
        assert page.evaluate('testMobile.input.left'), 'Pointer capture must preserve a held button outside its bounds'
        page.evaluate('window.dispatchEvent(new Event("blur"))')
        assert page.evaluate('testMobile.mode==="paused" && Object.values(testMobile.input).every(v=>!v)')
        cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd', 'touchPoints':[]})
        page.locator('#resume').tap()
        page.evaluate('screen.orientation.dispatchEvent(new Event("change"))')
        assert page.evaluate('testMobile.mode') == 'paused'
        page.locator('#resume').tap()
        page.evaluate("testMobile.race.player.item='turbo';testMobile.race.player.reserveItem='shield';testMobile.render()")
        page.locator('#use-item').tap()
        assert page.evaluate('testMobile.race.player.item') == 'shield'
        assert page.evaluate('testMobile.race.player.reserveItem') is None
        page.locator('#use-item').tap()
        assert page.evaluate('testMobile.simulation.state.shield') > 0
        print('REAL_MULTITOUCH_DRIFT_BRAKE_CANCEL_CAPTURE_HYBRID_KEYS_PAUSE_ORIENTATION_TWO_ITEMS_OK', flush=True)

        page.evaluate('testMobile.menu()')
        page.locator('#options').scroll_into_view_if_needed()
        page.locator('#options').tap()
        page.locator('#auto-gas').uncheck()
        page.locator('#options-close').scroll_into_view_if_needed()
        page.locator('#options-close').tap()
        page.set_viewport_size({'width':320, 'height':568})
        page.evaluate('testMobile.start();for(let i=0;i<480;i++)testMobile.tick(1/120);testMobile.render()')
        assert page.evaluate('testMobile.simulation.state.speed') == 0
        for selector in ['[data-drive=gas]', '[data-drive=brake]', '[data-drive=drift]', '[data-drive=left]', '[data-drive=right]']:
            reachable(page, selector)
        gas, right = point('[data-drive=gas]', 4), point('[data-drive=right]', 5)
        cdp.send('Input.dispatchTouchEvent', {'type':'touchStart', 'touchPoints':[gas, right]})
        assert page.evaluate('testMobile.input.gas && testMobile.input.right')
        page.evaluate('for(let i=0;i<120;i++)testMobile.tick(1/120)')
        assert page.evaluate('testMobile.simulation.state.speed') > 5
        cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd', 'touchPoints':[]})
        assert page.evaluate('!testMobile.input.gas && !testMobile.input.right')
        assert not errors, errors
        print('MANUAL_ACCELERATION_SMALL_PHONE_OK; ERRORS', errors, flush=True)
        browser.close()
finally:
    server.shutdown()
    server.server_close()
