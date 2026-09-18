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

  // Left fixed-UI dynamic caption (PC only, >=1024px - see report). Lives between
  // #index-brand and .index-project-nav in the same fixed-left column (index.css),
  // not in the central .index-visual. Hand-curated per-project caption content,
  // deliberately kept out of portfolio-data.js: issue/publication metadata like
  // this exists nowhere in that file (confirmed against the current file), and this
  // is display-only copy for this one page's left UI, not portfolio data. Edit this
  // object directly to add/change a project's label or lines - e.g. a future
  // '[FEATURED PROJECT]' entry - nothing else needs to change.
  const INDEX_CAPTIONS = {
    '10-magazine': {
      label: '[NEWEST FEATURED PROJECT]',
      lines: [
        '10 MAGAZINE',
        'ISSUE 77  AUTUMN/WINTER 2026',
        'PHOTOGRAPHER: Ferry van der Nat'
      ]
    },
      'vogue-adria-danilo-pavlovic': {
    label: '[FEATURED PROJECT]',
    lines: [
      'VOGUE ADRIA',
      'SUMMER 2026',
      'PHOTOGRAPHER: Danilo Pavlovic'
    ]
  }
  
  };

  // Built once, in place, rather than as per-project DOM - hover and scroll both
  // just rewrite this same node's content (see updateCaption below).
  const caption = document.createElement('div');
  caption.className = 'index-caption';
  const captionLabel = document.createElement('div');
  captionLabel.className = 'index-featured-label';
  const captionRef = document.createElement('div');
  captionRef.className = 'index-first-ref';
  caption.append(captionLabel, captionRef);
  main.insertBefore(caption, projectNav);

  // The single source of truth for "what the caption (and the left index's active
  // underline) currently show" - called both from the left-index mouseenter handler
  // and from the scroll-driven IntersectionObserver below, so the two update paths
  // can never disagree. Projects with no INDEX_CAPTIONS entry hide the caption
  // entirely (no title/line1 fallback) - inline style so it wins over both this
  // breakpoint's `position: fixed` and <=1023px's `display: none`.
  function updateCaption(project) {
    const entry = INDEX_CAPTIONS[project.id];
    caption.style.display = entry ? '' : 'none';
    if (entry) {
      captionLabel.textContent = entry.label || '';
      captionLabel.style.visibility = entry.label ? '' : 'hidden';
      captionRef.replaceChildren(...entry.lines.map(text => {
        const p = document.createElement('p');
        p.textContent = text;
        return p;
      }));
    }
    // "Active" here means "the project the caption is currently showing" - not
    // hover state - so this runs from both update paths above, never independently.
    // Independent of whether project has an INDEX_CAPTIONS entry: the underline
    // always tracks the current project, caption visibility does not gate it.
    projectNav.querySelectorAll('button').forEach(button => {
      const isActive = button.dataset.projectId === project.id;
      button.classList.toggle('is-active', isActive);
      if (isActive) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
  }

  // The single 14-project sequence, in display order, shared by the giant-thumbnail
  // visual column and the text project index. `label` is the curated short name shown
  // in the text index (distinct from project.title, which the modal caption still
  // uses). Entries without mediaIndex use media[0] as the cover image. Verified
  // against the current portfolio-data.js.
  const SEQUENCE = [
    {id: '10-magazine', label: '10 MAGAZINE'},
    {id: 'vogue-adria-danilo-pavlovic', label: 'VOGUE ADRIA'},
    {id: 'krzysztof-jan', label: 'KRZYSZTOF JAN'},
    {id: 'carl-diner', label: 'CARL DINER'},
    {id: 'beauty-antoine-charlie', mediaIndex: 0, label: 'BEAUTY'},
    {id: 'replica-man-pavel-golik', label: 'REPLICA MAN'},
    {id: 'beauty-papers-jeremie-monnier', label: 'BEAUTY PAPERS'},
    {id: 'port-magazine-aude-le-barbey', label: 'PORT MAGAZINE'},
    {id: 'office-jesper-lund', label: 'OFFICE MAGAZINE X KEEN'},
    {id: 'vogue-mexico-ward-ivan-rafik', label: 'VOGUE MEXICO'},
    {id: 'numero-china-carla-rossi', label: 'NUMÉRO CHINA'},
    {id: 'numero-berlin-boris-ovini', label: 'NUMÉRO BERLIN'},
    {id: 'sans-title-tess-petronio', label: 'TESS PETRONIO'}
  ];

  function buildVisual(container, entries) {
    entries.forEach(({id, mediaIndex = 0}) => {
      const project = projectsById.get(id);
      if (!project) { console.warn(`index.html: unknown project id "${id}"`); return; }
      const media = project.media[mediaIndex];
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'index-thumb';
      button.dataset.projectId = id;
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
      button.dataset.projectId = id;
      button.addEventListener('click', () => openProject(project));
      // PC-only experiment: hovering a left-index entry scrolls the matching
      // giant thumbnail (same id, via data-project-id) to viewport center.
      // No effect on <=1023px since .index-project-nav is display:none there
      // and a hidden button never receives mouseenter.
      button.addEventListener('mouseenter', () => {
        const thumb = document.querySelector(`.index-thumb[data-project-id="${id}"]`);
        thumb?.scrollIntoView({behavior: 'auto', block: 'center'});
        updateCaption(project);
      });
      container.append(button);
    });
  }
  buildProjectNav(projectNav, SEQUENCE);

  // Active-underline length: fixed to the widest button's own rendered width, not
  // the active project's - computed once, here, from the actual buttons (not a
  // guessed/hardcoded px value), so it stays correct if a longer project name is
  // ever added to SEQUENCE. Deliberately not recomputed on hover/scroll/resize -
  // see CSS var --index-active-line-width, read by .is-active::after.
  const navButtonWidths = [...projectNav.querySelectorAll('button')].map(b => b.getBoundingClientRect().width);
  projectNav.style.setProperty('--index-active-line-width', `${Math.max(...navButtonWidths)}px`);

  // Initial state: whatever is actually first on screen at scroll position 0 -
  // SEQUENCE[0], not a separate "newest" constant - so this can never disagree with
  // what the IntersectionObserver below would report once it fires. Run after
  // buildProjectNav so the left-index buttons it also updates (the active
  // underline) already exist.
  updateCaption(projectsById.get(SEQUENCE[0].id));

  // Keeps the caption in sync with plain scrolling too, not just left-index hover:
  // it always reflects whichever .index-thumb is currently centered in the
  // viewport. rootMargin shrinks the intersection root to a thin band straddling
  // the exact vertical center (49% in from top and bottom, not the full 50%, so the
  // band has a hair of real height instead of collapsing to a single geometric
  // line - avoids relying on browsers handling a zero-height root perfectly).
  // Thumbnails are laid out edge-to-edge with no gap (index.css: `gap: 0`), so
  // exactly one is ever under that band at a time, and scrollIntoView's own
  // block:'center' lines up with this same band - so the mouseenter handler above
  // and this observer always agree on the current project, with no flicker.
  // matchMedia is checked once, here, at load - not on resize - since this feature
  // is PC-only and the instructions call for no resize listener; .index-thumb
  // elements exist at every breakpoint (unlike .index-project-nav/.index-caption,
  // which are hidden <=1023px via CSS), so without this check the observer would
  // keep recomputing on mobile for no visible effect.
  if (matchMedia('(min-width: 1024px)').matches) {
    const thumbObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const project = projectsById.get(entry.target.dataset.projectId);
        if (project) updateCaption(project);
      });
    }, {rootMargin: '-49% 0px -49% 0px', threshold: 0});
    document.querySelectorAll('.index-thumb').forEach(thumb => thumbObserver.observe(thumb));
  }

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
  // A normal quick swipe past the edge lifts the finger (touchend, touchActive
  // becomes false) well before the native momentum/rubber-band animation actually
  // settles back at 0/maxScroll, so the debounced touchActive check below alone
  // almost never fires on a real device - that's the reported iPhone bug. iOS's
  // elastic overscroll genuinely reports scrollLeft outside [0, maxScroll] while
  // bouncing (not just a visual effect - the DOM property itself briefly reads past
  // the edge), so checking every raw scroll event for that excursion catches the
  // "swiped past the edge" gesture directly, independent of whether the finger is
  // still down. Kept as a small OVERSCROLL_PX tolerance, not a hard 0/max check, so
  // normal clamped scrolling never triggers it by accident.
  const OVERSCROLL_PX = 8;
  let scrollSyncTimer = null;
  stage.addEventListener('scroll', () => {
    const max = maxScroll();
    if (stage.scrollLeft < -OVERSCROLL_PX || stage.scrollLeft > max + OVERSCROLL_PX) { closeProject(); return; }
    clearTimeout(scrollSyncTimer);
    scrollSyncTimer = setTimeout(() => {
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
