(() => {
  'use strict';
  const api=window.MaloPrototype;
  api.addReferenceScenery=(T,root,track,texture)=>{
    const theme=api.courses[track.id],rainbow=theme.presentation==='rainbow';
    if(!rainbow && theme.presentation!=='tropical')return;
    const boxGeometry=new T.BoxGeometry(1,1,1),sphere=new T.SphereGeometry(1,10,8);
    const mat=color=>new T.MeshStandardMaterial({color,roughness:.6});
    const white=mat('#fff4dc'),gold=mat('#f6c34f');
    function mesh(geometry,material,position,scale,parent=root){const object=new T.Mesh(geometry,material);object.position.set(...position);object.scale.set(...scale);object.castShadow=object.receiveShadow=true;parent.add(object);return object;}
    function batch(geometry,material,entries){
      const object=new T.InstancedMesh(geometry,material,entries.length),pose=new T.Object3D();
      entries.forEach((entry,i)=>{pose.position.set(...entry.p);pose.scale.set(...entry.s);pose.rotation.set(...(entry.r||[0,0,0]));pose.updateMatrix();object.setMatrixAt(i,pose.matrix);});
      object.castShadow=object.receiveShadow=true;root.add(object);
    }
    if(rainbow){
      const vertices=[];
      for(let i=0;i<700;i++){const a=i*2.39996,r=220+(i*73)%500,y=-60+(i*47)%400;vertices.push(Math.cos(a)*r,y,Math.sin(a)*r);}
      const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
      root.add(new T.Points(geometry,new T.PointsMaterial({color:'#d4dcff',size:1.4,sizeAttenuation:true})));
      const star=new T.Shape();for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2?.48:1;if(i)star.lineTo(Math.cos(a)*r,Math.sin(a)*r);else star.moveTo(Math.cos(a)*r,Math.sin(a)*r);}star.closePath();
      const starGeometry=new T.ExtrudeGeometry(star,{depth:.25,bevelEnabled:false});
      const glow=new T.MeshStandardMaterial({color:'#ffe882',emissive:'#ffb945',emissiveIntensity:.7,metalness:.4,roughness:.3});
      const entries=[];
      for(let i=0;i<480;i+=20)for(const side of [-1,1]){const p=track.points[i];entries.push({p:[p.x+p.tz*side*10,1.8,p.z-p.tx*side*10],s:[.65,.65,.65],r:[0,Math.atan2(p.tx,p.tz),0]});}
      batch(starGeometry,glow,entries);
      const start=track.points[0],arch=new T.Group();arch.position.set(start.x,0,start.z);arch.rotation.y=Math.atan2(start.tx,start.tz);root.add(arch);
      const arc=mesh(new T.TorusGeometry(10,.3,8,48,Math.PI),gold,[0,1,0],[1,1,1],arch);
      arc.rotation.z=0;
      for(let i=0;i<5;i++){const a=Math.PI*(i+1)/6;mesh(starGeometry,glow,[Math.cos(a)*10,1+Math.sin(a)*10,0],[1.2,1.2,1.2],arch);}
      for(let i=0;i<3;i++){const ring=mesh(new T.TorusGeometry(36+i*8,.5,6,64),new T.MeshBasicMaterial({color:['#ff7bd4','#79eaff','#ffe57a'][i]}),[-85+i*95,28+i*15,-210],[1,1,1]);ring.rotation.set(.8+i*.2,.2,0);}
      // Ces géométries génériques ne sont utilisées que par le décor tropical.
      boxGeometry.dispose();sphere.dispose();white.dispose();
      return;
    }
    const trunks=[],leaves=[],windows=[],spectators=[];
    const leafGeometry=new T.SphereGeometry(1,8,4),leafMaterial=mat('#62b64c');
    const facadeColors=['#f3b780','#f3e7c1','#7bcbdc','#ecbdcf'];
    for(let i=10;i<480;i+=20)for(const side of [-1,1]){
      const p=track.points[i],x=p.x+p.tz*side*16,z=p.z-p.tx*side*16,h=6+i%3;
      if(api.nearestPoint(track.points,x,z).distance<12)continue;
      trunks.push({p:[x,h/2,z],s:[.4,h,.4],r:[0,0,side*.08]});
      for(let j=0;j<5;j++){const a=j*Math.PI*2/5;leaves.push({p:[x+Math.sin(a)*1.5,h,z+Math.cos(a)*1.5],s:[.7,.15,3.2],r:[.16,a,0]});}
    }
    batch(new T.CylinderGeometry(1,1.3,1,7),mat('#b18a59'),trunks);batch(leafGeometry,leafMaterial,leaves);
    for(let i=20;i<480;i+=40){
      const p=track.points[i],side=i%80?1:-1,x=p.x+p.tz*side*29,z=p.z-p.tx*side*29,h=9+i%7;
      if(api.nearestPoint(track.points,x,z).distance<20)continue;
      mesh(boxGeometry,mat(facadeColors[(i/40|0)%4]),[x,h/2,z],[11,h,9]);
      mesh(boxGeometry,white,[x,h+.25,z],[12,.5,10]);
      mesh(boxGeometry,gold,[x,2.8,z+4.8],[12,.5,2]);
      for(const face of [-1,1])for(let row=0;row<3;row++)for(const offset of [-3,0,3])windows.push({p:[x+offset,4+row*2.8,z+face*4.55],s:[1.7,1.8,.1]});
    }
    batch(boxGeometry,mat('#387c9d'),windows);
    for(let i=4;i<50;i+=4){const p=track.points[i],side=i%8?1:-1;spectators.push({p:[p.x+p.tz*side*11,1,p.z-p.tx*side*11],s:[.45,.6,.4]});}
    batch(sphere,mat('#e36c7b'),spectators);batch(sphere,mat('#ffe0ac'),spectators.map(e=>({p:[e.p[0],1.85,e.p[2]],s:[.35,.35,.35]})));
    batch(boxGeometry,mat('#334e7e'),spectators.flatMap(e=>[-1,1].map(side=>({p:[e.p[0]+side*.18,.3,e.p[2]],s:[.2,.6,.25]}))));
    for(const [index,text,color] of [[25,'MALO RESORT','#20a2b5'],[180,'SUNSHINE CUP','#e4a33e'],[280,'KART BEACH','#ef778e']]){
      const p=track.points[index],group=new T.Group();group.position.set(p.x+p.tz*13,0,p.z-p.tx*13);group.rotation.y=Math.atan2(p.tx,p.tz);root.add(group);
      const map=texture(512,192,(ctx,w,h)=>{ctx.fillStyle=color;ctx.fillRect(0,0,w,h);ctx.strokeStyle='#fff8dc';ctx.lineWidth=10;ctx.strokeRect(8,8,w-16,h-16);ctx.fillStyle='#fff8dc';ctx.font='italic 900 46px Arial';ctx.textAlign='center';ctx.fillText(text,w/2,115);});
      const sign=mesh(new T.PlaneGeometry(9,3.4),new T.MeshStandardMaterial({map,side:T.DoubleSide}),[0,4.5,0],[1,1,1],group);sign.rotation.y=Math.PI;
      for(const x of [-3,3])mesh(boxGeometry,white,[x,2,0],[.2,4,.2],group);
    }
  };
})();
