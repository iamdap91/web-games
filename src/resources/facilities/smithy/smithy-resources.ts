import { groundGeometry } from '../../../rendering/ground-geometry.js';
import { MapSpriteResources } from '../../props/map-sprite-resources.js';
import * as THREE from 'three';
import {
  createPixelMaterial,
  villageColors,
} from '../../../rendering/pixel-material.js';
import { resourceLayers } from '../../../rendering/surface-types.js';
import {
  smithyLayout,
  smithyLevels,
  smithyPosts,
  type SmithyLevel,
} from './smithy-layout.js';

const colors = {
  stone: 0x898d86,
  lightStone: 0xa8aaa0,
  soot: 0x363d39,
  iron: 0x5c6869,
  steel: 0xa5b9b6,
  rust: 0x85624c,
  wood: villageColors.wood,
  board: 0xab8358,
  worn: 0x81745f,
  leather: 0x655144,
  bronze: 0xc3a15b,
  cloth: 0x416467,
} as const;

/** 무구 공방의 네 외형과 화덕·연기 수명을 소유한다. 장비 능력치는 다루지 않는다. */
export class SmithyResources {
  readonly root = new THREE.Group();
  private readonly sprites = new MapSpriteResources();
  private readonly cube = new THREE.BoxGeometry(1, 1, 1);
  private readonly cylinder = new THREE.CylinderGeometry(1, 1, 1, 10);
  private readonly sphere = new THREE.SphereGeometry(1, 7, 5);
  private readonly cone = new THREE.ConeGeometry(1, 1, 6);
  private readonly materials = new Map<number, THREE.MeshLambertMaterial>();
  private readonly variants = new Map<
    SmithyLevel,
    { readonly root: THREE.Group; readonly structure: THREE.Group }
  >();
  private readonly effects = new THREE.Group();
  private readonly flames: THREE.Mesh[] = [];
  private readonly smoke: THREE.Mesh<
    THREE.SphereGeometry,
    THREE.MeshBasicMaterial
  >[] = [];
  private readonly glow = new THREE.PointLight(0xff944a, 1.6, 3.2, 2);
  private elapsed = 0;
  private level: SmithyLevel = 0;

  constructor() {
    this.root.add(this.sprites.root);
    for (const level of smithyLevels) {
      const group = new THREE.Group();
      group.name = `smithy-level-${level}`;
      this.buildYard(group, level);
      const structure = new THREE.Group();
      structure.name = `${group.name}-structure`;
      group.add(structure);
      this.buildForge(structure, level);
      this.buildCanopy(structure, level);
      this.buildAnvil(structure, level);
      this.buildWorkbench(structure, level);
      this.buildTank(group, level);
      this.buildRack(group, level);
      this.variants.set(level, { root: group, structure });
      this.root.add(group);
    }
    this.buildEffects();
    this.root.add(this.effects);
    this.setLevel(0);
  }

  private material(color: number): THREE.MeshLambertMaterial {
    let material = this.materials.get(color);
    if (!material) {
      material = createPixelMaterial(color, {
        strength: { value: 0.42 },
        pattern: 'broad',
      });
      this.materials.set(color, material);
    }
    return material;
  }

  private shape(
    group: THREE.Group,
    geometry: THREE.BufferGeometry,
    position: readonly [number, number, number],
    size: readonly [number, number, number],
    color: number,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, this.material(color));
    mesh.position.set(...position);
    mesh.scale.set(...size);
    mesh.castShadow = size[1] > 0.08;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }

  private box(
    group: THREE.Group,
    position: readonly [number, number, number],
    size: readonly [number, number, number],
    color: number,
  ): THREE.Mesh {
    return this.shape(group, this.cube, position, size, color);
  }

  private buildYard(group: THREE.Group, level: SmithyLevel): void {
    const { yard } = smithyLayout;
    // 도장 마당과 이어지는 가장자리에서는 바닥층의 높이를 분리한다.
    const apron = new THREE.Mesh(
      groundGeometry([
        { x: yard.x - yard.width / 2, z: yard.z - yard.depth / 2 + 0.45 },
        {
          x: yard.x - yard.width / 2 + 0.55,
          z: yard.z - yard.depth / 2 - 0.12,
        },
        { x: yard.x + yard.width / 2 - 0.4, z: yard.z - yard.depth / 2 },
        { x: yard.x + yard.width / 2 + 0.12, z: yard.z - yard.depth / 3 },
        { x: yard.x + yard.width / 2, z: yard.z + yard.depth / 2 - 0.25 },
        { x: yard.x + yard.width / 3, z: yard.z + yard.depth / 2 + 0.12 },
        { x: yard.x - yard.width / 3, z: yard.z + yard.depth / 2 },
        { x: yard.x - yard.width / 2 - 0.12, z: yard.z + yard.depth / 3 },
      ]),
      this.material(villageColors.earth),
    );
    apron.position.y = 0.019;
    apron.receiveShadow = true;
    group.add(apron);
    // 울타리 남쪽으로 돌아 들어가는 길을 모든 단계에 남긴다.
    const { entrance } = smithyLayout;
    this.box(
      group,
      [entrance.x, 0.02, entrance.z],
      [entrance.width, 0.028, entrance.depth],
      villageColors.path,
    );
    for (let i = 0; i < (level === 0 ? 19 : 4); i++) {
      const x = -13.1 + ((i * 1.23) % 5.8);
      const z = i % 2 ? 5.6 : -1.4;
      const grass = this.box(group, [x, 0.15, z], [0.06, 0.3, 0.08], 0x738953);
      grass.rotation.z = ((i % 3) - 1) * 0.4;
    }
    if (level >= 2) {
      for (let i = 0; i < 8; i++) {
        this.box(
          group,
          [-13.2, 0.06, -1.12 + i * 0.94],
          [0.26, 0.12, 0.65],
          colors.stone,
        );
        this.box(
          group,
          [-12.84 + i * 0.77, 0.06, 5.91],
          [0.64, 0.12, 0.24],
          colors.stone,
        );
      }
      for (let i = 0; i < 6; i++)
        this.box(
          group,
          [-8.1 + i * 0.52, 0.04, 5.65],
          [0.39, 0.06, 0.7],
          colors.lightStone,
        );
    }
    if (level === 3) {
      // 최종 단계는 작업 공간의 넓은 석재 바닥으로도 구분한다.
      for (let x = 0; x < 5; x++)
        for (let z = 0; z < 4; z++)
          this.box(
            group,
            [-11.87 + x * 0.94, 0.045, 2.25 + z * 0.84],
            [0.87, 0.05, 0.77],
            (x + z) % 3 ? colors.stone : colors.lightStone,
          );
    }
  }

  private buildForge(group: THREE.Group, level: SmithyLevel): void {
    const { forge, chimney } = smithyLayout;
    const broken = level === 0;
    const sideOffset = 0.74,
      wallWidth = 0.49;
    this.box(
      group,
      [forge.x, 0.14, forge.z],
      [forge.width, 0.28, forge.depth],
      colors.soot,
    );
    for (let row = 0; row < 4; row++) {
      for (const side of [-1, 1]) {
        const block = this.box(
          group,
          [forge.x + side * sideOffset, 0.46 + row * 0.3, forge.z],
          [wallWidth, 0.28, forge.depth],
          row % 2 ? colors.stone : colors.lightStone,
        );
        if (broken && side === 1 && row > 1) {
          block.position.y -= 0.42;
          block.rotation.z = -0.23;
        }
      }
      this.box(
        group,
        [forge.x, 0.46 + row * 0.3, forge.z - 0.59],
        [sideOffset * 2 - wallWidth, 0.28, 0.45],
        colors.stone,
      );
    }
    if (!broken) {
      this.box(
        group,
        [forge.x, 1.63, forge.z],
        [forge.width + 0.06, 0.24, forge.depth],
        colors.stone,
      );
      this.box(
        group,
        [forge.x, 0.49, forge.z + 0.13],
        [0.9, 0.12, 1.0],
        colors.soot,
      );
      for (let i = 0; i < 5; i++)
        this.box(
          group,
          [forge.x - 0.36 + i * 0.18, 0.59, forge.z + 0.3],
          [0.11, 0.09, 0.7],
          colors.iron,
        );
    }
    const chimneyHeight = broken ? 1.12 : chimney.height;
    this.box(
      group,
      [chimney.x, chimneyHeight / 2, chimney.z],
      [chimney.width, chimneyHeight, chimney.depth],
      colors.stone,
    );
    const top = this.box(
      group,
      [chimney.x, chimneyHeight, chimney.z],
      [0.93, 0.17, 0.97],
      colors.soot,
    );
    if (broken) top.rotation.z = 0.16;
    if (level >= 2) {
      for (const y of [1.9, 2.85])
        this.box(
          group,
          [chimney.x, y, chimney.z],
          [0.77, 0.08, 0.83],
          level === 3 ? colors.bronze : colors.iron,
        );
      for (const side of [-1, 1])
        this.box(
          group,
          [forge.x + side * 0.52, 1.05, forge.z + 0.84],
          [0.07, 0.98, 0.08],
          colors.iron,
        );
    }
    if (broken) {
      for (let i = 0; i < 5; i++) {
        const rubble = this.box(
          group,
          [forge.x + 0.5 + (i % 2) * 0.22, 0.19, forge.z + 0.15 + i * 0.1],
          [0.37, 0.3, 0.28],
          colors.stone,
        );
        rubble.rotation.y = i * 0.6;
        rubble.rotation.z = 0.04 * (i + 1);
      }
    }
  }

  private buildCanopy(group: THREE.Group, level: SmithyLevel): void {
    const { canopy } = smithyLayout;
    for (const [i, post] of smithyPosts.entries()) {
      const height = level === 0 ? 0.65 + (i % 2) * 0.55 : canopy.height;
      this.box(group, [post.x, 0.06, post.z], [0.37, 0.12, 0.37], colors.stone);
      this.box(
        group,
        [post.x, height / 2, post.z],
        [post.width, height, post.depth],
        level >= 2 ? colors.wood : colors.worn,
      );
    }
    if (level === 0) {
      for (let i = 0; i < 5; i++) {
        const plank = this.box(
          group,
          [-10.2 + i * 0.46, 0.13, -0.7],
          [0.21, 0.12, 1.23],
          colors.worn,
        );
        plank.rotation.y = (i - 2) * 0.31;
      }
      return;
    }
    const sidePosts = [-10.9, -7.4] as const;
    const beamWidth = 0.17;
    for (const z of [-1.3, 1.7])
      this.box(
        group,
        [canopy.x, canopy.height, z],
        [sidePosts[1] - sidePosts[0] - beamWidth, 0.18, 0.16],
        colors.wood,
      );
    for (const x of sidePosts)
      this.box(
        group,
        [x, canopy.height, canopy.z],
        [beamWidth, 0.18, canopy.depth],
        colors.wood,
      );
    for (let i = 0; i < 12; i++) {
      if (level === 1 && i < 5) continue;
      const panel = this.box(
        group,
        [canopy.x - 1.73 + i * 0.315, canopy.height + 0.1, canopy.z],
        [0.3, 0.1, canopy.depth],
        level === 3 ? colors.iron : level === 2 ? colors.board : colors.worn,
      );
      panel.rotation.x = 0.1;
    }
    if (level === 3) {
      for (const z of [-1.45, 1.86])
        this.box(
          group,
          [canopy.x, canopy.height + (z < 0 ? 0.28 : -0.04), z],
          [canopy.width + 0.07, 0.11, 0.13],
          colors.bronze,
        );
      const sign = new THREE.Group();
      sign.position.set(canopy.x, 2.12, 1.87);
      this.box(sign, [0, 0, 0], [1.25, 0.57, 0.09], colors.cloth);
      this.box(sign, [0, 0.31, 0], [1.4, 0.09, 0.12], colors.bronze);
      this.buildGauntlet(sign, {
        x: 0,
        y: -0.02,
        z: 0.09,
        scale: 0.78,
        polished: true,
      });
      group.add(sign);
    }
  }

  private buildAnvil(group: THREE.Group, level: SmithyLevel): void {
    const { anvil } = smithyLayout;
    this.box(
      group,
      [anvil.x, 0.15, anvil.z],
      [anvil.width, 0.3, anvil.depth],
      colors.stone,
    );
    this.shape(
      group,
      this.cylinder,
      [anvil.x, 0.48, anvil.z],
      [0.46, 0.52, 0.35],
      colors.wood,
    );
    const metal = level === 0 ? colors.rust : colors.iron;
    this.box(group, [anvil.x, 0.8, anvil.z], [0.55, 0.38, 0.4], metal);
    this.box(
      group,
      [anvil.x, 1.04, anvil.z],
      [0.93, 0.18, 0.52],
      level >= 2 ? colors.steel : metal,
    );
    const horn = this.shape(
      group,
      this.cone,
      [anvil.x - 0.57, 1.02, anvil.z],
      [0.19, 0.64, 0.17],
      metal,
    );
    horn.rotation.z = Math.PI / 2;
    this.box(
      group,
      [anvil.x + 0.19, 1.19, anvil.z + 0.04],
      [0.13, 0.08, 0.55],
      colors.wood,
    );
    this.box(
      group,
      [anvil.x + 0.19, 1.24, anvil.z - 0.19],
      [0.4, 0.2, 0.16],
      metal,
    );
  }

  private buildWorkbench(group: THREE.Group, level: SmithyLevel): void {
    const { bench } = smithyLayout;
    for (const dx of [-0.68, 0.68])
      for (const dz of [-0.24, 0.24])
        this.box(
          group,
          [bench.x + dx, bench.height / 2, bench.z + dz],
          [0.14, bench.height, 0.14],
          colors.wood,
        );
    for (let i = 0; i < 4; i++) {
      if (level === 0 && i === 2) continue;
      const plank = this.box(
        group,
        [bench.x, bench.height, bench.z - 0.3 + i * 0.2],
        [bench.width, 0.13, 0.19],
        level >= 2 ? colors.board : colors.worn,
      );
      if (level === 0) {
        plank.rotation.z = (i - 1) * 0.14;
        plank.position.y -= 0.2;
      }
    }
    if (level > 0) {
      this.buildGauntlet(group, {
        x: bench.x - 0.34,
        y: bench.height + 0.25,
        z: bench.z,
        scale: 0.8,
        polished: level === 3,
      });
      for (const [key, dx, dz, width] of [
        ['hammer', 0.57, 0.09, 0.44],
        ['tongs', 0.19, -0.07, 0.46],
        ['metal-offcuts', -0.58, 0.23, 0.32],
      ] as const)
        this.sprites.add(key, {
          x: bench.x + dx,
          z: bench.z + dz,
          y: bench.height + 0.075,
          width,
          depth: width * 0.6,
          kind: 'ground',
          parent: group,
        });
    }
  }

  private buildTank(group: THREE.Group, level: SmithyLevel): void {
    const { tank } = smithyLayout;
    this.shape(
      group,
      this.cylinder,
      [tank.x, 0.08, tank.z],
      [0.5, 0.16, 0.5],
      colors.wood,
    );
    const staveCount = 12,
      radius = 0.44,
      depth = 0.11;
    // 통 안쪽 가장자리에서 옆 판자와 만나지 않는 폭으로 윗면 겹침을 피한다.
    const width =
      2 * (radius - depth / 2) * Math.tan(Math.PI / staveCount) - 0.01;
    for (let i = 0; i < staveCount; i++) {
      const angle = (i / staveCount) * Math.PI * 2;
      const height = level === 0 && i % 3 === 0 ? 0.34 : 0.7;
      const stave = this.box(
        group,
        [
          tank.x + Math.sin(angle) * radius,
          height / 2,
          tank.z + Math.cos(angle) * radius,
        ],
        [width, height, depth],
        level >= 2 ? colors.board : colors.worn,
      );
      stave.rotation.y = angle;
    }
    for (const y of [0.17, 0.52]) {
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(0.46, 0.025, 4, 12),
        this.material(level === 3 ? colors.bronze : colors.iron),
      );
      band.rotation.x = Math.PI / 2;
      band.position.set(tank.x, y, tank.z);
      group.add(band);
    }
    this.shape(
      group,
      this.cylinder,
      [tank.x, level > 0 ? 0.57 : 0.15, tank.z],
      [0.38, 0.025, 0.38],
      level > 0 ? 0x537777 : colors.soot,
    );
  }

  private buildRack(group: THREE.Group, level: SmithyLevel): void {
    const { rack } = smithyLayout;
    for (const dx of [-0.73, 0.73])
      this.box(
        group,
        [rack.x + dx, 0.86, rack.z],
        [0.14, 1.72, 0.15],
        colors.wood,
      );
    for (const y of [0.12, 1.64]) {
      const rail = this.box(
        group,
        [rack.x, y, rack.z],
        [rack.width, 0.12, 0.17],
        level === 0 ? colors.worn : colors.board,
      );
      if (level === 0) rail.rotation.z = -0.13;
    }
    if (level < 2) return;
    this.buildGauntlet(group, {
      x: rack.x - 0.43,
      y: 1.25,
      z: rack.z + 0.11,
      scale: 1.1,
      polished: level === 3,
    });
    this.buildGauntlet(group, {
      x: rack.x + 0.36,
      y: 1.25,
      z: rack.z + 0.11,
      scale: 1.1,
      polished: level === 3,
    });
    if (level === 3) {
      this.box(
        group,
        [rack.x, 0.65, rack.z + 0.05],
        [0.79, 0.47, 0.18],
        colors.steel,
      );
      for (const x of [-0.38, 0, 0.38])
        this.box(
          group,
          [rack.x + x, 0.66, rack.z + 0.16],
          [0.045, 0.48, 0.035],
          colors.bronze,
        );
    }
  }

  private buildGauntlet(
    group: THREE.Group,
    options: {
      readonly x: number;
      readonly y: number;
      readonly z: number;
      readonly scale: number;
      readonly polished: boolean;
    },
  ): void {
    const glove = new THREE.Group();
    glove.position.set(options.x, options.y, options.z);
    glove.scale.setScalar(options.scale);
    const metal = options.polished ? colors.steel : colors.iron;
    this.box(glove, [0, -0.13, 0], [0.34, 0.3, 0.16], colors.leather);
    this.box(glove, [0, 0.1, 0], [0.44, 0.28, 0.22], metal);
    this.box(
      glove,
      [0, -0.13, 0.1],
      [0.38, 0.065, 0.1],
      options.polished ? colors.bronze : metal,
    );
    for (let i = 0; i < 4; i++)
      this.box(
        glove,
        [-0.165 + i * 0.11, 0.22, 0.04],
        [0.09, 0.13, 0.24],
        options.polished ? colors.bronze : metal,
      );
    this.box(glove, [0.27, 0.055, 0.04], [0.15, 0.18, 0.2], metal);
    group.add(glove);
  }

  private buildEffects(): void {
    const { forge } = smithyLayout;
    for (let i = 0; i < 5; i++) {
      const flame = new THREE.Mesh(
        this.cone,
        new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffd579 : 0xf09b43 }),
      );
      flame.position.set(forge.x - 0.34 + i * 0.17, 0.87, forge.z + 0.63);
      this.flames.push(flame);
      this.effects.add(flame);
    }
    this.glow.position.set(forge.x, 0.96, forge.z + 1);
    this.effects.add(this.glow);
    for (let i = 0; i < 6; i++) {
      const puff = new THREE.Mesh(
        this.sphere,
        new THREE.MeshBasicMaterial({
          color: 0xb2b2a4,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        }),
      );
      puff.layers.set(resourceLayers.effects);
      this.smoke.push(puff);
      this.effects.add(puff);
    }
  }

  setLevel(level: SmithyLevel): void {
    this.level = level;
    for (const [name, { root }] of this.variants) root.visible = name === level;
    this.effects.visible = level > 0;
    this.update(0);
  }

  get interactionStructure(): THREE.Group | undefined {
    for (const { root, structure } of this.variants.values())
      if (root.visible) return structure;
    return undefined;
  }

  update(dt: number): void {
    if (this.level === 0) return;
    if (Number.isFinite(dt)) this.elapsed += Math.max(0, Math.min(dt, 0.05));
    for (const [i, flame] of this.flames.entries()) {
      const height = 0.41 + Math.sin(this.elapsed * 7 + i * 1.7) * 0.095;
      flame.scale.set(0.12, height, 0.1);
      flame.position.y = 0.66 + height / 2;
      flame.rotation.z = Math.sin(this.elapsed * 4 + i) * 0.12;
    }
    this.glow.intensity = 1.7 + Math.sin(this.elapsed * 6) * 0.18;
    const { chimney } = smithyLayout;
    for (const [i, puff] of this.smoke.entries()) {
      const phase = (this.elapsed * 0.25 + i / this.smoke.length) % 1;
      const size = 0.12 + phase * 0.25;
      puff.position.set(
        chimney.x + phase * 0.46,
        chimney.height + 0.15 + phase * 1.6,
        chimney.z + Math.sin(phase * 5 + i) * 0.08,
      );
      puff.scale.set(size, size * 0.8, size);
      puff.material.opacity = Math.sin(phase * Math.PI) * 0.3;
    }
  }

  get diagnostics(): object {
    return {
      level: this.level,
      active: this.effects.visible,
      time: this.elapsed,
    };
  }

  async load(): Promise<void> {
    await this.sprites.load();
  }

  face(camera: THREE.Camera): void {
    this.sprites.face(camera);
  }

  dispose(): void {
    this.sprites.dispose();
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    this.root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      geometries.add(object.geometry);
      if (Array.isArray(object.material))
        object.material.forEach((material) => materials.add(material));
      else materials.add(object.material);
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
  }
}
