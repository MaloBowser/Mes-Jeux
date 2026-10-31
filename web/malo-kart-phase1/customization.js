(() => {
  'use strict';
  const api=window.MaloPrototype;
  const colors=[['ruby','Rubis','#db405b'],['ocean','Océan','#329fd4'],['lime','Citron vert','#8bc957'],['sun','Soleil','#efbf3c'],['violet','Améthyste','#9160d2'],['rose','Rose','#ee91be'],['ice','Glace','#9adddf'],['orange','Mandarine','#ef853c'],['night','Minuit','#384575'],['silver','Argent','#a9b8cb']];
  const styles=[
    ['rally','Rallye','stripes','spoiler','Course'],['grid','Damier sport','checkers','flag','Course'],
    ['blaze','Turbo flamme','flames','exhaust','Mécanique'],['surf','Vague surf','waves','fin','Nature'],
    ['jungle','Feuillage','leaves','antenna','Nature'],['garden','Jardin fleuri','flowers','flower','Nature'],
    ['space','Constellation','stars','antenna','Cosmos'],['crystal','Cristaux','diamonds','fin','Cosmos'],
    ['party','Confettis','dots','flag','Festif'],['prism','Prisme néon','rainbow','neon','Festif'],
    ['royal','Couronne','crown','crown','Festif'],['engine','Engrenages','gears','exhaust','Mécanique']
  ];
  styles.forEach(([id,name,pattern,accessory,category],i)=>colors.forEach(([shade,label,color],j)=>{
    api.paints[`${id}-${shade}`]={name:`${name} · ${label}`,color,pattern,accessory,category,price:30+(j*styles.length+i)*10};
  }));
  api.paintCanvas = decoration => {
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
    const ctx=canvas.getContext('2d');ctx.fillStyle=decoration.color||'#278bd3';ctx.fillRect(0,0,128,128);
    ctx.fillStyle='#fff4ce';ctx.strokeStyle='#fff4ce';ctx.lineWidth=9;
    const pattern=decoration.pattern;
    if(pattern==='stripes'){ctx.fillRect(24,0,18,128);ctx.fillRect(86,0,18,128);}
    else if(pattern==='checkers'){ctx.fillStyle='#1c2944';for(let x=0;x<4;x++)for(let y=0;y<4;y++)if((x+y)%2===0)ctx.fillRect(x*32,y*32,32,32);}
    else if(pattern==='rainbow'){
      ['#f66','#fc5',decoration.color,'#6df','#b8f'].forEach((color,i)=>{ctx.fillStyle=color;ctx.fillRect(i*26,0,26,128);});
      ctx.fillStyle=decoration.color;ctx.fillRect(0,0,128,12);ctx.fillRect(0,116,128,12);
    }
    else if(pattern==='waves')for(let y=18;y<128;y+=35){ctx.beginPath();ctx.moveTo(0,y);for(let x=0;x<129;x+=8)ctx.lineTo(x,y+Math.sin(x/15)*10);ctx.stroke();}
    else if(pattern==='flames')for(let x=0;x<128;x+=32){ctx.beginPath();ctx.moveTo(x,128);ctx.bezierCurveTo(x+28,90,x-4,70,x+24,22);ctx.bezierCurveTo(x+12,80,x+48,95,x+32,128);ctx.fill();}
    else if(pattern){
      ctx.font='bold 42px Arial';ctx.textAlign='center';
      const symbol={stars:'★',flowers:'✿',diamonds:'◆',leaves:'❧',dots:'●',crown:'♛',gears:'⚙'}[pattern];
      for(const x of [32,96])for(const y of [48,112])ctx.fillText(symbol,x,y);
    }
    return canvas;
  };
})();
