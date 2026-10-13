import * as THREE from 'three';
import { DioramaMaterials } from './materials.js';
import { dioramaBridgeCenters, dioramaBuildings, dioramaShrubs, groundHeight, dioramaGrowth, } from './layout.js';
/** 정적인 돌·목재·천 모형과 복구 차이를 소유한다. */
export class DioramaScenery {
    root = new THREE.Group();
    annex = new THREE.Group();
    yard = new THREE.Group();
    gate = new THREE.Group();
    materials = new DioramaMaterials();
    restored = new THREE.Group();
    broken = new THREE.Group();
    stone = this.materials.surface(0xf0e2c6, 'stone');
    wood = this.materials.surface(0xd3bb93, 'wood');
    plaster = this.materials.surface(0xfff3d8, 'plaster');
    earth = this.materials.surface(0xd4b992, 'earth');
    dark = this.materials.surface(0x655244);
    moss = this.materials.surface(0x6c7856);
    cloth = this.materials.surface(0xebdbc0, 'cloth');
    constructor() {
        this.box(this.root, 26, 0.8, 26, 0, -0.3, 0, this.earth);
        // 수로는 바닥보다 위에 그리고 양쪽 돌둑으로 물과 길을 구분한다.
        this.box(this.root, 2.2, 0.08, 26, 6, 0.15, 0, this.materials.surface(0x618b8c));
        for (let i = 0; i < 42; i++) {
            const z = -12.8 + i * 0.62;
            for (const x of [4.72, 7.28]) {
                const rock = this.rock(0.42, 0.3, 0.37, x, 0.28, z, i);
                rock.rotation.y = i * 0.9;
            }
        }
        this.box(this.root, 6.5, 1.2, 4.8, -0.25, 0.7, -6.9, this.dark);
        for (let x = -3.3; x < 3; x += 0.7)
            for (let z = -9.1; z < -4.5; z += 0.75)
                this.rock(0.36, 0.11, 0.38, x, 1.31, z, Math.round(x * 10 + z * 3));
        for (let i = 0; i < 6; i++)
            this.box(this.root, 2.5, 0.2, 2.5 / 6, 0, 0.2 + i * 0.2, -2 - (i + 0.5) * (2.5 / 6), this.stone);
        for (let i = 0; i < 6; i++)
            this.box(this.root, 0.25, 0.2, 2.5, 3 + (i + 0.5) * 0.25, 1.2 - i * 0.2, -6.25, this.stone);
        for (const b of dioramaBuildings)
            this.building(b.x, b.z, b.width, b.depth, b.height, b.x === 0);
        for (const z of dioramaBridgeCenters)
            this.bridge(z);
        for (let i = 0; i < 110; i++) {
            const x = -12 + ((i * 7.73) % 24), z = -12 + ((i * 3.21) % 24);
            if (Math.abs(x - 6) < 1.5 ||
                (Math.abs(x) < 1.5 && z < -2) ||
                (z < -4.5 && x > -3.5 && x < 5))
                continue;
            this.rock(0.21, 0.04, 0.18, x, 0.13, z, i);
        }
        this.growthSite();
        this.hearth();
        this.market();
        this.lanes();
        this.restArea();
        for (const [x, z] of dioramaShrubs)
            this.shrub(x, z);
        this.root.add(this.restored, this.broken);
    }
    box(parent, w, h, d, x, y, z, material) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
        m.position.set(x, y, z);
        m.castShadow = true;
        m.receiveShadow = true;
        parent.add(m);
        return m;
    }
    rock(w, h, d, x, y, z, seed) {
        const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), seed % 5 === 0 ? this.moss : this.stone);
        m.scale.set(w, h, d);
        m.rotation.set(0.08 * Math.sin(seed), seed * 0.51, 0.12 * Math.cos(seed));
        m.position.set(x, y, z);
        m.castShadow = true;
        m.receiveShadow = true;
        this.root.add(m);
        return m;
    }
    building(x, z, w, d, h, dojo) {
        const base = groundHeight({ x, z });
        const facade = new THREE.Group();
        this.root.add(facade);
        this.box(facade, w, h, d, x, base + h / 2, z, this.plaster);
        for (let i = 0; i < Math.ceil(w / 0.6); i++)
            this.rock(0.35, 0.29, 0.3, x - w / 2 + 0.3 + i * 0.6, base + 0.2, z + d / 2 + 0.03, i + 14);
        for (const px of [x - w / 2 + 0.12, x + w / 2 - 0.12])
            this.box(facade, 0.16, h, 0.19, px, base + h / 2, z + d / 2 + 0.06, this.wood);
        this.box(this.root, 0.94, 1.65, 0.09, x, base + 0.825, z + d / 2 + 0.08, this.wood);
        this.box(this.root, 0.76, 0.78, 0.09, x - w * 0.28, base + 1.9, z + d / 2 + 0.09, this.dark);
        this.box(this.root, 0.055, 0.8, 0.1, x - w * 0.28, base + 1.9, z + d / 2 + 0.15, this.wood);
        this.box(this.root, 0.8, 0.055, 0.1, x - w * 0.28, base + 1.9, z + d / 2 + 0.15, this.wood);
        const roof = new THREE.Group();
        for (const side of [-1, 1]) {
            const m = this.box(roof, w + 0.6, 0.16, d * 0.58, x, base + h + 0.35, z + side * d * 0.25, this.wood);
            m.rotation.x = side * 0.36;
            for (let i = 0; i < Math.ceil(w / 0.42); i++) {
                const plank = this.box(roof, 0.33, 0.04, d * 0.62, x - w / 2 + i * 0.42, base + h + 0.46, z + side * d * 0.25, this.wood);
                plank.rotation.x = side * 0.36;
            }
        }
        facade.add(roof);
        for (let i = 0; i <= w / 0.7; i++) {
            this.box(facade, 0.11, 0.2, d + 0.4, x - w / 2 + i * 0.7, base + h - 0.1, z, this.dark);
        }
        for (let i = 0; i < 5; i++) {
            this.box(facade, 0.014, 1.5, 0.01, x - 0.4 + i * 0.2, base + 0.83, z + d / 2 + 0.14, this.dark);
        }
        this.pot(x - w / 2 - 0.35, z + d / 2 - 0.3, base, 0.5);
        this.pot(x + w / 2 + 0.3, z + d / 2 + 0.3, base, 0.35);
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.625), this.materials.sign(dojo ? '도장' : '공방'));
        sign.position.set(x, base + 2, z + d / 2 + 0.11);
        facade.add(sign);
        if (dojo) {
            this.canopy(this.restored, 4.8, 1.5, x, base + 2.08, z + d / 2 + 0.65);
            this.canopy(this.broken, 2.9, 1.2, x - 0.7, base + 1.95, z + d / 2 + 0.5);
            this.box(this.restored, 0.15, 1.95, 0.15, -2.1, base + 0.98, -4.5, this.wood);
            this.box(this.restored, 0.15, 1.95, 0.15, 2.1, base + 0.98, -4.5, this.wood);
            this.box(this.restored, 0.36, 1, 0.36, -2.4, base + 0.5, -5.1, this.wood);
            this.box(this.restored, 4, 0.55, 0.04, 0, base + 1.65, z + d / 2 + 0.12, this.plaster);
            for (const px of [-1.4, 1.4]) {
                this.box(this.restored, 0.3, 0.44, 0.3, px, base + 1.75, z + d / 2 + 0.25, this.materials.surface(0xe9ac5a));
            }
            for (let i = 0; i < 5; i++) {
                const m = this.box(this.broken, 0.6, 0.13, 0.35, -2.5 + i * 0.4, base + 0.15, -4.8 - i * 0.14, this.wood);
                m.rotation.y = i * 0.4;
            }
        }
    }
    bridge(z) {
        for (let i = 0; i < 14; i++) {
            const x = 4.25 + (i + 0.5) * 0.25, y = groundHeight({ x, z });
            this.box(this.root, 0.27, 0.2, 1.85, x, y - 0.1, z, this.stone);
            for (const side of [-1, 1])
                this.rock(0.17, 0.22, 0.2, x, y + 0.24, z + side * 0.87, i);
        }
        // 아치 돌조각 사이에 물이 흐르는 틈을 남긴다.
        for (let i = 0; i < 11; i++) {
            const angle = (Math.PI * (i + 0.5)) / 11;
            for (const side of [-1, 1])
                this.rock(0.23, 0.16, 0.23, 6 + Math.cos(angle) * 1.15, -0.05 + Math.sin(angle) * 0.32, z + side * 0.74, i + 50);
        }
    }
    hearth() {
        this.box(this.root, 1.35, 0.65, 1.3, -4.8, 0.425, 1.3, this.dark);
        for (let i = 0; i < 8; i++) {
            const a = (i * Math.PI) / 4;
            this.rock(0.28, 0.32, 0.26, -4.8 + Math.cos(a) * 0.7, 0.5, 1.3 + Math.sin(a) * 0.7, i);
        }
        this.box(this.root, 0.75, 0.85, 0.7, -5.1, 1.1, 0.88, this.stone);
        for (let i = 0; i < 8; i++)
            this.box(this.root, 0.55, 0.11, 0.13, -6.3 + Math.floor(i / 4) * 0.13, 0.2 + (i % 4) * 0.12, 1.2 + (i % 2) * 0.18, this.wood);
        const work = this.box(this.root, 1.5, 0.15, 0.75, -7, 0.95, -0.6, this.wood);
        work.rotation.y = 0.12;
        for (const x of [-7.6, -6.4])
            this.box(this.root, 0.1, 0.85, 0.1, x, 0.52, -0.6, this.wood);
        for (let i = 0; i < 4; i++)
            this.rock(0.18, 0.22, 0.18, -7.3 + i * 0.26, 1.18, -0.6, 60 + i);
    }
    market() {
        for (const x of [-2.8, 3.4]) {
            this.canopy(this.root, 1.8, 1.1, x, 2.1, 7.6);
            for (const dx of [-0.8, 0.8])
                this.box(this.root, 0.07, 1.9, 0.07, x + dx, 1, 7.3, this.wood);
            this.box(this.root, 1.65, 0.12, 0.7, x, 0.9, 7.65, this.wood);
            for (let i = 0; i < 5; i++)
                this.rock(0.17, 0.15, 0.17, x - 0.6 + i * 0.3, 1.05, 7.6, 80 + i);
        }
    }
    restArea() {
        for (let i = 0; i < 7; i++)
            this.box(this.root, 0.31, 0.08, 3.1, 10 + i * 0.33 - 1, 0.11, -6, this.wood);
        this.box(this.root, 1.9, 0.16, 0.7, 10.8, 0.7, -7.3, this.wood);
        for (const x of [10.05, 11.55])
            this.box(this.root, 0.12, 0.55, 0.12, x, 0.4, -7.3, this.wood);
        this.canopy(this.root, 3.4, 2.3, 10.3, 2.82, -6.6);
        for (const x of [8.8, 11.8])
            this.box(this.root, 0.13, 2.65, 0.13, x, 1.4, -6.2, this.wood);
        this.box(this.root, 0.6, 0.14, 0.6, 10.8, 0.85, -7.3, this.stone);
    }
    shrub(x, z) {
        this.box(this.root, 0.16, 1.8, 0.16, x, 1, z, this.wood);
        for (let i = 0; i < 8; i++) {
            const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.58, 1), this.moss);
            m.position.set(x + Math.sin(i * 2.4) * 0.6, 1.7 + (i % 3) * 0.35, z + Math.cos(i * 2.4) * 0.6);
            m.scale.y = 0.75;
            m.castShadow = true;
            this.root.add(m);
        }
    }
    canopy(parent, w, d, x, y, z) {
        const geometry = new THREE.PlaneGeometry(w, d, 16, 4);
        geometry.rotateX(-Math.PI / 2);
        const p = geometry.getAttribute('position');
        for (let i = 0; i < p.count; i++)
            p.setY(i, -0.16 * Math.cos((p.getX(i) / w) * Math.PI) + p.getZ(i) * 0.12);
        geometry.computeVertexNormals();
        const mesh = new THREE.Mesh(geometry, this.cloth);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        parent.add(mesh);
        for (const side of [-1, 1])
            this.box(parent, 0.045, 0.05, d, x + (side * w) / 2, y, z, this.wood);
    }
    pot(x, z, y, scale) {
        const points = [
            new THREE.Vector2(0.16, 0),
            new THREE.Vector2(0.29, 0.12),
            new THREE.Vector2(0.32, 0.35),
            new THREE.Vector2(0.19, 0.52),
            new THREE.Vector2(0.21, 0.58),
            new THREE.Vector2(0.15, 0.58),
            new THREE.Vector2(0.15, 0.5),
        ];
        const pot = new THREE.Mesh(new THREE.LatheGeometry(points, 14), this.materials.surface(0xad704b));
        pot.position.set(x, y, z);
        pot.scale.setScalar(scale * 1.6);
        pot.castShadow = true;
        pot.receiveShadow = true;
        this.root.add(pot);
    }
    lanes() {
        for (let i = 0; i < 25; i++) {
            const z = 9 - i * 0.45, x = Math.sin(i * 0.21) * 0.35;
            if (z <= -2)
                continue;
            this.rock(0.52, 0.018, 0.29, x, 0.114, z, i + 103);
            this.rock(0.4, 0.015, 0.26, x + 0.55, 0.114, z + 0.18, i + 114);
        }
        for (let i = 0; i < 16; i++) {
            const x = -4.5 + i * 0.28, z = 3.3 - Math.sin((i / 16) * Math.PI) * 1.3;
            this.rock(0.3, 0.019, 0.23, x, 0.114, z, i + 128);
        }
        // 처마 아래 장작·금속 고리·난간은 정물 모형의 작은 제작 흔적이다.
        for (let i = 0; i < 5; i++)
            this.box(this.root, 0.7, 0.09, 0.12, -8.2 + i * 0.14, 0.2 + i * 0.11, 4.85, this.wood);
        const metal = this.materials.surface(0x69685d);
        for (let i = 0; i < 3; i++) {
            const ring = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 6, 16), metal);
            ring.position.set(-8.5 + i * 0.45, 1.5, 4.46);
            this.root.add(ring);
        }
        for (let i = 0; i < 7; i++)
            this.box(this.root, 0.06, 0.62, 0.06, 8.7 + i * 0.45, 0.43, -4.45, this.wood);
        this.box(this.root, 2.9, 0.08, 0.08, 10.05, 0.77, -4.45, this.wood);
    }
    growthSite() {
        const { annex, yard } = dioramaGrowth;
        this.annex.position.set(annex.x, 0.1, annex.z);
        this.box(this.annex, annex.width, 0.18, annex.depth, 0, 0.09, 0, this.stone);
        for (const x of [-1.6, 1.6])
            this.box(this.annex, 0.18, 2.1, 3.2, x, 1.15, 0, this.plaster);
        for (const z of [-1.5, 1.5])
            this.box(this.annex, 3.4, 2.1, 0.18, 0, 1.15, z, this.plaster);
        this.box(this.annex, 0.95, 1.45, 0.05, 0, 0.88, 1.61, this.wood);
        for (const x of [-1.2, 1.2])
            this.box(this.annex, 0.14, 2.3, 0.16, x, 1.2, 1.6, this.wood);
        this.box(this.annex, 3.8, 0.2, 3.7, 0, 2.32, 0, this.cloth);
        this.box(this.annex, 3.5, 0.3, 2.4, 0, 2.52, -0.2, this.cloth);
        this.root.add(this.yard, this.gate);
        this.box(this.yard, 3, 0.05, 3, yard.x, 0.13, yard.z, this.stone);
        this.box(this.yard, 1.6, 0.16, 0.4, -4.8, 0.72, -3.8, this.wood);
        for (const x of [-5.4, -4.2])
            this.box(this.yard, 0.14, 0.65, 0.3, x, 0.42, -3.8, this.wood);
        this.box(this.yard, 0.45, 0.15, 0.25, -4.8, 0.87, -3.8, this.stone);
        for (const x of [yard.x - yard.half, yard.x + yard.half])
            this.box(this.root, 0.16, 0.7, 3.16, x, 0.45, yard.z, this.wood);
        this.box(this.root, 3.16, 0.7, 0.16, yard.x, 0.45, yard.z - yard.half, this.wood);
        for (const x of [-5.92, -3.68])
            this.box(this.root, 0.8, 0.7, 0.16, x, 0.45, yard.z + yard.half, this.wood);
        this.box(this.gate, 1.3, 0.85, 0.16, yard.x, 0.5, yard.z + yard.half, this.wood);
        for (const x of [-5.48, -4.12])
            this.box(this.root, 0.16, 1.15, 0.16, x, 0.65, -1.3, this.wood);
    }
    setGrowth(progress, complete) {
        this.annex.visible = progress !== null || complete;
        this.annex.scale.y = progress === null ? 1 : Math.max(0.03, progress);
        this.yard.visible = complete;
        this.gate.visible = !complete;
    }
    setRestored(value) {
        this.restored.visible = value;
        this.broken.visible = !value;
    }
    dispose() {
        this.root.traverse((o) => {
            if (o instanceof THREE.Mesh)
                o.geometry.dispose();
        });
        if (this.annex.parent !== this.root)
            this.annex.traverse((o) => {
                if (o instanceof THREE.Mesh)
                    o.geometry.dispose();
            });
        this.materials.dispose();
    }
}
