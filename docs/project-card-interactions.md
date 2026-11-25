# Project-card interaction states

Selectable `ProjectCard` instances use the shared `interactive-card` class and
`--card-*` tokens from `frontend/src/styles/tokens.css`. Both full and compact
layouts use the same states. Read-only cards stay outside the tab order and do
not advertise a clickable surface. Keep actions as native buttons or links;
do not add `tabIndex` to informational cards just to display a focus style.

The state rules live beside the unlayered glass-card styles. A Tailwind hover
utility alone loses to the unlayered `.glass-card` background in Tailwind v4.

- Mouse/trackpad hover changes the background and border only when the device
  reports a fine pointer with hover support.
- Keyboard focus has an offset, high-contrast outline that remains visible
  while pressed. Native Enter and Space activation remain unchanged. A local
  `data-pressed` state normalizes keyboard feedback across engines and clears
  on key release or blur.
- Pressing changes the background without moving or resizing the card. Touch
  receives this pressed state without a lingering simulated hover state.
- `aria-pressed="true"` retains the selected appearance when callers supply
  `isSelected`.
- Reduced motion removes transitions; forced colors uses a system focus color.

## Verification

Run `npm run test -w frontend -- src/components/__tests__/ProjectCard.test.tsx`.
Check selectable full/compact cards in Chromium, Firefox and WebKit:

1. Hover: background and border change, with no layout movement.
2. Tab: a visible outline surrounds the card. Enter and Space select it once
   per activation; the ring remains during a press.
3. Press and release: pressed background appears then returns to hover/rest.
4. Touch emulation: press feedback appears; releasing does not retain hover.
5. Reduced motion: computed transition duration is zero.
6. Selected card: selection stays visible after moving the pointer away.
7. Read-only card: no pointer affordance or additional keyboard stop.

The real Projects list uses selectable full cards. Compact selectable cards
can be exercised by rendering `ProjectCard` with `userEarnings` and `onSelect`.
No wallet transaction is needed to verify these presentational states.
