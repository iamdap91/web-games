import * as THREE from 'three';
import { EnvironmentResources, setResourceOutline, } from '../../environment/environment-resources.js';
import { MapSpriteResources } from '../../props/map-sprite-resources.js';
import { resourceLayers, } from '../../../rendering/surface-types.js';
import { recolorMapMaterial } from '../../../rendering/map-art-direction.js';
import { villageGatePosts, villageShoreRocks, } from './maps.js';
import { VillageTerrainScenery } from './terrain-scenery.js';
import { facilityPaths } from './facility-icons.js';
/** 지역의 큰 형태·소품·환경 연출과 GPU 자원을 소유한다. */
export class RegionalScenery {
    map;
    root = new THREE.Group();
    resources;
    sprites = new MapSpriteResources();
    cube = new THREE.BoxGeometry(1, 1, 1);
    geometries = [];
    steam = [];
    ripples = [];
    marker;
    flame;
    glow = null;
    warmth = null;
    terrain;
    signs = new Map();
    windows = new Map();
    textures = [];
    ownedMaterials = [];
    boats = new THREE.Group();
    bellSwing = null;
    waterDrops = [];
    response = new Map();
    elapsed = 0;
    constructor(map) {
        this.map = map;
        const snow = map.id === 'onsen';
        this.resources = new EnvironmentResources({
            recolor: (kind, color) => recolorMapMaterial(map.style, kind, color),
        });
        this.box(0, -0.5, 0, 150, 0.12, 150, snow ? 0xb3c1bf : 0x919e85, 'wood', false);
        if (!snow)
            this.waterBackdrop();
        this.terrain = new VillageTerrainScenery(map);
        this.root.add(this.terrain.root);
        for (const deck of map.decks) {
            this.box(deck.x, -0.18, deck.z, deck.width, 0.18, deck.depth, 0x9f947b, 'wood', false);
            // 부두 판자는 간격을 두고 배치해 같은 높이의 면이 겹치지 않게 한다.
            const count = Math.floor(deck.depth / 0.65);
            for (let i = 0; i < count; i++)
                this.box(deck.x, 0, deck.z - deck.depth / 2 + ((i + 0.5) * deck.depth) / count, deck.width, 0.015, deck.depth / count - 0.035, 0xada088, 'wood', false);
            if (deck.depth > deck.width) {
                for (let z = deck.z - deck.depth / 2 + 0.6; z < deck.z + deck.depth / 2; z += 3.2)
                    this.box(deck.x + deck.width / 2 + 0.16, -0.55, z, 0.23, 1.45, 0.23, 0x756e5e, 'wood');
            }
        }
        for (const building of map.buildings)
            this.building(building);
        for (const prop of map.props)
            this.sprites.add(prop.key, { ...prop, y: 0.04 });
        this.root.add(this.sprites.root);
        if (snow)
            this.spring();
        else
            this.harbor();
        this.flame = map.hearth ? this.hearth() : null;
        this.boundaryTrees();
        this.furniture();
        this.gates();
        const geometry = new THREE.RingGeometry(0.52, 0.58, 32);
        this.geometries.push(geometry);
        this.marker = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
            color: 0xe5c98d,
            transparent: true,
            opacity: 0.8,
            depthWrite: false,
            side: THREE.DoubleSide,
        }));
        this.marker.layers.set(resourceLayers.effects);
        this.marker.rotation.x = -Math.PI / 2;
        this.root.add(this.marker);
    }
    waterBackdrop() {
        const points = [];
        for (let z = -80; z <= 80; z += 4)
            points.push(new THREE.Vector2(3.5 + Math.sin(z * 0.12) * 1.4 + Math.sin(z * 0.31) * 0.3, -z));
        points.push(new THREE.Vector2(80, -80), new THREE.Vector2(80, 80));
        const geometry = new THREE.ShapeGeometry(new THREE.Shape(points));
        geometry.rotateX(-Math.PI / 2);
        this.geometries.push(geometry);
        const sea = new THREE.Mesh(geometry, this.resources.material('wood', 0x839e9e));
        sea.position.y = -0.37;
        sea.receiveShadow = true;
        setResourceOutline(sea, 'ground');
        this.root.add(sea);
    }
    box(x, y, z, width, height, depth, color, kind = 'wood', shadow = true) {
        const mesh = new THREE.Mesh(this.cube, this.resources.material(kind, color));
        mesh.position.set(x, y + height / 2, z);
        mesh.scale.set(width, height, depth);
        mesh.castShadow = shadow;
        mesh.receiveShadow = true;
        setResourceOutline(mesh, kind === 'wood' ? 'box' : 'ground');
        this.root.add(mesh);
        return mesh;
    }
    roof(building, color, y) {
        const width = building.width + 0.55, depth = building.depth + 0.7;
        const shape = new THREE.Shape();
        shape.moveTo(-width / 2, 0);
        shape.lineTo(0, building.id === 'warehouse' ? 0.8 : building.id === 'bath' ? 0.9 : 1.25);
        shape.lineTo(width / 2, 0);
        shape.closePath();
        const geometry = new THREE.ExtrudeGeometry(shape, {
            depth,
            bevelEnabled: false,
        });
        geometry.translate(0, 0, -depth / 2);
        this.geometries.push(geometry);
        const mesh = new THREE.Mesh(geometry, this.resources.material('wood', color));
        mesh.position.set(building.x, y, building.z);
        mesh.castShadow = mesh.receiveShadow = true;
        setResourceOutline(mesh, 'box');
        this.root.add(mesh);
    }
    building(b) {
        const snow = this.map.id === 'onsen';
        this.box(b.x, 0, b.z, b.width, 0.18, b.depth, 0x9da49a, 'stone');
        if (b.kind === 'stall') {
            this.box(b.x, 0.18, b.z, b.width, 0.65, b.depth, 0xa48d6e);
            for (const dx of [-b.width / 2 + 0.14, b.width / 2 - 0.14])
                this.box(b.x + dx, 0, b.z, 0.18, b.height, 0.18, 0x786e59);
            const canopy = this.box(b.x, b.height, b.z, b.width + 0.45, 0.15, b.depth + 0.55, b.roof);
            canopy.rotation.z = 0.03;
            this.sprites.add('fishing-net', {
                x: b.x,
                z: b.z + b.depth / 2 + 0.03,
                y: 0.6,
                width: 1.6,
            });
            this.sign(b.id, b.x, b.height + 0.14, b.z + b.depth / 2 + 0.17);
            return;
        }
        this.box(b.x, 0.18, b.z, b.width, b.height, b.depth, b.id === 'warehouse' ? 0x9c8b73 : snow ? 0xa8a99a : 0xb9b5a0, b.id === 'warehouse' ? 'wood' : 'earth');
        const front = b.z + b.depth / 2 + 0.02;
        for (const dx of [-b.width / 2 + 0.15, b.width / 2 - 0.15])
            this.box(b.x + dx, 0.18, front, 0.18, b.height, 0.12, 0x7f7662);
        this.box(b.x, 0.2, front, 1.05, 1.75, 0.08, 0x675f52);
        this.box(b.x, 1.93, front, 1.25, 0.14, 0.12, 0x817661);
        for (const dx of [-b.width * 0.31, b.width * 0.31]) {
            const window = this.box(b.x + dx, 0.98, front, 0.75, 0.85, 0.08, snow ? 0xc8b88d : 0x738c89);
            const material = new THREE.MeshLambertMaterial({
                color: snow ? 0xc8b88d : 0x738c89,
            });
            window.material = material;
            this.ownedMaterials.push(material);
            this.windows.set(b.id, [...(this.windows.get(b.id) ?? []), window]);
            this.box(b.x + dx, 1.37, front + 0.05, 0.77, 0.07, 0.08, 0x726c5b);
            this.box(b.x + dx, 0.98, front + 0.05, 0.06, 0.85, 0.08, 0x726c5b);
        }
        this.facade(b, front);
        this.roof(b, b.roof, b.height + 0.18);
        if (snow)
            this.roof({ ...b, width: b.width + 0.08, depth: b.depth + 0.05 }, 0xd8ded6, b.height + 0.32);
        this.box(b.x, 0.08, front + 0.32, 1.35, 0.06, 0.6, 0xb1aa98, 'stone', false);
        if (this.map.points.some((point) => point.id === b.id))
            this.sign(b.id, b.x, b.height + 0.52, front + 0.48);
        if (b.id === 'smithy' || b.id === 'inn')
            this.box(b.x - b.width * 0.3, b.height + 0.6, b.z - 0.7, 0.55, 1.15, 0.65, 0x8c9290, 'stone');
    }
    facade(b, front) {
        const trim = 0x83745e;
        this.box(b.x, 0.45, front + 0.03, b.width, 0.09, 0.08, trim);
        if (b.id === 'warehouse') {
            for (let i = 0; i < 6; i++)
                this.box(b.x, 0.65 + i * 0.28, front + 0.04, b.width - 0.35, 0.045, 0.07, 0x8d7c64);
            for (const dx of [-0.43, 0.43]) {
                this.box(b.x + dx, 0.2, front + 0.06, 0.83, 1.7, 0.08, 0x716852);
                const brace = this.box(b.x + dx, 0.91, front + 0.12, 0.07, 1.25, 0.035, 0xa89777);
                brace.rotation.z = dx > 0 ? -0.4 : 0.4;
            }
        }
        if (b.id === 'inn' || b.id === 'bath') {
            this.box(b.x, 2.02, front - 0.11, b.width - 0.7, 0.12, 0.75, b.roof);
            for (const dx of [-b.width * 0.37, b.width * 0.37])
                this.box(b.x + dx, 0.18, front - 0.06, 0.13, 1.82, 0.16, trim);
            if (b.id === 'inn')
                this.box(b.x, 2.3, front + 0.04, b.width * 0.65, 0.16, 0.1, 0x9c896b);
        }
        if (b.id === 'smithy') {
            this.box(b.x - b.width * 0.3, 0.45, front + 0.06, 0.72, 0.58, 0.07, 0x615d50);
            const ember = this.box(b.x - b.width * 0.3, 0.47, front + 0.11, 0.44, 0.13, 0.04, 0xcf9d60);
            const material = new THREE.MeshBasicMaterial({ color: 0xcf9d60 });
            ember.material = material;
            this.ownedMaterials.push(material);
        }
    }
    sign(id, x, y, z) {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 64;
        const context = canvas.getContext('2d');
        if (!context)
            throw new Error('시설 간판을 만들 수 없습니다.');
        context.fillStyle = '#706951';
        context.fillRect(0, 0, 64, 64);
        context.strokeStyle = '#a69a78';
        context.lineWidth = 4;
        context.strokeRect(3, 3, 58, 58);
        context.translate(8, 8);
        context.scale(2, 2);
        context.strokeStyle = '#eee5c4';
        context.lineWidth = 1.9;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        for (const path of facilityPaths(id))
            context.stroke(new Path2D(path));
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.generateMipmaps = false;
        this.textures.push(texture);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            color: 0xd6d0b6,
            side: THREE.DoubleSide,
        });
        this.signs.set(id, material);
        this.ownedMaterials.push(material);
        const geometry = new THREE.PlaneGeometry(0.67, 0.67);
        this.geometries.push(geometry);
        const sign = new THREE.Mesh(geometry, material);
        sign.position.set(x, y, z);
        sign.layers.set(resourceLayers.effects);
        this.root.add(sign);
    }
    furniture() {
        for (const object of this.map.furniture) {
            const { x, z, width, depth } = object;
            if (object.kind === 'crates') {
                this.box(x, 0.03, z, width, 0.74, depth, 0xab8358);
                for (const dx of [-width * 0.35, width * 0.35])
                    this.box(x + dx, 0.03, z + depth / 2 + 0.02, 0.06, 0.75, 0.04, 0x81705a);
                this.box(x, 0.77, z, width * 0.75, 0.44, depth * 0.72, 0xa18f6b);
                this.sprites.add('sack', {
                    x: x - 0.15,
                    z: z + 0.04,
                    y: 1.2,
                    width: 0.5,
                });
            }
            else if (object.kind === 'rack') {
                for (const dx of [-width / 2 + 0.09, width / 2 - 0.09])
                    for (const dz of [-depth / 2 + 0.09, depth / 2 - 0.09])
                        this.box(x + dx, 0, z + dz, 0.12, 1.15, 0.12, 0x79573e);
                this.box(x, 0.91, z, width, 0.08, depth, 0xab8358);
                this.sprites.add('fishing-net', {
                    x,
                    z,
                    y: 0.55,
                    width: Math.min(width, 1.2),
                });
                this.sprites.add('basket', { x: x + 0.2, z: z + 0.2, width: 0.45 });
            }
            else if (object.kind === 'logs') {
                for (let row = 0; row < 3; row++)
                    for (let col = 0; col < 2; col++) {
                        const log = this.box(x + (col - 0.5) * width * 0.42, 0.05 + row * 0.22, z, width * 0.39, 0.2, depth, 0x79573e);
                        log.rotation.y = (row % 2) * 0.04;
                        this.box(x + (col - 0.5) * width * 0.42, 0.08 + row * 0.22, z + depth / 2 + 0.015, width * 0.32, 0.14, 0.04, 0xb6a385);
                    }
            }
            else {
                this.box(x, 0.05, z, width, 1.4, depth, 0x8c846b);
                for (let i = 0; i < 5; i++)
                    this.box(x + width / 2 + 0.03, 0.08, z - depth / 2 + ((i + 0.5) * depth) / 5, 0.07, 1.45, 0.07, 0xab8358);
            }
        }
    }
    gates() {
        for (const post of villageGatePosts(this.map)) {
            const geometry = new THREE.CylinderGeometry(post.radius, post.radius, 2.55, 7);
            this.geometries.push(geometry);
            const mesh = new THREE.Mesh(geometry, this.resources.material('wood', 0x83775e));
            mesh.position.set(post.x, 1.275, post.z);
            mesh.castShadow = mesh.receiveShadow = true;
            setResourceOutline(mesh, 'fence');
            this.root.add(mesh);
        }
        for (const point of this.map.points.filter((p) => ['wetland', 'coast', 'snow'].includes(p.id))) {
            this.box(point.x, 2.46, point.z, point.id === 'coast' ? 3.9 : 3.65, 0.14, 0.23, 0x8e8166);
            if (this.map.id === 'onsen')
                this.box(point.x, 2.6, point.z, 3.8, 0.08, 0.28, 0xd8ddd4, 'wood');
            this.sign(point.id, point.x, 2.25, point.z + 0.14);
        }
    }
    disk(x, y, z, radius, color, kind = 'stone') {
        const geometry = new THREE.CircleGeometry(radius, 36);
        this.geometries.push(geometry);
        const mesh = new THREE.Mesh(geometry, this.resources.material(kind, color));
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(x, y, z);
        setResourceOutline(mesh, 'ground');
        this.root.add(mesh);
        return mesh;
    }
    spring() {
        const pool = this.map.pool;
        this.disk(pool.x, 0.03, pool.z, pool.radius, 0x858f88);
        this.disk(pool.x, 0.04, pool.z, pool.radius - 0.4, 0x87aaa2, 'wood');
        for (let i = 0; i < 14; i++) {
            const angle = (i * Math.PI * 2) / 14;
            const stone = this.resources.createRock({
                radius: 0.32,
                color: 0xabb5b0,
            });
            stone.position.set(pool.x + Math.cos(angle) * (pool.radius - 0.32), 0.04, pool.z + Math.sin(angle) * (pool.radius - 0.32));
            stone.scale.y = 0.7;
            this.root.add(stone);
        }
        const spout = this.box(pool.x - 1.1, 0.34, pool.z - 1.95, 0.16, 0.14, 1.55, 0x98a775, 'wood');
        spout.rotation.x = 0.12;
        this.box(pool.x - 1.1, 0, pool.z - 2.3, 0.21, 0.58, 0.22, 0x79573e);
        for (let i = 0; i < 8; i++) {
            const drop = this.box(pool.x - 1.1, 0.1, pool.z - 1.18, 0.055, 0.13, 0.055, 0xb5d3c7, 'wood', false);
            this.waterDrops.push(drop);
        }
        this.sign('spring', pool.x + 1.8, 1.08, pool.z - 1.6);
        for (let i = 0; i < 6; i++) {
            const mesh = this.disk(pool.x + ((i % 3) - 1) * 0.7, 0.5, pool.z + (Math.floor(i / 3) - 0.5), 0.4, 0xe2e6dd);
            const material = new THREE.MeshBasicMaterial({
                color: 0xe3e8dd,
                transparent: true,
                opacity: 0.18,
                depthWrite: false,
                side: THREE.DoubleSide,
            });
            mesh.layers.set(resourceLayers.effects);
            mesh.material = material;
            this.steam.push(mesh);
        }
    }
    hearth() {
        const p = this.map.hearth;
        this.disk(p.x, 0.02, p.z, p.radius, 0x7f8172);
        this.glow = this.disk(p.x, 0.033, p.z, 2.25, 0xd9ac6b);
        this.glow.material = new THREE.MeshBasicMaterial({
            color: 0xe3b66e,
            transparent: true,
            opacity: 0.08,
            depthWrite: false,
        });
        this.glow.layers.set(resourceLayers.effects);
        this.warmth = new THREE.PointLight(0xffc879, 0, 4.5, 1);
        this.warmth.position.set(p.x, 0.85, p.z);
        this.warmth.layers.enableAll();
        this.root.add(this.warmth);
        for (let i = 0; i < 8; i++) {
            const a = (i * Math.PI) / 4;
            this.box(p.x + Math.cos(a) * 0.62, 0.04, p.z + Math.sin(a) * 0.62, 0.35, 0.24, 0.35, 0xa1a99e, 'stone');
        }
        for (const dx of [-0.15, 0.15]) {
            const log = this.box(p.x + dx, 0.07, p.z, 0.18, 0.18, 0.85, 0x786858);
            log.rotation.y = dx * 2;
        }
        const geometry = new THREE.ConeGeometry(0.27, 0.65, 5);
        this.geometries.push(geometry);
        const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0xd9a362 }));
        mesh.position.set(p.x, 0.48, p.z);
        setResourceOutline(mesh, 'box');
        this.root.add(mesh);
        return mesh;
    }
    harbor() {
        // 배는 통행할 수 없는 수면에 두어 부두의 보행 폭을 확보한다.
        this.root.add(this.boats);
        const shape = new THREE.Shape([
            new THREE.Vector2(0, 2.55),
            new THREE.Vector2(0.78, 1.65),
            new THREE.Vector2(0.82, -1.65),
            new THREE.Vector2(0, -2.45),
            new THREE.Vector2(-0.82, -1.65),
            new THREE.Vector2(-0.78, 1.65),
        ]);
        const hullGeometry = new THREE.ExtrudeGeometry(shape, {
            depth: 0.48,
            bevelEnabled: false,
        });
        hullGeometry.rotateX(-Math.PI / 2);
        this.geometries.push(hullGeometry);
        const hull = new THREE.Mesh(hullGeometry, this.resources.material('wood', 0x7f7965));
        hull.position.set(15.4, -0.35, 8);
        hull.receiveShadow = true;
        setResourceOutline(hull, 'box');
        this.boats.add(hull);
        this.boats.add(this.box(15.4, 0.13, 8, 1.2, 0.06, 3.6, 0xb0a389, 'wood', false));
        for (const z of [6.9, 8, 9.1])
            this.boats.add(this.box(15.4, 0.2, z, 1.4, 0.11, 0.23, 0x8b826e, 'wood', false));
        this.box(12.6, 0, 3.5, 0.18, 2, 0.18, 0x7c7461);
        this.box(12.6, 1.85, 3.8, 0.16, 0.16, 0.9, 0x7c7461);
        const geometry = new THREE.CylinderGeometry(0.14, 0.23, 0.25, 8);
        this.geometries.push(geometry);
        const bell = new THREE.Mesh(geometry, this.resources.material('stone', 0xb3a278));
        bell.position.set(12.6, 1.66, 4.05);
        setResourceOutline(bell, 'box');
        this.bellSwing = new THREE.Group();
        this.bellSwing.position.set(12.6, 1.86, 4.05);
        bell.position.set(0, -0.2, 0);
        this.bellSwing.add(bell);
        this.root.add(this.bellSwing);
        this.sign('bell', 12.6, 2.1, 3.8);
        for (const point of villageShoreRocks(this.map)) {
            const stone = this.resources.createRock({
                radius: point.radius,
                color: 0xaaa389,
            });
            stone.position.set(point.x, -0.18, point.z);
            stone.scale.y = 0.65;
            this.root.add(stone);
        }
        for (let i = 0; i < 3; i++) {
            const geometry = new THREE.RingGeometry(0.8, 0.85, 32);
            this.geometries.push(geometry);
            const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
                color: 0xb8cbc6,
                transparent: true,
                opacity: 0.45,
                side: THREE.DoubleSide,
                depthWrite: false,
            }));
            mesh.layers.set(resourceLayers.effects);
            mesh.rotation.x = -Math.PI / 2;
            mesh.position.set(15.5, -0.355, 8);
            this.root.add(mesh);
            this.ripples.push(mesh);
        }
    }
    boundaryTrees() {
        const snow = this.map.id === 'onsen';
        for (const [x, z] of [
            [-16, -9],
            [-17, -3],
            [-17, 6],
            [-16, 13],
            [-11, -14],
            [-5, -15],
            [1, -14],
            ...(snow
                ? [
                    [9, -13],
                    [16, -7],
                    [17, 2],
                    [17, 10],
                ]
                : []),
        ]) {
            if (snow) {
                this.box(x, 0, z, 0.22, 2.3, 0.24, 0x79573e);
                for (let i = 0; i < 3; i++) {
                    const radius = 1.25 - i * 0.28;
                    const geometry = new THREE.ConeGeometry(radius, 1.75, 7);
                    this.geometries.push(geometry);
                    const crown = new THREE.Mesh(geometry, this.resources.material('leaves', 0x738953));
                    crown.position.set(x, 1.65 + i * 0.65, z);
                    crown.castShadow = true;
                    setResourceOutline(crown, 'tree');
                    this.root.add(crown);
                    const cap = new THREE.Mesh(geometry, this.resources.material('stone', 0xd6ddd7));
                    cap.position.set(x, 2.23 + i * 0.65, z);
                    cap.scale.set(0.42, 0.34, 0.42);
                    setResourceOutline(cap, 'tree');
                    this.root.add(cap);
                }
                const geometry = new THREE.DodecahedronGeometry(1, 0);
                this.geometries.push(geometry);
                const mound = new THREE.Mesh(geometry, this.resources.material('wood', 0xd5dcd5));
                mound.scale.set(1.9, 0.3, 1.7);
                mound.position.set(x, -0.27, z);
                setResourceOutline(mound, 'ground');
                this.root.add(mound);
            }
            else {
                const tree = this.resources.createTree(0.75);
                tree.position.set(x, -0.38, z);
                this.root.add(tree);
            }
        }
    }
    load() {
        return this.sprites.load();
    }
    update(state, delta, camera) {
        this.elapsed += delta;
        this.sprites.face(camera);
        this.boats.position.y = Math.sin(this.elapsed * 1.2) * 0.025;
        this.boats.rotation.z = Math.sin(this.elapsed * 0.65) * 0.0015;
        if (this.bellSwing)
            this.bellSwing.rotation.x =
                state.bell > 0
                    ? Math.sin((3 - state.bell) * 14) * 0.42 * (state.bell / 3)
                    : 0;
        for (const [id, material] of this.signs) {
            const previous = this.response.get(id) ?? 0;
            const amount = Math.min(1, previous + (state.visited.includes(id) ? delta * 2 : 0));
            this.response.set(id, amount);
            material.color.setHex(amount > 0 ? 0xf7dea6 : 0xd6d0b6);
            for (const window of this.windows.get(id) ?? []) {
                const color = new THREE.Color(this.map.id === 'onsen' ? 0xc8b88d : 0x738c89).lerp(new THREE.Color(0xd9b97d), amount);
                window.material.color.copy(color);
            }
        }
        for (const [i, drop] of this.waterDrops.entries()) {
            const phase = (this.elapsed * 1.4 + i / 8) % 1;
            drop.visible = state.springOpened;
            drop.position.y = 0.44 * (1 - phase);
            drop.position.z = this.map.pool.z - 1.18 + phase * 0.2;
        }
        const target = this.map.points.find((p) => p.id === state.nearby);
        this.marker.visible = !!target;
        if (target)
            this.marker.position.set(target.x, 0.05, target.z);
        if (this.flame) {
            const strong = state.fire > 0;
            if (this.glow)
                this.glow.material.opacity = strong
                    ? 0.16
                    : 0.035;
            if (this.warmth)
                this.warmth.intensity = strong ? 1.8 : 0.35;
            this.flame.scale.setScalar((strong ? 1.65 : 0.8) * (1 + Math.sin(this.elapsed * 7) * 0.08));
        }
        for (const [i, steam] of this.steam.entries()) {
            const phase = (this.elapsed * 0.26 + i / this.steam.length) % 1;
            steam.position.y = 0.2 + phase * 1.65;
            steam.scale.setScalar(0.65 + phase * 1.8);
            steam.quaternion.copy(camera.quaternion);
            steam.material.opacity =
                Math.sin(phase * Math.PI) * (state.springOpened ? 0.16 : 0.065);
        }
        for (const [i, ripple] of this.ripples.entries()) {
            const phase = (this.elapsed * 0.5 + i / 3) % 1;
            ripple.visible = true;
            ripple.scale.setScalar(0.4 + phase * 2.8);
            ripple.material.opacity =
                (1 - phase) * (state.bell > 0 ? 0.45 : 0.09);
        }
        return false;
    }
    dispose() {
        this.terrain.dispose();
        this.textures.forEach((texture) => texture.dispose());
        this.ownedMaterials.forEach((material) => material.dispose());
        this.sprites.dispose();
        this.resources.dispose();
        this.cube.dispose();
        this.geometries.forEach((g) => g.dispose());
        for (const mesh of [
            this.marker,
            this.flame,
            this.glow,
            ...this.steam,
            ...this.ripples,
        ])
            if (mesh)
                mesh.material.dispose();
        this.root.clear();
        this.root.removeFromParent();
    }
}
