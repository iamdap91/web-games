import * as THREE from 'three';
import { resourceLayers } from '../../rendering/surface-types.js';
import { obstacleTypes } from './world.js';
const popDuration = 0.25;
const attractStart = 0.35;
const collectDuration = 0.5;
/** 획득한 재료가 튀어나와 이동 중인 아타호에게 모이는 연출을 소유한다. */
export class HarvestDrops {
    resources;
    group = new THREE.Group();
    cube = new THREE.BoxGeometry(1, 1, 1);
    stone = new THREE.DodecahedronGeometry(0.22, 0);
    drops = [];
    destination = new THREE.Vector3();
    constructor(resources) {
        this.resources = resources;
    }
    spawn(impact) {
        if (!impact.removed)
            return;
        this.scatter({
            type: 'pickup',
            id: impact.id,
            x: impact.x,
            z: impact.z,
            material: impact.kind === 'rock' ? 'stone' : 'wood',
            amount: obstacleTypes[impact.kind].reward,
        }, 0.55);
    }
    collect(pickup) {
        this.scatter(pickup, 0.15);
    }
    scatter(pickup, height) {
        for (let i = 0; i < pickup.amount; i++) {
            const mesh = this.createDrop(pickup.material);
            const angle = pickup.id * 2.4 + i * 2.1 + (pickup.material === 'stone' ? 1 : 0);
            const origin = new THREE.Vector3(pickup.x, height, pickup.z);
            const landing = new THREE.Vector3(pickup.x + Math.cos(angle) * 0.48, 0.32, pickup.z + Math.sin(angle) * 0.48);
            mesh.position.copy(origin);
            mesh.rotation.y = angle;
            mesh.visible = i === 0;
            this.group.add(mesh);
            this.drops.push({ mesh, origin, landing, age: -i * 0.07 });
        }
    }
    createDrop(kind) {
        const group = new THREE.Group();
        if (kind === 'stone') {
            const mesh = new THREE.Mesh(this.stone, this.resources.material('stone', 0xc3bda6));
            mesh.scale.set(1.15, 0.9, 1);
            group.add(mesh);
        }
        else {
            const log = new THREE.Mesh(this.cube, this.resources.material('wood', 0x916239));
            log.scale.set(0.45, 0.23, 0.23);
            group.add(log);
            for (const side of [-1, 1]) {
                const end = new THREE.Mesh(this.cube, this.resources.material('wood', 0xe4c184));
                end.scale.set(0.025, 0.18, 0.18);
                end.position.x = side * 0.225;
                group.add(end);
            }
        }
        group.traverse((object) => object.layers.set(resourceLayers.effects));
        return group;
    }
    update(dt, actor) {
        this.destination.copy(actor);
        this.destination.y += 0.65;
        for (let i = this.drops.length - 1; i >= 0; i--) {
            const drop = this.drops[i];
            drop.age += dt;
            if (drop.age >= attractStart + collectDuration) {
                drop.mesh.removeFromParent();
                this.drops.splice(i, 1);
                continue;
            }
            drop.mesh.visible = drop.age >= 0;
            if (drop.age < 0)
                continue;
            if (drop.age < attractStart) {
                const progress = Math.min(1, drop.age / popDuration);
                drop.mesh.position.lerpVectors(drop.origin, drop.landing, progress);
                drop.mesh.position.y += Math.sin(progress * Math.PI) * 0.55;
            }
            else {
                const progress = (drop.age - attractStart) / collectDuration;
                const eased = progress * progress * (3 - 2 * progress);
                drop.mesh.position.lerpVectors(drop.landing, this.destination, eased);
                drop.mesh.position.y += Math.sin(progress * Math.PI) * 0.3;
                drop.mesh.scale.setScalar(1 - Math.max(0, progress - 0.8) * 3);
            }
            drop.mesh.rotation.z = drop.age * 3;
        }
    }
    get diagnostics() {
        return {
            count: this.drops.length,
            positions: this.drops.map(({ mesh }) => ({
                x: mesh.position.x,
                y: mesh.position.y,
                z: mesh.position.z,
            })),
        };
    }
    reset() {
        this.group.clear();
        this.drops.length = 0;
    }
    dispose() {
        this.reset();
        this.group.removeFromParent();
        this.cube.dispose();
        this.stone.dispose();
    }
}
