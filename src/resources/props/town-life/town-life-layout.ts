import type { GroundPoint } from '../../facilities/dojo/dojo-layout.js';
import { basecampLayout } from '../../maps/basecamp/basecamp-layout.js';
import {
  kitchenLayout,
  kitchenBenches,
} from '../../facilities/kitchen/kitchen-layout.js';

const kitchen = basecampLayout.placements.kitchen;
const frontBench = kitchenBenches[1]!;

// 접근점·외형·발밑 판정·착석 위치를 같은 좌표에서 유도한다.
export const townLifeLayout = {
  interactionRadius: 1.1,
  path: {
    x: -7.4,
    z: 4,
    approach: { x: -6.15, z: 3.4 },
    stones: [
      { x: -7.4, z: 3.25, radius: 0.52 },
      { x: -7.3, z: 4.03, radius: 0.58 },
      { x: -7.5, z: 4.81, radius: 0.48 },
    ],
    rails: [
      { x: -7.2, z: 2.55, radius: 0.25 },
      { x: -8.1, z: 2.55, radius: 0.25 },
      { x: -7.2, z: 5.55, radius: 0.25 },
      { x: -8.1, z: 5.55, radius: 0.25 },
    ],
  },
  chop: {
    x: 8.6,
    z: 7.7,
    radius: 0.42,
    approach: { x: 8.6, z: 6.65 },
  },
  fire: {
    x: kitchen.x + kitchenLayout.stove.x,
    z: kitchen.z + kitchenLayout.stove.z,
    approach: {
      x: kitchen.x + kitchenLayout.stove.x,
      z: kitchen.z + kitchenLayout.stove.z + 1.5,
    },
  },
  table: {
    x: kitchen.x + kitchenLayout.table.x - 0.85,
    z: kitchen.z + kitchenLayout.table.z,
    approach: {
      x: kitchen.x + frontBench.x - 0.85,
      z: kitchen.z + frontBench.z + 1.05,
    },
    seat: {
      x: kitchen.x + frontBench.x - 0.85,
      y: frontBench.height + 0.065,
      z: kitchen.z + frontBench.z,
    },
  },
} as const;

/** 접근점은 작업 자세에만 쓰고, 선택 판정은 실제 물체 가장자리에서 계산한다. */
export function townLifeInteractionDistance(
  target: 'path' | 'chop' | 'fire' | 'table',
  point: GroundPoint,
): number {
  const layout = townLifeLayout[target];
  if (target === 'path')
    return Math.min(
      ...townLifeLayout.path.stones.map((stone) =>
        Math.max(
          0,
          Math.hypot(point.x - stone.x, point.z - stone.z) - stone.radius,
        ),
      ),
    );
  if (target === 'chop')
    return Math.max(
      0,
      Math.hypot(point.x - layout.x, point.z - layout.z) -
        townLifeLayout.chop.radius,
    );
  if (target === 'fire') {
    // 화덕 뒤의 가마솥과 지붕 안쪽에서는 넣기 안내가 나타나지 않는다.
    if (point.z < layout.z - 0.15) return Infinity;
    return Math.hypot(
      Math.max(0, Math.abs(point.x - layout.x) - kitchenLayout.stove.width / 2),
      Math.max(0, Math.abs(point.z - layout.z) - kitchenLayout.stove.depth / 2),
    );
  }
  return Math.hypot(
    Math.max(0, Math.abs(point.x - layout.approach.x) - 0.65),
    point.z - layout.approach.z,
  );
}
