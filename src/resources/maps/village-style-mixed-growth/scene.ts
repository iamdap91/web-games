import * as THREE from 'three';
import {
  TrailSprite,
  trailMotions,
} from '../../../games/tiger-rpg/trail-sprite.js';
import { SpriteTextures } from '../../../rendering/sprite-textures.js';
import { normalPixels } from '../village-style-lit2d/normal.js';
import {
  canWalkGrowth,
  growthFloor,
  growthPlaces,
  growthRules,
  growthTopology,
  wallSegments,
  type GrowthPoint,
  type GrowthRoom,
  type GrowthStage,
} from './layout.js';
import type { GrowthSnapshot } from './visit.js';
const residentScale = 1.6;
export const growthCameraYaw = Math.atan2(11, 22);
export interface GrowthView {
  readonly overview: boolean;
  readonly cutaway: boolean;
  readonly normal: boolean;
  readonly light: 'hearth' | 'window';
}
interface Resident {
  readonly group: THREE.Group;
  readonly arm: THREE.Group;
  readonly room: string;
}
/** 실제 건축 Mesh 위에 UV 무늬·문패를 붙이고 같은 상태의 실내와 통로를 그린다. */
export class GrowthScene {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(
    -10,
    10,
    8,
    -8,
    0.1,
    100,
  );
  private readonly renderer: THREE.WebGLRenderer;
  private readonly sprites = new SpriteTextures();
  private readonly actor = new TrailSprite(
    new Map(
      [...trailMotions('ai/tiger-hero', true)].filter(([name]) =>
        /^(stand|move)(-(back|left|right))?$/.test(name),
      ),
    ),
    this.sprites,
    32,
    0.23,
    'frame-pivot',
  );
  private readonly architecture = new THREE.Group();
  private readonly front = new THREE.Group();
  private readonly roofs = new THREE.Group();
  private readonly residents: Resident[] = [];
  private readonly textures = new Map<string, THREE.Texture>();
  private readonly materials = new Set<THREE.Material>();
  private readonly relief = new Set<THREE.MeshStandardMaterial>();
  private readonly fireLight = new THREE.PointLight(0xffa74b, 12, 11, 1.4);
  private readonly flame = new THREE.Group();
  private readonly marker = new THREE.Mesh(
    new THREE.RingGeometry(0.12, 0.22, 24),
    new THREE.MeshBasicMaterial({ color: 0xf4cd73, side: THREE.DoubleSide }),
  );
  private readonly raycaster = new THREE.Raycaster();
  private readonly floors: THREE.Mesh[] = [];
  private readonly mats = new THREE.Group();
  private readonly damage = new THREE.Group();
  private readonly exteriorRest = new THREE.Group();
  private stage: GrowthStage | null = null;
  private snapshot: GrowthSnapshot | null = null;
  private view: GrowthView = {
    overview: false,
    cutaway: true,
    normal: true,
    light: 'hearth',
  };
  private width = 1;
  private height = 1;
  private dpr = 1;
  private rebuilds = 0;
  private renderCount = 0;
  private disposed = false;
  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'low-power',
      preserveDrawingBuffer: true,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene.background = new THREE.Color(0xa2b8b4);
    this.scene.fog = new THREE.Fog(0xa2b8b4, 42, 90);
    const sun = new THREE.DirectionalLight(0xffe2b1, 2.3);
    sun.position.set(-9, 20, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.normalBias = 0.025;
    Object.assign(sun.shadow.camera, {
      left: -12,
      right: 12,
      top: 12,
      bottom: -12,
      near: 1,
      far: 60,
    });
    this.scene.add(sun, new THREE.HemisphereLight(0xc6e2e0, 0x69634e, 1.25));
    this.camera.layers.enableAll();
    sun.layers.enableAll();
    this.buildGround();
    this.scene.add(
      this.architecture,
      this.front,
      this.roofs,
      this.actor.mesh,
      this.actor.shadow,
      this.fireLight,
      this.flame,
      this.marker,
    );
    this.marker.rotation.x = -Math.PI / 2;
    this.marker.visible = false;
    this.fireLight.position.set(-3.7, 1.25, -0.55);
    for (let i = 0; i < 3; i++) {
      const mesh = new THREE.Mesh(
        new THREE.ConeGeometry(0.14 + i * 0.01, 0.48 + i * 0.09, 5),
        new THREE.MeshBasicMaterial({
          color: [0xffd26a, 0xf97837, 0xffedb1][i],
        }),
      );
      mesh.position.set((i - 1) * 0.1, 0.2 + i * 0.07, 0);
      this.flame.add(mesh);
    }
    this.flame.position.set(-3.8, 0.77, -0.72);
    this.rebuild(0);
  }
  private mat(
    color: THREE.ColorRepresentation,
    options: { readonly texture?: string; readonly normal?: string } = {},
  ): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.92,
      map: options.texture ? this.art(options.texture) : null,
      normalMap: options.normal ? this.art(options.normal) : null,
      normalScale: new THREE.Vector2(0.85, 0.85),
    });
    this.materials.add(material);
    if (options.normal) {
      material.userData.normalKey = options.normal;
      this.relief.add(material);
    }
    return material;
  }
  private box(
    parent: THREE.Object3D,
    position: readonly [number, number, number],
    size: readonly [number, number, number],
    color: THREE.ColorRepresentation,
    options: { readonly texture?: string; readonly normal?: string } = {},
  ): THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial> {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(...size),
      this.mat(color, options),
    );
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  private art(key: string): THREE.Texture {
    const cached = this.textures.get(key);
    if (cached) return cached;
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const c = canvas.getContext('2d');
    if (!c) throw new Error('생활 무늬를 그릴 수 없어요.');
    const isNormal = key.endsWith('-normal'),
      base = key.replace('-normal', '');
    const heights = new Float32Array(4096);
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 64; x++) {
        const brick = base === 'brick',
          seam = brick
            ? y % 16 < 2 || (x + (Math.floor(y / 16) % 2) * 16) % 32 < 2
            : y % 16 < 2;
        heights[y * 64 + x] = seam
          ? 0.05
          : brick
            ? 0.65 + Math.sin(x * 1.2 + y * 0.7) * 0.09
            : 0.4 + Math.sin(x * 0.65 + Math.sin(y) * 0.5) * 0.2;
      }
    if (isNormal)
      c.putImageData(
        new ImageData(normalPixels(heights, 64, 64), 64, 64),
        0,
        0,
      );
    else if (base === 'brick' || base === 'wood') {
      c.fillStyle = base === 'brick' ? '#b9704d' : '#bb8857';
      c.fillRect(0, 0, 64, 64);
      for (let y = 0; y < 64; y++)
        for (let x = 0; x < 64; x++) {
          const h = heights[y * 64 + x] ?? 0;
          c.fillStyle =
            base === 'brick'
              ? h < 0.2
                ? '#5a5c58'
                : `rgb(${145 + h * 55},${75 + h * 35},${53 + h * 26})`
              : `rgb(${140 + h * 70},${94 + h * 50},${61 + h * 32})`;
          c.fillRect(x, y, 1, 1);
        }
    } else if (base === 'wall') {
      c.fillStyle = '#fff2d6';
      c.fillRect(0, 0, 64, 64);
      c.fillStyle = '#e8d5b8';
      for (let i = 0; i < 45; i++)
        c.fillRect((i * 17) % 64, (i * 29) % 64, 2 + (i % 3), 1);
      c.fillStyle = '#c6baa5';
      c.fillRect(0, 58, 64, 6);
    } else if (base === 'floor') {
      c.fillStyle = '#c99e72';
      c.fillRect(0, 0, 64, 64);
      for (let y = 0; y < 64; y += 16) {
        c.fillStyle = '#987654';
        c.fillRect(0, y, 64, 1);
        c.fillRect((y * 7) % 60, y, 1, 16);
      }
      c.fillStyle = '#dbc29a';
      for (let i = 0; i < 28; i++)
        c.fillRect((i * 23) % 63, (i * 19) % 63, 5, 1);
    } else if (base === 'roof') {
      c.fillStyle = '#486d71';
      c.fillRect(0, 0, 64, 64);
      for (let y = 0; y < 64; y += 8) {
        c.fillStyle = '#385b5d';
        c.fillRect(0, y, 64, 1);
        c.fillStyle = '#668989';
        for (let x = 0; x < 64; x += 8)
          c.fillRect(x + (y % 16 ? 4 : 0), y + 1, 5, 2);
      }
    } else if (base === 'paving') {
      c.fillStyle = '#b4b9a0';
      c.fillRect(0, 0, 64, 64);
      c.strokeStyle = '#8d9882';
      for (let y = 0; y < 64; y += 16) {
        c.beginPath();
        c.moveTo(0, y);
        c.lineTo(64, y);
        c.stroke();
        for (let x = 0; x < 64; x += 16) {
          c.beginPath();
          c.moveTo(x + (y % 32 ? 8 : 0), y);
          c.lineTo(x + (y % 32 ? 8 : 0), y + 16);
          c.stroke();
        }
      }
      c.fillStyle = '#cad0b6';
      for (let i = 0; i < 18; i++)
        c.fillRect((i * 19) % 64, (i * 13) % 64, 3, 2);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = isNormal ? THREE.NoColorSpace : THREE.SRGBColorSpace;
    texture.magFilter = texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    this.textures.set(key, texture);
    return texture;
  }
  private sign(
    parent: THREE.Object3D,
    text: string,
    position: readonly [number, number, number],
    size: readonly [number, number] = [1.2, 0.35],
  ): void {
    const key = `sign:${text}`;
    let texture = this.textures.get(key);
    if (!texture) {
      const c = document.createElement('canvas');
      c.width = 192;
      c.height = 64;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#394f4b';
      ctx.fillRect(0, 0, 192, 64);
      ctx.fillStyle = '#ead7aa';
      ctx.fillRect(4, 4, 184, 56);
      ctx.font = 'bold 27px serif';
      ctx.fillStyle = '#3d574e';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 96, 34);
      texture = new THREE.CanvasTexture(c);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      this.textures.set(key, texture);
    }
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 1,
      side: THREE.DoubleSide,
    });
    this.materials.add(material);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(...size), material);
    mesh.position.set(...position);
    parent.add(mesh);
  }
  private buildGround(): void {
    this.box(this.scene, [0, -0.52, 0.4], [15.3, 1.05, 12], 0x6b8477);
    this.box(this.scene, [0, -0.08, 0.4], [15, 0.16, 11.7], 0x91a48a);
    const ground = this.box(
      this.scene,
      [0, 0.025, 0.4],
      [14.4, 0.03, 11.1],
      0xffffff,
      { texture: 'paving' },
    );
    this.floors.push(ground);
    for (let i = 0; i < 10; i++)
      this.box(
        this.scene,
        [0, 0.048, 5.7 - i * 0.38],
        [0.45, 0.018, 0.25],
        0xd3c4a3,
      );
    for (const [x, z] of [
      [-6, -3.5],
      [-6, 3.6],
      [6, -4.2],
      [6, 3.8],
    ]) {
      if (x === undefined || z === undefined) continue;
      this.box(this.scene, [x, 0.5, z], [0.15, 0.9, 0.15], 0x73684c);
      for (let j = 0; j < 3; j++) {
        const tree = new THREE.Mesh(
          new THREE.SphereGeometry(0.7 - j * 0.1, 7, 5),
          this.mat([0x627f70, 0x7a9980, 0x92aa8b][j] ?? 0x627f70),
        );
        tree.position.set(x + (j - 1) * 0.22, 1.3 + j * 0.3, z);
        tree.castShadow = true;
        this.scene.add(tree);
      }
      this.box(this.scene, [x, 0.12, z], [1, 0.18, 1], 0x6d8272);
    }
    for (let i = 0; i < 12; i++) {
      this.box(
        this.scene,
        [-6.7 + i * 1.2, -0.35, 6.2],
        [0.6, 0.24, 0.09],
        0xb5ae8e,
      );
    }
    this.scene.add(this.exteriorRest);
    this.box(this.exteriorRest, [3, 0.42, -3.65], [1, 0.1, 0.34], 0x9e815b);
    for (const x of [2.6, 3.4])
      this.box(
        this.exteriorRest,
        [x, 0.24, -3.65],
        [0.07, 0.36, 0.25],
        0x746f55,
      );
  }
  private clear(parent: THREE.Group): void {
    parent.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];
        for (const m of materials) {
          m.dispose();
          this.materials.delete(m);
          if (m instanceof THREE.MeshStandardMaterial) this.relief.delete(m);
        }
      }
    });
    parent.clear();
  }
  private roof(room: GrowthRoom, width: number = growthRules.roomSize): void {
    const group = new THREE.Group();
    const rise =
      room.id === 'lodging' ? growthRules.loftY - growthRules.floorY : 0;
    group.position.set(room.x, rise, room.z);
    this.roofs.add(group);
    for (const side of [-1, 1]) {
      const roof = this.box(
        group,
        [0, 2.66, side * (growthRules.roomSize / 4 + 0.01)],
        [width + 0.28, 0.12, growthRules.roomSize / 2 + 0.2],
        0xffffff,
        { texture: 'roof' },
      );
      roof.rotation.x = side * 0.34;
    }
    this.box(group, [0, 2.95, 0], [width + 0.4, 0.12, 0.14], 0x36595d);
    if (rise)
      this.box(
        group,
        [0, 2.4 - rise / 2, growthRules.roomSize / 2],
        [growthRules.roomSize, rise, growthRules.thickness],
        room.color,
        { texture: 'wall' },
      );
    for (const side of [-1, 1]) {
      const half = growthRules.roomSize / 2;
      const shape = new THREE.Shape();
      shape.moveTo(-half, 0);
      shape.lineTo(0, 0.55);
      shape.lineTo(half, 0);
      shape.closePath();
      const gable = new THREE.Mesh(
        new THREE.ShapeGeometry(shape),
        this.mat(room.color, { texture: 'wall' }),
      );
      gable.material.side = THREE.DoubleSide;
      gable.rotation.y = Math.PI / 2;
      gable.position.set((side * width) / 2, 2.4, 0);
      gable.castShadow = true;
      group.add(gable);
    }
  }
  private resident(
    parent: THREE.Group,
    room: string,
    x: number,
    z: number,
  ): void {
    const group = new THREE.Group();
    group.position.set(x, 0.22, z);
    group.scale.setScalar(residentScale);
    parent.add(group);
    const body = this.box(
      group,
      [0, 0.42, 0],
      [0.24, 0.42, 0.16],
      room === 'dojo' ? 0x6c737b : room === 'lodging' ? 0xa18083 : 0x627c7a,
    );
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 8, 6),
      this.mat(0xcdad82),
    );
    head.position.y = 0.77;
    group.add(head);
    this.box(group, [0, 0.89, 0], [0.25, 0.07, 0.19], 0x4e5c54);
    for (const side of [-1, 1])
      this.box(group, [side * 0.07, 0.16, 0], [0.065, 0.28, 0.07], 0x56645e);
    const arm = new THREE.Group();
    arm.position.set(-0.17, 0.55, 0);
    group.add(arm);
    this.box(arm, [0, -0.13, 0.02], [0.07, 0.3, 0.08], body.material.color);
    this.residents.push({ group, arm, room });
  }
  private interior(room: GrowthRoom): void {
    const group = new THREE.Group();
    group.position.set(room.x, 0, room.z);
    this.architecture.add(group);
    const floor = this.box(
      group,
      [0, 0.16, 0],
      [growthRules.roomSize, 0.12, growthRules.roomSize],
      0xffffff,
      {
        texture: 'floor',
      },
    );
    this.floors.push(floor);
    if (room.id !== 'lodging') {
      for (let i = 0; i < 3; i++) {
        const step = this.box(
          group,
          [0, 0.04 + 0.03 * i, growthRules.roomSize / 2 + 0.45 - 0.2 * i],
          [1, 0.06 + 0.06 * i, 0.2],
          0xb8aa87,
        );
        this.floors.push(step);
      }
    }
    if (room.id === 'workshop') {
      this.box(group, [-0.85, 0.5, -0.75], [0.75, 0.58, 0.7], 0xffffff, {
        texture: 'brick',
        normal: 'brick-normal',
      });
      this.box(group, [-0.85, 0.82, -0.75], [0.86, 0.1, 0.78], 0x414e4b);
      this.box(group, [-0.85, 1.2, -1.1], [0.3, 0.8, 0.25], 0xb68465, {
        texture: 'brick',
        normal: 'brick-normal',
      });
      this.box(group, [0.85, 0.6, -0.8], [0.65, 0.15, 0.55], 0xffffff, {
        texture: 'wood',
        normal: 'wood-normal',
      });
      for (const x of [0.62, 1.08])
        this.box(group, [x, 0.38, -0.8], [0.07, 0.35, 0.4], 0x7f6850);
      for (let i = 0; i < 3; i++)
        this.box(
          group,
          [0.7 + i * 0.12, 0.72, -0.8],
          [0.08, 0.12, 0.1],
          0xd7c7a3,
        );
      this.sign(
        group,
        '火 茶',
        [0, 2.08, -growthRules.roomSize / 2 + 0.08],
        [1.05, 0.32],
      );
      this.resident(group, 'workshop', 0.55, -0.12);
    } else if (room.id === 'dojo') {
      this.mats.position.set(room.x, 0, room.z);
      this.damage.position.set(room.x, 0, room.z);
      this.architecture.add(this.mats, this.damage);
      for (let i = 0; i < 3; i++)
        this.box(
          this.mats,
          [-0.7 + i * 0.55, 0.235, -0.35],
          [0.5, 0.02, 1.3],
          i % 2 ? 0xb5b68a : 0xd2c7a5,
        );
      for (let i = 0; i < 4; i++) {
        const board = this.box(
          this.damage,
          [-0.7 + i * 0.42, 0.28, -0.3 + i * 0.12],
          [0.08, 0.09, 1.1],
          0x8b795c,
        );
        board.rotation.y = (i - 1.5) * 0.15;
      }
      this.box(group, [0.85, 0.6, -0.8], [0.15, 0.75, 0.18], 0x766d53);
      this.box(group, [0.85, 0.99, -0.8], [0.54, 0.15, 0.25], 0xb7a37e);
      this.sign(
        group,
        '虎 心',
        [0, 1.7, -growthRules.roomSize / 2 + 0.08],
        [0.85, 0.5],
      );
      this.resident(group, 'dojo', -0.6, -0.65);
    } else if (room.id === 'corridor') {
      this.box(group, [0, 0.6, -0.82], [2.1, 0.12, 0.42], 0xffffff, {
        texture: 'wood',
        normal: 'wood-normal',
      });
      for (const x of [-0.85, 0.85])
        this.box(group, [x, 0.37, -0.82], [0.09, 0.4, 0.34], 0x6d6952);
      for (let i = 0; i < 4; i++)
        this.box(
          group,
          [-0.7 + i * 0.46, 0.71, -0.82],
          [0.14, 0.1, 0.13],
          0xe0d2ac,
        );
      this.sign(
        group,
        '함께',
        [0, 1.65, -growthRules.roomSize / 2 + 0.08],
        [0.8, 0.3],
      );
      this.resident(group, 'corridor', 0.6, 0.2);
    } else {
      const platform = this.box(
        group,
        [0, 0.46, -0.8],
        [2.85, 0.48, 1.4],
        0xffffff,
        { texture: 'floor' },
      );
      this.floors.push(platform);
      for (let i = 0; i < 4; i++) {
        const stair = this.box(
          group,
          [0, 0.22 + (i + 1) * 0.06, 0.6 - i * 0.2],
          [1.04, (i + 1) * 0.12, 0.2],
          0xb7a483,
        );
        this.floors.push(stair);
      }
      this.box(group, [0.85, 0.84, -0.7], [0.72, 0.27, 0.9], 0xa39b78);
      this.box(group, [0.85, 1, -0.7], [0.7, 0.08, 0.7], 0xd7c9a1);
      this.box(group, [0.85, 1.08, -1.02], [0.5, 0.12, 0.2], 0xe6d7b7);
      this.box(group, [-0.95, 0.85, -0.8], [0.4, 0.3, 0.45], 0x9b825f);
      this.box(group, [-0.95, 1.04, -0.8], [0.13, 0.12, 0.13], 0xe6dbc0);
      this.sign(
        group,
        '편안한 밤',
        [0, 1.6, -growthRules.roomSize / 2 + 0.08],
        [1.35, 0.35],
      );
      this.resident(group, 'lodging', -0.7, -0.65);
      const seated = this.residents[this.residents.length - 1];
      if (seated) seated.group.position.y = 0.62;
    }
  }
  private rebuild(stage: GrowthStage): void {
    this.clear(this.architecture);
    this.clear(this.front);
    this.clear(this.roofs);
    this.mats.clear();
    this.damage.clear();
    this.residents.length = 0;
    this.floors.splice(1);
    const topology = growthTopology(stage);
    for (const room of topology.rooms) {
      this.interior(room);
      if (stage === 0 || room.id === 'lodging') this.roof(room);
    }
    if (stage >= 1) {
      const base = topology.rooms[0];
      if (base) this.roof({ ...base, x: 0 }, growthRules.roomSize * 3);
    }
    for (const wall of topology.walls) {
      const room = topology.rooms.find((r) => r.id === wall.room);
      if (!room) continue;
      const rise =
        room.id === 'lodging' ? growthRules.loftY - growthRules.floorY : 0;
      const front =
        !wall.shared && (wall.side === 'south' || wall.side === 'east');
      const group = new THREE.Group();
      group.position.set(room.x, 0, room.z);
      (front ? this.front : this.architecture).add(group);
      for (const rect of wallSegments(wall)) {
        this.box(
          group,
          [rect.x - room.x, 1.31 + rise / 2, rect.z - room.z],
          [rect.w, 2.18 + rise, rect.d],
          room.color,
          { texture: 'wall' },
        );
        this.box(
          group,
          [rect.x - room.x, 0.31, rect.z - room.z],
          [rect.w + 0.015, 0.18, rect.d + 0.015],
          0x927e62,
        );
      }
      if (wall.opening)
        this.box(
          group,
          [wall.x - room.x, 2.29, wall.z - room.z],
          [
            wall.alongX ? growthRules.doorway + 0.05 : growthRules.thickness,
            0.28,
            wall.alongX ? growthRules.thickness : growthRules.doorway + 0.05,
          ],
          0x8f7960,
        );
      if (wall.side === 'south')
        this.sign(
          group,
          room.label,
          [0, 2.2, growthRules.roomSize / 2 + 0.07],
          [1.38, 0.32],
        );
      if (wall.side === 'north' && !wall.shared) {
        this.box(
          group,
          [-0.75, 1.35, -growthRules.roomSize / 2 + 0.075],
          [0.65, 0.67, 0.05],
          0x5b7873,
        );
        this.box(
          group,
          [-0.75, 1.35, -growthRules.roomSize / 2 + 0.114],
          [0.035, 0.66, 0.02],
          0xc6ba96,
        );
        this.box(
          group,
          [-0.75, 1.35, -growthRules.roomSize / 2 + 0.114],
          [0.65, 0.035, 0.02],
          0xc6ba96,
        );
      }
    }
    if (stage === 2) {
      this.box(
        this.architecture,
        [-0.3, 0.045, 3.05],
        [1.7, 0.012, 1.6],
        0x88a077,
      );
      for (const x of [-1.05, 0.55])
        for (let i = 0; i < 5; i++) {
          this.box(
            this.architecture,
            [x, 0.15, 2.45 + i * 0.3],
            [0.2, 0.17, 0.24],
            0x567a63,
          );
          const flower = new THREE.Mesh(
            new THREE.SphereGeometry(0.065, 6, 4),
            this.mat(i % 2 ? 0xdcc180 : 0xd9a293),
          );
          flower.position.set(x, 0.26, 2.45 + i * 0.3);
          this.architecture.add(flower);
        }
      this.box(
        this.architecture,
        [-1.8, 0.45, 3.45],
        [1.1, 0.12, 0.38],
        0x9f815f,
      );
      this.sign(this.architecture, '작은 마당', [-1.8, 0.83, 3.5], [0.9, 0.3]);
    }
    this.exteriorRest.visible = stage !== 2;
    this.stage = stage;
    this.rebuilds++;
  }
  async load(): Promise<void> {
    await this.sprites.load(
      new Set(
        [...this.actor.motions.values()].flatMap((a) =>
          a.frames.map((f) => f.localPath),
        ),
      ),
      '승인된 아타호 원본을 불러오지 못했어요.',
    );
  }
  render(state: GrowthSnapshot, options: GrowthView, delta: number): void {
    if (this.disposed) return;
    this.snapshot = state;
    this.view = options;
    this.resize();
    if (this.stage !== state.stage) this.rebuild(state.stage);
    const aspect = this.width / this.height;
    const half = options.overview
      ? Math.max(7, 8 / aspect)
      : aspect < 1
        ? 5.5
        : 6.3;
    Object.assign(this.camera, {
      left: -half * aspect,
      right: half * aspect,
      top: half,
      bottom: -half,
    });
    this.camera.updateProjectionMatrix();
    const follow = !options.overview && aspect < 1,
      cx = follow ? state.player.x * 0.8 : 0,
      cz = follow ? state.player.z * 0.6 - 0.9 : -0.4;
    this.camera.position.set(cx + 11, 16.5, cz + 22);
    this.camera.lookAt(cx, 0.55, cz);
    this.camera.updateMatrixWorld();
    const suffix =
      state.player.facing === 'front' ? '' : `-${state.player.facing}`;
    this.actor.update(
      state.player,
      `${state.player.moving ? 'move' : 'stand'}${suffix}`,
      delta,
    );
    this.actor.mesh.rotation.set(0, growthCameraYaw, 0);
    this.actor.mesh.scale.y =
      Math.hypot(Math.hypot(11, 22), 15.95) / Math.hypot(11, 22);
    this.actor.mesh.position.y = state.player.y + 0.025;
    this.actor.shadow.position.y = state.player.y + 0.012;
    this.front.visible = !options.cutaway;
    this.roofs.visible = !options.cutaway;
    this.mats.visible = state.restored;
    this.damage.visible = !state.restored;
    for (const material of this.relief) {
      const desired = options.normal
        ? this.art(String(material.userData.normalKey))
        : null;
      if (material.normalMap !== desired) {
        material.normalMap = desired;
        material.needsUpdate = true;
      }
    }
    if (options.light === 'hearth') {
      this.fireLight.color.set(0xffab53);
      this.fireLight.position.set(-3.75, 1.2, -0.45);
      this.fireLight.intensity =
        (state.fire ? 22 : 8) * (1 + Math.sin(state.elapsed * 8) * 0.08);
    } else {
      this.fireLight.color.set(0xaedbff);
      this.fireLight.position.set(-1.7, 2.15, 1.2);
      this.fireLight.intensity = 23;
    }
    this.flame.scale.setScalar(
      (state.fire ? 1 : 0.28) * (1 + Math.sin(state.elapsed * 10) * 0.09),
    );
    for (const resident of this.residents) {
      const working =
        resident.room === 'workshop'
          ? state.fire > 0
          : resident.room === 'dojo'
            ? state.restored
            : resident.room === 'corridor';
      resident.arm.rotation.x = working
        ? Math.sin(state.elapsed * (resident.room === 'dojo' ? 4.2 : 3.4)) *
          0.65
        : -0.25;
      resident.group.rotation.y =
        resident.room === 'dojo' && state.restored
          ? Math.sin(state.elapsed * 1.4) * 0.16
          : 0;
    }
    this.renderer.render(this.scene, this.camera);
    this.renderCount++;
  }
  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width)),
      height = Math.max(1, Math.round(rect.height)),
      dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (width === this.width && height === this.height && dpr === this.dpr)
      return;
    this.width = width;
    this.height = height;
    this.dpr = dpr;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height, false);
  }
  mark(point: GrowthPoint | null): void {
    this.marker.visible = !!point;
    if (point)
      this.marker.position.set(
        point.x,
        growthFloor(point, this.stage ?? 0) + 0.018,
        point.z,
      );
  }
  pick(clientX: number, clientY: number): GrowthPoint | null {
    const r = this.canvas.getBoundingClientRect();
    this.raycaster.setFromCamera(
      new THREE.Vector2(
        ((clientX - r.left) / r.width) * 2 - 1,
        1 - ((clientY - r.top) / r.height) * 2,
      ),
      this.camera,
    );
    const hits = this.raycaster.intersectObjects(this.floors, false);
    for (const hit of hits) {
      const p = { x: hit.point.x, z: hit.point.z };
      if (canWalkGrowth(p, this.stage ?? 0)) return p;
    }
    return null;
  }
  project(point: GrowthPoint): { x: number; y: number } {
    const p = new THREE.Vector3(
      point.x,
      growthFloor(point, this.stage ?? 0),
      point.z,
    ).project(this.camera);
    return {
      x: ((p.x + 1) * this.width) / 2,
      y: ((1 - p.y) * this.height) / 2,
    };
  }
  get screenPositions() {
    return growthPlaces(this.stage ?? 0).map((place) => ({
      id: place.id,
      world: { x: place.x, z: place.z },
      ...this.project(place),
    }));
  }
  get diagnostics() {
    const t = growthTopology(this.stage ?? 0),
      frame = this.actor.animation.currentFrame.frame;
    return {
      rooms: t.rooms.length,
      sharedWalls: t.sharedWalls,
      exteriorWalls: t.exteriorWalls,
      corridors: t.corridors,
      courtyard: t.courtyard,
      roofSections: this.roofs.children.length,
      residentHeight: 0.925 * residentScale,
      indoorLife: t.indoorLife,
      geometrySignature: t.signature,
      rebuilds: this.rebuilds,
      renderCount: this.renderCount,
      cutaway: this.view.cutaway,
      normal: this.view.normal,
      light: this.view.light,
      normalColorSpace: THREE.NoColorSpace,
      normalY: 'positive tangent y; height down-up',
      reliefMaterials: this.relief.size,
      textureCache: this.textures.size,
      materialCache: this.materials.size,
      residents: this.residents.length,
      workingResidents: this.residents.filter((r) =>
        r.room === 'workshop'
          ? !!this.snapshot?.fire
          : r.room === 'dojo'
            ? !!this.snapshot?.restored
            : r.room === 'corridor',
      ).length,
      sourceActor: 'ai/tiger-hero',
      sourceRGBA: true,
      actorYawOnly: true,
      actorFrame: {
        path: frame.localPath,
        width: frame.width,
        height: frame.height,
        pivot: frame.pivot,
      },
      actorFootY: this.actor.mesh.position.y,
      walkSurfaceY: this.snapshot?.player.y ?? growthRules.groundY,
      canvas: {
        width: this.width,
        height: this.height,
        dpr: this.dpr,
        backingWidth: this.canvas.width,
        backingHeight: this.canvas.height,
      },
      disposed: this.disposed,
    };
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) child.geometry.dispose();
    });
    this.materials.forEach((m) => m.dispose());
    this.materials.clear();
    this.textures.forEach((t) => t.dispose());
    this.textures.clear();
    this.relief.clear();
    this.actor.dispose();
    this.sprites.dispose();
    this.marker.material.dispose();
    this.flame.children.forEach((child) => {
      if (child instanceof THREE.Mesh) child.material.dispose();
    });
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
