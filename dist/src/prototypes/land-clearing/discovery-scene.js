import { recolorClearingMaterial } from './clearing-palette.js';
import { treeFallAngle, treeFallDuration } from './tree-fall.js';
import * as THREE from 'three';
import { setResourceOutline, } from '../../rendering/environment-resources.js';
import { discoveryLayout, streamFill, } from './clearing-discovery.js';
import { resourceLayers, outlineGroups, } from '../../rendering/surface-types.js';
const tileWidth = (discoveryLayout.channel.maxX - discoveryLayout.channel.minX) / 36;
export function bridgeElevation(point, logs) {
    for (const log of logs) {
        if (!log.ready)
            continue;
        const dx = point.x - log.origin.x;
        const dz = point.z - log.origin.z;
        const along = dx * log.aim.x + dz * log.aim.z;
        const across = Math.abs(dx * log.aim.z - dz * log.aim.x);
        if (across < discoveryLayout.bridgeWidth * 0.65 &&
            along > 0 &&
            along < log.length)
            return 0.23 * Math.min(1, along / 0.45, (log.length - along) / 0.45);
    }
    return 0;
}
/** 물줄기·회복되는 물가·쓰러진 통나무를 진행 상태에 맞춰 그린다. */
export class DiscoveryScene {
    resources;
    group = new THREE.Group();
    cube = new THREE.BoxGeometry(1, 1, 1);
    logGeometry = new THREE.CylinderGeometry(1, 1, 1, 7).rotateZ(Math.PI / 2);
    disc = new THREE.CircleGeometry(1, 12);
    droplet = new THREE.DodecahedronGeometry(1, 0);
    materials = [
        new THREE.MeshLambertMaterial({ color: 0x68a8a3 }),
        new THREE.MeshLambertMaterial({ color: 0x70afaa }),
        new THREE.MeshBasicMaterial({ color: 0xc5f1df }),
        new THREE.MeshLambertMaterial({
            color: recolorClearingMaterial('grass', 0x829e5e),
        }),
        new THREE.MeshLambertMaterial({
            color: recolorClearingMaterial('grass', 0x8ca666),
        }),
    ];
    water = [];
    blooms = [];
    jets = [];
    spouts = [];
    butterflies = [];
    logs = new Map();
    seep = new THREE.Group();
    elapsed = 0;
    constructor(resources) {
        this.resources = resources;
        this.buildChannel();
        this.buildSpring();
        this.buildBanks();
    }
    mesh(geometry, material, parent = this.group) {
        const mesh = new THREE.Mesh(geometry, material);
        setResourceOutline(mesh, 'ground');
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    }
    buildChannel() {
        const { channel } = discoveryLayout;
        const bed = this.mesh(this.cube, this.resources.material('earth', 0x777260));
        bed.position.set(0, -0.22, channel.z);
        bed.scale.set(channel.maxX - channel.minX, 0.04, channel.halfWidth * 2);
        for (let i = 0; i < 36; i++) {
            const x = channel.minX + tileWidth * (i + 0.5);
            const water = this.mesh(this.cube, this.materials[0]);
            water.position.set(x, -0.09, channel.z);
            water.scale.set(tileWidth + 0.012, 0.035, channel.halfWidth * 2 - 0.07);
            water.visible = false;
            const foam = this.mesh(this.cube, this.materials[2]);
            foam.scale.set(0.22 + (i % 3) * 0.1, 0.014, 0.028);
            foam.visible = false;
            this.water.push({ x, water, foam });
            for (const side of [-1, 1]) {
                const pebble = this.mesh(this.droplet, this.resources.material('stone', i % 2 ? 0xaaa58b : 0x928b73));
                pebble.position.set(x + (i % 2) * 0.12, -0.035, channel.z + side * (channel.halfWidth - 0.05));
                pebble.scale.set(0.13, 0.08, 0.1);
                pebble.rotation.y = i * 1.7;
            }
        }
    }
    buildSpring() {
        const { source } = discoveryLayout;
        this.group.add(this.seep);
        for (let i = 0; i < 5; i++) {
            const drip = this.mesh(this.droplet, this.materials[1], this.seep);
            drip.scale.set(0.09, 0.11, 0.07);
            drip.position.set(source.x - 0.2 + i * 0.1, 0.12 + (i % 2) * 0.14, source.z + source.radius * 0.8);
        }
        for (let i = 0; i < 3; i++)
            this.spouts.push(this.mesh(this.cube, this.materials[i % 3]));
        for (let i = 0; i < 24; i++) {
            const jet = this.mesh(this.droplet, this.materials[i % 3]);
            jet.visible = false;
            this.jets.push(jet);
        }
    }
    flower(parent, color) {
        const stem = this.mesh(this.cube, this.resources.material('grass', 0x54804c), parent);
        stem.scale.set(0.035, 0.17, 0.035);
        stem.position.y = 0.085;
        const material = this.resources.material('grass', color);
        for (let i = 0; i < 3; i++) {
            const petal = this.mesh(this.cube, material, parent);
            const angle = (i * Math.PI * 2) / 3;
            petal.position.set(Math.cos(angle) * 0.06, 0.18, Math.sin(angle) * 0.06);
            petal.scale.set(0.12, 0.04, 0.1);
        }
    }
    buildBanks() {
        const { channel } = discoveryLayout;
        for (let i = 0; i < 32; i++) {
            const x = -10.4 + (i % 16) * 1.37;
            const side = i < 16 ? -1 : 1;
            const z = channel.z + side * (channel.halfWidth + 0.35 + (i % 3) * 0.07);
            const patch = this.mesh(this.disc, this.materials[3 + (i % 2)]);
            patch.rotation.x = -Math.PI / 2;
            patch.position.set(x, 0.019, z);
            patch.visible = false;
            const group = new THREE.Group();
            group.position.set(x + (i % 2) * 0.18, 0.025, z);
            this.flower(group, [0xf5e6b6, 0xe3b2b0, 0xeae9ce][i % 3]);
            this.group.add(group);
            group.visible = false;
            this.blooms.push({ x, group, patch });
        }
        for (let i = 0; i < 26; i++) {
            const angle = i * 2.4;
            const spread = 0.35 + Math.sqrt(i / 25) * 1.2;
            const x = 5.7 + Math.cos(angle) * spread;
            const group = new THREE.Group();
            group.position.set(x, 0.025, -7.05 + Math.sin(angle) * spread * 0.36);
            this.flower(group, i % 2 ? 0xffe8a3 : 0xffefda);
            this.group.add(group);
            const patch = this.mesh(this.disc, this.materials[4]);
            patch.rotation.x = -Math.PI / 2;
            patch.position.set(x, 0.015, group.position.z);
            this.blooms.push({ x, group, patch });
        }
        for (let i = 0; i < 6; i++) {
            const butterfly = this.mesh(this.cube, this.materials[2]);
            butterfly.visible = false;
            this.butterflies.push(butterfly);
        }
    }
    createLog(log) {
        const group = new THREE.Group();
        const timber = this.mesh(this.logGeometry, this.resources.material('wood', 0xa6804f), group);
        timber.scale.set(log.length, 0.2, discoveryLayout.bridgeWidth / 2);
        timber.position.set(log.length / 2, 0.03, 0);
        timber.castShadow = true;
        setResourceOutline(timber, 'tree');
        for (const end of [0, log.length]) {
            const cap = this.mesh(this.logGeometry, this.resources.material('wood', 0xd5b779), group);
            cap.scale.set(0.024, 0.17, discoveryLayout.bridgeWidth * 0.43);
            cap.position.set(end, 0.03, 0);
            setResourceOutline(cap, 'tree');
        }
        for (let i = 0; i < 4; i++) {
            const groove = this.mesh(this.cube, this.resources.material('wood', 0x785736), group);
            groove.scale.set(0.48 + (i % 2) * 0.2, 0.014, 0.025);
            groove.position.set(0.5 + i * 0.82, 0.239, (i % 2 ? 1 : -1) * 0.19);
            setResourceOutline(groove, 'tree');
        }
        const treeLayer = outlineGroups.find(({ id }) => id === 'tree').layer;
        group.traverse((object) => {
            object.layers.set(resourceLayers.environment);
            object.layers.enable(treeLayer);
        });
        this.group.add(group);
        this.logs.set(log.id, group);
        return group;
    }
    update(state, source, dt) {
        this.elapsed += dt;
        const age = state.springAge;
        this.seep.visible = age === null;
        this.seep.scale.y = 1 + (3 - source.health) * 0.35;
        for (const { x, water, foam } of this.water) {
            const fill = streamFill(x, age);
            water.visible = foam.visible = fill > 0;
            water.scale.x = (tileWidth + 0.012) * fill;
            const offset = (this.elapsed * 0.65 + x * 0.37) % 1;
            foam.position.set(x + (offset - 0.5) * tileWidth, -0.061, discoveryLayout.channel.z + Math.sin(x * 3) * 0.55);
            foam.scale.x = (0.22 + (Math.round(x + 12) % 3) * 0.1) * fill;
        }
        for (const { x, group, patch } of this.blooms) {
            const growth = streamFill(x, age === null ? null : age - 0.22);
            group.visible = patch.visible = growth > 0;
            group.scale.setScalar(growth);
            patch.scale.set(0.98 * growth, (0.44 + Math.sin(x * 3) * 0.06) * growth, 1);
        }
        for (const [i, spout] of this.spouts.entries()) {
            spout.visible = age !== null;
            if (age === null)
                continue;
            const burst = Math.max(0, 1 - age / 1.5);
            const height = burst * (1.3 + Math.sin(this.elapsed * 15 + i) * 0.2) + 0.08;
            spout.scale.set(0.09, height, 0.09);
            spout.position.set(discoveryLayout.source.x + (i - 1) * 0.09, -0.07 + height / 2, discoveryLayout.source.z);
        }
        for (const [i, jet] of this.jets.entries()) {
            jet.visible = age !== null;
            if (age === null)
                continue;
            const burst = Math.max(0, 1 - age / 1.65);
            const t = (this.elapsed * 0.8 + i / 24) % 1;
            const angle = i * 2.4;
            const spread = 0.16 + t * (0.9 * burst + 0.15);
            jet.position.set(discoveryLayout.source.x + Math.cos(angle) * spread, -0.02 + Math.sin(t * Math.PI) * (2.4 * burst + 0.16), discoveryLayout.source.z + Math.sin(angle) * spread);
            jet.scale.setScalar((0.055 + (i % 3) * 0.025) * (0.6 + burst));
        }
        for (const log of state.logs) {
            const mesh = this.logs.get(log.id) ?? this.createLog(log);
            mesh.visible = log.progress > 0.82;
            mesh.position.set(log.origin.x, 0, log.origin.z);
            mesh.rotation.set(0, -Math.atan2(log.aim.z, log.aim.x), Math.PI / 2 - treeFallAngle(log.progress * treeFallDuration), 'YXZ');
        }
        for (const [i, butterfly] of this.butterflies.entries()) {
            butterfly.visible = state.crossed && age !== null;
            const a = this.elapsed * 0.9 + i * 2.4;
            butterfly.position.set(5.7 + Math.cos(a) * 0.95, 0.5 + Math.sin(a * 1.7) * 0.17, -7.05 + Math.sin(a) * 0.48);
            butterfly.scale.set(0.15, 0.035, 0.06 + Math.abs(Math.sin(a * 14)) * 0.12);
            butterfly.rotation.y = -a;
        }
    }
    reset() {
        for (const log of this.logs.values())
            log.removeFromParent();
        this.logs.clear();
        this.elapsed = 0;
    }
    dispose() {
        this.reset();
        this.group.removeFromParent();
        this.cube.dispose();
        this.disc.dispose();
        this.logGeometry.dispose();
        this.droplet.dispose();
        this.materials.forEach((material) => material.dispose());
    }
}
