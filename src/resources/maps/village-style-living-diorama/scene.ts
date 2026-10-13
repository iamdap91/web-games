import * as THREE from 'three';
import { CourtyardLife } from './life.js';
import {
  TrailSprite,
  trailMotions,
} from '../../../games/tiger-rpg/trail-sprite.js';
import { SpriteTextures } from '../../../rendering/sprite-textures.js';
import { cardinalFacing } from '../../characters/ataho/facing.js';
import {
  groundHeight,
  livingDioramaRiver,
  type GroundPoint,
} from './layout.js';
import { LivingDioramaScenery } from './scenery.js';
import type { LivingDioramaSnapshot } from './visit.js';
import { backgroundKey, type LivingDioramaView } from './cache.js';

/** 정적 색·깊이를 저장하고 매 프레임 동적 인물/물/불과 합성한다. */
export class LivingDioramaScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly staticScene = new THREE.Scene();
  private readonly dynamicScene = new THREE.Scene();
  private readonly compositeScene = new THREE.Scene();
  private readonly compositeCamera = new THREE.OrthographicCamera(
    -1,
    1,
    1,
    -1,
    0,
    1,
  );
  private readonly camera = new THREE.OrthographicCamera(
    -16,
    16,
    12,
    -12,
    0.1,
    150,
  );
  private readonly cache = new THREE.WebGLRenderTarget(1, 1, {
    depthTexture: new THREE.DepthTexture(1, 1, THREE.UnsignedIntType),
  });
  private readonly copyMaterial = new THREE.ShaderMaterial({
    uniforms: {
      colorImage: { value: this.cache.texture },
      depthImage: { value: this.cache.depthTexture },
    },
    vertexShader:
      'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
    fragmentShader: `uniform sampler2D colorImage; uniform sampler2D depthImage; varying vec2 vUv; void main(){ gl_FragColor=texture2D(colorImage,vUv); gl_FragDepth=texture2D(depthImage,vUv).x;
#include <colorspace_fragment>
}`,
    // 깊이 검사를 끄면 GPU가 깊이 쓰기도 생략하므로 항상 통과시키며 복원한다.
    depthTest: true,
    depthFunc: THREE.AlwaysDepth,
    depthWrite: true,
  });
  private readonly quad = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    this.copyMaterial,
  );
  private readonly scenery = new LivingDioramaScenery();
  private readonly textures = new SpriteTextures();
  private readonly life = new CourtyardLife();
  private readonly sky = new THREE.HemisphereLight(0xdbe4df, 0x46617c, 1.45);
  private readonly dynamicSky = this.sky.clone();
  private readonly dynamicSun = new THREE.DirectionalLight(0xd8e5e5, 2.6);
  private readonly windowLight = new THREE.PointLight(0xffbe77, 8, 8, 1.6);
  private readonly actor = new TrailSprite(
    trailMotions('ai/tiger-hero', true),
    this.textures,
    32,
    0.3,
    'frame-pivot',
  );
  private readonly raycaster = new THREE.Raycaster();
  private readonly fire = new THREE.Group();
  private readonly flames: THREE.Mesh[] = [];
  private readonly smoke: THREE.Mesh[] = [];
  private readonly water = new THREE.Group();
  private readonly sun = new THREE.DirectionalLight(0xd8e5e5, 2.6);
  private readonly localLight = new THREE.PointLight(0xffa75f, 19, 10, 1.4);
  private readonly dojoLight = new THREE.PointLight(0xffc18e, 5, 7, 1.6);
  private view: LivingDioramaView = {
    overview: false,
    light: true,
    normals: true,
    period: 'day',
  };
  private readonly yaw = Math.atan2(13, 29);
  private width = 1;
  private height = 1;
  private frameCount = 0;
  private cacheRenders = 0;
  private lastCacheKey = '';
  private elapsed = 0;
  private disposed = false;
  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.staticScene.background = new THREE.Color(0x829aab);

    this.sun.position.set(-14, 24, 9);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, {
      left: -23,
      right: 23,
      top: 23,
      bottom: -23,
      near: 1,
      far: 80,
    });
    this.sun.shadow.normalBias = 0.035;
    this.localLight.position.set(-5.4, 2.4, 1.6);
    this.dojoLight.position.set(-4.3, 3.8, -5.2);
    this.staticScene.add(
      this.scenery.root,
      this.sky,
      this.sun,
      this.localLight,
      this.dojoLight,
      this.windowLight,
    );
    this.windowLight.position.set(-7.6, 2.2, 4.4);
    this.dynamicSun.position.copy(this.sun.position);
    this.camera.layers.enableAll();
    this.dynamicScene.add(
      this.actor.mesh,
      this.actor.shadow,
      this.fire,
      this.water,
      this.life.root,
      this.scenery.fabricRoot,
      this.dynamicSky,
      this.dynamicSun,
    );
    this.compositeScene.add(this.quad);
    this.quad.frustumCulled = false;
    this.buildEffects();
  }
  private buildEffects(): void {
    for (let i = 0; i < 3; i++) {
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.17 - i * 0.035, 0.58 - i * 0.1, 7),
        new THREE.MeshBasicMaterial({
          color: [0xec6e35, 0xffae54, 0xffe29a][i],
        }),
      );
      flame.position.set(-5.1 + i * 0.13 - 0.13, 0.71, 1.7);
      this.flames.push(flame);
      this.fire.add(flame);
    }
    for (let i = 0; i < 5; i++) {
      const smoke = new THREE.Mesh(
        new THREE.SphereGeometry(0.17, 8, 6),
        new THREE.MeshBasicMaterial({
          color: 0xada591,
          transparent: true,
          opacity: 0.35,
          depthWrite: false,
        }),
      );
      this.smoke.push(smoke);
      this.fire.add(smoke);
    }
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(1.8, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffbd76,
        transparent: true,
        opacity: 0.23,
        depthWrite: false,
      }),
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(-5.1, 0.124, 1.7);
    this.fire.add(glow);
    const wallGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 1.8),
      new THREE.MeshBasicMaterial({
        color: 0xffae66,
        transparent: true,
        opacity: 0.15,
        depthWrite: false,
      }),
    );
    wallGlow.rotation.y = Math.PI / 2;
    wallGlow.position.set(-6.385, 1.25, 1.7);
    this.fire.add(wallGlow);
    for (let i = 0; i < 20; i++) {
      const ripple = new THREE.Mesh(
        new THREE.PlaneGeometry(0.13, 0.45),
        new THREE.MeshBasicMaterial({
          color: 0xc9dcbd,
          transparent: true,
          opacity: 0.24,
          depthWrite: false,
        }),
      );
      ripple.rotation.x = -Math.PI / 2;
      ripple.position.set(5.2 + (i % 4) * 0.48, 0.198, -12 + i * 1.2);
      this.water.add(ripple);
    }
  }
  async load(): Promise<void> {
    await this.textures.load(
      new Set(
        [...this.actor.motions.values()].flatMap((a) =>
          a.frames.map((f) => f.localPath),
        ),
      ),
      '아타호 리소스를 불러오지 못했어요.',
    );
  }
  private updateCamera(overview: boolean): void {
    const bounds = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, bounds.width);
    this.height = Math.max(1, bounds.height);
    const size = this.renderer.getSize(new THREE.Vector2());
    if (size.x !== Math.round(this.width) || size.y !== Math.round(this.height))
      this.renderer.setSize(
        Math.round(this.width),
        Math.round(this.height),
        false,
      );
    const halfWidth = this.width < 600 ? (overview ? 18 : 15) : 11.5;
    const half = overview
      ? Math.max(15.5, (halfWidth * this.height) / this.width)
      : Math.max(11.5, (halfWidth * this.height) / this.width);
    Object.assign(this.camera, {
      left: (-half * this.width) / this.height,
      right: (half * this.width) / this.height,
      top: half,
      bottom: -half,
    });
    this.camera.position.set(13, 24, 29);
    this.camera.lookAt(0, 1.1, 0);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
  }
  render(
    state: LivingDioramaSnapshot,
    delta: number,
    view: LivingDioramaView,
  ): void {
    if (this.disposed) return;
    this.frameCount++;
    this.elapsed += delta;
    this.view = view;
    this.updateCamera(view.overview);
    const key = backgroundKey({
      ...view,
      width: this.canvas.width,
      height: this.canvas.height,
      restored: state.restored,
    });
    if (key !== this.lastCacheKey) {
      this.cache.setSize(this.canvas.width, this.canvas.height);
      this.scenery.setRestored(state.restored);
      this.scenery.setNormals(view.normals);
      const evening = view.period === 'evening';
      this.staticScene.background = new THREE.Color(
        evening ? 0x687a91 : 0x829aab,
      );
      this.sky.intensity = evening ? 0.9 : 1.45;
      this.sky.color.setHex(evening ? 0xa6afcf : 0xdbe4df);
      this.sun.intensity = evening ? 1.1 : 2.6;
      this.sun.color.setHex(evening ? 0xf3bf92 : 0xd8e5e5);
      this.sun.position.set(evening ? -21 : -14, evening ? 13 : 24, 9);
      this.dynamicSky.intensity = this.sky.intensity;
      this.dynamicSky.color.copy(this.sky.color);
      this.dynamicSun.intensity = this.sun.intensity;
      this.dynamicSun.color.copy(this.sun.color);
      this.dynamicSun.position.copy(this.sun.position);
      this.windowLight.visible = view.light && evening;
      this.localLight.visible = view.light;
      this.dojoLight.visible = view.light && state.restored && evening;
      this.renderer.setRenderTarget(this.cache);
      this.renderer.autoClear = true;
      this.renderer.render(this.staticScene, this.camera);
      this.renderer.setRenderTarget(null);
      this.cacheRenders++;
      this.lastCacheKey = key;
    }
    this.life.update(state, delta);
    this.scenery.animateFabrics(this.elapsed);
    const suffix =
      cardinalFacing(state.player.facing) === 'front'
        ? ''
        : `-${cardinalFacing(state.player.facing)}`;
    if (!view.freezeActor)
      this.actor.update(
        state.player,
        `${state.player.moving ? 'move' : 'stand'}${suffix}`,
        delta,
      );
    // 수직 인물판을 수평 방향으로만 돌리고 카메라 pitch의 세로 압축만 보정한다.
    this.actor.mesh.rotation.set(0, this.yaw, 0);
    this.actor.mesh.scale.y =
      Math.hypot(Math.hypot(13, 29), 22.9) / Math.hypot(13, 29);
    this.actor.mesh.position.y = state.player.y + 0.035;
    this.actor.shadow.position.y = state.player.y + 0.025;
    this.fire.visible = state.fire > 0;
    this.flames.forEach((f, i) => {
      f.scale.y = 1 + Math.sin(this.elapsed * 8 + i) * 0.2;
    });
    this.smoke.forEach((m, i) => {
      const progress = (this.elapsed * 0.25 + i * 0.2) % 1;
      m.position.set(
        -5.2 + Math.sin(this.elapsed + i) * 0.12,
        1.4 + progress * 2.2,
        1.5,
      );
      m.scale.setScalar(0.6 + progress * 1.7);
    });
    this.water.children.forEach((r, i) => {
      const t =
        ((i / this.water.children.length + this.elapsed * 0.035) % 1) *
        (livingDioramaRiver.length - 1);
      const segment = Math.floor(t),
        a = livingDioramaRiver[segment],
        b = livingDioramaRiver[segment + 1];
      if (a && b) {
        r.position.x = a.x + (b.x - a.x) * (t - segment);
        r.position.z = a.z + (b.z - a.z) * (t - segment);
      }
    });
    this.renderer.autoClear = true;
    this.renderer.render(this.compositeScene, this.compositeCamera);
    this.renderer.autoClear = false;
    this.renderer.render(this.dynamicScene, this.camera);
    this.renderer.autoClear = true;
  }
  movementToWorld(input: GroundPoint): GroundPoint {
    return {
      x: input.x * Math.cos(this.yaw) + input.z * Math.sin(this.yaw),
      z: -input.x * Math.sin(this.yaw) + input.z * Math.cos(this.yaw),
    };
  }
  groundFromPointer(clientX: number, clientY: number): GroundPoint | null {
    const b = this.canvas.getBoundingClientRect();
    this.raycaster.setFromCamera(
      new THREE.Vector2(
        ((clientX - b.left) / b.width) * 2 - 1,
        1 - ((clientY - b.top) / b.height) * 2,
      ),
      this.camera,
    );
    const ray = this.raycaster.ray;
    let previous = 0;
    for (let i = 0; i < 400; i++) {
      const distance = i * 0.25,
        p = ray.at(distance, new THREE.Vector3());
      if (p.y <= groundHeight(p)) {
        let low = previous,
          high = distance;
        for (let j = 0; j < 14; j++) {
          const mid = (low + high) / 2,
            q = ray.at(mid, new THREE.Vector3());
          if (q.y > groundHeight(q)) low = mid;
          else high = mid;
        }
        const q = ray.at((low + high) / 2, new THREE.Vector3());
        return { x: q.x, z: q.z };
      }
      previous = distance;
    }
    return null;
  }
  project(point: GroundPoint): { x: number; y: number } {
    const q = new THREE.Vector3(point.x, groundHeight(point), point.z).project(
      this.camera,
    );
    return {
      x: ((q.x + 1) * this.width) / 2,
      y: ((1 - q.y) * this.height) / 2,
    };
  }
  get diagnostics() {
    const frame = this.actor.animation.currentFrame.frame;
    return Object.freeze({
      frameCount: this.frameCount,
      bakedBackgroundRenders: this.cacheRenders,
      backgroundRenders: this.cacheRenders,
      backgroundRevision: this.lastCacheKey,
      elapsed: this.elapsed,
      period: this.view.period,
      life: this.life.diagnostics,
      actorY: this.actor.mesh.position.y,
      actorYaw: this.actor.mesh.rotation.y,
      actorPitch: this.actor.mesh.rotation.x,
      actorScaleY: this.actor.mesh.scale.y,
      actorFrame: Object.freeze({
        width: frame.width,
        height: frame.height,
        pivot: Object.freeze({ ...frame.pivot }),
      }),
      cacheWidth: this.cache.width,
      cacheHeight: this.cache.height,
      depthCache: !this.disposed,
      lightEnabled: this.view.light,
      normalsEnabled: this.view.normals,
      pointLightIntensity: this.view.light ? this.localLight.intensity : 0,
      normalSource: '소재별 높이판에서 계산한 tangent normal',
      disposed: this.disposed,
    });
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.scenery.dispose();
    this.actor.dispose();
    this.life.dispose();
    this.textures.dispose();
    this.cache.dispose();
    this.copyMaterial.dispose();
    this.quad.geometry.dispose();
    this.sun.shadow.dispose();
    for (const root of [this.fire, this.water])
      root.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          if (o.material instanceof THREE.Material) o.material.dispose();
        }
      });
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
