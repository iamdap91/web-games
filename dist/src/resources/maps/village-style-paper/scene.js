import * as THREE from 'three';
import { TrailSprite, trailMotions, } from '../../../games/tiger-rpg/trail-sprite.js';
import { SpriteTextures } from '../../../rendering/sprite-textures.js';
import { paperEntrance, paperHeight, paperHouses, paperPaths, paperPlaces, paperRules, } from './layout.js';
import { facadeArt, roofArt, signArt, treeArt, paperTexture, fibers, } from './paper-art.js';
export const paperCameraYaw = Math.atan2(10, 28);
/** 얇은 종이 면·접힌 지붕·책 수명과 화면 좌표를 소유한다. */
export class PaperScene {
    canvas;
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-16, 16, 10, -10, 0.1, 120);
    renderer;
    spriteTextures = new SpriteTextures();
    actor = new TrailSprite(new Map([...trailMotions('ai/tiger-hero', true)].filter(([name]) => /^(stand|move)(-(back|left|right))?$/.test(name))), this.spriteTextures, 30, 0.32);
    textures = new Set();
    before = new THREE.Group();
    after = new THREE.Group();
    flame = new THREE.Group();
    fireLight = new THREE.PointLight(0xffb548, 2, 5.5);
    flowers = [];
    smoke = [];
    target = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.31, 24), new THREE.MeshBasicMaterial({ color: 0xa35c49, side: THREE.DoubleSide }));
    raycaster = new THREE.Raycaster();
    floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), -paperRules.groundY);
    width = 1;
    height = 1;
    disposed = false;
    renderCount = 0;
    constructor(canvas) {
        this.canvas = canvas;
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            powerPreference: 'low-power',
        });
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.scene.background = new THREE.Color(0xd7c39c);
        const sun = new THREE.DirectionalLight(0xfff1d1, 2.4);
        sun.position.set(-15, 28, 14);
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        sun.shadow.normalBias = 0.025;
        Object.assign(sun.shadow.camera, {
            left: -22,
            right: 22,
            top: 22,
            bottom: -22,
            near: 1,
            far: 80,
        });
        this.scene.add(sun, new THREE.HemisphereLight(0xf7ecd5, 0x9d8060, 2));
        sun.layers.enableAll();
        this.scene.children.forEach((child) => child.layers.enableAll());
        this.camera.layers.enableAll();
        this.buildBook();
        this.buildVillage();
        this.scene.add(this.actor.mesh, this.actor.shadow, this.before, this.after, this.flame, this.fireLight, this.target);
        this.fireLight.position.set(-5.3, 1.1, 3.2);
        this.target.rotation.x = -Math.PI / 2;
        this.target.visible = false;
    }
    material(color, map) {
        if (map)
            this.textures.add(map);
        return new THREE.MeshStandardMaterial({
            color,
            map: map ?? null,
            roughness: 1,
            side: THREE.DoubleSide,
        });
    }
    box(parent, x, y, z, w, h, d, color) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this.material(color));
        mesh.position.set(x, y, z);
        mesh.castShadow = mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    }
    card(parent, texture, w, h, x, y, z) {
        const material = this.material(0xffffff, texture);
        material.alphaTest = 0.5;
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
        mesh.position.set(x, y, z);
        mesh.castShadow = mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    }
    line(parent, a, b, color = 0x725c43, radius = 0.024) {
        const difference = b.clone().sub(a);
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, difference.length(), 5), this.material(color));
        mesh.position.copy(a).add(b).multiplyScalar(0.5);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), difference.normalize());
        parent.add(mesh);
    }
    quad(parent, vertices, texture) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2));
        geometry.setIndex([0, 1, 2, 2, 1, 3]);
        geometry.computeVertexNormals();
        const mesh = new THREE.Mesh(geometry, this.material(0xffffff, texture));
        mesh.castShadow = mesh.receiveShadow = true;
        parent.add(mesh);
    }
    buildBook() {
        this.box(this.scene, 0, -1.15, 0, 44, 0.3, 46, 0xc6a779);
        this.box(this.scene, 0, -0.65, 0, 24.3, 0.9, 26.7, 0x736650);
        for (let i = 0; i < 7; i++)
            this.box(this.scene, 0, -0.25 + i * 0.033, 0, 23.8 - i * 0.035, 0.025, 26.2 - i * 0.05, i % 2 ? 0xd7c5a1 : 0xf4e5bf);
        const sheet = paperTexture(512, 512, (c, w, h) => {
            c.fillStyle = '#f7e8c8';
            c.fillRect(0, 0, w, h);
            fibers(c, w, h);
            c.strokeStyle = '#be9c7755';
            c.lineWidth = 2;
            c.strokeRect(10, 10, w - 20, h - 20);
        });
        for (const x of [-5.92, 5.92]) {
            const plane = this.card(this.scene, sheet, 11.82, 26.0, x, paperRules.groundY, 0);
            plane.rotation.x = -Math.PI / 2;
        }
        this.box(this.scene, 0, 0.055, 0, 0.1, 0.025, 26, 0xc5ae84);
        for (const x of [-0.09, 0.09])
            this.line(this.scene, new THREE.Vector3(x, 0.065, -12.9), new THREE.Vector3(x, 0.065, 12.9), 0xdbc7a3, 0.015);
        // 앞쪽 책장과 책갈피로 종이의 두께와 재료를 드러낸다.
        const bookmark = this.card(this.scene, signArt('종 이 골 목'), 4.6, 1.3, 4.6, 0.08, 11.55);
        bookmark.rotation.x = -Math.PI / 2;
        this.box(this.scene, 4.6, -0.04, 13.8, 1.3, 0.03, 2.4, 0xba6d57);
        for (const path of paperPaths)
            for (let i = 1; i < path.length; i++) {
                const a = path[i - 1], b = path[i];
                if (!a || !b)
                    continue;
                const distance = Math.hypot(b.x - a.x, b.z - a.z), count = Math.ceil(distance / 0.42);
                for (let j = 0; j < count; j++) {
                    const t = j / count, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
                    const dash = this.box(this.scene, x, paperHeight({ x, z }) + 0.014, z, 0.16, 0.014, 0.09, j % 3 ? 0xd4bb92 : 0xbba17d);
                    dash.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
                }
            }
    }
    house(house, parent, damaged = false) {
        const { x, z, width: w, depth: d, height: h } = house;
        const group = new THREE.Group();
        group.position.set(x, paperRules.groundY, z);
        parent.add(group);
        const shape = new THREE.Shape();
        shape.moveTo(-w / 2, 0);
        shape.lineTo(w / 2, 0);
        shape.lineTo(w / 2, h);
        shape.lineTo(0, h + 1.1);
        shape.lineTo(-w / 2, h);
        shape.closePath();
        const geometry = new THREE.ExtrudeGeometry(shape, {
            depth: 0.09,
            bevelEnabled: false,
        });
        const position = geometry.getAttribute('position'), uv = geometry.getAttribute('uv');
        for (let i = 0; i < position.count; i++)
            uv.setXY(i, (position.getX(i) + w / 2) / w, position.getY(i) / (h + 1.1));
        const facade = new THREE.Mesh(geometry, [
            this.material(0xffffff, facadeArt(house.color, house.kind, damaged)),
            this.material(0xfaf0d8),
        ]);
        facade.position.z = d / 2;
        facade.castShadow = facade.receiveShadow = true;
        group.add(facade);
        for (const side of [-1, 1]) {
            const wall = this.box(group, (side * w) / 2, h / 2, 0, 0.08, h, d, damaged ? 0xe0c69d : 0xefdfb9);
            wall.rotation.z = side * 0.015;
            this.line(group, new THREE.Vector3((side * w) / 2, 0.025, -d / 2), new THREE.Vector3((side * w) / 2, 0.025, d / 2), 0xfff3d4, 0.04);
            this.box(group, side * (w / 2 + 0.02), h * 0.55, -0.15, 0.04, 0.75, 0.7, 0x72938e);
            this.box(group, side * (w / 2 + 0.04), h * 0.55, -0.15, 0.045, 0.07, 0.7, 0xfff1c9);
        }
        this.box(group, 0, h / 2, -d / 2, w, h, 0.07, damaged ? 0xe0c69d : 0xefdfb9);
        const roofColor = house.kind === 'tea'
            ? '#ba5748'
            : house.kind === 'books'
                ? '#507e94'
                : house.kind === 'sew'
                    ? '#b9a142'
                    : house.kind === 'dojo'
                        ? '#bb4d40'
                        : '#8c7962';
        const roof = roofArt(roofColor, damaged);
        for (const side of [-1, 1]) {
            const edge = side * (w / 2 + 0.2), front = d / 2 + 0.23, back = -d / 2 - 0.2;
            this.quad(group, [
                edge,
                h - 0.05,
                front,
                edge,
                h - 0.05,
                back,
                0,
                h + 1.13,
                front,
                0,
                h + 1.13,
                back,
            ], roof);
            this.line(group, new THREE.Vector3(edge, h - 0.05, front), new THREE.Vector3(edge, h - 0.05, back), 0xffedd0, 0.06);
        }
        this.line(group, new THREE.Vector3(0, h + 1.16, -d / 2 - 0.2), new THREE.Vector3(0, h + 1.16, d / 2 + 0.23), 0xf5dfb3, 0.065);
        for (const tabX of [-w / 2, w / 2]) {
            const tab = this.box(group, tabX, 0.025, d / 2 + 0.17, 0.5, 0.045, 0.5, 0xfff4db);
            tab.rotation.y = 0.08;
        }
        // 간판은 카메라를 따라 돌리지 않고 건물 로컬 앞면에 붙인다.
        this.card(group, signArt(house.name), Math.min(w * 0.75, 2.5), 0.66, 0, h * 0.59, d / 2 + 0.13);
        if (house.kind === 'dojo') {
            if (damaged) {
                this.box(group, -1.4, 0.35, d / 2 + 0.1, 1.3, 0.12, 0.6, 0xae8d6a).rotation.z = -0.3;
            }
            else {
                for (const xx of [-2, 2]) {
                    this.box(group, xx, 1.0, d / 2 + 0.18, 0.035, 1.8, 0.04, 0x665240);
                    const lantern = this.card(group, signArt('✦'), 0.5, 0.6, xx, 1.45, d / 2 + 0.2);
                    lantern.material.emissive.set(0xb58037);
                    lantern.material.emissiveIntensity = 0.32;
                }
                this.box(group, -1.4, 0.45, d / 2 + 0.1, 0.06, 0.65, 0.06, 0x6b5944);
                this.box(group, -1.4, 0.8, d / 2 + 0.1, 0.95, 0.06, 0.06, 0x6b5944);
            }
        }
    }
    paperTree(x, z, scale, color, flowers = false) {
        const group = new THREE.Group();
        group.position.set(x, paperRules.groundY, z);
        this.scene.add(group);
        const texture = treeArt(color, flowers);
        for (const yaw of [-0.1, 0.9]) {
            const card = this.card(group, texture, 2.2 * scale, 3.4 * scale, 0, 1.7 * scale, 0);
            card.rotation.y = yaw;
        }
        this.box(group, 0, 0.03, 0, 0.6 * scale, 0.05, 0.5, 0xfff4db);
        if (flowers)
            this.flowers.push(group);
    }
    buildVillage() {
        for (const house of paperHouses) {
            if (house.kind === 'dojo') {
                this.house(house, this.before, true);
                this.house(house, this.after);
            }
            else
                this.house(house, this.scene);
        }
        this.quad(this.scene, [-1.5, 0.06, -3, 3.5, 0.06, -3, -1.5, 0.36, -3.9, 3.5, 0.36, -3.9], roofArt('#cfb18a', false));
        this.box(this.scene, 1, 0.205, -4.25, 5, 0.31, 0.7, 0xe9cf9b);
        this.box(this.scene, -5.3, 0.42, 3.2, 1.1, 0.65, 1.0, 0xbb9e76);
        this.box(this.scene, -5.3, 0.76, 3.2, 1.05, 0.07, 0.96, 0x695543);
        for (const [i, color] of [0xf5ae39, 0xce663b, 0xf6d77b].entries()) {
            const shape = new THREE.Shape();
            shape.moveTo(-0.25, 0);
            shape.quadraticCurveTo(-0.65, 0.45, -0.16, 1.25);
            shape.lineTo(0.12, 0.65);
            shape.quadraticCurveTo(0.6, 0.45, 0.25, 0);
            shape.closePath();
            const flame = new THREE.Mesh(new THREE.ShapeGeometry(shape), this.material(color));
            flame.position.set((i - 1) * 0.17, i * 0.08, 0);
            flame.rotation.y = (i - 1) * 0.6;
            this.flame.add(flame);
        }
        this.flame.position.set(-5.3, 0.82, 3.2);
        for (let i = 0; i < 4; i++) {
            const puff = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.18, 18), new THREE.MeshBasicMaterial({
                color: 0x9b8b6d,
                transparent: true,
                opacity: 0.38,
                depthWrite: false,
                side: THREE.DoubleSide,
            }));
            this.scene.add(puff);
            this.smoke.push(puff);
        }
        for (const [x, z, s, color, flower] of [
            [-9.3, 8.8, 1.1, '#b7af68', false],
            [-9.9, -7.8, 1.2, '#8ba898', false],
            [-2.4, -10.2, 1.0, '#b8a363', false],
            [2.8, -10.2, 1.1, '#bd9b67', false],
            [9.3, -8.7, 1.1, '#85a693', true],
            [8.6, -5.4, 0.72, '#98aa7b', true],
            [4.8, -7.8, 0.58, '#b6b07c', true],
            [9.7, 7.9, 0.8, '#9da47d', false],
            [-8.6, 4.9, 0.65, '#b7a45d', false],
        ])
            this.paperTree(x, z, s, color, flower);
        // 종이 벤치는 좌판을 접고 등받이만 별도 면으로 세운다.
        this.box(this.scene, 8.1, 0.5, -6.9, 1.6, 0.045, 0.6, 0xd69c74);
        this.box(this.scene, 8.1, 0.9, -7.2, 1.6, 0.8, 0.045, 0xdbad80);
        for (const x of [7.5, 8.7])
            this.box(this.scene, x, 0.28, -6.9, 0.035, 0.5, 0.5, 0xe2bd93);
        for (let i = 0; i < 9; i++) {
            const x = -3.3 + i * 0.75, y = 4.2 - Math.sin((i / 8) * Math.PI) * 0.6, z = -1.15;
            const shape = new THREE.Shape();
            shape.moveTo(-0.21, 0);
            shape.lineTo(0.21, 0);
            shape.lineTo(0, -0.5);
            shape.closePath();
            const flag = new THREE.Mesh(new THREE.ShapeGeometry(shape), this.material([0xc56e53, 0x6595a2, 0xd1ae52][i % 3] ?? 0xc56e53));
            flag.position.set(x, y, z);
            flag.castShadow = true;
            this.scene.add(flag);
            if (i)
                this.line(this.scene, new THREE.Vector3(x - 0.75, 4.2 - Math.sin(((i - 1) / 8) * Math.PI) * 0.6, z), new THREE.Vector3(x, y, z), 0x6a5948, 0.015);
        }
        const directions = this.card(this.scene, signArt('골 목 →'), 1.6, 0.48, 2.1, 0.83, 7.65);
        directions.rotation.y = -0.3;
        this.box(this.scene, 2.1, 0.45, 7.65, 0.05, 0.85, 0.08, 0x826953);
        for (let i = 0; i < 8; i++) {
            this.box(this.scene, -6.9 + i * 0.22, 0.46, 2.1, 0.11, 0.66, 0.25, [0xbb7258, 0x698591, 0xd0af57][i % 3] ?? 0xbb7258);
        }
        const welcome = this.card(this.scene, signArt('접어서 만든 작은 마을'), 4.2, 0.58, -4.1, 0.07, 10.4);
        welcome.rotation.x = -Math.PI / 2;
    }
    async load() {
        await this.spriteTextures.load(new Set([...this.actor.motions.values()].flatMap((animation) => animation.frames.map((frame) => frame.localPath))), '승인된 아타호 보행 그림을 불러오지 못했어요.');
    }
    render(state, delta, overview) {
        if (this.disposed)
            return;
        this.resize();
        this.renderCount++;
        const aspect = this.width / this.height;
        const half = overview ? Math.max(13.6, 17 / aspect) : aspect < 1 ? 8 : 10.7;
        Object.assign(this.camera, {
            left: -half * aspect,
            right: half * aspect,
            top: half,
            bottom: -half,
        });
        this.camera.updateProjectionMatrix();
        const follow = !overview && aspect < 1;
        const cx = follow ? state.player.x * 0.72 : 0, cz = follow ? state.player.z * 0.72 - 1.2 : 0;
        this.camera.position.set(cx + 10, 22, cz + 28);
        this.camera.lookAt(cx, 0.7, cz);
        this.camera.updateMatrixWorld();
        const suffix = state.player.facing === 'front' ? '' : `-${state.player.facing}`;
        this.actor.update(state.player, `${state.player.moving ? 'move' : 'stand'}${suffix}`, delta);
        this.actor.mesh.rotation.set(0, paperCameraYaw, 0);
        this.actor.mesh.scale.y =
            Math.hypot(Math.hypot(10, 28), 21.3) / Math.hypot(10, 28);
        this.actor.mesh.position.y = state.player.y + 0.035;
        this.actor.shadow.position.y = state.player.y + 0.02;
        this.before.visible = !state.restored;
        this.after.visible = state.restored;
        const seconds = state.elapsed;
        this.flame.scale.setScalar((state.fire > 0 ? 1 : 0.38) * (1 + Math.sin(seconds * 13) * 0.065));
        this.fireLight.intensity =
            state.fire > 0 ? 5 + Math.sin(seconds * 17) * 0.7 : 0.6;
        this.smoke.forEach((puff, i) => {
            const phase = (seconds * 0.3 + i / 4) % 1;
            puff.position.set(-5.3 + phase * 0.5, 1.2 + phase * 2.3, 3.2);
            puff.rotation.set(0, paperCameraYaw, Math.sin(seconds + i) * 0.12);
            puff.scale.setScalar(0.6 + phase * 1.8);
            puff.material.opacity = (state.fire > 0 ? 0.4 : 0.07) * (1 - phase);
        });
        this.flowers.forEach((group, i) => {
            group.rotation.z = Math.sin(seconds * 0.9 + i) * 0.027;
        });
        this.renderer.render(this.scene, this.camera);
    }
    resize() {
        const bounds = this.canvas.getBoundingClientRect();
        this.width = Math.max(1, bounds.width);
        this.height = Math.max(1, bounds.height);
        const ratio = Math.min(1.5, window.devicePixelRatio || 1), width = Math.floor(this.width * ratio), height = Math.floor(this.height * ratio);
        if (this.canvas.width !== width || this.canvas.height !== height)
            this.renderer.setSize(width, height, false);
    }
    pick(clientX, clientY) {
        const bounds = this.canvas.getBoundingClientRect();
        this.raycaster.setFromCamera(new THREE.Vector2(((clientX - bounds.left) / bounds.width) * 2 - 1, 1 - ((clientY - bounds.top) / bounds.height) * 2), this.camera);
        const hit = this.raycaster.ray.intersectPlane(this.floor, new THREE.Vector3());
        if (!hit)
            return null;
        // 경사로에서도 높이 함수를 역으로 따라가 화면 입력과 발 위치를 일치시킨다.
        let high = this.raycaster.ray.origin.distanceTo(hit);
        let low = Math.max(0, high - 2);
        for (let i = 0; i < 24; i++) {
            const middle = (low + high) / 2;
            const point = this.raycaster.ray.at(middle, new THREE.Vector3());
            if (point.y > paperHeight({ x: point.x, z: point.z }))
                low = middle;
            else
                high = middle;
        }
        const corrected = this.raycaster.ray.at((low + high) / 2, new THREE.Vector3());
        return { x: corrected.x, z: corrected.z };
    }
    mark(point) {
        this.target.visible = !!point;
        if (point)
            this.target.position.set(point.x, paperHeight(point) + 0.028, point.z);
    }
    project(point) {
        const projected = new THREE.Vector3(point.x, paperHeight(point), point.z).project(this.camera);
        return {
            x: ((projected.x + 1) * this.width) / 2,
            y: ((1 - projected.y) * this.height) / 2,
        };
    }
    get screenPositions() {
        return [...paperPlaces, { id: 'entrance', ...paperEntrance }].map((place) => ({
            id: place.id,
            world: { x: place.x, z: place.z },
            screen: this.project(place),
        }));
    }
    get diagnostics() {
        return {
            renderCount: this.renderCount,
            actorY: this.actor.mesh.position.y,
            actorWidth: this.actor.mesh.geometry.parameters.width,
            actorHeight: this.actor.mesh.geometry.parameters.height,
            pixelWidth: this.canvas.width,
            pixelHeight: this.canvas.height,
            yaw: paperCameraYaw,
        };
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.scene.remove(this.actor.mesh, this.actor.shadow);
        this.actor.dispose();
        this.spriteTextures.dispose();
        const geometries = new Set(), materials = new Set();
        this.scene.traverse((object) => {
            if (object instanceof THREE.DirectionalLight)
                object.dispose();
            if (object instanceof THREE.Mesh) {
                geometries.add(object.geometry);
                const list = Array.isArray(object.material)
                    ? object.material
                    : [object.material];
                list.forEach((material) => materials.add(material));
            }
        });
        for (const texture of this.textures)
            texture.dispose();
        for (const geometry of geometries)
            geometry.dispose();
        for (const material of materials)
            material.dispose();
        this.renderer.dispose();
        this.renderer.forceContextLoss();
    }
}
