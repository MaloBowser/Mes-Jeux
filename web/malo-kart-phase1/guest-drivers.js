(() => {
  'use strict';
  const api = window.MaloPrototype;
  api.addGuestPilot = (T, parent, id) => {
    const driver = api.drivers[id];
    if (driver.variant) {
      const model = new T.Group(); parent.add(model); api.addGuestPilot(T,model,driver.base);
      if (driver.variant === 'baby' || driver.variant === 'junior') {
        model.scale.setScalar(driver.variant === 'baby' ? .7 : .8); model.position.y = .3;
        for (const child of [...model.children]) if (Math.abs(child.scale.x-.094)<.001) model.remove(child);
      }
      const materials = new Set(); model.traverse(object=>{if(object.material) materials.add(object.material);});
      for (const mat of materials) {
        const hex = mat.color.getHexString();
        if (driver.variant === 'metal') { mat.color.set(driver.color); mat.metalness=.9; mat.roughness=.23; }
        if (driver.variant === 'bones' && !['211e27','fff9ea'].includes(hex)) mat.color.set(['438f38','e74829'].includes(hex)?'#73777b':driver.color);
        if (driver.variant === 'toadette') {
          if (hex==='fff9ea' || hex==='2772e3') mat.color.set(driver.color);
          if (hex==='eb343d') mat.color.set('#fff9ea');
        }
      }
      if (driver.variant === 'toadette') {
        const geometry = new T.SphereGeometry(.18,12,8), material = new T.MeshStandardMaterial({color:driver.color});
        for (const side of [-1,1]) for(let i=0;i<3;i++) { const bead=new T.Mesh(geometry,material); bead.position.set(side*(.55+i*.04),1.9-i*.22,-.15); model.add(bead); }
      }
      return;
    }
    const sphere = new T.SphereGeometry(1, 24, 18);
    const material = color => new T.MeshStandardMaterial({ color, roughness: .58 });
    const suit = material(api.drivers[id].color), skin = material('#ffd0a0'), white = material('#fff9ea');
    const dark = material('#211e27'), gold = material('#ffc936'), brown = material('#65331b');
    const blue = material(['wario', 'waluigi'].includes(id) ? '#6334a6' : '#2462d4');
    function shape(geometry, mat, p, scale = [1, 1, 1]) {
      const object = new T.Mesh(geometry, mat); object.position.set(...p); object.scale.set(...scale);
      object.castShadow = true; object.receiveShadow = true; parent.add(object); return object;
    }
    const ball = (mat, p, scale) => shape(sphere, mat, p, scale);
    const cone = (mat, p, radius, height) => shape(new T.ConeGeometry(radius, height, 12), mat, p);
    const plumbers = ['mario', 'luigi', 'wario', 'waluigi'].includes(id);
    const princess = ['peach', 'daisy', 'rosalina'].includes(id);
    const tall = ['luigi', 'waluigi'].includes(id), heavy = id === 'bowser' || id === 'wario';
    const bodyWidth = heavy ? .49 : .34;
    ball(plumbers ? blue : suit, [0, 1.13, -.08], [bodyWidth, tall ? .5 : .4, .32]);
    for (const side of [-1, 1]) {
      const arm = ball(suit, [side * (bodyWidth + .02), 1.2, .12], [.14, .32, .15]); arm.rotation.x = -.8;
      ball(id === 'bowser' || id === 'yoshi' || id === 'koopa' ? suit : white, [side * .32, 1.04, .43], [.15, .14, .15]);
      ball(brown, [side * .23, .68, .38], [.17, .16, .29]);
      if (plumbers) { ball(blue, [side * .21, 1.34, .19], [.065, .24, .06]); ball(gold, [side * .21, 1.15, .25], [.055, .055, .035]); }
    }
    function eyes(y, z, spacing = .16, size = 1) {
      for (const side of [-1, 1]) {
        ball(white, [side * spacing, y, z], [.11 * size, .16 * size, .07]);
        ball(dark, [side * spacing, y, z + .058], [.045 * size, .09 * size, .026]);
      }
    }
    if (id === 'boo') {
      ball(white,[0,1.65,.05],[.64,.65,.54]);
      for(const side of [-1,1]) { const arm=ball(white,[side*.64,1.55,.02],[.28,.15,.2]); arm.rotation.z=side*.4; }
      eyes(1.92,.51,.2,1.1); ball(dark,[0,1.61,.57],[.3,.2,.045]);
      ball(material('#e5658f'),[0,1.48,.66],[.18,.2,.09]);
      for(const x of [-.2,.2]) { const tooth=cone(white,[x,1.63,.64],.07,.2); tooth.rotation.z=Math.PI; }
      shape(new T.CylinderGeometry(.3,.24,.19,8),gold,[0,2.28,0]);
      for(const x of [-.24,0,.24]) cone(gold,[x,2.47,0],.09,.28);
    } else if (id === 'birdo') {
      ball(suit,[0,1.94,0],[.38,.4,.34]); eyes(2.16,.23,.16,1.1);
      shape(new T.CylinderGeometry(.18,.23,.45,16),suit,[0,1.88,.5]).rotation.x=Math.PI/2;
      ball(dark,[0,1.88,.73],[.13,.13,.025]);
      const red=material('#df354c');
      for(const side of [-1,1]) { const bow=ball(red,[side*.19,2.45,-.02],[.25,.15,.1]); bow.rotation.z=side*.4; }
      ball(gold,[0,2.45,.06],[.09,.1,.08]);
      ball(white,[0,1.18,.24],[.24,.29,.07]);
    } else if (id === 'donkey' || id === 'diddy') {
      const fur=material('#87532d'), muzzle=material('#d2a675');
      ball(fur,[0,1.82,0],[.45,.45,.36]);
      for(const side of [-1,1]) ball(muzzle,[side*.45,1.9,0],[.17,.19,.08]);
      ball(muzzle,[0,1.76,.3],[.38,.24,.26]); eyes(2.04,.26,.16,.9);
      ball(dark,[0,1.88,.56],[.16,.08,.06]);
      if(id==='donkey') { const tie=cone(material('#dc3838'),[0,1.08,.34],.16,.5); tie.rotation.z=Math.PI; }
      else { ball(suit,[0,2.18,0],[.45,.15,.36]); ball(suit,[0,2.13,.32],[.4,.05,.28]);
        const tail=shape(new T.TorusGeometry(.38,.07,6,16,Math.PI*1.5),fur,[.2,1,-.7]); tail.rotation.y=Math.PI/2; }
    } else if (id === 'kamek') {
      ball(skin,[0,1.84,.07],[.34,.35,.31]); ball(skin,[0,1.7,.38],[.29,.18,.3]);
      cone(suit,[0,2.42,-.04],.4,.8); ball(suit,[0,2.09,-.04],[.5,.07,.4]);
      for(const side of [-1,1]) { shape(new T.TorusGeometry(.15,.035,8,16),dark,[side*.17,1.96,.36]); ball(white,[side*.17,1.96,.35],[.13,.13,.04]); }
      const wand=shape(new T.CylinderGeometry(.035,.035,.85,6),brown,[.53,1.3,.2]); wand.rotation.z=-.4;
      ball(gold,[.7,1.7,.2],[.14,.14,.14]);
    } else if (plumbers) {
      const headY = tall ? 1.98 : 1.88, wide = id === 'wario' ? .49 : .39;
      ball(brown, [0, headY, -.16], [wide * 1.03, .38, .35]);
      ball(skin, [0, headY, .025], [wide, tall ? .4 : .35, .36]);
      for (const side of [-1, 1]) ball(skin, [side * wide, headY, .02], [.115, .145, .105]);
      eyes(headY + .08, .343);
      ball(id === 'wario' ? material('#ee8b9a') : skin, [0, headY - .02, .45], [.18, .14, .18]);
      for (let i = -2; i <= 2; i++) {
        const moustache = ball(dark, [i * .082, headY - .16 + Math.abs(i) * .025, .36], [.094, .065, .053]);
        moustache.rotation.z = -i * .16;
      }
      ball(suit, [0, headY + .29, -.025], [wide * 1.15, .24, .4]);
      ball(suit, [0, headY + .21, .3], [wide * 1.13, .065, .3]);
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(32, 32, 30, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = api.drivers[id].color; ctx.font = 'bold 45px Arial'; ctx.textAlign = 'center';
      ctx.fillText({ mario: 'M', luigi: 'L', wario: 'W', waluigi: 'Γ' }[id], 32, 48);
      const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
      shape(new T.PlaneGeometry(.27, .27), new T.MeshStandardMaterial({ map, transparent: true }), [0, headY + .35, .385]);
    } else if (princess) {
      const hair = id === 'daisy' ? material('#c4792c') : material('#ffe28a');
      ball(hair, [0, 1.76, -.22], [.44, .59, .34]);
      ball(skin, [0, 1.93, .09], [.31, .34, .3]); eyes(1.98, .357, .12, .85);
      for (const side of [-1, 1]) {
        ball(hair, [side * .28, 1.82, -.01], [.14, .45, .18]);
        ball(blue, [side * .32, 1.78, .15], [.06, .085, .045]);
      }
      const fringe = ball(hair, [-.1, 2.18, .18], [.29, .16, .19]); fringe.rotation.z = -.3;
      ball(material('#e85789'), [0, 1.78, .368], [.065, .03, .02]);
      shape(new T.CylinderGeometry(.2, .17, .18, 8), gold, [0, 2.35, -.01]);
      for (const x of [-.16, 0, .16]) cone(gold, [x, 2.51, .01], .075, .2);
      ball(blue, [0, 2.37, .19], [.065, .07, .035]);
      ball(suit, [0, .91, -.04], [.48, .26, .43]); ball(blue, [0, 1.33, .25], [.08, .1, .025]);
    } else if (id === 'toad') {
      ball(skin, [0, 1.8, .08], [.34, .32, .3]); eyes(1.82, .355, .12, .8);
      ball(white, [0, 2.2, -.02], [.62, .42, .52]);
      const red = material('#eb343d');
      for (const [x, y, z, sx, sy, sz] of [[0,2.24,.47,.22,.23,.035],[-.52,2.18,.12,.045,.22,.2],[.52,2.18,.12,.045,.22,.2],[0,2.58,-.02,.22,.035,.2],[0,2.22,-.52,.2,.22,.035]]) ball(red,[x,y,z],[sx,sy,sz]);
      ball(skin, [0, 1.23, .2], [.2, .24, .11]);
    } else if (id === 'shyguy') {
      ball(suit, [0, 1.89, -.025], [.43, .47, .37]);
      ball(white, [0, 1.9, .28], [.3, .35, .08]);
      for (const x of [-.12, .12]) ball(dark, [x, 1.98, .355], [.062, .1, .025]);
      ball(dark, [0, 1.76, .359], [.07, .085, .02]);
      ball(brown, [0, .95, .23], [.34, .06, .06]); ball(gold, [0, .95, .29], [.07, .085, .025]);
    } else if (id === 'yoshi') {
      ball(suit, [0, 1.95, -.035], [.34, .4, .32]);
      ball(suit, [0, 1.88, .39], [.39, .29, .44]);
      ball(white, [0, 1.66, .3], [.32, .15, .35]);
      eyes(2.18, .2, .145, 1.2);
      for (const x of [-.14, .14]) ball(dark, [x, 2.01, .74], [.032, .025, .025]);
      const red = material('#e74b39');
      for (const y of [1.8, 2, 2.2]) ball(red, [0, y, -.31], [.12, .11, .12]);
      ball(white, [0, 1.18, .2], [.24, .3, .09]);
      const tail = cone(suit, [0, .98, -.64], .2, .65); tail.rotation.x = -.85;
    } else {
      const bowser = id === 'bowser', green = material('#438f38');
      ball(green, [0, 1.28, -.49], [bowser ? .62 : .45, bowser ? .62 : .45, .28]);
      const rim = shape(new T.TorusGeometry(bowser ? .59 : .43, .07, 10, 28), white, [0, 1.29, -.49]); rim.scale.y = 1.04;
      ball(suit, [0, 1.92, .02], [bowser ? .49 : .3, .37, .32]);
      ball(bowser ? skin : suit, [0, 1.77, .35], [bowser ? .47 : .32, .22, .3]);
      eyes(2.02, .31, bowser ? .22 : .13);
      ball(skin, [0, 1.16, .22], [bodyWidth * .8, .29, .12]);
      if (bowser) {
        const red = material('#e74829');
        for (const x of [-.22, 0, .22]) cone(red, [x, 2.38, -.035], .13, .4);
        for (const side of [-1, 1]) { const horn = cone(white, [side * .43, 2.3, -.02], .11, .4); horn.rotation.z = -side * .35; }
        for (const [x, y] of [[0,1.3],[-.35,1.5],[.35,1.5],[0,1.78],[0,.95]]) {
          const spike = cone(white, [x,y,-.81], .12, .35); spike.rotation.x = -Math.PI / 2;
        }
        for (const x of [-.2, .2]) { const fang = cone(white, [x,1.64,.55], .055, .15); fang.rotation.z = Math.PI; }
      }
    }
  };
})();
