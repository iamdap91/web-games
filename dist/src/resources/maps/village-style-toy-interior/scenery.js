import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { groundHeight, pathDistance, toyBenches, toyBuildings, toyTrees, } from './layout.js';
import { roomFurniture, toyRoom, toyWalkHeight } from './interior.js';
/** 매끈한 모형 건축과 같은 조명을 받는 부착물·생활 소품의 GPU 수명을 소유한다. */
export class ToyScenery {
    root = new THREE.Group();
    repaired = new THREE.Group();
    faded = new THREE.Group();
    flames = [];
    smoke = [];
    textures = [];
    light = new THREE.PointLight(0xffc263, 0, 6, 2);
    time = 0;
    roomCover = new THREE.Group();
    roomFront = new THREE.Group();
    kettleSteam = new THREE.Group();
    constructor() {
        this.land();
        this.root.add(this.roomCover, this.roomFront, this.kettleSteam);
        for (const b of toyBuildings)
            this.house(b.x, b.z, b.width, b.depth, b.color, b.x === 0);
        for (const [x, z, s] of toyTrees)
            this.tree(x, z, s);
        this.well();
        this.hearth();
        this.rest();
        this.pond();
        this.gate();
        this.flowers();
        for (const b of toyBenches)
            this.bench(b.x, b.z, b.width, b.depth, b.color);
        this.root.add(this.repaired, this.faded, this.light);
        this.light.position.set(-6.3, 1.6, 2.2);
    }
    material(color) {
        return new THREE.MeshStandardMaterial({
            color,
            roughness: 0.53,
            metalness: 0,
        });
    }
    mesh(geometry, color, x, y, z, parent = this.root) {
        const mesh = new THREE.Mesh(geometry, this.material(color));
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    }
    round(x, y, z, w, h, d, color, parent = this.root) {
        return this.mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(w, h, d) * 0.22), color, x, y, z, parent);
    }
    sphere(x, y, z, r, color, parent = this.root) {
        return this.mesh(new THREE.SphereGeometry(r, 24, 16), color, x, y, z, parent);
    }
    cylinder(x, y, z, r, h, color, parent = this.root) {
        return this.mesh(new THREE.CylinderGeometry(r, r, h, 24), color, x, y, z, parent);
    }
    land() {
        const geometry = new THREE.PlaneGeometry(26, 26, 96, 96);
        geometry.rotateX(-Math.PI / 2);
        const pos = geometry.getAttribute('position'), colors = [];
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i), z = pos.getZ(i);
            pos.setY(i, groundHeight({ x, z }));
            const path = pathDistance({ x, z });
            const color = new THREE.Color(0xe4cda1).lerp(new THREE.Color(0x96ba85), THREE.MathUtils.smoothstep(path, 0.8, 1.18));
            colors.push(color.r, color.g, color.b);
        }
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.computeVertexNormals();
        const terrain = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 }));
        terrain.receiveShadow = true;
        this.root.add(terrain);
        this.round(0, -0.42, 0, 26.2, 0.95, 26.2, 0x789774);
        const base = this.mesh(new THREE.PlaneGeometry(200, 200), 0xeee1c9, 0, -1, 0);
        base.rotation.x = -Math.PI / 2;
        base.castShadow = false;
    }
    house(x, z, w, d, roofColor, dojo) {
        const parent = new THREE.Group();
        parent.position.set(x, groundHeight({ x, z }), z);
        this.root.add(parent);
        this.round(0, 0.13, 0, w + 0.35, 0.26, d + 0.4, 0xd9cabb, parent);
        if (dojo) {
            this.round(-w / 2, 1.45, 0, 0.18, 2.65, d, 0xf4ead2, parent);
            this.round(w / 2, 1.45, 0, 0.18, 2.65, d, 0xf4ead2, parent);
            this.round(0, 1.45, -d / 2, w, 2.65, 0.18, 0xf4ead2, parent);
            // 창과 문은 실제 빈 구멍이며 실내 소품을 복제하지 않는다.
            for (const side of [-1, 1]) {
                this.round(x + side * 1.5, groundHeight(toyRoom) + 0.42, z + d / 2, 1.65, 0.65, 0.16, 0xf4ead2, this.roomFront);
                this.round(x + side * 1.5, groundHeight(toyRoom) + 2.28, z + d / 2, 1.65, 0.9, 0.16, 0xf4ead2, this.roomFront);
            }
            for (const px of [-2.5, -0.7, 0.7, 2.5])
                this.round(px, groundHeight(toyRoom) + 1.45, z + d / 2, 0.18, 2.65, 0.18, 0xbfa482, this.roomFront);
            for (let i = 0; i < 8; i++) {
                const p = { x: 0, z: -3.1 - i * 0.0875 };
                this.round(0, toyWalkHeight(p) - 0.04, p.z, 1, 0.08, 0.105, 0xd9cabb);
            }
            for (const b of roomFurniture)
                this.round(b.x, groundHeight(toyRoom) + 0.48, b.z, b.width, 0.75, b.depth, 0xbfa482);
            this.sphere(-1.25, groundHeight(toyRoom) + 1.02, -5.25, 0.22, 0x617d83);
            this.cylinder(-1.25, groundHeight(toyRoom) + 1.21, -5.25, 0.14, 0.08, 0x688991);
            for (let i = 0; i < 3; i++)
                this.sphere(-1.25, 1.4 + i * 0.2, -5.25, 0.08, 0xfff3d8, this.kettleSteam);
        }
        else
            this.round(0, 1.45, 0, w, 2.65, d, 0xffefd7, parent);
        for (const px of [-w * 0.38, w * 0.38])
            this.round(px, 1.4, d / 2 + 0.03, 0.14, 2.65, 0.18, 0xbfa482, parent);
        if (!dojo)
            this.round(0, 1.03, d / 2 + 0.075, 0.82, 1.92, 0.13, 0x92765d, parent);
        if (!dojo)
            this.round(0, 1.15, d / 2 + 0.15, 0.5, 1.48, 0.045, 0xd1b792, parent);
        if (!dojo)
            this.sphere(0.21, 1.0, d / 2 + 0.18, 0.055, 0xe5ca8b, parent);
        for (const px of dojo ? [] : [-w * 0.3, w * 0.3]) {
            this.round(px, 1.62, d / 2 + 0.12, 0.68, 0.77, 0.16, 0xbb9874, parent);
            this.round(px, 1.62, d / 2 + 0.22, 0.51, 0.6, 0.06, 0x9dc9ce, parent);
            this.round(px, 1.62, d / 2 + 0.26, 0.055, 0.6, 0.04, 0xece6d3, parent);
        }
        this.sign(dojo ? this.roomFront : parent, 0, dojo ? groundHeight(toyRoom) + 2.48 : 2.48, dojo ? z + d / 2 + 0.17 : d / 2 + 0.17, dojo ? '동글 도장' : '공방', dojo ? 1.75 : 1.13);
        const roof = (color, target) => {
            const dome = this.mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), color, x, groundHeight({ x, z }) + 2.72, z, target);
            dome.scale.set(w * 0.64, dojo ? 1.42 : 1.18, d * 0.73);
            const eave = this.cylinder(x, groundHeight({ x, z }) + 2.72, z, 1, 0.16, color, target);
            eave.scale.set(w * 0.65, 1, d * 0.74);
        };
        if (dojo) {
            roof(0x8ebebc, this.roomCover);
            for (const px of [-2.25, 2.25])
                this.pot(px, -2.9, 0xeebd79, this.repaired);
            this.dummy(3.5, -2.5);
            for (const px of [-2.15, 2.15]) {
                this.cylinder(px, 2.05, -3.4, 0.22, 0.46, 0xffcf8d, this.repaired);
                this.round(px, 2.33, -3.4, 0.48, 0.13, 0.48, 0xb49e74, this.repaired);
            }
        }
        else
            roof(roofColor, this.root);
    }
    sign(parent, x, y, z, text, width) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 72;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        ctx.fillStyle = '#78999b';
        ctx.fillRect(0, 0, 256, 72);
        ctx.fillStyle = '#fff3d9';
        ctx.font = 'bold 34px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 128, 38);
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        this.textures.push(texture);
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(width, (width * 72) / 256), new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.7,
            polygonOffset: true,
            polygonOffsetFactor: -1,
        }));
        sign.position.set(x, y, z);
        parent.add(sign);
    }
    tree(x, z, s) {
        const y = groundHeight({ x, z });
        this.cylinder(x, y + 0.7 * s, z, 0.18 * s, 1.4 * s, 0xb09070);
        const crown = this.sphere(x, y + 2.15 * s, z, 1.04 * s, 0x6a9b78);
        crown.scale.set(1, 1.1, 1);
        const top = this.sphere(x - 0.35 * s, y + 2.65 * s, z - 0.1, 0.69 * s, 0x88b287);
        top.scale.y = 0.8;
        for (const [dx, dz] of [
            [0.48, 0.6],
            [-0.6, 0.35],
        ]) {
            if (dx === undefined || dz === undefined)
                continue;
            this.sphere(x + dx * s, y + 1.75 * s, z + dz * s, 0.48 * s, 0x7ca880);
        }
    }
    well() {
        const x = 0, z = 1.5, y = groundHeight({ x, z });
        this.cylinder(x, y + 0.24, z, 1.08, 0.48, 0xd5c4a9);
        this.cylinder(x, y + 0.5, z, 0.85, 0.1, 0x739ca7);
        const ring = this.mesh(new THREE.TorusGeometry(0.92, 0.17, 12, 40), 0xe9d8b8, x, y + 0.52, z);
        ring.rotation.x = Math.PI / 2;
        for (const dx of [-0.79, 0.79])
            this.cylinder(x + dx, y + 1.35, z, 0.09, 1.8, 0xb68e6c);
        this.round(x, y + 2.26, z, 2.1, 0.16, 0.22, 0xb68e6c);
        const roof = this.sphere(x, y + 2.32, z, 1.1, 0xe5ad87);
        roof.scale.set(1, 0.35, 0.82);
        this.cylinder(0.45, y + 0.78, z + 0.35, 0.15, 0.32, 0xa2bec0);
    }
    hearth() {
        const x = -6.3, z = 2.2, y = groundHeight({ x, z });
        this.cylinder(x, y + 0.15, z, 0.68, 0.3, 0xcdbea7);
        const logs = this.round(x, y + 0.28, z, 0.82, 0.18, 0.23, 0xa98766);
        logs.rotation.y = 0.5;
        const kettle = this.sphere(x, y + 0.8, z, 0.33, 0x617d83);
        kettle.scale.y = 0.8;
        this.cylinder(x, y + 1.04, z, 0.2, 0.075, 0x688991);
        for (let i = 0; i < 4; i++) {
            const flame = this.sphere(x + Math.sin(i * 2) * 0.15, y + 0.48, z + Math.cos(i * 2) * 0.15, 0.16, i % 2 ? 0xffca67 : 0xf69a58);
            flame.scale.y = 2;
            flame.castShadow = false;
            this.flames.push(flame);
            const smoke = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 10), new THREE.MeshBasicMaterial({
                color: 0xfff3d8,
                transparent: true,
                opacity: 0.38,
                depthWrite: false,
            }));
            this.root.add(smoke);
            this.smoke.push(smoke);
        }
    }
    rest() {
        const x = 7.5, z = -6, y = groundHeight({ x, z });
        this.cylinder(x - 1.4, y + 0.3, z - 0.2, 0.17, 0.6, 0x92b6b2);
        this.sphere(x - 1.4, y + 0.74, z - 0.2, 0.29, 0xf2c975);
        this.pot(9, -7.8, 0xe9ba89);
    }
    bench(x, z, width, depth, color) {
        const y = groundHeight({ x, z });
        this.round(x, y + 0.4, z, width, 0.17, depth, color);
        for (const dx of [-width * 0.33, width * 0.33])
            this.round(x + dx, y + 0.18, z, 0.15, 0.4, depth * 0.7, 0xcfa985);
        this.round(x, y + 0.8, z - depth * 0.5, width, 0.6, 0.14, color);
    }
    pond() {
        const x = -4, z = -9, y = groundHeight({ x, z });
        const basin = this.sphere(x, y - 0.12, z, 1, 0xcbbd9c);
        basin.scale.set(2.8, 0.22, 1.8);
        const water = this.mesh(new THREE.CircleGeometry(1, 48), 0x83bfc1, x, y + 0.045, z);
        water.rotation.x = -Math.PI / 2;
        water.scale.set(2.5, 1.45, 1);
        water.castShadow = false;
        for (let i = 0; i < 5; i++) {
            const pebble = this.sphere(x + Math.cos(i * 1.6) * 2.5, y + 0.08, z + Math.sin(i * 1.6) * 1.6, 0.25, 0xd8c9af);
            pebble.scale.y = 0.45;
        }
    }
    gate() {
        for (const x of [-1.25, 1.25])
            this.round(x, 0.88, 11.6, 0.22, 1.45, 0.25, 0xc9a883);
        this.round(0, 1.62, 11.6, 2.85, 0.22, 0.35, 0xe2ba94);
        this.round(0, 1.72, 11.6, 2.9, 0.22, 0.64, 0x91bcb5);
    }
    pot(x, z, color, parent = this.root) {
        const y = groundHeight({ x, z });
        this.mesh(new THREE.CylinderGeometry(0.28, 0.2, 0.5, 20), color, x, y + 0.25, z, parent);
        for (const dx of [-0.16, 0.1]) {
            const leaf = this.sphere(x + dx, y + 0.75, z, 0.21, 0x75a184, parent);
            leaf.scale.set(0.7, 1.8, 0.5);
        }
    }
    dummy(x, z) {
        const y = groundHeight({ x, z });
        this.cylinder(x, y + 0.7, z, 0.17, 1.4, 0xbd9773, this.repaired);
        this.sphere(x, y + 1.54, z, 0.22, 0xd4ac84, this.repaired);
        this.round(x, y + 1, z, 1.1, 0.13, 0.17, 0xbd9773, this.repaired);
        this.cylinder(x, y + 0.1, z, 0.43, 0.2, 0xcfbea0, this.repaired);
    }
    flowers() {
        for (let i = 0; i < 18; i++) {
            const x = -11 + ((i * 7) % 21), z = -11 + ((i * 11) % 22);
            if (pathDistance({ x, z }) < 1.5 ||
                toyBuildings.some((b) => Math.hypot(x - b.x, z - b.z) < 4))
                continue;
            const y = groundHeight({ x, z });
            this.cylinder(x, y + 0.17, z, 0.04, 0.33, 0x729670);
            const flower = this.sphere(x, y + 0.36, z, 0.11, i % 2 ? 0xf0d79a : 0xe8afaa);
            flower.scale.y = 0.65;
        }
    }
    update(state, delta) {
        this.time += delta;
        this.roomCover.visible = !state.inside;
        this.roomCover.traverse((n) => {
            if (n instanceof THREE.Mesh &&
                n.material instanceof THREE.MeshStandardMaterial)
                n.material.color.setHex(state.restored ? 0x8ebebc : 0xb5b7aa);
        });
        this.roomFront.visible = !state.inside;
        this.kettleSteam.children.forEach((steam, i) => {
            const phase = (state.elapsed * 0.35 + i / 3) % 1;
            steam.position.y = 1.4 + phase * 0.75;
            steam.scale.setScalar(0.5 + phase);
        });
        this.repaired.visible = state.restored;
        this.faded.visible = !state.restored;
        this.light.intensity = state.fire > 0 ? 5 : 0;
        this.flames.forEach((flame, i) => {
            flame.visible = state.fire > 0;
            flame.scale.y = 1.8 + Math.sin(this.time * 7 + i) * 0.4;
        });
        this.smoke.forEach((smoke, i) => {
            smoke.visible = state.fire > 0;
            const p = (this.time * 0.4 + i * 0.23) % 1;
            smoke.position.set(-6.3 + p * 0.25, 1.4 + p * 1.4, 2.2);
            smoke.scale.setScalar(0.4 + p);
        });
    }
    get roomOpen() {
        return !this.roomCover.visible && !this.roomFront.visible;
    }
    dispose() {
        const geometries = new Set(), materials = new Set();
        this.root.traverse((n) => {
            if (n instanceof THREE.Mesh) {
                geometries.add(n.geometry);
                for (const m of Array.isArray(n.material) ? n.material : [n.material])
                    materials.add(m);
            }
        });
        geometries.forEach((g) => g.dispose());
        materials.forEach((m) => m.dispose());
        this.textures.forEach((t) => t.dispose());
        this.root.clear();
    }
}
