import * as THREE from 'three';
const flightLifetime = 0.28;
const deathLifetime = 0.36;
/** 준비·이동·사망 포자의 수명과 정리만 소유한다. */
export class MushroomSpores {
    group = new THREE.Group();
    geometry = new THREE.BoxGeometry(0.065, 0.065, 0.065);
    prepareMaterial = new THREE.MeshBasicMaterial({
        color: 0x9becce,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
    });
    flightMaterial = this.prepareMaterial.clone();
    deathMaterial = this.prepareMaterial.clone();
    preparation = this.particles(6, this.prepareMaterial, 'mushroom-prepare');
    flight = this.particles(6, this.flightMaterial, 'mushroom-heal');
    death = this.particles(5, this.deathMaterial, 'mushroom-death');
    elapsed = 0;
    preparationTime = 0;
    target = null;
    flightAge = 0;
    dead = false;
    deathAge = 0;
    constructor() {
        this.flightMaterial.color.setHex(0xc1ffe1);
        this.group.add(this.preparation, this.flight, this.death);
        this.reset();
    }
    particles(count, material, name) {
        const group = new THREE.Group();
        group.name = name;
        for (let i = 0; i < count; i++) {
            const mesh = new THREE.Mesh(this.geometry, material);
            mesh.layers.set(1);
            group.add(mesh);
        }
        return group;
    }
    cast(target) {
        if (this.dead)
            return;
        this.target = { ...target };
        this.flightAge = 0;
        this.preparationTime = 0;
        this.preparation.visible = false;
    }
    render(options) {
        const dt = Number.isFinite(options.dt) ? Math.max(0, options.dt) : 0;
        this.elapsed += dt;
        if (!options.alive) {
            this.preparation.visible = this.flight.visible = false;
            this.target = null;
            this.preparationTime = 0;
            this.deathAge = this.dead ? this.deathAge + dt : 0;
            this.dead = true;
            this.death.visible =
                !options.reducedMotion && this.deathAge < deathLifetime;
            if (this.death.visible)
                this.renderDeath();
            return;
        }
        this.death.visible = false;
        this.preparation.visible = options.preparing;
        if (options.preparing) {
            this.preparationTime += dt;
            const time = options.reducedMotion ? 0 : this.elapsed;
            const radius = options.reducedMotion
                ? 0.3
                : 0.32 + Math.max(0, 1 - this.preparationTime / 0.4) * 0.3;
            this.preparation.children.forEach((particle, i) => {
                const angle = time * 0.8 + (i * Math.PI) / 3;
                particle.visible = !options.reducedMotion || i % 2 === 0;
                particle.position.set(Math.cos(angle) * radius, 1.05 + Math.sin(angle) * 0.22, 0.06);
                particle.scale.setScalar(1);
            });
        }
        else
            this.preparationTime = 0;
        if (!options.healing)
            this.target = null;
        this.flight.visible =
            options.healing &&
                this.target !== null &&
                (options.reducedMotion || this.flightAge < flightLifetime);
        if (!this.flight.visible || !this.target)
            return;
        if (options.reducedMotion) {
            this.flight.children.forEach((particle, i) => {
                particle.visible = i < 5;
                particle.position.set(i === 1 ? -0.12 : i === 2 ? 0.12 : 0, i === 3 ? 1.48 : i === 4 ? 1.24 : 1.36, 0.08);
                particle.scale.setScalar(1.25);
            });
        }
        else {
            this.flight.children.forEach((particle, i) => {
                const progress = Math.min(1, Math.max(0, (this.flightAge - i * 0.015) / 0.17));
                particle.visible = progress < 1;
                particle.position.set(this.target.x * progress + Math.sin(i * 2.4) * 0.08 * (1 - progress), 1.05 + Math.sin(progress * Math.PI) * 0.18, this.target.z * progress);
                particle.scale.setScalar(1.2);
            });
            this.flightAge += dt;
        }
    }
    renderDeath() {
        const progress = this.deathAge / deathLifetime;
        this.deathMaterial.opacity = (1 - progress) * 0.7;
        this.death.children.forEach((particle, i) => {
            const angle = (i * Math.PI * 2) / this.death.children.length;
            particle.position.set(Math.cos(angle) * (0.12 + progress * 0.45), 1 + Math.sin(angle) * progress * 0.18 - progress * progress * 0.25, Math.sin(angle) * progress * 0.12);
            particle.scale.setScalar(1 - progress * 0.5);
        });
    }
    reset() {
        this.elapsed = this.preparationTime = this.flightAge = this.deathAge = 0;
        this.target = null;
        this.dead = false;
        this.preparation.visible = this.flight.visible = this.death.visible = false;
    }
    dispose() {
        this.reset();
        this.group.clear();
        this.geometry.dispose();
        this.prepareMaterial.dispose();
        this.flightMaterial.dispose();
        this.deathMaterial.dispose();
    }
}
