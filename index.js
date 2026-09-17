/* index.html: Selected Works top page.
 * One continuous 1-column sequence of giant project thumbnails, plus (Desktop/Tablet
 * only) a text project index - both driven by the same SEQUENCE array and the same
 * openProject() function, so there is exactly one navigation code path. Below that,
 * a per-project horizontal filmstrip modal driven by native scroll (no external
 * carousel library, no custom pointer-drag - touch gets native momentum for free).
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const main = $('index-main'), brand = $('index-brand');
  const projectNav = $('index-project-nav'), headerNav = document.querySelector('.index-header-nav');
  const modal = $('index-modal'), stage = $('index-stage'), modalCaption = $('index-modal-caption');
  const modalHeader = $('index-modal-header');
  const info = $('index-info'), infoClose = $('index-info-close');
  const projectsById = new Map(window.PORTFOLIO_PROJECTS.map(p => [p.id, p]));

  // The single 14-project sequence, in display order, shared by the giant-thumbnail
  // visual column and the text project index. `label` is the curated short name shown
  // in the text index (distinct from project.title, which the modal caption still
  // uses). Entries without mediaIndex use media[0] as the cover image. Verified
  // against the current portfolio-data.js.
  const SEQUENCE = [
    {id: '10-magazine', label: '10 Magazine'},
    {id: 'vogue-adria-danilo-pavlovic', label: 'Vogue Adria'},
    {id: 'krzysztof-jan', label: 'Krzysztof'},
    {id: 'carl-diner', label: 'Carl Diner'},
    {id: 'beauty-antoine-charlie', mediaIndex: 0, label: 'Beauty'},
    {id: 'replica-man-pavel-golik', label: 'Replica Man'},
    {id: 'beauty-papers-jeremie-monnier', label: 'Beauty Papers'},
    {id: 'port-magazine-aude-le-barbey', label: 'Port'},
    {id: 'office-jesper-lund', label: 'Office'},
    {id: 'vogue-mexico-ward-ivan-rafik', label: 'Vogue Mexico'},
    {id: 'numero-china-carla-rossi', label: 'Numero China'},
    {id: 'numero-berlin-boris-ovini', label: 'Numero Berlin'},
    {id: 'sans-title-tess-petronio', label: 'Sans Titre'}
  ];

  function buildVisual(container, entries) {
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
  buildVisual($('index-visual'), SEQUENCE);

  function buildProjectNav(container, entries) {
    entries.forEach(({id, label}) => {
      const project = projectsById.get(id);
      if (!project) return;
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = label;
      button.addEventListener('click', () => openProject(project));
      container.append(button);
    });
  }
  buildProjectNav(projectNav, SEQUENCE);

  // Scroll lock/restore: same technique as overview.js's lock()/close() (fixed body,
  // remember scrollY, inert the background, restore and refocus on close). The
  // project index and header nav are inerted alongside main/brand since they're the
  // interactive background elements while the modal is open.
  let returnFocus = null, scrollY = 0;
  function lock() {
    returnFocus = document.activeElement; scrollY = window.scrollY;
    Object.assign(document.body.style, {position: 'fixed', top: -scrollY + 'px', width: '100%'});
    main.inert = true; headerNav.inert = true; brand.inert = true;
  }
  function unlock() {
    main.inert = false; headerNav.inert = false; brand.inert = false;
    Object.assign(document.body.style, {position: '', top: '', width: ''});
    window.scrollTo(0, scrollY); returnFocus?.focus({preventScroll: true});
  }

  // Safari/WebKit resolves :focus-visible on a script-focused element as true even when
  // the interaction that triggered it was a mouse click (see overview.js, which fixed
  // the same bug on its own info-close button) - suppressed the same way here via the
  // shared .no-ring class/CSS rule from overview.css.
  function focusInitial(el, viaKeyboard) {
    el.classList.toggle('no-ring', !viaKeyboard);
    el.focus({preventScroll: true});
  }

  // Information overlay: same content/structure/close-by-button-or-Escape behavior as
  // overview.html's #info, reusing this file's own lock()/unlock() (which don't
  // reference the project modal at all, so they apply equally here).
  function openInfo(viaKeyboard) {
    lock();
    info.hidden = false;
    brand.setAttribute('aria-expanded', 'true');
    focusInitial(infoClose, viaKeyboard);
  }
  function closeInfo() {
    if (info.hidden) return;
    info.hidden = true;
    brand.setAttribute('aria-expanded', 'false');
    unlock();
  }
  brand.addEventListener('click', e => openInfo(e.detail === 0));
  infoClose.addEventListener('click', closeInfo);
  // Background-click close: e.target is the element the click actually landed on
  // (unaffected by bubbling), so this only fires for a direct hit on #index-info
  // itself, outside .info-columns and the close button - clicking any real content
  // never closes it.
  info.addEventListener('click', e => { if (e.target === info) closeInfo(); });

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

  // A project has a clear first and last image - one set only, no clones, no loop.
  // Reaching either end simply stops the native scroll at its natural 0/max; closing
  // on "one further push past the end" is handled separately below.
  let stripEls = [];
  function buildStrip(project) {
    stage.replaceChildren();
    stripEls = project.media.map(m => makeNode(m, project));
    stripEls.forEach(el => stage.append(el));
    stage.scrollLeft = 0;
  }
  function maxScroll() { return Math.max(0, stage.scrollWidth - stage.clientWidth); }

  // Arrow-key navigation: continuous time-based scroll while a key is held, not a
  // discrete per-image step. Speed is driven by elapsed time between animation
  // frames, not by how many keydown-repeat events fire, so it advances at a constant
  // rate regardless of the OS's repeat rate.
  //
  // Edge-close: reaching the last (or first) image must not close the modal by
  // itself - only a further push past it should. Once continuous scroll is pinned
  // at 0 or maxScroll (the browser clamps further attempts, so scrollLeft stops
  // changing), an elapsed-time timer starts; the modal only closes once the key has
  // stayed held at that pinned edge past EDGE_CLOSE_MS, not the instant it arrives.
  const ARROW_SCROLL_SPEED = 700; // px/s, first pass - easy to retune
  const EDGE_CLOSE_MS = 260; // first pass - a short, deliberate extra push, not instant
  let heldArrowKey = null, arrowRafId = null, arrowLastT = null, edgeHoldStart = null;
  function arrowFrame(t) {
    if (heldArrowKey !== 'ArrowRight' && heldArrowKey !== 'ArrowLeft') { arrowRafId = null; arrowLastT = null; edgeHoldStart = null; return; }
    if (arrowLastT == null) arrowLastT = t;
    const dt = t - arrowLastT; arrowLastT = t;
    const dir = heldArrowKey === 'ArrowRight' ? 1 : -1;
    stage.scrollLeft += dir * ARROW_SCROLL_SPEED * (dt / 1000);
    const atEdge = dir > 0 ? stage.scrollLeft >= maxScroll() - 0.5 : stage.scrollLeft <= 0.5;
    if (atEdge) {
      if (edgeHoldStart == null) edgeHoldStart = t;
      else if (t - edgeHoldStart >= EDGE_CLOSE_MS) { closeProject(); return; }
    } else {
      edgeHoldStart = null;
    }
    arrowRafId = requestAnimationFrame(arrowFrame);
  }
  function startArrowScroll(key) {
    if (heldArrowKey === key) return;
    heldArrowKey = key; edgeHoldStart = null;
    if (arrowRafId == null) { arrowLastT = null; arrowRafId = requestAnimationFrame(arrowFrame); }
  }
  function stopArrowScroll(key) {
    if (heldArrowKey === key) { heldArrowKey = null; edgeHoldStart = null; }
  }
  function stopArrowScrollAll() {
    heldArrowKey = null; edgeHoldStart = null;
    if (arrowRafId != null) { cancelAnimationFrame(arrowRafId); arrowRafId = null; }
    arrowLastT = null;
  }
  // Safety net: if focus leaves the window while a key is physically still held (e.g.
  // switching apps), no keyup ever arrives - stop on blur so scrolling can't get stuck.
  addEventListener('blur', stopArrowScrollAll);

  // Touch: native horizontal scroll is unchanged (no custom pointer-drag). Detecting
  // "swiped past the last/first image" from touch is inherently limited - once
  // scrollLeft is clamped at 0/max, the DOM gives no signal for *how hard* the user
  // kept dragging past it, only that a touch is still active. This tracks whether a
  // touch is currently down and, once scrolling has settled (debounced, so it never
  // fights the browser's own still-resolving momentum/rubber-band physics) pinned at
  // an edge while that touch is still active, starts the same edge-hold timer as the
  // keyboard path. This is a best-effort heuristic, not verified on real iOS Safari -
  // see the report.
  let touchActive = false, touchEdgeHoldStart = null;
  stage.addEventListener('touchstart', () => { touchActive = true; touchEdgeHoldStart = null; }, {passive: true});
  stage.addEventListener('touchend', () => { touchActive = false; touchEdgeHoldStart = null; }, {passive: true});
  stage.addEventListener('touchcancel', () => { touchActive = false; touchEdgeHoldStart = null; }, {passive: true});
  let scrollSyncTimer = null;
  stage.addEventListener('scroll', () => {
    clearTimeout(scrollSyncTimer);
    scrollSyncTimer = setTimeout(() => {
      const max = maxScroll();
      const atEdge = stage.scrollLeft <= 0.5 || stage.scrollLeft >= max - 0.5;
      if (atEdge && touchActive) {
        if (touchEdgeHoldStart == null) touchEdgeHoldStart = performance.now();
        else if (performance.now() - touchEdgeHoldStart >= EDGE_CLOSE_MS) closeProject();
      } else {
        touchEdgeHoldStart = null;
      }
    }, 120);
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
    touchActive = false; touchEdgeHoldStart = null;
    stage.replaceChildren(); stripEls = [];
    modal.hidden = true;
    unlock();
  }

  // Click/tap on the brand/caption overlay closes; clicking the background margin
  // or an actual image does not.
  modal.addEventListener('click', e => {
    if (modalHeader.contains(e.target)) closeProject();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!modal.hidden) { e.preventDefault(); closeProject(); }
      else if (!info.hidden) { e.preventDefault(); closeInfo(); }
      return;
    }
    if (modal.hidden) return;
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
})();
