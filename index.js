/* index.html: Selected Works top page.
 * Two independent vertical columns (plain CSS flex, no packing algorithm) plus a
 * per-project horizontal filmstrip modal driven by native scroll (no external
 * carousel library, no custom pointer-drag - touch gets native momentum for free).
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const main = $('index-main'), nav = $('index-nav'), brand = $('index-brand');
  const modal = $('index-modal'), stage = $('index-stage'), modalCaption = $('index-modal-caption');
  const projectsById = new Map(window.PORTFOLIO_PROJECTS.map(p => [p.id, p]));

  // Which project (and, for a project reused on both sides, which specific media
  // item) backs each thumbnail - verified against the current portfolio-data.js.
  // Entries without mediaIndex use media[0] as the cover image.
  const LEFT = [
    {id: '10-magazine'},
    {id: 'krzysztof-jan'},
    {id: 'beauty-antoine-charlie', mediaIndex: 0},
    {id: 'replica-man-pavel-golik'},
    {id: 'port-magazine-aude-le-barbey'},
    {id: 'vogue-mexico-ward-ivan-rafik'},
    {id: 'numero-berlin-boris-ovini'}
  ];
  const RIGHT = [
    {id: 'vogue-adria-danilo-pavlovic'},
    {id: 'carl-diner'},
    {id: 'beauty-antoine-charlie', mediaIndex: 1},
    {id: 'beauty-papers-jeremie-monnier'},
    {id: 'office-jesper-lund'},
    {id: 'numero-china-carla-rossi'},
    {id: 'sans-title-tess-petronio'}
  ];

  function buildColumn(container, entries) {
    entries.forEach(({id, mediaIndex = 0}) => {
      const project = projectsById.get(id);
      if (!project) { console.warn(`index.html: unknown project id "${id}"`); return; }
      const media = project.media[mediaIndex];
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'index-thumb';
      button.setAttribute('aria-label', `Open ${project.title || project.line1 || id}`);
      const img = document.createElement('img');
      // index.html displays these thumbnails large, so it uses the existing 1200px-class
      // `full` asset instead of the ~350px `thumb` overview.html's own grid uses - no new
      // images generated, portfolio-data.js unchanged. width/height stay the thumb-sized
      // values already in the data (same aspect ratio either way) purely as the img
      // element's intrinsic-size hint; loading="lazy" still keeps off-screen cost down.
      img.src = media.full; img.alt = media.alt || project.title || '';
      img.width = media.width; img.height = media.height;
      img.loading = 'lazy'; img.decoding = 'async'; img.draggable = false;
      button.append(img);
      button.addEventListener('click', () => openProject(project));
      container.append(button);
    });
  }
  buildColumn($('index-col-left'), LEFT);
  buildColumn($('index-col-right'), RIGHT);

  // Scroll lock/restore: same technique as overview.js's lock()/close() (fixed body,
  // remember scrollY, inert the background, restore and refocus on close).
  let returnFocus = null, scrollY = 0;
  function lock() {
    returnFocus = document.activeElement; scrollY = window.scrollY;
    Object.assign(document.body.style, {position: 'fixed', top: -scrollY + 'px', width: '100%'});
    main.inert = true; nav.inert = true; brand.inert = true;
  }
  function unlock() {
    main.inert = false; nav.inert = false; brand.inert = false;
    Object.assign(document.body.style, {position: '', top: '', width: ''});
    window.scrollTo(0, scrollY); returnFocus?.focus({preventScroll: true});
  }

  function makeNode(m, project) {
    const node = document.createElement(m.type === 'video' ? 'video' : 'img');
    // Set the aspect ratio from portfolio-data.js's own dataW/dataH up front, so the
    // strip's layout (offsetLeft/offsetWidth) is correct immediately - not dependent
    // on the image finishing its network fetch/decode before we can position it.
    node.style.aspectRatio = `${m.dataW} / ${m.dataH}`;
    if (m.type === 'video') {
      node.muted = true; node.loop = true; node.playsInline = true; node.controls = true; node.preload = 'auto';
      node.src = m.src;
    } else {
      node.src = m.full; node.alt = m.alt || project.title || ''; node.decoding = 'async'; node.draggable = false;
    }
    return node;
  }

  // Fixed 3-cycle infinite loop: [PREV][MAIN][NEXT], each a full, independent copy of
  // the project's own media in the same order. The DOM is built once and never grows -
  // navigation only ever rebases scrollLeft by +/-cycleWidth between these three
  // pixel-identical copies. Because PREV/MAIN/NEXT are exact repeats exactly cycleWidth
  // apart, shifting by that amount always lands on identical content, and - critically -
  // there is always a full cycle of real buffer content on both sides of MAIN,
  // regardless of viewport width (as long as the viewport itself isn't wider than one
  // full cycle, which holds for every project here at any realistic window size).
  //
  // An earlier version used a single clone image at each end instead of a full extra
  // cycle. Measured on a 1440px-wide desktop window with a 4-image project: clientWidth
  // 1440, scrollWidth 3420, maxScrollLeft 1980, cycleWidth 2394, trailing-clone offset
  // 2907. maxScrollLeft (1980) never reached the trailing clone's offset (2907) at all,
  // so forward continuous scroll had nowhere left to go and stopped dead. Going the
  // other way, rebasing by +cycleWidth from scrollLeft 0 targets 2394 - past
  // maxScrollLeft, so the browser silently clamped it, and even unclamped there wasn't
  // enough DOM after that point to fill the viewport - both are exactly why a single
  // clone image can't guarantee visual equivalence on a wide viewport; a full cycle of
  // real media on each side is what actually guarantees it.
  let stripEls = [], mainStart = 0, mainEnd = 0, cycleWidth = 0, mainStartOffset = 0, mainEndOffset = 0;
  function buildStrip(project) {
    stage.replaceChildren();
    const n = project.media.length;
    const prev = project.media.map(m => makeNode(m, project));
    const main = project.media.map(m => makeNode(m, project));
    const next = project.media.map(m => makeNode(m, project));
    stripEls = [...prev, ...main, ...next];
    stripEls.forEach(el => stage.append(el));
    mainStart = n; mainEnd = 2 * n - 1;
    mainStartOffset = stripEls[mainStart].offsetLeft;
    const lastMain = stripEls[mainEnd];
    mainEndOffset = lastMain.offsetLeft + lastMain.offsetWidth;
    cycleWidth = mainEndOffset - mainStartOffset;
    stage.scrollLeft = mainStartOffset; // start at the beginning of the MAIN cycle
  }
  function maxScroll() { return Math.max(0, stage.scrollWidth - stage.clientWidth); }

  // Whenever the leading scroll position drifts out of MAIN's own span (into NEXT
  // going forward, or PREV going backward), shift by one cycleWidth to land on the
  // pixel-identical position inside MAIN. This is checked against MAIN's own bounds,
  // not the strip's native scroll min/max, precisely because - as measured above -
  // the native max can sit well short of where a rebase would need to trigger.
  function rebaseIfNeeded() {
    if (!cycleWidth) return;
    if (stage.scrollLeft >= mainEndOffset) stage.scrollLeft -= cycleWidth;
    else if (stage.scrollLeft < mainStartOffset) stage.scrollLeft += cycleWidth;
  }

  // Arrow-key navigation: continuous time-based scroll while a key is held, not a
  // discrete per-image step. Speed is driven by elapsed time between animation
  // frames, not by how many keydown-repeat events fire, so it advances at a constant
  // rate regardless of the OS's repeat rate. This also sidesteps the previous
  // per-image stepper entirely, which used an instant (non-animated) scrollTo
  // specifically on the step that crossed the loop boundary - that produced a real,
  // deterministic, every-single-lap visual snap back to the first image, independent
  // of any browser/platform timing.
  const ARROW_SCROLL_SPEED = 700; // px/s, first pass - easy to retune
  let heldArrowKey = null, arrowRafId = null, arrowLastT = null;
  function arrowFrame(t) {
    if (heldArrowKey !== 'ArrowRight' && heldArrowKey !== 'ArrowLeft') { arrowRafId = null; arrowLastT = null; return; }
    if (arrowLastT == null) arrowLastT = t;
    const dt = t - arrowLastT; arrowLastT = t;
    const dir = heldArrowKey === 'ArrowRight' ? 1 : -1;
    stage.scrollLeft += dir * ARROW_SCROLL_SPEED * (dt / 1000);
    rebaseIfNeeded();
    arrowRafId = requestAnimationFrame(arrowFrame);
  }
  function startArrowScroll(key) {
    if (heldArrowKey === key) return;
    heldArrowKey = key;
    if (arrowRafId == null) { arrowLastT = null; arrowRafId = requestAnimationFrame(arrowFrame); }
  }
  function stopArrowScroll(key) {
    if (heldArrowKey === key) heldArrowKey = null;
  }
  function stopArrowScrollAll() {
    heldArrowKey = null;
    if (arrowRafId != null) { cancelAnimationFrame(arrowRafId); arrowRafId = null; }
    arrowLastT = null;
  }
  // Safety net: if focus leaves the window while a key is physically still held (e.g.
  // switching apps), no keyup ever arrives - stop on blur so scrolling can't get stuck.
  addEventListener('blur', stopArrowScrollAll);

  // Touch/swipe keeps native scroll; only rebase once scrolling has fully settled
  // (debounced), never on an in-flight 'scroll' event. Correcting mid-gesture risks
  // fighting the browser's own still-resolving touch/momentum/rubber-band physics at
  // that exact boundary. Waiting for quiet guarantees native motion is already fully
  // done before this touches it.
  let scrollSyncTimer = null;
  stage.addEventListener('scroll', () => {
    clearTimeout(scrollSyncTimer);
    scrollSyncTimer = setTimeout(rebaseIfNeeded, 120);
  }, {passive: true});

  function openProject(project) {
    lock();
    modalCaption.textContent = [project.title, project.line1].filter(Boolean).join(' // ');
    // Reveal before building the strip: setting scrollLeft on a [hidden] (display:none)
    // subtree is a no-op in browsers, since a non-rendered element has no real scroll
    // position to set. Both happen synchronously in the same turn, so nothing is ever
    // painted at the wrong starting frame.
    modal.hidden = false;
    buildStrip(project);
    modal.focus({preventScroll: true});
  }
  function closeProject() {
    if (modal.hidden) return;
    clearTimeout(scrollSyncTimer);
    stopArrowScrollAll();
    stage.replaceChildren(); stripEls = [];
    modal.hidden = true;
    unlock();
  }

  // Click/tap on the margin around the strip closes; clicking an actual image does not.
  modal.addEventListener('click', e => {
    if (e.target === modal || e.target === stage) closeProject();
  });
  document.addEventListener('keydown', e => {
    if (modal.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); closeProject(); return; }
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      // Ignore the OS's own key-repeat events entirely - our own rAF loop (started
      // once, on the initial non-repeat keydown) drives continuous motion from
      // elapsed time, not from how many repeat events fire.
      if (!e.repeat) startArrowScroll(e.key);
    }
  });
  document.addEventListener('keyup', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') stopArrowScroll(e.key);
  });
  let resizeTimer;
  addEventListener('resize', () => {
    if (modal.hidden || !stripEls.length) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      // The strip's height (and so every image's width, via aspect-ratio) can change
      // across breakpoints, so MAIN's bounds need recomputing. There's no single
      // "current position within MAIN" worth preserving across a breakpoint change
      // (every image's width just changed), so this just re-anchors to MAIN's start,
      // same as a fresh open.
      mainStartOffset = stripEls[mainStart].offsetLeft;
      const lastMain = stripEls[mainEnd];
      mainEndOffset = lastMain.offsetLeft + lastMain.offsetWidth;
      cycleWidth = mainEndOffset - mainStartOffset;
      stage.scrollLeft = mainStartOffset;
    }, 150);
  });
})();
