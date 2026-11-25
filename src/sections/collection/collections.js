const stage=document.querySelector('#stage'), overlay=document.querySelector('#overlay'), frames=[...stage.children];const find=(el,name)=>el.querySelector('[data-name="'+name+'"]');let current=0,detail=false,pos=0,gate=false,last=0,lock=0,raf=0;const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;const width=()=>current===2?8413:7084;const fixed=[];for(const name of ['틀','line','nav','top_right']){let source=name==='line'?find(find(frames[0],'bot_bar'),'line'):find(frames[0],name);if(!source)continue;let shared=source.cloneNode(true);if(name==='틀'){shared=document.createElement('div');for(const grid of frames[0].querySelectorAll('[data-name="틀"]'))shared.append(grid.cloneNode(true))}overlay.append(shared);fixed.push(shared);for(const f of frames){if(name==='line'){find(find(f,'bot_bar')||document.createElement('div'),'line')?.remove()}else if(name!=='top_right'){f.querySelectorAll('[data-name="'+name+'"]').forEach(x=>x.remove())}}}const gridLayer=document.createElement("div");
gridLayer.id="grid-layer";
gridLayer.setAttribute("aria-hidden","true");
stage.before(gridLayer);
gridLayer.append(fixed[0]);
const badge=find(overlay,'top_right');function move(){const sx=innerWidth/1920,sy=innerHeight/(detail?1080:990);
  // Keep glyphs uniformly scaled inside the responsive design canvas.
  const fontScale = Math.min(sx, sy);
  stage.style.setProperty("--photo-scale-x", fontScale / sx);
  stage.style.setProperty("--photo-scale-y", fontScale / sy);
  document.documentElement.style.setProperty("--text-scale-x", fontScale / sx);
  document.documentElement.style.setProperty("--text-scale-y", fontScale / sy);
  stage.style.width=(detail?width():1920)+'px';stage.style.height=overlay.style.height=(detail?1080:990)+'px';stage.style.transform='scale('+sx+','+sy+') translateX('+(-pos)+'px)';overlay.style.transform='scale('+sx+','+sy+')';gridLayer.style.transform=overlay.style.transform;
  const nav = find(overlay, "nav");
  const parentScaleY = innerHeight / 990;
  const navFontScale = Math.min(sx, parentScaleY);
  nav.style.transformOrigin = "top left";
  nav.style.transform = "scaleY(" + parentScaleY / sy + ")";
  nav.style.setProperty("--text-scale-x", navFontScale / sx);
  nav.style.setProperty("--text-scale-y", navFontScale / parentScaleY);
  let covered=detail?Math.max(0,pos+1920-(width()-617)):0;document.body.classList.toggle('ending',covered>0);overlay.style.setProperty('--covered',covered+'px');badge.style.visibility=detail&&pos>500?'hidden':'visible'}const entrySpeed = 0.6;
let detailEffects = [];
let leavingDetail = false;
function enterEffect(el, keyframes, duration, easing) {
  if (!el || reduced) return;
  const effect = el.animate(keyframes, {duration: duration / entrySpeed, easing, fill: detail ? "both" : "none"});
  if (detail) detailEffects.push(effect);
}
function animate(el, from) {
  enterEffect(el, [{transform: from}, {transform: "none"}], 650, "cubic-bezier(.2,.8,.2,1)");
}
async function leaveDetail(n) {
  if (leavingDetail) return;
  leavingDetail = true;
  cancelAnimationFrame(raf);
  previousTick = 0;
  if (pos && !reduced) {
    const start = pos, time = performance.now();
    await new Promise(resolve => {
      function rewind(now) {
        const t = Math.min(1, (now - time) / 520);
        pos = start * (1 - t * t * (3 - 2 * t));
        move();
        if (t < 1) requestAnimationFrame(rewind); else resolve();
      }
      requestAnimationFrame(rewind);
    });
  }
  for (const effect of detailEffects) effect.reverse();
  await Promise.allSettled(detailEffects.map(effect => effect.finished));
  for (const effect of detailEffects) effect.cancel();
  detailEffects = [];
  leavingDetail = false;
  displayFrame(n, false);
}
function show(n, d) {
  if (leavingDetail) return;
  if (detail && !d) { void leaveDetail(n); return; }
  if (detail && d && n === current) return;
  displayFrame(n, d);
}let scrollTarget = 0, previousTick = 0, wheelDistance = 0;
function displayFrame(n,d,opening=false){stopOpeningCards();scrollTarget = 0; previousTick = 0; wheelDistance = 0;const previousFrame = detail ? null : frames[current];cancelAnimationFrame(raf);current=(n+5)%5;detail=d;pos=0;gate=false;frames.forEach((f,i)=>f.hidden=i!==current+(d?5:0));let f=frames[current+(d?5:0)];const titleRow = !d && find(f, "name");
  if (titleRow) {
    if (!titleRow.dataset.loop) {
      const titles = [...titleRow.children];
      const copy = item => {
        const clone = item.cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        return clone;
      };
      titleRow.prepend(...titles.map(copy));
      titleRow.append(...titles.map(copy));
      titleRow.dataset.loop = "true";
    }
    const midpoint = item => item.offsetLeft + item.offsetWidth / 2;
    const selected = midpoint(titleRow.children[7]);
    titleRow.style.translate = "none";
    titleRow.style.left = "calc(50% - " + selected + "px)";
    titleRow.getAnimations().forEach(animation => animation.cancel());
    if (previousFrame && previousFrame !== f && !reduced) {
      const previous = frames.indexOf(previousFrame);
      const steps = ((current - previous + 7) % 5) - 2;
      const origin = midpoint(titleRow.children[7 - steps]);
      titleRow.animate([
        { transform: "translateX(" + (selected - origin) + "px)" },
        { transform: "translateX(0)" }
      ], { duration: 450 / entrySpeed, easing: "cubic-bezier(.22,.75,.25,1)" });
    }
  }badge.innerHTML=find(frames[current],'top_right').innerHTML;for(const el of fixed.slice(0,2))el.style.visibility=d?'hidden':'';for(const el of [...badge.querySelectorAll('p'),...f.querySelectorAll('[data-name=top_left] p,[data-name=bot-right] p')]){if(!el.firstElementChild){let span=document.createElement('span');span.textContent=el.textContent.trim();el.replaceChildren(span)}el.classList.add('cliprow');if(!opening) animate(el.firstElementChild,el.closest('[data-name=bot-right]')?'translateY(-100%)':'translateY(100%)')}for(const name of ['left','right','center']){let child=find(f,name);if(child&&!child.closest('.photo-plane')){let mask=document.createElement('div'),plane=document.createElement('div');mask.className='photo-mask';plane.className='photo-plane';child.before(mask);mask.append(plane);plane.append(child)}
      if (!child) continue;
      const plane = child.closest(".photo-plane");
      const mask = plane.parentElement;
      mask.dataset.card = name;
      mask.querySelector(".previous-photo")?.remove();
      plane.getAnimations().forEach(animation => animation.cancel());
      const previous = previousFrame && find(previousFrame, name)?.closest(".photo-plane");
      if (previous && previous !== plane && !reduced) {
        const behind = previous.cloneNode(true);
        behind.classList.add("previous-photo");
        behind.inert = true;
        behind.setAttribute("aria-hidden", "true");
        plane.before(behind);
        const angle = name === "left" ? -15 : name === "right" ? 15 : 0;
        const localX = name === "left" ? 296 : name === "right" ? -296 : 0;
        const localY = name === "center" ? -538 : 0;
        const radians = angle * Math.PI / 180;
        const dx = localX * Math.cos(radians) - localY * Math.sin(radians);
        const dy = localX * Math.sin(radians) + localY * Math.cos(radians);
        const entry = plane.animate([
          { transform: "translate(" + dx + "px," + dy + "px)" },
          { transform: "translate(0,0)" }
        ], { duration: 650 / entrySpeed, easing: "cubic-bezier(.2,.8,.2,1)" });
        entry.onfinish = entry.oncancel = () => behind.remove();
      }}let thumb=find(f,'thumbnail');if(thumb && !reduced){thumb.classList.add('detail-wipe');enterEffect(thumb,[{'--angle':'0deg'},{'--angle':'360deg'}],850,'ease');}if(thumb)thumb.style.zIndex=2;animate(find(f,'title'),'translateX(-420px)');move()}for(const f of frames){for(const n of ['top_right','top-right']){let el=find(f,n);if(el)el.hidden=true;if(el)el.style.display='none'}let center=find(f,'center');if(center){let target=center.lastElementChild;target.setAttribute('role','button');target.tabIndex=0;target.setAttribute('aria-label','컬렉션 자세히 보기');target.onclick=()=>show(current,true)}let go=find(f,'go');if(go){go.setAttribute('role','button');go.tabIndex=0;go.onclick=()=>window.open('https://www.ikea.com/kr/ko/','_blank','noopener')}}function easeScroll(time) {
  const elapsed = previousTick ? Math.min(time - previousTick, 64) : 16;
  previousTick = time;
  pos += (scrollTarget - pos) * (1 - Math.exp(-elapsed / 95));
  if (Math.abs(scrollTarget - pos) < 0.5) {
    pos = scrollTarget;
    previousTick = 0;
    gate = pos === width() - 617 - 1920;
  }
  move();
  if (previousTick) raf = requestAnimationFrame(easeScroll);
}
function step(delta, fresh) {
  if (!delta || leavingDetail) return;
  if (!detail) {
    if (fresh || Math.sign(delta) !== Math.sign(wheelDistance)) wheelDistance = 0;
    wheelDistance += delta;
    if (Math.abs(wheelDistance) >= 30 && performance.now() >= lock) {
      show(current + Math.sign(delta), false);
      lock = performance.now() + 450 / entrySpeed;
    }
    return;
  }
  const end = width() - 1920;
  const stop = end - 617;
  if (gate && delta > 0 && !fresh) return;
  if (gate && fresh && delta > 0) scrollTarget = end;
  else {
    const limit = scrollTarget > stop ? end : stop;
    scrollTarget = Math.max(0, Math.min(limit, scrollTarget + delta));
  }
  gate = false;
  if (reduced) {
    pos = scrollTarget;
    gate = pos === stop;
    move();
  } else if (!previousTick) {
    previousTick = performance.now();
    raf = requestAnimationFrame(easeScroll);
  }
}
window.addEventListener("wheel", event => {
  if (event.ctrlKey) return;
  event.preventDefault();
  const now = performance.now();
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  const units = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerWidth : 1;
  step(delta * units * 1920 / innerWidth, !last || now - last > 130);
  last = now;
}, { passive: false });let x;onpointerdown=e=>x=e.clientX;onpointerup=e=>{if(Math.abs(x-e.clientX)>32)step((x-e.clientX)*1920/innerWidth,true)};onkeydown=e=>{if(e.key==='Escape')show(current,false);if(e.key==='Enter'){if(document.activeElement.matches('[role=button]'))document.activeElement.click();else show(current,true)}if(['ArrowLeft','ArrowRight'].includes(e.key))step(e.key==='ArrowRight'?420:-420,true)};overlay.onclick=e=>{let p=e.target.closest('p');if(p){let n=['alptall','xbox','ps','christmas','konstrunda'].findIndex(k=>p.textContent.toLowerCase().includes(k));show(n<0?3:n,false)}else show(current,false)};stage.addEventListener('click',e=>{if(!detail&&e.target.closest('[data-name=name]')){let label=e.target.textContent.toLowerCase(),n=['ps','xbox','konstrunda','alptall','christmas'].findIndex(k=>label.includes(k));if(n>=0)show(n,n===current)}});// Apply the uniform image scale to the crop box, keeping its focal crop intact.
for (const frame of frames.slice(5)) {
  for (const image of frame.querySelectorAll('img[src$=".png"]')) {
    image.closest("[data-node-id]").classList.add("detail-image-slot");
  }
}
const openingEffects = new Set();
function stopOpeningCards() {
  for (const effect of openingEffects) effect.cancel();
  openingEffects.clear();
}
function playOpeningCards() {
  if (reduced) return;
  const openingDelay = 500;
  const sideCardStart = openingDelay + 900;
  const timing = { duration: 1000, delay: sideCardStart, easing: "cubic-bezier(.22,.75,.25,1)", fill: "backwards" };
  function reveal(element, keys, cleanup) {
    const effect = element.animate(keys, timing);
    openingEffects.add(effect);
    effect.onfinish = effect.oncancel = () => {
      openingEffects.delete(effect);
      if (cleanup) cleanup();
    };
  }
  for (const group of [find(frames[0], "top_left"), badge]) {
    const clip = document.createElement("div");
    clip.className = "opening-caption-clip";
    const copy = document.createElement("div");
    copy.className = "opening-caption-copy";
    copy.append(...group.children);
    clip.append(copy);
    group.append(clip);
    reveal(copy, [{ transform: "translateY(54px)" }, { transform: "translateY(0)" }], () => {
      if (clip.parentNode === group) clip.replaceWith(...copy.children);
    });
  }
  // Both rules belong to the original SVG. Keep its lower edge stationary.
  const rules = find(overlay, "line").querySelector("img");
  const risingRule = document.createElement("i");
  risingRule.className = "opening-rising-rule";
  rules.parentNode.append(risingRule);
  rules.style.clipPath = "inset(50% 0 0)";
  reveal(risingRule, [{ transform: "translateY(71.924px)" }, { transform: "translateY(0)" }], () => {
    rules.style.clipPath = "";
    risingRule.remove();
  });
  const titles = find(frames[0], "name");
  const band = document.createElement("div");
  band.className = "opening-name-band";
  titles.before(band);
  band.append(titles);
  reveal(band, [
    { clipPath: "inset(911px 0 0)" },
    { clipPath: "inset(839px 0 0)" }
  ], () => band.replaceWith(titles));
  const masks = frames[0].querySelectorAll(".photo-mask");
  for (const mask of masks) {
    const card = mask.dataset.card;
    const center = card === "center";
    const keyframes = center
      ? [
          { clipPath: "polygon(50% 0,50% 0,50% 100%,50% 100%)" },
          { clipPath: getComputedStyle(mask).clipPath }
        ]
      : [
          { transform: "translateX(" + (card === "left" ? 274 : -274) + "px)", opacity: 0 },
          { opacity: 1, offset: 0.12 },
          { transform: "translateX(0)", opacity: 1 }
        ];
    const effect = mask.animate(keyframes, {
      duration: center ? 900 : 820,
      delay: center ? openingDelay : sideCardStart,
      easing: "cubic-bezier(.22,.75,.25,1)",
      fill: "backwards"
    });
    openingEffects.add(effect);
    effect.onfinish = () => openingEffects.delete(effect);
  }
}
onresize = move;
displayFrame(0, false, true);
playOpeningCards();

// 나가기 아이콘: 상세 전시에서는 컬렉션 목록으로, 목록에서는 메인으로 돌아갑니다.
const exitIcons = '[data-name="iconamoon:exit-thin"]';
for (const icon of document.querySelectorAll(exitIcons)) {
  icon.setAttribute("role", "button");
  icon.tabIndex = 0;
  icon.setAttribute("aria-label", "나가기");
  icon.style.cursor = "pointer";
}
function exitToMain() {
  location.href = "../../../index.html?room=ikea-ps";
}
addEventListener("click", e => {
  if (!e.target.closest(exitIcons)) return;
  e.preventDefault();
  e.stopPropagation();
  if (detail) show(current, false);
  else exitToMain();
}, true);
const photoCursor = document.getElementById("photo-cursor");
function hidePhotoCursor() {
  photoCursor.hidden = true;
  document.body.classList.remove("photo-hover");
}
function updatePhotoCursor(event) {
  if (event.pointerType !== "mouse" || detail || !event.target.closest(".photo-mask")) {
    hidePhotoCursor();
    return;
  }
  photoCursor.style.left = event.clientX + "px";
  photoCursor.style.top = event.clientY + "px";
  photoCursor.hidden = false;
  document.body.classList.add("photo-hover");
}
document.addEventListener("pointermove", updatePhotoCursor);
document.addEventListener("pointerout", event => { if (!event.relatedTarget) hidePhotoCursor(); });
window.addEventListener("blur", hidePhotoCursor);
stage.addEventListener("click", event => {
  if (!detail && event.target.closest(".photo-mask")) show(current, true);
  hidePhotoCursor();
});
