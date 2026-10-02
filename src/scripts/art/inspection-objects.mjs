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

function oval(cx, cy, rx, ry) {
  const k = .55228475;
  return [
    ['M', cx + rx, cy], ['C', cx + rx, cy + ry * k, cx + rx * k, cy + ry, cx, cy + ry],
    ['C', cx - rx * k, cy + ry, cx - rx, cy + ry * k, cx - rx, cy],
    ['C', cx - rx, cy - ry * k, cx - rx * k, cy - ry, cx, cy - ry],
    ['C', cx + rx * k, cy - ry, cx + rx, cy - ry * k, cx + rx, cy], ['Z'],
  ];
}

const VOLUME_RIGHT = [Math.SQRT1_2, -Math.SQRT1_2, 0];
const VOLUME_DOWN = [1 / Math.sqrt(6), 1 / Math.sqrt(6), -2 / Math.sqrt(6)];
const VOLUME_VIEW = [1 / Math.sqrt(3), 1 / Math.sqrt(3), 1 / Math.sqrt(3)];
const volumeCache = new Map();
// Baked from the signed-distance models below: shaded pixel runs and visible occlusion edges.
// Geometry remains editable in the model functions; no ray marching runs during page animation.
const bakedVolumes = {"People":"YJz/Gv8azhoBBgIFAgQBBQEGAgcBCAEKUxoCBAMDAgQCBQIGAQcBCAEJAQsBDU4aAQYBAwEEAgICAwEEAQMCBAEFAQYCBwEIAQoBCwEMTBoBBQEDBAIBAwECAgMBBAEDAgUBBgEHAQgBCQEKAQsBDkoaAQUBAwYCBAMBBAEFAwYCCAEKAQsBDAEOSBoBBQEEAQMBAgEDBQIDAwIEAQUBBgEHAggBCgELAQwBDQEPRhoBBgEFAQMHAgMDAgQCBQIGAQcBCAEJAQoBDAENAQ8BEUUaAQUBBAECAQMFAgQDAgQCBQEGAQcCCAEKAQsBDAENAQ4BEAETQxoBBwEFAgMGAgQDAgQCBQEGAQcCCAIKAQwBDQEOARABE0MaAQYBBQEEAQMBAgEDAQIGAwMEAQUBBgEHAggCCgELAQwBDQEPARABEgEVQRoBCAEGAgQGAwEEAQMDBAIFAQYDBwEIAQkBCgELAg0BDwERARIBFUEaAQgBBgEFAwQBAwEEAQMEBAMFAQYCBwIIAQkBCgILAQwBDgEPAREBEwEVQRoBCAEGAgUDBAEDBAQCBQIGAwcBCAEJAQoCCwEMAQ0BDgEQAREBEwIUQBoBCAEGAQUBBgQEAQUBBAIFBAYCBwEIAQkBCgILAQwBDQEOAQ8BEAESARMCFUAaAQgCBwMFAQQFBQEGAwcBCAMJAgsBDAINAQ4BDwERARMCFAEVQBoBCQEIAwYDBQUGAwcBCAIJAQoBCwEMAg0BDgEPARABEgETARQCFUAaAQkCCAIHAQYEBwEGAgcDCAEJAgoCCwINAQ4BDwEQAREBEgEUARUCFEAaAgoCCAMHAQgDBwMIAgkCCgILAQwBDQEOAQ8BEAIRARMBFAEVARQBFUAaAQsBCgEJAQgBCQQIAQkBCAIJBAoBCwEMAg0CDgIQARIBEwIUARUBFAEVQBoBDQELAgoHCQQKAQsCDAENAg4CDwEQAhICFAEVARQBFUEaAQ8BDQELBwoBCwEKAwsBDAINAg4CDwEQAREBEgEUBRVCGgEOAQ0BDAELAQwGCwIMAQ0BDAENAg4CEAERAhIBEwIVAhQCFUIaAQ8CDgENBgwEDQEOAg8CEAERARICEwEVAxQCFUQaARABDwMOAw0CDgENAg4CDwEQAhEDEwEVAhQCFQEUARVEGgESAhABDwUOAw8BEAERARABEQESAhMEFAQVRhoCEgERBBABDwEQAxECEgITAhQBFQIUARUBFAMVRxoCEwESBBEBEgERAxICFAIVARQBFQIUBBVJGgIUBRMBFAETARQDFQMUAhUDFAEVSxoBFQQUAhUBFAEVARQBFQEUBBUCFAEVARRNGgEVARQGFQYUAxVRGgQUARUDFAEVARQBFQEUARVWGgIUAxUBFAEV/xofGgEFAQQBBQIGAgcBCAEHAggBCVIaAQUDBAEDAwUDBgEHAQgBCQIKAQ1NGgEFAgQBAwMEAgMBBAIFAQYCBwEIAgoBDAEOShoBBgEEAwMIBAIFAQYBBwIJAgwBDQEQSBoFBAEDCgQBBQEGAQgBCgEMAQ0BDwEQARRFGgEFAQMMBAEDAwQBBgEHAQkBCgINAQ8BEQEUQxoBBQEEAQMEBAEDCgQBBQEGAgcBCQELAQ0BDwERARMBFAEVQRoBBQEDAQQBAwcEAQMEBAIFAwYCCAEKAQwBDQEQAREBEwIVPxoCBAEDBQQBAwgEAQYBBQEGAgcBCAIJAQsBDAEPARABEgIVAhQ8GgEFCAQBAwIEAQMEBAIFAQYCBwEIAgkBCgELAQwBDQEQARIBEwEUAxU6GgEFAgQBAwoEAgMBBAIFAgYBBwIIAgoBCwEMAQ0BDgEPARABEwUVARQ4GgEEAwMBBAEDAgUGBAEDAQQCBQIGAgcDCQILAQwBDQEOAQ8BEAESARQCFQIUAhU3GgEEAQICAwECAQMDBAIFBAQDBQMHAQgCCQILAQwBDQEOAQ8BEAERARMDFAQVARQBFTUaAQUBAwQCAwMDBAEFAQQDBQIGAQcCCAEJAQoCCwEMAQ0BDwEQAhEBEwEUAxUCFAQVNBoBBgEDBQIDAwIEAQMEBQIGAQgCCQIKAQsCDQEOAQ8BEQESARMCFAEVARQBFQEUBxUzGgEEAQMEAgEDAgICAwMEAQUBBwEGAggBCQIKAQsBDAENAQ4BDwEQAhIFFAEVARQGFQEUARUyGgEHAQMFAgUDAQQDBQEHAQgBCQIKAQsBDAENAQ4BDwEQAREBEgETAxUBFAEVAxQJFTEaAQUDAwMCAQMBBAMDAQQCBQEGAQgBCQEKAgsBDAENAQ4BDwIRARMBFAEVARQFFQEUARUCFAQVAhQBFTEaAQQBAgEDAgIEAwMEAQYBBQEHAggBCgIMAg4BDwEQAREBEwMUARUBFAIVARQBFQIUBBUBFgMVAhQBFS8aAQYBBAEDAQIBAwECAwMCBAEFAgYBBwEIAQkBCgEMAQ0BDgEPARACEgEUAxUCFAMVARQBFQEUBBUCFgMVARQBFQEULxoBBgEEBAMBBAEDAwUCBgEHAgkBCgELAQ0BDgIQARIBEwEUARUBFAQVARQDFQUUARUCFgMVARQBFQIULhoBBgEEAQMBAgEDAwQBBQEGAgcCCAIKAQwBDQEOARABEgETAhQBFQIUBRUBFAEVARQBFQIUAxUBFgMVARQEFS4aAQYFBAMGAQcBCAIJAgsCDQEOARABEQETAhQEFQEUBBUCFAEVARQBFQEUAhUBFgQVARQEFQEULBoBCQIGBAUBBgMIAgoCDAENAQ4BDwEQARIBEwEVAhQBFQQUARUBFAEVAhQBFQIUARUCFAEVARYBFQIWARUBFAQVARQsGgEJBAcBBgEHAQgBCQEKAgsBDAENAg4BEAERARIBEwEVARQDFQEUBBUDFAMVARQCFQEUAhUCFgcVARQBFSsaAQgBBgMHAQgBCQEKAQsCDAENAQ4BDwIRARIBFAIVAhQCFQEUAxUBFAIVAhQEFQEUARUCFAEWARUDFgQVARQBFQEUKxoBCAEGAgcBCAEJAgsCDQIPAhEBEgETAhQCFQIUAhUBFAEVARQBFQMUARUDFAIVARQBFQEUARUFFgUVAhQBFSoaAQgCBwIIAgoBCwENAQ4BDwEQAhICEwEUAhUBFAMVAxQGFQIUAhUCFAQVBBYCFQIUARUCFAEVKhoDBwIIAgoBDAEOAQ8BEAERARICEwIUAhUBFAIVAhQBFQIUAhUEFAIVAxQBFQEUARUBFwUWAhUBFAEVARQBFQIUKBoBCAMHAggBCgELAQwBDgEPARABEQESAhQEFQEUAxUBFAIVARQBFQUUAhUBFAQVARQDFwMWARUBFAIVAxQBFSgaAQgEBwEIAQkBCwENAQ4BDwERAhMBFAQVARQCFQEUAhUDFAIVARQHFQEUARUBFAEVARkBGAIXARYKFScaAQgBBwEGAQcBCAEJAQoBDAENAQ4BEAESARMDFAEVARYBFQEUAxUCFAEVAhQBFQEUAxUBFAEVAhQFFQIZARgCFwEVARYCFQEUARUBFAMVJxoBCAMHAQgBCgILAQ4BDwERARIBEwEUARUBFgcVAhQDFQEUARUFFAEVARQFFQIZARgCFwEWAxUBFAQVAhQlGgEJAQYDBwEIAQkBCwINARABEQETARQIFQEUARUCFAYVAxQEFQEUAhUBFAEXAhkBGAEXAhYCFQEUAhUBFAMVJRoBCAEGAgcBCAIJAQsBDAEOARABEgETAhUBFgkVAxQCFQIUARUBFAEVAhQBFQMUARUBFAEaARgBGQEYAhcBFgIVARQBFQIUAxUlGgMHAggBCQEKAQsBDQEOARECEwIWBRUEFAIVARQCFQMUCBUDFAEaARYCGAIXARYDFQQUAhUlGgIHAQYBBwEIAQoCCwEOAQ8BEAESBhUBFgEVARQCFQEUARUBFAIVAhQBFQEUCxUCGgEWAxcBFgEVARYBFAEVARQCFQEUJhoEBwEJAgoBDAEOARABEgETARUCFgEVAhYCFQEUARUBFAEVBBQFFQEUARUDFAEVARQBFQIUAhoBFQIXAxYBFQQUARUBFCUaAQgEBwEJAgoBDQEOARABEgEUBRUBFgIVARQDFQIUAhUBFAIVARQBFQIUARUBFAMVARQCFQMaAhYBFwEWARUBFgIVAhQBFSYaAQgDBwIIAQkBDAENAQ8BEAETARQBFgEVARYBFQIWAhUBFAgVARQBFQEUAhUBFAMVARQBFQEUAhUEGgEXBBYCFQIUJxoCBwEGAQcBCAEJAQoBDAENAQ8BEQETAhUFFgEVAhQDFQIUARUBFAEVARQGFQEUARUBFAEVAhQBFQYaBhUoGgMHAQgBCQIKAQwBDQEQAREBFAEVARYCFQEWAhUDFAUVBBQBFQEUAxUBFAEVAhQDFQEUMxoBCQEHAQYCBwIJAQoBDAEOARABEQEUAxUCFgEVBhQBFQMUAxUCFAIVAhQBFQMUARUBFAEVMxoBCAQHAQkBCgELAQwBDwERARMCFQIWARUCFgIUAhMBFAgVARQFFQEUBBUCFDMaAgcBBgIIAQkBCgELAQwBDgERARMDFQIWARcBFQEUAhMCFAMVAhQBFQMUARUBFAoVMxoCBwEGAQcBCAEJAQoBDAENAQ8BEQETARQBFQQWARUDEwIUARUBFAEVAxQBFQEUARUDFAEVARQCFQEUAxUBFDIaAQoBBwEGAQcCCAEJAQoBDAEOAQ8BEgEUAhUBFgIXARUBFAMSAhQFFQEUAhUEFAEVAhQDFQEUAhUyGgEIAQcBBgEHAQgBCQEKAQsBDAEOARABEgEVARQCFgEXARYBFQQTAhQBFQIUAhUBFAEVARQDFQEUARUBFAIVAhQDFTIaAQgBBwEGAQcCCAEKAQsBDQEOARABEwMVARgBFwEVARMBEgETARIBEwEUAhUDFAEVARQBFQEUAxUBFAEVAhQFFTMaAQgBBwEGAQcBCAEJAQoBDAENAQ4BEQETARUBFAEWARcBFgEUARMCEgERARICFAIVARQBFQQUARUBFAIVARQBFQEUAxUCFDMaAQcBBgIHAQgCCgEMAQ0BDwERARMCFQETARQBFQITBBIDFAIVAhQEFQEUARUCFAIVARQBFQIUMxoBCQEIAgcCCAEKAQsBDAENARABEgEVARQBFQERAhMFEgITAhQGFQEUAhUDFAEVAxQBFTQaAQgBBgMHAQgBCQEMAQ0BDgEQARMCFAEVAhEBEgMRARABEQESARMCFAIVARQDFQMUARUBFAQVAhQ0GgEIAwcBCAEJAQoBCwENAQ8BEQETAhQBFgMRARABEQIQAREBEgITARQBFQMUARUCFAEVAhQBFQEUBBUBFDQaBAcBCAEJAQoBDAENAQ8BEQEUARUBFAEQAREBEAERBBACEQESARMBFAMVARQBFQEUARUCFAYVARQ0GgEJAgYCBwEIAQoBCwEMAQ0BDwERARQCFQEQAhEFEAERARIBEwQUBRUBFAgVNBoBCAMHAggBCQELAQwBDwEQARIDFQMRAhABEQEQAhECEgEUAhUBFAEVARQDFQIWARUBFgUVNBoEBwEIAQkBCgELAQ0BDwEQARIBFQEUARUBEgIRARABEQEQAxEBEgETBBQBFQEUAhUBGAEXARYBFQEWBBUBFDQaAwcCCAEJAQoBDAENAQ4BEQEUAhUDEwUSARECEgMUAxUBFAEVARYDFQEUAhUBFAMVNBoBBwEGAgcCCQEKAQwBDgEPAREBFAIVAhQBEwEUBRMBFAEVARQCFQEUAxUBFAUTARQBFQEUARUBFAEVMxoBCAEGAgcBCAEJAQoBCwENAQ4BEAESAxUBEwUUAxUDFAEVAhQCFQETBhIBEwIUAhUCFDIaAQkEBwEJAQoBCwENAQ4BEAESARUBFAEVARoBEgEUAhUDFgIVARQBFQEUBBUDEwQSARMBFAQVARQyGgQHAQgBCQEKAQwBDQEOAREBEwEVARQBFQEaARABEgETARUBFgUVARQFFQQTAxICEwEVARQCFQEUMhoBCQEHAQYBBwEIAQkBCwEMAQ4BDwERAhQBFQIaAQ4BEAERARMDFQEWAxUBFAMVARYBFAITBBIBEwEUARUEFDIaAQsBCQMIAQoBCwEMAQ0BDwESAxQCGgINAQ8BEQESARMEFQEUBBUBFgITAhIBEQISARMDFAEVAhQyGgEOAQsDCgELAgwBDgEQARIDFQIaAw0BDwEQARIBEwEUCBUBEwESAhMBEQISARMBFAEVARQDFTMaAQ8EDQEOAhABEgEUAhUDGgEMAw0BDwEQAREBEwIUAhUBFAEVARQBFQITBhIBFAIVARQBFQEUMxoBEgERAQ8BEAERARABEgIUAxUDGgIMAg0BDgEPARACEQETAhQBFQIUARUBEwEUARMEEgETAhQBFQEUAhU0GgEVAxMBFAEVBBQEGgMMAw4BEAIRARMBFAUVARQCEwMSARMBEgIUAxUBFDYaARUCFAEVARQCFQUaAgwBDQIOAg8BEAERARIBEwMVAhQCEwYSARQBFQQUQhoDDAINAQ4BDwEQARICEwEVARQBFQEUARUDEwQSAhMBFAEVARQCFUIaAwwCDQEPARABEQISARMBFAEVAhQBFQQTAhICEwEUBBUBFEIaBA0BDgEPAhABEQESARQBFQEUAxUDEwESARECEgETARQBFQIUARUBFEIaAQ0BDAINAQ4BDwIQAREBEgETAhUCFAEVAhMGEgIUARUBFAEVARRCGgMMAQ0CDgEPARABEQITBRUBFAITAhIBEQESAhMEFAEVQhoBDQEMAQ0BDgENAQ4BDwIRARIBEwEUAhUBFAEVARMBFAUSAhMFFUIaAgwCDQEOAg8BEAERARIBEwIUARUCFAITBRICEwUVQhoDDAENAQ4CDwEQARECEwIVBBQCEwQSAhMBFQEUAhUBFEIaAQwDDQEOAQ8CEAERARIBEwUVARQCEwQSAhMBFQIUARUBFEIaAgwBDQEOAQ0CDwEQAhIBEwEVARQBFQEUARUCEwUSARMCFAEVAhQBFUIaAQwBDQEMAQ0CDgEPAhEBEgETARUBFAEVAhQDEwESAhEBEgITARUEFEIaAQ0BDAINAQ4CDwEQARECEwEUBBUEEwESARECEgETARQCFQIUQhoCDQEMAQ0CDgEPARABEQITARQCFQIUAhMGEgMUARUBFAEVQhoBDQMMAQ4CDwEQAREBEgETARQDFQEUBBMEEgEUAhUBFAEVARRCGgENAQwCDQIOAQ8BEAERARIBEwUUARMBFAETARIBEQMSARMCFQIUARVCGgIMAg0CDgEQAhEBEgETARUDFAEVAxMEEgETAhQCFQEUARVCGgENAgwCDgIPARABEQESARMBFAIVAxQCEwMSARMBEgETARUCFAEVQxoCDQEMAQ0CDgEPARABEQESARMBFAQVARcBFgEUAhMCEgETAhQDFUQaAgwCDQEOAQ8BEAERARIGFAEaAhgCFgQVARQBFQEURRoDDQIOAQ8BEAERARIBEwEUAxUBFAIaARcDFgQVRxoBDQEMAQ0BDgIPARABEQESARMBFAIVAhQEGgEWARUCFEkaAQwDDQEOAhABEQESARMBFAQVURoBDAMNAQ8CEAERARIBEwEUARUDFFEaAQ0BDAINAQ4CDwERARICFAEVARQCFVEaAREBDgENAg4CDwERARIBEwIUAhVTGgESARABDwEQAQ8BEAISARQBFQEUARUBFFQaARQDEwMUARUCFAEVVhoDFAEVARQDFQEUWRoEFP8a/xr/Gv8a/xr/GjoaaQZrBm0GewZ9BicHggZDB0UHJAflBwkIpQhkCSQK5QoaC6YLoAwoDWIN6g2sDugOqg9sEC4R8BGyEjgTdBP6E7wUuBVCFjoXyBe9GLwYfRl8GT0aPBr9Gpsbuxv8GmEcYxx5HCkdKx0tHS8dMR0zHTUdOyBLIE0gTyBRIPkgGSG3IXUiNSOiIvMjZCOxJCgkcSXoJOokLyaqJawlriXtJmwmbiZwJqsnLicwJzInNCfwJ/In9Cf2J7IotCi2KLgouihyKXQpdil8KeopNCo2KjgqQCr2Kvgq+ioCK2wruCu6K8Yreix8LIgsPC0+LUwt/i0ALg4uwC7CLtIugi+EL0QwRjBYMLYwBjEIMcgxyjHeMYoyjDJMM04zZDMONBA00DSTNeo0kjVVNlQ2FzdwNhY32TfYN5s49jdGOJo4nDghOiI6pzuoO/89FD+0QHZBGkI2QjhC+UL4QrtDNEO6Q3pEfEQ9RbZEPEXiRf5F+UbARvhGu0eAR4JHQ0i6R0JIL0kxSTNJ6EgESS5J70nxSfNJxknsSa1K7kmvSohKSUusSm1LrkpvS0hLbEstTG5LL0wKTM1MLEwuTO9MsEzMTM5M7kyvTQhNrk2wTcpNTk5UTnBOck6MThZPMk80T05P9E/2TxBQtlC4UNJQeFF6UZRROlI8UlZSlVP8Uv5SGFO+U8BT2lNkVIBUglScVCZVQlVEVV5V6FUEVgZWIFaqVsZWyFbiVmxXiFeKV6RXLlhKWExYZljwWAxZDlkoWbJZ0FnqWXRaklo2W1Rb+FsWXLpc2Fx8XZpdPl5cXgBfHl/CX+Bf+l+EYKJgRmFkYXxhs2O5Y5Zm8WinaQ==","Relationships":"uHD/Gv8a/xr/Gv8aLBoEBgEIAQkBCgEMrhoBBQEEAwUBBgEHAggBCgEMARCqGgEGAQUDAwIEAQUBBgEFAQcCCAELAQ2oGgEGAQQDAwQEAwUBBwEIAQkBCgELphoBBgEEAgMCAgIDBQQCBgIHAQkBCwENpBoBBAMDAgIFAwIEAgUBBgEHAQgBCQEKAQuiGgEFAQQMAwEEAwUCBgEIAQkBCwEOnxoBBwEFAQQDAwECAQMBAgEDAQIDAwEEAQMCBAEFAwYBBwEJAQoBDJ4aAQcBBQEEAQMBBAIDAwIIAwIEAgUBBgEHAQgBCQELAQ+cGgEGAQUBBAEDAQQNAwMEAgUCBgEHAQgBCgENmhoBCAEGAQUFBAMDAQIDAwECBQMCBAIFAgYBBwEIAQoBCwEPmBoBCAEHAQYCBQUEAgMBAgEDAQIHAwIEAgUCBgEHAQgBCQELAQ2XGgEIAgYCBQIEAQUBBAEDAQQDAwECCAMCBAEFAQQBBQIGAQcBCAEKAQsBEJUaAQgBBwMGAwUGBAIDAQIHAwQEAgUBBgEHAQgCCgENlBoBCQIHAwYEBQQEBQMBAgQDBQQCBQIGAQgBCQEKAQuTGgEKAQgEBwMGAQUBBAEFAwQBAwEEAwMCAgYDAwQCBQEGAQcBCAEJAQwBDpEaAQsBCgEIAQkDBwIGAwUEBAMDAQIDAwECAwMFBAIFAgcBCAEKAQwBDhgaAQcBBQEGAQgBC3MaAQsCCgIJAQgBBwEGAQcCBgIFAQQBBQEEAgMBBAEDAQQBAgcDBAQBBQEGAQcBCAEJAQwBDQEQFhoCAwEEAQUBBgEIAQkBC3EaAQ0CCwEKAgkCCAIHAgYCBQEEAQUCBAgDAQIBAwECAgMCBAEFAQYBBwEIAQoBDAENAQ8BEhQaAQQDAwEEAgYBBwEIAQoBDAENbhoBDwENAQwBCwIKAQkDCAIHAgYDBQIEAQMBBAkDAgQCBQEGAQcBCAEKAQsBDQEPARABFBIaAQUEAwIEAQUBBgEHAQgBCgELAgxsGgEQAQ4BDQIMAwoDCAMHAQYDBQQEAQMBBAYDAgQBBQEGAQcBCAEJAQsCDAEOAQ8BEQ8aAQYCBQIEBQMDBQEGAQgBCgILAQoCCQELaRoBDwEOAQ0BDAILAgoCCQEIAgcCBgMFBQQCAwECAQMBAgEEAQMBBQIGAQcBCAEJAQsEDAEOARALGgEHAwQBBQEIAQUBBAEDAQQEAwEEAgUBBwEJAQwBDQELAQkCCAIJAQtmGgERARABDwEOAg0BDAEKAwkBCAIHAgYBBQEGAwUBBAUDAwQBBQIGAQgCCQcKAQsGGgEIAgYDBAEFAQYBBwEIAgYBBAEFAgQFAwEFAQYBCQENAQ4BDAEJAQgCBwEJAQsBETYaAQcEBgEHAQgBCgELJhoBEgERARACDgENAQwBCwIKAQkCCAIHAgYEBQIEAwMDBAEFAQYBBwIIAQkBCgIJAwgFBwIGAwUCBAEFAQYCBwEIAQkCBwEGAQUDBAEDAQIDAwEEAQUBBwEJARABDAEKAQgBBwEIAQwBDjMaAwYCBQIEAQUBBgEHAQgBCgEMAQ8lGgETAREBEAEPAQ4BDQEMAQsCCgEJAwgCBwIGAwUGBAEFAQYCBwEIAQkBCgEJAQgCBwIGAQcDBgUFAQYCBQEGAQcBCAEJAgsCCAEHAgYCBQEEAQMBAgIDAgQCBQIHAQsBCgEIAQoBDAEPARIvGgEHAgYCBQQEAwUBBgEIAQkBCwENARAkGgEWARMBEgERARABDgENAQwBCwMKAQkCCAEHAQYBBwEGAwUCBAMFAQYCBwEIAwkBCAIGAwUFBgIFAQYCBQEHAQYBBwIJAQsBDAEOAQwBCgIJAQcBBgEFAgQBAwMCAwMCBAEHAQkBDAELAQ0BDwEUKxoBCAEHAQYCBQIEAQUCBAIFAgQBBQIGAQgBCQEKAQwBDwESJBoBFgEVARMBEgEQAQ8BDgENAQwBCwIKAgkBBwEIAgcBBgUFAgYCBwMIAQkCCAEGAgUBBAMFAQYEBQMGAwcBCQELAQwBDQERAQ8BDQEMAQoBCQEIAQcBBgMEAwMCAgEDAQUBBgEIAQoCDgERARMBFicaAQcCBQEEAQUBBAIFAQQCBQUEAgUCBgEIAQoBCwENAQ4BEQEUJRoBFQETARIBEAEPAg4CDAELAQoBCQIIAQcBCAEHAQYBBQUGAQcBCAEHAggBCQEIAQcBBgkFAQQBBQEGAQUCBgEHAQgBCQEKAQ0BDgEQARMBEAEPAQ4BDQELAggBBgIFBAMBAgEDAQQBBgEHAQoBDQIRARMBFyQaAQYBBQEGBAUFBAEFBQQDBQEGAQcBCQEKAQsBDQEOARABEiYaAhUBEwERARABDwEOAQ0BDAELAgoBCQIIAgcDBgQHAQkCCAEJAQgBBwEGAQUCBAYFAQQBBQMGAgcCCAEKAQwBDQEPAREBGAEUARMBEQEQAQ4BDAEJAQcCBgEFAgQBAwIEAgUBBwEIAQoBDgESARQBFyEaAQcBBgIFAgQCBQIEAwUDBAMFAQYCBQEGAQUBBgEIAQkBCgELAQ0BDwERARIBFicaARUBEwESAREBEAEOAQ0BDAILAQoCCQEIAQcBCAMHAwgBCQMIAQcCBgEFAwQBBQIEAQUBBAIFAwYCBwIIAQkBCwENAQ8BEQEUARkBGAEXARQBEgEPAQ0BCwEJAQcBBgIFAwQCBQEGAQcBCQELARABEwEUHRoBBwIGAQQDBQQEAQUFBAMFBAYBBQMGAQcBCAEJAQoBCwEOAQ8BEAESARUoGgEWARUBEwERARABDgENAgwBCwEKAwkCCAQJAQgCCQIIAQcBBQQEAQMEBAQFAQYBBQEGAwcBCAEJAQoBDQEPARMBFwMZARgBFQERAQ4BDAEJAQgBBwUFAQQCBQEGAQkBCwEWARABERgaAQgBBwEGAQUBBAQFAgQDBQEEAwUCBAMFAQYBBQEGAgcBBgMHAQgBCQEKAQsBDQEOAQ8BEQESARYqGgEVARMBEQEQAQ8BDgINAQsCCgQJBAoCCQIIAQYBBQUEAQMCBAEFAgQBBQEEBAUCBgIHAQkBCgEMAQ4BEAEZARoDGQEXARMBDwENAQoBCAEHAQYDBQQEAQYBCAELAQoBCQEKAgkCCAQHAggDCQEKAQsEGgEHAQYFBQIEAQUDBAIFAQQBBQEEBQUBBgEFAgYBBwEGAQcBBgEHBQgCCgELAQ0BDgEQARIBFAIVKhoBFgEUARICEAEOAg0BDAELBQoCCwIKAggBBgIFAQQBAwIEAQUDBAEDAQQBBQEEBQUEBgIIAQkBCwENARABFAMaAhkBFQERAQwBCgEJAQgBBwEGAgUBBAEDAQQBBQEGAQgBCwEIAgcCBgIHAQYBBwEGAgcBCAIHAQYCBwIGAgUHBAMFBAQFBQUGAQcBBgEHAggCBwEIAQkCCAEJAQoBCwINAQ8BEQESARMBFAEVKxoCFQETAhECDgENAQwECwEMBAsBCQEIAQYBBQMDAgQBAwIEAgMFBAQFAwYCBwEIAQkBCwENARABEwUaARcBEQENAQoCCQEIAQcBBQIDAQQBAwEEAQcBCAEMAwYBBQQGAwcCBgEFAQYCBQQEAgMHBAQFAQYBBQQGAQcBBgQHAggBBwIIBAkBCgELAQoBDAENAQ4BEAERARMBFAEVARQtGgEWARQBEgIQAQ8CDQMMAQ0DDAELAQkBBwIFAQQCAwIEBQMCBAEDAgQFBQIGAgcCCAEJAQsBDQEQARMFGgEYAREBDQELAQoBCQEHAQYBBQEEAgMBBAEFAQcBCQEMAgYCBQUGAQcBBQEGAQUFBAYDBAQGBQIGAQcBBgMHAggBBwEIAQkBCAEJAQoBCQIKAQsCCgELAQwBDQEOAQ8BEAESARMBFQEUARUuGgIVARMCEQEPAQ4BDQUOAQ0BDAEKAQgBBwIFAgQBAwIEAgMBBAEDAgQCAwIEAQUCBAIFAgYCBwIIAQoBCwEOARABFAUaARcBEQEOAQ0BCgEJAQYBBQIEAQMDBAEHAQgBDAEGAQUCBgEFAQYCBwEGAwUFBAUDAgQDBQEGAQUCBgEHAgYCBwIIAQcCCAIJAQgBCgEJAwoDCwEMAQsCDAENAQ8BEAESARMBFAMVMBoBFQETARIBEAMPAQ4CDwEQAQ8BDgELAQgBBwMFDAMDBAMFAgYBBQEGAgcCCAEKAQwBDgEPAREFGgEWARIBEAENAQoBCAEGAQUBBAIDAgQBBQEGAQgBDQEGAgUFBgIFAwQGAwMEAwUEBgEHAQYCBwEIAQcCCAQJBAoCCwYMAg0BDgEPARABEgEUBBUxGgIVARMBEQEQARECEAERAhABDwEMAQoBCAEHAQUCBAgDAQQCAwMEAQUBBAIFAQYBBQIGAQcCCAEJAQsBDAENAg4BFAMaAQsBFgETARABDAEKAQgBBwEFAQQBAwEEAQMBBAEFAQYBCQEMBgYDBQEEAQMBBAEDAwQCAwMEAQUCBgMHAQgDBwIIAQkBCAMJAgoECwQMBA0CDgIQARIBEwMVARQBFTMaARUBFAMSARMDEgIQAQwBCQEGAgUBAwIECQMCBAEFAgQBBQEEBAYCBwEIAgkEDAEPARIBGgEIAQcBEwEVARQBEAENAQoBBwEGAgUBBAEDAgQBBQEHAQgBDQEGAQcBBgEHAgYCBQMEBAMBBAIDAgUCBgMHBQgCCQEKAQkCCgMLAwwGDQMOAQ8CEAERAhMEFTUaARUBFAETAxQBEwIUARMBEAEKAQcBBQEEAQMBBAEDAgIHAwEEAQMBBAEFAQQDBQEGAQUBBgEHBAgBCgQMAQ4BEgEHAgYBDgIUAREBDQEJAQgBBgEFAQQDAwEEAQUBBwEJAQ0CBwQGAQQBBQMEAwMCBAEFAQQBBQEGAgcDCAEJBwoCCwIMAQ0CDAENAQ4CDQMPBBACEQESARQCFQEUAhU3GgEVBRYCFwEVAQ0BBwEGAQULAwYEBAUDBgIHAQgCCQIMAQsCDAEOAwYBBQEIAQ8BEwERAQ0BCQEHAQYBBQEEAgMBBAEDAQUBBwEJAQ4DBwMGBwQBBQEEAgUBBgEHAwgBCQcKAQsCDAENAgwCDQMOAg8DEAQRARIBEwEUBhU4GgcWARcBFgEIAQYBBQEECwMCBAEDBAQCBQMGAgcCCAEJAQoBDQEMAQsCCgIFAQYDBQEKARIBEQENAQoBCAEGAQUBBAMDAQQBBQEHAQkBDQIIAQcBBgEFAQYBBQIEAQUBBAQFAQcBBgEHAgkBCgEJAwoDCwEMAg0BDAINAw4CDwMQAREBEgIRAhIDEwEWAhUBFgEVARQ7GgUWARcBFgEKAQYBBQEEAQMBBAYDAgQEAwUEAQUCBgMHAQgBBwIJAQsBDQEMAQoBCQIEAgUBBAIFAQoBEgEQAQwBCgEIAQYBBAEDAQQBAwIEAQYBBwEJAQ4CCAMGBwUCBgIHAQgCCgQLBAwCDQMOAg8BEAEPAhADEQISAxMCFAQVARYDFUIaAQsBBwEGAgUBBAMDAQQGAwIEAQMBBAQFAgYDBwMIAQkBCgENAQwBCwEIAwQFBQELARMBEAELAQkBBwIFAwMCBAEFAQcBCQEPAQkBCAIHBQYCBwEGAggDCQEKAgwBDQIMBQ4BDwEOAQ8CEAERARACEQESAxMCFAYVARYBFQEWAhVDGgEQAQoBBwEGAQUDBAMDAQQEAwQEAQUBBAIFAwYDBwIIAgkBDAENAQwBCAMDAQQBBQEEAQUBBAEGAQwBFAEQAQwBCQEHAgUCBAEDAgQBBQEHAQkBDwIIBgcBCAEHAggBCQEIAQoBCwIMAg0DDgIPAhABDwEQAREFEgETAhQDFQEWBBUCFgQVRRoBDAEJAQcBBgEFBAQEAwEEAgMDBAIFAQQBBQIGAQcBBgEHAwgCCQEKAg0BCgEDAQQBAwMEAwUBBwENARQBDwEMAQkBCAIFBAMBBAEFAQcBCgEPAgkCCAIJAQgDCQEKAQkCCgEMAQ0DDgMPBBACEQESAxMDFAIVAhYBFQIWCBVGGgERAQsBCQEHAwUCBAEDAQQBAwEEAQMBBAIDAQUCBAMFAwYCBwIIAQcCCAEJAQsBDAELAwQBAwMFAwYBBwEPARcBEAELAQkBBwEGAgQDAwEEAQUBBwEKARABCwEKAQkICgELAQwBDQEOAw8BEAERARABEQMSBBMDFAEVARYBFQEWAhUBFgIVAxYBFQIWARVIGgEOAQoBCAEHAQYDBQQEAQMFBAEFAQQDBQIGAQcBCAEJAQgBBwEIAQcBBgEHAQgCCgEGAQQBBQEGAgUBBgMHAQkBEAEXAQ4BCwEJAQcCBQMDAgQBBwEKAQ0CDAELAQwHCwEMAQ0BDgIPARACEQMSBBMBFAIVAxYBFQEWAxUBFgcVAhZJGgEUAQ0BCwEJAgcDBQEEBQMBBQUEAgUDBgEIAwkBBwEGAgUBBgEIAQoBCwMGAgUBBgEHAQgBBwEIAQkBEAEWAQ4BCwEJAQcBBgEFAgMBBAEGAQgBCwEOARIBDgINAgwBDQIMAw0CDgEPAxEBEgETARIDFAIVAhYBFQEWBhUBFgQVAhYBFU0aARIBDQEKAQkBBwIGAQUBBAQDAgUCBAMFAQYBBQIGAgcCCQEIAQcBBQEEAQUBBgEIAQoBDQEMAQgCBQIGAQcCCAEJAQoBDAEPARUBDgEKAQkCBgEFAQQBBQEHAQgBDAEPARMBEAEPARABDwEOAQ8EDgIPARABEQESARMEFAEVARYEFQEWARUBFgIVAxYCFQEWAxVRGgERAQ4BCwEKAQgBBwEGAQUBBAIDAgQBBQEEAQUBBgcFAQYBBwEIAQkBBwEFAQQBBQEGAQcBCQEMAQ8BDAEHAQYEBwIJAQoBDAENARABFAEOAQsBCAEHAQUBBgEHAQgBCgENARABFAESAxEBEAUPAhABEQESARMCFAMVARYEFQEWBBUBFgQVAhZVGgESAQ4BCwEKAQkBBwEGAQUBBAIDAwQBBQMGAgUBBgEFAgQBBQEHAgkBBwMGAQcBCQEMAQ8BEAEIAgcDCAEJAQoBCwEMAQ4BDwERARQBDQELAQkCBwEIAQoBDQEQARMCFQIUARMBEgYRARIBEwEUAhUDFgsVARYBFQEWWhoBEwEQAQwBCwEJAQcCBQQDAQQCBQQGAQUBBAIDAQUBBgEIAQoBCwEJAQcBBgEHAQgBCgENARABDgMJAQgBCQEKAQsBDAENAQ4BEAIRARIBDgELAQkBCgELAQ0BDwESAhUEFgEVARMEEgITARQGFQEWBBUBFgUVXhoBFAESAQ4BCwEIAQcCBQIDAQQBAwEEAgYCBwEGAQUEBAEFAQgBCwENAQwBCQEIAgcBCQELAQ8BEgEKBAkCCwENAQ4CEAISARQBEwENAgwBDgEQAREBFAEVARQBFwQWAhUEFAIVARYEFQIWAxUBFgMVYhoBFgETAQ8BCwEIAQcBBgIEAwMBBAIGAQcBCAEGAgQCBQEGAQgBCwENAQ4BDAIIAQYBCAEJAQwBEQEMAQYCBQEGAQkBCwEPARACEgEUAhUBFgESAhABEQESARQCFQEUARYBFwUWAhUBFgkVARYDFQEWZxoBFAEOAQoBCQEHAQUBBAQDAQQBBQEGAQgCCQEGAQUBBgEHAQgBCwENAg8BCQIGAQUBBgEJAQ0BEQEHAwYBBwEJAQ4BFAEVARYDFwIWARQBEwUVBRoFFgYVARYBFQEWAhVsGgETAQ4BCwEKAQcCBQEEAQMCAgEDAQQBBwEJAQwBCwMHAQgBCgEMAQ4BEAEKAQcDBQEHAQoBDwEOAgYCBQEIAQsBDgEWAxgBFwEWARUBFgMVARYJGgQWARUBFgEVARYDFXAaARIBEAEMAQkBBwIFAQQDAwEEAQYBCQEMAQ4BDAEJAggBCQELAQ0BEAEOAwYCBQEHAQsBEAELBAYBCQEMARABGAEZAhcTGgIWARUBFnUaARYBEQEMAQoBCAIFAwMBBQEHAQsBDgIPAQoBCAEHAQgBCQELAQ4BEAIGAwUBBwEIAQwBEAEIAwYBBwEJAQ4BEpEaAREBDQEKAQcBBgIEAQUBBgEIAQsBDgEPARIBDQEJAQcBBgEHAQgBCwEPAQoBBgQFAQcBCQENARABBwEGAQUBBgEHAQoBDwEUkBoBDgESAQ4BCgEHAgYBBwEIAQkBCwENARABEgEPAQkBBwIGAQcBCQENAQ4BBwEGAgUBBAEGAQgBCQEPAQwBBgEHAQUBBgEIAQ0BEZEaARABFAEMAQoECAEKAQsBDQEQAhIBCgEHAQUCBgEIAQsBDgEMAwYCBQEGAQgBDAERAQkBBwIGAQgBDQESARaQGgESARQBEgELAgoBCQIKAQsBDQEOARABEwEKAQcEBgEJAQsBDwEIAQYCBQEEAQUBBgEIAQwBEQEIAQcBCQELAQ0BEwEWkBoCEgEV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"};
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
  const qx = Math.abs(x) - 1.6, qy = Math.abs(y) - 5.2, qz = Math.abs(z - 34) - 9;
  let body = Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - 3.6;
  for (const side of [-1, 1]) {
    body = blendDistance(body, capsuleDistance(x, y, z, [0, side * 9, 42], [1.5, side * 16, 25], 3.15), 3.4);
    body = blendDistance(body, capsuleDistance(x, y, z, [.3, side * 4.35, 25], [.8, side * 4.35, 3.7], 3.45), 2.8);
  }
  return Math.min(body, Math.hypot(x - 1.1, y, z - 61.4) - 7.2);
}
function palmDistance(u, v, z, centre, angle, radii) {
  const dx = u - centre[0], dy = v - centre[1], dz = z - centre[2];
  const a = Math.cos(angle) * dx + Math.sin(angle) * dy, b = -Math.sin(angle) * dx + Math.cos(angle) * dy;
  const k0 = Math.hypot(a / radii[0], b / radii[1], dz / radii[2]);
  const k1 = Math.hypot(a / (radii[0] ** 2), b / (radii[1] ** 2), dz / (radii[2] ** 2));
  return k1 ? k0 * (k0 - 1) / k1 : -Math.min(...radii);
}
function handshakeDistance(x, y, z) {
  const u = (.86 * x - .5 * y) / .8292, v = (.42 * x + .72 * y) / .8292;
  const a = .61, ax = Math.cos(a), ay = Math.sin(a);
  let near = palmDistance(u, v, z, [-8, 4, 1], a, [13, 8.8, 4.8]);
  near = blendDistance(near, capsuleDistance(u, v, z, [-38, -15, 0], [-23, -5, 1], 6.8), 4);
  for (let i = 0; i < 4; i++) {
    const across = -6.6 + i * 4.4, length = [15, 16.5, 14.5, 11.5][i];
    const bx = -8 + ax * 6 - ay * across, by = 4 + ay * 6 + ax * across;
    const start = [bx, by, 1], middle = [bx + ax * 7, by + ay * 7, .8], tip = [bx + ax * length, by + ay * length, -2.6];
    near = blendDistance(near, capsuleDistance(u, v, z, start, middle, 2.2), 1.8);
    near = blendDistance(near, capsuleDistance(u, v, z, middle, tip, 2.2), 1.5);
  }
  near = blendDistance(near, capsuleDistance(u, v, z, [-16, -3, 2], [-4, -10, 3.5], 2.7), 3);
  const b = 2.5, bx = Math.cos(b), by = Math.sin(b);
  let far = palmDistance(u, v, z, [11, -.5, 0], b, [13, 8.3, 4.6]);
  far = blendDistance(far, capsuleDistance(u, v, z, [38, -13, 1], [24, -4, 0], 6.3), 4);
  for (let i = 0; i < 4; i++) {
    const across = -6.1 + i * 4.0, length = [12.5, 14, 13, 10.5][i];
    const px = 11 + bx * 6 - by * across, py = -.5 + by * 6 + bx * across;
    const start = [px, py, -1.5], bend = [px + bx * length, py + by * length, -4.8], tip = [px + bx * (length + 1.4), py + by * (length + 1.4), -.6];
    far = blendDistance(far, capsuleDistance(u, v, z, start, bend, 2), 1.6);
    far = blendDistance(far, capsuleDistance(u, v, z, bend, tip, 2), 1.3);
  }
  far = blendDistance(far, capsuleDistance(u, v, z, [4, -7, 4], [-4, -6, 6], 3.2), 3);
  far = blendDistance(far, capsuleDistance(u, v, z, [-4, -6, 6], [5, 0, 7], 2.8), 2);
  far = blendDistance(far, capsuleDistance(u, v, z, [5, 0, 7], [19, 10, 4.7], 2.65), 1.8);
  return Math.min(near, far) * .78;
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
  const colours = Array.from({ length: 26 }, (_, i) => 'rgb(' + [243, 240, 232].map((base, channel) => Math.round(base + ([36, 78, 255][channel] - base) * i / 25 * .34)).join(',') + ')');
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
function drawVolume(ctx, x, y, scale, kind, field, options) {
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
  drawVolume(ctx, x, y, scale, 'People', humanDistance);
}

function handshake(ctx, x, y, scale) {
  drawVolume(ctx, x, y, scale, 'Relationships', handshakeDistance, { width: 184, height: 112, zoom: 1.08, offsetY: -3, centreZ: 0, bound: 51 });
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
