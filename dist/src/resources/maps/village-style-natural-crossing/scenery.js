import { travelHeight, highBridgeHeight } from './crossing.js';
import * as THREE from 'three';
import { distanceToPath, groundHeight, naturalTrees, riverCenter, } from './layout.js';
const palette = {
    grass: 0x76945c,
    lightGrass: 0x8ea266,
    shadeGrass: 0x668955,
    trail: 0xc9b37d,
    wood: 0x766548,
    darkWood: 0x51493c,
    stone: 0x8d9384,
    roof: 0x636f59,
    wall: 0xd1c494,
    river: 0x68aeb0,
};
/** 지형·건축·풀 카드와 GPU 리소스 수명을 함께 소유한다. */
export class NaturalScenery {
    root = new THREE.Group();
    textures = [];
    restored = new THREE.Group();
    ruined = new THREE.Group();
    flames = [];
    smoke = [];
    fireLight = new THREE.PointLight(0xffba59, 0, 6, 2);
    riverGlints = [];
    time = 0;
    ramp;
    constructor() {
        this.ramp = new THREE.DataTexture(new Uint8Array([70, 148, 230]), 3, 1, THREE.RedFormat);
        this.ramp.needsUpdate = true;
        this.ramp.magFilter = THREE.NearestFilter;
        this.ramp.minFilter = THREE.NearestFilter;
        this.textures.push(this.ramp);
        this.land();
        this.river();
        this.dojo();
        this.cabin();
        this.hearth();
        this.layeredCrossing();
        this.bridge(-10, 1.6);
        this.restingPlace();
        this.gate();
        for (const [x, z, scale] of naturalTrees)
            this.tree(x, z, scale);
        this.groundCards();
        this.details();
        this.root.add(this.restored, this.ruined, this.fireLight);
        this.fireLight.position.set(-5, 1.4, 3);
    }
    material(color) {
        return new THREE.MeshToonMaterial({ color, gradientMap: this.ramp });
    }
    mesh(geometry, color, position, parent = this.root) {
        const mesh = new THREE.Mesh(geometry, this.material(color));
        mesh.position.copy(position);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    }
    box(x, y, z, w, h, d, color, parent = this.root) {
        return this.mesh(new THREE.BoxGeometry(w, h, d), color, new THREE.Vector3(x, y, z), parent);
    }
    groundBox(x, z, w, h, d, color, parent = this.root) {
        return this.box(x, groundHeight({ x, z }) + h / 2, z, w, h, d, color, parent);
    }
    land() {
        const geometry = new THREE.PlaneGeometry(28, 28, 80, 80);
        geometry.rotateX(-Math.PI / 2);
        const positions = geometry.getAttribute('position'), colors = [];
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i), z = positions.getZ(i), point = { x, z };
            const river = Math.abs(x - riverCenter(z));
            positions.setY(i, river < 1.12 ? -0.12 : groundHeight(point));
            const path = distanceToPath(point), noise = Math.sin(x * 0.58 + z * 0.11) * Math.cos(z * 0.49);
            const color = new THREE.Color(river < 1.62
                ? 0xb9b69a
                : path < 0.87
                    ? palette.trail
                    : noise > 0.5
                        ? palette.lightGrass
                        : noise < -0.5
                            ? palette.shadeGrass
                            : palette.grass);
            colors.push(color.r, color.g, color.b);
        }
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.computeVertexNormals();
        const terrain = new THREE.Mesh(geometry, new THREE.MeshToonMaterial({
            vertexColors: true,
            gradientMap: this.ramp,
        }));
        terrain.receiveShadow = true;
        this.root.add(terrain);
        this.box(0, -0.65, 0, 28, 1, 28, 0x677957);
        for (let i = 0; i < 18; i++) {
            const x = -14 + i * 1.7;
            this.mesh(new THREE.ConeGeometry(3.4, 4 + (i % 3), 5), 0x9dac8c, new THREE.Vector3(x, 1.8, -18 - (i % 2)));
        }
    }
    river() {
        const geometry = new THREE.BufferGeometry(), positions = [], indices = [];
        for (let i = 0; i <= 64; i++) {
            const z = -14 + (i * 28) / 64, c = riverCenter(z);
            positions.push(c - 1.2, -0.04, z, c + 1.2, -0.04, z);
            if (i < 64) {
                const j = i * 2;
                indices.push(j, j + 2, j + 1, j + 1, j + 2, j + 3);
            }
        }
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        const water = this.mesh(geometry, palette.river, new THREE.Vector3());
        water.castShadow = false;
        for (let i = 0; i < 28; i++) {
            const z = -13 + i * 0.96, x = riverCenter(z) + Math.sin(i * 4.1) * 0.65;
            const glint = new THREE.Mesh(new THREE.PlaneGeometry(0.22 + (i % 3) * 0.11, 0.06), new THREE.MeshBasicMaterial({
                color: i % 3 === 0 ? 0xc1d5ba : 0x8bc6c0,
            }));
            glint.rotation.x = -Math.PI / 2;
            glint.position.set(x, -0.022, z);
            this.root.add(glint);
            this.riverGlints.push(glint);
        }
        for (let i = 0; i < 17; i++) {
            const z = -13 + i * 1.7, x = riverCenter(z) + (i % 2 ? 1.55 : -1.6);
            this.rock(x, z, 0.28 + (i % 3) * 0.12);
        }
    }
    roof(x, z, width, depth, y, color, parent) {
        const w = width / 2, d = depth / 2;
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute([
            -w,
            0,
            -d,
            w,
            0,
            -d,
            w,
            0,
            d,
            -w,
            0,
            d,
            -w * 0.63,
            1.45,
            0,
            w * 0.63,
            1.45,
            0,
        ], 3));
        geometry.setIndex([
            0, 4, 5, 0, 5, 1, 3, 2, 5, 3, 5, 4, 0, 3, 4, 1, 5, 2, 0, 1, 2, 0, 2, 3,
        ]);
        geometry.computeVertexNormals();
        this.mesh(geometry, color, new THREE.Vector3(x, y, z), parent);
        this.box(x, y + 0.06, z, width + 0.16, 0.2, depth + 0.18, palette.darkWood, parent);
        this.box(x, y + 1.42, z, width * 0.72, 0.19, 0.22, color, parent);
    }
    dojo() {
        const x = 1, z = -7.1, y = groundHeight({ x, z });
        this.box(x, y + 0.1, z, 6.8, 0.4, 4.8, palette.stone);
        this.box(x, y + 1.55, z, 6.1, 2.6, 4.1, palette.wall);
        for (const px of [-2, 1, 4])
            this.box(px, y + 1.6, -4.95, 0.22, 2.85, 0.24, palette.darkWood);
        this.box(1, groundHeight({ x: 1, z: -4.68 }) + 0.08, -4.68, 5.6, 0.16, 0.76, palette.wood);
        this.box(1, groundHeight({ x: 1, z: -4.12 }) - 0.04, -4.12, 5.6, 0.1, 0.6, 0xaaa48a);
        this.box(1, y + 1.25, -4.99, 1.3, 2.2, 0.04, palette.darkWood);
        for (const px of [-0.8, 2.8]) {
            this.box(px, y + 1.8, -4.99, 1.15, 1.08, 0.045, 0xabbd9d);
            for (let i = -1; i <= 1; i++)
                this.box(px + i * 0.33, y + 1.8, -4.94, 0.06, 1.08, 0.06, palette.wood);
            this.box(px, y + 1.8, -4.94, 1.15, 0.07, 0.07, palette.wood);
        }
        this.roof(x, z, 7.5, 5.3, y + 2.95, 0x59765c, this.restored);
        this.roof(x, z, 7.3, 5.2, y + 2.95, 0x86886d, this.ruined);
        for (const px of [-2.3, 4.3]) {
            const lantern = this.box(px, y + 1.3, -4.3, 0.32, 0.53, 0.32, 0xffd48c, this.restored);
            lantern.castShadow = false;
            this.box(px, y + 1.62, -4.3, 0.48, 0.12, 0.45, palette.darkWood, this.restored);
        }
        this.sign(1, -4.92, y + 2.7, '道場', palette.darkWood, 0xe1d7ac);
        this.flag(-2.8, -3.7, 0xe0a25d, this.restored);
        this.flag(4.8, -3.7, 0xe0a25d, this.restored);
        for (let i = 0; i < 4; i++) {
            const plank = this.groundBox(-1 + i * 0.55, -3.2, 0.12, 0.1, 1.4, 0x8b856d, this.ruined);
            plank.rotation.y = 0.45 + i * 0.2;
        }
        this.groundBox(-3.7, -2.7, 0.8, 0.75, 0.65, palette.darkWood);
        this.groundBox(-3.7, -2.7, 0.82, 0.14, 0.68, 0xc9b480);
    }
    cabin() {
        const x = -8.2, z = 4.6, y = groundHeight({ x, z });
        this.box(x, y + 1.1, z, 3, 2.2, 3.2, 0xb8ad7b);
        this.roof(x, z, 3.9, 4, y + 2.2, 0xa9915a, this.root);
        this.box(x, y + 1, 6.22, 0.8, 1.8, 0.05, palette.darkWood);
        this.box(-9.15, y + 1.35, 6.25, 0.7, 0.6, 0.04, 0xa9bfad);
        this.groundBox(-8, 7, 3.6, 0.12, 1.1, palette.wood);
        this.groundBox(-10.6, 4.4, 0.9, 0.55, 0.7, 0x9c8157);
        this.sign(-8.2, 6.26, y + 2.02, '茶', palette.darkWood, 0xe2d0a4);
    }
    hearth() {
        for (let i = 0; i < 9; i++) {
            const a = (i * Math.PI * 2) / 9;
            this.rock(-5 + Math.cos(a) * 0.68, 3 + Math.sin(a) * 0.68, 0.3, 0x929082);
        }
        const y = groundHeight({ x: -5, z: 3 });
        for (let i = 0; i < 3; i++) {
            const log = this.box(-5, y + 0.14, 3, 0.2, 0.2, 1.07, palette.darkWood);
            log.rotation.y = (i * Math.PI) / 3;
        }
        for (let i = 0; i < 5; i++) {
            const flame = this.mesh(new THREE.ConeGeometry(0.19 + (i % 2) * 0.1, 0.85, 5), i % 2 ? 0xffc768 : 0xe89954, new THREE.Vector3(-5 + Math.sin(i * 3) * 0.25, y + 0.45, 3 + Math.cos(i * 3) * 0.2));
            flame.castShadow = false;
            this.flames.push(flame);
        }
        for (let i = 0; i < 5; i++) {
            const smoke = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2 + i * 0.025), new THREE.MeshBasicMaterial({
                color: 0xcdc9af,
                transparent: true,
                opacity: 0.35,
                depthWrite: false,
            }));
            this.root.add(smoke);
            this.smoke.push(smoke);
        }
        for (const [x, z, a] of [
            [-6.6, 2.2, 0.6],
            [-4.2, 4.7, -0.2],
        ]) {
            const seat = this.groundBox(x, z, 1.5, 0.43, 0.38, palette.wood);
            seat.rotation.y = a;
        }
        this.groundBox(-6.7, 0.8, 1.2, 0.3, 0.6, palette.darkWood);
        this.groundBox(-6.7, 0.8, 1.2, 0.32, 0.48, palette.wood);
    }
    layeredCrossing() {
        // 두 보행면은 독립 메시이며 같은 xz 교점에서 실제 깊이 가림을 받는다.
        for (let x = 4; x < 11.8; x += 0.2) {
            const p = { x: x + 0.1, z: 3, layer: 'high' };
            const y = travelHeight(p);
            const plank = this.box(x + 0.1, y - 0.07, 3, 0.22, 0.14, 1.65, 0xb8966d);
            plank.userData.walkLayer = 'high';
            for (const z of [2.2, 3.8]) {
                this.box(x + 0.1, y + 0.65, z, 0.22, 0.09, 0.08, 0xc7ad7d);
            }
        }
        for (let z = -3; z < 7; z += 0.2) {
            const x = riverCenter(z);
            const plank = this.box(x, 0.29, z + 0.1, z > 6.4 || z < -2.4 ? 4.0 : 1.35, 0.14, 0.23, 0x8d9c83);
            plank.userData.walkLayer = 'low';
        }
        for (const x of [6.3, 9.5])
            for (const z of [2.2, 3.8])
                this.box(x, highBridgeHeight / 2, z, 0.2, highBridgeHeight, 0.2, 0x8b7859);
        this.mesh(new THREE.SphereGeometry(0.19, 12, 8), 0x85c7cb, new THREE.Vector3(7.9, 0.63, 0));
    }
    bridge(z, depth) {
        const x = riverCenter(z), height = groundHeight({ x, z });
        for (let i = 0; i < 12; i++)
            this.box(x - 1.83 + i * 0.333, height - 0.1, z, 0.3, 0.2, depth, palette.wood);
        for (const side of [-1, 1]) {
            for (const dx of [-1.85, 0, 1.85])
                this.box(x + dx, height + 0.5, z + side * depth * 0.51, 0.13, 1.1, 0.13, palette.darkWood);
            this.box(x, height + 0.86, z + side * depth * 0.51, 4, 0.12, 0.1, 0x96825a);
        }
    }
    restingPlace() {
        this.groundBox(10.7, -8.4, 3.2, 0.14, 2.3, 0xb9b88c);
        const y = groundHeight({ x: 10.7, z: -8.6 });
        this.box(11, y + 0.57, -8.8, 1.5, 0.16, 0.55, palette.wood);
        for (const dx of [-0.55, 0.55])
            this.box(11 + dx, y + 0.29, -8.8, 0.12, 0.55, 0.4, palette.darkWood);
        this.box(11, y + 0.94, -9.08, 1.5, 0.4, 0.1, palette.wood);
        this.sign(10, -8.6, y + 0.8, '水音', palette.darkWood, 0xe2d4a0);
        this.flag(12, -9.5, 0xb4c89e, this.root);
    }
    tree(x, z, scale) {
        const y = groundHeight({ x, z });
        this.mesh(new THREE.CylinderGeometry(0.14 * scale, 0.24 * scale, 2 * scale, 6), palette.wood, new THREE.Vector3(x, y + scale, z));
        const outline = new THREE.Mesh(new THREE.IcosahedronGeometry(1.25 * scale, 1), new THREE.MeshBasicMaterial({ color: 0x405b49, side: THREE.BackSide }));
        outline.scale.set(1.04, 1.24, 1.04);
        outline.position.set(x, y + 2.8 * scale, z);
        this.root.add(outline);
        const leaves = this.mesh(new THREE.IcosahedronGeometry(1.25 * scale, 1), x < -4 ? 0x799353 : 0x638d63, new THREE.Vector3(x, y + 2.8 * scale, z));
        leaves.scale.y = 1.2;
        const cap = this.mesh(new THREE.IcosahedronGeometry(0.8 * scale, 0), 0x8caa63, new THREE.Vector3(x - 0.32 * scale, y + 3.45 * scale, z - 0.2));
        cap.scale.y = 0.7;
    }
    rock(x, z, radius, color = palette.stone) {
        const rock = this.mesh(new THREE.IcosahedronGeometry(radius, 0), color, new THREE.Vector3(x, groundHeight({ x, z }) + radius * 0.4, z));
        rock.scale.set(1.15, 0.75, 1);
        rock.rotation.y = x;
    }
    sign(x, z, y, text, bg, fg) {
        const canvas = document.createElement('canvas');
        canvas.width = 96;
        canvas.height = 40;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        ctx.fillStyle = `#${bg.toString(16).padStart(6, '0')}`;
        ctx.fillRect(0, 0, 96, 40);
        ctx.fillStyle = `#${fg.toString(16).padStart(6, '0')}`;
        ctx.font = 'bold 26px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 48, 22);
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        this.textures.push(texture);
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.52), new THREE.MeshToonMaterial({ map: texture, gradientMap: this.ramp }));
        sign.position.set(x, y, z);
        this.root.add(sign);
    }
    flag(x, z, color, parent) {
        const y = groundHeight({ x, z });
        this.box(x, y + 1.2, z, 0.075, 2.4, 0.075, palette.wood, parent);
        this.box(x + 0.37, y + 2, z, 0.7, 0.6, 0.045, color, parent);
    }
    gate() {
        for (const x of [-1.2, 1.2])
            this.groundBox(x, 11.8, 0.23, 1.8, 0.23, palette.darkWood);
        this.box(0, groundHeight({ x: 0, z: 11.8 }) + 1.85, 11.8, 3, 0.24, 0.32, palette.wood);
        this.sign(0, 11.82, 1.7, '山里', palette.darkWood, 0xe2d4a0);
    }
    groundCards() {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 20;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        ctx.fillStyle = '#658358';
        for (const [x, y, w, h] of [
            [7, 1, 2, 19],
            [3, 7, 2, 11],
            [11, 5, 2, 14],
            [1, 10, 2, 7],
            [13, 11, 2, 7],
        ])
            ctx.fillRect(x ?? 0, y ?? 0, w ?? 0, h ?? 0);
        ctx.fillStyle = '#9bae70';
        ctx.fillRect(7, 1, 1, 12);
        ctx.fillRect(3, 7, 1, 8);
        ctx.fillRect(11, 5, 1, 9);
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        this.textures.push(texture);
        const material = new THREE.MeshToonMaterial({
            map: texture,
            alphaTest: 0.55,
            side: THREE.DoubleSide,
            gradientMap: this.ramp,
        });
        for (let i = 0; i < 94; i++) {
            const x = Math.sin(i * 13.37) * 12.7, z = Math.cos(i * 8.31) * 12.4;
            if (distanceToPath({ x, z }) < 1.3 ||
                Math.abs(x - riverCenter(z)) < 1.4 ||
                Math.hypot(x - 1, z + 7) < 5)
                continue;
            for (const angle of [0, Math.PI / 2]) {
                const card = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.75), material);
                card.position.set(x, groundHeight({ x, z }) + 0.35, z);
                card.rotation.y = angle + i;
                card.castShadow = true;
                this.root.add(card);
            }
        }
    }
    details() {
        for (let i = 0; i < 19; i++) {
            const x = -12 + Math.sin(i * 4.3) * 1.2, z = -12 + i * 1.25;
            this.rock(x, z, 0.22 + (i % 3) * 0.1);
        }
        this.groundBox(-2.5, 5.8, 1.2, 0.16, 0.45, palette.stone);
        this.sign(-2.5, 5.86, 1.2, '道場 ↟', palette.darkWood, 0xe2d4a0);
        this.box(-2.5, 0.55, 5.8, 0.12, 1.1, 0.12, palette.darkWood);
        this.groundBox(5.3, 3.5, 0.12, 1.2, 0.12, palette.darkWood);
        this.sign(5.3, 3.56, 1.3, '水音 →', palette.darkWood, 0xe2d4a0);
        for (let i = 0; i < 5; i++) {
            const x = -6.3 + i * 0.45, z = -1.8;
            this.groundBox(x, z, 0.35, 0.32, 0.35, 0xcbac63);
        }
    }
    update(state, delta) {
        this.time += delta;
        this.restored.visible = state.restored;
        this.ruined.visible = !state.restored;
        this.fireLight.intensity = state.fire > 0 ? 2.6 : 0;
        const y = groundHeight({ x: -5, z: 3 });
        this.flames.forEach((flame, i) => {
            flame.visible = state.fire > 0;
            flame.scale.y = 0.8 + Math.sin(this.time * 7 + i) * 0.22;
        });
        this.smoke.forEach((smoke, i) => {
            smoke.visible = state.fire > 0;
            const phase = (this.time * 0.42 + i * 0.19) % 1;
            smoke.position.set(-5 + Math.sin(this.time + i) * 0.17 + phase * 0.4, y + 1.1 + phase * 1.8, 3);
            smoke.scale.setScalar(0.55 + phase * 1.7);
        });
        this.riverGlints.forEach((glint, i) => {
            glint.visible = Math.sin(this.time * 1.2 + i) > -0.55;
        });
    }
    dispose() {
        const materials = new Set(), geometries = new Set();
        this.root.traverse((node) => {
            if (node instanceof THREE.Mesh) {
                geometries.add(node.geometry);
                for (const material of Array.isArray(node.material)
                    ? node.material
                    : [node.material])
                    materials.add(material);
            }
        });
        geometries.forEach((geometry) => geometry.dispose());
        materials.forEach((material) => material.dispose());
        this.textures.forEach((texture) => texture.dispose());
        this.root.clear();
    }
}
