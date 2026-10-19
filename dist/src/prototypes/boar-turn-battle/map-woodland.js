import * as THREE from 'three';
/** 모서리를 깎은 수평 지층은 두께를 함께 만들어 사각 판처럼 보이지 않게 한다. */
function ledge(kit, position, size, surface) {
    const shape = new THREE.Shape();
    const points = [
        [-0.5, -0.32],
        [-0.27, -0.5],
        [0.3, -0.45],
        [0.5, -0.16],
        [0.42, 0.32],
        [0.13, 0.5],
        [-0.39, 0.4],
        [-0.52, 0.1],
    ];
    points.forEach(([x, z], index) => {
        if (index === 0)
            shape.moveTo(x * size.x, -z * size.z);
        else
            shape.lineTo(x * size.x, -z * size.z);
    });
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: size.y,
        bevelEnabled: false,
    });
    geometry.rotateX(-Math.PI / 2);
    return kit.mesh(geometry, surface, position);
}
function cornerRock(kit, position, scale, surface) {
    const rock = kit.mesh(new THREE.IcosahedronGeometry(1, 1), surface, position, kit.foreground);
    rock.scale.set(scale.x, scale.y, scale.z);
    return rock;
}
function brokenGate(kit) {
    const center = { x: -5.4, z: -6.65 };
    for (const side of [-1, 1]) {
        kit.box({ x: center.x + side * 1.45, y: 0.15, z: center.z }, { x: 1.2, y: 0.3, z: 1.4 }, 'stone');
        for (let row = 0; row < 3; row++) {
            const block = kit.box({ x: center.x + side * 1.45, y: 0.56 + row * 0.5, z: center.z }, { x: 0.85 - row * 0.035, y: 0.47, z: 1.08 }, 'stone');
            block.rotation.y = side * 0.018 * row;
        }
        kit.box({ x: center.x + side * 1.45, y: 1.86, z: center.z }, { x: 1.08, y: 0.22, z: 1.3 }, 'stone');
    }
    for (let i = 0; i < 9; i++) {
        const from = (i / 9) * Math.PI + 0.015;
        const to = ((i + 1) / 9) * Math.PI - 0.015;
        const shape = new THREE.Shape();
        shape.moveTo(Math.cos(from) * 1.03, 1.75 + Math.sin(from) * 1.03);
        shape.lineTo(Math.cos(from) * 1.82, 1.75 + Math.sin(from) * 1.82);
        shape.lineTo(Math.cos(to) * 1.82, 1.75 + Math.sin(to) * 1.82);
        shape.lineTo(Math.cos(to) * 1.03, 1.75 + Math.sin(to) * 1.03);
        shape.closePath();
        kit.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.95, bevelEnabled: false }), 'stone', { x: center.x, y: 0, z: center.z - 0.475 });
    }
    const cap = kit.box({ x: center.x - 0.25, y: 3.65, z: center.z + 0.04 }, { x: 2.1, y: 0.2, z: 1.18 }, 'stone');
    cap.rotation.z = -0.035;
    // 뒤쪽 작은 관문은 원경의 표식이며 중앙 전투 공간에는 걸치지 않는다.
    for (let i = 0; i < 5; i++) {
        const x = -8.1 - i * 0.83;
        kit.box({ x, y: 0.25, z: -6.4 + Math.sin(i * 2) * 0.2 }, { x: 0.79, y: 0.5, z: 0.95 }, 'stone');
        if (i !== 3)
            kit.box({ x: x + 0.06, y: 0.74, z: -6.44 }, { x: 0.76, y: 0.45, z: 0.84 }, 'stone');
    }
    for (let i = 0; i < 6; i++) {
        const rock = kit.rock({ x: -7.55 - i * 0.52, y: 0.15, z: -5.55 - (i % 2) * 0.55 }, { x: 0.37 + (i % 2) * 0.13, y: 0.22, z: 0.36 }, 'stone');
        rock.rotation.y = i * 0.9;
    }
    kit.box({ x: -3.85, y: 1.95, z: -6.02 }, { x: 0.13, y: 0.9, z: 0.14 }, 'wood');
    const hangingBoard = kit.box({ x: -3.85, y: 1.58, z: -5.94 }, { x: 0.62, y: 0.38, z: 0.11 }, 'wood');
    hangingBoard.rotation.z = -0.12;
}
function passRailing(kit) {
    for (let i = 0; i < 4; i++) {
        const z = -2.3 + i * 1.8;
        const post = kit.box({ x: -10.15, y: 0.57, z }, { x: 0.2, y: 1.14, z: 0.21 }, 'wood');
        post.rotation.z = i % 2 ? 0.08 : -0.035;
        if (i === 1)
            continue;
        const rail = kit.box({ x: -10.14, y: 0.86 - i * 0.06, z: z + 0.65 }, { x: 0.13, y: 0.16, z: 1.4 }, 'wood');
        rail.rotation.x = i === 2 ? -0.24 : 0.04;
    }
    const fallen = kit.box({ x: -10.0, y: 0.13, z: 1.0 }, { x: 0.17, y: 0.18, z: 1.75 }, 'wood');
    fallen.rotation.y = 0.48;
}
/** 따뜻한 층상 암반과 폐관문을 산길의 전후경으로 엮는다. */
export function buildMountainPass(kit) {
    ledge(kit, { x: 7.7, y: -0.08, z: -7.7 }, { x: 11.4, y: 0.55, z: 5.2 }, 'stone');
    ledge(kit, { x: 8.9, y: 0.45, z: -8.0 }, { x: 8.8, y: 0.55, z: 4.2 }, 'earth');
    ledge(kit, { x: 9.7, y: 0.97, z: -8.45 }, { x: 7.7, y: 0.62, z: 3.8 }, 'stone');
    ledge(kit, { x: -10.1, y: -0.1, z: -7.4 }, { x: 6.0, y: 0.42, z: 4.2 }, 'stone');
    ledge(kit, { x: -10.6, y: 0.3, z: -8.2 }, { x: 5.1, y: 0.45, z: 3.5 }, 'earth');
    for (const [x, z, width, height] of [
        [5.2, -8.7, 2.3, 1.7],
        [7.6, -8.0, 2.4, 2.1],
        [10.2, -8.65, 2.6, 2.7],
        [12.4, -7.4, 2.0, 2.8],
        [10.7, -5.85, 1.65, 1.35],
    ]) {
        const rock = kit.rock({ x, y: height * 0.73 + 0.35, z }, { x: width, y: height, z: 1.6 }, 'stone');
        rock.rotation.y = x * 0.29;
        ledge(kit, { x: x - 0.2, y: height * 0.55, z: z + 1.0 }, { x: width * 1.65, y: 0.18, z: 1.1 }, 'stone');
    }
    brokenGate(kit);
    passRailing(kit);
    for (const [x, z, height] of [
        [-11.6, -5.5, 3.7],
        [-9.3, -8.0, 3.0],
        [-2.25, -8.7, 2.6],
        [3.7, -10.3, 3.2],
        [12.7, -4.7, 3.7],
        [12.5, 2.8, 3.3],
    ])
        kit.pine({ x, z }, height);
    const roots = [
        [
            { x: -11.0, y: 0.75, z: -5.0 },
            { x: -10.15, y: 0.25, z: -4.2 },
            { x: -9.55, y: 0.07, z: -3.2 },
        ],
        [
            { x: -11.0, y: 0.55, z: -5.0 },
            { x: -10.3, y: 0.12, z: -5.7 },
            { x: -8.8, y: 0.05, z: -5.15 },
        ],
        [
            { x: 12.0, y: 0.65, z: -3.5 },
            { x: 10.5, y: 0.18, z: -2.0 },
            { x: 9.65, y: 0.06, z: -0.6 },
        ],
        [
            { x: 12.4, y: 0.45, z: 3.1 },
            { x: 10.8, y: 0.18, z: 4.5 },
            { x: 9.8, y: 0.05, z: 5.2 },
        ],
    ];
    roots.forEach((points, index) => kit.rootBranch(points, index % 2 ? 0.12 : 0.2));
    for (let i = 0; i < 12; i++) {
        const side = i % 2 ? -1 : 1;
        const x = side * (9.6 + (i % 3) * 0.55);
        const z = -4.5 + Math.floor(i / 2) * 1.85;
        kit.rock({ x, y: 0.06, z }, { x: 0.75 + (i % 3) * 0.19, y: 0.075, z: 0.45 }, i % 3 === 0 ? 'grass' : 'moss');
        if (i % 3 !== 0)
            kit.rock({ x: x + side * 0.3, y: 0.18, z: z + 0.3 }, { x: 0.3, y: 0.22, z: 0.38 }, 'stone');
    }
    for (const side of [-1, 1]) {
        cornerRock(kit, { x: side * 11.3, y: 0.3, z: 7.0 }, { x: 2.05, y: 0.72, z: 1.25 }, 'stone');
        cornerRock(kit, { x: side * 10.6, y: 0.08, z: 7.35 }, { x: 1.3, y: 0.18, z: 0.86 }, 'moss');
        cornerRock(kit, { x: side * 12.2, y: 0.7, z: 8.7 }, { x: 1.55, y: 1.1, z: 1.45 }, 'stone');
    }
}
function iceFall(kit) {
    ledge(kit, { x: 8.4, y: -0.02, z: -7.7 }, { x: 9.3, y: 0.48, z: 4.4 }, 'stone');
    for (const [x, z, height, width] of [
        [5.2, -7.7, 2.0, 1.75],
        [7.4, -8.0, 2.8, 2.0],
        [9.9, -8.0, 3.3, 2.3],
        [12.2, -7.5, 2.8, 1.6],
    ]) {
        const body = kit.rock({ x, y: height * 0.8 + 0.12, z }, { x: width, y: height, z: 1.65 }, 'stone');
        body.rotation.y = x * 0.18;
        kit.rock({ x: x - 0.1, y: height * 1.68 + 0.15, z: z - 0.02 }, { x: width * 1.02, y: 0.28, z: 1.6 }, 'snow');
    }
    for (let i = 0; i < 7; i++) {
        const width = 0.62 + (i % 3) * 0.18;
        const height = 2.3 + Math.sin(i * 0.9) * 0.5;
        const shape = new THREE.Shape();
        shape.moveTo(-width / 2, 0.16);
        shape.lineTo(-width * 0.6, height * 0.5);
        shape.lineTo(-width * 0.35, height);
        shape.lineTo(width * 0.42, height + 0.16);
        shape.lineTo(width * 0.55, height * 0.47);
        shape.lineTo(width * 0.3, 0);
        shape.closePath();
        kit.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.23, bevelEnabled: false }), 'ice', { x: 5.25 + i * 0.73, y: 0.33, z: -6.6 + Math.sin(i) * 0.12 });
        const ridge = kit.mesh(new THREE.CylinderGeometry(0.09, 0.2, height * 0.88, 5), 'ice', { x: 5.25 + i * 0.73, y: height * 0.48 + 0.32, z: -6.29 });
        ridge.rotation.z = Math.sin(i * 1.7) * 0.035;
    }
    ledge(kit, { x: 7.4, y: 2.77, z: -6.7 }, { x: 6.5, y: 0.25, z: 1.7 }, 'snow');
    for (let i = 0; i < 10; i++) {
        const length = 0.35 + ((i * 7) % 5) * 0.12;
        kit.mesh(new THREE.CylinderGeometry(0.1 + (i % 2) * 0.03, 0, length, 6), 'ice', { x: 4.75 + i * 0.56, y: 2.78 - length / 2, z: -5.98 });
    }
    kit.rock({ x: 7.55, y: 0.065, z: -5.35 }, { x: 2.9, y: 0.06, z: 0.9 }, 'ice');
}
/** 겹친 눈 둔덕과 수직 빙폭으로 따뜻한 석조 산길과 다른 윤곽을 만든다. */
export function buildFrostForest(kit) {
    for (const [x, z, width, depth, height] of [
        [-9.1, -7.9, 4.2, 2.6, 0.65],
        [-5.4, -8.7, 4.4, 2.2, 0.55],
        [-1.7, -8.0, 3.1, 2.4, 0.5],
        [1.0, -8.8, 3.4, 2.3, 0.65],
        [-10.2, -5.4, 2.8, 1.6, 0.42],
        [-5.9, -6.35, 3.6, 1.3, 0.28],
        [-1.7, -5.85, 3.3, 1.15, 0.2],
        [2.0, -6.5, 3.7, 1.35, 0.3],
    ]) {
        const drift = kit.rock({ x, y: height * 0.5, z }, { x: width, y: height, z: depth }, 'snow');
        drift.rotation.y = x * 0.08;
    }
    for (const [x, z, height] of [
        [-11.9, -5.4, 3.7],
        [-9.4, -8.1, 3.4],
        [-6.8, -8.7, 4.1],
        [-3.9, -7.8, 3.15],
        [-1.0, -9.6, 3.5],
        [2.4, -9.4, 3.2],
        [12.3, -4.2, 3.8],
        [-12.2, 1.1, 3.5],
        [12.6, 2.2, 3.2],
    ])
        kit.pine({ x, z }, height, { snow: true });
    iceFall(kit);
    for (let i = 0; i < 13; i++) {
        const side = i % 2 ? -1 : 1;
        const x = side * (9.7 + (i % 3) * 0.55);
        const z = -3.7 + Math.floor(i / 2) * 1.5;
        const width = 0.55 + (i % 3) * 0.17;
        kit.rock({ x, y: 0.13, z }, { x: width, y: 0.2, z: 0.5 }, 'stone');
        kit.rock({ x: x - side * 0.05, y: 0.31, z: z - 0.05 }, { x: width * 0.95, y: 0.075, z: 0.45 }, 'snow');
        if (i % 3 === 0)
            kit.rock({ x: x - side * 0.25, y: 0.025, z: z + 0.4 }, { x: width * 1.45, y: 0.025, z: 0.45 }, 'ice');
    }
    for (const side of [-1, 1]) {
        cornerRock(kit, { x: side * 11.35, y: 0.33, z: 7.3 }, { x: 2.05, y: 0.55, z: 1.2 }, 'snow');
        cornerRock(kit, { x: side * 12.15, y: 0.75, z: 8.4 }, { x: 1.55, y: 1.05, z: 1.3 }, 'snow');
        cornerRock(kit, { x: side * 10.4, y: 0.05, z: 7.1 }, { x: 0.75, y: 0.09, z: 0.55 }, 'ice');
        for (let i = 0; i < 4; i++) {
            const stalk = kit.mesh(new THREE.CylinderGeometry(0.025, 0.045, 0.48 + i * 0.08, 4), 'wood', { x: side * (10.9 + i * 0.13), y: 0.3, z: 7.55 + i * 0.09 }, kit.foreground);
            stalk.rotation.z = side * (0.18 + i * 0.06);
        }
    }
}
