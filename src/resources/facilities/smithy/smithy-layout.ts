export const smithyLevels = [0, 1, 2, 3] as const;
export type SmithyLevel = (typeof smithyLevels)[number];

// 부서진 설비도 같은 기단에 남겨 복구 전환 시 보행자가 끼지 않게 한다.
export const smithyLayout = {
  entrance: { x: -6.7, z: 5.65, width: 3.8, depth: 1.02 },
  yard: { x: -10.25, z: 2.2, width: 6.2, depth: 7.6 },
  forge: { x: -11.5, z: 0.1, width: 2, depth: 1.65, height: 1.65 },
  chimney: { x: -11.5, z: -0.34, width: 0.72, depth: 0.78, height: 3.65 },
  anvil: { x: -10.55, z: 3, width: 1.8, depth: 0.85 },
  bench: { x: -8.55, z: 1.6, width: 1.8, depth: 0.78, height: 0.92 },
  rack: { x: -12.15, z: 4.35, width: 1.8, depth: 0.5 },
  tank: { x: -8.15, z: 3.9, width: 1, depth: 1 },
  canopy: { x: -9.15, z: 0.2, width: 3.8, depth: 3.3, height: 2.7 },
} as const;

export const smithyPosts = [-10.9, -7.4].flatMap((x) =>
  [-1.3, 1.7].map((z) => ({ x, z, width: 0.22, depth: 0.22 })),
);

export const smithyObstacles = [
  smithyLayout.forge,
  smithyLayout.anvil,
  smithyLayout.bench,
  smithyLayout.rack,
  smithyLayout.tank,
  ...smithyPosts,
] as const;
