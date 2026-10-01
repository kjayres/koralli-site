import { journalCurrent } from './journal-water.mjs';

// This is the crown of the existing Koralli logo-study outline, including its
// rounded branch tips and uneven forks. The f colony has one shortened side fork.
const crown = [["M",113.0,200.0],["C",117.0,202.24,118.88,201.52,120.0,198.0],["C",121.12,194.48,121.92,184.08,120.0,178.0],["C",118.08,171.92,112.64,165.44,108.0,160.0],["C",103.36,154.56,94.52,148.8,91.0,144.0],["C",87.48,139.2,85.52,133.84,86.0,130.0],["C",86.48,126.16,90.96,120.32,94.0,120.0],["C",97.04,119.68,100.84,124.16,105.0,128.0],["C",109.16,131.84,115.52,140.96,120.0,144.0],["C",124.48,147.04,129.96,149.88,133.0,147.0],["C",136.04,144.12,139.16,132.72,139.0,126.0],["C",138.84,119.28,134.24,111.4,132.0,105.0],["C",129.76,98.6,125.32,90.96,125.0,86.0],["C",124.68,81.04,127.44,75.44,130.0,74.0],["C",132.56,72.56,137.32,73.0,141.0,77.0],["C",144.68,81.0,149.8,97.08,153.0,99.0],["C",156.2,100.92,157.96,94.12,161.0,89.0],["C",164.04,83.88,167.68,73.56,172.0,67.0],["C",176.32,60.44,183.36,51.84,188.0,48.0],["C",192.64,44.16,197.8,42.52,201.0,43.0],["C",204.2,43.48,207.68,47.64,208.0,51.0],["C",208.32,54.36,206.2,58.56,203.0,64.0],["C",199.8,69.44,192.32,77.96,188.0,85.0],["C",183.68,92.04,179.2,100.64,176.0,108.0],["C",172.8,115.36,168.16,125.4,168.0,131.0],["C",167.84,136.6,171.0,142.84,175.0,143.0],["C",179.0,143.16,186.92,136.48,193.0,132.0],["C",199.08,127.52,206.12,119.32,213.0,115.0],["C",219.88,110.68,230.08,105.8,236.0,105.0],["C",241.92,104.2,247.6,107.6,250.0,110.0],["C",252.4,112.4,253.56,116.64,251.0,120.0],["C",248.44,123.36,240.4,126.68,234.0,131.0],["C",227.6,135.32,218.52,142.04,211.0,147.0],["C",203.48,151.96,194.52,157.36,187.0,162.0],["C",179.48,166.64,169.6,170.24,164.0,176.0],["C",158.4,181.76,153.6,191.12,152.0,198.0],["C",150.4,204.88,150.8,216.28,154.0,219.0],["Z"]];
const placements = {
  r: { x: 145, y: -697, scale: 1.05, mirror: 1 },
  f: { x: 255, y: -708, scale: 1, mirror: -1 }
};
const clamp = value => Math.max(0, Math.min(1, value));

export function journalBranchPath(kind, current = 0) {
  const pose = placements[kind];
  if (!pose) return '';
  return crown.map(([command, ...points]) => {
    const coordinates = [];
    for (let i = 0; i < points.length; i += 2) {
      const x = points[i] - 136;
      // The smaller f colony has a lower side fork, rather than mirroring R.
      const sideFork = kind === 'f' ? 22 * clamp((155 - points[i]) / 30) * clamp((150 - points[i + 1]) / 50) : 0;
      const y = points[i + 1] - 210 + sideFork;
      // Both cut endpoints and the first part of the trunk stay exactly fixed.
      const freedom = clamp((195 - points[i + 1]) / 152);
      coordinates.push((pose.x + pose.scale * x * pose.mirror + current * 18 * freedom * freedom).toFixed(3));
      coordinates.push((pose.y + pose.scale * y).toFixed(3));
    }
    return command + coordinates.join(' ');
  }).join(' ');
}

/** The marine canvas supplies its existing visible clock; there is no second RAF. */
export function initJournalLettering(root = document) {
  const branches = [...root.querySelectorAll('[data-journal-branch]')];
  let previous;
  return (time = 0, { reducedMotion = false } = {}) => {
    const current = reducedMotion ? 0 : journalCurrent(time);
    if (current === previous) return;
    previous = current;
    for (const branch of branches) branch.setAttribute('d', journalBranchPath(branch.dataset.journalBranch, current));
  };
}
