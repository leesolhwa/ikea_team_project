const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'..','index.html'),'utf8');
const script=source.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(script);
const pure=script.split('// ROUTE_GEOMETRY_START')[1].split('// ROUTE_GEOMETRY_END')[0].split('\n').slice(1).join('\n');
const sandbox={};
vm.runInNewContext(pure+'\nthis.geometry=buildRoute(routeKnots);this.sample=sampleRoute;this.distance=distanceAtT;this.damp=damp;',sandbox);
const g=sandbox.geometry;
assert.equal(g.stops.length,9);
for(let i=1;i<g.curves.length;i++){
 const left=g.curves[i-1],right=g.curves[i];
 assert.equal(left.b.x,right.a.x);assert.equal(left.b.y,right.a.y);
 assert.ok(Math.abs((left.b.x-left.c2.x)-(right.c1.x-right.a.x))<1e-9,'x tangent continuity');
 assert.ok(Math.abs((left.b.y-left.c2.y)-(right.c1.y-right.a.y))<1e-9,'y tangent continuity');
}
for(let i=1;i<g.samples.length;i++)assert.ok(g.samples[i].d>g.samples[i-1].d,'arc lookup monotonic');
for(let i=1;i<9;i++){
 const before=sandbox.distance(i-1e-7,g.stops),after=sandbox.distance(i+1e-7,g.stops);
 assert.ok(Math.abs(after-before)<1e-5,'no position jump at chapter boundary');
 const p=sandbox.sample(g,g.stops[i]);
 const knot=g.points.find(k=>k.chapter===i);
 assert.ok(Math.hypot(p.x-knot.x,p.y-knot.y)<1e-7,'chapter stops align with curve');
}
function settle(hz){let x=0;for(let i=0;i<hz;i++)x=sandbox.damp(x,1,1/hz,.14);return x;}
assert.ok(Math.abs(settle(60)-settle(120))<1e-12,'refresh-rate independent damping');
let position=0,previous=0;
for(let i=0;i<180;i++){
 const target=i<90?8.6:0;
 position=sandbox.damp(position,target,1/60,.14);
 assert.ok(position>=0&&position<=8.6,'no spring overshoot');
 if(i<90)assert.ok(position>=previous);else assert.ok(position<=previous);
 previous=position;
}
const frame=script.split('function tick(now)')[1].split('function request()')[0];
assert.ok(!/getTotalLength|getPointAtLength|getBoundingClientRect|offsetTop|offsetHeight|querySelector/.test(frame),'no layout reads or DOM searches in animation frame');
assert.equal((script.match(/function tick\(/g)||[]).length,1);
console.log('PASS: JavaScript syntax');
console.log('PASS: '+g.curves.length+' C1-continuous curve joins; 9 exact chapter stops');
console.log('PASS: continuous forward/reverse motion; no position jumps or overshoot');
console.log('PASS: identical 60 Hz / 120 Hz damping');
console.log('PASS: cached geometry / DOM / layout; single animation loop');
const timelineSource=script.split('// SCENE_TIMELINE_START')[1].split('// SCENE_TIMELINE_END')[0];
const clock={};
vm.runInNewContext(timelineSource+'\nthis.holds=holdDurations;this.total=timelineDuration;this.toTime=timeFromUnit;this.toUnit=unitFromTime;this.slide=stickyPosition;',clock);
assert.equal(clock.holds.length,9);
assert.equal(clock.holds[3]/clock.holds[0],5,'chapter 04 has five times the single-section hold');
let prevTime=-1;
for(let t=0;t<8.42;t+=.001){const seconds=clock.toTime(t);assert.ok(seconds>prevTime,'variable timeline remains monotonic');assert.ok(Math.abs(clock.toUnit(seconds)-t)<1e-9,'forward/backward timeline inverse');prevTime=seconds;}
assert.equal(clock.slide(.1),0);assert.equal(clock.slide(.48),1);assert.equal(clock.slide(.88),2);
for(let i=0;i<=1000;i++){const t=i/1000,p=clock.slide(t);assert.ok(p>=0&&p<=2);if(i)assert.ok(p>=clock.slide(t-.001)-1e-8);}
assert.ok(source.includes('https://www.ikea.com/kr/ko/cat/poaeng-series-07472/'));
assert.ok(source.includes('https://www.ikea.com/kr/ko/p/billy-bookcase-white-00522047/'));
assert.ok(source.includes('https://www.ikea.com/kr/ko/p/kallax-shelving-unit-white-60409939/'));
assert.ok(source.includes('footer-wordmark'));
console.log('PASS: variable chapter durations; three ordered sticky scenes before chapter 05');
console.log('PASS: three official product destinations and oversized IKEA footer');
