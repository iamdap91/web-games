import * as THREE from 'three';
import { resourceLayers } from '../../rendering/surface-types.js';
/** 돌진 기류·발뒤 먼지·충돌 파열의 위치와 수명을 소유한다. */
export class RushScene {
    group = new THREE.Group();
    arcGeometry = this.createArc();
    streakGeometry = new THREE.ConeGeometry(0.055, 1, 3);
    dustGeometry = new THREE.IcosahedronGeometry(1, 0);
    ringGeometry = new THREE.RingGeometry(0.88, 1, 24);
    shardGeometry = new THREE.BoxGeometry(1, 1, 1);
    gold = this.material(0xffd986);
    white = this.material(0xfff8db);
    burstMaterial = this.material(0xffedb9);
    airflow = new THREE.Group();
    arcs = [];
    streaks = [];
    burst = new THREE.Group();
    ring = new THREE.Mesh(this.ringGeometry, this.burstMaterial);
    shards = [];
    dust = Array.from({ length: 28 }, () => {
        const mesh = new THREE.Mesh(this.dustGeometry, this.material(0xc5b28a));
        mesh.visible = false;
        mesh.layers.set(resourceLayers.effects);
        this.group.add(mesh);
        return {
            mesh,
            origin: new THREE.Vector3(),
            velocity: new THREE.Vector3(),
            age: 1,
            size: 0.1,
        };
    });
    clock = 0;
    strength = 0;
    reformAge = 1;
    wasActive = false;
    wasRecoiling = false;
    burstAge = 1;
    dustClock = 0;
    nextDust = 0;
    constructor() {
        // 기류는 몸 앞과 옆에만 두어 얼굴·몸 중심을 채우지 않는다.
        for (let i = 0; i < 3; i++) {
            const arc = new THREE.Mesh(this.arcGeometry, i === 1 ? this.white : this.gold);
            arc.position.y = 0.35 + i * 0.31;
            arc.scale.set(1 - i * 0.1, 1, 1 - i * 0.06);
            this.airflow.add(arc);
            this.arcs.push(arc);
        }
        for (const side of [-1, 1]) {
            for (let i = 0; i < 3; i++) {
                const streak = new THREE.Mesh(this.streakGeometry, i === 1 ? this.white : this.gold);
                streak.position.set(side * (0.65 + i * 0.065), 0.3 + i * 0.26, -0.22);
                streak.rotation.x = Math.PI / 2;
                this.airflow.add(streak);
                this.streaks.push(streak);
            }
        }
        this.burst.add(this.ring);
        for (let i = 0; i < 10; i++) {
            const shard = new THREE.Mesh(this.shardGeometry, this.burstMaterial);
            this.burst.add(shard);
            this.shards.push(shard);
        }
        for (const effect of [this.airflow, this.burst])
            effect.traverse((object) => object.layers.set(resourceLayers.effects));
        this.group.add(this.airflow, this.burst);
        this.reset();
    }
    material(color) {
        return new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            side: THREE.DoubleSide,
        });
    }
    createArc() {
        const points = [];
        const indices = [];
        const segments = 18;
        for (let i = 0; i <= segments; i++) {
            const angle = -1.35 + (i / segments) * 2.7;
            const width = Math.sin((i / segments) * Math.PI) * 0.065;
            for (const radius of [0.9 - width, 0.9])
                points.push(Math.sin(angle) * radius, 0, Math.cos(angle) * radius * 0.85);
            if (i < segments) {
                const vertex = i * 2;
                indices.push(vertex, vertex + 1, vertex + 2, vertex + 1, vertex + 3, vertex + 2);
            }
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
        geometry.setIndex(indices);
        return geometry;
    }
    strike(contact, aim, elevation) {
        this.burstAge = 0;
        this.burst.position.set(contact.x, elevation + 0.7, contact.z);
        this.burst.rotation.y = Math.atan2(aim.x, aim.z);
    }
    update(state, dt) {
        this.clock += dt;
        this.burstAge += dt;
        const { action, player, moving, elevation } = state;
        const recoiling = !!action?.recoil;
        if (action && (!this.wasActive || (this.wasRecoiling && !recoiling)))
            this.reformAge = 0;
        this.reformAge += dt;
        this.wasActive = !!action;
        this.wasRecoiling = recoiling;
        this.strength = action
            ? Math.min(1, this.strength + dt * 12)
            : Math.max(0, this.strength - dt * 8);
        this.airflow.visible = this.strength > 0;
        if (action) {
            this.airflow.position.set(player.x, elevation + 0.04, player.z);
            // 반동은 충돌 방향으로 접히고, 재출발 때 새 방향으로 펼쳐진다.
            const heading = action.recoil?.aim ?? action.heading;
            this.airflow.rotation.y = Math.atan2(heading.x, heading.z);
        }
        const reform = Math.min(1, this.reformAge / 0.14);
        const spread = recoiling
            ? 0.68 + (action?.recoil?.progress ?? 0) * 0.08
            : 0.76 + reform * 0.24;
        this.airflow.scale.setScalar(spread);
        const opacity = this.strength * (recoiling ? 0.25 : 0.86);
        this.gold.opacity = opacity * 0.7;
        this.white.opacity = opacity;
        for (let i = 0; i < this.arcs.length; i++) {
            const arc = this.arcs[i];
            arc.position.z = Math.sin(this.clock * 22 + i * 1.7) * 0.035;
        }
        for (let i = 0; i < this.streaks.length; i++) {
            const streak = this.streaks[i];
            const flow = (this.clock * 7 + i * 0.31) % 1;
            streak.position.z = -0.18 - flow * 0.52;
            streak.scale.y = (0.32 + flow * 0.45) * (recoiling ? 0.3 : 1);
        }
        this.updateDust(dt);
        if (action && moving && !recoiling && dt > 0) {
            this.dustClock += dt;
            while (this.dustClock >= 0.045) {
                this.dustClock -= 0.045;
                this.spawnDust(player, action.heading, elevation);
            }
        }
        else
            this.dustClock = 0;
        this.updateBurst();
    }
    spawnDust(player, heading, elevation) {
        const index = this.nextDust;
        const particle = this.dust[index];
        this.nextDust = (index + 1) % this.dust.length;
        const side = index % 2 ? 1 : -1;
        particle.origin.set(player.x - heading.x * 0.26 - heading.z * side * 0.19, elevation + 0.06, player.z - heading.z * 0.26 + heading.x * side * 0.19);
        particle.velocity.set(-heading.x * 0.8 - heading.z * side * 0.45, 0.55 + (index % 3) * 0.12, -heading.z * 0.8 + heading.x * side * 0.45);
        particle.age = 0;
        particle.size = 0.09 + (index % 3) * 0.02;
        particle.mesh.position.copy(particle.origin);
        particle.mesh.scale.setScalar(particle.size);
        particle.mesh.material.opacity = 0.55;
        particle.mesh.visible = true;
    }
    updateDust(dt) {
        for (const particle of this.dust) {
            particle.age += dt;
            particle.mesh.visible = particle.age < 0.42;
            if (!particle.mesh.visible)
                continue;
            const progress = particle.age / 0.42;
            particle.mesh.position
                .copy(particle.origin)
                .addScaledVector(particle.velocity, particle.age);
            particle.mesh.rotation.set(progress, progress * 2, progress * 0.7);
            particle.mesh.scale.setScalar(particle.size * (1 + progress * 1.4));
            particle.mesh.material.opacity = 0.55 * (1 - progress) ** 2;
        }
    }
    updateBurst() {
        this.burst.visible = this.burstAge < 0.24;
        if (!this.burst.visible)
            return;
        const progress = this.burstAge / 0.24;
        this.ring.scale.setScalar(0.18 + Math.sqrt(progress) * 0.7);
        this.burstMaterial.opacity = (1 - progress) ** 2;
        for (let i = 0; i < this.shards.length; i++) {
            const shard = this.shards[i];
            const angle = (i / this.shards.length) * Math.PI * 2;
            const radius = 0.3 + progress * 0.7;
            shard.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.65, -progress * 0.15);
            shard.rotation.z = angle;
            shard.scale.set(0.16 * (1 - progress), 0.035, 0.025);
        }
    }
    get diagnostics() {
        return {
            airflowVisible: this.airflow.visible,
            airflowAngle: this.airflow.rotation.y,
            airflowScale: this.airflow.scale.x,
            recoiling: this.wasRecoiling,
            dust: this.dust.filter(({ mesh }) => mesh.visible).length,
            burstVisible: this.burst.visible,
        };
    }
    reset() {
        this.clock = this.strength = this.dustClock = this.nextDust = 0;
        this.reformAge = this.burstAge = 1;
        this.wasActive = this.wasRecoiling = false;
        this.airflow.visible = this.burst.visible = false;
        for (const particle of this.dust) {
            particle.age = 1;
            particle.mesh.visible = false;
        }
    }
    dispose() {
        this.group.removeFromParent();
        for (const geometry of [
            this.arcGeometry,
            this.streakGeometry,
            this.dustGeometry,
            this.ringGeometry,
            this.shardGeometry,
        ])
            geometry.dispose();
        for (const material of [
            this.gold,
            this.white,
            this.burstMaterial,
            ...this.dust.map(({ mesh }) => mesh.material),
        ])
            material.dispose();
    }
}
