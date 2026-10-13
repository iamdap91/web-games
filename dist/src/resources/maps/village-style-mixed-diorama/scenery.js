import * as THREE from 'three';
import { MixedDioramaMaterials } from './materials.js';
import { mixedDioramaBridgeCenters, mixedDioramaBuildings, mixedDioramaShrubs, mixedDioramaRules, mixedDioramaOutline, mixedDioramaRiver, mixedDioramaStalls, mixedDioramaWall, groundHeight, } from './layout.js';
/** 도장 기단, 비대칭 건축, 껍질·이끼·천의 로컬 장식과 복구 상태를 소유한다. */
export class MixedDioramaScenery {
    root = new THREE.Group();
    materials = new MixedDioramaMaterials();
    restored = new THREE.Group();
    broken = new THREE.Group();
    plaster = this.materials.surface({ kind: 'plaster' });
    roof = this.materials.surface({ kind: 'roof' });
    brick = this.materials.surface({ kind: 'brick' });
    bark = this.materials.surface({ kind: 'bark' });
    moss = this.materials.surface({ kind: 'moss' });
    cloth = this.materials.surface({ kind: 'cloth' });
    paleCloth = this.materials.surface({
        kind: 'cloth',
        color: 0xb6d4c3,
    });
    earth = this.materials.surface({ kind: 'earth' });
    dark = this.materials.flat(0x293e4b);
    copper = this.materials.flat(0xba7959);
    constructor() {
        const outline = new THREE.Shape();
        mixedDioramaOutline.forEach((p, i) => i ? outline.lineTo(p.x, -p.z) : outline.moveTo(p.x, -p.z));
        outline.closePath();
        const base = new THREE.Mesh(new THREE.ExtrudeGeometry(outline, {
            depth: 1.6,
            bevelEnabled: true,
            bevelSize: 0.16,
            bevelThickness: 0.12,
            bevelSegments: 1,
        }), this.brick);
        base.rotation.x = -Math.PI / 2;
        base.position.y = -1.62;
        base.receiveShadow = true;
        this.root.add(base);
        const ground = new THREE.Mesh(new THREE.ShapeGeometry(outline), this.earth);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = 0.112;
        const groundPositions = ground.geometry.getAttribute('position'), groundUv = ground.geometry.getAttribute('uv');
        for (let i = 0; i < groundUv.count; i++)
            groundUv.setXY(i, (groundPositions.getX(i) + 12) / 24, (groundPositions.getY(i) + 12) / 24);
        ground.receiveShadow = true;
        this.root.add(ground);
        this.box(this.root, 7.1, 1.6, 5, -2.65, 0.9, -7, this.brick);
        this.box(this.root, 7.1, 0.09, 5, -2.65, 1.655, -7, this.earth);
        for (let row = 0; row < 4; row++)
            for (let col = 0; col < 12; col++)
                this.box(this.root, 0.56, 0.32, 0.16, -5.95 + col * 0.59 + (row % 2) * 0.08, 0.3 + row * 0.38, -4.43, this.brick);
        const rise = mixedDioramaRules.terrace - mixedDioramaRules.ground;
        for (let i = 0; i < mixedDioramaRules.frontSteps; i++) {
            const h = rise / mixedDioramaRules.frontSteps;
            this.box(this.root, 2.5, h, 2.7 / mixedDioramaRules.frontSteps, -2.8, mixedDioramaRules.ground + (i + 0.5) * h, -1.8 - ((i + 0.5) * 2.7) / mixedDioramaRules.frontSteps, this.brick);
        }
        for (let i = 0; i < mixedDioramaRules.sideSteps; i++) {
            const h = rise / mixedDioramaRules.sideSteps;
            this.box(this.root, 1.5 / mixedDioramaRules.sideSteps, h, 2.5, 0.9 + ((i + 0.5) * 1.5) / mixedDioramaRules.sideSteps, mixedDioramaRules.terrace - (i + 0.5) * h, -6.25, this.brick);
        }
        // 동쪽 가장자리에서 꺾인 수로 끝을 돌아 귀환하는 길을 남긴다.
        mixedDioramaRiver.forEach((a, index) => {
            const b = mixedDioramaRiver[index + 1];
            if (!b)
                return;
            const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
            const river = this.box(this.root, 1.55, 0.08, length + 0.1, (a.x + b.x) / 2, 0.15, (a.z + b.z) / 2, this.materials.flat(0x487987));
            river.rotation.y = Math.atan2(dx, dz);
            for (let i = 0; i < Math.ceil(length / 0.5); i++)
                for (const side of [-1, 1]) {
                    const d = (i + 0.5) / Math.ceil(length / 0.5);
                    this.rock(a.x + dx * d + ((side * dz) / length) * 0.91, 0.25, a.z + dz * d - ((side * dx) / length) * 0.91, 0.3, 0.24, 0.28, i, this.brick);
                }
        });
        for (const z of mixedDioramaBridgeCenters)
            this.bridge(z);
        mixedDioramaBuildings.forEach((b, i) => this.building({ ...b, role: i === 0 ? 'dojo' : 'kiln' }));
        this.hearth();
        this.market();
        this.shelter();
        this.wall();
        this.lanes();
        mixedDioramaShrubs.forEach(([x, z], i) => this.tree(x, z, i));
        this.root.add(this.restored, this.broken);
        this.setRestored(false);
    }
    box(parent, w, h, d, x, y, z, material) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
        m.position.set(x, y, z);
        m.castShadow = true;
        m.receiveShadow = true;
        parent.add(m);
        return m;
    }
    rock(x, y, z, w, h, d, seed, material) {
        const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), material);
        m.position.set(x, y, z);
        m.scale.set(w, h, d);
        m.rotation.set(0.08 * Math.sin(seed), seed * 0.53, 0.1 * Math.cos(seed));
        m.castShadow = true;
        m.receiveShadow = true;
        this.root.add(m);
        return m;
    }
    building(b) {
        const { x, z, width: w, depth: d, height: h } = b;
        const y = groundHeight(b);
        const g = new THREE.Group();
        this.root.add(g);
        const wallMaterial = b.role === 'kiln'
            ? this.materials.surface({ kind: 'plaster', color: 0xf4bc8d })
            : b.role === 'market'
                ? this.materials.surface({ kind: 'plaster', color: 0xb1b9c5 })
                : this.plaster;
        this.box(g, w, h, d, x, y + h / 2, z, wallMaterial);
        // 도장의 큰 처마는 두께와 휘어진 양끝을 갖는 별도 3D 지붕판이다.
        this.curvedRoof(g, {
            x,
            z,
            y: y + h,
            w: w + (b.role === 'dojo' ? 1.8 : 1),
            d: d + 1.3,
            material: b.role === 'kiln'
                ? this.materials.surface({ kind: 'cloth', color: 0xc59677 })
                : this.roof,
        });
        for (const dx of [-w / 2 + 0.08, w / 2 - 0.08])
            this.box(g, 0.24, h, 0.28, x + dx, y + h / 2, z + d / 2 + 0.08, this.bark);
        this.box(g, w + 0.15, 0.18, d + 0.18, x, y + 0.22, z, this.brick);
        this.box(g, w + 0.18, 0.19, 0.22, x, y + h - 0.15, z + d / 2 + 0.12, this.dark);
        for (let i = 0; i <= w / 0.65; i++)
            this.box(g, 0.14, 0.24, d + 0.6, x - w / 2 + i * 0.65, y + h - 0.24, z, this.bark);
        const doorW = b.role === 'dojo' ? 1.5 : 0.9;
        this.box(g, doorW, b.role === 'dojo' ? 2.5 : 1.7, 0.1, x, y + (b.role === 'dojo' ? 1.25 : 0.85), z + d / 2 + 0.08, this.dark);
        for (let i = 0; i < 7; i++)
            this.box(g, 0.055, b.role === 'dojo' ? 2.35 : 1.55, 0.08, x - doorW / 2 + 0.1 + (i * (doorW - 0.2)) / 6, y + (b.role === 'dojo' ? 1.18 : 0.8), z + d / 2 + 0.16, this.bark);
        for (const dx of [-w * 0.3, w * 0.3]) {
            this.box(g, 0.7, 0.9, 0.09, x + dx, y + h * 0.58, z + d / 2 + 0.09, this.dark);
            for (const offset of [-0.22, 0, 0.22])
                this.box(g, 0.035, 0.8, 0.08, x + dx + offset, y + h * 0.58, z + d / 2 + 0.16, this.bark);
            this.box(g, 0.75, 0.07, 0.12, x + dx, y + h * 0.58, z + d / 2 + 0.19, this.bark);
        }
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(b.role === 'dojo' ? 2.1 : 1.3, 0.7), this.materials.sign(b.role === 'dojo'
            ? '도장'
            : b.role === 'kiln'
                ? '안료'
                : b.role === 'market'
                    ? '천시장'
                    : '붓방'));
        sign.position.set(x, y + h - 0.8, z + d / 2 + 0.21);
        g.add(sign);
        this.pot(x - w / 2 - 0.35, z + d / 2 + 0.05, y, 0.5);
        this.pot(x + w / 2 + 0.4, z + d / 2 + 0.15, y, 0.35);
        // 로컬 종이 조각과 껍질 차양은 화면 좌표를 따르지 않는다.
        for (let i = 0; i < 4; i++) {
            const tag = this.box(g, 0.24, 0.42, 0.025, x + w * 0.38, y + 0.8 + i * 0.18, z + d / 2 + 0.24, this.paleCloth);
            tag.rotation.z = 0.18 - i * 0.1;
        }
        if (b.role === 'dojo') {
            this.canopy(this.restored, {
                x,
                z: z + d / 2 + 0.8,
                y: y + 2.35,
                w: 4.7,
                d: 1.7,
                material: this.paleCloth,
            });
            this.canopy(this.broken, {
                x: x - 0.9,
                z: z + d / 2 + 0.65,
                y: y + 2.18,
                w: 2.6,
                d: 1.2,
                material: this.cloth,
            });
            for (const px of [x - 2.15, x + 2.15]) {
                this.box(this.restored, 0.18, 2.45, 0.18, px, y + 1.2, -4.65, this.bark);
                this.box(this.restored, 0.36, 0.6, 0.32, px, y + 1.86, -5.42, this.copper);
            }
            const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.65, 16), this.bark);
            drum.rotation.z = Math.PI / 2;
            drum.position.set(x - 2.4, y + 0.72, -5.1);
            drum.castShadow = true;
            this.restored.add(drum);
            this.box(this.restored, 1, 0.18, 0.6, -2.4, y + 0.33, -5.1, this.bark);
            for (let i = 0; i < 4; i++) {
                const plank = this.box(this.broken, 0.65, 0.09, 0.25, x - 2.6 + i * 0.43, y + 0.06, -4.95 - i * 0.15, this.bark);
                plank.rotation.y = i * 0.5;
            }
            this.mossPatch(x - 2.6, y + 0.2, -4.39, 0.8, 0.7, 'wall');
        }
        if (b.role === 'kiln') {
            this.box(g, 0.74, 2, 0.78, x - 0.6, y + h + 0.8, z - 0.6, this.brick);
            this.box(g, 0.96, 0.14, 0.96, x - 0.6, y + h + 1.85, z - 0.6, this.dark);
            this.canopy(g, {
                x: x + w * 0.5 + 0.5,
                z: z + 0.55,
                y: 2.25,
                w: 1.7,
                d: 3.3,
                material: this.cloth,
            });
        }
    }
    curvedRoof(parent, o) {
        const { x, z, y, w, d, material } = o;
        for (const sign of [-1, 1]) {
            const geo = new THREE.PlaneGeometry(w, d / 2, 18, 8);
            const p = geo.getAttribute('position');
            for (let i = 0; i < p.count; i++) {
                const px = p.getX(i), t = (p.getY(i) + d / 4) / (d / 2);
                p.setXYZ(i, px, 0.95 * (1 - t) +
                    Math.pow(Math.abs(px) / (w / 2), 5) * 0.22 +
                    Math.pow(t, 6) * 0.16, (sign * t * d) / 2);
            }
            geo.computeVertexNormals();
            const mesh = new THREE.Mesh(geo, material);
            mesh.position.set(x, y, z);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            parent.add(mesh);
            for (let i = 0; i < 13; i++) {
                const px = x - w / 2 + (i * w) / 12;
                const endY = y + Math.pow(Math.abs(px - x) / (w / 2), 5) * 0.22 + 0.12;
                this.box(parent, w / 13 + 0.02, 0.18, 0.21, px, endY, z + (sign * d) / 2, this.dark);
            }
        }
        this.box(parent, w + 0.1, 0.2, 0.23, x, y + 0.97, z, this.bark);
        for (const end of [-1, 1]) {
            const fin = this.box(parent, 0.18, 0.55, 0.16, x + (end * w) / 2, y + 1.12, z, this.bark);
            fin.rotation.z = -end * 0.2;
        }
    }
    canopy(parent, o) {
        const geometry = new THREE.PlaneGeometry(o.w, o.d, 20, 8);
        geometry.rotateX(-Math.PI / 2);
        const p = geometry.getAttribute('position');
        for (let i = 0; i < p.count; i++)
            p.setY(i, -0.23 * Math.cos((p.getX(i) / o.w) * Math.PI) + p.getZ(i) * 0.12);
        geometry.computeVertexNormals();
        const mesh = new THREE.Mesh(geometry, o.material);
        mesh.position.set(o.x, o.y, o.z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        parent.add(mesh);
        for (const side of [-1, 1])
            this.box(parent, 0.065, 0.07, o.d, o.x + (side * o.w) / 2, o.y, o.z, this.bark);
        for (let i = 0; i < 10; i++)
            this.box(parent, o.w / 11, 0.17, 0.025, o.x - o.w / 2 + ((i + 0.5) * o.w) / 10, o.y - 0.22, o.z + o.d / 2, this.cloth);
    }
    bridge(z) {
        for (let i = 0; i < 14; i++) {
            const x = 3.25 + (i + 0.5) * 0.25, y = groundHeight({ x, z });
            this.box(this.root, 0.27, 0.2, 1.85, x, y - 0.1, z, this.brick);
            for (const side of [-1, 1])
                this.rock(x, y + 0.22, z + side * 0.86, 0.17, 0.2, 0.16, i, this.brick);
        }
    }
    hearth() {
        this.box(this.root, 2.8, 0.025, 3.7, -5.1, 0.116, 1.4, this.materials.surface({ kind: 'earth', color: 0xeac9a7 }));
        this.box(this.root, 1.4, 0.65, 1.7, -5.1, 0.425, 1.7, this.dark);
        for (let i = 0; i < 8; i++) {
            const a = (i * Math.PI) / 4;
            this.rock(-5.1 + Math.cos(a) * 0.7, 0.5, 1.7 + Math.sin(a) * 0.7, 0.27, 0.3, 0.25, i, this.brick);
        }
        this.box(this.root, 0.75, 0.95, 0.7, -5.1, 1.18, 1.27, this.brick);
        for (let i = 0; i < 12; i++) {
            const log = this.box(this.root, 0.52, 0.14, 0.15, -6.4 + Math.floor(i / 4) * 0.15, 0.18 + (i % 4) * 0.15, 1.2 + (i % 3) * 0.18, this.bark);
            log.rotation.y = 0.15;
        }
        const table = this.box(this.root, 1.45, 0.16, 0.8, -7, 0.94, -0.6, this.bark);
        table.rotation.y = 0.12;
        for (const x of [-7.6, -6.4])
            this.box(this.root, 0.14, 0.8, 0.14, x, 0.5, -0.6, this.bark);
        for (let i = 0; i < 5; i++)
            this.pot(-7.5 + i * 0.25, -0.6, 1.02, 0.22);
        this.box(this.root, 0.55, 0.65, 0.45, -5.9, 0.425, 2.1, this.bark);
    }
    market() {
        for (const p of mixedDioramaStalls) {
            const { x, z } = p;
            this.canopy(this.root, {
                x,
                y: 1.8,
                z,
                w: 2.2,
                d: 1.5,
                material: x < 0 ? this.cloth : this.paleCloth,
            });
            for (const dx of [-0.95, 0.95])
                this.box(this.root, 0.09, 1.66, 0.09, x + dx, 0.88, z - 0.35, this.bark);
            this.box(this.root, 1.95, 0.13, 0.7, x, 0.83, z, this.bark);
            for (let i = 0; i < 5; i++)
                this.pot(x - 0.7 + i * 0.35, z, 0.9, 0.22);
            this.box(this.root, 1.7, 0.45, 0.65, x, 0.34, z, this.brick);
            for (let i = 0; i < 3; i++) {
                const cloth = this.box(this.root, 0.43, 0.75, 0.04, x - 0.65 + i * 0.58, 0.96, z + 0.42, i % 2 ? this.cloth : this.paleCloth);
                cloth.rotation.z = 0.08 * Math.sin(i);
            }
        }
        // 낮은 천시장 옆에는 등짐과 말아 둔 천이 크기 차이를 만든다.
        this.box(this.root, 1.6, 0.025, 2.7, 0.2, 0.116, 5.5, this.paleCloth);
        for (let i = 0; i < 5; i++) {
            const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.9, 10), i % 2 ? this.cloth : this.paleCloth);
            roll.rotation.z = Math.PI / 2;
            roll.position.set(2.5, 0.99 + i * 0.04, 6.3 + i * 0.12);
            this.root.add(roll);
        }
    }
    wall() {
        const w = mixedDioramaWall;
        this.box(this.root, w.width, w.height, w.depth, w.x, 0.1 + w.height / 2, w.z, this.brick);
        for (let i = 0; i < 12; i++)
            this.box(this.root, 0.68, 0.15, 0.47, w.x, 2.81, w.z - w.depth / 2 + i * 0.46, this.roof);
        this.mossPatch(w.x - 0.235, 1.2, w.z - 0.3, 1.3, 1.7, 'side');
        this.mossPatch(w.x - 0.235, 0.35, w.z + 1.7, 0.8, 0.65, 'side');
    }
    shelter() {
        this.box(this.root, 3.6, 0.11, 3.9, 9.3, 0.055, -7, this.bark);
        this.canopy(this.root, {
            x: 9.4,
            z: -7.4,
            y: 2.7,
            w: 3.7,
            d: 2.7,
            material: this.paleCloth,
        });
        for (const x of [7.9, 10.8])
            this.box(this.root, 0.18, 2.6, 0.18, x, 1.4, -8, this.bark);
        this.box(this.root, 1.9, 0.17, 0.7, 9.5, 0.7, -8, this.bark);
        for (const x of [8.75, 10.25])
            this.box(this.root, 0.12, 0.55, 0.12, x, 0.4, -8, this.bark);
        this.pot(9.5, -8, 0.79, 0.38);
        for (let i = 0; i < 8; i++)
            this.mossPatch(8.3 + i * 0.27, 0.13, -8.9, 0.28, 0.35, 'ground');
    }
    lanes() {
        for (let i = 0; i < 24; i++) {
            const z = 10.4 - i * 0.45, x = -2.8 + Math.sin(i * 0.2) * 0.4;
            this.rock(x, 0.122, z, 0.46, 0.024, 0.27, i, this.brick);
            this.rock(x + 0.61, 0.12, z + 0.16, 0.3, 0.02, 0.23, i + 15, this.brick);
        }
        for (let i = 0; i < 22; i++)
            this.rock(-4.8 + i * 0.3, 0.12, 3.4 + Math.sin(i * 0.17) * 0.25, 0.28, 0.025, 0.22, i, this.brick);
        for (let i = 0; i < 26; i++)
            this.rock(8.6 + Math.sin(i * 0.13) * 0.6, 0.12, -7.5 + i * 0.5, 0.26, 0.025, 0.22, i, this.brick);
        for (let i = 0; i < 19; i++)
            this.rock(8 - i * 0.38, 0.12, 5.5 + Math.sin(i * 0.17) * 0.25, 0.29, 0.025, 0.24, i, this.brick);
    }
    mossPatch(x, y, z, w, h, orientation) {
        const shape = new THREE.Shape();
        for (let i = 0; i < 18; i++) {
            const a = (i / 18) * Math.PI * 2, r = 0.38 + 0.12 * Math.sin(i * 6.1);
            const px = Math.cos(a) * w * r, py = Math.sin(a) * h * r;
            if (i)
                shape.lineTo(px, py);
            else
                shape.moveTo(px, py);
        }
        shape.closePath();
        const geo = new THREE.ShapeGeometry(shape);
        geo.computeBoundingBox();
        const bounds = geo.boundingBox;
        if (!bounds)
            return;
        const uv = geo.getAttribute('uv');
        const pos = geo.getAttribute('position');
        for (let i = 0; i < uv.count; i++)
            uv.setXY(i, (pos.getX(i) - bounds.min.x) / (bounds.max.x - bounds.min.x), (pos.getY(i) - bounds.min.y) / (bounds.max.y - bounds.min.y));
        const m = new THREE.Mesh(geo, this.moss);
        m.position.set(x, y, z);
        if (orientation === 'side')
            m.rotation.y = -Math.PI / 2;
        else if (orientation === 'ground')
            m.rotation.x = -Math.PI / 2;
        this.root.add(m);
    }
    tree(x, z, seed) {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.24, 2.5, 8), this.bark);
        trunk.position.set(x, 1.35, z);
        trunk.castShadow = true;
        this.root.add(trunk);
        for (let i = 0; i < 7; i++)
            this.rock(x + Math.sin(i * 2.4) * 0.65, 2.3 + (i % 3) * 0.35, z + Math.cos(i * 2.4) * 0.65, 0.65, 0.43, 0.65, i + seed, this.moss);
        for (let i = 0; i < 6; i++)
            this.mossPatch(x + Math.sin(i) * 0.6, 0.14, z + Math.cos(i) * 0.6, 0.8, 0.6, 'ground');
    }
    pot(x, z, y, scale) {
        const points = [
            new THREE.Vector2(0.15, 0),
            new THREE.Vector2(0.29, 0.15),
            new THREE.Vector2(0.27, 0.43),
            new THREE.Vector2(0.19, 0.53),
            new THREE.Vector2(0.2, 0.6),
            new THREE.Vector2(0.14, 0.6),
        ];
        const m = new THREE.Mesh(new THREE.LatheGeometry(points, 14), this.copper);
        m.position.set(x, y, z);
        m.scale.setScalar(scale * 1.6);
        m.castShadow = true;
        m.receiveShadow = true;
        this.root.add(m);
    }
    setRestored(value) {
        this.restored.visible = value;
        this.broken.visible = !value;
    }
    setNormals(value) {
        this.materials.setNormals(value);
    }
    dispose() {
        const geometries = new Set();
        this.root.traverse((o) => {
            if (o instanceof THREE.Mesh)
                geometries.add(o.geometry);
        });
        geometries.forEach((g) => g.dispose());
        this.materials.dispose();
        this.root.clear();
    }
}
