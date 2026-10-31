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
    ['lagoon','Ovale du lagon','coast',0,'Ovale', [[-120,65],[0,65],[120,65],[155,0],[120,-65],[0,-65],[-120,-65],[-155,0]]],
    ['glacier','Patinoire étincelante','snow',1,'Rectangle arrondi', [[-100,90],[100,90],[135,55],[135,-55],[100,-90],[-100,-90],[-135,-55],[-135,55]]],
    ['fjord','Virages du fjord','snow',1,'Double baie', [[-130,70],[-40,110],[50,80],[130,100],[155,20],[100,-70],[20,-100],[-15,-30],[-90,-65],[-155,-15]]],
    ['aurora','Triangle des aurores','snow',1,'Triangle', [[-115,90],[0,110],[115,90],[100,20],[30,-105],[0,-125],[-30,-105],[-100,20]]],
    ['summit','Lacets du sommet','snow',1,'Lacets', [[-145,100],[20,100],[145,70],[135,15],[35,15],[-50,5],[-65,-45],[40,-65],[135,-95],[65,-135],[-110,-115],[-150,-40]]],
    ['bonbon','Rond des bonbons','candy',2,'Rond', Array.from({length:16},(_,i)=>[Math.sin(i*Math.PI/8)*100,Math.cos(i*Math.PI/8)*100])],
    ['biscuit','Biscuit express','candy',2,'Ovale allongé', [[-150,48],[0,48],[150,48],[175,0],[150,-48],[0,-48],[-150,-48],[-175,0]]],
    ['sorbet','Slalom sorbet','candy',2,'Slalom en S', [[-135,115],[-45,115],[30,65],[110,85],[155,30],[90,-10],[30,5],[-40,-45],[20,-100],[-45,-135],[-135,-90],[-155,0]]],
    ['choco','Cacahuète chocolat','candy',2,'Deux lobes', [[-145,65],[-80,105],[0,45],[80,105],[145,65],[160,-20],[90,-85],[0,-40],[-90,-85],[-160,-20]]],
    ['caldera','Anneau de lave','lava',3,'Anneau volcanique', Array.from({length:16},(_,i)=>[Math.sin(i*Math.PI/8)*120,Math.cos(i*Math.PI/8)*120])],
    ['basalt','Forteresse de basalte','lava',3,'Citadelle', [[-120,110],[0,110],[120,110],[145,65],[85,15],[145,-50],[110,-110],[0,-110],[-110,-110],[-145,-50],[-85,15],[-145,65]]],
    ['magma','Ponts du magma','lava',3,'Fer à cheval', [[-145,100],[-65,110],[-55,25],[-65,-55],[0,-100],[65,-55],[55,25],[65,110],[145,100],[150,-80],[80,-150],[-80,-150],[-150,-80]], true],
    ['ember','Sprint des braises','lava',3,'Delta', [[-150,90],[0,90],[150,90],[120,25],[45,-100],[0,-145],[-45,-100],[-120,25]]],
    ['metro','Métropole minuit','city',4,'Grand L', [[-140,110],[120,110],[145,65],[140,0],[35,-5],[15,-45],[15,-130],[-65,-145],[-140,-105]]],
    ['harbor','Pont du grand port','city',4,'Quais et ponts', [[-150,90],[-40,90],[55,120],[150,75],[150,-55],[90,-105],[-15,-70],[-140,-100],[-170,-20]], true],
    ['garden','Jardins suspendus','forest',4,'Boucle en haricot', [[-130,70],[-50,115],[75,100],[145,35],[125,-65],[50,-115],[-20,-70],[-35,0],[-100,-20],[-150,10]], true],
    ['arcade','Escaliers néon','city',4,'Chicanes', [[-150,100],[135,100],[160,50],[100,15],[75,-35],[15,-55],[-10,-110],[-100,-130],[-150,-85],[-100,-30],[-150,25]]],
    ['cloudway','Viaduc des nuages','cloud',5,'Grand viaduc', [[-170,75],[-70,110],[50,80],[160,110],[190,30],[120,-55],[0,-90],[-140,-65]], true],
    ['rainbowRoad','Trèfle arc-en-ciel','cloud',5,'Trèfle', [[-40,120],[40,120],[65,65],[130,30],[130,-35],[65,-65],[35,-130],[-35,-130],[-65,-65],[-130,-35],[-130,30],[-65,65]], true],
    ['stars','Étoile cosmique','cloud',5,'Étoile arrondie', [[0,145],[55,70],[135,45],[85,-30],[85,-115],[0,-90],[-85,-115],[-85,-30],[-135,45],[-55,70]]],
    ['skyline','Grande traversée','cloud',5,'Serpentin', [[-180,90],[-65,100],[20,45],[105,90],[180,55],[150,-10],[65,-30],[-20,-85],[-125,-110],[-185,-45]], true]
  ];
  for (const [id,name,theme,cup,shape,coordinates,bridge=false] of routes) {
    api.courses[id]={...themes[theme],name,theme,cup,shape,bridge,layout:coordinates.map(([x,z])=>[x,0,z]),medal:['☀','❄','✿','♜','◆','★'][cup],
      difficulty:['Rond','Ovale','Ovale allongé','Rectangle arrondi'].includes(shape)?'FACILE':'TECHNIQUE',
      description:`${shape}${bridge?' avec ponts surélevés':''} · accélérateurs et deux passages en vol.`};
  }
  const surfaces={coast:'#408baf',forest:'#6457a0',sand:'#c58d50',snow:'#83cadf',candy:'#b8447b',lava:'#553d56',city:'#35587b',cloud:'#8a80c3'};
  for(const course of Object.values(api.courses))course.road=surfaces[course.theme];
  Object.assign(api.courses.rainbowRoad,{presentation:'rainbow',sky:'#110c2c',fog:'#201743'});
  Object.assign(api.courses.stars,{presentation:'rainbow',sky:'#161139',fog:'#27204c'});
  Object.assign(api.courses.azur,{shape:'Boulevard côtier',description:'Boulevard tropical : palmiers, hôtels colorés et tribunes au bord de la mer.'});
  Object.assign(api.courses.neon,{shape:'Slalom forestier'});
  Object.assign(api.courses.desert,{shape:'Boucle des dunes'});
  for (const [id,name,color,price,pattern] of [
    ['ocean','Vagues océanes','#258dc5',100,'waves'], ['racer','Bandes de course','#e44545',130,'stripes'],
    ['night','Étoiles de nuit','#313f8b',170,'stars'], ['pollen','Fleurs solaires','#f5b533',220,'flowers'],
    ['frost','Cristaux de givre','#b1e5ee',280,'diamonds'], ['flame','Flammes','#f06b32',350,'flames'],
    ['checkers','Damier','#eeeeee',430,'checkers'], ['jungle','Feuilles jungle','#53a55c',520,'leaves'],
    ['candy','Pois bonbon','#ed86c0',620,'dots'], ['galaxy','Galaxie','#6e47a1',740,'stars'],
    ['royal','Couronne royale','#e5bd5d',880,'crown'], ['champion','Champion prismatique','#69dace',1050,'rainbow']
  ]) api.paints[id]={name,color,price,pattern};
})();
