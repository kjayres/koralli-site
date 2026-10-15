const INK = '#244eff';
const PAPER = '#f3f0e8';
const TINT = '#e8ecfa';
const markSprites = new Map();
const TAU = Math.PI * 2;
const random = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const iso = ([x, y, z = 0]) => [Math.sqrt(3) / 2 * (x - y), (x + y) / 2 - z];
const polygon = points => points.map((point, i) => [i ? 'L' : 'M', ...point]).concat([['Z']]);
const plane = points => polygon(points.map(iso));
const path3 = commands => commands.map(([op, ...coordinates]) => {
  const output = [op];
  for (let i = 0; i < coordinates.length; i += 3) output.push(...iso(coordinates.slice(i, i + 3)));
  return output;
});
const grainShade = Array.from({ length: 180 }, (_, i) => ({
  x: -44 + random(i + 40) * 88,
  y: -44 + random(i + 293) * 88,
  radius: .22 + random(i + 971) * .20,
  alpha: .12 + random(i + 1837) * .15,
}));

function pen(ctx, x, y, scale) {
  const alpha = ctx.globalAlpha, tiny = scale * 47 < 10;
  const path = commands => {
    ctx.beginPath();
    for (const [op, ...p] of commands) {
      if (op === 'M') ctx.moveTo(x + p[0] * scale, y + p[1] * scale);
      if (op === 'L') ctx.lineTo(x + p[0] * scale, y + p[1] * scale);
      if (op === 'C') ctx.bezierCurveTo(...p.map((v, i) => (i % 2 ? y : x) + v * scale));
      if (op === 'Z') ctx.closePath();
    }
  };
  const line = (commands, weight = 1, opacity = .82) => {
    path(commands);
    ctx.strokeStyle = INK; ctx.globalAlpha = alpha * opacity;
    ctx.lineWidth = (tiny ? .22 : Math.max(.38, Math.min(.65, scale * .78))) * weight;
    ctx.stroke(); ctx.globalAlpha = alpha;
  };
  const shape = (commands, shade = true, fill = PAPER) => {
    path(commands); ctx.fillStyle = fill; ctx.fill();
    if (shade && !tiny) {
      ctx.save(); ctx.clip();
      path([['M', 1, -46], ['C', -7, -15, 5, 15, 1, 46], ['L', 46, 46], ['L', 46, -46], ['Z']]);
      ctx.fillStyle = TINT; ctx.fill();
      ctx.fillStyle = INK;
      for (const grain of grainShade) {
        ctx.globalAlpha = alpha * grain.alpha;
        ctx.beginPath();
        ctx.arc(x + grain.x * scale, y + grain.y * scale, Math.max(.12, grain.radius * scale), 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
    line(commands);
  };
  return { line, shape, tiny, path };
}

const VOLUME_RIGHT = [Math.SQRT1_2, -Math.SQRT1_2, 0];
const VOLUME_DOWN = [1 / Math.sqrt(6), 1 / Math.sqrt(6), -2 / Math.sqrt(6)];
const VOLUME_VIEW = [1 / Math.sqrt(3), 1 / Math.sqrt(3), 1 / Math.sqrt(3)];
const volumeCache = new Map();
// Baked from the signed-distance models below: shaded pixel runs and visible occlusion edges.
// Geometry remains editable in the model functions; no ray marching runs during page animation.
const bakedVolumes = {"People":"YJz/Gv8a/xr/Gv8a/xqXGgEJWhoBBwUFAQYCBwEJAQpTGgEGAQQDAwMEAgUBBgEHAQkBCgEMUBoBBAEDAQIBAwECBAMBBAIFAQcBCAEJAQsBDE4aAQQCAwMCBAMBBAEFAgYCCAEKAQsBDQEQSxoBBAEDAQIBAwQCAQMBAgIDAgUBBgEHAQgCCgEMAQ4BEkkaAQYCAwYCAgMCBAIFAgcCCQEKAQwBDgEQSBoBCAEEAQMBAgEDAwIBAwECAgMCBAEFAgYBCAEJAQoBCwEMAQ4BDwESRxoBBQEEAwMBAgEDAQICAwQEAgYBBwEIAgkBCwEMAQ4BEAESARRGGgEGAQQEAwICAwMCBAEFAQYBBwEIAgkBCgELAg0BEAERARVFGgEHAQUBBAIDAQQBAwIEAQMCBAIFAQYCBwIIAQkBCgEMAQ0BDgEQARIBFEUaAQgBBgIFAgQBAwMEBAUBBgIHAgkBCgIMAQ0BDwEQARIBFAEVRBoBBwEGAQUGBAQFAgcCCAIJAQsCDAEOAQ8BEQESAhVEGgEIAQcCBgUFAQYBBQIGAgcBCAIJAgsBDAIOARABEgETARQBFUQaAQkCBwEGAQUCBgEFBAYDCAEJAQoCCwEMAQ0BDgEPAREBEgEUAhVEGgEKAggBBwEGAwcBBgEHAwgBCQIKAgsBDAENAQ4BDwIRARMDFUQaAQsBCQIIBAcDCAMJAgsCDAENAg4BEAESARMBFAMVRBoBCwEKAQkBCAEJAwgBCQEIAQoBCQEKAgsCDAENAQ4BDwEQAREBEgETAxUBFEQaAQ4BDAMKBAkDCgILAgwCDgMQARIBEwIUAhVFGgEQAQ0CDAILAQoDCwQMAg0BDgEPARABEQESARMBFQMUARVGGgEPAQ4BDQEMAQsFDAMNAQ4CDwEQAREBEgEUAhUBFAEVAhRGGgESAQ8DDgUNAg4BDwIQARECEgEUAxUCFAEVSBoBEQEQAw8BDgQPAxACEgEUARUBFAEVARQDFQEUSRoBEgQRARABEQIQAhEBEgITBBUBFAMVSxoCEwQSBBMBFAYVARQBFQEUTRoBFAEVBBQBFQEUBBUBFAQVARRPGgMVARQBFQEUAhUCFAIVAxQBFQENURoDFQQUAhUBFAIVAQQBBQEGAQkBDgEJAQpQGgEVAhQBFQEUARUBBQEGAwUBBAEFAQcBCgIMAQ9MGgMFBgYFBQEEAQYBCAENAg4BEkkaAwUBBwEGAwcGBgEFAQYBBwEIAQkBDAERARABEkgaAQQFBgIHAQYDBwMGAgcBCAEJAQoBDQESARUCFEUaAQQBBQIGAQcBBgEHAQYDBwEGAgcBCAIHAQgBCQELAQwBDQEPARMBFgEVARRDGgEFAQQBBQQGAgcBBgYHAggBCQEKAgwBDgEQARIDFQEUQRoBBQEEAwUEBgIHAgYBBwEIAQcCCAEJAgoBDQEOAQ8BEQETAhUBFAMVPxoCBAEDAwUEBgEHAgYCBwIIAgkBCwEMAQ0BDwERARIDFQMUAhU9GgEEAQMBAgIEAQUBBAEFBQYDBwMJAQoCDAEPARABEgEUAhUBFAQVARQBFTwaAQYDAgMDBQUDBgEHAggBCgELAQ0BDgEQAREBEwEUAxUBFAEVARQDFQIUOxoBBAEDBAICAwIEAQUBBgEFAQYBBwEIAQoBCwENAQ4BDwERARMBFAEVARQEFQEUBBUBFAEVOxoBBQEEAgMEAgIDAQUBBgEHAQgBCQEKAQsBDQEPARABEwEUBBUBFAEVBBQEFQIUOhoBBQYDAQIBAwEEAQUBBwEJAQoBCwENAQ8BEAESAhQIFQEUARUBFAQVAhQ5GgELAQQBAwECAQMBBAIDAQIBAwEFAQYBCAELAQwBDgEQAREBEwMUARUDFAEVARQGFQEWARUBFAEVARQ5GgEHAQMCAgIDAwQCBgEIAQsBDQEPAREBEgIVARQBFQEUAhUCFAEVARQCFQEUARUBFAEVARYFFTgaAQQBAgMDAgQBBgEHAQgBCQELAQ0BEAETARQEFQEUBBUCFAMVARQBFQEUAhUBFgQVNxoBBwEDAQICAwEEAgUBBwEJAQoBDAENARABEgEVARQBFQEUARUBFAIVARQEFQEUAxUCFAYVARQBFTYaAQQCAgEDAQQBBQEGAQgBCQELAQ0BDwERARMEFQEUARUBFAEVAhQFFQEUARUBFAEVARQBFQIWAhUDFDYaAQUCAwIFAQYBCAEJAQsBDQEPAREBEwEUAxUDFAQVARQEFQIUARUBFAIVAxYEFDUaAQoBBwIFAQYBBwEIAQoBDAENAg8BEgETARQEFQIUARUEFAEVARQBFQIUARUCFAEVAhYBFwEWARQDFQEUNBoBCgEIAQcBCAEJAQoBCwENAQ4BDwEQAREBEgETAxQBFQEUAxUBFAQVAxQDFQEUARUDFgMVARQBFQEUNBoBCQEHAQgBCQELAQwBDQEPAREBEgQTAxUCFAIVARQDFQEUAhUCFAQVARQBFgEXAhYFFQEUMxoCCAEJAgoBDAEOARABEgETARQCEwEUAxUCFAIVARQBFQEUARUDFAEVAxQCFQEUARgBFwIWARUCFAIVARQzGgEIAQcCCQELAQ0BDgEQARIDFAETAhQBFQEUAxUDFAYVAhQCFQIUAhkBFwIVAhQBFQEUARUzGgEIAQcCCQELAQ0BDwERARMCFQIUARMBFAEVARQCFQIUARUCFAIVBBQCFQMUARkBGAEXARYCFQEUBBUxGgEKAggCCQELAQ0BDwERARMDFQMUARUBFAMVARQCFQEUARUFFAIVARQCFQIZAhYDFQEUARUCFDEaAQkCBwEIAQoBDAENAQ8BEgIVARYBFQEUARMBFQEUARUCFAIVAxQCFQEUBxUBFAEZARgCFwEWAhUCFAEVARQxGgIIAgkBCgELAQ0BEAESBBUCFAEVARQDFQIUARUCFAEVARQDFQEUARUCFAIVAhgBFwEWAhUBFAEVARQBFQEUARUwGgIIAgkBCgEMAQ4BEAETARQCFQEWAxQEFQIUAxUBFAEVBRQBFQEUAhUBFwIYARcCFQEUAhUCFAEVMBoDCAEKAQsBDAEOARABEwQVARQBEwMVARQBFQIUBhUDFAQVARQBGgMXBBUBFAEVARQBFQEULxoDCAIKAQwBDwERARMBFQIWARUBFAETARQFFQMUAhUCFAEVARQBFQIUARUCFAEaAhcBFgIVARQDFQEUARUBFC4aAQsCCAIJAQsBDAEPAREBEwEVAhYBFAITBRQCFQEUAhUDFAgVARoBFQIXARYEFQMUARUuGgEJAggBCQEKAQwBDQEPAREBFAEVAhYBFAITAhQBFQIUARUBFAIVAhQBFQEUCBUCGgIXARYBFQIUARUCFAEVARQuGgEJAQgBCQEIAQoBDAEOARABEgEUARUBFgEVARQCEwEVARQBFQEUARUEFAUVARQBFQMUARUBFAIaARUCFgcVARQuGgMIAQkBCwEMAQ4BEAESARQBFQIWAxMBFQEUAxUCFAIVARQCFQEUARUCFAEVARQDFQMaARcCFgIUARUCFAIVLhoBCQEHAQgBCgELAQ0BDgEQARICFQEXARUDEwIUCBUBFAEVARQCFQEUAxUBFAEVAxoBFQEWARUDFAMVLxoBCAEHAQgBCQELAQ0BDwERARMBFAIWARUBEwESARMBFAQVAhQBFQEUARUBFAYVARQBFQEUARUEGgEXAhYCFQEUARUvGgELAwgBCgELAQ0BDwERARQCFQEXARQDEgIUBRUEFAEVARQDFQEUARUCFAEVBhoBFgEVAhQwGgEJAwgBCgELAQ0BDwERARQBFQEWARUBFAESAREBEwEUAhUBFAEVAxQDFQIUAhUCFAEVAxQ6GgMIAQkBCgEMAQ4BEAESARQBFQEWARQBEwISARMDFAgVARQFFQEUAxU6GgEJAQgCCQEKAQwBDgEQARIBFQMUARMDEgIVARQDFQIUARUDFAEVARQDFQEUAxU6GgMIAQkBCgEMAQ4BEAESAxQBEwQSARQDFQEUARUDFAEVARQBFQMUARUBFAIVARQBFToaAwgBCgELAQwBDwEQARQCFQITAhIBEQESARQHFQEUAhUEFAEVAhQDFToaAggCCQELAQ0BDwERARMBFQEUARIBEwMSARMCFQEUARUCFAIVARQBFQEUAxUBFAEVARQCFQIUORoBCgIIAQkBCgELAQ0BDwERAhQBFQISAhECEgQVAxQBFQEUARUBFAMVARQBFQIUAxU5GgEJAQcBCAEJAQoBCwEOAQ8BEgEUARUBEQETAhIBEQISARQBFQEUAhUBFAEVBBQBFQEUAhUBFAEVARQCFToaAwgBCQEKAQsBDgEPARMBFQEUAREBEwQSARMBFAEVAhQCFQIUBBUBFAEVAhQDFTsaAggCCQEKAQ0BDgEQARIBFQEUAREFEgETARUDFAYVARQCFQMUARUBFAEVOxoCCAIJAQoBDAEPARABEwIUARABEgERAhIBEQESBBQCFQEUAxUDFAEVARQEFTsaAwgBCQELAQ0BDwERARMCFQEQAhEBEgIRARMDFQEUARUDFAEVAhQEFQEUAxU6GgEJAgcBCQEKAQsBDQEPARIBEwIVARAFEQETAxQEFQEUARUBFAYVARQCFToaAwgBCQEKAQsBDQEPARIBFQEUARUGEQESARQCFQMUAxUBEgMTAhQBFQEUAhU6GgEIAQcBCAEJAQsBDAENARABEgIVARABEQEQAREBEgERAhICFAMVARQCFQESBBEBEgEUAhUBFAEVOhoBCQEHAQgBCQEKAQwBDgEQARICFQISARAEEQESARQBFQQUAQ8BEQESAxECEgEUBBU6GgEIAQcCCQEKAQwBDwERARMCFQMUARMBEgIRARMBFAEVAhQCFQEPARAFEQESAxQBFQEUOhoBCAEHAQkBCgELAQwBDwERARQCFQEaARUBFAIVAhQCFQEUAhUBFAEaAQ8BEQESBBEBEwEUARUBFAEVARQ5GgELAggCCQELAQ0BDwESAhQBFQEaARABEwQVAhQCFQIUARoBDgURAhIBEwIUAhU5GgENAQgBBwEJAQoBCwENAQ8BEQEVAhQBGgENAQ8BEwYVARQCFQEaAQ8BEAISAxEBEgETARQDFToaAQsBCgEJAQoBDAEOARABEQIVAhoBDAENAQ8BEQETAxUBFAMVARoBDgEQBBECEgIUARUBFAEVOhoBDwMNAQ4BEAERARQBFQEUAhoBDAENAg4BDwISARMCFAIVARoBDwERAhIBEAERAhIBEwIVAhQ7GgESARABEQESARMCFAEVAxoCDAENAQ4BDwEQARIBEwIUARUBFAEaAQ4BEAIRAhABEQESARMBFQIUARU8GgEVAhQDFQQaAgwBDQEOAhABEgETARQDFQEaAQ4BEAIRARIBEAERARIBEwIVARQBFT4aARQBFQYaAgwCDgEPAREBEgETARQBFQIUARoBDgEQBREBEgETAxUBFEYaAgwBDQEOAQ8BEAERARMEFAEaAQ4BEAISBBEBEwEVARQBFQEURhoBDAINAQ4BDwEQAREBEwEUAxUBGgENBhECEwEVARQCFUYaAQwCDQEOAQ8BEAERARIBEwMVARoBDQEQAhEBEAIRARIBEwIVAhRGGgMMAg4BEAESAhMBFQEUARUBGgENARABEQESAxEBEgMUARUBFEYaAwwBDgEPARABEQESAhQBFQEUARoBDQEQARIBEQESARECEgETBBVGGgIMAQ0BDgEPARABEQESARQBFQEUARUBGgEOARABEQESAREBEAERARIBEwIVAhRGGgEMAg0BDgEPARABEQESARQCFQEUARUBDgEQBBEBEgERARMBFQEUARUBFEYaAgwCDQEOARABEQITBBUBGgERARIEEQESARMEFEYaAw0CDgEQAREBEgETARQCFQEUARoBEAESAREBEAIRARICFAMVRhoCDAENAQ4BDwEQAREBEgMUARUBFAEaARABEgURARMBFAMVRhoCDAENAQ4BDwEQAREBEwEUAhUCFAEaARABEQESBBEBEwEUARUBFAEVRhoCDAENAQ4CDwERARIBEwQVARoHEQETARQBFQIURhoBDAENAQwBDgIPAREBEgETARUBFAEVARQBGgEQBBECEgETARUBFAEVARRGGgEMAw0BDwEQAREBEgETARUBFAEVARQBGgEQAxEBEAIRAhQBFQIURhoDDQEOAQ8BEAERAhMBFAMVARoBEAERARICEQEQARIBEwIUAhVGGgIMAg0BDgEPARABEwIUAhUBFAEaARAFEQESARMBFQIUARVGGgIMAQ0CDgEQAREBEgETARQDFQEaARABEQISARABEQISAxUBFEYaAQ0BDAINAQ8BEAERARIBEwEVAxQBGgEQARICEQEQAhEBEwEUAhUBFEYaBA0BDwEQAREBEgEUARUDFAEaARIGEQETARUBFAIVRhoBDAINAg4BDwERARIBEwEUAhUBFAIaAhMCEQISARMBFAEVARRHGgIMAQ0BDgIPARABEgETBBUCGgEWARUDFAEVAxRIGgMMAg4BDwERARIBFAEVAxQEGgEVARYBFAEVARQBFUkaAQ0BDAENAg4BEAERARIBEwEUAxVTGgIMAQ0CDgEPAREBEgIUAhUBFFMaAw0BDgIPAREBEgETARQDFVQaAQ0BDAEOAg8BEAESAhQBFQIUVBoBDgINAg8BEQESAhQBFQEUVhoBEQEPAhABEQETAhUBFAEVVxoBFAETARQBFQEUAhUBFFkaAhUCFAEV/xr/Gv8a/xr/Gv8a+RoHDv4Nvw7BDtEO0w68Dn0PmQ89EGAQIxEkEecRvBF8Ej0TqhJuEzEUMBTAFLYVeBY6F/wXvhiAGUIa0BqSG4YcGB0JHggeyB5JIOsgCSELIbEhxyEIIckhCiHLIc0heSJ7In0ifyKBIoMihSKHIsghiSLQIZMilSKXIjsjPSM/I0EjQyOEIkUjliJZI1ojHSS3JB4k4CTkJKIlpCWmJfMmZCZmJrEnJicoJywn6CfqJ6oorChsKW4pdCkuKjAq8CryKvoqsiu0KzQsdCx2LDYtOC1CLfgt+i26LrwuyC58L34vPjBAMAAxEDHCMYQyljJGMwg0yjTeNEY1jDVONhA3JjfSN6w4GzrQORw6KjzsPK49Wj5wPjI/8z/yP7RAdkE4QvpCvEN9RHxEPkUzRgBGMkb1RsJGq0etR/RGhEeqR2tIbUi2R0ZIKUlqSCtJeEgGSQhJyUnnSShJ6Uk6SchJ5kmnSuhJqUr8SYpKpkpnS75KTEtmS2hLgEtCTLpMBE18TZBNxk1yTjRP9k9PUVFRuFB6UTxS/lLAU4JURFUGVsRWxlbIVoZXSFgKWcxZjlpQWxJc1FyWXVheGl+IYEphDGLOYpBjUmQ="};
const blendDistance = (a, b, width) => {
  const h = Math.max(width - Math.abs(a - b), 0) / width;
  return Math.min(a, b) - h * h * width * .25;
};
function capsuleDistance(x, y, z, a, b, radius) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy + (z - a[2]) * dz) / (dx * dx + dy * dy + dz * dz)));
  return Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t, z - a[2] - dz * t) - radius;
}
function humanDistance(x, y, z) {
  const qx = Math.abs(x) - 1.6, qy = Math.abs(y) - 5.6, qz = Math.abs(z - 34) - 10;
  let body = Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - 2.2;
  for (const side of [-1, 1]) {
    body = blendDistance(body, capsuleDistance(x, y, z, [0, side * 8.2, 42], [1.5, side * 13.5, 25], 2.45), 1.6);
    body = blendDistance(body, capsuleDistance(x, y, z, [.3, side * 4.2, 25], [.8, side * 4.2, 3.7], 2.75), 1.6);
  }
  return Math.min(body, Math.hypot(x - 1.1, y, z - 56.5) - 6.3);
}
// Ray-march the authored solid once. Frames only reuse its shaded rows and contours.
function createVolume(field, { width = 96, height = 156, step = .5, zoom = 1.12, offsetY = 25, centreZ = 32, bound = 42 } = {}) {
  const values = new Int16Array(width * height).fill(-1), depths = new Float32Array(width * height), normals = new Float32Array(width * height * 3);
  const left = -width * step / 2, top = -height * step / 2;
  const light = [-.16, .43, .889];
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const sx = (left + (col + .5) * step) / zoom, sy = (top + (row + .5) * step) / zoom - offsetY;
      const perpendicular = sx * sx + (sy + centreZ * 2 / Math.sqrt(6)) ** 2;
      if (perpendicular >= bound * bound) continue;
      const extent = Math.sqrt(bound * bound - perpendicular), centre = 100 - centreZ / Math.sqrt(3);
      let travel = centre - extent, px, py, pz, hit = false;
      for (let march = 0; march < 72 && travel <= centre + extent; march++) {
        px = VOLUME_RIGHT[0] * sx + VOLUME_DOWN[0] * sy + VOLUME_VIEW[0] * (100 - travel);
        py = VOLUME_RIGHT[1] * sx + VOLUME_DOWN[1] * sy + VOLUME_VIEW[1] * (100 - travel);
        pz = VOLUME_DOWN[2] * sy + VOLUME_VIEW[2] * (100 - travel);
        const d = field(px, py, pz);
        if (d < .035) { hit = true; break; }
        travel += Math.max(.035, d);
      }
      if (!hit) continue;
      const e = .05;
      let nx = field(px + e, py, pz) - field(px - e, py, pz);
      let ny = field(px, py + e, pz) - field(px, py - e, pz);
      let nz = field(px, py, pz + e) - field(px, py, pz - e);
      const length = Math.hypot(nx, ny, nz); nx /= length; ny /= length; nz /= length;
      depths[row * width + col] = travel;
      normals.set([nx, ny, nz], (row * width + col) * 3);
      const diffuse = Math.max(0, nx * light[0] + ny * light[1] + nz * light[2]);
      const crevice = Math.max(0, 1 - field(px + nx * 3, py + ny * 3, pz + nz * 3) / 3);
      const shade = .025 + .255 * (1 - diffuse) + .06 * crevice + .016 * (random(row * width + col + 97) - .5);
      values[row * width + col] = Math.min(25, Math.max(0, Math.round(shade / .34 * 25)));
    }
  }
  const creases = [], occupied = (x, y) => x >= 0 && x < width && y >= 0 && y < height && values[y * width + x] >= 0;
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      if (!occupied(col, row)) continue;
      for (const [dx, dy] of [[1, 0], [0, 1]]) {
        if (!occupied(col + dx, row + dy)) continue;
        const i = row * width + col, j = (row + dy) * width + col + dx;
        const dot = normals[i * 3] * normals[j * 3] + normals[i * 3 + 1] * normals[j * 3 + 1] + normals[i * 3 + 2] * normals[j * 3 + 2];
        if (Math.abs(depths[i] - depths[j]) < 1.1 && dot > .4) continue;
        const px = left + (col + dx) * step, py = top + (row + dy) * step;
        creases.push(['M', px, py], ['L', px + dy * step, py + dx * step]);
      }
    }
  }
  return traceVolume(values, width, height, step, creases);
}
function traceVolume(values, width, height, step, creases) {
  const left = -width * step / 2, top = -height * step / 2;
  const rows = [], edges = new Map(), occupied = (x, y) => x >= 0 && x < width && y >= 0 && y < height && values[y * width + x] >= 0;
  const edge = (x1, y1, x2, y2) => {
    const key = y1 * (width + 1) + x1, next = y2 * (width + 1) + x2;
    if (!edges.has(key)) edges.set(key, []);
    edges.get(key).push(next);
  };
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width;) {
      const shade = values[row * width + col], start = col++;
      while (col < width && values[row * width + col] === shade) col++;
      if (shade >= 0) rows.push([left + start * step, top + row * step, (col - start) * step, shade]);
    }
    for (let col = 0; col < width; col++) {
      if (!occupied(col, row)) continue;
      if (!occupied(col, row - 1)) edge(col, row, col + 1, row);
      if (!occupied(col + 1, row)) edge(col + 1, row, col + 1, row + 1);
      if (!occupied(col, row + 1)) edge(col + 1, row + 1, col, row + 1);
      if (!occupied(col - 1, row)) edge(col, row + 1, col, row);
    }
  }
  const contours = [];
  while (edges.size) {
    const first = edges.keys().next().value, points = [];
    let current = first;
    do {
      points.push([left + current % (width + 1) * step, top + Math.floor(current / (width + 1)) * step]);
      const next = edges.get(current);
      if (!next) break;
      const target = next.pop(); if (!next.length) edges.delete(current);
      current = target;
    } while (current !== first);
    if (points.length < 4) continue;
    const smooth = points.filter((_, i) => i % 2 === 0).map((_, i) => {
      const at = i * 2, previous = points[(at + points.length - 1) % points.length], next = points[(at + 1) % points.length];
      return [(previous[0] + points[at][0] * 2 + next[0]) / 4, (previous[1] + points[at][1] * 2 + next[1]) / 4];
    });
    const commands = [['M', ...smooth[0]]];
    for (let i = 0; i < smooth.length; i++) {
      const a = smooth[(i + smooth.length - 1) % smooth.length], b = smooth[i], c = smooth[(i + 1) % smooth.length], d = smooth[(i + 2) % smooth.length];
      commands.push(['C', b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6, c[0] - (d[0] - b[0]) / 6, c[1] - (d[1] - b[1]) / 6, ...c]);
    }
    commands.push(['Z']); contours.push(commands);
  }
  const colours = Array.from({ length: 26 }, (_, i) => 'rgb(' + [243, 240, 232].map((base, channel) => Math.round(base + ([36, 78, 255][channel] - base) * i / 25 * .16)).join(',') + ')');
  return { rows, contours, creases, colours, step, sprite: null };
}
function paintVolume(ctx, x, y, scale, volume, tiny = false) {
  const p = pen(ctx, x, y, scale);
  ctx.save();
  for (const contour of volume.contours) { p.path(contour); ctx.fillStyle = PAPER; ctx.fill(); }
  if (!tiny) {
    for (const [u, v, width, shade] of volume.rows) {
      ctx.fillStyle = volume.colours[shade]; ctx.fillRect(x + u * scale, y + v * scale, width * scale, volume.step * scale);
    }
  }
  for (const contour of volume.contours) p.line(contour, .95, .8);
  if (!tiny && volume.creases.length) p.line(volume.creases, .55, .5);
  ctx.restore();
}
function readVolume(encoded) {
  const bytes = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
  const width = bytes[0], height = bytes[1], step = .5, values = new Int16Array(width * height);
  let cursor = 2, filled = 0;
  while (filled < values.length) {
    const count = bytes[cursor++], shade = bytes[cursor++];
    values.fill(shade === 26 ? -1 : shade, filled, filled + count); filled += count;
  }
  const creases = [], left = -width * step / 2, top = -height * step / 2;
  while (cursor < bytes.length) {
    const packed = bytes[cursor++] | bytes[cursor++] << 8, vertex = Math.floor(packed / 2);
    const px = left + vertex % (width + 1) * step, py = top + Math.floor(vertex / (width + 1)) * step;
    creases.push(['M', px, py], ['L', px + (packed % 2 ? step : 0), py + (packed % 2 ? 0 : step)]);
  }
  return traceVolume(values, width, height, step, creases);
}
function drawVolume(ctx, x, y, scale, kind) {
  if (!volumeCache.has(kind)) volumeCache.set(kind, readVolume(bakedVolumes[kind]));
  const volume = volumeCache.get(kind);
  if (typeof OffscreenCanvas !== 'undefined' && typeof ctx.drawImage === 'function') {
    if (!volume.sprite) {
      volume.sprite = new OffscreenCanvas(188, 188);
      paintVolume(volume.sprite.getContext('2d'), 94, 94, 2, volume);
    }
    ctx.drawImage(volume.sprite, x - 47 * scale, y - 47 * scale, 94 * scale, 94 * scale);
  } else paintVolume(ctx, x, y, scale, volume, scale * 47 < 10);
}
function human(ctx, x, y, scale) {
  drawVolume(ctx, x, y + 2 * scale, scale * .88, 'People');
}

/*
 * Handshake contours adapted from Lucide's handshake.svg with uniform scaling.
 * https://github.com/lucide-icons/lucide/blob/main/icons/handshake.svg
 * ISC License
 *
 * Copyright (c) 2026 Lucide Icons and Contributors
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */
const handshakeLines = [[["M",-2.65,13.25],["L",2.65,18.55],["C",4.845,20.745,8.405,20.745,10.6,18.55],["C",12.795,16.355,12.795,12.795,10.6,10.6]],[["M",5.3,5.3],["L",11.925,11.925],["C",14.12,14.12,17.68,14.12,19.875,11.925],["C",22.07,9.73,22.07,6.17,19.875,3.975],["L",9.593,-6.307],["C",6.489,-9.407,1.461,-9.407,-1.643,-6.307],["L",-3.975,-3.975],["C",-6.17,-1.78,-9.73,-1.78,-11.925,-3.975],["C",-14.12,-6.17,-14.12,-9.73,-11.925,-11.925],["L",-4.478,-19.371],["C",0.495,-24.332,8.202,-25.282,14.231,-21.677],["L",15.476,-20.935],["C",16.604,-20.254,17.946,-20.018,19.239,-20.272],["L",23.85,-21.2]],[["M",23.85,-23.85],["L",26.5,5.3],["L",21.2,5.3]],[["M",-23.85,-23.85],["L",-26.5,5.3],["L",-9.275,22.525],["C",-7.08,24.72,-3.52,24.72,-1.325,22.525],["C",0.87,20.33,0.87,16.77,-1.325,14.575]],[["M",-23.85,-21.2],["L",-2.65,-21.2]]];
const handshakeFaces = [[["M",-23.85,-21.2],["L",-2.65,-21.2],["L",-4.478,-19.371],["L",-11.925,-11.925],["C",-14.12,-9.73,-14.12,-6.17,-11.925,-3.975],["C",-9.73,-1.78,-6.17,-1.78,-3.975,-3.975],["L",-1.643,-6.307],["C",1.461,-9.407,6.489,-9.407,9.593,-6.307],["L",19.875,3.975],["C",22.07,6.17,22.07,9.73,19.875,11.925],["C",17.68,14.12,14.12,14.12,11.925,11.925],["L",10.6,10.6],["C",12.795,12.795,12.795,16.355,10.6,18.55],["C",8.405,20.745,4.845,20.745,2.65,18.55],["L",-1.325,14.575],["C",0.87,16.77,0.87,20.33,-1.325,22.525],["C",-3.52,24.72,-7.08,24.72,-9.275,22.525],["L",-26.5,5.3],["Z"]],[["M",23.85,-21.2],["L",19.239,-20.272],["C",17.946,-20.018,16.604,-20.254,15.476,-20.935],["L",14.231,-21.677],["C",8.202,-25.282,0.495,-24.332,-4.478,-19.371],["L",-11.925,-11.925],["C",-14.12,-9.73,-14.12,-6.17,-11.925,-3.975],["C",-9.73,-1.78,-6.17,-1.78,-3.975,-3.975],["L",-1.643,-6.307],["C",1.461,-9.407,6.489,-9.407,9.593,-6.307],["L",21.2,5.3],["L",26.5,5.3],["Z"]]];

function handshake(ctx, x, y, scale) {
  const p = pen(ctx, x, y, scale), alpha = ctx.globalAlpha;
  ctx.save();
  for (const [index, face] of handshakeFaces.entries()) {
    p.path(face); ctx.fillStyle = index ? '#e8ecf7' : PAPER; ctx.fill();
    if (!p.tiny) {
      ctx.save(); ctx.clip(); ctx.fillStyle = INK;
      for (const grain of grainShade) {
        if (grain.y < 1 || grain.x < -18) continue;
        ctx.globalAlpha = alpha * .10;
        ctx.beginPath(); ctx.arc(x + grain.x * scale, y + grain.y * scale, Math.max(.12, grain.radius * scale), 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
  }
  for (const line of handshakeLines) p.line(line, 1, .84);
  ctx.restore();
}

function tile(p, cx, cy, width = 17, depth = 13, height = 3) {
  const x0 = cx - width / 2, x1 = cx + width / 2, y0 = cy - depth / 2, y1 = cy + depth / 2;
  p.shape(plane([[x1, y0, 0], [x1, y1, 0], [x1, y1, height], [x1, y0, height]]), false, '#dae3fb');
  p.shape(plane([[x0, y1, 0], [x1, y1, 0], [x1, y1, height], [x0, y1, height]]), false, TINT);
  p.shape(plane([[x0, y0, height], [x1, y0, height], [x1, y1, height], [x0, y1, height]]));
  if (!p.tiny) {
    for (const inset of [-2, 2]) p.line(path3([['M', x0 + 4, cy + inset, height], ['L', x1 - 4, cy + inset, height]]), .6, .43);
  }
}

function book(p) {
  for (const side of [-1, 1]) {
    p.shape(plane([[0, -22.5, -1.5], [side * 25.5, -22.5, 3.5], [side * 25.5, 22.5, 3.5], [0, 22.5, -1.5]]), false, TINT);
  }
  for (const side of [-1, 1]) {
    p.shape(path3([
      ['M', 0, -21, 2], ['C', side * 8, -21, 7, side * 17, -21, 8, side * 24, -21, 7],
      ['L', side * 24, 21, 7], ['C', side * 17, 21, 8, side * 8, 21, 7, 0, 21, 2], ['Z'],
    ]));
    if (!p.tiny) {
      for (const row of [-11, 0, 11]) p.line(path3([
        ['M', side * 5, row, 5.4], ['C', side * 10, row, 7.2, side * 15, row, 7.8, side * 20, row, 7.4],
      ]), .6, .43);
    }
  }
}

/** One orthographic isometric view for the field marks and their magnified objects. */
export function drawInspectionObject(ctx, x, y, radius, kind, useCache = true) {
  if (!(radius > 0)) return;
  // The small field marks share five cached drawings instead of repeating hundreds
  // of tiny paths per frame. Enlarged objects retain their native vector contours.
  if (useCache && radius < 8 && typeof OffscreenCanvas !== 'undefined' && typeof ctx.drawImage === 'function') {
    if (!markSprites.has(kind)) {
      const canvas = new OffscreenCanvas(40, 40), sprite = canvas.getContext('2d');
      if (sprite) {
        sprite.scale(4, 4);
        drawInspectionObject(sprite, 5, 5, 3, kind, false);
        markSprites.set(kind, canvas);
      }
    }
    const sprite = markSprites.get(kind);
    if (sprite) {
      const size = 10 * radius / 3;
      ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
      return;
    }
  }
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const scale = radius / 47, p = pen(ctx, x, y, scale);
  if (kind === 'People') {
    human(ctx, x, y, scale);
  } else if (kind === 'Relationships') {
    handshake(ctx, x, y, scale);
  } else if (kind === 'Records') {
    book(p);
  } else if (kind === 'Processes') {
    p.line(path3([['M', -27, 3, 1], ['L', -1, -14, 1], ['L', 26, 5, 1]]), .8, .64);
    tile(p, -27, 3); tile(p, -1, -14); tile(p, 26, 5);
  } else if (kind === 'Decisions') {
    p.line(path3([['M', 0, -38, 1], ['L', 0, -14, 1]]), .8, .64);
    p.line(path3([['M', -9, -14, 1], ['L', -23, -14, 1], ['L', -23, 16, 1]]), .8, .64);
    p.line(path3([['M', 9, -14, 1], ['L', 23, -14, 1], ['L', 23, 16, 1]]), .8, .64);
    tile(p, 0, -14, 22, 22, 3);
    tile(p, -23, 16, 12, 12, 2); tile(p, 23, 16, 12, 12, 2);
  }
  ctx.restore();
}
