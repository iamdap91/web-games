import * as THREE from 'three';
import {
  createPixelMaterial,
  villageColors,
} from '../../../rendering/pixel-material.js';
import {
  dojoLayout,
  dojoPillars,
  dojoStages,
  type DojoStage,
} from './dojo-layout.js';

const colors = {
  timber: 0x79573e,
  board: 0xab8358,
  worn: 0x82715c,
  wall: 0xc8b78e,
  plaster: 0xe2ceaa,
  roof: 0x64756a,
  fadedRoof: 0x6b7872,
  dark: 0x3b4137,
  stone: 0xaaa389,
} as const;

// 무너진 곳과 임시 판자를 같은 위치에 배치해 수리의 전후 관계를 유지한다.
function roofOpening(column: number, row: number, side: number): boolean {
  if (side === -1) return column >= 18 && row >= 3;
  return (column >= 14 && row >= 2) || (column >= 4 && column <= 6 && row >= 3);
}

/** 무도장 세 상태의 입체 리소스와 재질을 소유한다. 게임 진행 규칙은 포함하지 않는다. */
export class DojoResources {
  readonly root = new THREE.Group();
  private readonly cube = new THREE.BoxGeometry(1, 1, 1);
  private readonly cylinder = new THREE.CylinderGeometry(1, 1, 1, 8);
  private readonly materials = new Map<number, THREE.MeshLambertMaterial>();
  private readonly textures: THREE.Texture[] = [];
  private readonly variants = new Map<
    DojoStage,
    { readonly root: THREE.Group; readonly structure: THREE.Group }
  >();

  constructor(options: { readonly includeYard?: boolean } = {}) {
    for (const stage of dojoStages) {
      const group = new THREE.Group();
      group.name = `dojo-${stage}`;
      const structure = new THREE.Group();
      structure.name = `${group.name}-structure`;
      group.add(structure);
      this.buildHouse(structure, stage);
      this.buildRoof(structure, stage);
      // 독립 수련 마당은 판정과 연결된 바닥·목인을 따로 소유한다.
      if (options.includeYard !== false) this.buildYard(group, stage);
      this.root.add(group);
      this.variants.set(stage, { root: group, structure });
    }
    this.setStage('weathered');
  }

  setStage(stage: DojoStage): void {
    for (const [name, { root }] of this.variants) root.visible = name === stage;
  }

  get interactionStructure(): THREE.Group | undefined {
    for (const { root, structure } of this.variants.values())
      if (root.visible) return structure;
    return undefined;
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

  private box(
    group: THREE.Group,
    position: readonly [number, number, number],
    size: readonly [number, number, number],
    color: number,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(this.cube, this.material(color));
    mesh.position.set(...position);
    mesh.scale.set(...size);
    mesh.castShadow = size[1] > 0.08;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }

  private pole(
    group: THREE.Group,
    position: readonly [number, number, number],
    radius: number,
    height: number,
    color: number,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(this.cylinder, this.material(color));
    mesh.position.set(...position);
    mesh.scale.set(radius, height, radius);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }

  private buildHouse(group: THREE.Group, stage: DojoStage): void {
    const repaired = stage === 'restored';
    const wall = repaired ? colors.plaster : colors.wall;
    const timber = repaired ? colors.timber : colors.worn;
    const { building, porch, steps } = dojoLayout;
    this.box(group, [0, 0.16, -2.4], [8.45, 0.32, 6.4], colors.stone);
    // 이음새를 크게 나눠 실제 플레이 거리에서도 돌기단으로 읽히게 한다.
    for (let i = 0; i < 10; i++)
      this.box(
        group,
        [-3.83 + i * 0.85, 0.18, 0.76],
        [0.78, 0.27, 0.18],
        i % 3 ? colors.stone : 0x8a8b70,
      );
    this.box(
      group,
      [building.x, 1.73, building.z - building.depth / 2 + 0.1],
      [building.width, 2.62, 0.22],
      wall,
    );
    for (const x of [
      building.x - building.width / 2 + 0.1,
      building.x + building.width / 2 - 0.1,
    ]) {
      const damagedSide = stage !== 'restored' && x > 0;
      this.box(
        group,
        [x, 1.73, building.z - (damagedSide ? 0.85 : 0)],
        [0.22, 2.62, building.depth - (damagedSide ? 1.7 : 0)],
        wall,
      );
      if (damagedSide) {
        for (let i = 0; i < 5; i++)
          this.box(
            group,
            [x, 0.87 + i * 0.43, -1.35],
            [0.15, stage === 'patched' ? 0.34 : 0.06, 1.65],
            stage === 'patched' ? colors.board : colors.worn,
          );
      }
      for (const z of [-5.35, -3.05, -0.65]) {
        this.box(group, [x, 1.76, z], [0.28, 2.75, 0.25], timber);
        this.box(group, [x, 0.59, z], [0.43, 0.34, 0.43], colors.stone);
      }
      this.box(group, [x, 1.08, -3], [0.3, 0.12, 4.9], timber);
      this.box(group, [x, 2.95, -3], [0.34, 0.19, 5.2], timber);
    }
    // 열린 현관 안에는 어두운 마루와 뒷벽만 두어 실내 공간의 깊이를 보여준다.
    // 실내 마루는 현관 마루의 시작선에서 끝내 같은 높이의 윗면이 겹치지 않게 한다.
    const floorBack = building.z - building.depth / 2 + 0.2;
    const floorFront = porch.z - porch.depth / 2;
    this.box(
      group,
      [building.x, porch.height - 0.04, (floorBack + floorFront) / 2],
      [7.65, 0.08, floorFront - floorBack],
      colors.timber,
    );
    this.box(group, [0, 1.7, -4.95], [7.45, 2.5, 0.06], colors.dark);
    this.buildFrontWalls(group, stage);
    for (const { x, z, width, depth } of dojoPillars) {
      const post = this.box(group, [x, 1.76, z], [0.22, 2.72, 0.22], timber);
      if (stage === 'weathered' && x === 3.85) post.rotation.z = 0.14;
      this.box(group, [x, 0.55, z], [width, 0.3, depth], colors.stone);
      this.box(group, [x, 2.96, 0.16], [0.62, 0.15, 0.3], timber);
    }
    if (stage === 'weathered') {
      this.box(group, [-1.4, 3.05, 0.16], [5.6, 0.26, 0.28], timber);
      const brokenBeam = this.box(
        group,
        [2.77, 2.7, 0.16],
        [2.45, 0.26, 0.28],
        timber,
      );
      brokenBeam.rotation.z = -0.23;
    } else {
      this.box(group, [0, 3.05, 0.16], [8.4, 0.26, 0.28], timber);
    }
    for (let i = 0; i < 22; i++) {
      const damagedBoard = i === 1 || i === 2 || i >= 15;
      if (stage === 'weathered' && damagedBoard) {
        if (i % 2 === 0) {
          const fragment = this.box(
            group,
            [-4 + i * 0.38, porch.height - 0.07, -0.29],
            [0.355, 0.11, 0.38],
            colors.worn,
          );
          fragment.rotation.y = ((i % 3) - 1) * 0.18;
        }
        continue;
      }
      const board = this.box(
        group,
        [-4 + i * 0.38, porch.height - 0.055, porch.z],
        [0.355, 0.11, porch.depth],
        repaired
          ? i % 4 === 0
            ? 0xba9566
            : colors.board
          : stage === 'patched' && damagedBoard
            ? colors.board
            : colors.worn,
      );
      if (stage === 'weathered' && i === 14) board.rotation.x = 0.11;
    }
    for (let i = 0; i < steps.count; i++) {
      const height = ((i + 1) * porch.height) / steps.count;
      const depth = steps.depth / steps.count;
      this.box(
        group,
        [steps.x, height / 2, steps.z + steps.depth / 2 - (i + 0.5) * depth],
        [steps.width - (repaired ? 0 : i * 0.1), height, depth],
        repaired ? colors.stone : 0x8a8b70,
      );
    }
    if (!repaired) {
      for (const [x, y] of [
        [-3.6, 1.1],
        [2.1, 2.5],
        [3.3, 0.9],
      ] as const) {
        const crack = this.box(
          group,
          [x, y, -0.43],
          [0.055, 0.5, 0.016],
          0x968767,
        );
        crack.rotation.z = 0.3;
      }
    }
    if (stage === 'weathered') {
      const fallen = this.box(
        group,
        [3.36, 0.35, 1.17],
        [0.26, 0.09, 1.65],
        colors.worn,
      );
      fallen.rotation.y = -0.35;
    }
    this.buildSign(group, stage);
    this.buildLantern(group, { x: -1.9, lit: repaired });
  }

  private buildFrontWalls(group: THREE.Group, stage: DojoStage): void {
    const timber = stage === 'restored' ? colors.timber : colors.worn;
    const wall = stage === 'restored' ? colors.plaster : colors.wall;
    for (const x of [-2.72, 2.72]) {
      if (stage !== 'restored' && x > 0) {
        this.box(group, [1.84, 1.55, -0.54], [0.42, 2.2, 0.14], wall);
        this.box(group, [3.53, 0.79, -0.54], [0.58, 0.7, 0.14], wall);
        for (let i = 0; i < 4; i++)
          this.box(
            group,
            [2.08 + i * 0.49, 1.57, -0.5],
            [0.08, 2.22 - (i % 2) * 0.38, 0.1],
            timber,
          );
        for (const y of [0.76, 1.75, 2.54])
          this.box(group, [2.83, y, -0.47], [1.83, 0.08, 0.1], timber);
        if (stage === 'patched') {
          for (let i = 0; i < 6; i++)
            this.box(
              group,
              [2.83, 0.78 + i * 0.35, -0.38],
              [1.86, 0.29, 0.08],
              i % 2 ? colors.board : 0xba9566,
            );
          const brace = this.box(
            group,
            [2.76, 1.65, -0.27],
            [0.19, 2.6, 0.12],
            colors.board,
          );
          brace.rotation.z = -0.51;
          this.box(group, [3.5, 2.73, -0.25], [0.53, 0.17, 0.24], colors.board);
        } else {
          const brokenFrame = this.box(
            group,
            [2.91, 1.7, -0.35],
            [1.1, 0.09, 0.12],
            timber,
          );
          brokenFrame.rotation.z = -0.4;
        }
        continue;
      }
      this.box(group, [x, 1.63, -0.54], [2.2, 2.38, 0.14], wall);
      this.box(group, [x, 1.7, -0.42], [1.18, 1.16, 0.06], colors.dark);
      for (let i = -2; i <= 2; i++)
        this.box(
          group,
          [x + i * 0.22, 1.7, -0.36],
          [0.065, 1.18, 0.07],
          timber,
        );
      this.box(group, [x, 1.7, -0.33], [1.28, 0.06, 0.08], timber);
    }
  }

  private buildRoof(group: THREE.Group, stage: DojoStage): void {
    const repaired = stage === 'restored';
    const timber = repaired ? colors.timber : colors.worn;
    const span = 3.35;
    const rows = 6;
    const columns = 22;
    for (const side of [-1, 1]) {
      for (let col = 0; col < columns; col++) {
        const x = (col - (columns - 1) / 2) * 0.44;
        const edgeLift = Math.pow(Math.abs(x) / 4.8, 6) * 0.32;
        const collapsed = stage === 'weathered' && x > 1.2 && side === 1;
        const sag = collapsed ? (x - 1.2) * 0.3 : 0;
        const brokenLength = collapsed && col % 3 === 0 ? 0.72 : 1;
        const rafter = this.box(
          group,
          [x, 3.89 + edgeLift / 2 - sag / 2, -3 + (side * span) / 2],
          [0.075, 0.12, (Math.hypot(span, 1.4 + sag) - 0.16) * brokenLength],
          timber,
        );
        rafter.rotation.x = side * Math.atan2(1.4 + sag, span);
        if (collapsed) rafter.rotation.z = col % 2 ? -0.07 : 0.04;
        for (let row = 0; row < rows; row++) {
          const opening = !repaired && roofOpening(col, row, side);
          if (opening && stage === 'weathered') continue;
          const t = (row + 0.5) / rows;
          const y = 4.65 - t * 1.4 + edgeLift * t - sag * t;
          // 경사면의 실제 행 간격보다 짧게 만들어 기와의 윗면과 옆면을 분리한다.
          const tile = this.box(
            group,
            [x, y, -3 + side * span * t],
            [
              opening ? 0.434 : 0.426,
              opening ? 0.13 : 0.1,
              Math.hypot(span, 1.4 - edgeLift + sag) / rows - 0.025,
            ],
            opening
              ? col % 3
                ? colors.board
                : 0xba9566
              : repaired
                ? col % 4 === 0
                  ? colors.fadedRoof
                  : colors.roof
                : col % 5 === 0
                  ? 0x879080
                  : colors.fadedRoof,
          );
          tile.rotation.x = side * Math.atan2(1.4 - edgeLift + sag, span);
        }
      }
      if (stage === 'weathered' && side === 1) {
        this.box(
          group,
          [-1.8, 3.22, -3 + span + 0.02],
          [6.1, 0.16, 0.18],
          timber,
        );
        const fragment = this.box(
          group,
          [3.15, 2.45, -3 + span],
          [2.75, 0.16, 0.18],
          timber,
        );
        fragment.rotation.z = -0.27;
      } else {
        this.box(
          group,
          [0, 3.22, -3 + side * (span + 0.02)],
          [9.7, 0.16, 0.18],
          timber,
        );
      }
      if (stage === 'patched') {
        for (const row of [3, 5]) {
          const t = (row + 0.5) / rows;
          const batten = this.box(
            group,
            [3.07, 4.76 - t * 1.4, -3 + side * span * t],
            [3.55, 0.095, 0.12],
            colors.timber,
          );
          batten.rotation.x = side * Math.atan2(1.4, span);
        }
      }
    }
    this.box(group, [0, 4.68, -3], [9.9, 0.18, 0.3], colors.roof);
    for (const x of [-4.95, 4.95]) {
      const cap = this.box(
        group,
        [x, 4.78, -3],
        [0.5, 0.16, 0.32],
        colors.roof,
      );
      cap.rotation.z = Math.sign(x) * 0.25;
    }
  }

  private buildSign(group: THREE.Group, stage: DojoStage): void {
    const repaired = stage === 'restored';
    const sign = new THREE.Group();
    // 현관 옆 기둥에 붙여 마루에 선 캐릭터의 얼굴과 출입구를 가리지 않는다.
    sign.position.set(1.61, 1.96, 0.34);
    sign.rotation.z = repaired ? 0 : stage === 'weathered' ? -0.22 : -0.085;
    this.box(
      sign,
      [0, 0, 0],
      [0.65, 1.52, 0.16],
      repaired ? colors.timber : colors.worn,
    );
    this.box(
      sign,
      [0, 0, 0.09],
      [0.51, 1.36, 0.04],
      repaired ? 0xb4945a : 0x93856a,
    );
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 192;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('간판을 그릴 수 없습니다.');
    context.fillStyle = repaired ? '#302f24' : '#595444';
    context.font = 'bold 44px serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    for (const [index, letter] of [...'무도장'].entries())
      context.fillText(letter, 32, 34 + index * 62);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    this.textures.push(texture);
    const letters = new THREE.Mesh(
      new THREE.PlaneGeometry(0.47, 1.3),
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
      }),
    );
    letters.position.z = 0.12;
    sign.add(letters);
    group.add(sign);
  }

  private buildLantern(
    group: THREE.Group,
    { x, lit }: { readonly x: number; readonly lit: boolean },
  ): void {
    const lantern = new THREE.Group();
    lantern.position.set(x, 2.3, 0.56);
    this.box(lantern, [0, 0.43, 0], [0.045, 0.38, 0.045], colors.dark);
    const paper = this.box(
      lantern,
      [0, 0, 0],
      [0.3, 0.5, 0.3],
      lit ? 0xf2c675 : 0x99876a,
    );
    if (lit) {
      const material = this.material(0xf2c675);
      material.emissive.setHex(0xffa33b);
      material.emissiveIntensity = 0.55;
      paper.material = material;
    }
    for (const y of [-0.28, 0.28])
      this.box(lantern, [0, y, 0], [0.39, 0.09, 0.39], colors.dark);
    for (const dx of [-0.155, 0.155])
      this.box(lantern, [dx, 0, 0.155], [0.025, 0.5, 0.025], colors.timber);
    group.add(lantern);
  }

  private buildYard(group: THREE.Group, stage: DojoStage): void {
    const repaired = stage === 'restored';
    const { dummy, logs, fence } = dojoLayout;
    if (stage === 'weathered') {
      for (const [row, width] of [8.8, 9.4, 8.9, 9.7, 10, 8.6, 9.2].entries())
        this.box(
          group,
          [-0.2 + ((row % 3) - 1) * 0.2, 0.009, 0.94 + row * 0.78],
          [width, 0.025, 0.78],
          villageColors.earth,
        );
    } else {
      this.box(
        group,
        [-0.2, 0.009, 3.35],
        [10.1, 0.025, 5.7],
        villageColors.earth,
      );
    }
    this.box(
      group,
      [dummy.x, 0.033, dummy.z + 0.4],
      [2.45, 0.03, 2.6],
      villageColors.path,
    );
    // 세 상태에서 같은 수련목과 닳은 땅을 보존해 사용해 온 장소라는 인상을 남긴다.
    this.box(
      group,
      [dummy.x, 0.12, dummy.z],
      [dummy.width, 0.24, dummy.depth],
      colors.stone,
    );
    this.pole(group, [dummy.x, 1.08, dummy.z], 0.19, 1.92, colors.timber);
    for (let i = 0; i < 7; i++)
      this.pole(
        group,
        [dummy.x, 0.91 + i * 0.055, dummy.z],
        0.23,
        0.035,
        i % 2 ? 0xa98e60 : 0xc9b388,
      );
    this.box(
      group,
      [dummy.x, 1.48, dummy.z + 0.3],
      [0.9, 0.12, 0.16],
      colors.worn,
    );
    this.box(
      group,
      [dummy.x, 0.72, dummy.z + 0.3],
      [0.11, 0.12, 0.58],
      colors.worn,
    );
    for (let i = 0; i < 3; i++)
      this.box(
        group,
        [dummy.x - 0.075 + i * 0.075, 1.23 - i * 0.045, dummy.z + 0.194],
        [0.025, 0.1, 0.016],
        colors.dark,
      );
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3 - row; col++) {
        const log = this.pole(
          group,
          [logs.x + (col - 1 + row / 2) * 0.38, 0.21 + row * 0.33, logs.z],
          0.2,
          1.45,
          colors.timber,
        );
        log.rotation.x = Math.PI / 2;
        const end = this.pole(
          group,
          [log.position.x, log.position.y, logs.z + 0.736],
          0.157,
          0.015,
          colors.board,
        );
        end.rotation.x = Math.PI / 2;
      }
    }
    if (repaired) {
      for (let i = 0; i < 6; i++)
        this.box(
          group,
          [i % 2 ? 0.1 : -0.12, 0.038, 1.93 + i * 0.72],
          [1.35, 0.07, 0.53],
          i % 2 ? colors.stone : 0xb1af8b,
        );
      this.box(
        group,
        [logs.x, 0.05, logs.z],
        [logs.width, 0.1, logs.depth],
        colors.worn,
      );
      for (let i = 0; i < 7; i++)
        this.box(
          group,
          [4.88, 0.055, 1.3 + i * 0.65],
          [0.32, 0.11, 0.45],
          colors.stone,
        );
    } else this.buildUnrestoredYard(group, stage);
    for (let i = 0; i < 5; i++) {
      const z = fence.z - fence.depth / 2 + (i * fence.depth) / 4;
      const brokenPost = stage === 'weathered' && i > 0 && i < 4;
      const height = brokenPost ? 0.58 : 1.04;
      const post = this.box(
        group,
        [fence.x, height / 2, z],
        [fence.width, height, 0.2],
        repaired ? colors.board : colors.worn,
      );
      if (!repaired && i === 3) post.rotation.x = brokenPost ? 0.85 : 0.28;
      if (i === 4 || (!repaired && i === 2)) continue;
      for (const y of [0.35, 0.75]) {
        const fallen = stage === 'weathered' && i > 0;
        const rail = this.box(
          group,
          [fence.x, fallen ? 0.11 + y * 0.16 : y, z + 0.65],
          [0.11, 0.11, 1.35],
          colors.timber,
        );
        if (fallen) rail.rotation.x = y === 0.35 ? 0.18 : -0.12;
        else if (!repaired && i === 3) rail.rotation.x = -0.22;
      }
    }
  }

  private buildUnrestoredYard(
    group: THREE.Group,
    stage: 'weathered' | 'patched',
  ): void {
    const patched = stage === 'patched';
    if (patched) {
      this.box(
        group,
        [0, 0.026, 3.57],
        [1.32, 0.035, 4.05],
        villageColors.path,
      );
      for (let i = 0; i < 5; i++) {
        const board = this.box(
          group,
          [4.5, 0.08 + i * 0.07, 1.15],
          [0.23, 0.065, 1.4],
          colors.worn,
        );
        board.rotation.y = 0.16;
      }
    } else {
      for (let i = 0; i < 5; i++) {
        const board = this.box(
          group,
          [
            2.85 + (i % 3) * 0.52,
            0.09 + (i % 2) * 0.03,
            1 + Math.floor(i / 3) * 0.55,
          ],
          [0.21, 0.1, 1.24],
          colors.worn,
        );
        board.rotation.y = (i - 2) * 0.48;
      }
    }
    for (let i = 0; i < (patched ? 8 : 20); i++) {
      const position: readonly [number, number, number] = patched
        ? [
            3.65 + (i % 2) * 0.41,
            0.075 + Math.floor(i / 4) * 0.1,
            1.22 + Math.floor((i % 4) / 2) * 0.4,
          ]
        : [
            2.7 + ((i * 0.83) % 2.1),
            0.075 + (i % 3) * 0.035,
            0.85 + ((i * 0.53) % 1.9),
          ];
      const tile = this.box(
        group,
        position,
        [0.36, 0.13, 0.4],
        colors.fadedRoof,
      );
      tile.rotation.y = patched ? 0.1 : i * 1.2;
      // 잔해가 포개져도 윗면이 같은 평면을 공유하지 않게 비스듬히 눕힌다.
      tile.rotation.x = 0.025 + i * 0.007;
    }
    if (!patched) this.box(group, [0, 0.028, 5.9], [1.1, 0.04, 0.48], 0x8a8b70);
    for (let i = 0; i < (patched ? 12 : 38); i++) {
      const x = -4.8 + ((i * 1.37) % 9.2);
      const z = i % 2 ? 5.3 + (i % 4) * 0.2 : 0.9 + (i % 5) * 0.18;
      if (Math.abs(x) < 1.5 || (x < -2 && z < 4)) continue;
      for (let blade = 0; blade < 3; blade++) {
        const grass = this.box(
          group,
          [x + blade * 0.09, 0.18, z + blade * 0.06],
          [0.045, 0.37 - blade * 0.06, 0.045],
          0x738953,
        );
        grass.rotation.z = (blade - 1) * 0.35;
      }
    }
  }

  dispose(): void {
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
    this.textures.forEach((texture) => texture.dispose());
  }
}
