import * as THREE from 'three';
import {
  mapStyles,
  recolorMapMaterial,
  type MapStyle,
} from '../../rendering/map-art-direction.js';
import { MapSpriteResources } from '../../resources/props/map-sprite-resources.js';
import { groundGeometry } from '../../rendering/ground-geometry.js';
import {
  EnvironmentResources,
  setResourceOutline,
} from '../../resources/environment/environment-resources.js';
import { villageColors } from '../../rendering/pixel-material.js';
import type {
  OutlineKind,
  SurfaceKind,
} from '../../rendering/surface-types.js';
import { treeShape } from '../../resources/environment/tree-shape.js';
import { battleRules } from './world.js';
import { groundPathGeometry } from '../../rendering/ground-path.js';

/** 전투 범위를 둘러싼 숲 공터의 형태와 GPU 자원을 소유한다. */
export class BattleArena {
  readonly root = new THREE.Group();
  private readonly resources: EnvironmentResources;
  private readonly sprites = new MapSpriteResources();
  private readonly grounds: THREE.BufferGeometry[] = [];
  private readonly cube = new THREE.BoxGeometry(1, 1, 1);

  constructor(private readonly style: MapStyle = mapStyles.battle) {
    this.resources = new EnvironmentResources({
      recolor: (kind, color) => recolorMapMaterial(style, kind, color),
    });
    this.buildGround();
    this.buildGate();
    this.buildSurroundings();
    this.root.add(this.sprites.root);
    this.buildDetails();
  }

  private box(
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    depth: number,
    color: number,
    appearance: {
      readonly surface: SurfaceKind;
      readonly outline: OutlineKind;
    } = { surface: 'stone', outline: 'rock' },
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(
      this.cube,
      this.resources.material(appearance.surface, color),
    );
    mesh.position.set(x, y, z);
    mesh.scale.set(width, height, depth);
    mesh.receiveShadow = true;
    mesh.castShadow = height > 0.2;
    setResourceOutline(mesh, appearance.outline);
    this.root.add(mesh);
    return mesh;
  }

  private ground(
    points: readonly { readonly x: number; readonly z: number }[],
    surface: SurfaceKind,
    color: number,
    y: number,
  ): void {
    this.addGround(groundGeometry(points), surface, color, y);
  }

  private addGround(
    geometry: THREE.BufferGeometry,
    surface: SurfaceKind,
    color: number,
    y: number,
  ): void {
    this.grounds.push(geometry);
    const ground = new THREE.Mesh(
      geometry,
      this.resources.material(surface, color),
    );
    ground.position.y = y;
    ground.receiveShadow = true;
    setResourceOutline(ground, 'ground');
    this.root.add(ground);
  }

  private buildGround(): void {
    this.ground(
      [
        { x: -60, z: -60 },
        { x: 60, z: -60 },
        { x: 60, z: 60 },
        { x: -60, z: 60 },
      ],
      'grass',
      villageColors.grass,
      -0.035,
    );
    // 전투 사각 범위를 포함하는 불규칙한 공터. 턱과 장식은 이동 범위 밖에 둔다.
    const x = battleRules.width / 2,
      z = battleRules.depth / 2;
    const clearing = [
      { x: -x - 1.4, z: -z + 0.5 },
      { x: -x - 0.8, z: -z - 1 },
      { x: -2.1, z: -z - 1.6 },
      { x: 2.9, z: -z - 1.1 },
      { x: x + 1, z: -z - 0.6 },
      { x: x + 1.8, z: 0.4 },
      { x: x + 1.1, z: z + 1.1 },
      { x: 1.4, z: z + 1.6 },
      { x: -3.5, z: z + 1.2 },
      { x: -x - 1.5, z: z + 0.4 },
    ];
    this.ground(
      clearing.map((p) => ({ x: p.x * 1.08, z: p.z * 1.08 })),
      'earth',
      0x8b846f,
      -0.024,
    );
    this.ground(clearing, 'path', villageColors.path, -0.012);
    this.addGround(
      groundPathGeometry(
        [
          { x: 0.5, z: 18 },
          { x: -0.4, z: 9 },
          { x: 0, z: 3 },
        ],
        1.1,
      ),
      'path',
      villageColors.path,
      -0.01,
    );
  }

  private buildGate(): void {
    // 뒤쪽의 노출된 암반과 오래된 운반 흔적으로 산길에서 이어지는 공간을 만든다.
    for (const [x, z, radius] of [
      [-5.9, -6.7, 1.45],
      [-7.1, -7.5, 0.9],
      [6.8, -6.2, 1.1],
    ] as const) {
      const rock = this.resources.createRock({
        radius,
        rotation: x,
        color: 0x92968d,
      });
      rock.position.x = x;
      rock.position.z = z;
      rock.scale.y *= this.style === mapStyles.ridge ? 1.6 : 1;
      this.root.add(rock);
    }
    const wood = { surface: 'wood', outline: 'fence' } as const;
    const logGeometry = new THREE.CylinderGeometry(0.26, 0.32, 3.4, 8);
    this.grounds.push(logGeometry);
    const log = new THREE.Mesh(
      logGeometry,
      this.resources.material('wood', 0x796b54),
    );
    log.rotation.z = Math.PI / 2;
    log.rotation.y = -0.24;
    log.position.set(2.8, 0.29, -6.3);
    log.castShadow = log.receiveShadow = true;
    setResourceOutline(log, 'tree');
    this.root.add(log);
    this.box(4.3, 0.32, -6.6, 0.14, 0.64, 0.13, 0x796b54, wood).rotation.z =
      0.2;
    this.box(-3.2, 0.45, -6.1, 0.1, 0.9, 0.1, 0x796b54, wood).rotation.z = -0.1;
    this.box(-3.2, 0.85, -6.1, 0.75, 0.25, 0.1, 0x99866b, wood).rotation.z =
      -0.08;
  }

  private buildSurroundings(): void {
    const crownTop = treeShape.crowns.at(-1)!.y + treeShape.crownHeight / 2;
    for (let i = 0; i < 30; i++) {
      if (i < 16 && i % 4 === 1) continue;
      const x = i < 16 ? (i - 7.5) * 1.7 : (i % 2 ? -1 : 1) * (9 + (i % 3));
      const z = i < 16 ? -8.5 - (i % 3) * 1.6 : (i - 22) * 1.6;
      const height = 3 + (i % 4) * 0.65;
      const tree = this.resources.createTree(1);
      // 새 수관 모양도 기존 나무의 높이와 폭에 맞춰 전투 시야를 유지한다.
      const width = 1.6 / treeShape.crowns[0].radius;
      tree.scale.set(width, (height + 1.8) / crownTop, width);
      tree.position.set(x + Math.sin(i * 1.8) * 0.7, 0, z);
      tree.rotation.y = i * 0.61;
      this.root.add(tree);
    }
    for (let i = 0; i < 28; i++) {
      if (i % 3 === 1) continue;
      const side = i % 2 ? 1 : -1;
      const x = side * (7.2 + (i % 4) * 0.5);
      const z = -4 + (i / 28) * 10;
      const radius = 0.25 + (i % 3) * 0.13;
      const rock = this.resources.createRock({
        radius,
        rotation: 0,
        color: 0x8a8b70,
      });
      rock.position.x = x;
      rock.position.z = z;
      this.root.add(rock);
    }
  }

  private buildDetails(): void {
    // 전투 범위 밖에 낮은 식생과 넓은 흙 면을 두어 대상과 기술 원을 가리지 않는다.
    for (const [x, z, width, depth] of [
      [-9, 1, 3.2, 4.3],
      [9.2, -1, 3, 3.8],
      [-4, -8, 5, 2.4],
    ] as const) {
      const geometry = groundGeometry([
        { x: x - width / 2, z: z - depth / 3 },
        { x: x + width / 3, z: z - depth / 2 },
        { x: x + width / 2, z: z + depth / 4 },
        { x: x - width / 3, z: z + depth / 2 },
      ]);
      this.grounds.push(geometry);
      const patch = new THREE.Mesh(
        geometry,
        this.resources.material('earth', 0x918b76),
      );
      patch.position.y = -0.028;
      patch.receiveShadow = true;
      setResourceOutline(patch, 'ground');
      this.root.add(patch);
    }
    for (const [i, [x, z]] of (
      [
        [-7.8, -3],
        [8.1, -1],
        [-8.3, 2],
        [8.5, 3.4],
        [-4.8, -7.8],
        [4.5, -8.2],
      ] as const
    ).entries()) {
      this.sprites.add(i % 2 ? 'fern' : 'root-grass', { x, z, width: 0.5 });
      if (i % 2 === 0)
        this.sprites.add('dry-leaves', {
          x: x + 0.4,
          z: z + 0.25,
          width: 0.6,
          depth: 0.4,
          kind: 'ground',
        });
    }
  }

  async load(): Promise<void> {
    await this.sprites.load();
  }
  face(camera: THREE.Camera): void {
    this.sprites.face(camera);
  }

  dispose(): void {
    this.sprites.dispose();
    this.grounds.forEach((geometry) => geometry.dispose());
    this.root.removeFromParent();
    this.root.clear();
    this.cube.dispose();
    this.resources.dispose();
  }
}
