import { MapSpriteResources } from '../../props/map-sprite-resources.js';
import * as THREE from 'three';
import { townHallLayout, townHallEntranceRails, townHallPillars, townHallLevels, } from './town-hall-layout.js';
import { createPixelMaterial } from '../../../rendering/pixel-material.js';
import { groundGeometry } from '../../../rendering/ground-geometry.js';
const colors = {
    wood: 0x76563e,
    board: 0xa8845b,
    wall: 0xc6b795,
    roof: 0x4c6465,
    roofLight: 0x627777,
    dark: 0x3e453d,
    stone: 0xaaa389,
    paper: 0xe1d3aa,
};
/** 회관 단계별 외형·광장·입구와 GPU 자원을 소유하며 성장 규칙은 포함하지 않는다. */
export class TownHallResources {
    root = new THREE.Group();
    sprites = new MapSpriteResources();
    cube = new THREE.BoxGeometry(1, 1, 1);
    materials = new Map();
    labelMaterials = [];
    textures = [];
    variants = new Map();
    level = 1;
    structures = new Map();
    constructor() {
        this.root.add(this.sprites.root);
        for (const level of townHallLevels) {
            const group = new THREE.Group();
            group.name = `town-hall-level-${level}`;
            this.buildPaths(group, level);
            const structure = new THREE.Group();
            this.buildHouse(structure, level);
            this.buildRoof(structure, level);
            this.buildPortico(structure, level);
            this.buildNoticeboard(group);
            this.buildEntrance(structure);
            group.add(structure);
            this.structures.set(level, structure);
            this.root.add(group);
            this.variants.set(level, group);
        }
        this.setLevel(1);
    }
    setLevel(level) {
        this.level = level;
        for (const [name, group] of this.variants)
            group.visible = name === level;
    }
    get interactionStructure() {
        return this.structures.get(this.level);
    }
    get diagnostics() {
        return { level: this.level };
    }
    material(color) {
        let material = this.materials.get(color);
        if (!material) {
            material = createPixelMaterial(color, {
                strength: { value: 0.42 },
                pattern: 'broad',
            });
            this.materials.set(color, material);
        }
        return material;
    }
    box(group, position, size, color) {
        const mesh = new THREE.Mesh(this.cube, this.material(color));
        mesh.position.set(...position);
        mesh.scale.set(...size);
        mesh.castShadow = size[1] > 0.08;
        mesh.receiveShadow = true;
        group.add(mesh);
        return mesh;
    }
    buildPaths(group, level) {
        const { plaza, path, bench } = townHallLayout;
        const outline = level === 3
            ? [
                { x: plaza.x - plaza.width / 2, z: plaza.z - plaza.depth / 2 },
                { x: plaza.x + plaza.width / 2, z: plaza.z - plaza.depth / 2 },
                { x: plaza.x + plaza.width / 2, z: plaza.z + plaza.depth / 2 },
                { x: plaza.x - plaza.width / 2, z: plaza.z + plaza.depth / 2 },
            ]
            : [
                { x: -5.5, z: 0 },
                { x: -2.8, z: -0.15 },
                { x: 3.5, z: 0 },
                { x: 5.7, z: 0.4 },
                { x: 6.1, z: 2.6 },
                { x: 5.8, z: 4 },
                { x: 6.1, z: 6.1 },
                { x: 5.3, z: 8 },
                { x: 2.8, z: 8.5 },
                { x: -0.8, z: 8.35 },
                { x: -4.5, z: 8 },
                { x: -6.1, z: 6.6 },
                { x: -5.8, z: 3.9 },
                { x: -6.1, z: 1.3 },
            ];
        const plazaGround = new THREE.Mesh(groundGeometry(outline), this.material(level === 3 ? 0xb0a78e : 0xaaa07f));
        plazaGround.position.y = 0.03;
        plazaGround.receiveShadow = true;
        group.add(plazaGround);
        // 광장과 중앙 진입 축을 바닥 패턴으로 드러내고 보행을 막는 장식은 두지 않는다.
        for (let row = 0; level >= 2 && row < 8; row++) {
            for (let col = 0; col < 12; col++) {
                if (level === 2 && row > 1 && (col < 4 || col > 7))
                    continue;
                this.box(group, [-5.5 + col, 0.038, 0.5 + row], [0.965, 0.035, 0.965], (row * 3 + col) % 5 ? 0xbcb49b : 0xa9a68e);
            }
        }
        if (level === 3) {
            for (const x of [-2.08, 2.08])
                this.box(group, [x, 0.061, plaza.z], [0.13, 0.012, plaza.depth], 0x8c8e79);
            const ring = new THREE.Mesh(new THREE.RingGeometry(1.18, 1.35, 12), this.material(0x747e70));
            ring.rotation.x = -Math.PI / 2;
            ring.position.set(0, 0.065, 4.1);
            group.add(ring);
            for (const side of [-1, 1]) {
                const mark = this.box(group, [side * 0.4, 0.066, 4.1], [0.14, 0.016, 1.05], 0x747e70);
                mark.rotation.y = side * 0.65;
            }
        }
        for (let i = 0; level >= 2 && i < 7; i++) {
            for (const side of [-1, 1])
                this.box(group, [side * (path.width / 2 + 0.16), 0.045, path.startZ + 0.5 + i * 0.9], [0.32, 0.08, 0.7], colors.stone);
        }
        this.box(group, [bench.x, 0.46, bench.z], [bench.width, 0.14, bench.depth], colors.board);
        for (const dx of [-0.66, 0.66])
            this.box(group, [bench.x + dx, 0.22, bench.z], [0.2, 0.44, 0.36], colors.stone);
    }
    buildHouse(group, level) {
        const { building: b, porch, steps } = townHallLayout;
        const stone = level === 1 ? 0x938b72 : colors.stone;
        const wall = level === 1 ? 0xb8aa89 : colors.wall;
        const front = b.z + b.depth / 2;
        this.box(group, [b.x, porch.height / 2, b.z], [b.width, porch.height, b.depth], stone);
        this.box(group, [porch.x, porch.height / 2, porch.z], [porch.width, porch.height, porch.depth], stone);
        for (let i = 0; i < steps.count; i++) {
            const height = (porch.height * (steps.count - i)) / steps.count;
            this.box(group, [
                steps.x,
                height / 2,
                steps.z - steps.depth / 2 + ((i + 0.5) * steps.depth) / steps.count,
            ], [steps.width, height, steps.depth / steps.count], level === 1
                ? i % 2
                    ? colors.wood
                    : colors.board
                : i % 2
                    ? stone
                    : 0xb8b096);
        }
        this.box(group, [b.x, 2.25, b.z], [b.width - 0.12, 3.3, b.depth - 0.12], wall);
        for (let i = 0; level >= 2 && i < 12; i++) {
            if (Math.abs(-5.1 + i * 0.93) < steps.width / 2)
                continue;
            this.box(group, [-5.1 + i * 0.93, 0.32, porch.z + porch.depth / 2 + 0.035], [0.86, 0.43, 0.08], i % 3 ? 0x979b89 : stone);
        }
        for (const side of [-1, 1]) {
            for (let i = 0; level >= 2 && i < 6; i++) {
                const z = b.z - b.depth / 2 + 0.5 + i;
                this.box(group, [side * (b.width / 2 + 0.035), 0.32, z], [0.08, 0.43, 0.92], i % 3 ? 0x979b89 : stone);
            }
        }
        if (level === 1) {
            for (let i = 0; i < 18; i++)
                this.box(group, [-5.28 + i * 0.621, porch.height + 0.01, porch.z], [0.601, 0.02, porch.depth], i % 4 ? colors.wood : colors.board);
        }
        for (const x of [-5.4, -3.1, 3.1, 5.4]) {
            for (const z of [front, b.z - b.depth / 2])
                this.box(group, [x, 2.35, z], [0.32, 3.5, 0.26], colors.wood);
        }
        for (const z of [front, b.z - b.depth / 2]) {
            for (const y of [0.72, 3.85, 4.07])
                this.box(group, [b.x, y, z], [b.width + 0.22, 0.2, 0.24], colors.wood);
        }
        this.box(group, [b.x, 2.07, front + 0.09], [2.4, 2.9, 0.08], colors.dark);
        for (let i = 0; i < 10; i++)
            this.box(group, [-1.05 + i * 0.233, 2.04, front + 0.15], [0.21, 2.8, 0.06], i % 3 ? colors.wood : colors.board);
        for (const x of [-0.19, 0.19]) {
            this.box(group, [x, 1.87, front + 0.21], [0.08, 0.24, 0.06], colors.dark);
            this.box(group, [x, 1.9, front + 0.25], [0.04, 0.13, 0.06], 0xb49a66);
        }
        for (const side of [-1, 1]) {
            for (const dx of [2, 4.1]) {
                const x = side * dx;
                this.box(group, [x, 2.34, front + 0.065], [1.28, 1.58, 0.08], colors.dark);
                for (let i = 0; i < 5; i++)
                    this.box(group, [x - 0.56 + i * 0.28, 2.34, front + 0.13], [0.06, 1.69, 0.06], colors.board);
                for (const y of [1.49, 2.34, 3.19])
                    this.box(group, [x, y, front + 0.15], [1.46, 0.09, 0.1], colors.wood);
            }
            const x = side * (b.width / 2 + 0.01);
            for (const dz of [-1.65, 0.95]) {
                this.box(group, [x, 2.34, b.z + dz], [0.07, 1.58, 1.4], colors.dark);
                for (let i = 0; i < 5; i++)
                    this.box(group, [x + side * 0.04, 2.34, b.z + dz - 0.56 + i * 0.28], [0.07, 1.69, 0.06], colors.board);
                for (const y of [1.49, 2.34, 3.19])
                    this.box(group, [x + side * 0.05, y, b.z + dz], [0.08, 0.09, 1.56], colors.wood);
            }
        }
    }
    roofFace(group, points, color) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flatMap((point) => [...point]), 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(points.length === 3 ? [0, 0, 1, 0, 0.5, 1] : [0, 0, 1, 0, 1, 1, 0, 1], 2));
        geometry.setIndex(points.length === 3 ? [0, 1, 2] : [0, 1, 2, 0, 2, 3]);
        geometry.computeVertexNormals();
        const material = this.material(color);
        material.side = THREE.DoubleSide;
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
    }
    beam(group, from, to, width, color) {
        const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
        const midpoint = a.clone().add(b).multiplyScalar(0.5);
        const beam = this.box(group, [midpoint.x, midpoint.y, midpoint.z], [width, a.distanceTo(b), width], color);
        beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
    }
    buildRoof(group, level) {
        const { building: b } = townHallLayout;
        const roof = level === 1 ? 0x87765c : colors.roof;
        const roofLight = level === 1 ? 0x9b896b : colors.roofLight;
        const halfWidth = b.width / 2 + 0.8, halfDepth = b.depth / 2 + 0.85;
        const eave = 4.28, ridge = level === 1 ? 5.5 : level === 2 ? 5.88 : 6.18, halfRidge = 3.95;
        for (const side of [-1, 1]) {
            this.roofFace(group, [
                [-halfWidth, eave, b.z + side * halfDepth],
                [halfWidth, eave, b.z + side * halfDepth],
                [halfRidge, ridge, b.z],
                [-halfRidge, ridge, b.z],
            ], roof);
            this.roofFace(group, [
                [side * halfWidth, eave, b.z - halfDepth],
                [side * halfWidth, eave, b.z + halfDepth],
                [side * halfRidge, ridge, b.z],
            ], roofLight);
            this.box(group, [0, eave, b.z + side * halfDepth], [halfWidth * 2 + 0.2, 0.2, 0.22], colors.wood);
            this.box(group, [side * halfWidth, eave, b.z], [0.22, 0.2, halfDepth * 2], colors.wood);
            for (const end of [-1, 1])
                this.beam(group, [end * halfRidge, ridge + 0.03, b.z], [end * halfWidth, eave + 0.03, b.z + side * halfDepth], 0.18, roofLight);
            for (let row = 0; row < 7; row++) {
                const t = (row + 0.5) / 7;
                const width = halfRidge + (halfWidth - halfRidge) * t;
                const columns = Math.floor((width * 2) / 0.46);
                for (let col = 0; col < columns; col++) {
                    const tile = this.box(group, [
                        (col - (columns - 1) / 2) * 0.46,
                        ridge - (ridge - eave) * t + 0.028,
                        b.z + side * halfDepth * t,
                    ], [0.445, 0.06, Math.hypot(halfDepth, ridge - eave) / 7 - 0.02], (col + row * 3) % 6 ? roof : roofLight);
                    tile.rotation.x = side * Math.atan2(ridge - eave, halfDepth);
                }
            }
        }
        this.box(group, [0, ridge + 0.07, b.z], [halfRidge * 2 + 0.3, 0.2, 0.28], roofLight);
    }
    buildPortico(group, level) {
        for (const p of townHallPillars) {
            this.box(group, [p.x, 2.5, p.z], [p.width * 0.8, 3.8, p.depth * 0.8], colors.wood);
            this.box(group, [p.x, 0.75, p.z], [p.width, 0.3, p.depth], colors.stone);
            this.box(group, [p.x, 4.35, p.z], [0.62, 0.22, 0.58], colors.board);
        }
        this.box(group, [0, 4.45, -1.85], [10.75, 0.24, 0.3], colors.wood);
        if (level === 1) {
            this.roofFace(group, [
                [-5.55, 4.66, -2.95],
                [5.55, 4.66, -2.95],
                [5.55, 4.3, -1.23],
                [-5.55, 4.3, -1.23],
            ], 0x87765c);
            this.box(group, [0, 4.3, -1.23], [11.2, 0.16, 0.18], colors.wood);
            this.label(group, '마을회관', [0, 3.93, -1.23], [2.9, 0.46], '#baa577');
            this.buildLantern(group, -1.8, -1.42);
            this.buildLantern(group, 1.8, -1.42);
            return;
        }
        const peak = level === 2 ? 5.55 : 6.38;
        // 중앙 박공과 넓은 계단으로 마을의 발전 중심이 되는 정면을 만든다.
        this.roofFace(group, [
            [-2.75, 4.6, -1.32],
            [2.75, 4.6, -1.32],
            [0, peak - 0.18, -1.32],
        ], colors.wall);
        for (const side of [-1, 1]) {
            this.roofFace(group, [
                [0, peak, -3.5],
                [0, peak, -1.02],
                [side * 3.04, 4.62, -1.02],
                [side * 3.04, 4.62, -3.5],
            ], colors.roof);
            // 박공 꼭대기에서 만나는 두 목재의 정면이 같은 평면에 놓이지 않게 한다.
            this.beam(group, [0, peak + 0.04, -1 + side * 0.012], [side * 3.1, 4.64, -1 + side * 0.012], 0.2, colors.roofLight);
            this.box(group, [side * 3.02, 4.61, -2.26], [0.2, 0.18, 2.7], colors.wood);
            for (let i = 0; i < 7; i++) {
                const x = side * (0.22 + i * 0.41);
                this.box(group, [x, 4.63, -1.31], [0.07, 0.27, 0.1], colors.wood);
            }
            if (level === 3) {
                this.box(group, [side * 4.46, 3.35, -1.63], [0.64, 1.65, 0.045], 0x3e6564);
                this.box(group, [side * 4.46, 4.21, -1.63], [0.86, 0.09, 0.09], colors.board);
                this.box(group, [side * 4.46, 2.62, -1.59], [0.5, 0.12, 0.025], 0xbca775);
                const crest = this.box(group, [side * 4.46, 3.47, -1.59], [0.22, 0.22, 0.02], 0xbca775);
                crest.rotation.z = Math.PI / 4;
            }
            this.buildLantern(group, side * 1.8, -1.42);
        }
        this.label(group, '마을회관', [0, 4.24, -1.23], [2.9, 0.46], '#baa577');
        if (level !== 3)
            return;
        const crest = this.box(group, [0, 5.27, -1.24], [0.63, 0.63, 0.1], 0x927e51);
        crest.rotation.z = Math.PI / 4;
        this.beam(group, [-0.32, 5.12, -1.17], [0, 5.47, -1.17], 0.09, colors.paper);
        this.beam(group, [0, 5.47, -1.15], [0.32, 5.12, -1.15], 0.09, colors.paper);
    }
    buildLantern(group, x, z) {
        this.box(group, [x, 3.36, z], [0.06, 0.23, 0.08], colors.dark);
        this.box(group, [x, 3.15, z], [0.26, 0.3, 0.22], 0xe5b66d);
        for (const y of [2.97, 3.33])
            this.box(group, [x, y, z], [0.33, 0.07, 0.29], colors.dark);
        for (const dx of [-0.12, 0.12])
            this.box(group, [x + dx, 3.15, z + 0.12], [0.035, 0.34, 0.035], colors.dark);
        const light = new THREE.PointLight(0xffbc65, 0.65, 1.8, 2);
        light.position.set(x, 3.16, z + 0.2);
        group.add(light);
    }
    buildNoticeboard(group) {
        const b = townHallLayout.noticeboard;
        for (const dx of [-0.48, 0.48])
            this.box(group, [b.x + dx, 0.75, b.z], [0.12, 1.5, 0.15], colors.wood);
        this.box(group, [b.x, 1.12, b.z], [b.width, 0.87, b.depth], colors.wood);
        this.box(group, [b.x, 1.13, b.z + 0.16], [1.1, 0.67, 0.025], colors.dark);
        this.box(group, [b.x, 1.6, b.z], [1.5, 0.13, 0.56], colors.roof);
        // 종이와 지도는 기존 판자 앞면에 고정해 입체 게시판의 깊이를 따른다.
        this.sprites.add('village-map', {
            x: b.x - 0.19,
            z: b.z + 0.19,
            y: 0.89,
            width: 0.62,
            depth: 0.48,
            kind: 'fixed',
            parent: group,
        });
        this.sprites.add('notices', {
            x: b.x + 0.35,
            z: b.z + 0.195,
            y: 0.94,
            width: 0.26,
            depth: 0.38,
            kind: 'fixed',
            parent: group,
        });
        this.sprites.add('seal', {
            x: b.x + 0.35,
            z: b.z + 0.205,
            y: 1.0,
            width: 0.085,
            depth: 0.085,
            kind: 'fixed',
            parent: group,
        });
    }
    buildEntrance(group) {
        const p = townHallLayout.signpost;
        this.box(group, [p.x, 0.82, p.z], [p.width, 1.64, p.depth], colors.wood);
        this.box(group, [p.x, 0.07, p.z], [0.36, 0.14, 0.36], colors.stone);
        this.label(group, '숲길 ↑', [p.x, 1.39, p.z + 0.15], [1.02, 0.3], '#b99662');
        this.label(group, '↓ 광장', [p.x, 1.03, p.z + 0.15], [1.02, 0.3], '#b99662');
        for (const rail of townHallEntranceRails) {
            const { x, z, depth } = rail;
            for (let i = 0; i < 2; i++) {
                this.box(group, [x, 0.4, z + (0.5 - i) * (depth - rail.width)], [rail.width, 0.8, rail.width], colors.wood);
            }
            for (const y of [0.31, 0.61])
                this.box(group, [x, y, z], [rail.width * 0.65, 0.08, depth - rail.width], colors.board);
        }
    }
    label(group, text, position, size, background) {
        const canvas = document.createElement('canvas');
        canvas.width = 192;
        canvas.height = 48;
        const context = canvas.getContext('2d');
        if (!context)
            return;
        context.fillStyle = background;
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.strokeStyle = '#68543a';
        context.lineWidth = 4;
        context.strokeRect(3, 3, 186, 42);
        context.fillStyle = '#35443b';
        context.font = 'bold 28px sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, 96, 25);
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.generateMipmaps = false;
        this.textures.push(texture);
        const material = new THREE.MeshLambertMaterial({ map: texture });
        this.labelMaterials.push(material);
        this.box(group, position, [size[0] + 0.06, size[1] + 0.06, 0.08], colors.wood);
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(...size), material);
        mesh.position.set(position[0], position[1], position[2] + 0.046);
        group.add(mesh);
    }
    async load() {
        await this.sprites.load();
    }
    face(camera) {
        this.sprites.face(camera);
    }
    dispose() {
        this.sprites.dispose();
        this.root.traverse((object) => {
            if (object instanceof THREE.Mesh && object.geometry !== this.cube)
                object.geometry.dispose();
        });
        this.cube.dispose();
        this.materials.forEach((material) => {
            material.map?.dispose();
            material.dispose();
        });
        this.textures.forEach((texture) => texture.dispose());
        this.labelMaterials.forEach((material) => material.dispose());
        this.variants.clear();
        this.root.clear();
    }
}
