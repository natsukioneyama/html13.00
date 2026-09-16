/* HTML13.00 Phase 1. JL engine and box placement retained from HTML12.02.
 * One ordered data sequence; one current modal node; no large-image preload pool.
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const grid = $('grid'), modal = $('modal'), stage = $('stage'), info = $('info');
  const sequence = window.PORTFOLIO_PROJECTS.flatMap(project => project.media.map(media => ({project, media})));
  const fine = () => matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  let selected = -1, current = -1, active = null, returnFocus, scrollY = 0;
  let wheelSum = 0, wheelLast = 0, wheelCooldown = 0, gesture = null;
  const videos = new Set(), visibleVideos = new Set();
  // Two-node slide transition state: `liveNode` is the settled, currently-visible media
  // element (the one drag/keyboard/wheel act on); `transitioning` locks out new navigation
  // input for the duration of a committed slide so inputs never overlap animations.
  let liveNode = null, transitioning = false, activeAnimations = [];
  const SLIDE_MS = 280, SLIDE_EASING = 'ease-out';
  // Neighbor preloading: warms the browser's network+decode cache for the media one step
  // ahead/behind the current index (wrapping across the 51-item sequence), so by the time
  // the user actually navigates there the image is already fetched/decoded. Never awaited
  // by navigation itself, so it can never slow down the response to input.
  const preloadedSrcs = new Set();
  function preloadMedia(index) {
    const m = sequence[index]?.media;
    if (!m || m.type === 'video' || preloadedSrcs.has(m.full)) return;
    preloadedSrcs.add(m.full);
    const img = new Image();
    img.src = m.full;
    img.decode?.().catch(() => {});
  }
  function preloadNeighbors(index) {
    const n = sequence.length;
    preloadMedia((index + 1) % n);
    preloadMedia((index - 1 + n) % n);
  }

  function caption(target, index) {
    target.replaceChildren();
    if (index < 0) return;
    const p = sequence[index].project;
    [p.title, p.line1, p.line2].filter(Boolean).forEach(text => {
      const line = document.createElement('span'); line.textContent = text; target.append(line);
    });
  }
  function syncVideos() {
    videos.forEach(v => {
      if (!active && !document.hidden && visibleVideos.has(v)) v.play().catch(() => {});
      else v.pause();
    });
    if (document.hidden) stage.querySelector('video')?.pause();
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => e.isIntersecting ? visibleVideos.add(e.target) : visibleVideos.delete(e.target));
    syncVideos();
  });
  const buttons = sequence.map(({project, media: m}, index) => {
    const button = document.createElement('button'); button.className = 'jl-item';
    button.type = 'button'; button.setAttribute('aria-label', `${project.title}, image ${index + 1}: open media`);
    button.dataset.w = m.dataW; button.dataset.h = m.dataH;
    const node = document.createElement(m.type === 'video' ? 'video' : 'img');
    if (m.type === 'video') {
      node.muted = true; node.loop = true; node.playsInline = true; node.preload = 'metadata';
      node.src = m.src; videos.add(node); observer.observe(node);
    } else {
      node.src = m.thumb; node.alt = m.alt || project.title;
      node.width = m.width; node.height = m.height; node.loading = 'lazy'; node.decoding = 'async';
    }
    node.draggable = false; button.append(node); grid.append(button);
    button.addEventListener('mouseenter', () => { if (fine()) caption($('overview-caption'), index); });
    button.addEventListener('mouseleave', () => { if (fine()) caption($('overview-caption'), selected); });
    button.addEventListener('focus', () => caption($('overview-caption'), index));
    button.addEventListener('click', e => {
      if (fine() || e.detail === 0 || selected === index) openModal(index, e.detail === 0);
      else {
        buttons[selected]?.classList.remove('selected'); selected = index;
        button.classList.add('selected'); caption($('overview-caption'), index);
      }
    });
    return button;
  });

  // Same aspect-ratio -> justifiedLayout -> absolute box placement as HTML12.02.
  function render() {
    const w = innerWidth;
    const layout = window.justifiedLayout(sequence.map(({media:m}) => ({aspectRatio:m.dataW / m.dataH})), {
      containerWidth: grid.clientWidth,
      targetRowHeight: w <= 767 ? Math.min(240, grid.clientWidth / 2) : 210,
      boxSpacing: 12
    });
    grid.style.height = layout.containerHeight + 'px';
    layout.boxes.forEach((box, i) => Object.assign(buttons[i].style, {
      position:'absolute', left:box.left+'px', top:box.top+'px', width:box.width+'px', height:box.height+'px'
    }));
  }
  let resizeTimer;
  addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(render, 150); });
  render();

  function lock(panel) {
    returnFocus = document.activeElement; scrollY = window.scrollY; active = panel;
    Object.assign(document.body.style, {position:'fixed', top:-scrollY+'px', width:'100%'});
    $('overview').inert = true; $('overview-nav').inert = true; $('info-toggle').inert = true;
    panel.hidden = false; syncVideos();
  }
  function releaseVideo(node) {
    if (node && node.tagName === 'VIDEO') { node.pause(); node.removeAttribute('src'); node.load(); }
  }
  function disposeAll() {
    activeAnimations.forEach(a => a.cancel()); activeAnimations = []; transitioning = false;
    [...stage.children].forEach(n => { releaseVideo(n); n.remove(); });
    liveNode = null;
  }
  function close() {
    if (!active) return;
    disposeAll(); active.hidden = true; active = null; current = -1; gesture = null;
    $('overview').inert = false; $('overview-nav').inert = false; $('info-toggle').inert = false;
    $('info-toggle').setAttribute('aria-expanded','false');
    Object.assign(document.body.style, {position:'', top:'', width:''});
    window.scrollTo(0,scrollY); returnFocus?.focus({preventScroll:true}); syncVideos();
  }
  function createNode(index) {
    const {project, media:m} = sequence[index];
    const node = document.createElement(m.type === 'video' ? 'video' : 'img');
    node.className = 'modal-media'; node.draggable = false;
    if (m.type === 'video') {
      node.playsInline = true; node.muted = true; node.controls = true; node.preload = 'auto';
      node.addEventListener('loadedmetadata', () => {
        if (node.isConnected) { node.currentTime = 0; node.play().catch(() => {}); }
      }, {once:true});
      node.src = m.src;
    } else { node.alt = m.alt || project.title; node.src = m.full; node.decoding = 'async'; }
    return node;
  }
  // Initial display (modal/first open): no previous node, so no slide - just place it.
  function settle(index) {
    disposeAll(); current = index;
    const node = createNode(index);
    stage.append(node); liveNode = node;
    caption($('modal-caption'), index);
    preloadNeighbors(index);
  }
  // Committed next/prev transition: outgoing and incoming coexist in `.stage` (both
  // absolutely positioned, see overview.css) and slide simultaneously in the same
  // horizontal direction - outgoing exits the side incoming enters from the opposite
  // side, so they read as one continuous strip rather than a cross-fade. direction:
  // +1 = Next (outgoing exits left, incoming enters from the right), -1 = Previous
  // (mirrored). Pure transform, no opacity, so the movement itself reads as the effect.
  function slide(nextIndex, direction) {
    if (transitioning) return false;
    const outgoing = liveNode;
    const incoming = createNode(nextIndex);
    stage.append(incoming);
    current = nextIndex; liveNode = incoming;
    caption($('modal-caption'), nextIndex);
    preloadNeighbors(nextIndex);
    if (reduced()) { if (outgoing) { releaseVideo(outgoing); outgoing.remove(); } return true; }
    transitioning = true;
    incoming.style.willChange = 'transform';
    if (outgoing) outgoing.style.willChange = 'transform';
    // Continue from wherever a released swipe left the outgoing node (its inline
    // translateX from the drag), rather than resetting to 0 and losing the gesture's motion.
    const fromOut = outgoing ? (outgoing.style.transform || 'translateX(0%)') : null;
    const inAnim = incoming.animate(
      [{transform:`translateX(${direction * 100}%)`}, {transform:'translateX(0%)'}],
      {duration:SLIDE_MS, easing:SLIDE_EASING, fill:'forwards'}
    );
    const outAnim = outgoing ? outgoing.animate(
      [{transform:fromOut}, {transform:`translateX(${-direction * 100}%)`}],
      {duration:SLIDE_MS, easing:SLIDE_EASING, fill:'forwards'}
    ) : null;
    activeAnimations = [inAnim, outAnim].filter(Boolean);
    Promise.all(activeAnimations.map(a => a.finished.catch(() => {}))).then(() => {
      if (outgoing) { releaseVideo(outgoing); outgoing.remove(); }
      incoming.style.willChange = ''; incoming.style.transform = '';
      activeAnimations.forEach(a => a.cancel()); activeAnimations = [];
      transitioning = false;
    });
    return true;
  }
  // Shared next/prev step for keyboard, wheel and swipe: loops across the whole
  // portfolio-data.js sequence (all projects back-to-back), wrapping at the very
  // first/last media item rather than stopping or looping per-project. Locked out
  // entirely while a transition is already playing (see `transitioning`).
  function step(direction) {
    if (transitioning || current < 0) return false;
    let next = current + direction;
    if (next >= sequence.length) next = 0; else if (next < 0) next = sequence.length - 1;
    return slide(next, direction);
  }
  // Safari/WebKit resolves :focus-visible on a script-focused element as true even when
  // the interaction that triggered it was a mouse click on a different element (Chromium/
  // Firefox correctly infer the pointer origin and keep it false). So the visible ring on
  // an initial pointer-triggered open has to be suppressed explicitly, not left to :focus-visible.
  function focusInitial(el, viaKeyboard) {
    el.classList.toggle('no-ring', !viaKeyboard);
    el.focus({preventScroll:true});
  }
  function openModal(index, viaKeyboard = false) {
    lock(modal); wheelSum = 0; wheelLast = 0; wheelCooldown = 0;
    settle(index); focusInitial($('modal-close'), viaKeyboard);
  }
  $('modal-close').addEventListener('click', close);
  $('info-toggle').addEventListener('click', e => {
    lock(info); $('info-toggle').setAttribute('aria-expanded','true');
    focusInitial($('info-close'), e.detail === 0);
  });
  $('info-close').addEventListener('click', close);
  document.addEventListener('visibilitychange', syncVideos);
  document.addEventListener('keydown', e => {
    if (!active) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (active === modal && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      // All four keys drive the same horizontal slide - Up/Left = Previous, Down/Right = Next.
      e.preventDefault();
      if (!e.repeat) { const d = (e.key === 'ArrowDown' || e.key === 'ArrowRight') ? 1 : -1; step(d); }
    }
    if (e.key === 'Tab') {
      const focusable = [...active.querySelectorAll('button, a[href], video[controls]')];
      focusable.forEach(el => el.classList.remove('no-ring'));
      const first = focusable[0], last = focusable.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  modal.addEventListener('wheel', e => {
    e.preventDefault(); const now = performance.now(), idle = now-wheelLast; wheelLast = now;
    // Require both a cooldown and an idle gap: one step per inertial wheel burst.
    if (now < wheelCooldown || (wheelCooldown && idle < 180)) return;
    if (idle > 180) { wheelSum = 0; wheelCooldown = 0; }
    const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1);
    wheelSum += delta;
    if (Math.abs(wheelSum) >= 60) {
      const d = Math.sign(wheelSum); step(d); wheelSum = 0; wheelCooldown = now+450;
    }
  }, {passive:false});
  stage.addEventListener('pointerdown', e => {
    // A transition already owns the two current nodes; a fresh drag can only
    // start once it has settled back down to a single liveNode.
    if (e.pointerType === 'mouse' || !e.isPrimary || transitioning) return;
    // Leave the native video control strip available for playback interaction.
    if (e.target.tagName === 'VIDEO' && e.clientY > stage.getBoundingClientRect().bottom - 48) return;
    gesture = {id:e.pointerId, x:e.clientX, y:e.clientY, dx:0};
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', e => {
    if (!gesture || gesture.id !== e.pointerId) return;
    gesture.dx = e.clientX - gesture.x;
    if (liveNode) liveNode.style.transform = `translateX(${gesture.dx}px)`;
  });
  function endGesture(e, cancelled = false) {
    if (!gesture || gesture.id !== e.pointerId) return;
    const {dx,y} = gesture; gesture = null;
    // Left swipe (dx<0) = Next (+1); right swipe (dx>0) = Previous (-1).
    const d = dx < 0 ? 1 : -1;
    if (!cancelled && Math.abs(dx) > Math.max(40,stage.clientWidth*.12) && Math.abs(dx) > Math.abs(e.clientY-y) && step(d)) return;
    if (liveNode) liveNode.style.transform = '';
  }
  stage.addEventListener('pointerup', e => endGesture(e));
  stage.addEventListener('pointercancel', e => endGesture(e,true));
})();
