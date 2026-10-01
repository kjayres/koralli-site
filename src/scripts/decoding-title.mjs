// A brief, parallel resolution of the heading. The real text owns its layout.
const heading = document.querySelector('.decoding-title');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const contrast = matchMedia('(forced-colors: active)');

if (heading && !motion.matches && !contrast.matches && !document.hidden) {
  const text = heading.querySelector('.decode-text');
  let overlay;
  let timer;
  let finished = false;

  function finish() {
    finished = true;
    clearTimeout(timer);
    clearTimeout(fallback);
    overlay?.remove();
    heading.classList.remove('is-decoding');
    removeEventListener('resize', finish);
    removeEventListener('beforeprint', finish);
    document.removeEventListener('visibilitychange', onVisibility);
    motion.removeEventListener('change', finish);
    contrast.removeEventListener('change', finish);
  }

  function onVisibility() { if (document.hidden) finish(); }

  const fallback = setTimeout(finish, 4500);
  addEventListener('resize', finish, { once:true });
  addEventListener('beforeprint', finish, { once:true });
  document.addEventListener('visibilitychange', onVisibility);
  motion.addEventListener('change', finish, { once:true });
  contrast.addEventListener('change', finish, { once:true });

  async function start() {
    await document.fonts.ready;
    if (finished) return;
    const bounds = heading.getBoundingClientRect();
    if (bounds.bottom < 0 || bounds.top > innerHeight) { finish(); return; }

    const style = getComputedStyle(heading);
    const context = document.createElement('canvas').getContext('2d');
    context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const range = document.createRange();
    const glyphs = [];
    overlay = document.createElement('span');
    overlay.className = 'decode-overlay';
    overlay.setAttribute('aria-hidden', 'true');

    [...text.textContent].forEach((character, index) => {
      if (/\s/.test(character)) return;
      range.setStart(text.firstChild, index);
      range.setEnd(text.firstChild, index + 1);
      const rect = range.getBoundingClientRect();
      const glyph = document.createElement('span');
      glyph.className = 'decode-glyph';
      glyph.textContent = character;
      glyph.style.left = `${rect.left - bounds.left}px`;
      glyph.style.top = `${rect.top - bounds.top}px`;
      overlay.append(glyph);

      // Similar-width substitutes stay inside the original letter's space.
      const alphabet = character === character.toUpperCase() ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' : 'abcdefghijklmnopqrstuvwxyz';
      const width = context.measureText(character).width;
      const candidates = [...alphabet].filter(letter => {
        const ratio = context.measureText(letter).width / width;
        return letter !== character && ratio >= .75 && ratio <= 1.08;
      });
      glyphs.push({ glyph, character, index, rect, candidates, settlesAt:4 + ((index * 13 + 3) % 7) });
    });
    heading.append(overlay);

    // Align the new line boxes with the original glyphs, including mobile wraps.
    glyphs.forEach(item => {
      range.selectNodeContents(item.glyph);
      const placed = range.getBoundingClientRect();
      item.glyph.style.left = `${parseFloat(item.glyph.style.left) + item.rect.left - placed.left}px`;
      item.glyph.style.top = `${parseFloat(item.glyph.style.top) + item.rect.top - placed.top}px`;
      item.glyph.textContent = '';
    });

    heading.classList.add('is-decoding');
    let step = 0;
    function advance() {
      if (finished) return;
      step++;
      glyphs.forEach(({ glyph, character, index, candidates, settlesAt }) => {
        const settled = step >= settlesAt;
        const phase = (step + index * 3) % 4;
        const visible = settled || (step > index % 3 && phase !== 0 && phase !== 3);
        glyph.textContent = settled || !candidates.length || phase === 1
          ? character : candidates[(index + step * 5) % candidates.length];
        glyph.classList.toggle('is-settled', settled);
        glyph.style.opacity = visible ? (settled ? '1' : '.62') : '0';
      });
      if (step >= 11) { finish(); return; }
      timer = setTimeout(advance, 250);
    }
    timer = setTimeout(advance, 160);
  }

  start().catch(finish);
}
