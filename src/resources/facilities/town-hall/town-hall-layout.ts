import type { Footprint } from '../dojo/dojo-layout.js';
import { basecampForestGate } from '../../maps/basecamp/basecamp-layout.js';

export const townHallLevels = [1, 2, 3] as const;
export type TownHallLevel = (typeof townHallLevels)[number];

// 회관은 Lv.1부터 중심 시설로서 광장과 큰 진입로의 축에 놓인다.
export const townHallLayout = {
  building: { x: 0, z: -6, width: 11.2, depth: 6 },
  porch: { x: 0, z: -2.25, width: 11.2, depth: 1.5, height: 0.6 },
  steps: { x: 0, z: -0.75, width: 4.2, depth: 1.5, count: 5 },
  plaza: { x: 0, z: 4.1, width: 12, depth: 8.2 },
  noticeboard: { x: 6.6, z: 0.9, width: 1.6, depth: 0.35 },
  bench: { x: 4.5, z: 1.5, width: 1.8, depth: 0.5 },
  signpost: { x: -8.5, z: 2.3, width: 0.24, depth: 0.24 },
  path: { x: 0, width: 4.2, startZ: 8.2 },
} as const;

export const townHallPillars: readonly Footprint[] = [
  -5.15, -2.5, 2.5, 5.15,
].map((x) => ({
  x,
  z: -1.85,
  width: 0.42,
  depth: 0.42,
}));
export const townHallEntranceRails: readonly Footprint[] = [-1, 1].map(
  (side) => ({
    x: basecampForestGate.x + side * (basecampForestGate.width / 2 + 0.25),
    z: basecampForestGate.z + 0.6,
    width: 0.16,
    depth: 0.7,
  }),
);
export const townHallObstacles: readonly Footprint[] = [
  townHallLayout.building,
  townHallLayout.noticeboard,
  townHallLayout.bench,
  townHallLayout.signpost,
  ...townHallPillars,
  ...townHallEntranceRails,
];
