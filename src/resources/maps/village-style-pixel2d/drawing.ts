import { resourceUrl } from '../../catalog/resource-url.js';
import manifest from '../../../../resources/manifest.json' with { type: 'json' };
import type {
  Animation,
  AnimationFrame,
} from '../../preview/animation-player.js';
import {
  streamCenter,
  villageBuildings,
  villageTrees,
  type VillageSnapshot,
  type VillagePoint,
} from './village.js';

const palette = {
  outline: '#2d3631',
  darkWood: '#463d38',
  wood: '#80634d',
  woodLight: '#bc9670',
  plaster: '#bfbb91',
  plasterLight: '#ddd4a4',
  stone: '#747b69',
  stoneLight: '#a5a68a',
  grass: '#68836a',
  grassDark: '#4d6c59',
  grassLight: '#82956d',
  moss: '#77946a',
  path: '#b7b08a',
  pathLight: '#d0c59b',
  pathDark: '#999873',
  roofDark: '#3a5357',
  roof: '#587072',
  roofLight: '#819291',
  roofEdge: '#a5b1a1',
  water: '#567f83',
  waterDark: '#3f656f',
  waterLight: '#91b7a5',
  red: '#a9624e',
};
type Point = { readonly x: number; readonly y: number };
function random(seed: number): number {
  return (((Math.sin(seed * 127.1 + 311.7) * 43758.5453) % 1) + 1) % 1;
}

/** 모든 미술은 정수 픽셀 띠로 그려 비스듬한 윤곽에도 흐린 테두리를 만들지 않는다. */
class PixelBrush {
  constructor(readonly context: CanvasRenderingContext2D) {}
  rect(x: number, y: number, w: number, h: number, color: string): void {
    this.context.fillStyle = color;
    this.context.fillRect(
      Math.round(x),
      Math.round(y),
      Math.round(w),
      Math.round(h),
    );
  }
  polygon(points: readonly Point[], color: string): void {
    const low = Math.ceil(Math.min(...points.map((p) => p.y)));
    const high = Math.floor(Math.max(...points.map((p) => p.y)));
    for (let y = low; y < high; y += 1) {
      const intersections: number[] = [];
      for (let i = 0; i < points.length; i += 1) {
        const a = points[i];
        const b = points[(i + 1) % points.length];
        if (!a || !b || (a.y <= y && b.y <= y) || (a.y > y && b.y > y))
          continue;
        intersections.push(a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x));
      }
      intersections.sort((a, b) => a - b);
      for (let i = 0; i < intersections.length - 1; i += 2) {
        const x = intersections[i];
        const end = intersections[i + 1];
        if (x !== undefined && end !== undefined)
          this.rect(Math.ceil(x), y, Math.ceil(end) - Math.ceil(x), 1, color);
      }
    }
  }
  ellipse(x: number, y: number, rx: number, ry: number, color: string): void {
    for (let offset = -ry; offset <= ry; offset += 1) {
      const half = rx * Math.sqrt(Math.max(0, 1 - (offset / ry) ** 2));
      this.rect(x - half, y + offset, half * 2, 1, color);
    }
  }
  line(a: Point, b: Point, color: string, width = 1): void {
    const count = Math.ceil(Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)));
    for (let i = 0; i <= count; i += 1)
      this.rect(
        a.x + ((b.x - a.x) * i) / Math.max(1, count),
        a.y + ((b.y - a.y) * i) / Math.max(1, count),
        width,
        width,
        color,
      );
  }
}

export class PixelVillageDrawing {
  readonly ready: Promise<void>;
  private readonly brush: PixelBrush;
  private readonly images = new Map<string, HTMLImageElement>();
  private readonly motions: ReadonlyMap<string, Animation>;
  private readonly terrain = document.createElement('canvas');
  private camera: VillagePoint = { x: 0, z: 0 };
  private scale = 1;
  private width = 640;
  private height = 400;
  private disposed = false;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('2D Canvas를 사용할 수 없습니다.');
    this.brush = new PixelBrush(context);
    const hero = manifest.assets.find((a) => a.id === 'ai/tiger-hero');
    if (!hero) throw new Error('승인된 아타호 리소스가 없습니다.');
    this.motions = new Map(
      Object.entries(hero.animations).filter(([key]) =>
        [
          'stand',
          'stand-left',
          'stand-right',
          'stand-back',
          'move',
          'move-left',
          'move-right',
          'move-back',
        ].includes(key),
      ),
    );
    const frames = [...this.motions.values()].flatMap((m) => m.frames);
    this.ready = Promise.all(frames.map((frame) => this.load(frame))).then(
      () => undefined,
    );
    this.terrain.width = 640;
    this.terrain.height = 400;
    const terrainContext = this.terrain.getContext('2d');
    if (!terrainContext) throw new Error('배경 Canvas를 사용할 수 없습니다.');
    this.drawTerrain(new PixelBrush(terrainContext));
  }
  resize(): void {
    const bounds = this.canvas.getBoundingClientRect();
    this.height = 400;
    this.width = Math.max(
      280,
      Math.round((400 * bounds.width) / Math.max(1, bounds.height)),
    );
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.brush.context.imageSmoothingEnabled = false;
  }
  pointerToWorld(clientX: number, clientY: number): VillagePoint {
    const bounds = this.canvas.getBoundingClientRect();
    const x = ((clientX - bounds.left) * this.width) / bounds.width;
    const y = ((clientY - bounds.top) * this.height) / bounds.height;
    return {
      x: (x - this.width / 2) / this.scale / 18 + this.camera.x,
      z: (y - this.height / 2) / this.scale / 11 + this.camera.z,
    };
  }
  render(snapshot: VillageSnapshot, overview: boolean): void {
    if (this.disposed) return;
    const c = this.brush.context;
    this.scale = overview
      ? Math.min(this.width / 640, this.height / 400) * 0.96
      : 1.4;
    this.camera = overview
      ? { x: 0, z: 0 }
      : { x: snapshot.position.x * 0.68, z: snapshot.position.z * 0.7 - 0.8 };
    c.setTransform(1, 0, 0, 1, 0, 0);
    this.brush.rect(
      0,
      0,
      this.width,
      this.height,
      snapshot.night ? '#202e37' : '#40574b',
    );
    c.translate(
      Math.round(
        this.width / 2 - this.camera.x * 18 * this.scale - 320 * this.scale,
      ),
      Math.round(
        this.height / 2 - this.camera.z * 11 * this.scale - 210 * this.scale,
      ),
    );
    c.scale(this.scale, this.scale);
    c.drawImage(this.terrain, 0, 0);
    this.drawWater(snapshot.elapsed);
    this.drawGroundDetails(snapshot);
    const layers: { z: number; draw: () => void }[] = [];
    for (const b of villageBuildings)
      layers.push({ z: b.z, draw: () => this.drawHouse(b, snapshot) });
    for (const t of villageTrees)
      layers.push({ z: t.z, draw: () => this.drawTree(t.x, t.z, t.size) });
    layers.push({ z: 3, draw: () => this.drawHearth(snapshot) });
    layers.push({ z: -8, draw: () => this.drawRefuge(snapshot) });
    layers.push({ z: 0.5, draw: () => this.drawLaundry(snapshot.elapsed) });
    layers.push({ z: 8.2, draw: () => this.drawWall(-3.5, 8.2, 4.7) });
    layers.push({ z: -4.8, draw: () => this.drawWall(-4.7, -4.8, 2.7) });
    layers.push({
      z: snapshot.position.z,
      draw: () => this.drawHero(snapshot),
    });
    layers.sort((a, b) => a.z - b.z);
    layers.forEach((layer) => layer.draw());
    for (const point of [
      { x: -5.7, z: 12.8 },
      { x: 3.6, z: 12.7 },
      { x: 9.5, z: 12.9 },
    ]) {
      const s = this.screen(point);
      this.bush(this.brush, s.x, s.y, 20);
    }
    this.drawAmbient(snapshot);
    c.setTransform(1, 0, 0, 1, 0, 0);
    if (overview) this.drawOverviewLegend(snapshot);
  }
  dispose(): void {
    this.disposed = true;
    this.images.clear();
  }
  private load(frame: AnimationFrame): Promise<void> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        if (!this.disposed) this.images.set(frame.localPath, image);
        resolve();
      };
      image.onerror = () =>
        reject(new Error(`아타호 프레임 로딩 실패: ${frame.localPath}`));
      image.src = resourceUrl(frame.localPath).href;
    });
  }
  private screen(point: VillagePoint): Point {
    return {
      x: Math.round(320 + point.x * 18),
      y: Math.round(210 + point.z * 11),
    };
  }
  private drawTerrain(p: PixelBrush): void {
    p.rect(0, 0, 640, 400, palette.grassDark);
    p.polygon(
      [
        { x: 52, y: 71 },
        { x: 173, y: 41 },
        { x: 373, y: 48 },
        { x: 552, y: 69 },
        { x: 585, y: 168 },
        { x: 572, y: 319 },
        { x: 484, y: 369 },
        { x: 174, y: 370 },
        { x: 69, y: 337 },
      ],
      palette.grass,
    );
    // 큰 풀밭과 길의 덩어리를 먼저 정하고 작은 잎과 돌은 밀도를 달리해 흩뿌린다.
    const path = [
      { x: 0, z: 12 },
      { x: 0, z: 5 },
      { x: -5, z: 4 },
      { x: -4, z: -2 },
      { x: 1, z: -4.2 },
      { x: 5.3, z: -2 },
      { x: 5.5, z: 3 },
      { x: 11, z: 3 },
      { x: 10.5, z: -8 },
      { x: 9.5, z: -10 },
      { x: -4.5, z: -10 },
      { x: -4.5, z: -2 },
    ];
    for (const layer of [
      { rx: 24, ry: 12, color: palette.pathDark },
      { rx: 20, ry: 10, color: palette.path },
    ]) {
      for (let i = 0; i < path.length - 1; i += 1) {
        const a = path[i];
        const b = path[i + 1];
        if (!a || !b) continue;
        const sa = this.screen(a),
          sb = this.screen(b);
        const count = Math.ceil(Math.hypot(sb.x - sa.x, sb.y - sa.y));
        for (let j = 0; j < count; j += 2)
          p.ellipse(
            sa.x + ((sb.x - sa.x) * j) / count,
            sa.y + ((sb.y - sa.y) * j) / count,
            layer.rx,
            layer.ry,
            layer.color,
          );
      }
    }
    for (let i = 0; i < 3000; i += 1) {
      const x = 60 + random(i * 3 + 1) * 520,
        y = 65 + random(i * 3 + 2) * 300;
      const data = p.context.getImageData(
        Math.floor(x),
        Math.floor(y),
        1,
        1,
      ).data;
      const onPath = data[0] === 183;
      if (onPath) {
        if (i % 3 === 0) {
          p.rect(x, y, 2, 1, i % 2 ? palette.pathLight : palette.pathDark);
          p.rect(x + 1, y + 1, 3, 1, palette.pathDark);
        }
      } else if (data[0] === 104) {
        p.rect(
          x,
          y,
          2 + random(i) * 3,
          1,
          i % 3 ? palette.grassLight : palette.grassDark,
        );
        if (i % 4 === 0) p.rect(x + 1, y - 2, 1, 3, palette.grassDark);
      }
    }
    for (let i = 0; i < 16; i += 1) {
      const x = 85 + i * 30;
      this.bush(p, x, 61 + random(i) * 10, 12 + random(i) * 8);
      this.bush(p, x, 360 + random(i + 4) * 7, 10 + random(i) * 8);
    }
  }
  private bush(p: PixelBrush, x: number, y: number, size: number): void {
    p.ellipse(x, y, size, size * 0.5, palette.grassDark);
    p.ellipse(x - 2, y - 3, size * 0.8, size * 0.5, palette.grass);
    for (let i = 0; i < 9; i += 1)
      p.rect(
        x - size + random(x + i) * size * 2,
        y - 7 + random(y + i) * 7,
        3,
        2,
        palette.grassLight,
      );
  }
  private drawWater(time: number): void {
    const p = this.brush;
    for (let z = -13; z < 13; z += 0.18) {
      const s = this.screen({ x: streamCenter(z), z });
      p.rect(s.x - 22, s.y, 44, 3, palette.grassDark);
      p.rect(s.x - 19, s.y, 38, 3, palette.stone);
      p.rect(s.x - 15, s.y, 30, 3, palette.waterDark);
      p.rect(s.x - 12, s.y, 24, 3, palette.water);
    }
    for (let i = 0; i < 70; i += 1) {
      const z = -12.5 + random(i * 5) * 25;
      const s = this.screen({ x: streamCenter(z), z });
      const dx = Math.floor((random(i) * 21 + time * 3) % 22) - 11;
      p.rect(
        s.x + dx,
        s.y,
        4 + random(i + 2) * 6,
        1,
        i % 3 ? palette.waterLight : palette.waterDark,
      );
    }
    this.drawBridge(3, 2.6);
    this.drawBridge(-10, 2.5);
  }
  private drawBridge(z: number, depth: number): void {
    const p = this.brush,
      s = this.screen({ x: streamCenter(z), z });
    p.rect(s.x - 34, s.y - depth * 5.5, 68, depth * 11 + 4, palette.darkWood);
    for (let y = 0; y < depth * 11; y += 4) {
      p.rect(s.x - 31, s.y - depth * 5.5 + y, 62, 3, palette.woodLight);
      p.rect(
        s.x - 24 + random(y) * 25,
        s.y - depth * 5.5 + y,
        9,
        1,
        palette.wood,
      );
    }
    for (const side of [-1, 1]) {
      const yy = s.y + side * depth * 5.5;
      p.rect(s.x - 35, yy - 10, 70, 3, palette.darkWood);
      p.rect(s.x - 35, yy - 10, 70, 1, palette.woodLight);
      for (const x of [-32, -10, 12, 32])
        p.rect(s.x + x, yy - 10, 3, 12, palette.wood);
    }
  }
  private drawGroundDetails(snapshot: VillageSnapshot): void {
    const p = this.brush;
    const dojo = this.screen({ x: 1, z: -4.6 });
    p.rect(dojo.x - 48, dojo.y - 1, 96, 9, palette.stone);
    p.rect(dojo.x - 45, dojo.y, 90, 2, palette.stoneLight);
    for (let i = 0; i < 4; i += 1) {
      p.rect(
        dojo.x - 24,
        dojo.y + 6 + i * 4,
        48,
        3,
        i % 2 ? palette.stoneLight : palette.stone,
      );
    }
    for (const pos of [
      { x: -11, z: -6 },
      { x: -11.5, z: 6 },
      { x: 5.5, z: 8 },
      { x: 10.3, z: 7 },
      { x: 10.8, z: -1 },
    ]) {
      const s = this.screen(pos);
      p.ellipse(s.x, s.y, 8, 3, palette.grassDark);
      p.polygon(
        [
          { x: s.x - 7, y: s.y },
          { x: s.x - 3, y: s.y - 7 },
          { x: s.x + 5, y: s.y - 5 },
          { x: s.x + 8, y: s.y },
        ],
        palette.stone,
      );
      p.rect(s.x - 3, s.y - 6, 6, 2, palette.stoneLight);
    }
    for (const point of [
      { x: -3.5, z: 3.9 },
      { x: -2.5, z: 4.2 },
      { x: -1.3, z: 4.5 },
      { x: 0, z: 5.2 },
      { x: 0.1, z: 6.2 },
      { x: 0, z: 7.3 },
    ]) {
      const s = this.screen(point);
      p.ellipse(s.x, s.y, 7, 3, palette.pathDark);
      p.ellipse(s.x - 1, s.y - 1, 6, 2, palette.stoneLight);
      p.rect(s.x - 2, s.y - 2, 3, 1, '#c3c0a0');
    }
    for (let i = 0; i < 24; i += 1) {
      const s = this.screen({
        x: 9.9 + random(i) * 2,
        z: -6 + random(i + 4) * 3,
      });
      p.rect(s.x, s.y, 1, 4, palette.grassDark);
      p.rect(s.x - 1, s.y - 2, 3, 2, i % 2 ? '#dcc69b' : '#c58971');
    }
    if (snapshot.target) {
      const s = this.screen(snapshot.target);
      p.line({ x: s.x - 6, y: s.y }, { x: s.x, y: s.y - 3 }, '#e7dda9');
      p.line({ x: s.x, y: s.y - 3 }, { x: s.x + 6, y: s.y }, '#e7dda9');
      p.line({ x: s.x + 6, y: s.y }, { x: s.x, y: s.y + 3 }, '#e7dda9');
      p.line({ x: s.x, y: s.y + 3 }, { x: s.x - 6, y: s.y }, '#e7dda9');
    }
    // 바닥에 닿는 빛은 작은 정수 픽셀 띠로 합성한다. 벽 조명은 건물 그리기에서 따로 계산한다.
    if (snapshot.night || snapshot.fireSeconds > 0) {
      const s = this.screen({ x: -5, z: 3 });
      const intensity = snapshot.fireSeconds > 0 ? 0.16 : 0.07;
      for (let i = 3; i >= 1; i -= 1) {
        p.context.globalAlpha = intensity;
        p.ellipse(s.x, s.y + 3, 20 + i * 11, 8 + i * 4, '#ffd28a');
      }
      p.context.globalAlpha = 1;
    }
  }
  private drawHouse(
    b: (typeof villageBuildings)[number],
    snapshot: VillageSnapshot,
  ): void {
    const p = this.brush,
      s = this.screen(b);
    const width = b.width * 18;
    const wallHeight = b.id === 'dojo' ? 43 : 35;
    const depth = b.depth * 11;
    const restored = b.id !== 'dojo' || snapshot.restored;
    p.ellipse(s.x + 8, s.y + 4, width * 0.62, 10, '#4c6154');
    p.rect(s.x - width / 2 - 3, s.y - 6, width + 6, 10, palette.outline);
    p.rect(s.x - width / 2 - 2, s.y - 5, width + 4, 7, palette.stone);
    for (let x = -width / 2; x < width / 2; x += 12) {
      p.rect(s.x + x, s.y - 4, 10, 3, palette.stoneLight);
      p.rect(s.x + x + 4, s.y, 9, 2, palette.stoneLight);
    }
    p.rect(
      s.x - width / 2,
      s.y - wallHeight,
      width,
      wallHeight - 5,
      palette.darkWood,
    );
    p.rect(
      s.x - width / 2 + 3,
      s.y - wallHeight + 2,
      width - 6,
      wallHeight - 9,
      palette.plaster,
    );
    p.rect(
      s.x - width / 2 + 4,
      s.y - wallHeight + 3,
      width - 10,
      12,
      palette.plasterLight,
    );
    // 비스듬한 옆벽을 어둡게 그려 고정된 2D 그림에도 두께를 준다.
    p.polygon(
      [
        { x: s.x + width / 2, y: s.y - 6 },
        { x: s.x + width / 2 + 9, y: s.y - depth - 6 },
        { x: s.x + width / 2 + 9, y: s.y - depth - wallHeight },
        { x: s.x + width / 2, y: s.y - wallHeight },
      ],
      palette.wood,
    );
    for (const offset of [-width / 2 + 3, -width / 4, width / 4, width / 2 - 5])
      p.rect(
        s.x + offset,
        s.y - wallHeight + 2,
        3,
        wallHeight - 8,
        palette.wood,
      );
    p.rect(s.x - width / 2 + 3, s.y - 17, width - 6, 3, palette.wood);
    const roofY = s.y - wallHeight - 3;
    const roofColor = restored ? palette.roof : '#687067';
    const roofPoints = [
      { x: s.x - width / 2 - 12, y: roofY + 4 },
      { x: s.x - width / 2 - 7, y: roofY - 4 },
      { x: s.x - 8, y: roofY - depth - 11 },
      { x: s.x + width / 2 + 4, y: roofY - depth - 7 },
      { x: s.x + width / 2 + 16, y: roofY - 2 },
      { x: s.x + width / 2 + 18, y: roofY + 5 },
    ];
    p.polygon(roofPoints, palette.outline);
    p.polygon(
      roofPoints.map((q) => ({ x: q.x, y: q.y - 2 })),
      roofColor,
    );
    for (let row = 0; row < 7; row += 1) {
      const y = roofY - depth - 7 + row * 5;
      const spread = width * 0.28 + row * 5.7;
      for (let x = -spread; x < spread; x += 9) {
        p.rect(
          s.x + x + (row % 2) * 4,
          y,
          7,
          1,
          restored ? palette.roofLight : '#8b9281',
        );
        p.rect(s.x + x + (row % 2) * 4 + 6, y + 1, 1, 3, palette.roofDark);
      }
    }
    p.line(
      { x: s.x - width / 2 - 12, y: roofY + 3 },
      { x: s.x + width / 2 + 18, y: roofY + 3 },
      palette.roofDark,
      3,
    );
    p.line(
      { x: s.x - width / 2 - 13, y: roofY + 1 },
      { x: s.x + width / 2 + 18, y: roofY + 1 },
      palette.roofEdge,
      1,
    );
    p.line(
      { x: s.x - 9, y: roofY - depth - 11 },
      { x: s.x + width / 2 + 5, y: roofY - depth - 7 },
      palette.roofEdge,
      3,
    );
    if (b.id === 'dojo') this.drawDojoDetails(s, width, wallHeight, snapshot);
    else if (b.id === 'workshop') this.drawWorkshop(s, width, snapshot);
    else this.drawHome(s, width);
    for (let i = 0; i < 9; i += 1) {
      const x = s.x - width / 2 + random(i + width) * width;
      p.rect(x, s.y - 7 + random(i) * 4, 3, 2, palette.moss);
    }
    if (snapshot.fireSeconds > 0 && b.id === 'workshop') {
      p.context.globalAlpha = 0.24;
      p.rect(s.x + width / 2 - 19, s.y - 26, 18, 18, '#ffbd76');
      p.context.globalAlpha = 1;
      p.rect(s.x + width / 2 - 19, s.y - 20, 2, 12, '#e3bc87');
    }
  }
  private window(
    s: Point,
    x: number,
    y: number,
    w: number,
    lit: boolean,
  ): void {
    const p = this.brush;
    p.rect(s.x + x - 2, s.y + y - 2, w + 4, 19, palette.darkWood);
    p.rect(s.x + x, s.y + y, w, 15, lit ? '#d7b878' : '#6b827c');
    for (let i = 3; i < w; i += 5)
      p.rect(s.x + x + i, s.y + y, 1, 15, palette.wood);
    p.rect(s.x + x, s.y + y + 7, w, 1, palette.wood);
    p.rect(s.x + x - 3, s.y + y + 15, w + 6, 2, palette.woodLight);
  }
  private drawDojoDetails(
    s: Point,
    width: number,
    height: number,
    snapshot: VillageSnapshot,
  ): void {
    const p = this.brush;
    this.window(
      s,
      -width / 2 + 12,
      -height + 15,
      18,
      snapshot.night && snapshot.restored,
    );
    this.window(
      s,
      width / 2 - 29,
      -height + 15,
      18,
      snapshot.night && snapshot.restored,
    );
    p.rect(s.x - 14, s.y - 29, 28, 24, palette.darkWood);
    if (snapshot.restored) {
      p.rect(s.x - 12, s.y - 27, 24, 22, '#916c51');
      for (let i = -9; i < 12; i += 5)
        p.rect(s.x + i, s.y - 27, 1, 22, palette.woodLight);
      p.rect(s.x - 1, s.y - 27, 2, 22, palette.darkWood);
    } else {
      p.rect(s.x - 12, s.y - 27, 24, 22, '#4c5145');
      p.line(
        { x: s.x - 13, y: s.y - 24 },
        { x: s.x + 10, y: s.y - 7 },
        palette.woodLight,
        3,
      );
      p.line(
        { x: s.x + 10, y: s.y - 24 },
        { x: s.x - 10, y: s.y - 7 },
        palette.wood,
        3,
      );
      for (let i = 0; i < 3; i += 1)
        p.rect(s.x - 24 + i * 14, s.y - height - 14, 7, 2, palette.moss);
    }
    p.rect(s.x - 19, s.y - height + 4, 38, 10, palette.darkWood);
    p.rect(s.x - 17, s.y - height + 5, 34, 7, palette.woodLight);
    this.label('도장', s.x, s.y - height + 12, '#3e4237', 8);
    if (snapshot.restored) {
      this.lantern(s.x - 34, s.y - 29, snapshot.night);
      this.lantern(s.x + 34, s.y - 29, snapshot.night);
      p.rect(s.x - 39, s.y - 25, 7, 18, palette.red);
      p.rect(s.x + 32, s.y - 25, 7, 18, palette.red);
      p.rect(s.x - 36, s.y - 22, 1, 11, '#dcc796');
      p.rect(s.x + 35, s.y - 22, 1, 11, '#dcc796');
    }
  }
  private drawWorkshop(
    s: Point,
    width: number,
    snapshot: VillageSnapshot,
  ): void {
    const p = this.brush;
    this.window(s, -width / 2 + 9, -27, 19, snapshot.night);
    p.rect(s.x + 9, s.y - 26, 22, 21, palette.darkWood);
    p.rect(s.x + 11, s.y - 24, 18, 19, palette.wood);
    p.rect(s.x - 12, s.y - 39, 32, 9, palette.woodLight);
    this.label('공방', s.x + 4, s.y - 32, palette.darkWood, 8);
    p.rect(s.x - 28, s.y - 5, 42, 8, palette.darkWood);
    p.rect(s.x - 30, s.y - 8, 46, 4, palette.woodLight);
    for (const x of [-22, -11, 1]) {
      p.rect(s.x + x, s.y - 16, 4, 7, palette.wood);
      p.rect(s.x + x - 2, s.y - 18, 9, 3, palette.stoneLight);
    }
    p.rect(s.x - 23, s.y - 5, 13, 4, '#d6c69a');
    p.rect(s.x - 20, s.y - 6, 1, 6, palette.wood);
    p.rect(s.x - 9, s.y - 6, 7, 5, '#677f75');
    p.rect(s.x - 7, s.y - 5, 3, 2, '#b1baa1');
    p.rect(s.x + 32, s.y - 20, 6, 9, '#d8cda3');
    p.rect(s.x + 33, s.y - 18, 4, 1, '#9b7056');
    p.rect(s.x + 33, s.y - 15, 3, 1, '#9b7056');
    this.barrel(s.x + width / 2 + 11, s.y + 1);
    this.pot(s.x - width / 2 - 5, s.y + 1, 8);
    p.rect(s.x + width / 2 - 2, s.y - 42, 8, 12, palette.stone);
    p.rect(s.x + width / 2 - 3, s.y - 44, 10, 3, palette.outline);
  }
  private drawHome(s: Point, width: number): void {
    const p = this.brush;
    this.window(s, -width / 2 + 9, -26, 18, false);
    p.rect(s.x + 7, s.y - 27, 18, 22, palette.darkWood);
    for (let i = 0; i < 4; i += 1)
      p.rect(s.x + 9 + i * 4, s.y - 24, 2, 19, palette.wood);
    p.rect(s.x - width / 2 - 8, s.y - 23, 10, 18, palette.wood);
    p.rect(s.x - width / 2 - 10, s.y - 25, 14, 3, palette.woodLight);
    this.pot(s.x + width / 2 + 3, s.y, 7);
    this.barrel(s.x + width / 2 + 15, s.y + 1);
    for (let i = 0; i < 5; i += 1)
      p.rect(s.x - width / 2 - 3 + i * 5, s.y - 8, 4, 3, '#c58a67');
  }
  private drawWall(x: number, z: number, width: number): void {
    const p = this.brush,
      s = this.screen({ x, z });
    const w = width * 18;
    p.rect(s.x - w / 2, s.y - 15, w, 16, palette.outline);
    p.rect(s.x - w / 2 + 1, s.y - 13, w - 2, 13, palette.stone);
    for (let row = 0; row < 3; row += 1)
      for (let col = 0; col < w; col += 13)
        p.rect(
          s.x - w / 2 + col + (row % 2) * 6,
          s.y - 12 + row * 4,
          11,
          3,
          row % 2 ? palette.stoneLight : '#929982',
        );
    p.rect(s.x - w / 2 - 2, s.y - 17, w + 4, 4, palette.roofDark);
    p.rect(s.x - w / 2 - 2, s.y - 18, w + 4, 1, palette.roofLight);
  }
  private drawLaundry(time: number): void {
    const p = this.brush;
    const a = this.screen({ x: -7, z: 0.5 }),
      b = this.screen({ x: -3, z: 0.5 });
    p.rect(a.x, a.y - 30, 3, 31, palette.darkWood);
    p.rect(b.x, b.y - 30, 3, 31, palette.darkWood);
    for (let i = 0; i < 72; i += 1) {
      const y = a.y - 28 + Math.sin((i / 72) * Math.PI) * 4;
      p.rect(a.x + i, y, 1, 1, palette.woodLight);
    }
    for (let i = 0; i < 4; i += 1) {
      const x = a.x + 12 + i * 13,
        y = a.y - 25 + Math.round(Math.sin(time * 1.7 + i) * 1);
      const color = ['#d7d3ad', '#789792', '#c1866b', '#cbbfa0'][i] ?? '#ddd';
      p.rect(x, y, 9, 12, color);
      p.rect(x + 1, y + 12, 7, 2, color);
      p.rect(x + 1, y, 1, 11, '#eee0b3');
      p.rect(x - 1, y, 2, 3, palette.wood);
    }
    this.pot(a.x + 11, a.y + 3, 8);
  }
  private drawHearth(snapshot: VillageSnapshot): void {
    const p = this.brush,
      s = this.screen({ x: -5, z: 3 });
    p.ellipse(s.x, s.y + 3, 19, 6, palette.grassDark);
    p.rect(s.x - 11, s.y - 15, 22, 17, palette.outline);
    p.rect(s.x - 9, s.y - 14, 18, 15, palette.stone);
    p.rect(s.x - 12, s.y - 17, 24, 4, palette.stoneLight);
    p.rect(s.x - 6, s.y - 7, 12, 8, palette.darkWood);
    p.rect(s.x - 7, s.y - 8, 14, 2, palette.stoneLight);
    const active = snapshot.fireSeconds > 0;
    const pulse = Math.sin(snapshot.elapsed * 9);
    const height = active ? 15 : 6;
    p.polygon(
      [
        { x: s.x - 6, y: s.y },
        { x: s.x - 4, y: s.y - height / 2 },
        { x: s.x - 1, y: s.y - height - Math.round(pulse * 2) },
        { x: s.x + 2, y: s.y - height / 2 - 2 },
        { x: s.x + 5, y: s.y - 4 },
        { x: s.x + 5, y: s.y },
      ],
      '#cf784f',
    );
    p.polygon(
      [
        { x: s.x - 3, y: s.y },
        { x: s.x, y: s.y - height * 0.7 },
        { x: s.x + 3, y: s.y },
      ],
      '#f2c078',
    );
    p.rect(s.x - 7, s.y - 15, 14, 2, active ? '#d8be8a' : palette.stoneLight);
    for (let i = 0; i < 5; i += 1) {
      const phase = (snapshot.elapsed * (active ? 17 : 7) + i * 9) % 42;
      p.context.globalAlpha = (1 - phase / 44) * 0.32;
      p.ellipse(
        s.x + Math.sin(phase / 12 + i) * 5,
        s.y - 20 - phase,
        3 + phase / 13,
        2 + phase / 15,
        '#eee1b7',
      );
    }
    p.context.globalAlpha = 1;
    p.rect(s.x + 16, s.y - 5, 11, 3, palette.darkWood);
    p.rect(s.x + 18, s.y - 8, 11, 3, palette.wood);
    p.rect(s.x + 16, s.y - 10, 9, 3, palette.woodLight);
    this.pot(s.x - 23, s.y + 4, 8);
    this.label('화덕', s.x, s.y + 15, '#454e40', 8);
  }
  private drawRefuge(snapshot: VillageSnapshot): void {
    const p = this.brush,
      s = this.screen({ x: 10, z: -8 });
    p.ellipse(s.x, s.y + 1, 29, 12, palette.pathDark);
    p.ellipse(s.x, s.y, 25, 10, palette.path);
    p.rect(s.x - 16, s.y - 9, 28, 4, palette.darkWood);
    p.rect(s.x - 17, s.y - 11, 30, 3, palette.woodLight);
    p.rect(s.x - 13, s.y - 7, 3, 7, palette.wood);
    p.rect(s.x + 7, s.y - 7, 3, 7, palette.wood);
    p.rect(s.x + 23, s.y - 32, 3, 33, palette.darkWood);
    this.lantern(s.x + 24, s.y - 26, snapshot.night);
    this.pot(s.x - 24, s.y + 3, 6);
    this.label('개울 쉼터', s.x, s.y + 16, '#485847', 7);
  }
  private barrel(x: number, y: number): void {
    const p = this.brush;
    p.rect(x - 7, y - 14, 14, 14, palette.darkWood);
    p.rect(x - 5, y - 13, 10, 13, palette.wood);
    p.rect(x - 5, y - 10, 10, 2, palette.stone);
    p.rect(x - 5, y - 4, 10, 2, palette.stone);
    p.rect(x - 4, y - 13, 1, 13, palette.woodLight);
    p.ellipse(x, y - 14, 6, 2, palette.woodLight);
  }
  private pot(x: number, y: number, size: number): void {
    const p = this.brush;
    p.ellipse(x, y, size, 3, palette.grassDark);
    p.rect(x - size / 2, y - size + 3, size, size - 2, '#8d6651');
    p.rect(x - size / 2 - 1, y - size + 1, size + 2, 3, '#bc916b');
    p.rect(x - 2, y - size - 3, 1, 6, palette.grassDark);
    p.rect(x - 5, y - size - 4, 4, 2, palette.grassLight);
    p.rect(x + 1, y - size - 7, 4, 3, palette.grass);
  }
  private lantern(x: number, y: number, lit: boolean): void {
    const p = this.brush;
    p.rect(x, y - 8, 1, 8, palette.darkWood);
    p.ellipse(x, y, 5, 7, lit ? '#e9b77c' : palette.red);
    p.rect(x - 3, y - 7, 7, 2, palette.darkWood);
    p.rect(x - 3, y + 6, 7, 2, palette.darkWood);
    p.rect(x - 2, y - 5, 1, 10, lit ? '#ffdaa0' : '#ce9070');
    p.rect(x, y + 8, 1, 3, palette.woodLight);
  }
  private drawTree(x: number, z: number, size: number): void {
    const p = this.brush,
      s = this.screen({ x, z });
    const h = 55 * size,
      w = 25 * size;
    p.ellipse(s.x + 7, s.y + 3, w + 4, 9, palette.grassDark);
    p.rect(s.x - 5, s.y - h * 0.7, 9, h * 0.7, palette.darkWood);
    p.rect(s.x - 2, s.y - h * 0.7, 3, h * 0.7, palette.wood);
    p.rect(s.x - 6, s.y - 3, 14, 3, palette.darkWood);
    for (let i = 0; i < 14; i += 1) {
      const px = s.x + (random(i + x) * 2 - 1) * w,
        py = s.y - h + random(i + z) * h * 0.52;
      p.ellipse(px, py, w * 0.52, 9 * size, palette.outline);
      p.ellipse(
        px - 1,
        py - 3,
        w * 0.5,
        8 * size,
        i % 3 ? '#456c58' : '#5b7c60',
      );
      for (let j = 0; j < 5; j += 1)
        p.rect(
          px - w * 0.4 + random(i * 9 + j) * w * 0.8,
          py - 8 + random(j) * 5,
          4,
          2,
          i % 2 ? '#739269' : '#819a72',
        );
    }
    p.rect(s.x + 3, s.y - 17, 2, 10, palette.woodLight);
  }
  private drawHero(snapshot: VillageSnapshot): void {
    const p = this.brush,
      s = this.screen(snapshot.position);
    const dir = snapshot.direction;
    const suffix =
      Math.abs(dir.x) > Math.abs(dir.z)
        ? dir.x < 0
          ? '-left'
          : '-right'
        : dir.z < 0
          ? '-back'
          : '';
    const motion = this.motions.get(
      `${snapshot.moving ? 'move' : 'stand'}${suffix}`,
    );
    const frames = motion?.frames;
    if (!frames?.length) return;
    const frame =
      frames[
        snapshot.moving ? Math.floor(snapshot.steps * 3) % frames.length : 0
      ];
    if (!frame) return;
    const image = this.images.get(frame.localPath);
    if (!image) return;
    p.ellipse(s.x, s.y + 1, 11, 4, '#495b4d');
    const scale = 0.68;
    p.context.drawImage(
      image,
      Math.round(s.x - frame.pivot.x * scale),
      Math.round(s.y - frame.height * scale),
      Math.round(frame.width * scale),
      Math.round(frame.height * scale),
    );
    if (snapshot.nearby) {
      p.rect(s.x - 7, s.y - 55, 14, 10, '#e0d5ad');
      p.rect(s.x - 2, s.y - 45, 4, 3, '#e0d5ad');
      this.label('···', s.x, s.y - 48, palette.darkWood, 8);
    }
  }
  private drawAmbient(snapshot: VillageSnapshot): void {
    const p = this.brush;
    if (snapshot.night) {
      p.context.globalAlpha = 0.27;
      p.rect(0, 0, 640, 400, '#1c324a');
      p.context.globalAlpha = 1;
      for (let i = 0; i < 11; i += 1) {
        const x = 465 + random(i) * 66 + Math.sin(snapshot.elapsed + i) * 2,
          y = 98 + random(i + 9) * 80 + Math.cos(snapshot.elapsed + i) * 2;
        p.context.globalAlpha =
          0.35 + (Math.sin(snapshot.elapsed * 2 + i) + 1) * 0.22;
        p.rect(x, y, 1, 2, '#efdca0');
      }
      p.context.globalAlpha = 1;
      for (const s of [
        { x: -5, z: 3 },
        { x: -9, z: -1.5 },
        { x: 10, z: -8 },
        ...(snapshot.restored ? [{ x: 1, z: -5 }] : []),
      ]) {
        const point = this.screen(s);
        p.context.globalAlpha = 0.12;
        for (let i = 3; i > 0; i -= 1)
          p.ellipse(point.x, point.y - 8, 10 + i * 8, 8 + i * 4, '#ffcc86');
        p.context.globalAlpha = 1;
      }
    }
  }
  private label(
    text: string,
    x: number,
    y: number,
    color: string,
    size: number,
  ): void {
    const c = this.brush.context;
    c.fillStyle = color;
    c.font = `${size}px ui-monospace, monospace`;
    c.textAlign = 'center';
    c.fillText(text, Math.round(x), Math.round(y));
  }
  private drawOverviewLegend(snapshot: VillageSnapshot): void {
    const p = this.brush;
    p.context.globalAlpha = 0.88;
    p.rect(10, 10, 166, 30, '#293d35');
    p.context.globalAlpha = 1;
    this.label('2D PIXEL · 개울 골목', 93, 23, '#e1d5ad', 10);
    this.label(
      snapshot.restored ? '복구 후 · 새 기와와 홍등' : '복구 전 · 오래된 도장',
      93,
      34,
      '#b8bda0',
      8,
    );
  }
}
