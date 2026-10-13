import * as THREE from 'three';
import { TrailSprite, trailMotions, } from '../../../games/tiger-rpg/trail-sprite.js';
import { SpriteTextures } from '../../../rendering/sprite-textures.js';
import { surfaceArt } from './art.js';
import { villageHeight, villageTerrain, villageBuildings, villagePaths, villagePoints, villageTrees, distanceToVillagePath, } from './layout.js';
/** 건물 기단과 실제 계단 위에 고정된 픽셀 면을 배치하는 독립 장면. */
export class MixedDojoScene {
    canvas;
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-20, 20, 12, -12, 0.1, 150);
    renderer;
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
    fireLight = new THREE.PointLight(0xffba76, 13, 10, 1.6);
    flame = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.45), new THREE.MeshBasicMaterial({
        map: surfaceArt('flame').color,
        alphaTest: 0.25,
        side: THREE.DoubleSide,
        color: 0xffddab,
    }));
    smoke = [];
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
    renderCount = 0;
    normalEnabled = true;
    surfaceNormals = new Map();
    cameraTarget = new THREE.Vector3();
    constructor(canvas) {
        this.canvas = canvas;
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: false,
        });
        this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.08;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.scene.background = new THREE.Color(0x89958a);
        this.scene.fog = new THREE.FogExp2(0x8c9b8c, 0.009);
        this.scene.add(new THREE.HemisphereLight(0xe8e0c9, 0x495e58, 1.1));
        const sun = new THREE.DirectionalLight(0xffdfb6, 1.65);
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
        this.flame.position.set(-5.3, 1.0, 3.3);
        this.fireLight.position.set(-6.5, 1.5, 3.9);
        this.buildTown();
        this.resize();
    }
    material(kind, options = {}) {
        const key = `${kind}-${String(options.damaged)}-${options.title ?? ''}`;
        const existing = this.materials.get(key);
        if (existing)
            return existing;
        const art = surfaceArt(kind, options);
        const texture = art.color;
        if (['roof', 'ground', 'grass', 'stone', 'brick'].includes(kind))
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        this.textures.add(texture);
        const material = new THREE.MeshStandardMaterial({
            map: texture,
            normalMap: art.normal ?? null,
            normalMapType: THREE.TangentSpaceNormalMap,
            normalScale: new THREE.Vector2(kind === 'roof' ? 0.28 : 0.95, kind === 'roof' ? 0.28 : 0.95),
            roughness: 0.95,
            metalness: 0,
            side: THREE.DoubleSide,
            alphaTest: kind === 'leaves' || kind === 'sign' || kind === 'window' ? 0.4 : 0,
        });
        if (art.normal) {
            art.normal.wrapS = art.normal.wrapT = texture.wrapS;
            this.textures.add(art.normal);
            this.surfaceNormals.set(material, art.normal);
        }
        this.materials.set(key, material);
        return material;
    }
    box(parent, x, y, z, w, h, d, material) {
        const mesh = new THREE.Mesh(this.boxGeometry(w, h, d, typeof material !== 'number' &&
            material instanceof THREE.MeshStandardMaterial &&
            !!material.map), typeof material === 'number'
            ? new THREE.MeshStandardMaterial({ color: material, roughness: 1 })
            : material);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    }
    boxGeometry(w, h, d, textured) {
        const geometry = new THREE.BoxGeometry(w, h, d);
        if (!textured)
            return geometry;
        const points = geometry.getAttribute('position'), normals = geometry.getAttribute('normal'), uv = geometry.getAttribute('uv');
        for (let i = 0; i < points.count; i++) {
            const x = points.getX(i), y = points.getY(i), z = points.getZ(i);
            if (Math.abs(normals.getX(i)) > 0.5)
                uv.setXY(i, (z + d / 2) / 4, (y + h / 2) / 4);
            else if (Math.abs(normals.getY(i)) > 0.5)
                uv.setXY(i, (x + w / 2) / 4, (z + d / 2) / 4);
            else
                uv.setXY(i, (x + w / 2) / 4, (y + h / 2) / 4);
        }
        return geometry;
    }
    fixedCard(parent, kind, x, y, z, w, h, options = {}) {
        const source = this.material(kind, options);
        const material = source.clone();
        if (source.normalMap)
            this.surfaceNormals.set(material, source.normalMap);
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
                geometry.setAttribute('uv', new THREE.Float32BufferAttribute([
                    0,
                    0,
                    (right - left) / 4,
                    0,
                    0,
                    (d / 2 + 0.5) / 4,
                    (right - left) / 4,
                    (d / 2 + 0.5) / 4,
                ], 2));
                geometry.setIndex([0, 1, 2, 2, 1, 3]);
                geometry.computeVertexNormals();
                const mesh = new THREE.Mesh(geometry, this.material('roof', { damaged }));
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                parent.add(mesh);
            }
            this.box(parent, 0, y - 0.06, side * (d / 2 + 0.45), w + 0.95, 0.12, 0.15, 0x3c5355);
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
                color: 0xc2ae8d,
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
        this.box(group, 0, h / 2 + 0.55, 0, w, h, d, 0xb9b19b);
        this.box(group, 0, h + 0.25, d / 2 + 0.02, w, 0.32, 0.02, 0x627574);
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
                const rubble = this.box(group, -w * 0.48 + i * 0.29, 0.11, d / 2 + 0.65, 0.24, 0.15, 0.3, 0x768c83);
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
            const card = new THREE.Mesh(new THREE.PlaneGeometry((4.4 + Math.sin(x * 1.8) * 0.8) * size, (4.8 + Math.cos(z) * 0.6) * size), this.material('leaves', { title: `${x}` }));
            card.position.set(x + (layer - 1) * 0.18, base + 3.3 * size + layer * 0.22, z);
            card.rotation.y = (layer - 1) * 0.8 + Math.sin(x + z) * 0.2;
            card.rotation.z = Math.sin(x * 2) * 0.045;
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
    /** 유기적 지형·길·색면을 같은 높이 규칙에 겹친다. */
    buildTown() {
        const t = villageTerrain;
        const geometry = new THREE.PlaneGeometry(44, 44, 110, 110);
        geometry.rotateX(-Math.PI / 2);
        const positions = geometry.getAttribute('position');
        for (let i = 0; i < positions.count; i++)
            positions.setY(i, villageHeight({ x: positions.getX(i), z: positions.getZ(i) }));
        const original = geometry.getIndex();
        const landIndices = [];
        if (original)
            for (let i = 0; i < original.count; i += 3) {
                const triangle = [
                    original.getX(i),
                    original.getX(i + 1),
                    original.getX(i + 2),
                ];
                if (triangle.some((v) => Math.abs(positions.getX(v) - t.stairsCenterX) <
                    t.stairsHalfWidth + 0.08 &&
                    positions.getZ(v) > t.stairsTopZ - 0.1 &&
                    positions.getZ(v) < t.stairsBottomZ + 0.1))
                    continue;
                landIndices.push(...triangle);
            }
        geometry.setIndex(landIndices);
        geometry.computeVertexNormals();
        const grass = surfaceArt('grass').color;
        grass.wrapS = grass.wrapT = THREE.RepeatWrapping;
        grass.repeat.set(11, 11);
        this.textures.add(grass);
        const land = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
            map: grass,
            roughness: 1,
            side: THREE.DoubleSide,
        }));
        land.receiveShadow = true;
        this.scene.add(land);
        // 왼쪽으로 부푼 흙광장으로 행선지와 큰 색면을 먼저 읽게 한다.
        const shape = new THREE.Shape();
        shape.moveTo(-6.6, -4.5);
        shape.quadraticCurveTo(-6.1, -6.9, -2.5, -7.0);
        shape.quadraticCurveTo(2.5, -6.7, 3.6, -4.3);
        shape.quadraticCurveTo(3.2, -0.2, -1.4, -0.3);
        shape.quadraticCurveTo(-5.4, -0.8, -6.6, -4.5);
        const plaza = new THREE.Mesh(new THREE.ShapeGeometry(shape, 20), this.material('ground'));
        plaza.rotation.x = -Math.PI / 2;
        plaza.position.y = 0.036;
        plaza.receiveShadow = true;
        this.scene.add(plaza);
        for (const path of villagePaths)
            this.pathRibbon(path, path === villagePaths[2] ? 0.85 : 1.2);
        // 입구에서 계단과 뒤편 언덕길의 갈림길을 보여준다.
        for (let i = 0; i < t.stairCount; i++) {
            const depth = (t.stairsBottomZ - t.stairsTopZ) / t.stairCount;
            const h = ((i + 1) * t.upperHeight) / t.stairCount;
            this.box(this.scene, t.stairsCenterX, h / 2, t.stairsBottomZ - (i + 0.5) * depth, t.stairsHalfWidth * 2, h, depth + 0.01, this.material('stone'));
            for (const side of [-1, 1])
                this.box(this.scene, t.stairsCenterX + side * (t.stairsHalfWidth + 0.2), h / 2 + 0.07, t.stairsBottomZ - (i + 0.5) * depth, 0.48, h + 0.14, depth + 0.01, 0x95a08b);
            this.box(this.scene, t.stairsCenterX, h + 0.014, t.stairsBottomZ - (i + 0.87) * depth, t.stairsHalfWidth * 2 + 0.08, 0.028, 0.09, 0xc6c0a7);
        }
        for (const [x, width] of [
            [-6.8, 12.5],
            [5.1, 4.2],
        ]) {
            if (x === undefined || width === undefined)
                continue;
            this.box(this.scene, x, 1.19, -3.45, width, 2.4, 0.26, this.material('stone'));
            this.box(this.scene, x, 2.43, -3.45, width + 0.05, 0.12, 0.44, 0xa7b19a);
        }
        for (const x of [t.stairsCenterX - 1.95, t.stairsCenterX + 1.95]) {
            for (const z of [1.3, -0.4, -2.3]) {
                const h = villageHeight({ x: t.stairsCenterX, z });
                this.box(this.scene, x, h + 0.34, z, 0.26, 0.68, 0.28, 0x8c9a8a);
            }
        }
        for (const building of villageBuildings) {
            if (building.title === '虎 道 場') {
                this.house(building.x, building.z, building.w, building.d, building.h, building.title, { damaged: true, parent: this.dojoBefore });
                this.house(building.x, building.z, building.w, building.d, building.h, building.title, { parent: this.dojoAfter });
            }
            else
                this.house(building.x, building.z, building.w, building.d, building.h, building.title);
        }
        this.dojoAfter.visible = false;
        // 색과 높이 그림을 분리하고 실제 점광원을 표면 요철에 비춘다.
        this.box(this.scene, -5.3, 0.38, 3.3, 1.25, 0.76, 1.12, this.material('brick'));
        this.box(this.scene, -5.3, 0.82, 3.3, 1.4, 0.12, 1.24, 0x887b67);
        this.box(this.scene, -5.1, 0.64, 2.25, 2.5, 1.25, 0.28, this.material('brick'));
        const roof = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.2), this.material('roof'));
        roof.rotation.x = -0.85;
        roof.position.set(-5.1, 1.65, 2.2);
        roof.castShadow = true;
        this.scene.add(roof);
        for (let i = 0; i < 5; i++) {
            const smoke = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.45), new THREE.MeshBasicMaterial({
                color: 0xc5c4ae,
                transparent: true,
                opacity: 0.12,
                depthWrite: false,
            }));
            this.scene.add(smoke);
            this.smoke.push(smoke);
        }
        this.box(this.scene, -7.5, 0.55, 2.6, 1.2, 0.15, 0.6, 0x8c7558);
        this.pot(-6.6, 5.7);
        this.pot(2.9, -4.6);
        this.pot(-9.8, 1.9);
        for (const [x, z, size] of villageTrees)
            this.tree(x, z, size);
        // 길 안쪽은 성기게, 뒤뜰과 외곽은 조밀하게 심어 목적지를 남긴다.
        for (let i = 0; i < 170; i++) {
            const x = Math.sin(i * 18.71) * 12.6, z = Math.cos(i * 12.19) * 12.6;
            if (distanceToVillagePath({ x, z }) < 1.65 ||
                villageBuildings.some((b) => Math.abs(x - b.x) < b.w / 2 + 0.8 &&
                    Math.abs(z - b.z) < b.d / 2 + 0.8) ||
                (x > -7 && x < 4 && z > -3.4 && z < 8))
                continue;
            const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.25 + (i % 3) * 0.08, 0), new THREE.MeshStandardMaterial({
                color: [0x899779, 0x6c8574, 0xa1aa85][i % 3],
                roughness: 1,
            }));
            bush.position.set(x, villageHeight({ x, z }) + 0.15, z);
            bush.scale.y = 0.58;
            bush.receiveShadow = true;
            this.scene.add(bush);
        }
        const rest = villagePoints[2];
        this.box(this.scene, rest.x, 2.85, rest.z - 0.1, 2.2, 0.18, 0.68, 0x9a8567);
        for (const x of [rest.x - 0.8, rest.x + 0.8])
            this.box(this.scene, x, 2.62, rest.z - 0.1, 0.16, 0.4, 0.5, 0x6c705e);
        this.pot(rest.x + 1.1, rest.z + 0.25, 0x9b8365, 0.55);
        this.lantern(this.scene, rest.x - 1.3, 3.8, rest.z - 0.2);
        for (const [x, z] of [
            [-2.5, 5.5],
            [3.2, -3.8],
            [7.9, 3.7],
        ])
            if (x !== undefined && z !== undefined)
                this.lantern(this.scene, x, villageHeight({ x, z }) + 1.5, z);
        for (let i = 0; i < 9; i++) {
            const hill = new THREE.Mesh(new THREE.SphereGeometry(6 + (i % 3), 12, 6), new THREE.MeshStandardMaterial({
                color: i % 2 ? 0x80978b : 0x6f8c81,
                roughness: 1,
            }));
            hill.scale.set(1.5, 0.6, 1);
            hill.position.set(-28 + i * 7, 1.4, -24 - (i % 3));
            this.scene.add(hill);
        }
    }
    pathRibbon(points, halfWidth) {
        const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p.x, 0, p.z)));
        const vertices = [], uvs = [], indices = [];
        for (let i = 0; i <= 180; i++) {
            const p = curve.getPoint(i / 180), tangent = curve.getTangent(i / 180);
            for (const side of [-1, 1]) {
                const x = p.x - tangent.z * halfWidth * side, z = p.z + tangent.x * halfWidth * side;
                vertices.push(x, villageHeight({ x, z }) + 0.046, z);
                uvs.push((((side + 1) / 2) * halfWidth) / 2, ((i / 180) * curve.getLength()) / 4);
            }
            const stair = Math.abs(p.x - villageTerrain.stairsCenterX) <
                villageTerrain.stairsHalfWidth + 0.4 &&
                p.z < villageTerrain.stairsBottomZ + 0.25 &&
                p.z > villageTerrain.stairsTopZ - 0.25;
            if (i < 180 && !stair)
                indices.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices.filter((_, i) => {
            const start = i - (i % 3);
            const triangle = indices.slice(start, start + 3);
            const heights = triangle.map((v) => vertices[v * 3 + 1] ?? 0);
            return Math.max(...heights) - Math.min(...heights) < 0.33;
        }));
        geometry.computeVertexNormals();
        const mesh = new THREE.Mesh(geometry, this.material('ground'));
        mesh.receiveShadow = true;
        this.scene.add(mesh);
    }
    async load() {
        await this.spriteTextures.load(new Set([...this.actor.motions.values()].flatMap((animation) => animation.frames.map((frame) => frame.localPath))), '아타호 답사 리소스를 불러오지 못했어요.');
    }
    get diagnostics() {
        const frame = this.actor.animation.currentFrame.frame;
        return {
            renderCount: this.renderCount,
            pixelWidth: this.canvas.width,
            pixelHeight: this.canvas.height,
            techniques: [
                'HD2D:입체 집·실제 계단',
                'natural:곡선 길·식생 밀도',
                'painted:큰 색면·마른 붓',
                'lit2d:높이장 normal→3D 접선 공간',
            ],
            normalEnabled: this.normalEnabled,
            normalMapType: 'TangentSpaceNormalMap',
            normalColorSpace: 'NoColorSpace',
            normalUvAligned: true,
            lightPosition: {
                x: this.fireLight.position.x,
                y: this.fireLight.position.y,
                z: this.fireLight.position.z,
            },
            lightIntensity: this.fireLight.intensity,
            actor: {
                width: frame.width,
                height: frame.height,
                pivot: frame.pivot,
                verticalScale: this.actor.mesh.scale.y,
                footHeight: this.actor.mesh.position.y,
                groundHeight: this.actor.shadow.position.y,
                pitch: this.actor.mesh.rotation.x,
                roll: this.actor.mesh.rotation.z,
                originalRatio: frame.width / frame.height,
                projectedRatio: frame.width / frame.height,
                pixelsPerUnit: 30,
                source: frame.localPath,
            },
        };
    }
    resize() {
        const bounds = this.canvas.getBoundingClientRect();
        this.aspect = bounds.width / Math.max(1, bounds.height);
        this.renderer.setSize(Math.max(1, Math.round(bounds.width)), Math.max(1, Math.round(bounds.height)), false);
    }
    updateCamera(snapshot, overview) {
        const narrow = this.aspect < 0.85;
        const half = overview
            ? Math.max(12.3, 14.6 / this.aspect)
            : narrow
                ? 9.8
                : 10.6;
        this.camera.left = -half * this.aspect;
        this.camera.right = half * this.aspect;
        this.camera.top = half;
        this.camera.bottom = -half;
        this.camera.updateProjectionMatrix();
        const x = narrow && !overview ? snapshot.x * 0.8 : 0;
        const z = narrow && !overview
            ? THREE.MathUtils.clamp(snapshot.z - 2.5, -5.5, 3.5)
            : -0.8;
        this.cameraTarget.set(x, 1.5, z);
        this.camera.position.set(x, 21.5, z + 29.8);
        this.camera.lookAt(this.cameraTarget);
        this.camera.updateMatrixWorld();
    }
    render(snapshot, delta, options) {
        if (this.disposed)
            return;
        this.renderCount++;
        this.updateCamera(snapshot, options.overview);
        if (options.normalEnabled !== this.normalEnabled) {
            this.normalEnabled = options.normalEnabled;
            for (const [material, normal] of this.surfaceNormals) {
                material.normalMap = options.normalEnabled ? normal : null;
                material.needsUpdate = true;
            }
        }
        this.dojoAfter.visible = snapshot.restored;
        this.dojoBefore.visible = !snapshot.restored;
        const suffix = snapshot.facing === 'front' ? '' : `-${snapshot.facing}`;
        this.actor.update(snapshot, `${snapshot.moving ? 'move' : 'stand'}${suffix}`, delta);
        this.actor.mesh.position.y = snapshot.height + 0.035;
        this.actor.shadow.position.y = snapshot.height + 0.022;
        // 카메라 pitch만 투영 보정하고 인물은 수직 yaw판으로 깊이 가림을 보존한다.
        const depth = this.camera.position.z - this.cameraTarget.z, height = this.camera.position.y - this.cameraTarget.y;
        this.actor.mesh.scale.y = Math.hypot(depth, height) / depth;
        this.actor.mesh.rotation.set(0, 0, 0);
        const seconds = snapshot.elapsed;
        this.fireLight.position.set(options.lightSide === 'left' ? -6.5 : -3.6, 1.55, 3.9);
        this.fireLight.intensity =
            snapshot.fire > 0 ? 22 + Math.sin(seconds * 12) * 1.0 : 11;
        this.flame.scale.setScalar((snapshot.fire > 0 ? 0.85 : 0.42) * (1 + Math.sin(seconds * 12) * 0.06));
        this.smoke.forEach((smoke, i) => {
            const phase = (seconds * 0.3 + i / 5) % 1;
            smoke.position.set(-5.3 + phase * 0.36, 1.0 + phase * 2.0, 3.3);
            smoke.scale.setScalar(0.7 + phase);
            smoke.material.opacity = (snapshot.fire > 0 ? 0.15 : 0.05) * (1 - phase);
            smoke.quaternion.copy(this.camera.quaternion);
        });
        this.marker.visible = snapshot.routeRemaining > 0;
        this.renderer.render(this.scene, this.camera);
    }
    pick(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        this.raycaster.setFromCamera(new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, 1 - ((clientY - rect.top) / rect.height) * 2), this.camera);
        const ray = this.raycaster.ray;
        let previous = 0;
        for (let i = 1; i < 500; i++) {
            const distance = i * 0.2, p = ray.at(distance, new THREE.Vector3());
            if (p.y > villageHeight({ x: p.x, z: p.z })) {
                previous = distance;
                continue;
            }
            let low = previous, high = distance;
            for (let j = 0; j < 16; j++) {
                const middle = (low + high) / 2, q = ray.at(middle, new THREE.Vector3());
                if (q.y > villageHeight({ x: q.x, z: q.z }))
                    low = middle;
                else
                    high = middle;
            }
            const hit = ray.at((low + high) / 2, new THREE.Vector3());
            this.marker.position.set(hit.x, villageHeight({ x: hit.x, z: hit.z }) + 0.07, hit.z);
            return { x: hit.x, z: hit.z };
        }
        return null;
    }
    project(position) {
        const p = new THREE.Vector3(position.x, villageHeight(position), position.z).project(this.camera), rect = this.canvas.getBoundingClientRect();
        return {
            x: ((p.x + 1) / 2) * rect.width,
            y: ((1 - p.y) / 2) * rect.height,
        };
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.scene.remove(this.actor.mesh, this.actor.shadow);
        this.actor.dispose();
        this.spriteTextures.dispose();
        const materials = new Set(), geometries = new Set();
        this.scene.traverse((object) => {
            if (object instanceof THREE.DirectionalLight) {
                object.shadow.dispose();
                object.dispose();
            }
            if (object instanceof THREE.Mesh) {
                geometries.add(object.geometry);
                const list = Array.isArray(object.material)
                    ? object.material
                    : [object.material];
                for (const m of list) {
                    materials.add(m);
                    if ('map' in m && m.map instanceof THREE.Texture)
                        this.textures.add(m.map);
                }
            }
        });
        for (const texture of this.textures)
            texture.dispose();
        for (const material of materials)
            material.dispose();
        for (const geometry of geometries)
            geometry.dispose();
        this.materials.clear();
        this.surfaceNormals.clear();
        this.textures.clear();
        this.smoke.length = 0;
        this.scene.clear();
        this.renderer.renderLists.dispose();
        this.renderer.dispose();
        this.renderer.forceContextLoss();
    }
}
