import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
/** 한 집의 겹친 벽·지붕을 합쳐서 35% 불투명도로 표시한다. */
export class HouseReveal {
    house;
    actor;
    camera;
    normalFrame = new THREE.FramebufferTexture(1, 1);
    openFrame = new THREE.FramebufferTexture(1, 1);
    raycaster = new THREE.Raycaster();
    amount = 0;
    occluded = false;
    material = new THREE.ShaderMaterial({
        depthTest: false,
        depthWrite: false,
        uniforms: {
            normalFrame: { value: this.normalFrame },
            openFrame: { value: this.openFrame },
            center: { value: new THREE.Vector2() },
            radius: { value: new THREE.Vector2(1, 1) },
            grid: { value: new THREE.Vector2(1, 1) },
            amount: { value: 0 },
        },
        vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
        fragmentShader: `
      uniform sampler2D normalFrame;
      uniform sampler2D openFrame;
      uniform vec2 center;
      uniform vec2 radius;
      uniform vec2 grid;
      uniform float amount;
      varying vec2 vUv;
      void main() {
        vec2 cell = (floor(vUv * grid) + 0.5) / grid;
        float edge = length((cell - center) / radius);
        float reveal = (1.0 - smoothstep(0.76, 1.0, edge)) * amount * 0.65;
        gl_FragColor = mix(texture2D(normalFrame, vUv), texture2D(openFrame, vUv), reveal);
      }
    `,
    });
    quad = new FullScreenQuad(this.material);
    constructor(house, actor, camera) {
        this.house = house;
        this.actor = actor;
        this.camera = camera;
    }
    update(dt) {
        this.actor.geometry.computeBoundingBox();
        const bounds = this.actor.geometry.boundingBox;
        const center = bounds.getCenter(new THREE.Vector3());
        const size = bounds.getSize(new THREE.Vector3());
        this.occluded = false;
        // 투명 여백 대신 머리·몸통·발 주변을 표본으로 확인한다.
        for (const x of [-0.45, 0, 0.45]) {
            for (const y of [0.22, 0.85, 1.5]) {
                const sample = this.actor.localToWorld(new THREE.Vector3(x, y, 0));
                const projected = sample.clone().project(this.camera);
                this.raycaster.setFromCamera(new THREE.Vector2(projected.x, projected.y), this.camera);
                this.raycaster.far = Math.max(0, this.raycaster.ray.origin.distanceTo(sample) - 0.001);
                if (this.raycaster.intersectObject(this.house, true).length) {
                    this.occluded = true;
                    break;
                }
            }
            if (this.occluded)
                break;
        }
        const target = this.occluded ? 1 : 0;
        this.amount += (target - this.amount) * (1 - Math.exp(-dt * 14));
        if (!this.occluded && this.amount < 0.002)
            this.amount = 0;
        const projectedCenter = this.actor
            .localToWorld(center.clone())
            .project(this.camera);
        const projectedEdge = this.actor
            .localToWorld(center.clone().add(new THREE.Vector3(size.x * 0.62, size.y * 0.64, 0)))
            .project(this.camera);
        this.material.uniforms.center.value.set((projectedCenter.x + 1) / 2, (projectedCenter.y + 1) / 2);
        this.material.uniforms.radius.value.set(Math.abs(projectedEdge.x - projectedCenter.x) / 2, Math.abs(projectedEdge.y - projectedCenter.y) / 2);
        this.material.uniforms.amount.value = this.amount;
    }
    render(renderer, renderView) {
        renderView();
        if (this.amount === 0)
            return;
        renderer.copyFramebufferToTexture(this.normalFrame);
        const visible = this.house.visible;
        try {
            this.house.visible = false;
            renderView();
            renderer.copyFramebufferToTexture(this.openFrame);
        }
        finally {
            this.house.visible = visible;
        }
        renderer.setRenderTarget(null);
        this.quad.render(renderer);
    }
    resize(width, height, pixelGrid) {
        this.normalFrame.dispose();
        this.openFrame.dispose();
        this.normalFrame = new THREE.FramebufferTexture(width, height);
        this.openFrame = new THREE.FramebufferTexture(width, height);
        this.material.uniforms.normalFrame.value = this.normalFrame;
        this.material.uniforms.openFrame.value = this.openFrame;
        this.material.uniforms.grid.value.copy(pixelGrid);
    }
    reset() {
        this.amount = 0;
        this.occluded = false;
    }
    get snapshot() {
        return {
            occluded: this.occluded,
            amount: this.amount,
            house: 'west-house',
        };
    }
    dispose() {
        this.normalFrame.dispose();
        this.openFrame.dispose();
        this.material.dispose();
        this.quad.dispose();
    }
}
