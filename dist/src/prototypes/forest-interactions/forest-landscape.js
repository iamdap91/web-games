import { MapSpriteResources } from '../../resources/props/map-sprite-resources.js';
import * as THREE from 'three';
import { setResourceOutline, } from '../../resources/environment/environment-resources.js';
import { groundGeometry } from '../../rendering/ground-geometry.js';
import { forestRules } from './world.js';
import { boulderRules } from './rolling-boulder.js';
import { vineLayout } from './vine-curtain.js';
import { hollowLayout } from './hollow-tree.js';
/** 숲 소품·장막·고목의 그림과 전용 GPU 자원만 소유한다. */
export class ForestLandscape {
    resources;
    options;
    group = new THREE.Group();
    sprites = new MapSpriteResources();
    pocket = new THREE.Group();
    vines = [new THREE.Group(), new THREE.Group()];
    bag = new THREE.Group();
    veilMaterial = new THREE.MeshBasicMaterial({
        color: 0x344332,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
    });
    veil;
    leafChips = [];
    pollen = [];
    exitBrushes = [];
    ownedGeometries = [];
    constructor(resources, options = {}) {
        this.resources = resources;
        this.options = options;
        if (options.origin)
            this.group.position.set(options.origin.x, 0, options.origin.z);
        const p = vineLayout.pocket;
        const geometry = new THREE.PlaneGeometry(p.maxX - p.minX, p.maxZ - p.minZ);
        this.ownedGeometries.push(geometry);
        this.veil = new THREE.Mesh(geometry, this.veilMaterial);
        this.veil.rotation.x = -Math.PI / 2;
        this.veil.position.set((p.minX + p.maxX) / 2, 0.04, (p.minZ + p.maxZ) / 2);
        setResourceOutline(this.veil, 'ground');
        this.buildLandscape();
        this.buildVines();
        this.buildHollow();
        this.group.add(this.sprites.root, this.veil, this.pocket, ...this.vines, ...this.leafChips);
    }
    box(width, height, depth, color, kind = 'wood') {
        const geometry = new THREE.BoxGeometry(width, height, depth);
        this.ownedGeometries.push(geometry);
        const mesh = new THREE.Mesh(geometry, this.resources.material(kind, color));
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        setResourceOutline(mesh, kind === 'leaves' ? 'brush' : 'tree');
        return mesh;
    }
    floor(x, z, w, d, color) {
        const geometry = groundGeometry([
            { x: x - w / 2, z: z - d / 2 },
            { x: x + w / 2, z: z - d / 2 },
            { x: x + w / 2, z: z + d / 2 },
            { x: x - w / 2, z: z + d / 2 },
        ]);
        this.ownedGeometries.push(geometry);
        const mesh = new THREE.Mesh(geometry, this.resources.material('grass', color));
        mesh.receiveShadow = true;
        setResourceOutline(mesh, 'ground');
        return mesh;
    }
    branch(from, to, radius) {
        const direction = to.clone().sub(from);
        const geometry = new THREE.CylinderGeometry(radius * 0.7, radius, direction.length(), 7);
        this.ownedGeometries.push(geometry);
        const branch = new THREE.Mesh(geometry, this.resources.material('wood', 0x756c58));
        branch.position.copy(from).add(to).multiplyScalar(0.5);
        branch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
        branch.castShadow = true;
        branch.receiveShadow = true;
        setResourceOutline(branch, 'tree');
        return branch;
    }
    buildLandscape() {
        if (this.options.surroundings !== false) {
            const width = forestRules.maxX - forestRules.minX + 2;
            const depth = forestRules.maxZ - forestRules.minZ + 2;
            const background = this.floor(0, 0, 120, 120, 0x98a775);
            background.position.y = -0.008;
            this.group.add(background, this.floor(0, -0.25, width, depth, 0x98a775));
            const paths = [
                [
                    { x: -5.25, z: -4.7 },
                    { x: -5.1, z: -1.7 },
                    { x: -5.45, z: 1.4 },
                    { x: -5.1, z: 5.8 },
                    { x: -2.8, z: 5.8 },
                    { x: -2.6, z: 1.5 },
                    { x: -2.8, z: -1.8 },
                    { x: -2.8, z: -4.7 },
                ],
                [
                    { x: -4.8, z: -3.05 },
                    { x: 1.65, z: -3.2 },
                    { x: 1.8, z: -1 },
                    { x: -4.8, z: -0.85 },
                ],
            ];
            for (const points of paths) {
                const geometry = groundGeometry(points);
                this.ownedGeometries.push(geometry);
                const path = new THREE.Mesh(geometry, this.resources.material('path', 0xc7b48c));
                path.position.y = 0.016;
                path.receiveShadow = true;
                setResourceOutline(path, 'ground');
                this.group.add(path);
            }
            for (let i = 0; i < 10; i++)
                for (const side of [-1, 1]) {
                    const tree = this.resources.createTree(0.7 + (i % 3) * 0.12);
                    tree.position.set(side * (9.2 + Math.sin(i) * 0.5), 0, -7 + i * 1.5 + Math.cos(i * 2.1) * 0.45);
                    this.group.add(tree);
                }
            for (let i = 0; i < 7; i++) {
                const tree = this.resources.createTree(0.75 + (i % 2) * 0.12);
                tree.position.set(-7 + i * 2.2, 0, -7.8);
                this.group.add(tree);
            }
            for (let i = 0; i < 28; i++) {
                const x = -7.6 + (i % 7) * 2.3, z = -5.7 + Math.floor(i / 7) * 3.1;
                if (Math.abs(x + 4) < 1.6 || (z < -1 && x > 1.5))
                    continue;
                const geometry = new THREE.CircleGeometry(0.25 + (i % 4) * 0.12, 7);
                this.ownedGeometries.push(geometry);
                const patch = new THREE.Mesh(geometry, this.resources.material('grass', i % 2 ? 0x8e9b72 : 0x9faa7e));
                patch.rotation.x = -Math.PI / 2;
                patch.position.set(x, 0.025, z);
                setResourceOutline(patch, 'ground');
                this.group.add(patch);
            }
        }
        const p = vineLayout.pocket;
        const walls = [
            { x: p.minX, z: -3.75, w: 0.25, d: 5.5 },
            ...(this.options.eastExit
                ? [
                    {
                        x: p.maxX,
                        z: (p.minZ +
                            this.options.eastExit.z -
                            this.options.eastExit.halfWidth) /
                            2,
                        w: 0.25,
                        d: this.options.eastExit.z -
                            this.options.eastExit.halfWidth -
                            p.minZ,
                    },
                    {
                        x: p.maxX,
                        z: (p.maxZ +
                            this.options.eastExit.z +
                            this.options.eastExit.halfWidth) /
                            2,
                        w: 0.25,
                        d: p.maxZ -
                            this.options.eastExit.z -
                            this.options.eastExit.halfWidth,
                    },
                ]
                : [{ x: p.maxX, z: -3.75, w: 0.25, d: 5.5 }]),
            { x: 4.5, z: p.minZ, w: 5, d: 0.25 },
            { x: 2.425, z: -1, w: 0.85, d: 0.25 },
            { x: 6.075, z: -1, w: 1.85, d: 0.25 },
        ];
        for (const wall of walls) {
            const length = Math.max(wall.w, wall.d), count = Math.ceil(length / 0.6);
            for (let i = 0; i <= count; i++) {
                const hedge = this.resources.createBrush(), along = (i / count - 0.5) * length;
                hedge.position.set(wall.x + (wall.w > wall.d ? along : Math.sin(i) * 0.04), 0, wall.z + (wall.d > wall.w ? along : Math.sin(i) * 0.04));
                hedge.scale.set(1.25, 1.4 + (i % 3) * 0.2, 1.25);
                this.group.add(hedge);
            }
        }
        if (this.options.eastExit)
            for (const side of [-1, 1]) {
                const brush = this.resources.createBrush();
                brush.position.set(p.maxX, 0, this.options.eastExit.z + side * 0.5);
                brush.scale.set(1.5, 2, 1.5);
                this.exitBrushes.push(brush);
                this.group.add(brush);
            }
        const floor = this.floor(4.5, -3.75, 4.8, 5.3, 0xadb688);
        floor.position.y = 0.025;
        this.pocket.add(floor);
        for (let i = 0; i < 6; i++)
            this.sprites.add(i % 2 ? 'herb' : 'flowers', {
                x: 2.6 + (i % 3) * 1.4,
                z: -2.1 - Math.floor(i / 3) * 2.1,
                width: 0.36,
                parent: this.pocket,
            });
        this.sprites.add('moss', {
            x: hollowLayout.x - 0.5,
            z: hollowLayout.z + 0.3,
            width: 0.74,
            depth: 0.45,
            kind: 'ground',
            parent: this.pocket,
        });
        this.sprites.add('root-grass', {
            x: hollowLayout.x + 0.5,
            z: hollowLayout.z + 0.35,
            width: 0.65,
            depth: 0.4,
            kind: 'ground',
            parent: this.pocket,
        });
        const light = new THREE.PointLight(0xffe5a1, 4, 6);
        light.position.set(4, 2.4, -3.6);
        this.pocket.add(light);
        const pollenGeometry = new THREE.SphereGeometry(0.025, 4, 3);
        this.ownedGeometries.push(pollenGeometry);
        for (let i = 0; i < 8; i++) {
            const mote = new THREE.Mesh(pollenGeometry, this.resources.material('earth', 0xe5d6a1));
            this.pollen.push(mote);
            this.pocket.add(mote);
        }
        if (this.options.surroundings !== false)
            for (const end of Object.values(boulderRules.ends)) {
                const catchBed = this.floor(end.x, end.z, 2.3, 2.1, 0x9e957d);
                catchBed.position.y = 0.018;
                this.group.add(catchBed);
            }
    }
    buildVines() {
        for (const side of [-1, 1]) {
            const x = vineLayout.x + side * (vineLayout.halfWidth + 0.3);
            this.group.add(this.branch(new THREE.Vector3(x, 0, vineLayout.z), new THREE.Vector3(x - side * 0.15, 3.15, vineLayout.z), 0.16));
            this.group.add(this.branch(new THREE.Vector3(x - side * 0.15, 3.05, vineLayout.z), new THREE.Vector3(vineLayout.x, 3.3, vineLayout.z), 0.09));
        }
        this.vines.forEach((panel, side) => {
            this.sprites.add('vine', {
                x: side === 0 ? vineLayout.halfWidth / 2 : -vineLayout.halfWidth / 2,
                y: -2.7,
                z: 0.06,
                width: vineLayout.halfWidth,
                depth: 2.7,
                kind: 'fixed',
                parent: panel,
            });
        });
        const leafGeometry = new THREE.BoxGeometry(0.12, 0.025, 0.19);
        this.ownedGeometries.push(leafGeometry);
        for (let i = 0; i < 12; i++) {
            const leaf = new THREE.Mesh(leafGeometry, this.resources.material('leaves', i % 2 ? 0x738953 : 0x88975f));
            setResourceOutline(leaf, 'brush');
            this.leafChips.push(leaf);
        }
    }
    buildHollow() {
        const tree = new THREE.Group();
        tree.position.set(hollowLayout.x, 0, hollowLayout.z);
        const bark = 0x756c58;
        // 앞쪽이 열린 원통과 덮인 윗줄기로 실제 구멍을 만든다.
        const trunkGeometry = new THREE.CylinderGeometry(0.52, hollowLayout.radius, 2.6, 9, 1, false, 0.62, Math.PI * 2 - 1.24);
        this.ownedGeometries.push(trunkGeometry);
        const trunk = new THREE.Mesh(trunkGeometry, this.resources.material('wood', bark));
        trunk.position.y = 1.3;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        setResourceOutline(trunk, 'tree');
        tree.add(trunk);
        const topGeometry = new THREE.CylinderGeometry(0.38, 0.55, 1.5, 7);
        this.ownedGeometries.push(topGeometry);
        const top = new THREE.Mesh(topGeometry, this.resources.material('wood', bark));
        top.position.set(-0.03, 2.05, 0);
        top.rotation.z = 0.06;
        top.castShadow = true;
        setResourceOutline(top, 'tree');
        tree.add(top);
        const dark = this.box(0.52, 1.3, 0.07, 0x302e28);
        dark.position.set(0, 0.75, -0.34);
        tree.add(dark);
        for (const side of [-1, 1]) {
            const geometry = new THREE.CylinderGeometry(0.08, 0.19, 1.05, 5);
            this.ownedGeometries.push(geometry);
            const branch = new THREE.Mesh(geometry, this.resources.material('wood', bark));
            branch.position.set(side * 0.63, 2.6 + (side > 0 ? 0.2 : 0), 0);
            branch.rotation.z = side * -0.8;
            branch.castShadow = true;
            setResourceOutline(branch, 'tree');
            tree.add(branch);
        }
        const cloth = this.box(0.13, 0.34, 0.05, 0xb29870, 'earth');
        cloth.position.set(0.16, 0.5, 0.4);
        tree.add(cloth);
        const satchel = this.box(0.4, 0.32, 0.26, 0xae9270, 'earth');
        satchel.position.y = 0.16;
        this.bag.add(satchel);
        const band = this.box(0.07, 0.37, 0.29, 0x6c5948);
        band.position.y = 0.19;
        this.bag.add(band);
        tree.add(this.bag);
        for (const side of [-1, 1])
            tree.add(this.branch(new THREE.Vector3(side * 0.35, 0.15, 0.05), new THREE.Vector3(side * 0.82, 0.055, 0.38), 0.12));
        this.pocket.add(tree);
    }
    update(state, reducedMotion = false) {
        const opening = state.vine.opening;
        const smooth = opening * opening * (3 - 2 * opening);
        const hitAge = state.vine.lastHitAt === null ? 10 : state.elapsed - state.vine.lastHitAt;
        const bend = !reducedMotion && hitAge < 0.35
            ? Math.sin(hitAge * 26) * Math.exp(-hitAge * 9) * 0.06
            : 0;
        this.vines.forEach((panel, side) => {
            const sign = side === 0 ? -1 : 1;
            panel.position.set(vineLayout.x + sign * (vineLayout.halfWidth + smooth * 0.25), 3.05, vineLayout.z);
            panel.rotation.z = sign * smooth * 0.7 + bend;
            panel.children.forEach((strand) => {
                strand.visible = !state.vine.passable;
                if (strand instanceof THREE.Mesh &&
                    strand.material instanceof THREE.MeshBasicMaterial)
                    strand.material.color.setHex(state.vine.hits > 1
                        ? 0xaaa58c
                        : state.vine.hits > 0
                            ? 0xc8c8b5
                            : 0xffffff);
            });
        });
        this.exitBrushes.forEach((brush, index) => {
            brush.visible = !state.vine.passable;
            brush.position.z =
                this.options.eastExit.z +
                    (index === 0 ? -1 : 1) * (0.5 + smooth * 1.25);
        });
        this.veil.visible = opening < 1;
        this.veilMaterial.opacity = (0.63 - state.vine.hits * 0.08) * (1 - smooth);
        this.pocket.visible = opening > 0.28;
        this.pollen.forEach((mote, i) => {
            mote.visible = !reducedMotion;
            mote.position.set(2.9 + (i % 4) * 0.85 + Math.sin(state.elapsed * 0.4 + i) * 0.1, 0.5 + (i % 3) * 0.32 + Math.sin(state.elapsed * 0.7 + i) * 0.16, -2.5 - Math.floor(i / 4) * 2.4);
            mote.scale.setScalar(0.5 + (Math.sin(state.elapsed + i) + 1) * 0.4);
        });
        this.leafChips.forEach((leaf, i) => {
            leaf.visible = !reducedMotion && hitAge >= 0 && hitAge < 1.15;
            const side = i % 2 ? 1 : -1;
            leaf.position.set(vineLayout.x + ((i % 6) - 2.5) * 0.32 + side * hitAge * 0.55, Math.max(0.045, 2.3 - (i % 3) * 0.5 + hitAge * 0.3 - hitAge * hitAge * 3), vineLayout.z + 0.1 + hitAge * 0.5);
            leaf.rotation.set(hitAge * 4 + i, hitAge * 3, hitAge * 2);
            leaf.scale.setScalar(Math.min(1, Math.max(0, (1.15 - hitAge) * 5)));
        });
        const reveal = Math.max(0, Math.min(1, (state.hollow.progress - 0.48) / 0.52));
        this.bag.position.set(0, 0.55 * (1 - reveal) + Math.sin(reveal * Math.PI) * 0.3, 0.15 + reveal * 0.95);
        this.bag.rotation.z = Math.sin(reveal * Math.PI) * 0.12;
        this.bag.visible =
            (reveal > 0 && state.hollow.claimedAt !== null) ||
                (state.hollow.phase === 'searching' && reveal > 0);
    }
    async load() {
        await this.sprites.load();
    }
    face(camera) {
        this.sprites.face(camera);
    }
    dispose() {
        this.sprites.dispose();
        this.ownedGeometries.forEach((g) => g.dispose());
        this.veilMaterial.dispose();
    }
}
