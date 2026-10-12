export const kitchenStages = ['weathered', 'usable', 'restored'];
// 식사터의 물건과 통행 판정은 모든 복구 단계에서 같은 자리를 사용한다.
export const kitchenLayout = {
    yard: { x: 9.3, z: 1.85, width: 6.4, depth: 7.8 },
    stove: { x: 9.3, z: 0.1, width: 1.9, depth: 1.4, height: 0.78 },
    table: { x: 9.3, z: 3.7, width: 3, depth: 1, height: 0.87 },
    canopy: { x: 9.3, z: -0.65, width: 3.9, depth: 3.1, height: 2.65 },
    waterJar: { x: 11.7, z: 1.9, width: 0.72, depth: 0.72 },
};
export const kitchenBenches = [2.55, 4.85].map((z) => ({
    x: kitchenLayout.table.x,
    z,
    width: kitchenLayout.table.width,
    depth: 0.38,
    height: 0.44,
}));
export const kitchenPosts = [-1.75, 1.75].flatMap((dx) => [-1.95, 0.65].map((z) => ({
    x: kitchenLayout.canopy.x + dx,
    z,
    width: 0.22,
    depth: 0.22,
})));
export const kitchenObstacles = [
    kitchenLayout.stove,
    kitchenLayout.table,
    kitchenLayout.waterJar,
    ...kitchenBenches,
    ...kitchenPosts,
];
