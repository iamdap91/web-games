import { MapSpriteResources } from '../map-sprite-resources.js';
import * as THREE from 'three';
import { createPixelMaterial } from '../../../rendering/pixel-material.js';
import { resourceLayers } from '../../../rendering/surface-types.js';
import { townLifePose } from './town-life-pose.js';
import { townLifeLayout } from './town-life-layout.js';
import { townLifeTiming, } from '../../../games/tiger-rpg/town-life.js';
/** 마을 소품의 외형·파편·복구 보간만 소유한다. 진행과 행동 시각은 TownLife가 전달한다. */
export class TownLifeResources {
    root = new THREE.Group();
    sprites = new MapSpriteResources();
    workTraces = new THREE.Group();
    clearedTraces = new THREE.Group();
    freshAsh;
    cube = new THREE.BoxGeometry(1, 1, 1);
    rock = new THREE.DodecahedronGeometry(1, 0);
    cylinder = new THREE.CylinderGeometry(1, 1, 1, 9);
    materials = new Map();
    stones = new THREE.Group();
    wholeLog = new THREE.Group();
    splitLogs = new THREE.Group();
    carriedLog = new THREE.Group();
    food = new THREE.Group();
    dust = new THREE.Group();
    sparkleMaterial = new THREE.MeshBasicMaterial({
        color: 0xd1c4a1,
        transparent: true,
        opacity: 0,
        depthWrite: false,
    });
    constructor() {
        const layout = townLifeLayout;
        this.root.add(this.sprites.root, this.workTraces, this.clearedTraces);
        this.clearedTraces.visible = false;
        for (const stone of layout.path.stones) {
            const scrape = this.sprites.add('sawdust', {
                x: stone.x,
                z: stone.z,
                y: 0.065,
                width: 1.1,
                depth: 0.66,
                kind: 'ground',
                parent: this.clearedTraces,
            });
            scrape.material.color.setHex(0xd1c2a4);
        }
        this.sprites.add('sawdust', {
            x: layout.chop.x + 0.45,
            z: layout.chop.z,
            width: 0.72,
            depth: 0.48,
            kind: 'ground',
        });
        this.sprites.add('wood-chips', {
            x: layout.chop.x - 0.5,
            z: layout.chop.z + 0.3,
            width: 0.7,
            depth: 0.45,
            kind: 'ground',
            parent: this.workTraces,
        });
        this.workTraces.visible = false;
        this.sprites.add('ash', {
            x: layout.fire.x + 0.68,
            z: layout.fire.z + 0.68,
            width: 0.62,
            depth: 0.42,
            kind: 'ground',
        });
        this.freshAsh = this.sprites.add('ash', {
            x: layout.fire.x - 0.65,
            z: layout.fire.z + 0.5,
            width: 0.58,
            depth: 0.38,
            kind: 'ground',
        });
        this.freshAsh.visible = false;
        // 돌을 치운 뒤에도 같은 흙길을 쓰고 낮은 울타리가 통과할 틈을 드러낸다.
        this.mesh(this.root, this.cube, [-7.4, 0.022, 4], [4.8, 0.035, 1.9], 0xb9ab83);
        for (const rail of layout.path.rails) {
            this.mesh(this.root, this.cube, [rail.x, 0.28, rail.z], [0.13, 0.56, 0.13], 0x795c3e);
        }
        for (const z of [2.55, 5.55])
            this.mesh(this.root, this.cube, [-7.65, 0.38, z], [1.05, 0.12, 0.11], 0xa5885e);
        for (const [i, stone] of layout.path.stones.entries()) {
            const mesh = this.mesh(this.stones, this.rock, [stone.x, stone.radius * 0.65, stone.z], [stone.radius, stone.radius * 0.8, stone.radius], i % 2 ? 0x8b8e83 : 0x9c9b89);
            mesh.rotation.set(i * 0.4, i * 1.4, 0.3);
        }
        this.root.add(this.stones, this.wholeLog, this.splitLogs, this.carriedLog, this.food, this.dust);
        this.mesh(this.root, this.cylinder, [layout.chop.x, 0.23, layout.chop.z], [layout.chop.radius, 0.46, layout.chop.radius], 0x79573b);
        this.mesh(this.root, this.cylinder, [layout.chop.x, 0.465, layout.chop.z], [0.37, 0.018, 0.37], 0xcba46c);
        const log = this.mesh(this.wholeLog, this.cylinder, [0, 0, 0], [0.12, 0.65, 0.12], 0xb18856);
        log.rotation.z = Math.PI / 2;
        this.wholeLog.position.set(layout.chop.x, 0.61, layout.chop.z);
        for (const x of [-1, 1]) {
            const half = this.mesh(this.splitLogs, this.cube, [x * 0.13, 0, 0], [0.1, 0.12, 0.6], 0xceab75);
            half.rotation.y = x * 0.25;
        }
        this.splitLogs.position.copy(this.wholeLog.position);
        this.mesh(this.carriedLog, this.cube, [0, 0, 0], [0.12, 0.1, 0.55], 0xceab75);
        const bowl = this.mesh(this.root, this.cylinder, [layout.table.x, 1.02, layout.table.z + 0.24], [0.23, 0.15, 0.23], 0xd6c6a0);
        bowl.name = 'town-life-meal-bowl';
        this.mesh(this.food, this.rock, [0, 0, 0], [0.18, 0.09, 0.18], 0xefdeaf);
        this.food.position.set(layout.table.x, 1.11, layout.table.z + 0.24);
        for (let i = 0; i < 9; i++) {
            const mote = new THREE.Mesh(this.rock, this.sparkleMaterial);
            mote.layers.set(resourceLayers.effects);
            this.dust.add(mote);
        }
    }
    mesh(group, geometry, at, scale, color) {
        let material = this.materials.get(color);
        if (!material) {
            material = createPixelMaterial(color, {
                strength: { value: 0.25 },
                pattern: 'broad',
            });
            this.materials.set(color, material);
        }
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(...at);
        mesh.scale.set(...scale);
        mesh.castShadow = scale[1] > 0.08;
        mesh.receiveShadow = true;
        group.add(mesh);
        return mesh;
    }
    update(state, kitchenLevel) {
        const action = state.action;
        this.workTraces.visible = state.splitWood || state.warmth > 0;
        this.freshAsh.visible = state.warmth > 0;
        this.stones.visible = !state.repairs.path;
        this.clearedTraces.visible = state.repairs.path;
        this.wholeLog.visible = !state.splitWood;
        this.splitLogs.visible = state.splitWood;
        if (action?.kind === 'chop') {
            const scatter = Math.min(1, Math.max(0, (action.elapsed - townLifeTiming.chop.contact) / 0.23));
            for (const [i, half] of this.splitLogs.children.entries()) {
                half.position.x = (i ? 1 : -1) * (0.13 + scatter * 0.17);
                half.rotation.z = (i ? 1 : -1) * scatter * 0.3;
            }
        }
        this.carriedLog.visible =
            action?.kind === 'stoke' && action.elapsed < townLifeTiming.stoke.contact;
        if (action?.kind === 'stoke') {
            const actor = townLifePose(action);
            const side = action.origin.x > townLifeLayout.fire.x + 0.1 ? -1 : 1;
            const push = Math.max(0, Math.min(1, (action.elapsed - 0.42) / (townLifeTiming.stoke.contact - 0.42)));
            const blend = push * push * (3 - 2 * push);
            const hand = { x: actor.x + side * 0.25, z: actor.z - 0.13 };
            this.carriedLog.position.set(hand.x + (townLifeLayout.fire.x - hand.x) * blend, 0.68 - blend * 0.34, hand.z + (townLifeLayout.fire.z + 0.72 - hand.z) * blend);
            this.carriedLog.scale.setScalar(1 - blend * 0.4);
            this.carriedLog.rotation.y = Math.atan2(townLifeLayout.fire.x - hand.x, townLifeLayout.fire.z - hand.z);
        }
        this.food.visible = kitchenLevel > 0;
        this.food.scale.y =
            action?.kind === 'meal' ? Math.max(0.05, state.mealRemaining) : 1;
        if (state.mealRemaining < 0.01 && action?.kind === 'meal')
            this.food.visible = false;
        const impact = action?.kind === 'clear' || action?.kind === 'chop'
            ? action.elapsed - townLifeTiming[action.kind].contact
            : -1;
        const active = impact >= 0 && impact < 0.32;
        this.dust.visible = active;
        this.sparkleMaterial.opacity = active ? (1 - impact / 0.32) * 0.55 : 0;
        if (active && action) {
            const point = action.kind === 'clear' ? townLifeLayout.path : townLifeLayout.chop;
            for (const [i, mote] of this.dust.children.entries()) {
                const angle = i * 2.4;
                mote.position.set(point.x + Math.cos(angle) * impact * 3, 0.3 + Math.sin((impact / 0.32) * Math.PI) * 0.35, point.z + Math.sin(angle) * impact * 2);
                mote.scale.setScalar(0.06 + (i % 3) * 0.025);
            }
        }
    }
    async load() {
        await this.sprites.load();
    }
    face(camera) {
        this.sprites.face(camera);
    }
    dispose() {
        this.sprites.dispose();
        this.cube.dispose();
        this.rock.dispose();
        this.cylinder.dispose();
        this.sparkleMaterial.dispose();
        for (const material of this.materials.values())
            material.dispose();
        this.root.clear();
    }
}
