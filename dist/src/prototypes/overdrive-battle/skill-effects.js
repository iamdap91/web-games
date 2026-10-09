import * as THREE from 'three';
import { sweepRadius } from './battle-skills.js';
/** 일반 기술의 짧은 접촉 궤적만 소유하며, 금빛 오버드라이브와 구분한다. */
export class SkillEffects {
    group = new THREE.Group();
    material = new THREE.MeshBasicMaterial({
        color: 0xc3fff0,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
    });
    sweep = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 48, 1, 0, Math.PI * 1.5), this.material);
    kick = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.3, 4), this.material);
    age = 1;
    impact = null;
    constructor() {
        this.sweep.rotation.x = -Math.PI / 2;
        this.sweep.layers.set(1);
        this.kick.layers.set(1);
        this.group.add(this.sweep, this.kick);
        this.group.visible = false;
    }
    addImpacts(impacts) {
        const impact = impacts.find((item) => item.technique === 'sweep' || item.technique === 'kick');
        if (!impact)
            return;
        this.impact = impact;
        this.age = 0;
    }
    render(dt, reducedMotion) {
        const impact = this.impact;
        this.group.visible = !!impact && this.age < 0.3 && !reducedMotion;
        if (impact && this.group.visible) {
            const progress = this.age / 0.3;
            const center = impact.areaCenter ?? impact;
            this.group.position.set(center.x, 0.8, center.z);
            this.material.opacity = (1 - progress) * 0.8;
            this.sweep.visible = impact.technique === 'sweep';
            this.kick.visible = !this.sweep.visible;
            this.sweep.rotation.z = progress * Math.PI * 1.7;
            this.sweep.scale.setScalar(sweepRadius * (0.85 + progress * 0.15));
            this.kick.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(impact.aim.x, 0, impact.aim.z));
            this.kick.position.set(impact.aim.x * progress * 0.6, 0, impact.aim.z * progress * 0.6);
            this.kick.scale.setScalar(1 - progress * 0.4);
        }
        this.age += dt;
    }
    reset() {
        this.impact = null;
        this.age = 1;
        this.group.visible = false;
    }
    dispose() {
        this.sweep.geometry.dispose();
        this.kick.geometry.dispose();
        this.material.dispose();
    }
}
