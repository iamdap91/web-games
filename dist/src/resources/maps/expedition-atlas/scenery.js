import { regionalProps } from './regional-props.js';
import { colorAtlasSurface } from './surface-colors.js';
import { landmarkModel } from './point-models.js';
import { atlasStructures, atlasHotSpring, atlasDeckRules, atlasMillWheel, } from './architecture.js';
import { groundGeometry } from '../../../rendering/ground-geometry.js';
import * as THREE from 'three';
import { EnvironmentResources, setResourceOutline, } from '../../environment/environment-resources.js';
import { recolorMapMaterial } from '../../../rendering/map-art-direction.js';
import { MapSpriteResources } from '../../props/map-sprite-resources.js';
import { trailGroundGeometry } from '../../../games/tiger-rpg/trail-ground.js';
import { trailBounds, trailGroundDistance, } from '../../../games/tiger-rpg/trail-topology.js';
/** 지형·건축·소품의 GPU 수명을 소유한다. 통행 가능 여부는 방문 객체의 동일 지형에서 계산한다. */
export class AtlasScenery {
    map;
    root = new THREE.Group();
    sprites = new MapSpriteResources();
    resources;
    geometries = new Set();
    materials = new Set();
    cube = new THREE.BoxGeometry(1, 1, 1);
    cylinder = new THREE.CylinderGeometry(1, 1, 1, 10);
    cone = new THREE.ConeGeometry(1, 1, 8);
    closed = new THREE.Group();
    opened = new THREE.Group();
    barrier = new THREE.Group();
    waterRings = [];
    steam = [];
    waterWheel = new THREE.Group();
    caches = new Map();
    crowns = [];
    battleMarkers = new THREE.Group();
    time = 0;
    constructor(map) {
        this.map = map;
        this.resources = new EnvironmentResources({
            recolor: (kind, color) => recolorMapMaterial(map.style, kind, color),
        });
        [this.cube, this.cylinder, this.cone].forEach((g) => this.geometries.add(g));
        this.root.add(this.sprites.root);
        this.buildGround();
        this.buildBackground();
        this.buildArchitecture();
        this.dressBuildings();
        this.buildPoints();
        for (const { key, ...placement } of regionalProps[map.id])
            this.sprites.add(key, placement);
    }
    plain(color) {
        const material = new THREE.MeshLambertMaterial({
            color,
            flatShading: true,
        });
        this.materials.add(material);
        return material;
    }
    mesh(geometry, material, point, size, kind, parent = this.root) {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(point.x, point.y ?? size.y / 2, point.z);
        mesh.scale.set(size.x, size.y, size.z);
        mesh.castShadow = mesh.receiveShadow = true;
        setResourceOutline(mesh, kind);
        parent.add(mesh);
        return mesh;
    }
    box(point, size, surface = 'stone', color = 0xaaa389, parent = this.root) {
        return this.mesh(this.cube, this.resources.material(surface, color), point, size, surface === 'wood' ? 'fence' : 'rock', parent);
    }
    stone(point, radius, height = radius * 1.3) {
        const rock = this.resources.createRock({ radius, color: 0xaaa389 });
        rock.position.set(point.x, 0, point.z);
        rock.rotation.y = point.x * 0.43 + point.z * 0.37;
        rock.scale.y *= height / radius;
        this.root.add(rock);
        return rock;
    }
    flat(geometry, material, height, parent = this.root) {
        this.geometries.add(geometry);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = height;
        mesh.receiveShadow = true;
        setResourceOutline(mesh, 'ground');
        parent.add(mesh);
        return mesh;
    }
    disc(point, radius, color, height) {
        const mesh = this.flat(new THREE.CircleGeometry(radius, 28).rotateX(-Math.PI / 2), this.plain(color), height);
        mesh.position.x = point.x;
        mesh.position.z = point.z;
        return mesh;
    }
    buildGround() {
        const base = this.map.id === 'wetland' || this.map.id === 'mill'
            ? 0x7f9b98
            : this.map.id === 'canyon'
                ? 0x77685b
                : this.map.style.ground.grass;
        this.flat(new THREE.PlaneGeometry(170, 170).rotateX(-Math.PI / 2), this.plain(base), -0.015);
        if (this.map.id === 'canyon') {
            const stream = Array.from({ length: 18 }, (_, i) => ({
                x: -1.5 + Math.sin(i * 0.45) * 0.55,
                z: 2 + i * 1.25,
            }));
            this.flat(groundGeometry([
                ...stream.map((p) => ({ x: p.x - 0.65, z: p.z })),
                ...stream.map((p) => ({ x: p.x + 0.65, z: p.z })).reverse(),
            ]), this.plain(0x667e79), -0.008);
        }
        if (this.map.id === 'coast') {
            const shore = Array.from({ length: 64 }, (_, i) => ({
                x: -10.5 + Math.sin(i * 0.42) * 0.45,
                z: -80 + i * 2.7,
            }));
            this.flat(groundGeometry([{ x: -85, z: -80 }, ...shore, { x: -85, z: 90 }]), this.plain(0x7c9898), -0.008);
            const foam = new THREE.MeshBasicMaterial({
                color: 0xd5d9bf,
                transparent: true,
                opacity: 0.25,
                depthWrite: false,
            });
            this.materials.add(foam);
            this.flat(groundGeometry([
                ...shore,
                ...shore.map((p) => ({ x: p.x - 0.18, z: p.z })).reverse(),
            ]), foam, -0.006);
        }
        for (const [root, shortcutOpened] of [
            [this.closed, false],
            [this.opened, true],
        ]) {
            const rim = trailGroundGeometry(this.map, 0.3, { shortcutOpened });
            this.flat(rim, this.resources.material('earth', 0x8b8066), 0.006, root);
            const surface = trailGroundGeometry(this.map, -0.1, { shortcutOpened });
            const material = this.plain(0xffffff);
            colorAtlasSurface(surface, this.map, { shortcutOpened });
            material.vertexColors = true;
            this.flat(surface, material, 0.018, root);
            this.root.add(root);
        }
        this.opened.visible = false;
        for (const [index, bridge] of this.map.bridges.entries()) {
            const parent = bridge.shortcut ? this.opened : this.root;
            const length = Math.hypot(bridge.to.x - bridge.from.x, bridge.to.z - bridge.from.z);
            const group = new THREE.Group();
            group.position.set(bridge.from.x, 0, bridge.from.z);
            group.rotation.y = Math.atan2(bridge.to.x - bridge.from.x, bridge.to.z - bridge.from.z);
            parent.add(group);
            for (let i = 0; i < Math.ceil(length / atlasDeckRules.span); i++) {
                const z = i * atlasDeckRules.span, depth = Math.min(atlasDeckRules.boardDepth, length - z);
                this.box({ x: 0, z: z + depth / 2, y: 0.025 + index * 0.003 }, { x: bridge.width, y: 0.02, z: depth }, 'wood', i % 3 ? 0x98866b : 0xa39376, group);
                if (i % atlasDeckRules.postGap === 0)
                    for (const x of [-bridge.width / 2, bridge.width / 2])
                        this.box({ x, z, y: atlasDeckRules.postHeight / 2 }, {
                            x: atlasDeckRules.postWidth,
                            y: atlasDeckRules.postHeight,
                            z: atlasDeckRules.postWidth,
                        }, 'wood', 0x77694f, group);
            }
        }
        for (const obstacle of this.map.obstacles) {
            if ((this.map.id === 'garden' || this.map.id === 'caldera') &&
                obstacle.radius > 2) {
                this.basin(obstacle, obstacle.radius, this.map.id === 'garden' ? 0x859d93 : 0x626a66);
            }
            else if (this.map.id === 'bamboo' && obstacle.kind === 'tree') {
                this.bamboo(obstacle, obstacle.radius * 1.5);
            }
            else if (this.map.id === 'snow') {
                this.mesh(this.cylinder, this.plain(0x9eb8b6), { ...obstacle, y: 0.09 }, { x: obstacle.radius, y: 0.2, z: obstacle.radius }, 'ground');
                this.mesh(this.cylinder, this.plain(0xc4d4cd), { ...obstacle, y: 0.025 }, { x: obstacle.radius + 0.15, y: 0.1, z: obstacle.radius + 0.15 }, 'ground');
                for (let i = 0; i < 4; i++) {
                    const crack = this.box({
                        x: obstacle.x + i * 0.32 - 0.5,
                        z: obstacle.z + i * 0.6 - 0.8,
                        y: 0.195,
                    }, { x: 0.04, y: 0.015, z: 0.75 }, 'stone', 0x778f91);
                    crack.rotation.y = i * 0.7;
                }
            }
            else if (obstacle.kind === 'tree')
                this.tree(obstacle, obstacle.radius * 1.4);
            else
                this.stone(obstacle, obstacle.radius);
        }
        for (const wall of this.map.walls) {
            const length = Math.hypot(wall.to.x - wall.from.x, wall.to.z - wall.from.z);
            const angle = Math.atan2(wall.to.x - wall.from.x, wall.to.z - wall.from.z);
            const group = new THREE.Group();
            group.position.set((wall.from.x + wall.to.x) / 2, 0, (wall.from.z + wall.to.z) / 2);
            group.rotation.y = angle;
            this.root.add(group);
            this.box({ x: 0, z: 0 }, { x: wall.width, y: wall.height, z: length }, 'stone', 0xaaa389, group);
            for (let z = -length / 2 + 0.7; z < length / 2; z += 1.4)
                this.box({ x: 0, z, y: wall.height + 0.12 }, { x: wall.width + 0.12, y: 0.24, z: 0.65 }, 'stone', 0xb4b49e, group);
        }
        const entrance = this.map.entrance;
        this.box({ x: entrance.x + 1.7, z: entrance.z }, { x: 0.12, y: 1.15, z: 0.12 }, 'wood', 0x766849);
        this.box({ x: entrance.x + 1.7, z: entrance.z, y: 1 }, { x: 0.85, y: 0.3, z: 0.1 }, 'wood', 0xa38e68);
        for (const area of this.map.battleAreas) {
            const ring = new THREE.Mesh(new THREE.RingGeometry(area.radius - 0.05, area.radius, 32).rotateX(-Math.PI / 2), this.plain(0xc6a965));
            this.geometries.add(ring.geometry);
            ring.position.set(area.x, 0.035, area.z);
            setResourceOutline(ring, 'ground');
            this.battleMarkers.add(ring);
        }
        this.battleMarkers.visible = false;
        this.root.add(this.battleMarkers);
    }
    tree(point, size) {
        const tree = this.resources.createTree(size);
        tree.position.set(point.x, 0, point.z);
        this.root.add(tree);
        this.crowns.push({ tree, leaves: tree.children.slice(1) });
    }
    reed(point, size) {
        const group = new THREE.Group();
        group.position.set(point.x, 0, point.z);
        this.root.add(group);
        for (let i = 0; i < 4; i++) {
            const x = Math.sin(i * 2.7) * 0.18, z = Math.cos(i * 1.4) * 0.15, height = size * (0.6 + i * 0.1);
            const stem = this.box({ x, z }, { x: 0.045, y: height, z: 0.045 }, 'wood', 0x918968, group);
            stem.rotation.z = (i - 1.5) * 0.075;
            this.box({ x, z, y: height + 0.08 }, { x: 0.1, y: 0.21, z: 0.08 }, 'wood', 0x9e9370, group);
        }
    }
    fir(point, size) {
        const group = new THREE.Group();
        group.position.set(point.x, 0, point.z);
        this.root.add(group);
        this.mesh(this.cylinder, this.resources.material('wood', 0x776752), { x: 0, z: 0 }, { x: 0.12, y: size * 2.2, z: 0.12 }, 'tree', group);
        for (let i = 0; i < 3; i++) {
            const radius = size * (1.05 - i * 0.22), y = size * (0.8 + i * 0.65);
            this.mesh(this.cone, this.plain(0x697f73), { x: 0, z: 0, y }, { x: radius, y: size * 1.45, z: radius }, 'tree', group);
            this.mesh(this.cone, this.plain(0xcdd5cc), { x: 0, z: 0, y: y + size * 0.15 }, { x: radius * 0.8, y: size * 1.2, z: radius * 0.8 }, 'tree', group);
        }
        this.crowns.push({ tree: group, leaves: group.children.slice(1) });
    }
    bamboo(point, size) {
        const group = new THREE.Group();
        group.position.set(point.x, 0, point.z);
        this.root.add(group);
        const leaves = [];
        for (let i = 0; i < 3; i++) {
            const x = Math.sin(i * 2.2) * size * 0.3, z = Math.cos(i * 2.2) * size * 0.3, height = size * (2.8 + i * 0.3);
            this.mesh(this.cylinder, this.plain(0x6e8564), { x, z }, { x: size * 0.09, y: height, z: size * 0.09 }, 'tree', group);
            for (let j = 1; j < 5; j++)
                this.box({ x, z, y: (height * j) / 5 }, { x: size * 0.2, y: 0.055, z: size * 0.2 }, 'wood', 0x929a76, group);
            for (const side of [-1, 1]) {
                const leaf = this.mesh(this.cone, this.plain(this.map.style.ground.leaves), { x: x + side * size * 0.26, z, y: height * 0.82 }, { x: size * 0.1, y: size * 1.25, z: size * 0.04 }, 'tree', group);
                leaf.rotation.z = side * 0.95;
                leaves.push(leaf);
            }
        }
        this.crowns.push({ tree: group, leaves });
    }
    basin(point, radius, color) {
        this.disc(point, radius, color, 0.025);
        const geometry = new THREE.RingGeometry(radius - 0.12, radius + 0.08, 24).rotateX(-Math.PI / 2);
        const rim = this.flat(geometry, this.resources.material('stone', 0xaaa389), 0.032);
        rim.position.x = point.x;
        rim.position.z = point.z;
        for (let i = 0; i < 12; i++)
            this.stone({
                x: point.x + Math.cos((i * Math.PI) / 6) * radius,
                z: point.z + Math.sin((i * Math.PI) / 6) * radius,
            }, 0.2, 0.12);
    }
    vapor(point) {
        for (let i = 0; i < 5; i++) {
            const material = new THREE.MeshBasicMaterial({
                color: 0xe4ede5,
                transparent: true,
                opacity: 0.16,
                depthWrite: false,
                side: THREE.DoubleSide,
            });
            this.materials.add(material);
            const geometry = new THREE.CircleGeometry(0.36 + i * 0.03, 12);
            this.geometries.add(geometry);
            const puff = new THREE.Mesh(geometry, material);
            puff.position.set(point.x + Math.sin(i) * 0.5, 0.6, point.z);
            puff.userData.phase = i / 5;
            this.steam.push(puff);
            this.root.add(puff);
        }
    }
    buildBackground() {
        const bounds = trailBounds(this.map);
        for (let z = bounds.minZ - 6, row = 0; z < bounds.maxZ + 7; z += 3.3, row++)
            for (let x = bounds.minX - 7, col = 0; x < bounds.maxX + 7; x += 3.3, col++) {
                const point = {
                    x: x + Math.sin(row + col * 2) * 1.25,
                    z: z + Math.cos(col + row * 2) * 1.1,
                };
                const distance = trailGroundDistance(this.map, point);
                if (distance > -2.1)
                    continue;
                const size = 0.7 + ((row + col * 2) % 4) * 0.15;
                if (this.map.id === 'bamboo') {
                    if (distance > -6.8)
                        this.bamboo(point, size);
                }
                else if (this.map.id === 'canyon') {
                    if (distance > -7 &&
                        (row + col) % 2 === 0 &&
                        !(Math.abs(point.x) < 3 && point.z > 1 && point.z < 24)) {
                        const stack = new THREE.Group();
                        stack.position.set(point.x, 0, point.z);
                        stack.rotation.y = point.x * 0.37 + point.z * 0.19;
                        this.root.add(stack);
                        for (let tier = 0; tier < 3; tier++) {
                            const width = size * (1.4 - tier * 0.12);
                            this.mesh(this.cylinder, this.resources.material('stone', tier === 1 ? 0x987257 : 0xab826b), { x: tier * 0.12, z: 0, y: 0.4 + tier * 0.75 }, { x: width, y: 0.72, z: width * 0.85 }, 'rock', stack);
                        }
                    }
                }
                else if (this.map.id === 'mill') {
                    if (distance > -4)
                        this.reed(point, size * 0.65);
                    else if ((row + col) % 4 === 0)
                        this.waterRing(point, size);
                }
                else if (this.map.id === 'garden') {
                    if ((row + col) % 2 === 0)
                        this.tree(point, size);
                    else if (distance > -4)
                        this.stone(point, size * 0.6, size * 0.45);
                }
                else if (this.map.id === 'caldera') {
                    if (Math.hypot(point.x, point.z - 14) < 4.5)
                        continue;
                    if ((row + col) % 2 === 0) {
                        this.mesh(this.cylinder, this.resources.material('stone', 0x777e79), point, { x: size * 0.75, y: size * 2.5, z: size * 0.75 }, 'rock');
                        this.stone({ x: point.x + 0.8, z: point.z + 0.5 }, size * 0.45, size * 0.5);
                    }
                }
                else if (this.map.id === 'wetland') {
                    if (distance > -5.5)
                        this.reed(point, size);
                    if ((row + col) % 5 === 0)
                        this.waterRing(point, size * 0.6);
                }
                else if (this.map.id === 'quarry') {
                    if ((row + col) % 2 === 0) {
                        this.stone(point, size * 1.4, size * 2.5);
                        this.box({ ...point, y: 0.16 }, { x: size * 2.3, y: 0.35, z: size * 2 }, 'stone', 0xaca188);
                    }
                }
                else if (this.map.id === 'snow')
                    this.fir(point, size);
                else if (this.map.id === 'coast') {
                    if (point.x < -10) {
                        if ((row + col) % 2 === 0)
                            this.waterRing(point, size);
                    }
                    else {
                        this.stone(point, size * 1.3, size * (point.z > 9 && point.x > 2 ? 3.3 : 1.1));
                        if (point.z < 7 && (row + col) % 4 === 0)
                            this.sprites.add('dry-herbs', { ...point, width: 0.5 });
                    }
                }
                else {
                    if ((row + col) % 3 === 0)
                        this.tree(point, size);
                    else if (distance > -4)
                        this.box(point, { x: size * 1.7, y: size * 0.8, z: size }, 'stone', 0xaaa389);
                }
            }
        // 장식은 경계에 두고 서로 다른 지형 윤곽과 갈림길을 비워 둔다.
        for (let z = bounds.minZ, row = 0; z < bounds.maxZ; z += 1.7, row++)
            for (let x = bounds.minX, col = 0; x < bounds.maxX; x += 1.8, col++) {
                const point = { x, z }, distance = trailGroundDistance(this.map, point);
                if (distance < -0.8 || distance > -0.2 || (row + col) % 3 === 0)
                    continue;
                if (this.map.id === 'wetland' || this.map.id === 'mill')
                    this.reed(point, 0.45);
                else if (this.map.id === 'bamboo')
                    this.bamboo(point, 0.32);
                else if (this.map.id === 'garden')
                    this.sprites.add('dry-herbs', {
                        ...point,
                        width: 0.35,
                        kind: 'ground',
                        depth: 0.28,
                    });
                else if (this.map.id === 'caldera' || this.map.id === 'canyon')
                    this.stone(point, 0.23, 0.15);
                else if (this.map.id === 'snow') {
                    if ((row + col) % 2 === 0)
                        this.stone(point, 0.3, 0.15);
                }
                else if (this.map.id === 'quarry' || this.map.id === 'coast')
                    this.stone(point, 0.18, 0.12);
                else
                    this.sprites.add('moss', {
                        ...point,
                        width: 0.4,
                        kind: 'ground',
                        depth: 0.3,
                    });
            }
    }
    waterRing(point, radius) {
        const material = new THREE.MeshBasicMaterial({
            color: 0xb7cbc0,
            transparent: true,
            opacity: 0.22,
            depthWrite: false,
        });
        this.materials.add(material);
        const geometry = new THREE.RingGeometry(radius * 0.9, radius, 24).rotateX(-Math.PI / 2);
        this.geometries.add(geometry);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(point.x, -0.007, point.z);
        mesh.userData.phase = point.x + point.z;
        this.waterRings.push(mesh);
        this.root.add(mesh);
    }
    gableRoof(object) {
        const group = new THREE.Group();
        group.position.set(object.x, object.y ?? 2, object.z);
        this.root.add(group);
        const pitch = object.width > 5 ? 0.3 : 0.42;
        const rise = (object.width / 2) * Math.tan(pitch);
        for (const side of [-1, 1]) {
            const roof = this.box({ x: (side * object.width) / 4, z: 0, y: rise / 2 + 0.1 }, { x: object.width / 2 / Math.cos(pitch), y: 0.12, z: object.depth }, object.surface, object.color, group);
            roof.rotation.z = -side * pitch;
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute([-object.width / 2, 0, 0, object.width / 2, 0, 0, 0, rise, 0], 3));
        geometry.computeVertexNormals();
        this.geometries.add(geometry);
        const material = this.resources.material('wood', 0x8b7d60);
        for (const side of [-1, 1]) {
            const end = new THREE.Mesh(geometry, material);
            end.position.set(0, 0, (side * object.depth) / 2);
            if (side === -1)
                end.rotation.y = Math.PI;
            end.castShadow = end.receiveShadow = true;
            setResourceOutline(end, 'fence');
            group.add(end);
        }
        this.box({ x: 0, z: 0, y: rise + 0.13 }, { x: 0.14, y: 0.12, z: object.depth + 0.15 }, 'wood', 0x7c7058, group);
    }
    dressBuildings() {
        const buildings = this.map.id === 'mill'
            ? [
                { x: -13, z: 21, width: 2.7, depth: 2.4 },
                { x: 12.8, z: 21.7, width: 2.7, depth: 2.4 },
                { x: 12.8, z: 8, width: 2.7, depth: 2.4 },
            ]
            : this.map.id === 'garden'
                ? [{ x: 0, z: 28.2, width: 5, depth: 2.4 }]
                : [];
        for (const building of buildings) {
            const z = building.z + building.depth / 2 + 0.025;
            this.box({ x: building.x, z, y: 0.7 }, { x: 0.55, y: 1.3, z: 0.025 }, 'wood', 0x6f6554);
            for (const side of [-1, 1]) {
                const x = building.x + side * building.width * 0.3;
                this.box({ x, z, y: 1.2 }, { x: 0.52, y: 0.5, z: 0.025 }, 'wood', 0x716b58);
                this.box({ x, z: z + 0.025, y: 1.2 }, { x: 0.045, y: 0.52, z: 0.02 }, 'wood', 0xa09379);
                this.box({ x, z: z + 0.025, y: 1.2 }, { x: 0.55, y: 0.045, z: 0.02 }, 'wood', 0xa09379);
            }
            this.box({ x: building.x, z: z + 0.06, y: 0.035 }, { x: building.width * 0.7, y: 0.03, z: 0.35 }, 'stone', 0xaaa389);
        }
    }
    buildArchitecture() {
        for (const object of atlasStructures(this.map.id)) {
            if (object.kind === 'rock')
                this.stone(object, object.radius, object.height);
            else if (object.occupancy === 'overhead' &&
                object.depth >= 1.5 &&
                object.width >= 3)
                this.gableRoof(object);
            else
                this.box(object, { x: object.width, y: object.height, z: object.depth }, object.surface, object.color);
        }
        switch (this.map.id) {
            case 'wetland':
                this.barrier.position.set(1.4, 0, 16.2);
                this.box({ x: 0, z: 0, y: 0.65 }, { x: 2.7, y: 1.3, z: 0.12 }, 'wood', 0x9b8b6d, this.barrier);
                this.sprites.add('rope', {
                    x: 3.8,
                    z: 18.6,
                    width: 0.8,
                    kind: 'ground',
                    depth: 0.6,
                });
                break;
            case 'quarry':
                this.barrier.position.set(0, 0, 11.5);
                this.box({ x: 0, z: 0, y: 0.25 }, { x: 3.1, y: 0.5, z: 0.25 }, 'wood', 0x81735b, this.barrier);
                this.sprites.add('hammer', {
                    x: -11.5,
                    z: 12,
                    width: 0.45,
                    kind: 'ground',
                    depth: 0.55,
                });
                break;
            case 'ruins':
                this.barrier.position.set(0, 0, 4);
                for (const x of [-1.7, -0.85, 0, 0.85, 1.7])
                    this.box({ x, z: 0, y: 0.85 }, { x: 0.65, y: 1.7, z: 0.16 }, 'wood', 0x8d8167, this.barrier);
                break;
            case 'snow': {
                this.disc(atlasHotSpring, 1.35, 0x8eacaa, 0.025);
                for (let i = 0; i < 10; i++)
                    this.stone({
                        x: atlasHotSpring.x +
                            Math.cos((i / 10) * Math.PI * 2) * atlasHotSpring.radius,
                        z: atlasHotSpring.z +
                            Math.sin((i / 10) * Math.PI * 2) * atlasHotSpring.radius,
                    }, 0.3, 0.25);
                this.vapor(atlasHotSpring);
                this.sprites.add('bedroll', {
                    x: 12.2,
                    z: 13.6,
                    width: 0.9,
                    kind: 'ground',
                    depth: 0.6,
                });
                this.barrier.position.set(2.4, 0, 18.5);
                this.box({ x: 0, z: 0, y: 0.2 }, { x: 1.4, y: 0.25, z: 2.2 }, 'wood', 0x9e8c6e, this.barrier);
                for (const x of [-0.6, 0.6])
                    this.box({ x, z: 0, y: 0.06 }, { x: 0.15, y: 0.08, z: 2.7 }, 'wood', 0x7f725b, this.barrier);
                break;
            }
            case 'coast':
                // 해식동굴 입구는 깎인 돌 아치로 만들고 천장은 잘라 내부를 보여 준다.
                {
                    const archGeometry = new THREE.TorusGeometry(2.8, 0.55, 5, 10, Math.PI);
                    this.geometries.add(archGeometry);
                    const arch = new THREE.Mesh(archGeometry, this.resources.material('stone', 0xaaa389));
                    arch.position.set(4, 1.1, 18);
                    arch.castShadow = arch.receiveShadow = true;
                    setResourceOutline(arch, 'rock');
                    this.root.add(arch);
                }
                this.barrier.position.set(7.5, 0, 9.5);
                for (let i = 0; i < 4; i++)
                    this.box({ x: 0, z: (i - 1.5) * 0.5, y: 0.7 }, { x: 0.14, y: 1.4, z: 0.45 }, 'wood', 0x94866e, this.barrier);
                this.sprites.add('rope', {
                    x: -6.6,
                    z: 9.7,
                    width: 0.7,
                    kind: 'ground',
                    depth: 0.6,
                });
                this.sprites.add('cloth', {
                    x: -7.7,
                    z: 10,
                    width: 1,
                    kind: 'ground',
                    depth: 0.6,
                });
                break;
            case 'bamboo':
                this.barrier.position.set(4, 0, 8);
                for (const x of [-0.65, 0, 0.65])
                    this.box({ x, z: 0 }, { x: 0.1, y: 1.5, z: 2.6 }, 'wood', 0x788566, this.barrier);
                for (const x of [-14.5, -13.5])
                    this.box({ x, z: 17.4, y: 2.5 }, { x: 0.2, y: 0.3, z: 0.2 }, 'wood', 0xa99b78);
                this.sprites.add('basket', { x: 0.9, z: 25, width: 0.6 });
                break;
            case 'canyon':
                this.barrier.position.set(3.9, 0, 12);
                this.box({ x: 0, z: 0, y: 0.55 }, { x: 0.15, y: 1.1, z: 2.6 }, 'wood', 0x9b8265, this.barrier);
                this.sprites.add('rope', {
                    x: 5.7,
                    z: 14.3,
                    width: 0.8,
                    kind: 'ground',
                    depth: 0.5,
                });
                this.sprites.add('bedroll', {
                    x: -18.7,
                    z: 11.3,
                    width: 0.8,
                    kind: 'ground',
                    depth: 0.55,
                });
                break;
            case 'mill': {
                this.barrier.position.set(0, 0, 18.4);
                this.box({ x: 0, z: 0, y: 0.6 }, { x: 2.6, y: 1.2, z: 0.13 }, 'wood', 0x8e8066, this.barrier);
                this.waterWheel.position.set(atlasMillWheel.x, atlasMillWheel.y, atlasMillWheel.z);
                const ring = new THREE.TorusGeometry(atlasMillWheel.radius, 0.13, 6, 16);
                this.geometries.add(ring);
                const hoop = new THREE.Mesh(ring, this.resources.material('wood', 0x8c8067));
                hoop.castShadow = true;
                this.waterWheel.add(hoop);
                for (let i = 0; i < 10; i++) {
                    const angle = (i * Math.PI) / 5;
                    const spoke = this.box({ x: 0, z: 0, y: 0 }, { x: 0.1, y: 2.6, z: 0.16 }, 'wood', 0x8c8067, this.waterWheel);
                    spoke.rotation.z = angle;
                    spoke.castShadow = false;
                    const paddle = this.box({
                        x: Math.sin(angle) * atlasMillWheel.radius,
                        z: 0,
                        y: Math.cos(angle) * atlasMillWheel.radius,
                    }, { x: 0.6, y: 0.2, z: atlasMillWheel.depth }, 'wood', 0x9b8a6b, this.waterWheel);
                    paddle.rotation.z = -angle;
                    paddle.castShadow = false;
                }
                this.root.add(this.waterWheel);
                this.sprites.add('sack', { x: -10.5, z: 20.7, width: 0.65 });
                break;
            }
            case 'garden':
                this.barrier.position.set(0, 0, 5.5);
                for (const x of [-0.9, 0, 0.9])
                    this.box({ x, z: 0, y: 0.7 }, { x: 0.7, y: 1.4, z: 0.14 }, 'wood', 0x9b8567, this.barrier);
                for (let z = 0.8; z < 22; z += 1.4)
                    if (Math.abs(z - 13) > 2.8)
                        this.box({ x: 0.7, z, y: 0.035 }, { x: 0.55, y: 0.015, z: 0.8 }, 'stone', 0xc9c1a9, z < 7 ? this.opened : this.root);
                this.sprites.add('cloth', {
                    x: -11.3,
                    z: 17,
                    width: 0.7,
                    kind: 'ground',
                    depth: 0.4,
                });
                break;
            case 'caldera':
                this.barrier.position.set(4.5, 0, 21);
                for (let i = 0; i < 3; i++)
                    this.mesh(this.cone, this.resources.material('stone', 0x777e79), { x: (i - 1) * 0.5, z: 0, y: 0.45 }, { x: 0.65, y: 0.9, z: 0.6 }, 'rock', this.barrier);
                this.vapor({ x: 0, z: 14 });
                this.sprites.add('travel-flask', { x: -7, z: 23.2, width: 0.4 });
                break;
        }
        this.root.add(this.barrier);
    }
    buildLandmark(id, group) {
        const { model, radius } = landmarkModel(id);
        const box = (x, z, width, height, depth, y, wood = false) => this.box({ x, z, ...(y === undefined ? {} : { y }) }, { x: width, y: height, z: depth }, wood ? 'wood' : 'stone', wood ? 0x8b7d60 : 0xaaa389, group);
        switch (model) {
            case 'height-mark':
                box(0, 0, 0.18, 1.35, 0.18, undefined, true);
                for (let i = 0; i < 4; i++)
                    box(-0.035, 0.105, 0.15, 0.04, 0.045, 0.4 + i * 0.22, true);
                break;
            case 'tools':
                box(0, 0, 0.8, 0.35, 0.55);
                box(-0.18, 0.12, 0.45, 0.45, 0.32, 0.5);
                this.sprites.add('hammer', {
                    x: 0.2,
                    z: -0.1,
                    y: 0.37,
                    width: 0.4,
                    kind: 'ground',
                    depth: 0.36,
                    parent: group,
                });
                break;
            case 'table':
                for (const x of [-0.36, 0.36])
                    for (const z of [-0.18, 0.18])
                        box(x, z, 0.08, 0.65, 0.08, undefined, true);
                box(0, 0, 0.95, 0.09, 0.6, 0.7, true);
                this.sprites.add(id === 'mill-store' ? 'grain-trays' : 'survey-chart', {
                    x: 0,
                    z: 0,
                    y: 0.75,
                    width: 0.7,
                    kind: 'ground',
                    depth: 0.42,
                    parent: group,
                });
                break;
            case 'pillar':
                box(0, 0, 0.58, 0.17, 0.58);
                box(-0.07, 0.01, 0.35, 1.05, 0.38);
                box(0.12, -0.05, 0.23, 0.55, 0.23);
                break;
            case 'altar':
                box(0, 0, 1.1, 0.17, 0.7);
                box(0, 0, 0.9, 0.55, 0.5);
                this.sprites.add('bowl', {
                    x: 0,
                    z: -0.03,
                    y: 0.56,
                    width: 0.35,
                    parent: group,
                });
                break;
            case 'well': {
                const rim = new THREE.TorusGeometry(radius - 0.13, 0.12, 5, 16);
                rim.rotateX(-Math.PI / 2);
                this.geometries.add(rim);
                this.mesh(rim, this.resources.material('stone', 0xaaa389), { x: 0, z: 0, y: 0.65 }, { x: 1, y: 1, z: 1 }, 'rock', group);
                for (let i = 0; i < 10; i++) {
                    const a = (i * Math.PI) / 5;
                    const block = box(Math.cos(a) * (radius - 0.13), Math.sin(a) * (radius - 0.13), 0.15, 0.6, 0.21);
                    block.rotation.y = -a;
                }
                const water = new THREE.CircleGeometry(radius - 0.22, 20).rotateX(-Math.PI / 2);
                this.geometries.add(water);
                this.mesh(water, this.plain(0x5f7974), { x: 0, z: 0, y: 0.15 }, { x: 1, y: 1, z: 1 }, 'ground', group);
                break;
            }
            case 'bell':
                box(-0.2, 0, 0.12, 1.9, 0.12, undefined, true);
                box(0.02, 0, 0.5, 0.1, 0.12, 1.9, true);
                box(0.2, 0, 0.05, 0.4, 0.05, 1.65, true);
                this.mesh(this.cone, this.plain(0x8f9279), { x: 0.2, z: 0, y: 1.35 }, { x: 0.16, y: 0.24, z: 0.16 }, 'fence', group).rotation.z = Math.PI;
                break;
            case 'cairn':
                for (let i = 0; i < 3; i++)
                    this.mesh(this.cone, this.resources.material('stone', 0xaaa389), { x: i === 1 ? 0.08 : 0, z: 0, y: 0.2 + i * 0.25 }, { x: 0.5 - i * 0.1, y: 0.38, z: 0.4 - i * 0.08 }, 'rock', group);
                break;
            case 'flag':
                box(0, 0, 0.13, 1.5, 0.13, undefined, true);
                this.sprites.add('windsock', {
                    x: 0.16,
                    z: 0,
                    y: 0.9,
                    width: 0.45,
                    parent: group,
                });
                break;
            case 'seat':
                for (const x of [-0.3, 0.3])
                    box(x, 0, 0.09, 0.3, 0.34, undefined, true);
                box(0, 0, 0.9, 0.1, 0.45, 0.35, true);
                this.sprites.add('cloth', {
                    x: 0.2,
                    z: 0,
                    y: 0.41,
                    width: 0.35,
                    kind: 'ground',
                    depth: 0.3,
                    parent: group,
                });
                break;
            case 'columns':
                for (let i = 0; i < 3; i++)
                    this.mesh(this.cylinder, this.resources.material('stone', 0x777e79), { x: (i - 1) * 0.22, z: i === 1 ? 0.1 : -0.1 }, { x: 0.19, y: 0.5 + i * 0.25, z: 0.19 }, 'rock', group);
                break;
        }
    }
    buildPoints() {
        for (const point of this.map.points) {
            const group = new THREE.Group();
            group.position.set(point.x, 0, point.z);
            this.root.add(group);
            if (point.kind === 'cache') {
                this.sprites.add(this.map.id === 'wetland' ? 'basket' : 'sack', {
                    x: 0,
                    z: 0,
                    width: 0.7,
                    parent: group,
                });
                this.sprites.add('travel-flask', {
                    x: 0.25,
                    z: 0.1,
                    width: 0.3,
                    parent: group,
                });
                this.caches.set(point.id, group);
            }
            else if (point.kind === 'mechanism') {
                this.box({ x: 0, z: 0 }, { x: 0.38, y: 0.65, z: 0.42 }, 'wood', 0x8b7d60, group);
                const handle = this.box({ x: 0, z: 0, y: 0.7 }, { x: 0.1, y: 0.5, z: 0.1 }, 'wood', 0xb19b72, group);
                handle.rotation.z = -0.4;
                this.box({ x: -0.1, z: 0, y: 0.91 }, { x: 0.35, y: 0.08, z: 0.13 }, 'wood', 0x7b6a4e, group);
            }
            else {
                this.buildLandmark(point.id, group);
            }
        }
    }
    update(state, delta, camera, options) {
        this.time += delta;
        if (this.map.id === 'mill' && state.shortcutOpened)
            this.waterWheel.rotation.z -= delta * 0.25;
        let changed = this.closed.visible === state.shortcutOpened ||
            this.barrier.visible === state.shortcutOpened ||
            (state.opening > 0 && state.opening < 1);
        this.closed.visible = !state.shortcutOpened;
        this.opened.visible = state.shortcutOpened;
        this.barrier.visible = !state.shortcutOpened;
        this.barrier.rotation.y = (state.opening * Math.PI) / 2;
        this.barrier.scale.y = Math.max(0.08, 1 - state.opening);
        this.battleMarkers.visible = options.showBattles;
        for (const [id, object] of this.caches) {
            const visible = !state.surveyed.includes(id);
            if (object.visible !== visible)
                object.visible = visible;
        }
        for (const ring of this.waterRings) {
            const phase = ring.userData.phase;
            ring.scale.setScalar(1 + Math.sin(this.time * 0.6 + phase) * 0.08);
        }
        for (const puff of this.steam) {
            const phase = (this.time * 0.18 + puff.userData.phase) % 1;
            puff.position.y = 0.3 + phase * 1.5;
            puff.scale.setScalar(0.6 + phase * 0.9);
            puff.quaternion.copy(camera.quaternion);
        }
        for (const { tree, leaves } of this.crowns) {
            const visible = !(tree.position.z > state.player.z &&
                tree.position.z - state.player.z < 4 &&
                Math.abs(tree.position.x - state.player.x) < 1.8 * tree.scale.x);
            leaves.forEach((leaf) => {
                if (leaf.visible !== visible)
                    changed = true;
                leaf.visible = visible;
            });
        }
        this.sprites.face(camera);
        return changed;
    }
    dispose() {
        this.sprites.dispose();
        this.geometries.forEach((g) => g.dispose());
        this.materials.forEach((m) => m.dispose());
        this.resources.dispose();
        this.root.clear();
    }
}
