// From src/scripts/art/journal-deep-life.mjs, after drawDeepFish. drawDeepFish called
// drawDeepMechFish(ctx, scene, time, current, scroll, viewport) just before its final ctx.restore().
// It uses that file's helpers: TAU, clamp, smooth, wrap, lerp and trace.

/**
 * The fish's diving suit (once also on the home page; see component-archive/redesigners-scene), out
 * in open water in Views from the Reef.
 * Side view of the same rounded build: barrel hull, water-filled glass dome with the coral
 * fish piloting inside, twin thruster tanks on the back, claw arms ahead and fins kicking behind.
 */
function drawDeepMechFish(ctx, scene, time = 0, current = 0, scroll = 0, viewport) {
  const { width, height, compact, size } = scene;
  const scale = (compact ? 0.78 : size) * 1.05;
  const margin = 120 * scale;
  // The angler trails this far behind, so the loop waits until it has left the screen too.
  const trail = 270 * scale;
  const speed = 9.5;
  const phase = 1.6;
  const travel = speed * time + 9 * Math.sin(time * 0.06 + phase);
  const x = wrap(0.24 * width + margin + travel, width + 2 * margin + trail) - margin;
  if (x < -margin * 0.85 || x - trail > width + margin * 0.85) return;

  const y = 0.285 * height + 10 * Math.sin(time * 0.09 + phase) + 3.5 * Math.cos(time * 0.22 + phase) + scroll * 5;
  const reach = 64 * scale;
  if (viewport && (y + reach < viewport.top || y - reach > viewport.bottom)) return;

  const edge = Math.min(x, width - x) / width;
  const quiet = 1 - 0.65 * smooth(clamp((edge - 0.08) / 0.18, 0, 1));
  const alpha = 0.56 * quiet;

  const LINE = '#9BB2FF', HULL = '#101F3F', LIT = '#1C3A78';
  const AQUA = '#7CE0FF', CORAL = '#FF6655', GLASS = '#1D396B', PAPER = '#F3F0E8';

  // Gentle nose-up glide with a little sway from the current.
  const pitch = -0.12 + 0.03 * current + 0.04 * Math.sin(time * 0.14 + phase);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const map = (lx, ly) => [
    x + (lx * cp - ly * sp) * scale,
    y + (lx * sp + ly * cp) * scale,
  ];
  // Tapered capsule between two local points, as one closed subpath.
  const capsule = (a, rA, b, rB) => {
    const [ax, ay] = map(...a), [bx, by] = map(...b);
    const ra = rA * scale, rb = rB * scale;
    const th = Math.atan2(by - ay, bx - ax);
    const tilt = Math.PI / 2 - Math.asin(clamp((ra - rb) / (Math.hypot(bx - ax, by - ay) || 1e-6), -0.95, 0.95));
    ctx.moveTo(ax + ra * Math.cos(th + tilt), ay + ra * Math.sin(th + tilt));
    ctx.arc(ax, ay, ra, th + tilt, th + TAU - tilt);
    ctx.arc(bx, by, rb, th - tilt, th + tilt);
    ctx.closePath();
  };
  const ball = (c, r) => {
    const [cx, cy] = map(...c);
    ctx.moveTo(cx + r * scale, cy);
    ctx.arc(cx, cy, r * scale, 0, TAU);
  };
  const part = (draw, { fill = HULL, stroke = LINE, width = 0.7, opacity = 1, fillOpacity = 1 } = {}) => {
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.beginPath();
    draw();
    ctx.globalAlpha = alpha * opacity * fillOpacity;
    ctx.fill();
    ctx.globalAlpha = alpha * opacity;
    ctx.stroke();
  };
  const line = (pts, { stroke = LINE, width = 0.5, opacity = 0.6 } = {}) => {
    ctx.globalAlpha = alpha * opacity;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.beginPath();
    trace(ctx, pts.map(pt => map(...pt)));
    ctx.stroke();
  };

  const leg = (kick, opacity) => {
    const hip = [-15, 3], knee = [-28, 5 + kick * 0.5], ankle = [-40, 7 + kick];
    part(() => trace(ctx, [
      [-40, 5 + kick], [-53, 1.5 + kick * 1.25], [-50, 7 + kick * 1.2], [-54, 12.5 + kick * 1.3], [-40, 9 + kick],
    ].map(pt => map(...pt))), { fill: AQUA, stroke: AQUA, opacity, fillOpacity: 0.14 });
    part(() => { capsule(knee, 3.0, ankle, 2.4); capsule(hip, 3.6, knee, 3.0); }, { opacity });
    part(() => ball(knee, 2.6), { fill: LIT, opacity });
  };

  const arm = (sway, grip, opacity) => {
    const shoulder = [5, -1], elbow = [11, 10 + sway * 0.6], wrist = [23, 12.5 + sway];
    const dx = wrist[0] - elbow[0], dy = wrist[1] - elbow[1], len = Math.hypot(dx, dy);
    const dir = [dx / len, dy / len], perp = [-dir[1], dir[0]];
    const at = (base, along, across) => [base[0] + dir[0] * along + perp[0] * across, base[1] + dir[1] * along + perp[1] * across];
    part(() => capsule(shoulder, 2.5, elbow, 2.4), { opacity });
    part(() => ball(elbow, 2.9), { fill: LIT, opacity });
    part(() => capsule(at(elbow, 1.6, 0), 2.6, at(wrist, -1.2, 0), 3.2), { opacity });
    part(() => capsule(at(wrist, -1.4, 0), 3.3, wrist, 3.3), { stroke: CORAL, opacity });
    part(() => {
      for (const jaw of [1, -1]) {
        const base = at(wrist, 1.2, 0);
        const knuckle = at(wrist, 4.6, jaw * (1.2 + grip * 1.8));
        const tip = at(wrist, 7.6, jaw * (0.3 + grip * 1.0));
        capsule(base, 1.2, knuckle, 1.1);
        capsule(knuckle, 1.1, tip, 0.7);
      }
    }, { opacity });
  };

  // Now and then an angler fish drifts up behind the suit, lure glowing, as if to eat the pilot.
  const chase = smooth(clamp((Math.sin(time * 0.045 + 1.2) - 0.15) / 0.45, 0, 1));

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (chase > 0.01) drawAngler(ctx, x + lerp(-250, -185, chase) * scale, y + (34 + 4 * Math.sin(time * 0.7)) * scale, 72 * scale, time, 0.4 * quiet * chase);

  // 1. Legs tucked under the hull, the far one dimmed so the suit reads in depth.
  const kick = Math.sin(time * 2.2) * 4.6;
  const sway = Math.sin(time * 1.4 + 0.8) * 2.0;
  const grip = 0.5 + 0.5 * Math.sin(time * 1.1);
  leg(-kick, 0.55);
  leg(kick, 1);

  // 2. Twin thruster tanks along the back, with wake rings off the nozzles.
  part(() => capsule([-19, -11.5], 3.0, [3, -13], 3.0), { opacity: 0.6 });
  part(() => capsule([-20, -9.5], 3.2, [2, -11], 3.2));
  part(() => capsule([-23.2, -9.3], 2.1, [-21, -9.4], 2.6), { stroke: AQUA });
  ctx.globalAlpha = alpha * 0.5;
  ctx.strokeStyle = AQUA;
  ctx.lineWidth = 0.45;
  ctx.beginPath();
  for (let w = 0; w < 2; w++) {
    const pulse = (time * 0.9 + w * 0.5) % 1;
    const [wx, wy] = map(-26 - pulse * 14, -9.3);
    const wr = (1.8 + pulse * 2.8) * scale;
    ctx.moveTo(wx + wr, wy);
    ctx.arc(wx, wy, wr, 0, TAU);
  }
  ctx.stroke();

  // 3. Barrel hull with its seams, coral depth stripe and headlamp.
  part(() => capsule([-14, 0.5], 8.6, [7, -0.5], 10.2), { width: 0.78 });
  const band = (lx, top, bottom, bulge) => [[lx, top], [lx + bulge * 0.7, top * 0.5], [lx + bulge, 0], [lx + bulge * 0.7, bottom * 0.5], [lx, bottom]];
  line(band(-9, -8.4, 9.0, 1.2));
  line(band(4.5, -9.9, 9.2, 1.4));
  line(band(-2.5, -9.4, 9.4, 1.6), { stroke: CORAL, width: 1.1, opacity: 1 });
  part(() => ball([11.5, -5.5], 1.2), { fill: AQUA, stroke: LINE, width: 0.5 });

  // 4. Coral collar seen edge-on, then the water-filled dome.
  part(() => capsule([15.5, -8.5], 2.2, [15.5, 7.5], 2.2), { stroke: CORAL, width: 0.85 });
  const [dx, dy] = map(25, -1);
  const domeR = 10.5 * scale;
  ctx.globalAlpha = alpha * 0.55;
  ctx.fillStyle = GLASS;
  ctx.beginPath();
  ctx.moveTo(dx + domeR, dy);
  ctx.arc(dx, dy, domeR, 0, TAU);
  ctx.fill();

  ctx.globalAlpha = alpha * 0.55;
  ctx.strokeStyle = AQUA;
  ctx.lineWidth = 0.46;
  ctx.beginPath();
  const waterPts = [];
  for (let i = -5; i <= 5; i++) {
    const u = i / 5;
    waterPts.push([dx + u * domeR * 0.86, dy - domeR * 0.45 + Math.sin(time * 2.4 + u * 3.2) * 0.9 * scale]);
  }
  trace(ctx, waterPts);
  for (const [bx, rise, r] of [[-3, 0, 0.9], [3.6, 2.5, 0.7]]) {
    const cx = dx + bx * scale, cy = dy - (2 + ((time * 4 + rise) % 5)) * scale;
    ctx.moveTo(cx + r * scale, cy);
    ctx.arc(cx, cy, r * scale, 0, TAU);
  }
  ctx.stroke();

  // The coral fish piloting the suit, glancing back when the angler closes in.
  const look = chase > 0.75 && Math.sin(time * 0.9) > 0.35 ? -1 : 1;
  const fishX = dx + Math.sin(time * 1.7) * 1.8 * scale;
  const fishY = dy + 1.2 * scale + Math.cos(time * 2.3) * 1.3 * scale;
  const tailWag = Math.sin(time * 6.5) * 1.5 * scale;
  const k = scale * 0.85;
  const fish = [
    [6.2, 0], [2.2, -3.3], [-3.2, -2.1], [-5.2, -0.6], [-8.4, -3.4], [-6.8, 0], [-8.4, 3.4], [-5.2, 0.6], [-3.2, 2.1], [2.2, 3.3],
  ].map(([u, v], i) => [fishX + look * u * k, fishY + v * k + (i >= 3 && i <= 7 ? tailWag * (i === 5 ? 0.5 : i === 3 || i === 7 ? 0.3 : 1) : 0)]);
  ctx.globalAlpha = Math.min(0.92, alpha * 1.75);
  ctx.fillStyle = CORAL;
  ctx.strokeStyle = CORAL;
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  trace(ctx, fish);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = PAPER;
  ctx.beginPath();
  ctx.moveTo(fishX + look * 3.6 * k + 0.7 * k, fishY - 0.7 * k);
  ctx.arc(fishX + look * 3.6 * k, fishY - 0.7 * k, 0.7 * k, 0, TAU);
  ctx.fill();

  // Glass rim and a soft glint.
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = AQUA;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(dx + domeR, dy);
  ctx.arc(dx, dy, domeR, 0, TAU);
  ctx.stroke();
  ctx.globalAlpha = alpha * 0.6;
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.arc(dx, dy, domeR * 0.74, Math.PI * 1.1, Math.PI * 1.42);
  ctx.stroke();

  // 5. Near arm reaching ahead under the dome, capped by the shoulder pad.
  arm(sway, grip, 1);
  part(() => ball([4, -2], 5.0));

  ctx.restore();
}

/**
 * Angler fish in the same native wire geometry as the lanternfish: a body of stacked rings
 * ending in a deep head, an underslung lower jaw hinged at the cheek, needle teeth on both
 * jaws, a rounded tail and an illicium carrying a coral lure.
 */
function anglerMesh() {
  const stations = [[-.50,.030,.024],[-.40,.070,.056],[-.27,.130,.104],[-.12,.200,.160],[.03,.255,.200],[.17,.280,.215],[.30,.272,.205]];
  const vertices = [], lines = [], outline = [[], []], detail = 8;
  for (const [row, [x, radius, depth]] of stations.entries()) {
    const ring = [];
    for (let i = 0; i < detail; i++) {
      const angle = i * TAU / detail;
      ring.push(vertices.length);
      vertices.push([x, Math.cos(angle) * radius, Math.sin(angle) * depth]);
    }
    lines.push([...ring, ring[0]]);
    if (row) for (let i = 0; i < detail; i++) lines.push([ring[i] - detail, ring[i]]);
    outline[0].push(ring[0]); outline[1].push(ring[4]);
  }
  const tailRoot = vertices.push([-.56, 0, 0]) - 1;
  for (const contour of outline) contour.unshift(tailRoot);
  const add = points => { const indices = points.map(point => vertices.push(point) - 1); lines.push(indices); return indices; };
  // Rounded tail fan with fine rays.
  const fan = Array.from({ length: 9 }, (_, i) => {
    const a = Math.PI + (i / 8 - .5) * 1.9;
    return [-.56 + Math.cos(a) * .17, Math.sin(a) * .17, 0];
  });
  add(fan);
  for (const tip of fan) add([[-.55, 0, 0], tip]);
  // Low dorsal spines and a small pectoral fan.
  add([[-.04,-.22,.02],[-.12,-.30,.02],[-.22,-.18,.02]]);
  add([[-.10,-.22,.02],[-.15,-.27,.02]]);
  add([[.12,.10,.20],[.02,.18,.27],[-.02,.08,.24],[.12,.10,.20]]);
  // Upper head: crown to snout, along the centre and both sides, with ribs between.
  const crownCentre = [[.30,-.272,0],[.39,-.25,0],[.45,-.19,0],[.46,-.10,0]];
  const crownSide = s => [[.30,-.21,s*.205],[.35,-.20,s*.17],[.37,-.13,s*.17],[.34,-.03,s*.17]];
  add(crownCentre); add(crownSide(1)); add(crownSide(-1));
  for (let i = 1; i < 4; i++) add([crownSide(-1)[i], crownCentre[i], crownSide(1)[i]]);
  const eye = [.34, -.19, .15], eyeRadius = .028;
  const eyeLine = add(Array.from({ length: 13 }, (_, i) => [eye[0] + Math.cos(i * TAU / 12) * eyeRadius, eye[1] + Math.sin(i * TAU / 12) * eyeRadius, eye[2] + .008]));
  return { vertices, lines, outline, eyeLine, eye, crownCentre };
}
const ANGLER = anglerMesh();
const ANGLER_HINGE = [.24, .10];
const anglerLip = (t, upper) => upper
  ? [.46 - .14 * t * t, -.10 + .09 * t * t, .18 * t]
  : [.57 - .23 * t * t, -.02 + .10 * t * t, .20 * t];
const ANGLER_TEETH = [-.85, -.6, -.35, -.12, .12, .35, .6, .85];

/** Draw the angler like the other deep fish: fine wire mesh, a firmer outline and one coral lure. */
function drawAngler(ctx, x, y, length, time, alpha) {
  const yaw = .3 + .08 * Math.sin(time * .07), cy = Math.cos(yaw), sy = Math.sin(yaw);
  const pitch = .03 * Math.cos(time * .12), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const project = ([px, py, pz]) => {
    const tail = clamp((.2 - px) / .8, 0, 1) ** 1.8;
    pz += tail * .07 * Math.sin(time * 2.6 + px * 5);
    const xx = px * cy + pz * sy, yy = py + pz * .24;
    return [x + (xx * cp - yy * sp) * length, y + (xx * sp + yy * cp) * length];
  };
  // The lower jaw swings slowly open and shut about the cheek hinge.
  const gape = .05 + .25 * (.5 - .5 * Math.cos(time * .9));
  const cg = Math.cos(gape), sg = Math.sin(gape);
  const jaw = ([px, py, pz]) => {
    const dx = px - ANGLER_HINGE[0], dy = py - ANGLER_HINGE[1];
    return [ANGLER_HINGE[0] + dx * cg - dy * sg, ANGLER_HINGE[1] + dx * sg + dy * cg, pz];
  };
  const stroke = (paths, a, width, colour = '#B5C4DF') => {
    ctx.globalAlpha = alpha * a; ctx.lineWidth = width; ctx.strokeStyle = colour; ctx.beginPath();
    for (const path of paths) trace(ctx, path.map(project));
    ctx.stroke();
  };
  const verts = ANGLER.vertices;
  const span = n => Array.from({ length: n }, (_, i) => -1 + 2 * i / (n - 1));
  const upperLip = span(13).map(t => anglerLip(t, true));
  const lowerLip = span(13).map(t => jaw(anglerLip(t, false)));
  // The belly line runs from the body, which stays put, onto the jaw, which swings.
  const chinCentre = [[.30,.272,0], ...[[.42,.24,0],[.52,.14,0],[.57,-.02,0]].map(jaw)];
  const chinSide = s => [[.27,.17,s*.16],[.38,.21,s*.16],[.47,.12,s*.16],[.50,-.005,s*.16]].map(jaw);

  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // The open mouth reads as a dark gap behind the teeth.
  ctx.globalAlpha = alpha * .75; ctx.fillStyle = '#050C1E'; ctx.beginPath();
  trace(ctx, [...upperLip, ...lowerLip.slice().reverse()].map(project)); ctx.closePath(); ctx.fill();

  stroke(ANGLER.lines.map(line => line.map(i => verts[i])), .48, .43);
  stroke([chinSide(1), chinSide(-1), ...[1, 2, 3].map(i => [chinSide(-1)[i], chinCentre[i], chinSide(1)[i]])], .48, .43);
  // Silhouette: back to crown to snout, belly to the underslung chin, and both lips.
  stroke([[...ANGLER.outline[1].map(i => verts[i]), ...ANGLER.crownCentre], [...ANGLER.outline[0].map(i => verts[i]), ...chinCentre], upperLip, lowerLip, ANGLER.eyeLine.map(i => verts[i])], 1, .59);
  // Needle teeth: long and short in turn, raking inwards from both lips.
  const teeth = [];
  for (const [k, t] of ANGLER_TEETH.entries()) {
    const long = k % 2 ? .05 : .085;
    const top = anglerLip(t, true);
    teeth.push([top, [top[0] - .012, top[1] + long, top[2]]]);
    const bottom = anglerLip(t, false);
    teeth.push([jaw(bottom), jaw([bottom[0] - .012, bottom[1] - long * 1.1, bottom[2]])]);
  }
  stroke(teeth, .9, .5, '#E4EBF7');

  ctx.fillStyle = '#C5D7EF';
  ctx.globalAlpha = alpha * .9; ctx.beginPath(); ctx.arc(...project(ANGLER.eye), Math.max(.48, length * .011), 0, TAU); ctx.fill();
  // Illicium: a fine rod arching forward from the crown, swaying a little; the lure glows coral.
  const sway = .02 * Math.sin(time * 1.1);
  const base = project([.24, -.28, 0]), bend = project([.42 + sway, -.56, 0]), lure = project([.62 + sway * 1.5, -.34, 0]);
  ctx.globalAlpha = alpha * .8; ctx.strokeStyle = '#B5C4DF'; ctx.lineWidth = .5; ctx.beginPath();
  trace(ctx, Array.from({ length: 13 }, (_, i) => {
    const t = i / 12, u = 1 - t;
    return [u * u * base[0] + 2 * u * t * bend[0] + t * t * lure[0], u * u * base[1] + 2 * u * t * bend[1] + t * t * lure[1]];
  }));
  ctx.stroke();
  const glow = .65 + .35 * Math.sin(time * 2.2);
  ctx.fillStyle = '#FF6655';
  ctx.globalAlpha = alpha * .35 * glow; ctx.beginPath(); ctx.arc(...lure, length * .045, 0, TAU); ctx.fill();
  ctx.globalAlpha = Math.min(1, alpha * 2.2); ctx.beginPath(); ctx.arc(...lure, Math.max(.9, length * .014), 0, TAU); ctx.fill();
  ctx.restore();
}
