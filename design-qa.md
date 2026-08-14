# BIOS Start visual QA

source visual truth path: `/var/folders/nj/1r9ns1312jv6p28y151bxydm0000gn/T/codex-clipboard-5e62c298-9545-4f5a-b933-f174080b80a0.png`
implementation screenshot path: `/tmp/bios-start-boot-final.png`
viewport: 1920 x 1200 CSS px, browser device scale factor 1
source and implementation pixel dimensions: 1920 x 1200; no density normalization required
state: BIOS POST complete, message box visible, DOS prompt visible, before automatic handoff

## Evidence

- Full view: the implementation preserves the reference's left-anchored terminal composition, long separator rule, dense hardware POST block, three-node MAGI check, framed NERV handoff, and bottom prompt.
- Focused region: the NERV handoff box was checked at native desktop size. The original raster had a baked checkerboard background; the implementation uses a transparent derived asset and applies the existing orange CRT treatment so no square image background remains.
- Typography: both use a monospaced BIOS/terminal voice; the implementation uses a system monospace fallback stack so it does not depend on an unavailable font file.
- Spacing and layout rhythm: the implementation keeps the broad top-left inset, tight line rhythm, larger system-check gap, and lower framed handoff region; responsive rules preserve the layout without horizontal overflow.
- Colors and tokens: source green is intentionally translated to the repository's amber/orange CRT palette; no green values are used in `bios-start`.
- Copy: implementation includes the reference-equivalent POST checks, `MELCHIOR-1`, `BALTHASAR-2`, `CASPER-3`, synchronized-node status, NERV quote, startup command, and `A:\>` prompt.

## Comparison history

1. Initial render: P2 image-fidelity issue — the reused `images-1.png` showed a white square because its checkerboard was baked into the PNG. Fixed by generating `frontend/src/features/bios-start/assets/nerv-logo-transparent.png` from the red logo pixels and using it only in the new module.
2. Post-fix render: no actionable P0/P1/P2 findings. Desktop screenshot was recaptured at 1920 x 1200; mobile was checked at 390 x 844 with `scrollWidth === innerWidth`.

## Interaction and runtime checks

- Browser-rendered local Vite page loaded at `http://localhost:4173/` with no console warnings or errors.
- After the 6.35-second startup sequence, `.bios-start` is removed and the existing MAGI console is visible.
- The existing scenario controls remain interactive after handoff; the third scenario button received the `selected` state.

## Implementation checklist

- [x] Orange CRT POST screen matches the supplied reference structure.
- [x] Power-on line, scanlines, type-on lines, cursor blink, and fade-out are implemented.
- [x] Transparent NERV asset is loaded and framed without a visible square background.
- [x] Desktop and mobile layout checked.
- [x] Tests and production build pass.

final result: passed
