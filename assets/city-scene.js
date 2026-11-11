// Hand-authored city scenery in the reference photograph's 1200 × 800 plane.
// All surroundings are native SVG; the central IKEA model stays independent.
(() => {
  'use strict';
  const ns='http://www.w3.org/2000/svg';
  const clamp=x=>Math.max(0,Math.min(1,x));
  const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
  const pts=a=>a.map(p=>p.join(',')).join(' ');
  function mount(svg){
    const make=(tag,attrs,parent)=>{const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);parent.append(e);return e;};
    const defs=make('defs',{},svg);
    const paving=make('pattern',{id:'city-paving',width:32,height:24,patternUnits:'userSpaceOnUse',patternTransform:'matrix(1 .42 -1 .65 0 0)'},defs);
    make('path',{d:'M0 0H32V24H0Z M16 0V12 M0 12H32',fill:'none',stroke:'#bdb9ab','stroke-width':.4,opacity:.48},paving);
    const groundGradient=make('linearGradient',{id:'city-ground',x1:'0%',y1:'0%',x2:'40%',y2:'100%'},defs);
    make('stop',{offset:0,'stop-color':'#f1efe6'},groundGradient);make('stop',{offset:1,'stop-color':'#ddd9cd'},groundGradient);
    const back=make('g',{'data-environment':'city',transform:'translate(-300 -171) scale(1.805)'},svg);
    const ground=make('g',{'data-city-layer':'ground',opacity:0},back);
    make('rect',{x:-1200,y:-1200,width:3600,height:3200,fill:'url(#city-ground)'},ground);
    make('rect',{x:-1200,y:-1200,width:3600,height:3200,fill:'url(#city-paving)'},ground);
    const road=make('g',{'data-city-layer':'streets'},ground);
    const roadD='M-230 650C-70 540 80 447 214 362S385 245 461 178C505 135 550 111 627 88';
    make('path',{d:roadD,fill:'none',stroke:'#f8f7ef','stroke-width':88},road);
    make('path',{d:roadD,fill:'none',stroke:'#b9bcb7','stroke-width':79},road);
    make('path',{d:roadD,fill:'none',stroke:'#b0b4b0','stroke-width':53},road);
    // Four polished rails, with a narrow concrete bed between the two tracks.
    for(const shift of [-20,-16,12,16])make('path',{d:roadD,transform:`translate(0 ${shift})`,fill:'none',stroke:'#737c78','stroke-width':1.1,opacity:.76},road);
    make('path',{d:'M927 418L1110 304Q1124 295 1134 307L1151 323Q1158 331 1145 338L1109 360Q1101 368 1112 378L1190 419',fill:'none',stroke:'#b6bcb7','stroke-width':2},road);
    make('path',{d:'M953 439L1114 341M1005 480L1196 363',fill:'none',stroke:'#fafaf3','stroke-width':18},road);
    // Broad pavement strips outside the entrance, parallel to the building front.
    for(let i=0;i<9;i++)make('path',{d:`M${188+i*13} ${516+i*6}L${440+i*13} ${653+i*6}`,stroke:'#c1bdaf','stroke-width':1,opacity:.52},ground);
    const massing=make('g',{'data-city-layer':'buildings'},back);
    const solids=make('g',{opacity:0},massing),ink=make('g',{fill:'none',stroke:'#87968f','stroke-width':.65,'stroke-linejoin':'round',opacity:0},massing);
    let blockCount=0;
    function block(p,h,tone='#faf9f2',gable=false){
      const roof=p.map(([x,y])=>[x,y-h]);
      const g=make('g',{'data-city-block':++blockCount},solids);
      // Every footprint is authored; varying heights, setbacks and roof cuts
      // preserve the quiet model-city character of the reference.
      const edges=p.map((_,i)=>i).sort((a,b)=>(p[a][1]+p[(a+1)%p.length][1])-(p[b][1]+p[(b+1)%p.length][1]));
      for(const i of edges){
        const j=(i+1)%p.length;
        make('polygon',{points:pts([roof[i],roof[j],p[j],p[i]]),fill:i%2?'#d6d8d0':'#e5e4db',stroke:'#d0d2c8','stroke-width':.5},g);
      }
      make('polygon',{points:pts(roof),fill:tone,stroke:'#fffef8','stroke-width':.8},g);
      if(gable&&roof.length===4){
        const a=[(roof[0][0]+roof[3][0])/2,(roof[0][1]+roof[3][1])/2-15],b=[(roof[1][0]+roof[2][0])/2,(roof[1][1]+roof[2][1])/2-15];
        make('polygon',{points:pts([roof[0],roof[1],b,a]),fill:'#fefdf7'},g);
        make('polygon',{points:pts([a,b,roof[2],roof[3]]),fill:'#e8e8df'},g);
      }
      const d=roof.map((v,i)=>(i?'L':'M')+v.join(' ')).join('')+'Z'+p.map((v,i)=>'M'+v.join(' ')+'L'+roof[i].join(' ')).join('');
      make('path',{d,pathLength:1,'stroke-dasharray':1,'stroke-dashoffset':1},ink);
    }
    // Left streetscape: irregular courtyard blocks and stepped street corners.
    block([[-220,413],[-84,337],[50,392],[-86,478]],96);
    block([[-105,304],[18,236],[137,286],[17,356]],111,'#f8f7ef',true);
    block([[10,219],[89,174],[160,207],[81,253]],76,'#fffdf7',true);
    block([[95,169],[160,133],[216,156],[153,196]],118);
    block([[157,227],[207,199],[246,220],[213,241],[235,254],[198,275],[161,255]],79);
    block([[-105,144],[-20,98],[62,127],[-24,178]],84,'#f5f5ed',true);
    block([[18,97],[98,53],[165,81],[85,124]],79,'#fffef7',true);
    block([[98,61],[150,33],[219,59],[168,91]],106);
    block([[217,133],[294,89],[349,109],[271,157]],132,'#faf9f2',true);
    block([[274,197],[337,160],[388,183],[325,220]],99);
    block([[342,139],[402,104],[440,121],[380,157]],143);
    block([[401,81],[458,49],[489,62],[434,97]],116,'#fffef6',true);
    // Distant roofscape continues beyond every edge instead of a rectangular border.
    for(let i=0;i<18;i++){
      const x=80+i*66,y=-55+(i%3)*24,h=64+(i*31)%58;
      block([[x,y],[x+44,y-25],[x+84,y-8],[x+40,y+19]],h,i%3?'#faf9f2':'#f0f1e9',i%2===0);
    }
    block([[483,128],[571,77],[620,98],[535,151]],147);
    block([[553,62],[624,21],[684,45],[615,87]],117,'#fffef7',true);
    block([[625,122],[710,72],[751,91],[666,143]],151);
    block([[716,92],[791,48],[825,63],[751,108]],134);
    block([[779,153],[844,114],[887,133],[824,174]],140,'#fafaf3',true);
    block([[845,108],[919,65],[962,85],[888,129]],118);
    block([[919,172],[1006,121],[1054,143],[968,196]],145,'#fffef8',true);
    // Right-hand massing follows the angled service street from the reference.
    block([[961,333],[1088,259],[1161,292],[1034,370]],133,'#f9f9f1',true);
    block([[1054,246],[1167,181],[1240,212],[1127,280]],117);
    block([[1090,141],[1192,82],[1277,119],[1174,178]],129,'#fafaf4',true);
    block([[1162,417],[1276,350],[1369,390],[1254,461]],113);
    block([[1225,262],[1340,195],[1428,233],[1314,302]],132,'#fffef7',true);
    block([[860,795],[1058,681],[1298,786],[1092,906]],65,'#fafaf4');
    // Roof details add architectural scale without inventing store windows.
    for(const [x,y] of [[170,30],[329,64],[566,3],[739,16],[1004,47],[1120,217]]){
      make('path',{d:`M${x} ${y}v-18l8-5v18Z`,fill:'#b9c2ba'},solids);
    }
    const front=make('g',{'data-environment':'foreground',transform:'translate(-300 -171) scale(1.805)'},svg);
    const streetLife=make('g',{'data-city-layer':'street-life',opacity:0},front);
    // Planters, benches, bike stands and the two small service cylinders.
    for(const [x,y,w] of [[182,620,50],[247,662,64],[353,711,69]]){
      make('path',{d:`M${x} ${y}l${w} 28l-19 12l-${w} -29Z`,fill:'#899071',stroke:'#e3e1d7','stroke-width':1},streetLife);
      make('path',{d:`M${x-4} ${y-3}l${w} 28`,stroke:'#c0af8a','stroke-width':3},streetLife);
    }
    for(const [x,y] of [[121,649],[144,666]]){
      make('path',{d:`M${x-10} ${y-22}v25q10 9 20 0v-25Z`,fill:'#dedfd4'},streetLife);
      make('ellipse',{cx:x,cy:y-22,rx:10,ry:5,fill:'#fffff7'},streetLife);
    }
    for(let i=0;i<13;i++){
      const x=256+i*7,y=554+i*3.7;
      make('path',{d:`M${x} ${y}v-7q3-5 6-1v7`,fill:'none',stroke:'#6f7973','stroke-width':.75},streetLife);
      if(i%2===0){make('ellipse',{cx:x-1,cy:y+1,rx:3,ry:4,fill:'none',stroke:'#666e66','stroke-width':.6},streetLife);make('ellipse',{cx:x+7,cy:y+4,rx:3,ry:4,fill:'none',stroke:'#666e66','stroke-width':.6},streetLife);}
    }
    for(const [x,y] of [[225,524],[314,585],[409,656]]){
      make('path',{d:`M${x} ${y}l23 12l-3 2l-23-12Z`,fill:'#a59170'},streetLife);
      make('path',{d:`M${x+2} ${y+2}v5m17 4v5`,stroke:'#737c70','stroke-width':1},streetLife);
    }
    // Small planted street trees with individual branch and canopy silhouettes.
    let seed=73;const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
    for(const [x,y,r] of [[216,553,11],[304,609,13],[390,661,14],[902,516,11],[924,497,10],[943,478,9]]){
      const g=make('g',{'data-street-tree':x},streetLife);
      make('path',{d:`M${x} ${y}v-26m0 11l-7-9m7 5l8-10`,fill:'none',stroke:'#797d64','stroke-width':1.6},g);
      for(let k=0;k<18;k++){const a=random()*Math.PI*2,rad=Math.sqrt(random())*r;make('ellipse',{cx:x+Math.cos(a)*rad,cy:y-31+Math.sin(a)*rad*.8,rx:3+random()*4,ry:3+random()*4,fill:['#7e8a62','#9aa378','#b0b78c','#687951'][k%4],opacity:.88},g);}
    }
    const people=make('g',{'data-city-layer':'people',opacity:0},front);
    const palette=['#48524d','#78857b','#a89e84','#ded9c7','#7e8e97','#b3a999','#66705d'];
    function person(x,y,s,k){
      const g=make('g',{'data-person':k,transform:`translate(${x} ${y}) scale(${s})`},people);
      make('path',{d:'M0 0l10 3l3-1L2-2Z',fill:'#6f7569',opacity:.12},g);
      make('path',{d:k%2?'M-1-6L-3 0M1-6L3-1':'M-1-6L-1 0M1-6L4 0',stroke:'#5f675d','stroke-width':1.15,'stroke-linecap':'round'},g);
      make('path',{d:'M-1-12Q0-13 2-11L3-5L-2-5Z',fill:palette[k%palette.length]},g);
      make('path',{d:'M-1-10L-4-6M2-10L4-7',fill:'none',stroke:palette[k%palette.length],'stroke-width':1,'stroke-linecap':'round'},g);
      make('circle',{cx:.5,cy:-14,r:1.8,fill:k%4?'#a69b85':'#796d59'},g);
    }
    // Explicit footpath zones keep people outside the building footprint.
    for(let k=0;k<84;k++){
      let x,y;
      if(k<36){x=210+random()*430;y=520+(x-210)*.48+random()*85;}
      else if(k<61){x=430+random()*400;y=726+random()*98;}
      else{x=934+random()*100;y=455+random()*115;}
      person(x,y,.48+random()*.3,k);
    }
    return {ground,solids,ink,streetLife,people,blockCount};
  }
  function paint(city,t){
    city.ground.setAttribute('opacity',(.1+.9*ease((t-6.2)/1.9)).toFixed(4));
    city.ink.setAttribute('opacity',(.28*(1-ease((t-7.2)/1.2))).toFixed(4));
    for(const path of city.ink.children)path.setAttribute('stroke-dashoffset',(1-ease((t-.7)/5.4)).toFixed(4));
    city.solids.setAttribute('opacity',ease((t-6.8)/1.5).toFixed(4));
    city.streetLife.setAttribute('opacity',ease((t-8.5)/1.2).toFixed(4));
    city.people.setAttribute('opacity',ease((t-8.9)/1.1).toFixed(4));
  }
  window.IKEA_CITY_SCENE={mount,paint};
})();
