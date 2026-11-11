// Portfolio concept plans derived from the supplied building's terraces,
// external staircases, open retail floors, upper rooms and rooftop garden.
// Each floor is independently designed; these are not surveyed building plans.
(() => {
  'use strict';
  const plans={},meta=[];
  function floor(key,name){
    const paths=[];plans[key]=paths;meta.push({key,name});
    const add=(c,w='detail')=>paths.push({c,w});
    const line=(pts,w='detail',closed=false)=>add(pts.map(([x,y],i)=>[i?'L':'M',x,y]).concat(closed?[['Z']]:[]),w);
    const rect=(x,y,w,h,type='detail')=>line([[x,y],[x+w,y],[x+w,y+h],[x,y+h]],type,true);
    const circle=(x,y,r,type='detail')=>{
      const k=r*.5522848;
      add([['M',x+r,y],['C',x+r,y+k,x+k,y+r,x,y+r],['C',x-k,y+r,x-r,y+k,x-r,y],['C',x-r,y-k,x-k,y-r,x,y-r],['C',x+k,y-r,x+r,y-k,x+r,y]],type);
    };
    const door=(x,y,r,flip=false)=>{const s=flip?-1:1;line([[x,y],[x+s*r,y]],'detail');add([['M',x,y+r],['C',x+s*r*.55,y+r,x+s*r,y+r*.55,x+s*r,y]]);};
    const wall=pts=>line(pts,'wall');
    const room=(x,y,w,h,opening=.035)=>{wall([[x,y+h],[x,y],[x+w,y],[x+w,y+h],[x+opening,y+h]]);door(x,y+h,opening);};
    const stairs=(x,y,w,h)=>{rect(x,y,w,h,'wall');line([[x+w*.5,y],[x+w*.5,y+h]]);for(let j=1;j<11;j++)line([[x,y+j*h/11],[x+w,y+j*h/11]]);line([[x+w*.25,y+h*.85],[x+w*.25,y+h*.15],[x+w*.12,y+h*.28]]);};
    const sofa=(x,y,w,h)=>{rect(x,y,w,h);rect(x+.005,y+.005,w-.01,h*.28);line([[x+w*.33,y+h*.3],[x+w*.33,y+h],[x+w*.67,y+h],[x+w*.67,y+h*.3]]);};
    const table=(x,y,w,h,seats=true)=>{rect(x,y,w,h);if(seats){for(const u of [.2,.7]){rect(x+w*u,y-.012,w*.15,.009);rect(x+w*u,y+h+.003,w*.15,.009);}}};
    const bed=(x,y,w,h)=>{rect(x,y,w,h);rect(x+.004,y+.004,w-.008,h*.2);line([[x,y+h*.72],[x+w,y+h*.72]]);};
    const plant=(x,y,r=.017)=>{const start=paths.length;circle(x,y,r);circle(x-r*.3,y-r*.15,r*.46);circle(x+r*.22,y+r*.23,r*.46);paths.slice(start).forEach(p=>p.kind='landscape');};
    // Shared circulation is aligned between levels; the occupied interiors vary.
    const core=()=>{rect(.463,.405,.118,.172,'wall');stairs(.482,.425,.035,.13);stairs(.532,.425,.035,.13);stairs(.032,.35,.045,.16);rect(.895,.44,.047,.065,'wall');line([[.901,.447],[.936,.499]]);line([[.936,.447],[.901,.499]]);};
    const perimeter=(terraces=[])=>{
      const start=paths.length;
      wall([[.08,.06],[.88,.06],[.88,.94],[.08,.94],[.08,.78],[.03,.78],[.03,.64],[.08,.64],[.08,.28],[.03,.28],[.03,.14],[.08,.14],[.08,.06]]);
      terraces.forEach(([x,y,w,h])=>{rect(x,y,w,h,'wall');plant(x+w*.5,y+h*.5,Math.min(w,h)*.27);});
      // Narrow window bays instead of an enclosing facade grid.
      for(let i=0;i<10;i++){const u=.1+i*.076;line([[u,.066],[u+.048,.066]]);line([[u,.934],[u+.048,.934]]);}
      paths.slice(start).forEach(p=>p.kind=p.kind||'perimeter');
    };
    return {paths,line,rect,circle,wall,room,door,stairs,sofa,table,bed,plant,core,perimeter};
  }
  {
    const p=floor('floor-1','입구 · 갤러리');p.perimeter([[.88,.14,.065,.12],[.22,.94,.18,.045],[.88,.72,.065,.13]]);p.core();
    // A generous double-height entrance, curved information desk and cafe.
    p.wall([[.08,.15],[.31,.15],[.31,.29],[.22,.29]]);p.room(.105,.085,.18,.095);p.room(.105,.67,.21,.22);
    p.wall([[.64,.06],[.64,.23],[.88,.23]]);p.table(.685,.09,.12,.055);p.table(.685,.17,.12,.035);
    p.paths.push({w:'wall',c:[['M',.32,.65],['C',.34,.54,.42,.55,.43,.61],['C',.43,.67,.35,.71,.32,.65]]});
    p.rect(.34,.59,.065,.038);p.sofa(.64,.69,.15,.04);p.sofa(.64,.81,.15,.04);p.table(.68,.755,.065,.03,false);
    for(const [x,y] of [[.17,.36],[.28,.43],[.17,.53],[.71,.37]])p.rect(x,y,.065,.045);
    for(const x of [.43,.51,.59])p.rect(x,.86,.043,.025);
    for(const [x,y] of [[.1,.31],[.84,.29],[.83,.88],[.12,.6]])p.plant(x,y);
  }
  {
    const p=floor('floor-2','거실 · 쇼룸');p.perimeter([[.88,.29,.07,.17],[.08,.94,.15,.04],[.66,.94,.17,.045]]);p.core();
    // Offset showroom suites, with gaps creating a serpentine route.
    p.room(.105,.09,.22,.21);p.room(.365,.09,.23,.21);p.room(.645,.09,.21,.21);
    p.room(.105,.37,.225,.20);p.room(.105,.65,.225,.25);p.room(.64,.37,.22,.22);p.room(.64,.67,.22,.23);
    [[.13,.13],[.395,.13],[.68,.13],[.135,.41],[.135,.7],[.68,.42],[.68,.72]].forEach(([x,y])=>{p.sofa(x,y,.12,.035);p.table(x+.025,y+.065,.065,.035,false);p.rect(x+.015,y+.05,.09,.07);});
    p.wall([[.38,.68],[.58,.68],[.58,.9]]);p.sofa(.4,.75,.12,.035);p.table(.43,.82,.06,.03,false);
    p.plant(.57,.35);p.plant(.36,.61);p.plant(.83,.61);
  }
  {
    const p=floor('floor-3','주방 · 수납');p.perimeter([[.3,.94,.23,.045],[.88,.58,.07,.18],[.55,.015,.18,.045]]);p.core();
    p.room(.105,.09,.26,.24);p.room(.405,.09,.23,.24);p.room(.68,.09,.18,.24);
    for(const [x,y,w] of [[.13,.12,.2],[.43,.12,.17],[.7,.12,.13]]){p.rect(x,y,w,.035);p.rect(x,y,.035,.14);p.table(x+.06,y+.09,w*.55,.04,false);}
    // Long storage racks create a very different cadence from the showroom rooms.
    for(let i=0;i<4;i++){
      const x=.12+i*.058;p.rect(x,.4,.028,.20);for(let j=1;j<7;j++)p.line([[x,.4+j*.2/7],[x+.028,.4+j*.2/7]]);
    }
    for(let i=0;i<5;i++)p.rect(.635+i*.043,.39,.024,.235);
    p.wall([[.08,.68],[.38,.68],[.38,.94]]);for(let i=0;i<4;i++)p.table(.12+i*.055,.74,.035,.11,false);
    p.wall([[.45,.67],[.86,.67]]);p.rect(.48,.72,.14,.11);p.rect(.7,.72,.11,.11);
  }
  {
    const p=floor('floor-4','레스토랑 · 라운지');p.perimeter([[.88,.17,.07,.22],[.44,.94,.24,.045],[.015,.58,.065,.12]]);p.core();
    // Kitchen and serving counter to the north; open dining terraces to the south.
    p.room(.105,.085,.36,.21);p.wall([[.5,.06],[.5,.27],[.86,.27]]);
    for(let i=0;i<5;i++){p.rect(.12+i*.06,.1,.042,.045);p.rect(.12+i*.06,.2,.042,.04);}
    p.rect(.57,.11,.25,.05);p.rect(.6,.21,.21,.035);
    for(const [x,y] of [[.16,.4],[.3,.43],[.18,.59],[.32,.66],[.15,.81],[.44,.82],[.61,.8],[.77,.81],[.72,.46],[.74,.63]]){
      p.circle(x,y,.028);for(const [dx,dy] of [[-.04,0],[.04,0],[0,-.04],[0,.04]])p.circle(x+dx,y+dy,.009);
    }
    p.sofa(.4,.34,.18,.03);p.sofa(.12,.9,.19,.025);p.plant(.84,.71);p.plant(.62,.63);
  }
  {
    const p=floor('floor-5','스튜디오 · 공유 공간');p.perimeter([[.08,.015,.19,.045],[.88,.66,.07,.22],[.46,.94,.17,.045]]);p.core();
    // Large studios, meeting pods and an open shared living zone.
    p.room(.105,.09,.3,.23);p.room(.46,.09,.4,.23);p.room(.105,.37,.225,.25);
    p.table(.15,.15,.2,.07);p.table(.51,.15,.28,.07);p.circle(.21,.47,.058);p.circle(.21,.47,.031);
    p.room(.65,.37,.21,.21);p.table(.69,.43,.13,.06);
    p.wall([[.08,.7],[.42,.7],[.42,.94]]);p.rect(.13,.75,.22,.025);p.rect(.13,.82,.22,.025);
    p.sofa(.52,.7,.18,.04);p.sofa(.74,.75,.04,.14);p.circle(.65,.81,.04);p.rect(.55,.87,.22,.025);
    p.plant(.4,.36);p.plant(.63,.64);p.plant(.84,.91);
  }
  {
    const p=floor('floor-6','객실 · 중정');p.perimeter([[.26,.015,.15,.045],[.88,.1,.07,.16],[.1,.94,.18,.045],[.72,.94,.16,.045]]);p.core();
    // Private rooms surrounding a continuous, offset central corridor.
    for(let i=0;i<5;i++){
      const x=.105+i*.151;p.room(x,.09,.13,.195);p.bed(x+.018,.115,.052,.10);p.rect(x+.084,.11,.025,.065);
      p.room(x,.725,.13,.18);p.bed(x+.018,.75,.052,.1);p.rect(x+.084,.75,.025,.065);
    }
    p.wall([[.1,.325],[.37,.325],[.37,.66],[.1,.66]]);p.wall([[.64,.325],[.85,.325],[.85,.66],[.64,.66]]);
    for(const y of [.355,.51]){p.room(.105,y,.22,.125);p.bed(.13,y+.02,.055,.08);p.room(.67,y,.18,.125);p.bed(.69,y+.02,.055,.08);}
    p.plant(.4,.64,.025);p.plant(.61,.34,.025);p.sofa(.41,.665,.17,.027);
  }
  {
    const p=floor('roof','옥상 · 정원');p.perimeter([[.88,.1,.07,.18],[.88,.65,.07,.19],[.13,.94,.2,.045]]);p.core();
    // Pergolas, lifted planting beds, pavilion and open roof paths.
    p.room(.105,.085,.4,.15);p.rect(.13,.11,.19,.06);p.rect(.35,.11,.12,.06);
    for(let i=0;i<10;i++)p.line([[.12+i*.035,.09],[.12+i*.035,.22]]);
    p.room(.66,.09,.2,.2);p.table(.69,.14,.12,.07,false);
    for(const [x,y,w,h] of [[.12,.34,.17,.12],[.12,.58,.2,.1],[.34,.76,.16,.12],[.68,.38,.16,.12],[.67,.68,.17,.12]]){
      p.rect(x,y,w,h,'wall');p.plant(x+w*.32,y+h*.5,.025);p.plant(x+w*.7,y+h*.5,.022);
    }
    for(const [x,y] of [[.4,.34],[.38,.62],[.6,.67],[.57,.86],[.78,.86]]){p.circle(x,y,.023);p.rect(x-.032,y+.03,.064,.012);}
    p.wall([[.55,.29],[.6,.29],[.6,.38]]);p.line([[.33,.27],[.33,.71],[.6,.71],[.6,.9]]);
  }
  window.IKEA_CONCEPT_PLANS=plans;
  window.IKEA_CONCEPT_FLOORS=meta;
})();
