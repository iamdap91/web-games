import * as THREE from 'three';
export const alternateBattleMapDefinitions = {
    boar: {
        name: '솔뿌리 폐역참',
        description: '무너진 역참 지붕과 오래된 우물, 돌기단을 감아 자란 큰 솔뿌리.',
    },
    bear: {
        name: '청빙 호수턱',
        description: '비스듬히 솟은 푸른 빙릉과 빈 감시초소, 호수 가장자리의 얼음틈.',
    },
    armadillo: {
        name: '꺼진 제련마당',
        description: '입구가 깨진 용광로와 두 굴뚝, 슬래그와 무너진 작업대가 남은 마당.',
    },
    mantis: {
        name: '죽림 옛 수련원',
        description: '낡은 출입문과 끊어진 대나무담, 길 가장자리의 기울어진 훈련말뚝.',
    },
};
function beam(kit, from, to, radius, surface, parent = kit.root) {
    const direction = new THREE.Vector3(to.x - from.x, to.y - from.y, to.z - from.z);
    const mesh = kit.mesh(new THREE.CylinderGeometry(radius * 0.88, radius, direction.length(), 7), surface, { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2, z: (from.z + to.z) / 2 }, parent);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    return mesh;
}
function curvedRoot(kit, points, radius, parent = kit.root) {
    kit.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(point.x, point.y, point.z))), 18, radius, 7, false), 'bark', { x: 0, y: 0, z: 0 }, parent);
}
function cornerDebris(kit, surface, cap) {
    for (const side of [-1, 1]) {
        const block = kit.mesh(new THREE.DodecahedronGeometry(1, 0), surface, { x: side * 11.9, y: 0.39, z: 7.65 }, kit.foreground);
        block.scale.set(1.75, 0.8, 1.1);
        block.rotation.set(0.1, side * 0.5, side * 0.12);
        const top = kit.mesh(new THREE.IcosahedronGeometry(1, 1), cap, { x: side * 11.5, y: 0.86, z: 7.6 }, kit.foreground);
        top.scale.set(1.1, 0.17, 0.73);
        kit.box({ x: side * 10.9, y: 0.09, z: 8.05 }, { x: 0.7, y: 0.18, z: 0.5 }, surface, kit.foreground).rotation.y = side * 0.4;
    }
}
/** 중앙을 비워 두고 뒤쪽 건물과 옆쪽 흔적 사이에 낮은 소재 조각을 잇는다. */
function edgeFragments(kit, surface, accent) {
    for (let i = 0; i < 22; i++) {
        const rear = i < 12, side = i % 2 ? 1 : -1, x = rear ? -14.5 + i * 2.65 : side * (10.3 + (i % 3) * 0.48), z = rear ? -5.7 - (i % 3) * 0.27 : -3.5 + Math.floor((i - 12) / 2) * 1.8;
        const fragment = kit.rock({ x, y: 0.1 + (i % 2) * 0.07, z }, { x: 0.33 + (i % 3) * 0.12, y: 0.18, z: 0.31 + (i % 2) * 0.18 }, i % 4 === 0 ? accent : surface);
        fragment.rotation.set(i * 0.15, i * 0.63, 0);
    }
}
function oldWell(kit) {
    const x = 5.65, z = -6.75;
    const dark = kit.mesh(new THREE.CircleGeometry(0.92, 20), 'bark', {
        x,
        y: 0.035,
        z,
    });
    dark.rotation.x = -Math.PI / 2;
    for (let level = 0; level < 2; level++)
        for (let i = 0; i < 10; i++) {
            const angle = (i / 10) * Math.PI * 2 + level * 0.27;
            const block = kit.box({
                x: x + Math.cos(angle) * 1.1,
                y: 0.25 + level * 0.42,
                z: z + Math.sin(angle) * 1.1,
            }, { x: 0.73, y: 0.37, z: 0.43 }, i % 4 === 0 ? 'moss' : 'stone');
            block.rotation.y = -angle + Math.PI / 2;
        }
    for (const side of [-1, 1])
        beam(kit, { x: x + side * 1.37, y: 0, z }, { x: x + side * 1.43, y: 2.48 - (side > 0 ? 0.23 : 0), z }, 0.12, 'wood');
    beam(kit, { x: x - 1.62, y: 2.22, z }, { x: x + 1.6, y: 2.22, z }, 0.14, 'wood');
    beam(kit, { x, y: 2.2, z }, { x, y: 0.57, z }, 0.035, 'rope');
    kit.mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.36, 8), 'wood', {
        x,
        y: 0.52,
        z,
    });
}
function rootWaystation(kit) {
    const x = -5.4, z = -7.7;
    for (let i = 0; i < 8; i++)
        kit.box({ x: x - 3.5 + i, y: 0.2, z }, { x: 0.91, y: 0.4, z: 2.5 }, i % 3 === 0 ? 'moss' : 'stone');
    for (const dx of [-3.1, 0.4, 3.1])
        beam(kit, { x: x + dx, y: 0.37, z: z + 0.75 }, { x: x + dx + 0.1, y: dx > 0 ? 2.22 : 2.75, z: z + 0.65 }, 0.16, 'wood');
    for (let i = 0; i < 6; i++)
        kit.box({ x: x - 2.9 + i * 1.06, y: 1.28, z: z - 0.92 }, { x: 0.9, y: 1.8 - (i % 3) * 0.18, z: 0.19 }, 'wood').rotation.z = (i % 2 ? -1 : 1) * 0.025;
    beam(kit, { x: x - 3.3, y: 2.75, z: z + 0.65 }, { x: x + 3.4, y: 2.24, z: z + 0.65 }, 0.18, 'wood');
    for (let i = 0; i < 8; i++) {
        if (i === 2 || i === 6)
            continue;
        const roof = kit.box({ x: x - 3.4 + i * 0.95, y: 3.0 - i * 0.09, z: z - 0.04 }, { x: 0.9, y: 0.18, z: 3.25 - (i % 3) * 0.28 }, i % 3 ? 'bark' : 'moss');
        roof.rotation.set(-0.17, 0.015 * i, -0.08);
    }
    for (let i = 0; i < 4; i++) {
        const fallen = kit.box({ x: x + 2.0 + i * 0.5, y: 0.38 + i * 0.12, z: z + 1.5 }, { x: 0.41, y: 0.16, z: 2.1 }, 'wood');
        fallen.rotation.set(-0.25, 0.3 + i * 0.15, 0.08);
    }
    const sign = kit.box({ x: x - 1.65, y: 2.22, z: z + 0.95 }, { x: 1.3, y: 0.49, z: 0.13 }, 'cloth');
    sign.rotation.z = -0.21;
}
function buildRootStation(kit) {
    rootWaystation(kit);
    oldWell(kit);
    for (const points of [
        [
            { x: 12.2, y: 0.5, z: -8.3 },
            { x: 9.9, y: 3.7, z: -8.7 },
            { x: 6.1, y: 4.5, z: -8.9 },
            { x: 2.5, y: 2.3, z: -8.6 },
            { x: 0.2, y: 0.1, z: -7.2 },
        ],
        [
            { x: 11.5, y: 0.1, z: -6.6 },
            { x: 8.5, y: 0.65, z: -7.7 },
            { x: 6.6, y: 2.8, z: -8.5 },
            { x: 7.4, y: 4.3, z: -8.8 },
        ],
        [
            { x: -11.8, y: 0.18, z: -6.2 },
            { x: -9.5, y: 1.5, z: -7.5 },
            { x: -8.5, y: 3.3, z: -8.8 },
            { x: -5.7, y: 3.0, z: -9.1 },
        ],
    ])
        curvedRoot(kit, points, 0.31);
    for (let i = 0; i < 8; i++)
        kit.rock({
            x: i < 4 ? 8.1 + i * 0.77 : -11.9 + (i - 4) * 0.7,
            y: 0.22,
            z: -6.4 - (i % 2) * 0.9,
        }, { x: 0.84, y: 0.19, z: 0.52 }, 'moss');
    for (const [x, z, height] of [
        [-13.4, -9.1, 4.3],
        [13.2, -10.1, 4.5],
        [14.1, -3.1, 3.6],
        [-13.1, 1.2, 3.4],
    ])
        kit.pine({ x, z }, height);
    for (const side of [-1, 1])
        curvedRoot(kit, [
            { x: side * 13.4, y: 0.4, z: 8.1 },
            { x: side * 11.8, y: 1.0, z: 7.5 },
            { x: side * 10.8, y: 0.1, z: 7.4 },
        ], 0.23, kit.foreground);
    edgeFragments(kit, 'stone', 'moss');
    cornerDebris(kit, 'bark', 'moss');
}
function iceRidge(kit, x, z, width, height) {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, 0);
    shape.lineTo(-width * 0.13, height);
    shape.lineTo(width * 0.16, height * 0.77);
    shape.lineTo(width / 2, 0.1);
    shape.closePath();
    const shard = kit.mesh(new THREE.ExtrudeGeometry(shape, { depth: 1.05, bevelEnabled: false }), 'ice', { x, y: 0, z });
    shard.rotation.set(0, -0.22, -0.1);
    kit.rock({ x: x - 0.32, y: 0.14, z: z + 0.92 }, { x: width * 0.73, y: 0.25, z: 0.74 }, 'snow');
}
function watchPlatform(kit) {
    const x = -6.0, z = -7.85;
    for (const dx of [-1.4, 1.4])
        for (const dz of [-0.75, 0.75]) {
            beam(kit, { x: x + dx * 1.13, y: 0.05, z: z + dz }, { x: x + dx, y: 3.05, z: z + dz }, 0.13, 'wood');
            kit.rock({ x: x + dx * 1.13, y: 0.11, z: z + dz }, { x: 0.5, y: 0.13, z: 0.44 }, 'snow');
        }
    beam(kit, { x: x - 1.4, y: 0.5, z: z + 0.75 }, { x: x + 1.4, y: 2.6, z: z + 0.75 }, 0.075, 'wood');
    beam(kit, { x: x + 1.4, y: 0.5, z: z - 0.75 }, { x: x - 1.4, y: 2.6, z: z - 0.75 }, 0.075, 'wood');
    for (let i = 0; i < 7; i++) {
        if (i === 5)
            continue;
        kit.box({ x: x - 1.55 + i * 0.52, y: 2.55, z }, { x: 0.47, y: 0.16, z: 2.15 }, 'wood');
        if (i % 2 === 0)
            kit.box({ x: x - 1.55 + i * 0.52, y: 2.66, z: z - 0.45 }, { x: 0.48, y: 0.08, z: 1.15 }, 'snow');
    }
    for (const dx of [-1.42, 1.42])
        beam(kit, { x: x + dx, y: 2.58, z: z + 0.7 }, { x: x + dx, y: 3.9, z: z + 0.7 }, 0.085, 'wood');
    for (const dx of [-1.42, 1.42])
        beam(kit, { x: x + dx, y: 2.58, z: z - 0.75 }, { x: x + dx, y: 4.01, z: z - 0.75 }, 0.085, 'wood');
    beam(kit, { x: x - 1.65, y: 3.5, z: z + 0.72 }, { x: x + 0.45, y: 3.35, z: z + 0.72 }, 0.055, 'wood');
    for (let i = 0; i < 5; i++) {
        const roof = kit.box({ x: x - 1.5 + i * 0.73, y: 4.1 - i * 0.08, z: z - 0.11 }, { x: 0.67, y: 0.18, z: 2.66 }, i === 3 ? 'wood' : 'snow');
        roof.rotation.set(-0.07, 0, -0.12);
    }
    for (let i = 0; i < 5; i++)
        beam(kit, { x: x + 1.65, y: 0.17 + i * 0.46, z: z + 1.1 }, { x: x + 2.2, y: 0.17 + i * 0.46, z: z + 1.1 }, 0.04, 'wood');
    for (const dx of [1.63, 2.23])
        beam(kit, { x: x + dx, y: 0.05, z: z + 1.1 }, { x: x + dx, y: 2.55, z: z + 1.1 }, 0.055, 'wood');
}
function buildLakeLedge(kit) {
    watchPlatform(kit);
    for (const [x, z, width, height] of [
        [-13.5, -8.7, 3.0, 2.3],
        [-10.7, -9.4, 2.6, 2.8],
        [0.2, -8.0, 2.8, 2.3],
        [2.6, -8.5, 3.0, 3.3],
        [5.2, -8.1, 3.5, 4.4],
        [8.1, -8.6, 3.0, 4.0],
        [11.0, -7.9, 3.4, 2.7],
        [13.4, -9.4, 3.0, 3.4],
    ])
        iceRidge(kit, x, z, width, height);
    for (let i = 0; i < 9; i++) {
        const ice = kit.rock({ x: -13.4 + i * 3.15, y: 0.04, z: -5.95 - (i % 3) * 0.36 }, { x: 1.94, y: 0.1, z: 0.88 }, 'ice');
        ice.rotation.y = i * 0.28;
        const fissure = kit.box({ x: -12.8 + i * 3.15, y: 0.145, z: -5.93 - (i % 3) * 0.36 }, { x: 1.5, y: 0.018, z: 0.055 }, 'basalt');
        fissure.rotation.y = -0.45 + (i % 3) * 0.39;
    }
    for (const [x, z, height] of [
        [-14, -4.4, 3.6],
        [-13.7, 2.7, 3.4],
        [14.1, -3.7, 3.7],
        [13.6, 3.1, 3.2],
    ])
        kit.pine({ x, z }, height, { snow: true });
    edgeFragments(kit, 'snow', 'ice');
    cornerDebris(kit, 'ice', 'snow');
}
function furnaceMouth(kit) {
    const x = -5.45, z = -7.45;
    kit.mesh(new THREE.CylinderGeometry(1.45, 2.04, 2.45, 12), 'ash', {
        x,
        y: 1.23,
        z,
    });
    kit.mesh(new THREE.CylinderGeometry(1.56, 1.6, 0.22, 12), 'basalt', {
        x,
        y: 2.5,
        z,
    });
    kit.mesh(new THREE.CylinderGeometry(0.87, 1.06, 0.47, 9), 'basalt', {
        x: x + 0.15,
        y: 2.84,
        z: z - 0.24,
    });
    const mouth = kit.mesh(new THREE.CircleGeometry(1.03, 16), 'basalt', {
        x,
        y: 0.77,
        z: z + 1.98,
    });
    mouth.scale.y = 0.88;
    for (let i = 0; i < 10; i++) {
        if (i === 7)
            continue;
        const a = (i / 10) * Math.PI + 0.015, b = ((i + 1) / 10) * Math.PI - 0.015;
        const shape = new THREE.Shape();
        shape.moveTo(Math.cos(a) * 1.04, Math.sin(a) * 1.04);
        shape.lineTo(Math.cos(a) * 1.49, Math.sin(a) * 1.49);
        shape.lineTo(Math.cos(b) * 1.49, Math.sin(b) * 1.49);
        shape.lineTo(Math.cos(b) * 1.04, Math.sin(b) * 1.04);
        shape.closePath();
        kit.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.36, bevelEnabled: false }), 'stone', { x, y: 0.58, z: z + 1.76 });
    }
    for (const side of [-1, 1])
        for (let row = 0; row < 2; row++)
            kit.box({ x: x + side * 1.26, y: 0.22 + row * 0.29, z: z + 1.89 }, { x: 0.46, y: 0.26, z: 0.57 }, 'basalt');
    for (let i = 0; i < 8; i++)
        kit.rock({ x: x - 1.1 + i * 0.34, y: 0.1, z: z + 2.1 + (i % 2) * 0.28 }, { x: 0.26, y: 0.11, z: 0.3 }, i % 3 ? 'basalt' : 'ash');
    for (const side of [-1, 1])
        beam(kit, { x: x + side * 1.15, y: 1.75, z }, { x: x + side * 2.55, y: 1.65, z: z - 0.4 }, 0.22, 'basalt');
}
function chimney(kit, x, z, height) {
    kit.box({ x, y: 0.17, z }, { x: 1.85, y: 0.34, z: 1.8 }, 'basalt');
    const rows = 7;
    for (let row = 0; row < rows; row++) {
        const block = kit.box({
            x: x + Math.sin(row * 1.1) * 0.04,
            y: 0.34 + ((row + 0.5) / rows) * height,
            z,
        }, { x: 1.28 - row * 0.055, y: height / rows - 0.035, z: 1.14 - row * 0.04 }, row % 4 === 0 ? 'stone' : 'ash');
        block.rotation.y = row * 0.008;
    }
    for (const side of [-1, 1]) {
        kit.box({ x: x + side * 0.43, y: height + 0.47, z }, { x: 0.27, y: 0.25, z: 1.28 }, 'basalt');
        kit.box({ x, y: height + 0.47, z: z + side * 0.5 }, { x: 0.66, y: 0.25, z: 0.25 }, 'basalt');
    }
}
function buildSmeltingYard(kit) {
    furnaceMouth(kit);
    chimney(kit, 3.7, -8.05, 4.1);
    chimney(kit, 6.3, -8.5, 2.65);
    beam(kit, { x: -3.2, y: 2.25, z: -8.4 }, { x: 3.7, y: 2.25, z: -8.4 }, 0.34, 'basalt');
    for (const x of [-1.65, 0.2, 2.05])
        kit.mesh(new THREE.TorusGeometry(0.36, 0.075, 5, 9), 'ash', {
            x,
            y: 2.25,
            z: -8.4,
        }).rotation.y = Math.PI / 2;
    for (let i = 0; i < 14; i++) {
        const top = i >= 8, x = 8.4 + (i % 4) * 1.1, z = -6.3 - Math.floor(i / 4) * 0.76;
        const slag = kit.rock({ x, y: top ? 0.85 + (i % 3) * 0.26 : 0.32, z }, { x: top ? 0.8 : 1.05, y: top ? 0.65 : 0.47, z: 0.76 }, i % 4 ? 'basalt' : 'ash');
        slag.rotation.set(i * 0.12, i * 0.67, 0);
    }
    for (const side of [-1, 1]) {
        const x = side * 11.45;
        for (const dx of [-0.8, 0.8])
            kit.box({ x: x + dx, y: 0.43, z: 0.35 }, { x: 0.25, y: 0.86, z: 0.86 }, 'wood').rotation.z = dx * 0.09;
        const bench = kit.box({ x, y: 0.94, z: 0.35 }, { x: 2.45, y: 0.2, z: 1.08 }, 'wood');
        bench.rotation.z = side * 0.08;
        kit.box({ x: x + side * 0.35, y: 1.12, z: 0.35 }, { x: 0.58, y: 0.22, z: 0.42 }, 'basalt');
    }
    for (let i = 0; i < 9; i++) {
        const slab = kit.box({
            x: -12.6 + i * 0.54,
            y: 0.23 + (i % 3) * 0.13,
            z: -6.1 - (i % 2) * 0.43,
        }, { x: 0.6, y: 0.39, z: 0.54 }, 'ash');
        slab.rotation.set(0.15 * (i % 2), i * 0.32, 0.14);
    }
    edgeFragments(kit, 'ash', 'basalt');
    cornerDebris(kit, 'basalt', 'ash');
}
function bambooPost(kit, x, z, height, lean) {
    for (let i = 0; i < 3; i++) {
        const h = height / 3, y = (i + 0.5) * h;
        const stalk = kit.mesh(new THREE.CylinderGeometry(0.082, 0.092, h - 0.035, 7), 'bamboo', { x: x + lean * y, y, z });
        stalk.rotation.z = -Math.atan(lean);
        kit.mesh(new THREE.CylinderGeometry(0.108, 0.108, 0.07, 7), 'moss', {
            x: x + lean * (i + 1) * h,
            y: (i + 1) * h - 0.02,
            z,
        }).rotation.z = stalk.rotation.z;
    }
}
function trainingPost(kit, position, angle) {
    const model = new THREE.Group();
    model.position.set(position.x, position.y, position.z);
    model.rotation.z = angle;
    kit.root.add(model);
    kit.mesh(new THREE.CylinderGeometry(0.23, 0.31, 1.8, 8), 'wood', { x: 0, y: 1.0, z: 0 }, model);
    beam(kit, { x: -0.72, y: 1.42, z: 0.06 }, { x: 0.72, y: 1.42, z: 0.06 }, 0.07, 'wood', model);
    beam(kit, { x: 0.05, y: 0.69, z: 0.1 }, { x: 0.55, y: 0.5, z: 0.55 }, 0.08, 'wood', model);
    for (const y of [0.95, 1.53])
        kit.mesh(new THREE.CylinderGeometry(0.265, 0.27, 0.11, 8), 'rope', { x: 0, y, z: 0 }, model);
    kit.box({ x: 0, y: 1.75, z: 0.24 }, { x: 0.24, y: 0.27, z: 0.07 }, 'bark', model);
    kit.rock({ x: position.x, y: 0.09, z: position.z }, { x: 0.7, y: 0.12, z: 0.65 }, 'stone');
}
function oldTrainingGate(kit) {
    const z = -7.8;
    for (const side of [-1, 1]) {
        const x = side * 3.25;
        kit.box({ x, y: 0.2, z }, { x: 1.0, y: 0.4, z: 1.04 }, 'stone');
        kit.box({ x, y: 1.85, z }, { x: 0.48, y: 3.3, z: 0.54 }, 'wood').rotation.z = -side * 0.025;
        kit.box({ x, y: 2.2, z: z + 0.3 }, { x: 0.21, y: 1.3, z: 0.055 }, 'cloth');
        const door = new THREE.Group();
        door.position.set(side * 2.34, 1.65, z - 0.24);
        door.rotation.y = side * 0.8;
        kit.root.add(door);
        kit.box({ x: 0, y: 0, z: 0 }, { x: 1.25, y: 2.55, z: 0.13 }, 'wood', door);
        for (let i = 0; i < 3; i++)
            kit.box({ x: -0.3 + i * 0.3, y: 0.45, z: 0.1 }, { x: 0.055, y: 1.2, z: 0.07 }, 'bamboo', door);
    }
    kit.box({ x: 0, y: 3.4, z }, { x: 8.05, y: 0.4, z: 0.82 }, 'wood');
    kit.box({ x: 0, y: 3.7, z: z - 0.07 }, { x: 8.6, y: 0.18, z: 1.43 }, 'bark');
    for (let i = 0; i < 9; i++) {
        if (i === 1 || i === 7)
            continue;
        const cap = kit.box({
            x: -3.7 + i * 0.93,
            y: 3.87 + Math.sin((i / 8) * Math.PI) * 0.2,
            z: z - 0.04,
        }, { x: 0.86, y: 0.14, z: 1.65 }, i % 4 ? 'bamboo' : 'moss');
        cap.rotation.x = -0.1;
    }
    const sign = kit.box({ x: -0.1, y: 3.04, z: z + 0.47 }, { x: 1.55, y: 0.6, z: 0.12 }, 'cloth');
    sign.rotation.z = -0.04;
}
function buildTrainingCourt(kit) {
    oldTrainingGate(kit);
    for (const side of [-1, 1]) {
        for (let i = 0; i < 7; i++) {
            if (i === 2 || (side < 0 && i === 5))
                continue;
            bambooPost(kit, side * (5.15 + i * 1.3), -6.6 - (i % 2) * 0.14, 1.55 + (i % 3) * 0.28, side * (i === 3 ? 0.2 : 0.025));
        }
        for (const y of [0.45, 1.25])
            beam(kit, { x: side * 4.75, y, z: -6.65 }, { x: side * 13.55, y: y - 0.15, z: -6.7 }, 0.06, 'bamboo');
        kit.rootBranch([
            { x: side * 12.3, y: 0.16, z: -2.8 },
            { x: side * 10.85, y: 0.18, z: -1.7 },
            { x: side * 10.1, y: 0.025, z: -0.3 },
        ], 0.09);
        for (let i = 0; i < 3; i++)
            beam(kit, { x: side * (11.65 + i * 0.28), y: 0.1, z: 7.6 + i * 0.22 }, { x: side * (11.3 + i * 0.36), y: 1.35 + i * 0.32, z: 7.7 + i * 0.2 }, 0.07, 'bamboo', kit.foreground);
    }
    trainingPost(kit, { x: -10.9, y: 0, z: -1.8 }, -0.15);
    trainingPost(kit, { x: 11.4, y: 0, z: 1.4 }, 0.2);
    trainingPost(kit, { x: 7.7, y: 0, z: -6.1 }, -0.08);
    for (const [x, z, h] of [
        [-12.7, -9.2, 4.2],
        [-7.3, -9.4, 3.7],
        [6.7, -9.8, 4.1],
        [13.2, -9, 4.5],
    ])
        bambooPost(kit, x, z, h, Math.sin(x) * 0.07);
    for (let i = 0; i < 11; i++) {
        const leaf = kit.rock({ x: -13.5 + i * 2.7, y: 0.15 + (i % 3) * 0.12, z: -5.8 - (i % 2) * 0.3 }, { x: 0.7 + (i % 2) * 0.33, y: 0.1, z: 0.36 }, i % 3 ? 'leaf' : 'moss');
        leaf.rotation.y = i * 0.85;
    }
    edgeFragments(kit, 'stone', 'moss');
    cornerDebris(kit, 'stone', 'moss');
}
/** 기존 전투 규칙과 중앙 배치는 유지하고 지역별 두 번째 무대만 조립한다. */
export function buildAlternateBattleMap(kit, encounter) {
    switch (encounter) {
        case 'boar':
            buildRootStation(kit);
            return;
        case 'bear':
            buildLakeLedge(kit);
            return;
        case 'armadillo':
            buildSmeltingYard(kit);
            return;
        case 'mantis':
            buildTrainingCourt(kit);
    }
}
