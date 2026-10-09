import * as THREE from 'three';
import { setResourceOutline, } from '../../rendering/environment-resources.js';
import { resourceLayers } from '../../rendering/surface-types.js';
import { streamLootRules } from './stream-loot.js';
/** 떠내려오는 물건과 상자 파편을 표시하며 획득 규칙은 월드에 맡긴다. */
export class StreamLootScene {
    resources;
    group = new THREE.Group();
    cube = new THREE.BoxGeometry(1, 1, 1);
    rippleGeometry = new THREE.RingGeometry(0.85, 1, 24);
    rippleMaterial = new THREE.MeshBasicMaterial({
        color: 0xc8e4cb,
        transparent: true,
        opacity: 0.48,
        depthWrite: false,
        side: THREE.DoubleSide,
    });
    items = new Map();
    splinters = [];
    elapsed = 0;
    constructor(resources) {
        this.resources = resources;
    }
    plank(group, size, position, color) {
        const mesh = new THREE.Mesh(this.cube, this.resources.material('wood', color));
        mesh.scale.set(...size);
        mesh.position.set(...position);
        setResourceOutline(mesh, 'box');
        group.add(mesh);
        return mesh;
    }
    create(item) {
        const group = new THREE.Group();
        const model = new THREE.Group();
        group.add(model);
        if (item.kind === 'crate') {
            const width = streamLootRules.crateRadius * 2;
            this.plank(model, [width, 0.58, width], [0, 0.16, 0], 0xbd955d);
            for (const y of [-0.05, 0.37]) {
                for (const side of [-1, 1]) {
                    this.plank(model, [width + 0.02, 0.09, 0.04], [0, y, (side * width) / 2], 0x715032);
                    this.plank(model, [0.04, 0.09, width], [(side * width) / 2, y, 0], 0x715032);
                }
            }
            for (const z of [-1, 1]) {
                const brace = this.plank(model, [0.08, 0.67, 0.035], [0, 0.16, z * (width / 2 + 0.015)], 0x8c663d);
                brace.rotation.z = -0.75;
            }
            for (const x of [-0.19, 0.19])
                this.plank(model, [0.025, 0.015, width], [x, 0.458, 0], 0x715032);
        }
        else {
            this.plank(model, [0.76, 0.14, 0.16], [0, 0.01, 0], 0xa67a48);
            for (const side of [-1, 1]) {
                const twig = this.plank(model, [0.3, 0.075, 0.075], [side * 0.14, 0.025, side * 0.12], 0xb58b51);
                twig.rotation.y = -0.8;
                this.plank(model, [0.02, 0.12, 0.13], [side * 0.38, 0.01, 0], 0xe6c88a);
            }
        }
        const ripple = new THREE.Mesh(this.rippleGeometry, this.rippleMaterial);
        ripple.rotation.x = -Math.PI / 2;
        ripple.position.y = -0.065;
        ripple.scale.set(0.54, 0.26, 1);
        setResourceOutline(ripple, 'ground');
        group.add(ripple);
        this.items.set(item.id, group);
        this.group.add(group);
        return group;
    }
    open(point) {
        for (let i = 0; i < 8; i++) {
            const mesh = new THREE.Mesh(this.cube, this.resources.material('wood', i % 2 ? 0xbd955d : 0x715032));
            mesh.layers.set(resourceLayers.effects);
            mesh.scale.set(0.25, 0.055, 0.1);
            const angle = i * 2.4;
            const origin = new THREE.Vector3(point.x, 0.3, point.z);
            mesh.position.copy(origin);
            this.group.add(mesh);
            this.splinters.push({
                mesh,
                origin,
                velocity: new THREE.Vector3(Math.cos(angle) * 1.2, 1.5 + (i % 3) * 0.4, Math.sin(angle) * 1.2),
                age: 0,
            });
        }
    }
    update(items, dt) {
        this.elapsed += dt;
        for (const [id, mesh] of this.items)
            if (!items.some((item) => item.id === id)) {
                mesh.removeFromParent();
                this.items.delete(id);
            }
        for (const item of items) {
            const mesh = this.items.get(item.id) ?? this.create(item);
            mesh.position.set(item.x, 0, item.z);
            const model = mesh.children[0];
            const phase = this.elapsed * 2.5 + item.id * 1.7;
            model.position.y = Math.sin(phase) * 0.025;
            model.rotation.set(Math.sin(phase) * 0.04, Math.sin(phase * 0.35) * 0.2 + item.id * 0.4, Math.cos(phase) * 0.04);
        }
        for (let i = this.splinters.length - 1; i >= 0; i--) {
            const splinter = this.splinters[i];
            splinter.age += dt;
            if (splinter.age >= 0.6) {
                splinter.mesh.removeFromParent();
                this.splinters.splice(i, 1);
                continue;
            }
            const age = splinter.age;
            splinter.mesh.position
                .copy(splinter.origin)
                .addScaledVector(splinter.velocity, age);
            splinter.mesh.position.y -= 4 * age * age;
            splinter.mesh.rotation.set(age * 4, age * 3, age * 5);
            const shrink = Math.min(1, (0.6 - age) * 5);
            splinter.mesh.scale.set(0.25 * shrink, 0.055 * shrink, 0.1 * shrink);
        }
    }
    reset() {
        this.group.clear();
        this.items.clear();
        this.splinters.length = 0;
        this.elapsed = 0;
    }
    dispose() {
        this.reset();
        this.group.removeFromParent();
        this.cube.dispose();
        this.rippleGeometry.dispose();
        this.rippleMaterial.dispose();
    }
}
