import * as THREE from 'three';
import { TrailSprite, trailMotions, } from '../../../games/tiger-rpg/trail-sprite.js';
import { SpriteTextures } from '../../../rendering/sprite-textures.js';
import { pixelArt } from './pixel-art.js';
import { villageHeight, villageTerrain, } from './visit.js';
/** 건물 기단과 실제 계단 위에 고정된 픽셀 면을 배치하는 독립 장면. */
export class Hd2dVillageScene {
    canvas;
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-20, 20, 12, -12, 0.1, 150);
    renderer;
    terrain = [];
    raycaster = new THREE.Raycaster();
    dojoBefore = new THREE.Group();
    dojoAfter = new THREE.Group();
    spriteTextures = new SpriteTextures();
    actor = new TrailSprite(new Map([...trailMotions('ai/tiger-hero', true)].filter(([key]) => [
        'stand',
        'stand-back',
        'stand-left',
        'stand-right',
        'move',
        'move-back',
        'move-left',
        'move-right',
    ].includes(key))), this.spriteTextures, 30, 0.4, 'frame-pivot');
    fireLight = new THREE.PointLight(0xffa149, 0, 7, 1.7);
    flame = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.45), new THREE.MeshBasicMaterial({
        map: pixelArt('flame'),
        alphaTest: 0.25,
        side: THREE.DoubleSide,
        color: 0xffddab,
    }));
    smoke = [];
    waterLines = [];
    materials = new Map();
    textures = new Set();
    marker = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.34, 24), new THREE.MeshBasicMaterial({
        color: 0xffdf98,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        depthWrite: false,
    }));
    aspect = 1.6;
    disposed = false;
    lastAnimationTime = 0;
    constructor(canvas) {
        this.canvas = canvas;
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: false,
            alpha: false,
        });
        this.renderer.setPixelRatio(1);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.25;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.scene.background = new THREE.Color(0x253e43);
        this.scene.fog = new THREE.FogExp2(0x354e48, 0.016);
        this.scene.add(new THREE.HemisphereLight(0xd8dcc6, 0x34413a, 1.4));
        const sun = new THREE.DirectionalLight(0xffd79a, 2.9);
        sun.position.set(-10, 18, 10);
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        sun.shadow.camera.left = -21;
        sun.shadow.camera.right = 21;
        sun.shadow.camera.top = 21;
        sun.shadow.camera.bottom = -21;
        sun.shadow.camera.far = 65;
        sun.shadow.bias = -0.001;
        sun.shadow.normalBias = 0.045;
        this.scene.add(sun);
        this.scene.add(this.dojoBefore, this.dojoAfter, this.actor.mesh, this.actor.shadow, this.flame, this.fireLight, this.marker);
        this.actor.shadow.scale.y = 0.58;
        this.camera.layers.enableAll();
        this.marker.rotation.x = -Math.PI / 2;
        this.marker.visible = false;
        this.flame.position.set(-4.6, 0.9, 3.5);
        this.fireLight.position.set(-4.6, 1.1, 3.5);
        this.buildTown();
        this.resize();
    }
    material(kind, options = {}) {
        const key = `${kind}-${String(options.damaged)}-${options.title ?? ''}`;
        const existing = this.materials.get(key);
        if (existing)
            return existing;
        const texture = pixelArt(kind, options);
        if (kind === 'roof' || kind === 'ground' || kind === 'grass')
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        this.textures.add(texture);
        const material = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 1,
            metalness: 0,
            side: THREE.DoubleSide,
            alphaTest: kind === 'leaves' || kind === 'sign' || kind === 'window' ? 0.4 : 0,
        });
        this.materials.set(key, material);
        return material;
    }
    box(parent, x, y, z, w, h, d, material) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof material === 'number'
            ? new THREE.MeshStandardMaterial({ color: material, roughness: 1 })
            : material);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    }
    ground(x, z, w, d, y) {
        const texture = pixelArt('ground');
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(w / 4, d / 4);
        this.textures.add(texture);
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: texture, roughness: 1 }));
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(x, y, z);
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        this.terrain.push(mesh);
    }
    fixedCard(parent, kind, x, y, z, w, h, options = {}) {
        const material = this.material(kind, options).clone();
        material.polygonOffset = true;
        material.polygonOffsetFactor = -1;
        material.polygonOffsetUnits = -1;
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    }
    roof(parent, w, d, y, damaged) {
        const ridge = y + 1.65;
        for (const side of [-1, 1]) {
            const segments = damaged && side === 1
                ? [
                    [-w / 2 - 0.38, -0.55],
                    [0.85, w / 2 + 0.38],
                ]
                : [[-w / 2 - 0.38, w / 2 + 0.38]];
            for (const [left, right] of segments) {
                if (left === undefined || right === undefined)
                    continue;
                const geometry = new THREE.BufferGeometry();
                geometry.setAttribute('position', new THREE.Float32BufferAttribute([
                    left,
                    y,
                    side * (d / 2 + 0.5),
                    right,
                    y,
                    side * (d / 2 + 0.5),
                    left,
                    ridge,
                    0,
                    right,
                    ridge,
                    0,
                ], 3));
                geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 1, 2, 1], 2));
                geometry.setIndex([0, 1, 2, 2, 1, 3]);
                geometry.computeVertexNormals();
                const mesh = new THREE.Mesh(geometry, this.material('roof', { damaged }));
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                parent.add(mesh);
            }
            this.box(parent, 0, y - 0.06, side * (d / 2 + 0.45), w + 0.95, 0.12, 0.15, 0x243c3c);
        }
        this.box(parent, 0, ridge + 0.04, 0, w + 0.8, 0.22, 0.32, 0x819481);
        for (const end of [-1, 1]) {
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute([
                (end * w) / 2,
                y - 0.05,
                -d / 2,
                (end * w) / 2,
                y - 0.05,
                d / 2,
                (end * w) / 2,
                ridge,
                0,
            ], 3));
            geometry.computeVertexNormals();
            parent.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
                color: 0xa18e65,
                side: THREE.DoubleSide,
                roughness: 1,
            })));
            this.box(parent, end * (w / 2 + 0.25), ridge + 0.2, 0, 0.24, 0.5, 0.24, 0x485d54);
        }
    }
    house(x, z, w, d, h, title, options = {}) {
        const base = villageHeight({ x, z });
        const group = new THREE.Group();
        group.position.set(x, base, z);
        (options.parent ?? this.scene).add(group);
        this.box(group, 0, 0.28, 0, w + 0.42, 0.56, d + 0.4, this.material('stone'));
        this.box(group, 0, h / 2 + 0.55, 0, w, h, d, this.material('stone'));
        this.fixedCard(group, 'facade', 0, h / 2 + 0.55, d / 2 + 0.006, w, h, {
            damaged: options.damaged,
        });
        this.box(group, 0, h + 0.52, 0, w + 0.1, 0.22, d + 0.1, 0x65553b);
        for (const cx of [-w / 2 + 0.05, w / 2 - 0.05])
            this.box(group, cx, h / 2 + 0.5, d / 2 + 0.08, 0.14, h, 0.18, 0x564931);
        this.roof(group, w, d, h + 0.63, !!options.damaged);
        this.fixedCard(group, 'sign', 0, h - 0.18, d / 2 + 0.085, Math.min(2.6, w * 0.65), 0.65, { title, damaged: options.damaged });
        this.box(group, 0, 0.15, d / 2 + 0.53, w * 0.52, 0.3, 0.7, this.material('stone'));
        if (!options.damaged) {
            for (const side of [-1, 1])
                this.lantern(group, side * (w / 2 - 0.5), 1.65, d / 2 + 0.24);
            if (title === '虎 道 場') {
                for (const cx of [-2.7, 2.7]) {
                    this.box(group, cx, 1.2, d / 2 + 0.6, 0.16, 2.4, 0.16, 0x665332);
                }
                const cloth = this.fixedCard(group, 'sign', 0, 1.35, d / 2 + 0.35, 2.0, 0.86, { title: '虎' });
                cloth.material = new THREE.MeshStandardMaterial({
                    color: 0x657b75,
                    roughness: 1,
                    side: THREE.DoubleSide,
                });
            }
        }
        else {
            const patch = this.box(group, w * 0.24, h + 1.0, d * 0.25, w * 0.35, 0.055, d * 0.65, 0x6d6845);
            patch.rotation.x = 0.56;
            for (let i = 0; i < 8; i++) {
                const rubble = this.box(group, -w * 0.48 + i * 0.29, 0.11, d / 2 + 0.65, 0.24, 0.15, 0.3, 0x829080);
                rubble.rotation.y = i * 0.6;
            }
            this.box(group, -0.85, 0.95, d / 2 + 0.08, 1.4, 0.13, 0.1, 0x776244).rotation.z = 0.3;
        }
    }
    lantern(parent, x, y, z) {
        this.box(parent, x, y + 0.35, z, 0.1, 0.6, 0.1, 0x4d4431);
        const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.42, 8), new THREE.MeshStandardMaterial({
            color: 0xeabf77,
            emissive: 0xe6a349,
            emissiveIntensity: 0.85,
            roughness: 1,
        }));
        lantern.position.set(x, y, z);
        parent.add(lantern);
        this.box(parent, x, y + 0.23, z, 0.42, 0.08, 0.4, 0x625033);
        this.box(parent, x, y - 0.23, z, 0.31, 0.08, 0.3, 0x5f4932);
        const light = new THREE.PointLight(0xffc178, 1.5, 3.2, 2);
        light.position.set(x, y, z + 0.14);
        parent.add(light);
    }
    tree(x, z, size) {
        const base = z < -11.6 ? villageTerrain.upperHeight : villageHeight({ x, z });
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * size, 0.26 * size, 3.5 * size, 7), new THREE.MeshStandardMaterial({ color: 0x5d533d, roughness: 1 }));
        trunk.position.set(x, base + 1.7 * size, z);
        trunk.castShadow = true;
        this.scene.add(trunk);
        for (let layer = 0; layer < 3; layer++) {
            const card = new THREE.Mesh(new THREE.PlaneGeometry(4.5 * size, 5.2 * size), this.material('leaves'));
            card.position.set(x + (layer - 1) * 0.18, base + 3.6 * size + layer * 0.22, z);
            card.rotation.y = (layer - 1) * 0.8;
            card.castShadow = true;
            card.receiveShadow = true;
            this.scene.add(card);
        }
    }
    pot(x, z, color = 0x846d4e, scale = 1) {
        const base = villageHeight({ x, z });
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.26 * scale, 0.35 * scale, 0.5 * scale, 10), new THREE.MeshStandardMaterial({ color, roughness: 1 }));
        pot.position.set(x, base + 0.25 * scale, z);
        pot.castShadow = true;
        this.scene.add(pot);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.24 * scale, 0.06 * scale, 6, 12), new THREE.MeshStandardMaterial({ color: 0x503f2b, roughness: 1 }));
        ring.rotation.x = Math.PI / 2;
        ring.position.set(x, base + 0.51 * scale, z);
        this.scene.add(ring);
    }
    buildTown() {
        this.box(this.scene, -2.15, -0.75, -0.1, 20.7, 1.45, 25, this.material('stone'));
        this.box(this.scene, 11.35, -0.75, -0.1, 2.7, 1.45, 25, this.material('stone'));
        this.ground(-2.15, 0.1, 20.6, 23.8, 0.01);
        for (const [x, w] of [
            [-7.2, 31],
            [18.7, 17],
        ]) {
            if (x === undefined || w === undefined)
                continue;
            const texture = pixelArt('grass');
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(w / 3, 12);
            this.textures.add(texture);
            const grass = new THREE.Mesh(new THREE.PlaneGeometry(w, 36), new THREE.MeshStandardMaterial({ map: texture, roughness: 1 }));
            grass.rotation.x = -Math.PI / 2;
            grass.position.set(x, -0.25, 0);
            grass.receiveShadow = true;
            this.scene.add(grass);
        }
        this.ground(11.7, 0.1, 3.25, 23.8, 0.01);
        this.box(this.scene, -2.65, villageTerrain.upperHeight / 2 - 0.04, -7.45, 19.85, villageTerrain.upperHeight, 8.9, this.material('stone'));
        this.ground(-2.65, -7.25, 19.85, 8.5, villageTerrain.upperHeight + 0.005);
        for (let i = 0; i < 14; i++) {
            const depth = (villageTerrain.stairsBottomZ - villageTerrain.stairsTopZ) / 14, height = (villageTerrain.upperHeight * (i + 1)) / 14;
            const stair = this.box(this.scene, 0, height / 2, villageTerrain.stairsBottomZ - (i + 0.5) * depth, 3.6, height, depth + 0.02, this.material('stone'));
            this.terrain.push(stair);
            this.box(this.scene, 0, height + 0.012, villageTerrain.stairsBottomZ - (i + 0.5) * depth, 3.7, 0.025, depth * 0.22, 0xc2b08a);
        }
        for (const x of [-2.05, 2.05]) {
            for (let i = 0; i < 6; i++) {
                const z = 2 - i, base = ((villageTerrain.stairsBottomZ - z) /
                    (villageTerrain.stairsBottomZ - villageTerrain.stairsTopZ)) *
                    villageTerrain.upperHeight;
                this.box(this.scene, x, base + 0.45, z, 0.4, 0.9, 0.45, this.material('stone'));
                this.box(this.scene, x, base + 0.92, z, 0.55, 0.12, 0.57, 0xb6ac84);
            }
        }
        for (const [x, width] of [
            [-7.3, 9.3],
            [4.65, 4.8],
        ]) {
            if (x === undefined || width === undefined)
                continue;
            this.box(this.scene, x, 3.15, -3.04, width, 0.62, 0.34, this.material('stone'));
            this.box(this.scene, x, 3.47, -3.04, width + 0.1, 0.08, 0.55, 0xbcb18e);
            for (let i = -width / 2; i < width / 2; i += 2) {
                this.box(this.scene, x + i, 3.27, -3.06, 0.42, 0.9, 0.42, this.material('stone'));
            }
        }
        for (let i = 0; i < 28; i++) {
            const x = -12.2 + i * 0.88;
            if (Math.abs(x) < 2.6)
                continue;
            this.box(this.scene, x, 0.025, -2.6 + Math.sin(i) * 0.06, 0.58, 0.06, 0.42, i % 3 ? 0x67724b : 0x89905c);
        }
        for (let i = 0; i < 24; i++) {
            const x = -12.3 + i * 1.08;
            if (Math.abs(x) < 1.4 || (x > 8 && x < 10.3))
                continue;
            this.box(this.scene, x, -0.1, 11.7 + Math.sin(i * 1.7) * 0.12, 0.68, 0.22, 0.45, i % 2 ? 0x6b784f : 0x8c9561);
        }
        for (const [x, z, scale] of [
            [-3.2, 7.5, 1.4],
            [3.3, 7.1, 1.65],
            [-4.5, 1.3, 1.1],
            [1.0, 9.7, 1.2],
            [3.7, -4.5, 0.65],
            [-4.1, -9.7, 0.8],
        ]) {
            if (x === undefined || z === undefined || scale === undefined)
                continue;
            const shape = new THREE.Shape();
            shape.moveTo(-1.8, -0.7);
            shape.lineTo(-0.8, -1.0);
            shape.lineTo(0.6, -0.65);
            shape.lineTo(1.8, 0.1);
            shape.lineTo(0.8, 0.8);
            shape.lineTo(-1.3, 0.6);
            shape.closePath();
            const patch = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({
                color: 0xb0aa80,
                roughness: 1,
                transparent: true,
                opacity: 0.64,
                depthWrite: false,
                polygonOffset: true,
                polygonOffsetFactor: -2,
            }));
            patch.rotation.x = -Math.PI / 2;
            patch.position.set(x, villageHeight({ x, z }) + 0.019, z);
            patch.scale.setScalar(scale);
            patch.receiveShadow = true;
            this.scene.add(patch);
        }
        const rampGeometry = new THREE.BufferGeometry();
        rampGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
            villageTerrain.rampEdgeX,
            0,
            villageTerrain.rampBottomZ,
            13.3,
            0,
            villageTerrain.rampBottomZ,
            villageTerrain.rampEdgeX,
            villageTerrain.upperHeight,
            villageTerrain.rampTopZ,
            13.3,
            villageTerrain.upperHeight,
            villageTerrain.rampTopZ,
        ], 3));
        rampGeometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 3, 2, 3], 2));
        rampGeometry.setIndex([0, 1, 2, 2, 1, 3]);
        rampGeometry.computeVertexNormals();
        const ramp = new THREE.Mesh(rampGeometry, this.material('ground'));
        ramp.receiveShadow = true;
        this.scene.add(ramp);
        this.terrain.push(ramp);
        this.ground(10.3, -8.75, 6, 5.5, villageTerrain.upperHeight + 0.005);
        this.house(-8.4, 5, 4.5, 2.9, 2.5, '茶 屋');
        this.house(4.8, 2, 4, 3.6, 2.65, '鍛 冶');
        this.house(-7.8, -7, 5.4, 3.5, 3.3, '薬 房');
        this.house(0, -7.1, 6.8, 3.2, 3.0, '虎 道 場', {
            damaged: true,
            parent: this.dojoBefore,
        });
        this.house(0, -7.1, 6.8, 3.2, 3.0, '虎 道 場', { parent: this.dojoAfter });
        this.house(5.55, -7.15, 2.9, 3.1, 2.7, '書 房');
        this.dojoAfter.visible = false;
        this.box(this.scene, -4.6, 0.3, 3.5, 1.05, 0.6, 1.05, this.material('stone'));
        this.box(this.scene, -4.6, 0.67, 3.5, 0.95, 0.16, 0.9, 0x57432d);
        for (let i = 0; i < 4; i++) {
            const log = this.box(this.scene, -4.8 + i * 0.13, 0.74, 3.5, 0.17, 0.13, 0.7, 0x493b2b);
            log.rotation.y = 0.24 * i;
        }
        for (let i = 0; i < 6; i++) {
            const smoke = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.55), new THREE.MeshBasicMaterial({
                color: 0xc5bc9d,
                transparent: true,
                opacity: 0.12,
                depthWrite: false,
            }));
            this.scene.add(smoke);
            this.smoke.push(smoke);
        }
        // 화덕 옆 노점은 천막·박스·채소로 작은 생활 장면을 만든다.
        this.box(this.scene, -7.4, 0.75, 2.6, 2.4, 0.25, 0.8, 0x65543a);
        for (const x of [-8.5, -6.3])
            this.box(this.scene, x, 1.2, 2.5, 0.1, 2.4, 0.1, 0x504933);
        const awning = this.box(this.scene, -7.4, 2.6, 2.5, 2.7, 0.04, 1.45, 0x9c7350);
        awning.rotation.x = 0.15;
        for (let i = 0; i < 7; i++)
            this.box(this.scene, -8.5 + i * 0.36, 2.51, 3.15, 0.17, 0.25, 0.025, i % 2 ? 0xc6af70 : 0x786e46);
        for (let i = 0; i < 10; i++) {
            const fruit = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), new THREE.MeshStandardMaterial({
                color: i % 3 === 0 ? 0xbd8040 : 0x9b9c48,
                roughness: 1,
            }));
            fruit.position.set(-8.2 + (i % 5) * 0.32, 0.95, 2.4 + Math.floor(i / 5) * 0.3);
            this.scene.add(fruit);
        }
        for (const [x, z] of [
            [-5.9, 5.6],
            [-11.1, 3.2],
            [7.1, 0.1],
            [3, 4.6],
            [-4.5, -5.7],
            [7.2, -5.4],
            [-5.5, -9],
        ]) {
            if (x !== undefined && z !== undefined)
                this.pot(x, z);
        }
        for (const [x, z, size] of [
            [-12.3, -8.9, 1.4],
            [-11.3, -11.4, 1.2],
            [-6.5, -12.9, 1.2],
            [-1.9, -13.7, 1.25],
            [3.6, -13.2, 1.4],
            [8.2, -13.6, 1.6],
            [12.9, -11.3, 1.3],
            [-12.8, 7.7, 1.2],
            [-10.5, 10.2, 1],
            [12.9, 0.2, 1.05],
            [12.9, 9.8, 1.1],
        ]) {
            if (x !== undefined && z !== undefined && size !== undefined)
                this.tree(x, z, size);
        }
        const water = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 18), new THREE.MeshStandardMaterial({
            color: 0x4c7775,
            roughness: 0.27,
            metalness: 0.28,
            transparent: true,
            opacity: 0.92,
        }));
        water.rotation.x = -Math.PI / 2;
        water.position.set(9.15, -0.12, 11.7);
        this.scene.add(water);
        for (let i = 0; i < 22; i++) {
            const line = new THREE.Mesh(new THREE.PlaneGeometry(0.2 + (i % 5) * 0.2, 0.026), new THREE.MeshBasicMaterial({
                color: i % 4 ? 0x9aa889 : 0xf4c98c,
                transparent: true,
                opacity: 0.4,
            }));
            line.rotation.x = -Math.PI / 2;
            line.position.set(8.6 + (i % 4) * 0.35, -0.08, 3.2 + i * 0.65);
            this.scene.add(line);
            this.waterLines.push(line);
        }
        this.ground(9.6, 5.5, 5, 2.2, 0.145);
        this.box(this.scene, 9.4, -0.1, 5.5, 4.8, 0.4, 2.2, this.material('stone'));
        for (const z of [4.4, 6.6]) {
            this.box(this.scene, 9.5, 0.7, z, 5, 0.17, 0.17, 0x715c3b);
            for (let i = 0; i < 6; i++)
                this.box(this.scene, 7.2 + i * 0.95, 0.48, z, 0.15, 0.8, 0.15, 0x5f543d);
        }
        this.box(this.scene, 11.3, 3.25, -8.8, 2.3, 0.22, 0.6, 0x756a4a);
        for (const x of [10.4, 12.1])
            this.box(this.scene, x, 3.03, -8.8, 0.18, 0.48, 0.5, 0x5d5b41);
        this.lantern(this.scene, 10, 4.3, -8.7);
        for (let i = 0; i < 7; i++) {
            this.box(this.scene, -2.2 + i * 0.65, -0.01, 10.2, 0.38, 0.05, 0.5, 0xc7b88b);
        }
        for (const [x, z] of [
            [-2.8, 2.6],
            [2.7, -3.4],
            [-5.2, -10.5],
            [11.5, 3.1],
        ]) {
            if (x !== undefined && z !== undefined) {
                const y = villageHeight({ x, z });
                this.lantern(this.scene, x, y + 1.8, z);
            }
        }
        // 원경 산은 보행 영역 밖에 두어 건물 뒤편 길과 구분한다.
        for (let i = 0; i < 9; i++) {
            const mountain = new THREE.Mesh(new THREE.ConeGeometry(6 + (i % 3), 9 + (i % 4), 5), new THREE.MeshStandardMaterial({
                color: i % 2 ? 0x39534c : 0x466151,
                roughness: 1,
                flatShading: true,
            }));
            mountain.position.set(-28 + i * 7, 4, -23 - (i % 2) * 4);
            this.scene.add(mountain);
        }
    }
    async load() {
        await this.spriteTextures.load(new Set([...this.actor.motions.values()].flatMap((animation) => animation.frames.map((frame) => frame.localPath))), '아타호 답사 리소스를 불러오지 못했어요.');
    }
    get actorMetrics() {
        return {
            width: this.actor.mesh.geometry.parameters.width,
            height: this.actor.mesh.geometry.parameters.height,
            verticalScale: this.actor.mesh.scale.y,
            footHeight: this.actor.mesh.position.y,
            pixelsPerUnit: 30,
        };
    }
    resize() {
        const bounds = this.canvas.getBoundingClientRect();
        this.aspect = bounds.width / Math.max(1, bounds.height);
        const scale = Math.min(1, 960 / Math.max(1, bounds.width));
        this.renderer.setSize(Math.max(1, Math.round(bounds.width * scale)), Math.max(1, Math.round(bounds.height * scale)), false);
    }
    updateCamera(snapshot, overview) {
        const half = overview
            ? Math.max(13.5, 17 / this.aspect)
            : Math.max(11.4, 14 / this.aspect);
        this.camera.left = -half * this.aspect;
        this.camera.right = half * this.aspect;
        this.camera.top = half;
        this.camera.bottom = -half;
        this.camera.updateProjectionMatrix();
        const x = this.aspect < 1 && !overview ? snapshot.x * 0.38 : 0;
        this.camera.position.set(x, 22, 29);
        this.camera.lookAt(x, 1.8, -0.8);
        this.camera.updateMatrixWorld();
    }
    render(snapshot, seconds, overview) {
        if (this.disposed)
            return;
        this.updateCamera(snapshot, overview);
        this.dojoAfter.visible = snapshot.restored;
        this.dojoBefore.visible = !snapshot.restored;
        const suffix = snapshot.facing === 'front' ? '' : `-${snapshot.facing}`;
        const delta = Math.max(0, seconds - this.lastAnimationTime);
        this.lastAnimationTime = seconds;
        this.actor.update(snapshot, `${snapshot.moving ? 'move' : 'stand'}${suffix}`, delta);
        this.actor.mesh.position.y = snapshot.height + 0.035;
        this.actor.shadow.position.y = snapshot.height + 0.022;
        // 수직 이미지의 화면 세로 투영을 보정해 원본 픽셀의 가로세로 비율을 유지한다.
        const target = new THREE.Vector3(0, 1.8, -0.8);
        const depth = this.camera.position.z - target.z;
        const height = this.camera.position.y - target.y;
        this.actor.mesh.scale.y = Math.hypot(depth, height) / depth;
        this.fireLight.intensity =
            snapshot.fire > 0 ? 7 + Math.sin(seconds * 18) * 1.4 : 1.5;
        this.flame.scale.setScalar((snapshot.fire > 0 ? 1 : 0.46) * (1 + Math.sin(seconds * 14) * 0.07));
        this.flame.position.y = snapshot.fire > 0 ? 1.0 : 0.68;
        this.smoke.forEach((smoke, i) => {
            const phase = (seconds * 0.35 + i / 6) % 1;
            smoke.position.set(-4.6 + phase * 0.52 + Math.sin(i + seconds * 0.6) * 0.07, 1.25 + phase * 2.2, 3.5);
            smoke.scale.setScalar(0.7 + phase * 1.0);
            smoke.material.opacity = (snapshot.fire > 0 ? 0.2 : 0.07) * (1 - phase);
            smoke.quaternion.copy(this.camera.quaternion);
        });
        this.waterLines.forEach((line, i) => {
            line.position.z = 3.2 + ((seconds * 0.35 + i * 0.65) % 14);
            line.scale.x = 0.7 + Math.sin(seconds * 0.8 + i) * 0.25;
        });
        this.marker.visible = snapshot.routeRemaining > 0;
        this.renderer.render(this.scene, this.camera);
    }
    pick(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        this.raycaster.setFromCamera(new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, 1 - ((clientY - rect.top) / rect.height) * 2), this.camera);
        const hits = this.raycaster.intersectObjects(this.terrain, false);
        const point = hits[0]?.point;
        if (!point)
            return null;
        this.marker.position.set(point.x, villageHeight({ x: point.x, z: point.z }) + 0.04, point.z);
        return { x: point.x, z: point.z };
    }
    project(position) {
        const point = new THREE.Vector3(position.x, villageHeight(position) + 0.05, position.z).project(this.camera);
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: rect.left + ((point.x + 1) / 2) * rect.width,
            y: rect.top + ((1 - point.y) / 2) * rect.height,
        };
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.scene.remove(this.actor.mesh, this.actor.shadow);
        this.actor.dispose();
        this.spriteTextures.dispose();
        const materials = new Set();
        const geometries = new Set();
        this.scene.traverse((object) => {
            if (object instanceof THREE.DirectionalLight)
                object.dispose();
            if (object instanceof THREE.Mesh) {
                geometries.add(object.geometry);
                const list = Array.isArray(object.material)
                    ? object.material
                    : [object.material];
                list.forEach((m) => {
                    materials.add(m);
                    if ('map' in m && m.map instanceof THREE.Texture)
                        this.textures.add(m.map);
                });
            }
        });
        for (const texture of this.textures)
            texture.dispose();
        for (const material of materials)
            material.dispose();
        for (const geometry of geometries)
            geometry.dispose();
        this.renderer.dispose();
        this.renderer.forceContextLoss();
    }
}
