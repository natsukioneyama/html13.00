# HTML13.00 Phase 1

Functional reference: Notion `html13.00`, https://app.notion.com/p/3dd595d08fb0808e82f5da8243967a99 (read through the Notion plugin; last edited 2026-09-16).
Visual reference: existing `html13.00.pdf`, all 12 pages inspected.
The user approved using the available HTML12.02 in place of the unavailable HTML12.01.

## Files

Created overview.html, overview.css, overview.js, portfolio-data.js, justified-layout.umd.js, and this note. No pre-existing files modified. No commits, pushes or deployment.
The JL library is an unchanged copy. The previous aspect-ratio/absolute-box architecture and resize debounce are retained; mobile target row height follows the PDF. Media data uses actual full-image dimensions for aspect ratios.

## Dataset

Exactly 01.webp, 02.webp, 03.webp from each folder below, in this order, using the matching existing `thmbs/` and `img/` assets:

- 10magazine/september_2026
- vogueadria/summer2026
- img/carldiner_01
- img/krzysztofjan_01

All 12 thumbnail and full-image paths were checked locally. Thumbnails have a 350px longest edge; full images have a 1200px longest edge. No new assets generated.

## Implemented

Justified overview, fixed identity/info control and translucent bottom caption/contact bar; individual transform-based hover or touch selection; second touch opens the modal. Custom translucent modal with original media aspect ratio, scroll locking/restoration, all-media sequence, vertical arrow-key/wheel navigation, horizontal pointer swipe with finger tracking, Escape/close and focus restoration/trapping. Sequence stops at the ends.

The modal holds only the current node. It does not preload other large assets. Videos retain actual moving thumbnails, viewport/visibility pause behavior, separate modal nodes starting at zero, and pause/source-release on leaving or closing. The 12-item sample contains no videos.

## Verification

- JavaScript syntax checked.
- Unchanged JL engine confirmed against HTML12.02.
- Local in-app browser: all 12 thumbnails loaded, zero modal nodes initially.
- Visual review at 390px and 1440px widths; mobile first row shows three portraits.
- Click, ArrowDown traversal through all 12 images, cross-project navigation, ArrowUp, Escape, info open/close verified.
- Modal has one node during navigation and zero after close; body scroll lock clears.
- Scroll restoration verified: 102.5px before opening and 102.5px after closing.
- Touch selection/swipes and video lifecycle are implemented but not verified on physical devices. Wheel inertia tuning and Safari memory behavior require real-device checks; no claim of stress-test completion.

## Deliberate limits and differences

- Info is an overlay inside overview.html, rather than a separate info.html route, to preserve the overview behind it in this Phase 1 foundation.
- The PDF's info portrait has not been identified locally and is omitted. Info typography/portrait completion is deferred. Existing biography and profile links are reused; PDF opens a pre-addressed email request, without sending anything.
- A system sans-serif is used; exact typeface is not identified by the PDF.
- Modal navigation uses an incoming-media transform/fade, not a fully polished outgoing/incoming gesture animation. Only the current large media is loaded, so a newly visited image may take time to decode.
- Neighbor/hover prefetch, advanced gesture physics, full-portfolio migration, asset generation, and iPhone Safari/video stress tests are deferred.

Stopped at Phase 1. Preview: http://127.0.0.1:8130/html13.00/overview.html while the local server is running.
