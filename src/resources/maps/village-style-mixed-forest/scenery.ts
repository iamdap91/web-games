import * as THREE from 'three';
import {
  courtyard,
  forestRules,
  onRoot,
  rootHeight,
  rootFrame,
  rootTrails,
} from './layout.js';
import { ForestMaterials, type SurfaceKind } from './materials.js';
import type { ForestSnapshot } from './visit.js';
/** 몸체 두께와 UV 소재, 고정 잎, 조명의 GPU 수명을 소유한다. */
export class ForestScenery {
  readonly root = new THREE.Group();
  readonly ground: THREE.Mesh;
  private readonly materials = new ForestMaterials();
  private readonly restored = new THREE.Group();
  private readonly ruined = new THREE.Group();
  private readonly flames: THREE.Mesh[] = [];
  private readonly spores: THREE.Mesh[] = [];
  private readonly fireLight = new THREE.PointLight(0xffb559, 0, 8, 1.5);
  private time = 0;
  constructor() {
    this.ground = this.rootBody();
    this.trunk();
    this.mushroom({ x: -0.3, z: -1.35, scale: 1, label: '道場', dojo: true });
    this.mushroom({ x: 7.4, z: 2.5, scale: 0.67, label: '茶', dojo: false });
    this.hearth();
    this.refuge();
    this.cards();
    this.background();
    this.root.add(this.restored, this.ruined, this.fireLight);
    this.fireLight.position.set(
      -5.25,
      rootHeight({ x: -5.25, z: 2.55 }) + 1.05,
      2.55,
    );
  }
  private mesh(
    geometry: THREE.BufferGeometry,
    kind: SurfaceKind,
    position: THREE.Vector3,
    parent = this.root,
  ): THREE.Mesh {
    const m = new THREE.Mesh(geometry, this.materials.surface(kind));
    m.position.copy(position);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  private rootBody(): THREE.Mesh {
    const step = forestRules.meshStep,
      nx = 116,
      nz = 76,
      positions: number[] = [],
      uv: number[] = [],
      indices: number[] = [],
      groups: { start: number; material: number }[] = [],
      edges = new Map<string, readonly [number, number]>();
    for (let iz = 0; iz <= nz; iz++)
      for (let ix = 0; ix <= nx; ix++) {
        const x = -12 + ix * step,
          z = -7.6 + iz * step;
        positions.push(x, rootHeight({ x, z }), z);
        const frame = rootFrame({ x, z });
        uv.push(frame.lateral / 4, frame.along / 4);
      }
    const boundary = (a: number, b: number): void => {
      const key = a < b ? `${a},${b}` : `${b},${a}`;
      if (edges.has(key)) edges.delete(key);
      else edges.set(key, [a, b]);
    };
    const triangle = (a: number, b: number, c: number): void => {
      indices.push(a, b, c);
      boundary(a, b);
      boundary(b, c);
      boundary(c, a);
    };
    for (let iz = 0; iz < nz; iz++)
      for (let ix = 0; ix < nx; ix++) {
        const a = iz * (nx + 1) + ix,
          b = a + 1,
          c = a + nx + 1,
          d = c + 1;
        const covered = [a, b, c, d].every((i) =>
          onRoot({ x: positions[i * 3]!, z: positions[i * 3 + 2]! }),
        );
        if (covered) {
          const point = {
              x: (positions[a * 3]! + positions[d * 3]!) / 2,
              z: (positions[a * 3 + 2]! + positions[d * 3 + 2]!) / 2,
            },
            frame = rootFrame(point);
          const insideCourt =
            Math.hypot(point.x - courtyard.x, point.z - courtyard.z) < 2.1;
          groups.push({
            start: indices.length,
            material:
              insideCourt || frame.distance < frame.radius * 0.58 ? 0 : 1,
          });
          triangle(a, c, b);
          triangle(b, c, d);
        }
      }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    groups.forEach((group) =>
      geometry.addGroup(group.start, 6, group.material),
    );
    const top = new THREE.Mesh(geometry, [
      this.materials.surface('root'),
      this.materials.surface('moss'),
    ]);
    top.castShadow = true;
    top.receiveShadow = true;
    this.root.add(top);
    const sidePositions: number[] = [],
      sideUv: number[] = [],
      sideIndices: number[] = [];
    const layers = [
      { factor: 1, drop: 0 },
      { factor: 1.035, drop: 0.32 },
      { factor: 0.94, drop: 0.85 },
      { factor: 0.72, drop: 1.45 },
      { factor: 0.39, drop: 1.85 },
      { factor: 0.015, drop: 2.05 },
    ];
    for (const [a, b] of edges.values()) {
      const base = sidePositions.length / 3;
      for (const layer of layers)
        for (const vertex of [a, b]) {
          const x = positions[vertex * 3]!,
            y = positions[vertex * 3 + 1]!,
            z = positions[vertex * 3 + 2]!,
            frame = rootFrame({ x, z });
          sidePositions.push(
            frame.center.x + (x - frame.center.x) * layer.factor,
            y - layer.drop,
            frame.center.z + (z - frame.center.z) * layer.factor,
          );
          sideUv.push(frame.along / 4, layer.drop / 2.5);
        }
      for (let j = 0; j < layers.length - 1; j++) {
        const i = base + j * 2;
        sideIndices.push(i, i + 2, i + 1, i + 1, i + 2, i + 3);
      }
    }
    const side = new THREE.BufferGeometry();
    side.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(sidePositions, 3),
    );
    side.setAttribute('uv', new THREE.Float32BufferAttribute(sideUv, 2));
    side.setIndex(sideIndices);
    side.computeVertexNormals();
    this.mesh(side, 'bark', new THREE.Vector3());
    for (const trail of rootTrails) {
      const points = trail
        .filter((_, i) => i % 6 === 0)
        .map((p) => new THREE.Vector3(p.x, p.y - 1.35, p.z));
      this.mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(points),
          70,
          0.4,
          8,
          false,
        ),
        'bark',
        new THREE.Vector3(),
      );
    }
    return top;
  }
  private trunk(): void {
    const positions: number[] = [],
      uv: number[] = [],
      indices: number[] = [],
      segments = 52;
    // 전면을 열린 두꺼운 줄기 벽으로 만들어 마당과 뒤길이 서로 가려진다.
    for (let i = 0; i <= segments; i++) {
      const angle = 0.82 + (i / segments) * (Math.PI * 2 - 1.64),
        top = 4.65 + 0.5 * Math.sin(angle * 3) + 0.23 * Math.sin(angle * 7);
      for (const [radius, y] of [
        [2.95, 1.1],
        [2.8, top],
        [2.24, top - 0.08],
        [2.26, 1.14],
      ]) {
        positions.push(
          courtyard.x + Math.sin(angle) * radius!,
          y!,
          courtyard.z + Math.cos(angle) * radius!,
        );
        uv.push(angle * 1.5, y! / 3);
      }
      if (i < segments)
        for (let j = 0; j < 4; j++) {
          const a = i * 4 + j,
            b = i * 4 + ((j + 1) % 4),
            c = a + 4,
            d = b + 4;
          indices.push(a, b, c, b, d, c);
        }
    }
    indices.push(0, 2, 1, 0, 3, 2);
    const end = segments * 4;
    indices.push(end, end + 1, end + 2, end, end + 2, end + 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(indices);
    g.computeVertexNormals();
    this.mesh(g, 'bark', new THREE.Vector3());
    for (let i = 0; i < 12; i++) {
      const angle = 1.3 + i * 0.29,
        r = 2.87,
        y = 4.2 + 0.35 * Math.sin(i);
      const rock = this.mesh(
        new THREE.IcosahedronGeometry(0.48, 1),
        'moss',
        new THREE.Vector3(
          courtyard.x + Math.sin(angle) * r,
          y,
          courtyard.z + Math.cos(angle) * r,
        ),
      );
      rock.scale.set(1, 0.35, 1);
    }
  }
  private mushroom(options: {
    readonly x: number;
    readonly z: number;
    readonly scale: number;
    readonly label: string;
    readonly dojo: boolean;
  }): void {
    const { x, z, scale } = options,
      y = rootHeight({ x, z }),
      group = new THREE.Group();
    group.position.set(x, y, z);
    group.scale.setScalar(scale);
    this.root.add(group);
    this.mesh(
      new THREE.CylinderGeometry(0.63, 0.9, 1.45, 16),
      'bark',
      new THREE.Vector3(0, 0.72, 0),
      group,
    );
    const points = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(1.6, 0),
      new THREE.Vector2(1.62, 0.2),
      new THREE.Vector2(1.38, 0.54),
      new THREE.Vector2(0.98, 0.95),
      new THREE.Vector2(0.42, 1.14),
      new THREE.Vector2(0, 1.18),
    ];
    const cap = this.mesh(
      new THREE.LatheGeometry(points, 28),
      'cap',
      new THREE.Vector3(0, 1.43, 0),
      group,
    );
    cap.rotation.y = 0.25;
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      this.mesh(
        new THREE.SphereGeometry(0.16, 8, 6),
        'stone',
        new THREE.Vector3(Math.sin(angle) * 1.13, 2.04, Math.cos(angle) * 1.13),
        group,
      ).scale.y = 0.3;
    }
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.85, 0.08),
      new THREE.MeshLambertMaterial({ color: 0x2b3c2b }),
    );
    door.position.set(0, 0.45, 0.82);
    group.add(door);
    const sign = document.createElement('canvas');
    sign.width = 64;
    sign.height = 32;
    const c = sign.getContext('2d');
    if (c) {
      c.fillStyle = '#bcaa75';
      c.fillRect(0, 0, 64, 32);
      c.fillStyle = '#44533a';
      c.font = 'bold 20px serif';
      c.textAlign = 'center';
      c.fillText(options.label, 32, 23);
    }
    const texture = new THREE.CanvasTexture(sign);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    const signMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.34, 0.11),
      new THREE.MeshLambertMaterial({ map: texture }),
    );
    signMesh.position.set(0, 1.03, 0.86);
    group.add(signMesh);
    if (options.dojo) {
      const patch = this.mesh(
        new THREE.SphereGeometry(0.65, 12, 8),
        'moss',
        new THREE.Vector3(x - 0.2, y + 2.47, z + 0.05),
        this.restored,
      );
      patch.scale.set(1, 0.22, 0.8);
      const broken = this.mesh(
        new THREE.BoxGeometry(1.3, 0.11, 0.19),
        'bark',
        new THREE.Vector3(x, y + 1.18, z + 0.9),
        this.ruined,
      );
      broken.rotation.z = 0.2;
      for (const dx of [-1, 1]) {
        const lamp = new THREE.Mesh(
          new THREE.SphereGeometry(0.16, 8, 6),
          new THREE.MeshBasicMaterial({ color: 0xe3d599 }),
        );
        lamp.position.set(x + dx, y + 0.78, z + 0.85);
        this.restored.add(lamp);
      }
    }
  }
  private hearth(): void {
    const x = -5.25,
      z = 2.55,
      y = rootHeight({ x, z });
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const stone = this.mesh(
        new THREE.IcosahedronGeometry(0.31, 1),
        'stone',
        new THREE.Vector3(
          x + Math.sin(angle) * 0.5,
          y + 0.25,
          z + Math.cos(angle) * 0.5,
        ),
      );
      stone.scale.y = 0.7;
    }
    for (let i = 0; i < 3; i++) {
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.22 - i * 0.035, 0.62 + i * 0.08, 7),
        new THREE.MeshBasicMaterial({ color: i === 1 ? 0xf4de95 : 0xd9974f }),
      );
      flame.position.set(x + (i - 1) * 0.17, y + 0.45, z);
      this.root.add(flame);
      this.flames.push(flame);
    }
    const kettle = this.mesh(
      new THREE.SphereGeometry(0.24, 12, 8),
      'stone',
      new THREE.Vector3(x, y + 0.75, z),
    );
    kettle.scale.y = 0.7;
    this.mesh(
      new THREE.IcosahedronGeometry(0.78, 2),
      'stone',
      new THREE.Vector3(-4.1, rootHeight({ x: -4.1, z: 2.1 }) + 0.48, 2.1),
    ).scale.set(0.7, 0.8, 1.1);
    const log = this.mesh(
      new THREE.CylinderGeometry(0.33, 0.46, 1.6, 14),
      'bark',
      new THREE.Vector3(-6.25, y + 0.42, 2.1),
    );
    log.rotation.z = Math.PI / 2;
  }
  private refuge(): void {
    const p = { x: 4.4, z: -5.1 },
      y = rootHeight(p);
    const shell = this.mesh(
      new THREE.SphereGeometry(0.95, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      'bark',
      new THREE.Vector3(p.x, y + 0.1, p.z),
    );
    shell.rotation.x = Math.PI;
    shell.scale.set(1.3, 0.8, 0.8);
    const bench = this.mesh(
      new THREE.BoxGeometry(1.45, 0.22, 0.4),
      'bark',
      new THREE.Vector3(p.x, y + 0.3, -5),
    );
    bench.rotation.y = -0.15;
    for (let i = 0; i < 15; i++) {
      const p = rootTrails[1]![20 + i * 6];
      if (!p) continue;
      const spore = new THREE.Mesh(
        new THREE.SphereGeometry(0.085, 6, 4),
        new THREE.MeshBasicMaterial({ color: 0xa4d3ad }),
      );
      spore.position.set(p.x + 0.66, p.y + 0.2, p.z);
      this.root.add(spore);
      this.spores.push(spore);
    }
  }
  private cards(): void {
    const leaf = this.materials.foliage('leaf'),
      hanging = this.materials.foliage('hanging');
    for (let i = 0; i < 34; i++) {
      const trail = rootTrails[i % 2]!,
        p = trail[(i * 11) % trail.length]!;
      const card = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.5), leaf);
      card.position.set(
        p.x + ((i % 3) - 1) * 0.9,
        p.y + 0.55,
        p.z + (i % 2 ? 0.8 : -0.8),
      );
      card.rotation.y = i * 1.91;
      card.rotation.z = ((i % 3) - 1) * 0.19;
      card.castShadow = true;
      this.root.add(card);
    }
    for (const [x, z, w, h] of [
      [4.2, -3.55, 2.4, 2.8],
      [-5.5, -2.9, 1.6, 2.2],
      [-2.7, -3.3, 1.6, 2.5],
    ] as const) {
      const card = new THREE.Mesh(new THREE.PlaneGeometry(w, h), hanging);
      card.position.set(x, rootHeight({ x, z }) + h / 2 + 0.15, z);
      card.rotation.y = 0.15;
      card.castShadow = true;
      this.root.add(card);
    }
  }
  private background(): void {
    const fogMaterial = new THREE.MeshLambertMaterial({ color: 0x687759 }),
      canopyMaterial = new THREE.MeshLambertMaterial({ color: 0x789164 });
    for (let i = 0; i < 8; i++) {
      const group = new THREE.Group(),
        height = 15 + (i % 4) * 2,
        radius = 0.55 + (i % 3) * 0.27;
      group.position.set(-16 + (i % 6) * 6.2, -3.05, i < 6 ? -12.5 : 14.5);
      group.rotation.z = Math.sin(i * 2) * 0.1;
      group.rotation.y = i * 1.1;
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 0.6, radius, height, 12),
        fogMaterial,
      );
      trunk.position.y = height / 2;
      group.add(trunk);
      for (let j = 0; j < 2; j++) {
        const points = [
          new THREE.Vector3(0, height * 0.4 + j * 2, 0),
          new THREE.Vector3(j ? 1.4 : -1.5, height * 0.57 + j * 2, 0.7),
          new THREE.Vector3(j ? 2.3 : -2.4, height * 0.7 + j * 1.5, 1.1),
        ];
        group.add(
          new THREE.Mesh(
            new THREE.TubeGeometry(
              new THREE.CatmullRomCurve3(points),
              10,
              radius * 0.35,
              6,
              false,
            ),
            fogMaterial,
          ),
        );
      }
      const canopy = new THREE.Mesh(
        new THREE.IcosahedronGeometry(3.5 + (i % 2), 1),
        canopyMaterial,
      );
      canopy.position.set(0, height - 0.5, 0);
      canopy.scale.y = 0.7;
      group.add(canopy);
      this.root.add(group);
    }
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(32, 48),
      new THREE.MeshLambertMaterial({ color: 0x506447 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -3.1;
    floor.receiveShadow = true;
    this.root.add(floor);
  }
  update(state: ForestSnapshot, delta: number): void {
    this.time += delta;
    this.restored.visible = state.restored;
    this.ruined.visible = !state.restored;
    this.materials.setNormal(state.normalEnabled);
    const active = state.fireSeconds > 0;
    this.fireLight.intensity = state.lightEnabled ? (active ? 22 : 10) : 0;
    this.flames.forEach((flame, i) => {
      flame.visible = active;
      flame.scale.y = 1 + Math.sin(this.time * 8 + i) * 0.2;
    });
    this.spores.forEach((s) => {
      s.visible = state.discovered;
    });
  }
  get diagnostics() {
    return Object.freeze({
      ...this.materials.diagnostics,
      lightIntensity: this.fireLight.intensity,
      rootTopVertices: this.ground.geometry.getAttribute('position').count,
      rootSolid: true,
      roundedRootUndersideLayers: 6,
      exposedBarkTrail: true,
      trunkWallThickness: 0.68,
      hangingCardsFixed: true,
    });
  }
  dispose(): void {
    const materials = new Set<THREE.Material>(),
      textures = new Set<THREE.Texture>();
    this.root.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        for (const m of Array.isArray(obj.material)
          ? obj.material
          : [obj.material]) {
          materials.add(m);
          if (m instanceof THREE.MeshLambertMaterial && m.map)
            textures.add(m.map);
        }
      }
    });
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => {
      t.dispose();
      if (t.image instanceof HTMLCanvasElement) {
        t.image.width = 1;
        t.image.height = 1;
      }
    });
    this.materials.dispose();
  }
}
