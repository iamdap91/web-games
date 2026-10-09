import * as THREE from 'three';
import { resourceLayers } from '../../rendering/surface-types.js';
import { groundSlamRules } from './ground-slam.js';
/** 준비 범위와 지면에 퍼지는 충격파·균열·먼지의 수명을 소유한다. */
export class GroundSlamScene {
    group = new THREE.Group();
    ringGeometry = new THREE.RingGeometry(0.97, 1, 72);
    waveGeometry = new THREE.RingGeometry(0.91, 1, 72);
    cube = new THREE.BoxGeometry(1, 1, 1);
    previewMaterial = this.material(0xffdc82, 0.3);
    waveMaterial = this.material(0xffedbc, 1);
    echoMaterial = this.material(0xe2b364, 0.7);
    crackMaterial = this.material(0x67573c, 0.7);
    dustMaterial = this.material(0xd9bf84, 0.85);
    preview = new THREE.Mesh(this.ringGeometry, this.previewMaterial);
    burst = new THREE.Group();
    wave = new THREE.Mesh(this.waveGeometry, this.waveMaterial);
    echo = new THREE.Mesh(this.waveGeometry, this.echoMaterial);
    cracks = new THREE.Group();
    dust = [];
    age = 10;
    elapsed = 0;
    constructor() {
        this.preview.rotation.x =
            this.wave.rotation.x =
                this.echo.rotation.x =
                    -Math.PI / 2;
        this.preview.scale.setScalar(groundSlamRules.radius);
        this.burst.add(this.wave, this.echo, this.cracks);
        this.group.add(this.preview, this.burst);
        for (let ray = 0; ray < 9; ray++) {
            const angle = (ray * Math.PI * 2) / 9;
            let x = Math.cos(angle) * 0.25;
            let z = Math.sin(angle) * 0.25;
            for (let segment = 0; segment < 3; segment++) {
                const bend = angle + (segment % 2 ? 0.18 : -0.14);
                const length = groundSlamRules.radius * (0.2 + (ray % 3) * 0.025);
                const dx = Math.cos(bend) * length;
                const dz = Math.sin(bend) * length;
                const crack = new THREE.Mesh(this.cube, this.crackMaterial);
                crack.position.set(x + dx / 2, 0.005, z + dz / 2);
                crack.scale.set(length, 0.015, 0.055 - segment * 0.01);
                crack.rotation.y = -bend;
                this.cracks.add(crack);
                x += dx;
                z += dz;
            }
        }
        for (let i = 0; i < 28; i++) {
            const particle = new THREE.Mesh(this.cube, this.dustMaterial);
            this.burst.add(particle);
            this.dust.push(particle);
        }
        this.group.traverse((object) => object.layers.set(resourceLayers.effects));
    }
    material(color, opacity) {
        return new THREE.MeshBasicMaterial({
            color,
            opacity,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
        });
    }
    strike(origin, elevation) {
        this.age = 0;
        this.burst.position.set(origin.x, elevation + 0.055, origin.z);
    }
    update(state, player, elevation, dt) {
        this.elapsed += dt;
        this.age += dt;
        const preparing = !!state.action && state.action.elapsed < groundSlamRules.impactTime;
        this.preview.visible = state.ready || preparing;
        const center = state.action?.origin ?? player;
        this.preview.position.set(center.x, elevation + 0.045, center.z);
        this.previewMaterial.opacity = preparing
            ? 0.65
            : 0.22 + Math.sin(this.elapsed * 3) * 0.06;
        this.burst.visible = this.age < 0.85;
        if (!this.burst.visible)
            return;
        const wave = Math.min(1, this.age / 0.28);
        this.wave.scale.setScalar(0.22 + (groundSlamRules.radius - 0.22) * (1 - (1 - wave) ** 2));
        this.waveMaterial.opacity = Math.max(0, 1 - this.age / 0.42);
        this.echo.scale.setScalar(Math.max(0.01, this.wave.scale.x * 0.84));
        this.echoMaterial.opacity = Math.max(0, 0.8 - this.age / 0.65);
        this.cracks.scale.setScalar(0.3 + Math.min(1, this.age / 0.12) * 0.7);
        this.crackMaterial.opacity = Math.min(0.8, Math.max(0, (0.85 - this.age) * 2));
        this.dustMaterial.opacity = Math.max(0, 0.8 - this.age);
        for (let i = 0; i < this.dust.length; i++) {
            const mesh = this.dust[i];
            const angle = i * 2.4;
            const distance = 0.25 + this.age * (3 + (i % 4));
            mesh.position.set(Math.cos(angle) * distance, Math.max(0.03, this.age * (2.2 + (i % 3)) - 5 * this.age ** 2), Math.sin(angle) * distance);
            mesh.rotation.set(this.age * 4, angle, this.age * 3);
            const size = (0.09 + (i % 3) * 0.04) * Math.min(1, (0.85 - this.age) * 5);
            mesh.scale.set(size * 1.5, size, size);
        }
    }
    get shake() {
        return this.age < 0.28
            ? Math.sin(this.age * 95) * 0.17 * (1 - this.age / 0.28)
            : 0;
    }
    reset() {
        this.age = 10;
        this.elapsed = 0;
        this.preview.visible = this.burst.visible = false;
    }
    dispose() {
        this.group.removeFromParent();
        for (const geometry of [this.ringGeometry, this.waveGeometry, this.cube])
            geometry.dispose();
        for (const material of [
            this.previewMaterial,
            this.waveMaterial,
            this.echoMaterial,
            this.crackMaterial,
            this.dustMaterial,
        ])
            material.dispose();
    }
}
