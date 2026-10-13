import * as THREE from 'three';
import {
  TrailSprite,
  trailMotions,
} from '../../../games/tiger-rpg/trail-sprite.js';
import { SpriteTextures } from '../../../rendering/sprite-textures.js';
import { cardinalFacing } from '../../characters/ataho/facing.js';
import { groundHeight, type GroundPoint } from './layout.js';
import { DioramaScenery } from './scenery.js';
import type { DioramaSnapshot } from './visit.js';

/** 정적 색·깊이를 저장하고 매 프레임 동적 인물/물/불과 합성한다. */
export class DioramaScene {
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
  private readonly scenery = new DioramaScenery();
  private readonly textures = new SpriteTextures();
  private readonly actor = new TrailSprite(
    trailMotions('ai/tiger-hero', true),
    this.textures,
    32,
    0.3,
  );
  private readonly raycaster = new THREE.Raycaster();
  private readonly fire = new THREE.Group();
  private readonly flames: THREE.Mesh[] = [];
  private readonly smoke: THREE.Mesh[] = [];
  private readonly water = new THREE.Group();
  private readonly sun = new THREE.DirectionalLight(0xffdeb2, 3.1);
  private readonly yaw = Math.atan2(12, 25);
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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.staticScene.background = new THREE.Color(0xcbb99b);
    const sky = new THREE.HemisphereLight(0xfff0d8, 0x8c8277, 2.3);
    this.sun.position.set(-12, 24, 16);
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
    this.staticScene.add(this.scenery.root, sky, this.sun);
    this.camera.layers.enableAll();
    this.dynamicScene.add(
      this.actor.mesh,
      this.actor.shadow,
      this.fire,
      this.water,
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
      flame.position.set(-4.8 + i * 0.13 - 0.13, 0.71, 1.3);
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
    glow.position.set(-4.8, 0.124, 1.3);
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
    wallGlow.position.set(-6.795, 1.25, 1.3);
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
    this.camera.position.set(12, 23, 25);
    this.camera.lookAt(0, 0.7, 0);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
  }
  render(state: DioramaSnapshot, delta: number, overview: boolean): void {
    if (this.disposed) return;
    this.frameCount++;
    this.elapsed += delta;
    this.updateCamera(overview);
    const key = `${this.canvas.width}x${this.canvas.height}/${overview}/${state.restored}`;
    if (key !== this.lastCacheKey) {
      this.cache.setSize(this.canvas.width, this.canvas.height);
      this.scenery.setRestored(state.restored);
      this.renderer.setRenderTarget(this.cache);
      this.renderer.autoClear = true;
      this.renderer.render(this.staticScene, this.camera);
      this.renderer.setRenderTarget(null);
      this.cacheRenders++;
      this.lastCacheKey = key;
    }
    const suffix =
      cardinalFacing(state.player.facing) === 'front'
        ? ''
        : `-${cardinalFacing(state.player.facing)}`;
    this.actor.update(
      state.player,
      `${state.player.moving ? 'move' : 'stand'}${suffix}`,
      delta,
    );
    // 수직 인물판을 수평 방향으로만 돌리고 카메라 pitch의 세로 압축만 보정한다.
    this.actor.mesh.rotation.set(0, this.yaw, 0);
    this.actor.mesh.scale.y =
      Math.hypot(Math.hypot(12, 25), 22.3) / Math.hypot(12, 25);
    this.actor.mesh.position.y = state.player.y + 0.035;
    this.actor.shadow.position.y = state.player.y + 0.025;
    this.fire.visible = state.fire > 0;
    this.flames.forEach((f, i) => {
      f.scale.y = 1 + Math.sin(this.elapsed * 8 + i) * 0.2;
    });
    this.smoke.forEach((m, i) => {
      const progress = (this.elapsed * 0.25 + i * 0.2) % 1;
      m.position.set(
        -4.9 + Math.sin(this.elapsed + i) * 0.12,
        1.4 + progress * 2.2,
        1.1,
      );
      m.scale.setScalar(0.6 + progress * 1.7);
    });
    this.water.children.forEach((r, i) => {
      r.position.z = -12 + ((i * 1.2 + this.elapsed * 0.5) % 24);
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
  get diagnostics(): {
    readonly frameCount: number;
    readonly backgroundRenders: number;
    readonly backgroundRevision: string;
    readonly elapsed: number;
    readonly actorY: number;
    readonly cacheWidth: number;
    readonly cacheHeight: number;
    readonly depthCache: boolean;
  } {
    return {
      frameCount: this.frameCount,
      backgroundRenders: this.cacheRenders,
      backgroundRevision: this.lastCacheKey,
      elapsed: this.elapsed,
      actorY: this.actor.mesh.position.y,
      cacheWidth: this.cache.width,
      cacheHeight: this.cache.height,
      depthCache: true,
    };
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.scenery.dispose();
    this.actor.dispose();
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
