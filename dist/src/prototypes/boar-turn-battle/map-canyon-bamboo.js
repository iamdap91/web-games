import * as THREE from 'three';
function pole(kit, from, to, radius, kind, parent = kit.root) {
    const direction = new THREE.Vector3(to.x - from.x, to.y - from.y, to.z - from.z);
    const mesh = kit.mesh(new THREE.CylinderGeometry(radius * 0.73, radius, direction.length(), 7), kind, {
        x: (from.x + to.x) / 2,
        y: (from.y + to.y) / 2,
        z: (from.z + to.z) / 2,
    }, parent);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    return mesh;
}
/** 얇은 소재 면을 뒤에서 보아도 유지되도록 같은 삼각형을 앞뒤로 만든다. */
function doubleSidedGeometry(triangles) {
    const positions = [...triangles];
    for (let i = 0; i < triangles.length; i += 9)
        positions.push(triangles[i], triangles[i + 1], triangles[i + 2], triangles[i + 6], triangles[i + 7], triangles[i + 8], triangles[i + 3], triangles[i + 4], triangles[i + 5]);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const xs = positions.filter((_, index) => index % 3 === 0);
    const ys = positions.filter((_, index) => index % 3 === 1);
    const minX = Math.min(...xs), minY = Math.min(...ys);
    const width = Math.max(...xs) - minX || 1, height = Math.max(...ys) - minY || 1;
    const uv = [];
    for (let i = 0; i < positions.length; i += 3)
        uv.push((positions[i] - minX) / width, (positions[i + 1] - minY) / height);
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geometry.computeVertexNormals();
    return geometry;
}
function basaltPillar(kit, point, width, height, angle, parent = kit.root) {
    const column = kit.mesh(new THREE.CylinderGeometry(0.83, 1, 1, 6), 'basalt', { x: point.x, y: point.y + height / 2, z: point.z }, parent);
    column.scale.set(width, height, width * 0.74);
    column.rotation.set(Math.sin(angle) * 0.035, angle, Math.cos(angle) * 0.045);
    kit.rock({ x: point.x + width * 0.11, y: point.y + height, z: point.z - 0.08 }, { x: width * 0.74, y: 0.15 + width * 0.12, z: width * 0.56 }, 'ash');
}
function lavaSeam(kit, points, width) {
    for (let i = 1; i < points.length; i++) {
        const from = points[i - 1], to = points[i];
        const seam = kit.box({ x: (from.x + to.x) / 2, y: 0.022, z: (from.z + to.z) / 2 }, { x: width, y: 0.025, z: Math.hypot(to.x - from.x, to.z - from.z) }, 'lava');
        seam.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
    }
}
function charredTree(kit, position, height, parent = kit.root) {
    const fork = { x: position.x + 0.18, y: height * 0.7, z: position.z };
    pole(kit, { ...position, y: 0 }, fork, 0.23, 'basalt', parent);
    pole(kit, fork, { x: position.x - 0.02, y: height, z: position.z + 0.12 }, 0.13, 'ash', parent);
    for (const side of [-1, 1]) {
        const elbow = {
            x: position.x + side * 0.72,
            y: height * 0.67,
            z: position.z + side * 0.24,
        };
        pole(kit, { x: fork.x, y: height * 0.5, z: fork.z }, elbow, 0.1, 'basalt', parent);
        pole(kit, elbow, { x: elbow.x + side * 0.28, y: height * 0.86, z: elbow.z - 0.15 }, 0.065, 'ash', parent);
    }
}
function ruinedKiln(kit) {
    const x = -11.4, z = -5.9;
    kit.box({ x, y: 0.12, z }, { x: 2.5, y: 0.24, z: 1.8 }, 'ash');
    for (const side of [-1, 1])
        for (let level = 0; level < 3; level++)
            kit.box({ x: x + side * (0.83 - level * 0.1), y: 0.42 + level * 0.34, z }, { x: 0.46, y: 0.29, z: 1.23 - level * 0.1 }, 'basalt').rotation.z = side * level * 0.035;
    kit.box({ x, y: 0.85, z: z - 0.53 }, { x: 1.46, y: 1.25, z: 0.31 }, 'basalt');
    const lintel = kit.box({ x: x - 0.16, y: 1.43, z: z + 0.02 }, { x: 1.42, y: 0.32, z: 1.02 }, 'stone');
    lintel.rotation.z = -0.12;
    kit.box({ x: x + 0.52, y: 1.64, z: z - 0.32 }, { x: 0.41, y: 0.58, z: 0.45 }, 'basalt');
    kit.rock({ x: x + 1.13, y: 0.23, z: z + 0.83 }, { x: 0.47, y: 0.26, z: 0.37 }, 'ash');
    kit.rock({ x: x - 0.3, y: 0.1, z: z + 0.17 }, { x: 0.53, y: 0.1, z: 0.48 }, 'ash');
}
/** 높은 현무암 절벽과 낮은 붉은 틈으로 중앙 평지를 둘러싼다. */
export function buildEmberCanyon(kit) {
    // 배경 두 층을 어긋나게 놓아 기둥 숲이 아닌 파손된 협곡 벽을 만든다.
    for (let i = 0; i < 11; i++) {
        const x = -16 + i * 3.15, height = 4.9 + Math.sin(i * 1.9) * 1.25;
        basaltPillar(kit, { x, y: 0, z: -12.1 - Math.cos(i * 1.4) * 0.8 }, 2.12 + (i % 3) * 0.19, height, i * 0.74);
        kit.rock({ x: x + 0.7, y: height * 0.49, z: -10.65 }, { x: 1.67, y: 0.24, z: 0.42 }, 'ash');
    }
    for (let i = 0; i < 9; i++) {
        const x = -13.6 + i * 3.4;
        kit.rock({ x, y: 1.02 + (i % 3) * 0.22, z: -8.5 - (i % 2) * 0.6 }, { x: 2.1, y: 1.45 + (i % 3) * 0.33, z: 1.16 }, i % 4 === 0 ? 'ash' : 'basalt');
        kit.rock({ x: x - 0.83, y: 0.25, z: -7.13 - (i % 2) * 0.3 }, { x: 0.87, y: 0.38, z: 0.62 }, 'basalt');
    }
    for (const side of [-1, 1]) {
        for (let i = 0; i < 4; i++) {
            const x = side * (11.8 + (i % 2) * 0.72), z = -3.7 + i * 3.8, parent = z >= 7 ? kit.foreground : kit.root;
            const column = kit.mesh(new THREE.CylinderGeometry(0.7, 1, 1, 5), 'basalt', { x, y: 1.3 + i * 0.12, z }, parent);
            column.scale.set(1.2 + (i % 2) * 0.35, 2.8 + i * 0.24, 1.24);
            column.rotation.y = side * (0.26 + i * 0.31);
            for (let shard = 0; shard < 3; shard++) {
                const mesh = kit.mesh(new THREE.DodecahedronGeometry(1, 0), shard === 1 ? 'ash' : 'basalt', { x: x + side * (0.3 + shard * 0.35), y: 0.25, z: z + 0.9 }, parent);
                mesh.scale.set(0.46 + shard * 0.12, 0.38, 0.7);
                mesh.rotation.set(shard * 0.3, i * 0.8, side * 0.4);
            }
        }
    }
    for (const [x, z, height] of [
        [-8.7, -6.4, 2.9],
        [-6.8, -7.1, 1.9],
        [-4.3, -7.7, 3.4],
        [1.4, -7.4, 2.6],
        [4.7, -7.2, 3.8],
        [7.6, -6.8, 2.2],
    ])
        basaltPillar(kit, { x, y: 0, z }, 0.44 + height * 0.035, height, x);
    lavaSeam(kit, [
        { x: -13, z: -5.1 },
        { x: -10.1, z: -5.7 },
        { x: -7.4, z: -5.8 },
        { x: -5.8, z: -6.5 },
        { x: -3, z: -6.1 },
    ], 0.11);
    lavaSeam(kit, [
        { x: 3.7, z: -6.1 },
        { x: 6.8, z: -5.7 },
        { x: 9.6, z: -5.9 },
        { x: 10.4, z: -3 },
        { x: 10.1, z: 0.7 },
        { x: 11.2, z: 3.4 },
    ], 0.13);
    lavaSeam(kit, [
        { x: -10.6, z: -2.6 },
        { x: -10, z: -0.5 },
        { x: -10.4, z: 1.6 },
        { x: -9.6, z: 3.6 },
    ], 0.08);
    lavaSeam(kit, [
        { x: 7.1, z: -5.7 },
        { x: 7.5, z: -6.5 },
        { x: 8.8, z: -7 },
    ], 0.065);
    ruinedKiln(kit);
    charredTree(kit, { x: -14.2, z: -5.9 }, 3.8);
    charredTree(kit, { x: 11.7, z: 7.3 }, 3.5, kit.foreground);
    pole(kit, { x: -11.1, y: 0.2, z: 3.7 }, { x: -12.7, y: 0.22, z: 5.8 }, 0.24, 'basalt');
    for (let i = 0; i < 23; i++) {
        const side = i % 2 ? 1 : -1, rear = i < 13, x = rear ? -13.8 + i * 2.12 : side * (10.2 + (i % 3) * 0.5), z = rear ? -6 - (i % 3) * 0.35 : -4.4 + (i - 13) * 1.05;
        kit.rock({ x, y: 0.12, z }, { x: 0.22 + (i % 3) * 0.1, y: 0.17 + (i % 2) * 0.08, z: 0.34 }, i % 4 === 0 ? 'ash' : 'basalt');
    }
}
/** 잎을 긴 조각으로 이어 한 장의 콜라주 실루엣을 만든다. */
function leafFan(kit, position, width, angle, parent = kit.root) {
    const triangles = [];
    for (let i = 0; i < 7; i++) {
        const t = i / 6, baseX = width * (t - 0.5) * 0.68, baseY = Math.sin(t * Math.PI) * width * 0.12, side = i < 3 ? -1 : 1, tipX = baseX + side * width * (0.15 + (i % 2) * 0.06), tipY = baseY + width * (0.22 + (i % 3) * 0.055), midX = (baseX + tipX) / 2, midY = (baseY + tipY) / 2, half = width * 0.045;
        triangles.push(baseX, baseY, 0, midX - half, midY + half, 0.025, tipX, tipY, 0, baseX, baseY, 0, tipX, tipY, 0, midX + half, midY - half, 0.025);
    }
    const leaf = kit.mesh(doubleSidedGeometry(triangles), 'leaf', position, parent);
    leaf.rotation.set(-0.14, angle, Math.sin(angle) * 0.14);
}
function bambooStem(kit, position, height, radius, lean, parent = kit.root) {
    const segments = 4, segmentHeight = height / segments;
    for (let level = 0; level < segments; level++) {
        const y = (level + 0.5) * segmentHeight, x = position.x + lean * y, r = radius * (1 - level * 0.085);
        const stem = kit.mesh(new THREE.CylinderGeometry(r * 0.94, r, segmentHeight - 0.045, 8), 'bamboo', { x, y, z: position.z }, parent);
        stem.rotation.z = -Math.atan(lean);
        const nodeY = (level + 1) * segmentHeight - 0.035;
        const node = kit.mesh(new THREE.CylinderGeometry(r * 1.14, r * 1.15, 0.095, 8), 'moss', { x: position.x + lean * nodeY, y: nodeY, z: position.z }, parent);
        node.rotation.z = stem.rotation.z;
    }
    // 낮은 가지를 두어 고정 구도에서도 대숲의 잎이 드러난다.
    leafFan(kit, {
        x: position.x + lean * height * 0.34,
        y: height * 0.34,
        z: position.z + 0.1,
    }, height * 0.44, position.x * 0.09, parent);
    leafFan(kit, { x: position.x + lean * height * 0.65, y: height * 0.65, z: position.z }, height * 0.27, position.x * 0.21, parent);
    leafFan(kit, {
        x: position.x + lean * height * 0.9,
        y: height * 0.88,
        z: position.z + 0.1,
    }, height * 0.24, -position.x * 0.17, parent);
}
function stoneLantern(kit, x, z) {
    kit.box({ x, y: 0.12, z }, { x: 1, y: 0.24, z: 0.9 }, 'stone');
    kit.mesh(new THREE.CylinderGeometry(0.21, 0.29, 0.95, 7), 'stone', {
        x,
        y: 0.68,
        z,
    });
    kit.box({ x, y: 1.19, z }, { x: 0.82, y: 0.16, z: 0.72 }, 'stone');
    for (const dx of [-0.29, 0.29])
        for (const dz of [-0.24, 0.24])
            kit.box({ x: x + dx, y: 1.55, z: z + dz }, { x: 0.12, y: 0.62, z: 0.12 }, 'stone');
    kit.mesh(new THREE.SphereGeometry(0.18, 7, 5), 'cloth', { x, y: 1.49, z });
    const roof = kit.mesh(new THREE.ConeGeometry(0.7, 0.4, 4), 'stone', {
        x,
        y: 1.99,
        z,
    });
    roof.rotation.y = Math.PI / 4;
    kit.mesh(new THREE.SphereGeometry(0.13, 6, 4), 'moss', { x, y: 2.25, z });
}
function tornCloth(kit, x, z, width) {
    for (const side of [-1, 1])
        pole(kit, { x: x + side * width * 0.62, y: 0, z }, { x: x + side * width * 0.62 + 0.08, y: 3.15, z }, 0.085, 'wood');
    pole(kit, { x: x - width * 0.72, y: 3.02, z }, { x: x + width * 0.72, y: 3.02, z }, 0.055, 'rope');
    const triangles = [];
    const strips = 7;
    for (let i = 0; i < strips; i++) {
        const x1 = -width / 2 + (i / strips) * width, x2 = -width / 2 + ((i + 1) / strips) * width, z1 = Math.sin(i * 1.5) * 0.15, z2 = Math.sin((i + 1) * 1.5) * 0.15, bottom1 = -0.96 + (i % 3) * 0.14, bottom2 = -0.96 + ((i + 1) % 3) * 0.14;
        triangles.push(x1, 0, z1, x1 + 0.13, bottom1, z1 + 0.21, x2, 0, z2, x2, 0, z2, x1 + 0.13, bottom1, z1 + 0.21, x2 + 0.13, bottom2, z2 + 0.21);
    }
    const cloth = kit.mesh(doubleSidedGeometry(triangles), 'cloth', {
        x,
        y: 2.95,
        z: z + 0.07,
    });
    cloth.rotation.z = -0.09;
}
/** 분절된 대나무와 잎판 사이로 낡은 석축·천을 드러내는 바람대숲. */
export function buildBambooGrove(kit) {
    for (let i = 0; i < 18; i++)
        bambooStem(kit, { x: -15.3 + i * 1.8, z: -11.5 - (i % 3) * 1.15 }, 5.1 + (i % 4) * 0.58, 0.12 + (i % 3) * 0.027, Math.sin(i * 1.7) * 0.045);
    for (const [x, z, height, lean] of [
        [-11.8, -6.2, 5.7, 0.1],
        [-7.9, -7.3, 4.1, -0.08],
        [5.8, -8.1, 5.1, 0.06],
        [11.8, -6.7, 6.1, -0.09],
    ])
        bambooStem(kit, { x, z }, height, 0.2, lean);
    for (let i = 0; i < 12; i++) {
        const x = -14.7 + i * 2.68, y = 0.28 + (i % 3) * 0.03, z = -6.3 - (i % 2) * 0.26;
        const stone = kit.box({ x, y, z }, { x: 2.31, y: 0.52 + (i % 2) * 0.13, z: 0.74 }, i % 3 === 1 ? 'moss' : 'stone');
        stone.rotation.set(0, Math.sin(i) * 0.055, Math.cos(i) * 0.035);
        if (i % 3 === 0)
            kit.rock({ x: x + 0.42, y: 0.75, z: z - 0.04 }, { x: 0.75, y: 0.26, z: 0.42 }, 'moss');
    }
    stoneLantern(kit, -10.3, -5.9);
    stoneLantern(kit, 10.8, -5.8);
    tornCloth(kit, -4.4, -7.6, 2.4);
    tornCloth(kit, 8.1, -8.1, 1.55);
    // 가는 빗장은 뒤쪽 배경에 두고 전투 중앙의 실루엣은 비운다.
    for (const x of [-0.9, 2.6])
        pole(kit, { x, y: 0, z: -7 }, { x, y: 1.68, z: -7 }, 0.085, 'bamboo');
    for (const y of [0.72, 1.35])
        pole(kit, { x: -1.23, y, z: -7 }, { x: 2.95, y: y - 0.06, z: -7 }, 0.055, 'wood');
    for (let i = 0; i < 3; i++)
        pole(kit, { x: -0.17 + i * 0.97, y: 0.45, z: -6.97 }, { x: -0.17 + i * 0.97, y: 1.55, z: -6.97 }, 0.035, 'bamboo');
    for (const side of [-1, 1]) {
        const x = side * 12.25;
        bambooStem(kit, { x, z: 7.4 }, 4.5, 0.23, side * 0.055, kit.foreground);
        leafFan(kit, { x: side * 11.6, y: 0.18, z: 7.6 }, 2.8, -side * 0.22, kit.foreground);
        for (let i = 0; i < 3; i++)
            kit.rootBranch([
                { x: side * (11.6 + i * 0.3), y: 0.11, z: -3.9 + i * 2.1 },
                { x: side * (10.7 + i * 0.3), y: 0.2, z: -3.3 + i * 2.1 },
                { x: side * (10.1 + i * 0.3), y: 0.03, z: -2.8 + i * 2.1 },
            ], 0.075);
    }
    for (let i = 0; i < 13; i++) {
        const side = i % 2 ? 1 : -1;
        leafFan(kit, {
            x: i < 8 ? -13.8 + i * 3.8 : side * (10.8 + (i % 3) * 0.35),
            y: 0.08 + (i % 3) * 0.16,
            z: i < 8 ? -5.9 - (i % 2) * 0.33 : -3.7 + (i - 8) * 1.8,
        }, 0.8 + (i % 3) * 0.25, i * 1.41);
    }
}
