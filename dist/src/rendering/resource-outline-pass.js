import * as THREE from 'three';
import { FullScreenQuad, Pass } from 'three/addons/postprocessing/Pass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { normalizeOutlineSize, outlineGroups, resourceLayers, outlineSettings, } from './surface-types.js';
// 각 종류를 독립적으로 샘플링한 뒤 깊이가 가장 가까운 면을 선택한다.
// 가려진 바닥도 따로 보관해 큰 도트 사이로 빈 구멍이 생기지 않게 한다.
const samplingShader = `
  uniform vec2 screenSize;
  uniform float pixelRatio;
  uniform vec3 backgroundColor;
  ${outlineGroups
    .map((_, i) => `
    uniform sampler2D outlineColor${i};
    uniform sampler2D outlineDepth${i};
    uniform float outlineSize${i};
  `)
    .join('')}

  struct OutlineSample {
    vec3 color;
    float depth;
    float smoothness;
  };

  vec2 outlineUv(vec2 uv, float size) {
    float cell = max(1.0, size * pixelRatio);
    vec2 sampleUv = (floor(uv * screenSize / cell) + 0.5) * cell / screenSize;
    return clamp(sampleUv, 0.5 / screenSize, 1.0 - 0.5 / screenSize);
  }

  OutlineSample sampleOutlines(vec2 uv) {
    OutlineSample result;
    result.color = backgroundColor;
    result.depth = 1.0;
    result.smoothness = 1.0;
    ${outlineGroups
    .map((_, i) => `
      {
        vec2 sampleUv = outlineUv(uv, outlineSize${i});
        float depth = texture2D(outlineDepth${i}, sampleUv).r;
        if (depth < result.depth) {
          result.color = texture2D(outlineColor${i}, sampleUv).rgb;
          result.depth = depth;
          result.smoothness = clamp(1.0 - outlineSize${i}, 0.0, 1.0);
        }
      }
    `)
    .join('')}
    return result;
  }
`;
/** 종류별 그림·깊이와 윤곽 설정을 소유하고, 한 장면으로 합성한다. */
export class ResourceOutlinePass extends Pass {
    scene;
    camera;
    smoothingPass;
    layers = new Map();
    screenSize = new THREE.Vector2(1, 1);
    resolution = new THREE.Vector2(1, 1);
    pixelRatio = { value: 1 };
    clearColor = new THREE.Color();
    material;
    quad;
    constructor(scene, camera, backgroundColor) {
        super();
        this.scene = scene;
        this.camera = camera;
        const uniforms = {
            screenSize: { value: this.screenSize },
            pixelRatio: this.pixelRatio,
            backgroundColor: { value: backgroundColor },
        };
        for (const [index, group] of outlineGroups.entries()) {
            const target = new THREE.WebGLRenderTarget(1, 1, {
                minFilter: THREE.NearestFilter,
                magFilter: THREE.NearestFilter,
                type: THREE.HalfFloatType,
                depthTexture: new THREE.DepthTexture(1, 1, THREE.UnsignedIntType),
            });
            const pixelSize = {
                value: outlineSettings.defaultPixelSize,
            };
            this.layers.set(group.id, { channel: group.layer, target, pixelSize });
            uniforms[`outlineColor${index}`] = { value: target.texture };
            uniforms[`outlineDepth${index}`] = { value: target.depthTexture };
            uniforms[`outlineSize${index}`] = pixelSize;
        }
        this.material = new THREE.ShaderMaterial({
            uniforms,
            vertexShader: FXAAShader.vertexShader,
            fragmentShader: `
        varying vec2 vUv;
        ${samplingShader}
        void main() {
          OutlineSample selected = sampleOutlines(vUv);
          // 알파 채널은 다음 패스에서 사용할 윤곽 보정 강도다.
          gl_FragColor = vec4(selected.color, selected.smoothness);
        }
      `,
            depthTest: false,
            depthWrite: false,
        });
        this.quad = new FullScreenQuad(this.material);
        this.smoothingPass = new ShaderPass(new THREE.ShaderMaterial({
            uniforms: {
                ...uniforms,
                tDiffuse: { value: null },
                resolution: { value: this.resolution },
            },
            vertexShader: FXAAShader.vertexShader,
            fragmentShader: FXAAShader.fragmentShader
                .replace('void main() {', `${samplingShader}\nvoid main() {`)
                .replace('gl_FragColor = ApplyFXAA( tDiffuse, resolution.xy, vUv );', `
            vec4 source = texture2D(tDiffuse, vUv);
            float smoothness = source.a;
            // 큰 도트와 맞닿은 배경까지 흐려지지 않도록 주변의 보정 강도도 확인한다.
            smoothness = min(smoothness, texture2D(tDiffuse, vUv + vec2(resolution.x, 0.0)).a);
            smoothness = min(smoothness, texture2D(tDiffuse, vUv - vec2(resolution.x, 0.0)).a);
            smoothness = min(smoothness, texture2D(tDiffuse, vUv + vec2(0.0, resolution.y)).a);
            smoothness = min(smoothness, texture2D(tDiffuse, vUv - vec2(0.0, resolution.y)).a);
            vec3 color = source.rgb;
            if (smoothness > 0.0) {
              color = mix(color, ApplyFXAA(tDiffuse, resolution, vUv).rgb, smoothness);
            }
            gl_FragColor = vec4(color, 1.0);
            // 합성한 도트 윤곽의 깊이를 남겨 이후 아타호도 같은 가림 기준을 사용한다.
            gl_FragDepth = sampleOutlines(vUv).depth;
          `),
            depthTest: true,
            depthWrite: true,
            depthFunc: THREE.AlwaysDepth,
        }));
    }
    setPixelSize(kind, value) {
        this.layers.get(kind).pixelSize.value = normalizeOutlineSize(value);
    }
    setPixelRatio(value) {
        this.pixelRatio.value = value;
    }
    setSize(width, height) {
        const w = Math.max(1, Math.floor(width));
        const h = Math.max(1, Math.floor(height));
        this.screenSize.set(w, h);
        this.resolution.set(1 / w, 1 / h);
        for (const { target } of this.layers.values())
            target.setSize(w, h);
    }
    render(renderer, writeBuffer) {
        const mask = this.camera.layers.mask;
        const background = this.scene.background;
        const alpha = renderer.getClearAlpha();
        renderer.getClearColor(this.clearColor);
        this.scene.background = null;
        renderer.setClearColor(0x000000, 0);
        try {
            // 장면 소유자가 요청한 그림자를 모든 오브젝트로 한 번 만든 뒤 각 종류가 공유한다.
            if (renderer.shadowMap.needsUpdate) {
                this.camera.layers.set(resourceLayers.environment);
                renderer.setRenderTarget(this.layers.get('ground').target);
                renderer.render(this.scene, this.camera);
            }
            for (const { channel, target } of this.layers.values()) {
                this.camera.layers.set(channel);
                renderer.setRenderTarget(target);
                renderer.render(this.scene, this.camera);
            }
            renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
            this.quad.render(renderer);
        }
        finally {
            this.camera.layers.mask = mask;
            this.scene.background = background;
            renderer.setClearColor(this.clearColor, alpha);
        }
    }
    dispose() {
        for (const { target } of this.layers.values())
            target.dispose();
        this.material.dispose();
        this.quad.dispose();
        this.smoothingPass.dispose();
    }
}
