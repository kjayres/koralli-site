const BLUE = 'var(--building-line, #244EFF)';
const CORAL = 'var(--building-coral, #FF6655)';

const back = `
  <g data-sprig="left-kelp" data-name="Fine seaweed at the left corner" transform="translate(152 477)">
    <path d="M0 0 C-8 -8 -5 -17 -10 -25 S-9 -39 -13 -48 M-7 -17 C-13 -19 -15 -23 -18 -27 M-10 -30 C-4 -33 -3 -36 -2 -40"/>
    <path d="M-7 -17 C-17 -18 -23 -25 -22 -31 C-14 -29 -9 -24 -7 -17 Z M-10 -30 C-8 -38 -3 -43 2 -44 C2 -37 -3 -33 -10 -30 Z M-12 -39 C-20 -41 -23 -47 -23 -50 C-17 -48 -13 -45 -12 -39 Z" fill="${BLUE}" fill-opacity=".035" stroke-opacity=".65"/>
    <path d="M-12 -22 l-4 -1 M-15 -26 l-4 -1 M-6 -35 l4 -2 M-5 -38 l3 -2 M-16 -44 l-3 -1" stroke-width=".6" stroke-opacity=".45"/>
  </g>
  <g data-sprig="right-coral" data-name="Small branching coral behind the right corner" transform="translate(548 477)">
    <path d="M0 0 C3 -8 1 -17 7 -24 S12 -36 11 -45 M4 -20 C-2 -23 -5 -28 -5 -36 M7 -25 C15 -24 18 -30 19 -36 M10 -35 C17 -37 19 -40 19 -44 M-2 -29 C-9 -29 -11 -33 -12 -37 M15 -28 C20 -27 23 -30 24 -33"/>
    <path d="M11 -45 q-1 -3 -3 -4 M19 -44 l2 -3" stroke="${CORAL}" stroke-opacity=".62" stroke-width="1"/>
  </g>`;

const front = `
  <g data-sprig="front-left-kelp" data-name="Short seaweed on the front left edge" transform="translate(210 506)">
    <path d="M0 0 C-3 -7 2 -15 -2 -22 S-2 -30 -5 -35 M-1 -12 C-7 -15 -9 -18 -10 -22 M-1 -22 C5 -23 8 -27 10 -30"/>
    <path d="M-1 -12 C-11 -12 -15 -19 -15 -25 C-9 -23 -3 -19 -1 -12 Z M-1 -22 C1 -28 8 -33 13 -34 C13 -27 7 -24 -1 -22 Z" fill="${BLUE}" fill-opacity=".04" stroke-opacity=".68"/>
    <path d="M-7 -17 l-4 -2 M-9 -20 l-3 -1 M4 -27 l4 -1 M7 -30 l3 -1" stroke-width=".6" stroke-opacity=".45"/>
  </g>
  <g data-sprig="front-right-coral" data-name="Small coral sprig on the front right edge" transform="translate(489 506.5)">
    <path d="M0 0 C2 -7 -1 -14 3 -20 S5 -27 4 -31 M1 -15 C-6 -15 -8 -20 -8 -25 M2 -19 C8 -17 12 -21 13 -27 M-5 -19 C-11 -18 -13 -22 -13 -26 M9 -20 C15 -19 17 -22 18 -24"/>
    <path d="M4 -31 l-1 -3" stroke="${CORAL}" stroke-opacity=".5" stroke-width="1"/>
  </g>
  <g data-sprig="front-tip-leaf" data-name="One small seaweed shoot at the front edge" transform="translate(347 574.5)">
    <path d="M0 0 C-3 -5 2 -10 0 -16 S1 -23 2 -25"/>
    <path d="M0 -9 C-7 -9 -11 -14 -10 -18 C-4 -17 0 -14 0 -9 Z M0 -16 C3 -20 8 -21 11 -21 C10 -17 5 -15 0 -16 Z" fill="${BLUE}" fill-opacity=".035" stroke-opacity=".62"/>
    <path d="M-4 -13 l-3 -1 M4 -18 l3 -1" stroke-width=".6" stroke-opacity=".42"/>
  </g>`;

/** Place back before the storeys and front after them, inside data-building-world. */
export function baseLifeMarkup(layer = 'front') {
  if (layer !== 'front' && layer !== 'back') throw new RangeError('Base life layer must be front or back.');
  return `<g data-base-life="${layer}" aria-hidden="true" fill="none" stroke="${BLUE}" stroke-width="1.05" stroke-opacity=".78" stroke-linecap="round" stroke-linejoin="round">${layer === 'front' ? front : back}</g>`;
}
