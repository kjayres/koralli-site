// A distant, filtered noise rumble. Audio is created only after a sound-button click.
export function createThunder(figure) {
  const button = figure.closest('.agent-opening')?.querySelector('[data-poseidon-sound]');
  if (!button) return { strike() {}, stop() {} };
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return { strike() {}, stop() {} };
  let context, noise, enabled = false, revision = 0;
  const voices = new Set();
  const stop = () => {
    for (const voice of voices) {
      try { voice.stop(); } catch { /* A finished voice may already be stopped. */ }
    }
    voices.clear();
  };
  const update = () => {
    button.setAttribute('aria-pressed', String(enabled));
    button.setAttribute('aria-label', enabled ? 'Mute thunder sound' : 'Enable thunder sound');
    button.querySelector('[data-poseidon-sound-label]').textContent = enabled ? 'SOUND ON' : 'SOUND OFF';
  };
  button.addEventListener('click', async () => {
    const attempt = ++revision;
    enabled = !enabled;
    update();
    if (!enabled) { stop(); return; }
    try {
      context ||= new Audio();
      await context.resume();
      if (attempt !== revision || !enabled) return;
      if (!noise) {
        noise = context.createBuffer(1, Math.ceil(context.sampleRate * 8), context.sampleRate);
        const samples = noise.getChannelData(0);
        let brown = 0;
        for (let i = 0; i < samples.length; i++) {
          const white = Math.random() * 2 - 1;
          brown = .997 * brown + .045 * white;
          const roll = .7 + .18 * Math.sin(i / context.sampleRate * 4.3) + .12 * Math.sin(i / context.sampleRate * 8.1);
          samples[i] = (brown * .8 + white * .06) * roll;
        }
      }
    } catch {
      if (attempt !== revision) return;
      enabled = false; update();
      button.querySelector('[data-poseidon-sound-label]').textContent = 'SOUND UNAVAILABLE';
    }
  });
  button.hidden = false;
  const strike = (strength = 1) => {
    if (!enabled || !context || context.state !== 'running' || document.hidden) return;
    const source = context.createBufferSource();
    const low = context.createBiquadFilter(), high = context.createBiquadFilter(), gain = context.createGain();
    const start = context.currentTime + .7 + Math.random() * .35;
    const level = .34 * Math.max(.2, Math.min(1, strength));
    source.buffer = noise; source.playbackRate.value = .88 + Math.random() * .12;
    low.type = 'lowpass'; low.frequency.setValueAtTime(430, start); low.frequency.exponentialRampToValueAtTime(90, start + 6);
    high.type = 'highpass'; high.frequency.value = 30;
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(level, start + .32);
    gain.gain.exponentialRampToValueAtTime(level * .65, start + 1.2);
    gain.gain.exponentialRampToValueAtTime(level * .78, start + 1.7);
    gain.gain.exponentialRampToValueAtTime(level * .16, start + 4.2);
    gain.gain.exponentialRampToValueAtTime(.0001, start + 7);
    source.connect(low); low.connect(high); high.connect(gain); gain.connect(context.destination);
    voices.add(source);
    source.onended = () => { voices.delete(source); source.disconnect(); low.disconnect(); high.disconnect(); gain.disconnect(); };
    source.start(start); source.stop(start + 7.1);
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  window.addEventListener('pagehide', stop);
  return { strike, stop };
}
