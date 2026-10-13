import * as THREE from 'three';
import { groundHeight, retroBuildings, retroTrees, retroWalls, retroBarrels, } from './layout.js';
import { pixelTexture } from './pixel-textures.js';
/** 작은 픽셀 재질과 두께 있는 적은 면의 건축으로 레트로 나루를 구성한다. */
export class RetroScenery {
    root = new THREE.Group();
    textures = [];
    restored = new THREE.Group();
    damaged = new THREE.Group();
    flames = new THREE.Group();
    smoke = new THREE.Group();
    fireLight = new THREE.PointLight(0xff9d55, 0, 7, 2);
    water;
    elapsed = 0;
    constructor() {
        // 두 강둑을 따로 만들어 수면 위를 지면으로 덮지 않는다.
        this.box(this.root, [-2.5, -0.02, 0], [18.8, 0.4, 22.5], 'stone', {
            repeat: [8, 8],
            color: 0xc4af90,
        });
        this.box(this.root, [10.55, -0.02, 0], [2.85, 0.4, 22.5], 'stone', {
            repeat: [2, 8],
        });
        const waterMaterial = this.material('water', [2, 8], 0xc0d4c2);
        this.water = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.05, 22.5), waterMaterial);
        this.water.position.set(8, 0.045, 0);
        this.water.receiveShadow = true;
        this.root.add(this.water);
        for (const x of [6.75, 9.25])
            this.box(this.root, [x, 0.14, 0], [0.38, 0.48, 22.4], 'stone', {
                repeat: [1, 9],
                color: 0x928e79,
            });
        // 시장 가장자리는 거친 돌담으로 구분한다.
        for (const { x, z, width, depth } of retroWalls)
            this.box(this.root, [x, 0.55, z], [width, 0.9, depth], 'stone', {
                repeat: [Math.max(1, width / 2), Math.max(1, depth / 2)],
                color: 0x9d9580,
            });
        this.box(this.root, [1.25, 0.46, -7.15], [6.5, 1.28, 5.3], 'stone', {
            repeat: [4, 2],
            color: 0x9a9a86,
        });
        for (let i = 0; i < 6; i++) {
            const top = 0.2 + (i + 1) * 0.15;
            this.box(this.root, [1.3, top / 2, -2.5 - (i + 0.5) * (2 / 6)], [2.6, top, 2 / 6], 'stone', { repeat: [2, 0.5], color: 0xb8b49f });
            this.box(this.root, [4.5 + (i + 0.5) * (1.7 / 6), (1.1 - i * 0.15) / 2, -7.6], [1.7 / 6, 1.1 - i * 0.15, 2.6], 'stone', { repeat: [0.5, 2], color: 0xb8b49f });
        }
        for (const z of [2.5, -7.75])
            this.bridge(z);
        for (const building of retroBuildings)
            this.building(building);
        this.hearth();
        this.market();
        this.waterfront();
        for (const [x, z] of retroTrees)
            this.tree(x, z);
        for (const [x, z] of retroBarrels)
            this.barrel(this.root, x, z);
        this.box(this.restored, [1.3, 4.06, -6.42], [5.65, 0.12, 1.25], 'awning', {
            repeat: [3, 1],
        });
        this.restored.children[0]?.rotation.set(-0.17, 0, 0);
        for (const x of [-1.3, 3.9]) {
            this.box(this.restored, [x, 2.05, -5.93], [0.12, 1.9, 0.12], 'wood');
            this.lantern(this.restored, x, 3.35, -6.1);
        }
        for (const x of [-0.7, 3.45]) {
            this.box(this.restored, [x, 1.8, -5.1], [0.35, 1.4, 0.36], 'wood');
            this.box(this.restored, [x, 2.08, -5.1], [1.3, 0.16, 0.19], 'wood');
            const head = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.22, 0.4, 6), this.material('wood'));
            head.position.set(x, 2.7, -5.1);
            head.castShadow = true;
            this.restored.add(head);
        }
        this.box(this.damaged, [-0.6, 3.98, -6.47], [1.8, 0.1, 1.1], 'awning', {
            repeat: [1, 1],
            color: 0x8a776a,
        });
        this.damaged.children[0]?.rotation.set(-0.17, 0, 0.09);
        this.root.add(this.restored, this.damaged, this.flames, this.smoke, this.fireLight);
    }
    material(kind, repeat = [1, 1], color = 0xffffff) {
        const texture = pixelTexture(kind);
        texture.repeat.set(...repeat);
        this.textures.push(texture);
        return new THREE.MeshLambertMaterial({ map: texture, color });
    }
    box(parent, point, size, kind, options = {}) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), this.material(kind, options.repeat, options.color));
        mesh.position.set(...point);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    }
    building(b) {
        const group = new THREE.Group();
        group.position.set(b.x, groundHeight(b), b.z);
        this.root.add(group);
        this.box(group, [0, b.height / 2, 0], [b.width, b.height, b.depth], 'plaster', { repeat: [2, 2], color: b.id === 'inn' ? 0xbb8b71 : 0xffefd4 });
        this.box(group, [0, 0.25, 0], [b.width + 0.12, 0.5, b.depth + 0.12], 'stone', { repeat: [3, 1], color: 0x958b77 });
        for (const x of [-b.width / 2, b.width / 2])
            this.box(group, [x, b.height / 2, b.depth / 2 + 0.03], [0.18, b.height, 0.12], 'wood', { repeat: [1, 2] });
        for (const h of [0.75, b.height - 0.24])
            this.box(group, [0, h, b.depth / 2 + 0.03], [b.width, 0.16, 0.12], 'wood', { repeat: [3, 1] });
        this.box(group, [0, 0.98, b.depth / 2 + 0.06], [0.98, 1.9, 0.13], 'wood', {
            repeat: [1, 2],
            color: 0x897553,
        });
        for (const x of [-1.45, 1.45].filter((x) => Math.abs(x) < b.width / 2 - 0.3)) {
            this.box(group, [x, 1.65, b.depth / 2 + 0.06], [0.8, 0.9, 0.12], 'wood');
            const windowMaterial = new THREE.MeshLambertMaterial({ color: 0x4b635d });
            const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.57, 0.66), windowMaterial);
            pane.position.set(x, 1.65, b.depth / 2 + 0.13);
            group.add(pane);
            this.box(group, [x, 1.65, b.depth / 2 + 0.15], [0.065, 0.66, 0.05], 'wood');
        }
        // 사선 지붕에 픽셀 기와 그림을 UV로 붙여 실제 기와 메시와 구별한다.
        const w = b.width / 2 + 0.45, d = b.depth / 2 + 0.38, h = b.height + 0.06, peak = h + 1.3;
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute([
            -w,
            h,
            d,
            w,
            h,
            d,
            w,
            peak,
            0,
            -w,
            h,
            d,
            w,
            peak,
            0,
            -w,
            peak,
            0,
            -w,
            peak,
            0,
            w,
            peak,
            0,
            w,
            h,
            -d,
            -w,
            peak,
            0,
            w,
            h,
            -d,
            -w,
            h,
            -d,
        ], 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute([
            0, 0, 3, 0, 3, 1.5, 0, 0, 3, 1.5, 0, 1.5, 0, 0, 3, 0, 3, 1.5, 0, 0, 3,
            1.5, 0, 1.5,
        ], 2));
        geometry.computeVertexNormals();
        const roof = new THREE.Mesh(geometry, this.material('roof'));
        roof.material.side = THREE.DoubleSide;
        roof.castShadow = true;
        roof.receiveShadow = true;
        group.add(roof);
        for (const x of [-w, w]) {
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute([x, h, d, x, peak, 0, x, h, -d], 3));
            g.computeVertexNormals();
            const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({
                color: 0x8b795f,
                side: THREE.DoubleSide,
            }));
            group.add(m);
        }
        this.box(group, [0, peak + 0.035, 0], [b.width + 1, 0.2, 0.22], 'roof', {
            repeat: [3, 1],
            color: 0xa39477,
        });
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.85), this.material('sign'));
        sign.position.set(0, 2.7, b.depth / 2 + 0.08);
        group.add(sign);
        if (b.id === 'workshop')
            this.box(group, [-1, 3.65, -0.8], [0.6, 2.2, 0.6], 'stone', {
                repeat: [1, 2],
            });
        if (b.id === 'inn') {
            this.box(group, [0, 2.65, b.depth / 2 + 0.06], [b.width, 0.15, 0.13], 'wood', { repeat: [3, 1] });
            for (const x of [-0.95, 0.95])
                this.lantern(group, x, 2.5, b.depth / 2 + 0.3);
        }
    }
    bridge(z) {
        this.box(this.root, [8, 0.26, z], [3.6, 0.28, 1.8], 'wood', {
            repeat: [4, 2],
            color: 0xa19173,
        });
        for (const side of [-0.82, 0.82]) {
            this.box(this.root, [8, 0.94, z + side], [3.6, 0.15, 0.13], 'wood', {
                repeat: [4, 1],
            });
            for (const x of [6.3, 7.4, 8.6, 9.7])
                this.box(this.root, [x, 0.66, z + side], [0.14, 0.9, 0.14], 'wood');
        }
    }
    hearth() {
        this.box(this.root, [-4.75, 0.74, 2.5], [1.3, 1.1, 1.3], 'stone', {
            repeat: [1, 1],
            color: 0xb87b5b,
        });
        this.box(this.root, [-4.75, 0.66, 3.17], [0.67, 0.62, 0.02], 'roof', {
            color: 0x31281f,
        });
        this.box(this.root, [-4.75, 1.55, 2.5], [1.05, 0.6, 1.05], 'stone', {
            color: 0xc59571,
        });
        for (let i = 0; i < 7; i++) {
            const flame = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.4 + (i % 3) * 0.18, 4), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffb96b : 0xc96538 }));
            flame.position.set(-4.98 + (i % 3) * 0.2, 1.97, 2.35 + Math.floor(i / 3) * 0.14);
            this.flames.add(flame);
        }
        for (let i = 0; i < 5; i++) {
            const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(0.25 + i * 0.07, 0), new THREE.MeshLambertMaterial({
                color: 0x9a9586,
                transparent: true,
                opacity: 0.27,
                depthWrite: false,
            }));
            this.smoke.add(puff);
        }
        this.fireLight.position.set(-4.75, 2, 2.5);
    }
    market() {
        this.box(this.root, [-7.2, 0.95, -1.7], [2.5, 0.16, 0.8], 'wood', {
            repeat: [2, 1],
        });
        for (const x of [-8.2, -6.2])
            this.box(this.root, [x, 0.59, -1.7], [0.15, 0.75, 0.55], 'wood');
        for (const x of [-7.9, -7.1, -6.3]) {
            const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.35, 6), this.material('wood'));
            basket.position.set(x, 1.2, -1.7);
            this.root.add(basket);
            for (let i = 0; i < 3; i++) {
                const crop = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 0), new THREE.MeshLambertMaterial({ color: i % 2 ? 0xcba06a : 0x758255 }));
                crop.position.set(x + (i - 1) * 0.14, 1.39, -1.7);
                this.root.add(crop);
            }
        }
        const awning = this.box(this.root, [-7.2, 2.5, -1.6], [3.1, 0.09, 1.4], 'awning', { repeat: [2, 1] });
        awning.rotation.x = -0.16;
        for (const x of [-8.55, -5.85])
            this.box(this.root, [x, 1.35, -1], [0.1, 2.3, 0.1], 'wood');
    }
    barrel(group, x, z) {
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.33, 0.8, 8), this.material('wood', [2, 1]));
        barrel.position.set(x, 0.6, z);
        barrel.castShadow = true;
        group.add(barrel);
        for (const y of [0.37, 0.84]) {
            const band = new THREE.Mesh(new THREE.CylinderGeometry(0.365, 0.365, 0.065, 8), new THREE.MeshLambertMaterial({ color: 0x696454 }));
            band.position.set(x, y, z);
            group.add(band);
        }
    }
    waterfront() {
        this.box(this.root, [10.5, 0.71, -9.2], [1.8, 0.15, 0.8], 'wood', {
            repeat: [2, 1],
        });
        for (const x of [9.85, 11.15])
            this.box(this.root, [x, 0.42, -9.2], [0.18, 0.45, 0.6], 'wood');
        this.box(this.root, [10.5, 1.05, -9.5], [1.8, 0.5, 0.12], 'wood', {
            repeat: [2, 1],
        });
        this.lantern(this.root, 10, 2.5, -9);
        this.box(this.root, [10, 1.2, -9], [0.14, 2, 0.14], 'wood');
        const boat = new THREE.Group();
        boat.position.set(8, 0.13, -1.9);
        boat.rotation.y = -0.08;
        this.box(boat, [0, 0, 0], [0.7, 0.18, 2.2], 'wood', { repeat: [1, 2] });
        for (const x of [-0.4, 0.4])
            this.box(boat, [x, 0.2, 0], [0.1, 0.4, 2.2], 'wood', { repeat: [1, 2] });
        const prow = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.65, 3), this.material('wood'));
        prow.rotation.x = Math.PI / 2;
        prow.position.set(0, 0.1, -1.32);
        boat.add(prow);
        this.box(boat, [0, 0.68, 0], [0.06, 1.4, 0.06], 'wood');
        this.root.add(boat);
    }
    lantern(group, x, y, z) {
        const glow = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.42, 0.28), new THREE.MeshLambertMaterial({ color: 0xe0b570, emissive: 0x5c351b }));
        glow.position.set(x, y, z);
        group.add(glow);
        for (const offset of [-0.24, 0.24])
            this.box(group, [x, y + offset, z], [0.36, 0.08, 0.36], 'wood');
    }
    tree(x, z) {
        this.box(this.root, [x, 0.85, z], [0.4, 1.3, 0.4], 'wood');
        for (let i = 0; i < 3; i++) {
            const leaves = new THREE.Mesh(new THREE.ConeGeometry(1.2 - i * 0.2, 1.7, 5), new THREE.MeshLambertMaterial({
                color: [0x61735b, 0x748065, 0x7b8669][i],
                flatShading: true,
            }));
            leaves.position.set(x, 1.5 + i * 0.75, z);
            leaves.castShadow = true;
            this.root.add(leaves);
        }
    }
    update(state, delta) {
        this.elapsed += delta;
        this.restored.visible = state.restored;
        this.damaged.visible = !state.restored;
        const active = state.fire > 0;
        this.flames.visible = active;
        this.smoke.visible = active;
        this.fireLight.intensity = active
            ? 8 + Math.sin(this.elapsed * 7) * 0.7
            : 0;
        this.flames.children.forEach((flame, i) => {
            flame.scale.y = 0.8 + Math.sin(this.elapsed * 9 + i) * 0.25;
        });
        this.smoke.children.forEach((puff, i) => {
            const t = (this.elapsed * 0.65 + i * 0.55) % 3;
            puff.position.set(-4.75 + Math.sin(i + t) * 0.15, 2.3 + t, 2.5);
            puff.scale.setScalar(0.7 + t * 0.4);
        });
        this.water.material.map?.offset.set(0, this.elapsed * 0.018);
    }
    dispose() {
        this.root.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                object.geometry.dispose();
                const materials = Array.isArray(object.material)
                    ? object.material
                    : [object.material];
                materials.forEach((m) => m.dispose());
            }
        });
        this.textures.forEach((t) => t.dispose());
        this.fireLight.dispose();
    }
}
