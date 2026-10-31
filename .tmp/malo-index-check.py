import functools,threading
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path.cwd()
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*_):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(channel='msedge',headless=True)
  page=browser.new_page(viewport={'width':1200,'height':800})
  page.goto(f'http://127.0.0.1:{server.server_port}/')
  page.locator('[name=username]').fill('Aperçu')
  page.get_by_role('button',name='Enregistrer',exact=True).click()
  cover=page.locator('img[src*="malo-kart-phase1/preview.png"]')
  cover.scroll_into_view_if_needed()
  assert cover.evaluate('el=>el.complete&&el.naturalWidth===1040&&el.naturalHeight===600')
  cover.locator('..').screenshot(path=str(root/'.tmp/malo-tracks-checks/index-card.png'))
  assert page.locator('a[href="web/malo-kart-phase1/index.html"]').count()==1
  print('INDEX_NEW_COVER_AND_GAME_LINK_OK',flush=True)
  browser.close()
finally:server.shutdown();server.server_close()
