import * as THREE from 'three';
const surfaceColors = {
    stone: '#a0a18b',
    basalt: '#5c5856',
    moss: '#758955',
    snow: '#dce9e5',
    ice: '#9cc6d2',
    ash: '#8b7b69',
    leaf: '#67865b',
    grass: '#859362',
    bamboo: '#94a673',
};
/** 한 이동맵의 자연물 제작과 공유 재질 캐시를 소유한다. */
export class NaturalScenery {
    kit;
    surfaces = new Map();
    constructor(kit) {
        this.kit = kit;
    }
    surface(kind, shade = 1, options = {}) {
        const key = `${kind}/${shade}/${options.vertexColors ? 'vertex' : 'texture'}`;
        const previous = this.surfaces.get(key);
        if (previous)
            return previous;
        const result = createMaterial(kind, shade, options);
        this.surfaces.set(key, result);
        return result;
    }
    pine(point, height, options = {}) {
        pine(this, point, height, options);
    }
    bamboo(point, height, options = {}) {
        bamboo(this, point, height, options);
    }
    shrub(point, radius, options = {}) {
        shrub(this, point, radius, options);
    }
    rock(point, scale, options = {}) {
        rock(this, point, scale, options);
    }
}
function noise(seed) {
    const n = Math.sin(seed * 71.37 + 2.81) * 43758.5453;
    return n - Math.floor(n);
}
/** 자연물은 인공 석벽의 줄눈 대신 낮은 대비의 손칠 재질을 소유한다. */
function createMaterial(kind, shade = 1, options = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (!ctx)
        throw new Error('자연물 재질을 만들 수 없습니다.');
    // 정점 색으로 덮개를 칠할 때는 돌 바탕색이 눈의 밝기를 다시 곱하지 않게 한다.
    ctx.fillStyle = options.vertexColors
        ? '#ffffff'
        : (surfaceColors[kind] ?? '#9c8a68');
    ctx.fillRect(0, 0, 96, 96);
    for (let i = 0; i < 145; i++) {
        ctx.globalAlpha = 0.025 + noise(i + 19) * 0.06;
        ctx.fillStyle = i % 3 ? '#f3eed7' : '#343c35';
        const x = noise(i * 3 + 7) * 96, y = noise(i * 5 + 3) * 96;
        ctx.beginPath();
        ctx.ellipse(x, y, 2 + noise(i + 4) * 12, 1 + noise(i + 8) * 3, noise(i + 12) * 1.4, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 0.15;
    if (kind === 'stone' || kind === 'basalt') {
        ctx.strokeStyle = '#41493f';
        ctx.lineWidth = 0.7;
        for (let i = 0; i < 5; i++) {
            const x = noise(i + 31) * 90, y = noise(i + 42) * 96;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + 9, y + 2);
            ctx.lineTo(x + 18, y - 1);
            ctx.stroke();
        }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    const result = new THREE.MeshStandardMaterial({
        map: texture,
        bumpMap: texture,
        bumpScale: kind === 'snow' ? 0.015 : 0.045,
        color: new THREE.Color().setScalar(shade),
        roughness: kind === 'ice' ? 0.4 : 0.98,
        side: THREE.DoubleSide,
        vertexColors: options.vertexColors ?? false,
    });
    // MapKit이 메시 재질을 정리할 때 이 재질이 소유한 그림도 함께 정리한다.
    result.addEventListener('dispose', () => {
        texture.dispose();
        canvas.width = canvas.height = 1;
    });
    return result;
}
function mesh(kit, geometry, surface, parent = kit.root) {
    const result = new THREE.Mesh(geometry, surface);
    result.castShadow = result.receiveShadow = true;
    parent.add(result);
    return result;
}
function taperedCurve(kit, points, radius, kind, parent = kit.root) {
    const curve = new THREE.CatmullRomCurve3(points);
    const geometry = new THREE.TubeGeometry(curve, 10, radius, 6, false);
    const position = geometry.getAttribute('position');
    for (let row = 0; row <= 10; row++) {
        const center = curve.getPointAt(row / 10);
        const taper = 1 - (row / 10) * 0.78;
        for (let side = 0; side <= 6; side++) {
            const i = row * 7 + side;
            position.setXYZ(i, center.x + (position.getX(i) - center.x) * taper, center.y + (position.getY(i) - center.y) * taper, center.z + (position.getZ(i) - center.z) * taper);
        }
    }
    geometry.computeVertexNormals();
    kit.mesh(geometry, kind, { x: 0, y: 0, z: 0 }, parent);
}
/** 접힌 잎 면을 한데 묶어 잎마다 그리기 호출을 따로 만들지 않는다. */
class Leaves {
    positions = [];
    uv = [];
    indices = [];
    add(start, direction, length, width) {
        const forward = direction.clone().normalize();
        const across = new THREE.Vector3(-forward.z, 0, forward.x).normalize();
        if (across.lengthSq() < 0.1)
            across.set(1, 0, 0);
        const first = this.positions.length / 3;
        for (const [t, profile] of [
            [0, 0.025],
            [0.31, 0.5],
            [0.68, 0.34],
            [1, 0.005],
        ]) {
            const center = start.clone().addScaledVector(forward, length * t);
            center.y += Math.sin(t * Math.PI) * length * 0.08;
            for (const side of [-1, 0, 1]) {
                const vertex = center
                    .clone()
                    .addScaledVector(across, side * width * profile);
                vertex.y -= Math.abs(side) * Math.sin(t * Math.PI) * width * 0.2;
                this.positions.push(vertex.x, vertex.y, vertex.z);
                this.uv.push((side + 1) / 2, t);
            }
        }
        for (let row = 0; row < 3; row++) {
            const a = first + row * 3, b = a + 3;
            this.indices.push(a, b, a + 1, a + 1, b, b + 1, a + 1, b + 1, a + 2, a + 2, b + 1, b + 2);
        }
    }
    draw(owner, kind, shade, parent = owner.kit.root, options = {}) {
        const kit = owner.kit;
        if (!this.positions.length)
            return;
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
        geometry.setIndex(this.indices);
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
        const center = new THREE.Vector3();
        geometry.boundingBox.getCenter(center);
        geometry.translate(-center.x, -center.y, -center.z);
        const foliage = mesh(kit, geometry, owner.surface(kind, shade), parent);
        foliage.position.copy(center);
        if (options.moving !== false)
            foliage.name = 'trail-foliage';
    }
}
function pine(owner, point, height, options = {}) {
    const kit = owner.kit;
    const seed = options.seed ?? point.x * 13 + point.z * 7;
    const y = point.y ?? 0;
    const bend = (noise(seed) - 0.5) * height * 0.12;
    const trunk = [
        new THREE.Vector3(point.x, y, point.z),
        new THREE.Vector3(point.x - bend * 0.2, y + height * 0.4, point.z + bend * 0.2),
        new THREE.Vector3(point.x + bend, y + height * 0.91, point.z - bend * 0.4),
    ];
    taperedCurve(kit, trunk, height * 0.047, 'bark');
    const leaves = [new Leaves(), new Leaves(), new Leaves()];
    const snow = new Leaves();
    for (let tier = 0; tier < 5; tier++) {
        const atY = y + height * (0.36 + tier * 0.13);
        const reach = height * (0.24 - tier * 0.035);
        const turn = noise(seed + tier * 4) * Math.PI;
        for (let branch = 0; branch < 5; branch++) {
            const angle = turn + (branch / 5) * Math.PI * 2;
            const base = new THREE.Vector3(point.x + bend * tier * 0.18, atY, point.z);
            const tip = base
                .clone()
                .add(new THREE.Vector3(Math.cos(angle) * reach, height * 0.025, Math.sin(angle) * reach));
            if (tier < 3 && branch % 2 === 0)
                taperedCurve(kit, [
                    base,
                    base
                        .clone()
                        .lerp(tip, 0.5)
                        .add(new THREE.Vector3(0, -0.08, 0)),
                    tip,
                ], height * 0.013, 'bark');
            for (let leaf = 0; leaf < 9; leaf++) {
                const t = 0.18 + leaf * 0.085;
                const center = base.clone().lerp(tip, t);
                const spread = (leaf % 2 ? -1 : 1) * (0.7 + noise(seed + leaf + branch) * 0.45);
                const heading = angle + spread;
                const length = height * (0.13 - tier * 0.013) * (0.8 + noise(seed + leaf) * 0.35);
                leaves[(leaf + branch + tier) % 3].add(center, new THREE.Vector3(Math.cos(heading), -0.08 + tier * 0.03, Math.sin(heading)), length, length * 0.58);
                if (options.snow && leaf % 2 === 0)
                    snow.add(center.clone().add(new THREE.Vector3(0, height * 0.018, 0)), new THREE.Vector3(Math.cos(heading), 0.02, Math.sin(heading)), length * 0.92, length * 0.55);
            }
        }
    }
    leaves.forEach((batch, i) => batch.draw(owner, i === 0 ? 'moss' : 'leaf', 0.88 + i * 0.09));
    snow.draw(owner, 'snow', 1.02);
    for (let i = 0; i < 3; i++) {
        const angle = noise(seed + 80) + i * 2.1;
        taperedCurve(kit, [
            new THREE.Vector3(point.x, y + height * 0.1, point.z),
            new THREE.Vector3(point.x + Math.cos(angle) * height * 0.12, y + 0.09, point.z + Math.sin(angle) * height * 0.12),
            new THREE.Vector3(point.x + Math.cos(angle) * height * 0.21, y + 0.02, point.z + Math.sin(angle) * height * 0.21),
        ], height * 0.025, 'bark');
    }
}
function bamboo(owner, point, height, options = {}) {
    const kit = owner.kit;
    const seed = options.seed ?? point.x * 17 + point.z * 9;
    const y = point.y ?? 0;
    const leaves = [new Leaves(), new Leaves(), new Leaves()];
    const nodes = [], nodeUv = [], nodeIndices = [];
    for (let stalk = 0; stalk < 3; stalk++) {
        const angle = noise(seed + stalk * 7) * Math.PI * 2;
        const h = height * (0.78 + noise(seed + stalk * 4) * 0.25);
        const base = new THREE.Vector3(point.x + Math.cos(angle) * 0.27, y, point.z + Math.sin(angle) * 0.27);
        const lean = new THREE.Vector3(Math.cos(angle) * h * 0.12, 0, Math.sin(angle) * h * 0.12);
        const stalkPoints = [
            base,
            base
                .clone()
                .addScaledVector(lean, 0.3)
                .add(new THREE.Vector3(0, h * 0.5, 0)),
            base
                .clone()
                .add(lean)
                .add(new THREE.Vector3(0, h, 0)),
        ];
        const stalkCurve = new THREE.CatmullRomCurve3(stalkPoints);
        taperedCurve(kit, stalkPoints, 0.075, 'bamboo');
        for (let node = 1; node < 5; node++) {
            const t = node / 5;
            const center = stalkCurve.getPointAt(t);
            const start = nodes.length / 3;
            const radius = 0.075 * (1 - t * 0.78) + 0.012;
            for (const offset of [-0.025, 0.025])
                for (let side = 0; side <= 7; side++) {
                    const turn = (side / 7) * Math.PI * 2;
                    nodes.push(center.x + Math.cos(turn) * radius, center.y + offset, center.z + Math.sin(turn) * radius);
                    nodeUv.push(side / 7, offset < 0 ? 0 : 1);
                    if (offset < 0 && side < 7) {
                        const a = start + side;
                        nodeIndices.push(a, a + 8, a + 1, a + 1, a + 8, a + 9);
                    }
                }
        }
        for (let branch = 0; branch < 4; branch++) {
            const t = 0.43 + branch * 0.14;
            const root = stalkCurve.getPointAt(t);
            const heading = angle + branch * 1.8;
            const direction = new THREE.Vector3(Math.cos(heading), 0.22, Math.sin(heading));
            const reach = h * (0.2 + noise(seed + branch) * 0.07);
            const tip = root.clone().addScaledVector(direction, reach);
            if (branch % 2 === 0)
                taperedCurve(kit, [
                    root,
                    root
                        .clone()
                        .lerp(tip, 0.55)
                        .add(new THREE.Vector3(0, 0.1, 0)),
                    tip,
                ], 0.024, 'bamboo');
            for (let leaf = 0; leaf < 9; leaf++) {
                const center = root.clone().lerp(tip, 0.16 + leaf * 0.09);
                const spread = (leaf % 2 ? -1 : 1) * (0.5 + noise(seed + leaf) * 0.65);
                const length = h * (0.115 + noise(seed + leaf + branch) * 0.05);
                leaves[(leaf + stalk) % 3].add(center, new THREE.Vector3(Math.cos(heading + spread), -0.16, Math.sin(heading + spread)), length, length * 0.23);
            }
        }
    }
    const nodeGeometry = new THREE.BufferGeometry();
    nodeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(nodes, 3));
    nodeGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(nodeUv, 2));
    nodeGeometry.setIndex(nodeIndices);
    nodeGeometry.computeVertexNormals();
    kit.mesh(nodeGeometry, 'bamboo', { x: 0, y: 0, z: 0 });
    leaves.forEach((batch, i) => batch.draw(owner, i === 0 ? 'bamboo' : 'leaf', 0.89 + i * 0.1));
    shrub(owner, point, Math.min(0.72, height * 0.15), { seed: seed + 41 });
}
function shrub(owner, point, radius, options = {}) {
    const seed = options.seed ?? point.x * 5 + point.z * 11;
    const batches = [new Leaves(), new Leaves()];
    for (let stem = 0; stem < 8; stem++) {
        const angle = stem * 2.4 + noise(seed) * Math.PI;
        const length = radius * (0.75 + noise(seed + stem * 3) * 0.4);
        const base = new THREE.Vector3(point.x, (point.y ?? 0) + 0.04, point.z);
        for (let pair = 0; pair < 5; pair++) {
            const t = pair / 5;
            const center = base
                .clone()
                .add(new THREE.Vector3(Math.cos(angle) * length * t, Math.sin(t * Math.PI * 0.8) * radius * 0.48, Math.sin(angle) * length * t));
            for (const side of [-1, 1]) {
                const heading = angle + side * 0.8;
                const leafLength = radius * (0.47 - t * 0.23);
                batches[(stem + pair) % 2].add(center, new THREE.Vector3(Math.cos(heading), 0.3 - t * 0.4, Math.sin(heading)), leafLength, leafLength * 0.5);
            }
        }
    }
    batches.forEach((batch, i) => batch.draw(owner, options.snow ? 'snow' : i ? 'leaf' : 'moss', 0.91 + i * 0.12));
}
function rock(owner, point, scale, options = {}) {
    const kit = owner.kit;
    const seed = options.seed ?? point.x * 7 + point.z * 13;
    const kind = options.kind ?? 'stone';
    const parent = options.parent ?? kit.root;
    const centerY = point.y ?? scale.y * 0.5;
    const positions = [], uv = [], indices = [];
    const segments = 9;
    const geometry = new THREE.BufferGeometry();
    const rings = [0.7, 1.0, 0.92, 0.79, 0.66, 0.12];
    for (let layer = 0; layer < rings.length; layer++) {
        const groupStart = indices.length;
        for (let segment = 0; segment <= segments; segment++) {
            const angle = ((segment % segments) / segments) * Math.PI * 2;
            const variation = 0.9 + noise(seed + (segment % segments) * 7) * 0.15;
            const radius = rings[layer] * variation;
            const t = layer / (rings.length - 1);
            positions.push(point.x +
                Math.cos(angle) * scale.x * radius +
                Math.sin(t * 5 + seed) * scale.x * 0.08, centerY +
                (t * 1.65 - 0.7) * scale.y +
                Math.sin(angle * 2 + seed) * scale.y * 0.06, point.z + Math.sin(angle) * scale.z * radius + t * scale.z * 0.1);
            uv.push(segment / segments, t);
            if (layer < rings.length - 1 && segment < segments) {
                const a = layer * (segments + 1) + segment, b = a + segments + 1;
                indices.push(a, b, a + 1, a + 1, b, b + 1);
            }
        }
        if (layer < rings.length - 1)
            geometry.addGroup(groupStart, indices.length - groupStart, layer % 3);
    }
    for (const [layer, height, shade] of [
        [0, -0.7, 0],
        [rings.length - 1, 0.94, 2],
    ]) {
        const center = positions.length / 3;
        positions.push(point.x, centerY + height * scale.y, point.z + (layer ? scale.z * 0.1 : 0));
        uv.push(0.5, layer ? 1 : 0);
        geometry.addGroup(indices.length, segments * 3, shade);
        for (let segment = 0; segment < segments; segment++) {
            const a = layer * (segments + 1) + segment;
            if (layer)
                indices.push(center, a + 1, a);
            else
                indices.push(center, a, a + 1);
        }
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const colored = Boolean(options.moss || options.snow);
    if (colored)
        coatRock(geometry, {
            point,
            scale,
            centerY,
            seed,
            kind,
            snow: options.snow ?? false,
        });
    mesh(kit, geometry, [
        owner.surface(kind, 0.9, { vertexColors: colored }),
        owner.surface(kind, 1.0, { vertexColors: colored }),
        owner.surface(kind, 1.06, { vertexColors: colored }),
    ], parent);
    if (options.moss && scale.y > 0.6) {
        const start = new THREE.Vector3(point.x + scale.x * 0.25, centerY + scale.y * 0.82, point.z + scale.z * 0.32);
        taperedCurve(kit, [
            start,
            start
                .clone()
                .add(new THREE.Vector3(-scale.x * 0.3, -scale.y * 0.45, scale.z * 0.45)),
            start
                .clone()
                .add(new THREE.Vector3(-scale.x * 0.12, -scale.y * 1.05, scale.z * 0.5)),
        ], Math.min(0.035, scale.y * 0.025), 'moss', parent);
    }
}
/** 바위 표면의 높이와 습한 면을 따라 번지는 비대칭 색 패치를 만든다. */
function coatRock(geometry, options) {
    const position = geometry.getAttribute('position');
    const normal = geometry.getAttribute('normal');
    const colors = new Float32Array(position.count * 3);
    const base = new THREE.Color(surfaceColors[options.kind] ?? '#9c8a68');
    const coating = new THREE.Color(options.snow ? '#e1ecea' : '#718b55');
    const color = new THREE.Color();
    const direction = options.seed * 0.71;
    for (let i = 0; i < position.count; i++) {
        const x = (position.getX(i) - options.point.x) / options.scale.x;
        const z = (position.getZ(i) - options.point.z) / options.scale.z;
        const height = ((position.getY(i) - options.centerY) / options.scale.y + 0.7) / 1.65;
        const upward = Math.max(0, normal.getY(i));
        const damp = x * Math.cos(direction) + z * Math.sin(direction);
        const weather = Math.sin(x * 2.6 + z * 1.4 + options.seed * 0.31) * 0.24 +
            Math.sin(x * 1.1 - z * 2.8 + height * 2.1 + options.seed * 0.73) * 0.16 +
            Math.sin(x * 5.7 + z * 3.2 + options.seed * 0.17) * 0.06;
        const field = options.snow
            ? height * 0.72 + upward * 0.32 + weather * 0.24 - damp * 0.12
            : height * 0.6 + upward * 0.18 + weather * 0.4 + damp * 0.28;
        const coverage = THREE.MathUtils.smoothstep(field, options.snow ? 0.55 : 0.48, options.snow ? 0.83 : 0.76);
        color.copy(base).lerp(coating, coverage * 0.98);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}
