import * as THREE from 'three';
const trail = {
    interval: 0.04,
    lifetime: 0.42,
    opacity: 0.68,
};
function silhouetteMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: {
            map: { value: null },
            opacity: { value: 0 },
            color: { value: new THREE.Color(0xffc35d) },
            outlineColor: { value: new THREE.Color(0x18385e) },
            texelSize: { value: new THREE.Vector2() },
        },
        vertexShader: `
      varying vec2 spriteUv;
      void main() {
        spriteUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
        fragmentShader: `
      uniform sampler2D map;
      uniform float opacity;
      uniform vec3 color;
      uniform vec3 outlineColor;
      uniform vec2 texelSize;
      varying vec2 spriteUv;
      float alphaAt(vec2 uv) {
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0;
        return texture2D(map, uv).a;
      }
      void main() {
        float alpha = alphaAt(spriteUv);
        if (alpha < 0.5) discard;
        float innerAlpha = min(
          min(alphaAt(spriteUv + vec2(texelSize.x, 0.0)),
              alphaAt(spriteUv - vec2(texelSize.x, 0.0))),
          min(alphaAt(spriteUv + vec2(0.0, texelSize.y)),
              alphaAt(spriteUv - vec2(0.0, texelSize.y)))
        );
        vec3 ink = mix(outlineColor, color, step(0.5, innerAlpha));
        gl_FragColor = vec4(ink, alpha * opacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
    });
}
/** 아타호 윤곽·입자·이전 모션 잔상의 수명과 정리를 담당한다. */
export class OverdriveAura {
    group;
    sprite;
    glow;
    ghosts;
    plume = new THREE.Mesh(new THREE.PlaneGeometry(2.65, 3.6).translate(0, 1.72, -0.04), new THREE.ShaderMaterial({
        uniforms: {
            power: { value: 0 },
            time: { value: 0 },
            rage: { value: 0 },
        },
        vertexShader: `
        varying vec2 auraUv;
        void main() {
          auraUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
        fragmentShader: `
        uniform float power;
        uniform float time;
        uniform float rage;
        varying vec2 auraUv;
        void main() {
          vec2 p = floor(auraUv * vec2(60.0, 84.0)) / vec2(60.0, 84.0);
          float edge = 0.2 + (1.0 - p.y) * 0.58
            + sin(p.y * 24.0 - time * 7.0) * 0.07
            + sin(p.y * 43.0 + time * 4.0) * 0.035;
          float body = 1.0 - smoothstep(edge - 0.13, edge, abs(p.x - 0.5) * 2.0);
          float fade = smoothstep(0.0, 0.08, p.y) * (1.0 - smoothstep(0.72, 1.0, p.y));
          vec3 color = mix(vec3(1.0, 0.31, 0.035), vec3(1.0, 0.79, 0.3), 1.0 - p.y);
          vec3 rageColor = mix(vec3(0.65, 0.015, 0.09), vec3(1.0, 0.2, 0.3), 1.0 - p.y);
          color = mix(color, rageColor, rage);
          gl_FragColor = vec4(color, body * fade * power * 0.38);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
    }));
    particles = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({
        color: 0xffc65c,
        size: 3,
        sizeAttenuation: false,
        transparent: true,
        depthWrite: false,
    }));
    particlePositions = new Float32Array(8 * 3);
    elapsed = 0;
    strength = 0;
    sampleTime = 0;
    nextGhost = 0;
    style = 'overdrive';
    constructor(group, sprite) {
        this.group = group;
        this.sprite = sprite;
        this.glow = new THREE.Mesh(sprite.geometry, silhouetteMaterial());
        this.glow.layers.set(1);
        this.glow.renderOrder = 1;
        this.glow.visible = false;
        this.plume.layers.set(1);
        this.plume.renderOrder = -1;
        this.plume.visible = false;
        this.ghosts = Array.from({ length: Math.ceil(trail.lifetime / trail.interval) }, () => {
            const mesh = new THREE.Mesh(sprite.geometry, silhouetteMaterial());
            mesh.layers.set(1);
            mesh.visible = false;
            mesh.material.uniforms.color.value = new THREE.Color(0xffd66b);
            this.group.add(mesh);
            return {
                mesh,
                origin: new THREE.Vector3(),
                age: 1,
                life: trail.lifetime,
                opacity: trail.opacity,
            };
        });
        this.particles.geometry.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
        this.particles.layers.set(1);
        this.particles.renderOrder = 3;
        this.particles.frustumCulled = false;
        this.particles.visible = false;
        this.group.add(this.plume, this.glow, this.particles);
        this.sprite.renderOrder = 2;
    }
    render(options) {
        const { power, reducedMotion, dt } = options;
        const attacking = options.trail === 'attack';
        const trailing = options.trail !== 'none';
        const interval = attacking ? 0.07 : trail.interval;
        const lifetime = attacking ? 0.12 : trail.lifetime;
        // 기술이 끝난 뒤 남은 잔광도 마지막 기술의 색으로 사라지게 한다.
        if (power > 0 && this.style !== options.style) {
            this.style = options.style;
            const rage = this.style === 'rage';
            this.glow.material.uniforms.color.value.setHex(rage ? 0xff435d : 0xffc35d);
            this.glow.material.uniforms.outlineColor.value.setHex(rage ? 0x321425 : 0x18385e);
            this.plume.material.uniforms.rage.value = Number(rage);
            this.particles.material.color.setHex(rage ? 0xff5269 : 0xffc65c);
        }
        this.elapsed += dt;
        this.strength += (power - this.strength) * Math.min(1, dt * 18);
        const pulse = reducedMotion ? 0.5 : 0.5 + Math.sin(this.elapsed * 7) * 0.5;
        this.glow.visible = this.strength > 0.01;
        this.plume.visible = this.strength > 0.01;
        this.plume.material.uniforms.power.value =
            this.strength * (attacking ? 0.6 : 1);
        this.plume.material.uniforms.time.value = reducedMotion ? 0 : this.elapsed;
        this.glow.geometry = this.sprite.geometry;
        this.glow.scale
            .copy(this.sprite.scale)
            .multiplyScalar(1.075 + pulse * 0.035);
        this.glow.material.uniforms.map.value = this.sprite.material.map;
        // 프레임마다 폭이 달라도 원본 도트 한 칸 두께로 대비색을 유지한다.
        const image = this.sprite.material.map?.image;
        if (image instanceof HTMLImageElement)
            this.glow.material.uniforms.texelSize.value.set(1 / image.naturalWidth, 1 / image.naturalHeight);
        this.glow.material.uniforms.opacity.value =
            this.strength * (0.5 + pulse * 0.2) * (attacking ? 0.75 : 1);
        this.sampleTime = trailing ? this.sampleTime + dt : interval;
        if (power > 0 &&
            trailing &&
            !reducedMotion &&
            dt > 0 &&
            this.sampleTime >= interval) {
            const ghost = this.ghosts[this.nextGhost];
            this.nextGhost = (this.nextGhost + 1) % this.ghosts.length;
            this.sampleTime %= interval;
            ghost.age = 0;
            ghost.life = lifetime;
            ghost.opacity = attacking ? 0.32 : trail.opacity;
            ghost.origin.copy(this.group.position);
            ghost.mesh.geometry = this.sprite.geometry;
            ghost.mesh.scale.copy(this.sprite.scale);
            ghost.mesh.material.uniforms.map.value = this.sprite.material.map;
            ghost.mesh.material.uniforms.color.value.setHex(this.style === 'rage' ? 0xff6579 : 0xffd66b);
            ghost.mesh.material.uniforms.outlineColor.value.copy(this.glow.material.uniforms.outlineColor.value);
            ghost.mesh.material.uniforms.texelSize.value.copy(this.glow.material.uniforms.texelSize.value);
        }
        for (const ghost of this.ghosts) {
            ghost.age += dt;
            // 공격 전 잔상도 짧게 정리하고, 공격이 끝났다고 다시 나타나지 않게 한다.
            if (attacking) {
                ghost.life = Math.min(ghost.life, lifetime);
                ghost.opacity = Math.min(ghost.opacity, 0.32);
            }
            ghost.mesh.visible =
                !reducedMotion && ghost.age < ghost.life && this.strength > 0.01;
            ghost.mesh.position.copy(ghost.origin).sub(this.group.position);
            // 오래된 잔상부터 그려 최근 모션과 본체의 윤곽이 선명하게 남게 한다.
            ghost.mesh.renderOrder = -2 - ghost.age;
            ghost.mesh.material.uniforms.opacity.value =
                Math.pow(Math.max(0, 1 - ghost.age / ghost.life), 1.25) *
                    this.strength *
                    ghost.opacity;
        }
        this.particles.visible = !reducedMotion && this.strength > 0.01;
        this.particles.material.opacity = this.strength * 0.75;
        for (let i = 0; i < 8; i++) {
            const rise = (i / 8 + this.elapsed * 0.65) % 1;
            this.particlePositions[i * 3] =
                Math.sin(i * 2.4 + this.elapsed * 2) * (0.65 - rise * 0.25);
            this.particlePositions[i * 3 + 1] = rise * 2.8;
            this.particlePositions[i * 3 + 2] = 0.15;
        }
        this.particles.geometry.attributes.position.needsUpdate = true;
    }
    reset() {
        this.strength = this.elapsed = this.sampleTime = this.nextGhost = 0;
        this.glow.visible = this.particles.visible = false;
        this.plume.visible = false;
        this.ghosts.forEach((ghost) => {
            ghost.age = 1;
            ghost.mesh.visible = false;
        });
    }
    dispose() {
        // 윤곽과 잔상은 원본 스프라이트의 프레임 지오메트리를 공유한다.
        for (const mesh of [this.glow, ...this.ghosts.map((ghost) => ghost.mesh)]) {
            mesh.removeFromParent();
            mesh.material.dispose();
        }
        this.particles.removeFromParent();
        this.particles.geometry.dispose();
        this.particles.material.dispose();
        this.plume.removeFromParent();
        this.plume.geometry.dispose();
        this.plume.material.dispose();
    }
}
