(() => {
  'use strict';
  const api = window.MaloPrototype;
  for (const driver of Object.values(api.drivers)) driver.portrait = !!driver.guest;
  for (const [id, name, base, color, variant] of [
    ['babyMario','Bébé Mario','mario','#ef443d','baby'], ['babyLuigi','Bébé Luigi','luigi','#45b85b','baby'],
    ['babyPeach','Bébé Peach','peach','#ff9ecb','baby'], ['babyDaisy','Bébé Daisy','daisy','#ffb636','baby'],
    ['babyRosalina','Bébé Harmonie','rosalina','#84e7df','baby'], ['metalMario','Mario de métal','mario','#b9c8d2','metal'],
    ['goldMario','Mario doré','mario','#ffd151','metal'], ['toadette','Toadette','toad','#ef70b0','toadette'],
    ['bowserJr','Bowser Jr.','bowser','#85be46','junior'], ['dryBones','Skelerex','koopa','#d9d8c9','bones'],
    ['dryBowser','Bowser Skelet','bowser','#ded8c8','bones'], ['birdo','Birdo','birdo','#ed69ab',''],
    ['boo','Roi Boo','boo','#f5f0ff',''], ['donkey','Donkey Kong','donkey','#87532d',''],
    ['diddy','Diddy Kong','diddy','#dc3838',''], ['kamek','Kamek','kamek','#388bdd','']
  ]) api.drivers[id] = { name, base, color, variant, guest:true, description:`${name} · modèle 3D stylisé, disponible dès le départ.` };

  for (const [id,name,shape,speed,acceleration,handling,weight,color,length,width] of [
    ['buggy','Buggy des dunes','buggy',33,14,1.08,1.15,'#f3a638',1,.96],
    ['formula','Formule éclair','formula',40,12,.9,.9,'#db384c',1.25,.8],
    ['roadster','Roadster rétro','retro',35,13,1,1.2,'#52b8bf',1.1,1],
    ['rocket','Fusée','rocket',42,10,.85,1.3,'#eb6b32',1.2,.85],
    ['beetle','Coccinelle','beetle',31,16,1.16,.85,'#df3964',.85,1.05],
    ['jeep','Explorateur','jeep',34,12,1.1,1.5,'#66a360',1.05,1.12],
    ['hover','Comète','hover',37,14,.96,.95,'#9b74e7',1.1,.92]
  ]) api.vehicles[id] = { name,shape,speed,acceleration,handling,weight,color,length,width,description:`${name} : carrosserie ${shape === 'retro' ? 'rétro' : 'originale'}, réglages propres de vitesse et de conduite.` };
  for (const [id,name,radius,width,color,rim,speed,acceleration,handling,weight,spokes] of [
    ['offroad','Tout-terrain',.49,.43,'#39463b','#e9bc56',-1,0,.09,.2,6],
    ['slick','Slick',.41,.5,'#171d27','#df414b',3,-2,-.09,.1,3],
    ['wood','Bois',.42,.32,'#9d683e','#efcb8e',-1,1,.04,0,8],
    ['ice','Cristal',.39,.34,'#a6eaff','#f2fcff',1,0,-.02,0,6],
    ['balloon','Ballon',.48,.48,'#72bcdd','#fcf3a6',-2,1,.1,-.1,4],
    ['neon','Néon',.36,.37,'#352653','#ef6ce5',1,1,0,-.05,7],
    ['golden','Jantes dorées',.4,.38,'#26313c','#ffd454',0,0,.03,.1,10]
  ]) api.tires[id] = { name,radius,width,color,rim,speed,acceleration,handling,weight,spokes,description:`Roues ${name.toLowerCase()} : taille, jantes et tenue de route spécifiques.` };
  Object.assign(api.gliders.delta,{shape:'delta',color:'#ed3e43'});
  Object.assign(api.gliders.flower,{shape:'flower',color:'#ffd440'});
  Object.assign(api.gliders.cloud,{shape:'cloud',color:'#f2fcff'});
  for (const [id,name,shape,color] of [
    ['parasol','Parasol','parasol','#ff8058'], ['bat','Chauve-souris','bat','#7654c0'],
    ['sail','Voile marine','sail','#52bcdd'], ['butterfly','Papillon','butterfly','#ed7bd2'],
    ['leaf','Feuille','leaf','#8dd362'], ['rainbow','Arc-en-ciel','parasol','#9d8bf1'],
    ['jet','Aile de jet','jet','#c1d5e3']
  ]) api.gliders[id] = {name,shape,color,description:`${name} : se déploie automatiquement sur les rampes bleues. Direction gauche/droite en vol.`};

  const themes = {
    coast:api.courses.azur, forest:api.courses.neon, sand:api.courses.desert,
    snow:{sky:'#a4d8fa',fog:'#e0edff',ground:'#e8f5ff',outer:'#6094c4',tree:'#c0d7e3',accent:'#64b8f1'},
    candy:{sky:'#e4b1ed',fog:'#f5d5ed',ground:'#e49dcc',outer:'#9a75bc',tree:'#efc1e6',accent:'#fce27c'},
    lava:{sky:'#4f293f',fog:'#7e4854',ground:'#50434a',outer:'#eb6336',tree:'#6b5965',accent:'#f8b03d'},
    city:{sky:'#5260a2',fog:'#838bba',ground:'#697b8a',outer:'#344365',tree:'#81bca7',accent:'#ffc75b'},
    cloud:{sky:'#80cffa',fog:'#e0efff',ground:'#e6e8fc',outer:'#7cbde8',tree:'#f8fcff',accent:'#e6b2f7'}
  };
  Object.assign(api.courses.azur,{theme:'coast',cup:0,medal:'☀',presentation:'tropical'});
  Object.assign(api.courses.neon,{theme:'forest',cup:0,medal:'☾'});
  Object.assign(api.courses.desert,{theme:'sand',cup:0,medal:'✦'});
  api.cups = ['Coupe Horizon','Coupe Givre','Coupe Sucrée','Coupe Volcan','Coupe Métropole','Coupe Céleste'];
  const routes = [
    ['lagoon','Lagon des voiles','coast',0,1.05,.88,11,2,0],
    ['glacier','Glacier étincelant','snow',1,.95,1.08,13,3,.2], ['fjord','Virages du fjord','snow',1,1.12,.85,16,2,.7],
    ['aurora','Aurores polaires','snow',1,1,1,19,3,1.2], ['summit','Sommet givré','snow',1,.9,1.13,15,4,.3],
    ['bonbon','Boucle bonbon','candy',2,1.1,.9,17,3,.4], ['biscuit','Biscuit express','candy',2,1.15,.85,12,2,1.1],
    ['sorbet','Slalom sorbet','candy',2,.92,1.1,19,4,.7], ['choco','Vallée chocolat','candy',2,1,1,21,3,1.5],
    ['caldera','Caldeira ardente','lava',3,1.1,.92,18,3,.8], ['basalt','Bastion de basalte','lava',3,.95,1.05,16,4,1.4],
    ['magma','Méandre magma','lava',3,1.12,.86,22,3,.2], ['ember','Route des braises','lava',3,1,1,14,2,1.8],
    ['metro','Métropole minuit','city',4,1.15,.85,17,4,.5], ['harbor','Port des lumières','city',4,1.05,.95,19,3,1],
    ['garden','Jardins suspendus','forest',4,.9,1.12,16,3,1.7], ['arcade','Avenue arcade','city',4,1.08,.92,12,4,1.3],
    ['cloudway','Autoroute des nuages','cloud',5,1.1,.9,15,2,.4], ['rainbowRoad','Ruban arc-en-ciel','cloud',5,1,1,22,4,.9],
    ['stars','Archipel des étoiles','cloud',5,.94,1.1,20,3,1.9], ['skyline','Grande traversée','cloud',5,1.13,.88,18,4,2.2]
  ];
  for (const [id,name,theme,cup,sx,sz,wave,bends,phase] of routes) {
    const layout = Array.from({length:12},(_,i)=>{
      const angle=i*Math.PI/6, radius=112+wave*Math.sin(angle*bends+phase)+7*Math.cos(angle*2-phase);
      return [Math.sin(angle)*radius*sx,0,Math.cos(angle)*radius*sz];
    });
    api.courses[id]={...themes[theme],name,theme,cup,layout,medal:['☀','❄','✿','♜','◆','★'][cup],
      difficulty:bends>=4?'TECHNIQUE':'INTERMÉDIAIRE',description:`${name} · tracé original, accélérateurs et deux passages en vol.`};
  }
  Object.assign(api.courses.rainbowRoad,{presentation:'rainbow',sky:'#110c2c',fog:'#201743',description:'Une piste lumineuse multicolore, suspendue dans un ciel étoilé.'});
  api.courses.azur.description='Boulevard tropical : palmiers, hôtels colorés et tribunes au bord de la mer.';
  for (const [id,name,color,price,pattern] of [
    ['ocean','Vagues océanes','#258dc5',100,'waves'], ['racer','Bandes de course','#e44545',130,'stripes'],
    ['night','Étoiles de nuit','#313f8b',170,'stars'], ['pollen','Fleurs solaires','#f5b533',220,'flowers'],
    ['frost','Cristaux de givre','#b1e5ee',280,'diamonds'], ['flame','Flammes','#f06b32',350,'flames'],
    ['checkers','Damier','#eeeeee',430,'checkers'], ['jungle','Feuilles jungle','#53a55c',520,'leaves'],
    ['candy','Pois bonbon','#ed86c0',620,'dots'], ['galaxy','Galaxie','#6e47a1',740,'stars'],
    ['royal','Couronne royale','#e5bd5d',880,'crown'], ['champion','Champion prismatique','#69dace',1050,'rainbow']
  ]) api.paints[id]={name,color,price,pattern};
})();
