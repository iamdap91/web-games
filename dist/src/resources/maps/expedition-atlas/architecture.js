export const atlasDeckRules = {
    span: 0.48,
    boardDepth: 0.43,
    postGap: 4,
    postWidth: 0.12,
    postHeight: 0.55,
};
export const atlasMillWheel = {
    x: -12.2,
    z: 10,
    y: 1.55,
    radius: 1.4,
    rim: 0.15,
    depth: 0.6,
};
export const atlasHotSpring = { x: -12.9, z: 11.8, radius: 1.6 };
/** 건물과 큰 작업물을 그리는 크기로 충돌도 계산한다. 낮은 바닥 장식은 통행을 막지 않는다. */
export function atlasStructures(id) {
    const result = [];
    const box = (x, z, width, height, depth, surface = 'stone', color = 0xaaa389, placement = {}) => result.push({
        kind: 'box',
        x,
        z,
        width,
        height,
        depth,
        surface,
        color,
        ...placement,
        occupancy: placement.occupancy ?? 'solid',
    });
    switch (id) {
        case 'wetland':
            for (const side of [-1, 1]) {
                box(2 + side * 1.9, 18.7, 0.16, 3.5, 0.16, 'wood', 0x7e755d);
                box(2 + side * 2.8, 19.4, 2, 0.25, 1.1, 'wood', 0x988b6d, { y: 0.18 });
            }
            box(2, 18.7, 4.3, 0.14, 0.14, 'wood', 0x7e755d, {
                y: 3.5,
                occupancy: 'overhead',
            });
            break;
        case 'quarry':
            for (const point of [
                { x: -13, z: 13 },
                { x: 1, z: 20.8 },
                { x: 12, z: 15.8 },
            ])
                for (let tier = 0; tier < 3; tier++)
                    box(point.x + tier * 0.2, point.z, 3.8 - tier * 0.5, 0.8, 1.5 - tier * 0.2, 'stone', 0xaaa389, { y: 0.45 + tier * 0.75 });
            for (let i = 0; i < 4; i++)
                box(10.7 + (i % 2) * 0.85, 16 + Math.floor(i / 2) * 0.75, 0.72, 0.65, 0.65, 'stone', 0xaca188);
            break;
        case 'ruins':
            for (const x of [-2.8, 2.8]) {
                box(x, 4, 0.7, 3.3, 0.7);
                box(x, 4, 1, 0.3, 1.05, 'stone', 0xa2a897, {
                    y: 2.8,
                    occupancy: 'overhead',
                });
            }
            box(0, 4, 6.7, 0.24, 1.05, 'wood', 0x82795f, {
                y: 3.5,
                occupancy: 'overhead',
            });
            box(0, 22.5, 5.5, 0.45, 1.8, 'stone', 0xaaa389, { y: 0.22 });
            for (const x of [-2, 2])
                box(x, 22.5, 0.45, 2.5, 0.45, 'stone', 0xb1b0a0);
            for (const x of [-9, -7])
                box(x, 19.8, 0.6, x === -9 ? 1.9 : 0.9, 0.6, 'stone', 0xa3aa9a);
            for (let z = 6; z < 15; z += 1.2)
                box(-1.8, z, 0.9, 0.025, 0.7, 'stone', 0xc2bda8, {
                    y: 0.032,
                    occupancy: 'floor',
                });
            break;
        case 'snow':
            for (const x of [9.4, 12.4])
                box(x, 14, 0.13, 3.1, 0.13, 'wood', 0x8d8167);
            box(10.9, 14, 3.6, 0.22, 1.8, 'stone', 0xd2d3c4, {
                y: 3.3,
                occupancy: 'overhead',
            });
            break;
        case 'coast':
            for (const x of [1.2, 6.8])
                result.push({ kind: 'rock', x, z: 18, radius: 0.95, height: 3.3 });
            for (const side of [-1, 1])
                for (let i = 0; i < 5; i++)
                    box(-7.7 + side * 0.55, 8.7 + i * 0.6, 0.2, 0.5, 0.5, 'wood', 0x9e8c6e, { y: 0.2 + (i % 2) * 0.15 });
            break;
        case 'bamboo':
            for (const x of [-15.4, -12.6])
                box(x, 17.4, 0.13, 3.2, 0.13, 'wood', 0x7c8466);
            box(-14, 17.4, 3.1, 0.13, 0.18, 'wood', 0x7c8466, {
                y: 3.2,
                occupancy: 'overhead',
            });
            break;
        case 'canyon':
            for (const x of [-0.3, 4.3])
                box(x, 26.4, 0.17, 0.7, 0.17, 'wood', 0x8e745b);
            box(2, 26.4, 4.7, 0.12, 0.12, 'wood', 0x8e745b, { y: 0.65 });
            for (const x of [-19.5, -16.5])
                box(x, 13.2, 0.14, 0.65, 0.14, 'wood', 0x8e745b);
            break;
        case 'mill':
            for (const point of [
                { x: -13, z: 21 },
                { x: 12.8, z: 21.7 },
                { x: 12.8, z: 8 },
            ]) {
                box(point.x, point.z, 2.7, 1.8, 2.4, 'wood', 0x8c8067);
                box(point.x, point.z, 3.3, 0.3, 2.9, 'stone', 0x889a8c, {
                    y: 2,
                    occupancy: 'overhead',
                });
            }
            for (const z of [8, 12])
                box(-12.2, z, 0.32, 1.5, 0.4, 'stone', 0xa4a796);
            break;
        case 'garden':
            box(0, 28.2, 5, 2.6, 2.4, 'wood', 0x8e7b63);
            box(0, 28.2, 6, 0.35, 3.5, 'stone', 0x8f9588, {
                y: 2.85,
                occupancy: 'overhead',
            });
            for (const x of [-2.6, 2.6])
                box(x, 25.7, 0.18, 3.3, 0.18, 'wood', 0x967d61);
            box(0, 25.7, 5.8, 0.22, 0.35, 'wood', 0x967d61, {
                y: 3.3,
                occupancy: 'overhead',
            });
            for (const point of [
                { x: -14, z: 16 },
                { x: -10, z: 17.8 },
                { x: 12, z: 6 },
                { x: 8, z: 18.6 },
            ]) {
                box(point.x, point.z, 0.55, 0.18, 0.55);
                box(point.x, point.z, 0.18, 0.8, 0.18);
                box(point.x, point.z, 0.45, 0.35, 0.45, 'stone', 0xb7b3a0, { y: 0.95 });
                box(point.x, point.z, 0.7, 0.13, 0.7, 'stone', 0x969e8c, { y: 1.2 });
            }
            break;
        case 'caldera':
            for (let i = 0; i < 5; i++)
                result.push({
                    kind: 'rock',
                    x: 14.4 + (i % 2) * 0.5,
                    z: 12.5 + i * 0.8,
                    radius: 0.5,
                    height: 1.5 + (i % 3) * 0.6,
                });
            for (const x of [-9.7, -6.3])
                box(x, 23.5, 0.7, 0.3, 0.7, 'stone', 0x777e79);
            break;
    }
    return result;
}
