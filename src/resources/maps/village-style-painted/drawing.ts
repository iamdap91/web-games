import { resourceUrl } from '../../catalog/resource-url.js';
import manifest from '../../../../resources/manifest.json' with { type: 'json' };
import type {
  Animation,
  AnimationFrame,
} from '../../preview/animation-player.js';
import {
  villageBuildings,
  villagePlaces,
  type VillagePoint,
  type VillageSnapshot,
} from './village.js';

type Point = { readonly x: number; readonly y: number };
const colors = {
  ground: '#77878a',
  groundLight: '#9ba6a1',
  shade: '#394d5b',
  ink: '#343f4b',
  plaster: '#d1a07a',
  pale: '#dfc6a4',
  rose: '#ac7770',
  roof: '#577183',
  roofLight: '#7f979e',
  wood: '#795c50',
  woodLight: '#b68d6e',
  water: '#648a94',
  green: '#71877d',
};
const seed = (n: number): number =>
  (((Math.sin(n * 127.1 + 34.2) * 43758.5453) % 1) + 1) % 1;
/** 큰 색면을 먼저 놓고 재질의 방향을 따라 마른 붓자국을 겹친다. */
class PaintBrush {
  constructor(readonly c: CanvasRenderingContext2D) {}
  polygon(points: readonly Point[], color: string): void {
    this.c.fillStyle = color;
    this.c.beginPath();
    points.forEach((p, i) =>
      i ? this.c.lineTo(p.x, p.y) : this.c.moveTo(p.x, p.y),
    );
    this.c.closePath();
    this.c.fill();
  }
  ellipse(x: number, y: number, rx: number, ry: number, color: string): void {
    this.c.fillStyle = color;
    this.c.beginPath();
    this.c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    this.c.fill();
  }
  line(a: Point, b: Point, width: number, color: string, opacity = 1): void {
    this.c.save();
    this.c.globalAlpha = opacity;
    this.c.strokeStyle = color;
    this.c.lineWidth = width;
    this.c.lineCap = 'round';
    this.c.beginPath();
    this.c.moveTo(a.x, a.y);
    this.c.lineTo(b.x, b.y);
    this.c.stroke();
    this.c.restore();
  }
  rect(x: number, y: number, w: number, h: number, color: string): void {
    this.c.fillStyle = color;
    this.c.fillRect(x, y, w, h);
  }
  strokes(
    points: readonly Point[],
    base: string,
    highlight: string,
    angle: number,
    count: number,
    s: number,
  ): void {
    this.polygon(points, base);
    this.c.save();
    this.c.beginPath();
    points.forEach((p, i) =>
      i ? this.c.lineTo(p.x, p.y) : this.c.moveTo(p.x, p.y),
    );
    this.c.closePath();
    this.c.clip();
    const minX = Math.min(...points.map((p) => p.x)),
      maxX = Math.max(...points.map((p) => p.x)),
      minY = Math.min(...points.map((p) => p.y)),
      maxY = Math.max(...points.map((p) => p.y));
    for (let i = 0; i < count; i += 1) {
      const x = minX + seed(s + i * 3) * (maxX - minX),
        y = minY + seed(s + i * 3 + 1) * (maxY - minY),
        length = 8 + seed(s + i * 3 + 2) * 34;
      this.line(
        { x, y },
        { x: x + Math.cos(angle) * length, y: y + Math.sin(angle) * length },
        1 + seed(i + s) * 5,
        i % 3 ? highlight : colors.ink,
        i % 3 ? 0.22 : 0.1,
      );
      // 붓 끝을 가늘게 갈라 같은 방향의 결을 남기고 매끈한 벡터 띠를 줄인다.
      for (let bristle = 0; bristle < 3; bristle += 1) {
        const offset = (bristle - 1) * 1.2;
        this.line(
          { x: x - Math.sin(angle) * offset, y: y + Math.cos(angle) * offset },
          {
            x: x + Math.cos(angle) * length * 0.85 - Math.sin(angle) * offset,
            y: y + Math.sin(angle) * length * 0.85 + Math.cos(angle) * offset,
          },
          0.5,
          highlight,
          0.2,
        );
      }
    }
    this.c.restore();
  }
}

function world(p: VillagePoint): Point {
  return { x: 485 + p.x * 25 + p.z * 5, y: 382 + p.z * 16 - p.x * 3 };
}
function depth(p: VillagePoint): number {
  return p.z * 16 - p.x * 3;
}

/** 배경·건물 그림을 메모리 Canvas에 그린 뒤 인물의 발 깊이에 맞춰 조합한다. */
export class PaintedVillageDrawing {
  readonly ready: Promise<void>;
  private readonly c: CanvasRenderingContext2D;
  private readonly brush: PaintBrush;
  private readonly images = new Map<string, HTMLImageElement>();
  private readonly motions: ReadonlyMap<string, Animation>;
  private readonly terrain = document.createElement('canvas');
  private readonly houses = new Map<
    string,
    { before: HTMLCanvasElement; after: HTMLCanvasElement }
  >();
  private width = 1000;
  private height = 700;
  private dpr = 1;
  private scale = 1;
  private offset: Point = { x: 0, y: 0 };
  private disposed = false;
  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D를 사용할 수 없습니다.');
    this.c = context;
    this.brush = new PaintBrush(context);
    const hero = manifest.assets.find((a) => a.id === 'ai/tiger-hero');
    if (!hero) throw new Error('아타호 리소스가 없습니다.');
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
    this.ready = Promise.all(
      [...this.motions.values()]
        .flatMap((m) => m.frames)
        .map((f) => this.load(f)),
    ).then(() => undefined);
    this.terrain.width = 1000;
    this.terrain.height = 700;
    const terrain = this.terrain.getContext('2d');
    if (!terrain) throw new Error('그림 레이어를 만들 수 없습니다.');
    this.drawTerrain(new PaintBrush(terrain));
    for (const b of villageBuildings) {
      const before = document.createElement('canvas'),
        after = document.createElement('canvas');
      for (const [image, restored] of [
        [before, false],
        [after, true],
      ] as const) {
        image.width = 1000;
        image.height = 700;
        const c = image.getContext('2d');
        if (!c) throw new Error('건물 그림을 만들 수 없습니다.');
        this.drawHouse(new PaintBrush(c), b, restored);
      }
      this.houses.set(b.id, { before, after });
    }
  }
  resize(): void {
    const bounds = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, bounds.width);
    this.height = Math.max(1, bounds.height);
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
  }
  project(p: VillagePoint): Point {
    const a = world(p);
    return {
      x: this.offset.x + a.x * this.scale,
      y: this.offset.y + a.y * this.scale,
    };
  }
  pointerToWorld(clientX: number, clientY: number): VillagePoint {
    const b = this.canvas.getBoundingClientRect();
    const sx = (clientX - b.left - this.offset.x) / this.scale - 485,
      sy = (clientY - b.top - this.offset.y) / this.scale - 382;
    return { x: (16 * sx - 5 * sy) / 415, z: (3 * sx + 25 * sy) / 415 };
  }
  render(state: VillageSnapshot, overview: boolean): void {
    if (this.disposed) return;
    this.scale = overview
      ? Math.min(this.width / 1000, this.height / 700) * 0.97
      : Math.min(1.6, Math.max(0.9, this.height / 500));
    const focus = overview ? { x: 500, y: 350 } : world(state.position);
    this.offset = {
      x: this.width / 2 - focus.x * this.scale,
      y: this.height / 2 - (focus.y - 45) * this.scale,
    };
    this.c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.brush.rect(0, 0, this.width, this.height, '#3f5361');
    this.c.translate(this.offset.x, this.offset.y);
    this.c.scale(this.scale, this.scale);
    this.c.drawImage(this.terrain, 0, 0);
    this.drawWater(state.elapsed);
    this.drawFloor(state);
    const layers: { z: number; draw: () => void }[] = villageBuildings.map(
      (b) => ({
        z: depth(b),
        draw: () => {
          const h = this.houses.get(b.id);
          if (h) this.c.drawImage(state.restored ? h.after : h.before, 0, 0);
        },
      }),
    );
    layers.push({
      z: depth(villagePlaces.hearth),
      draw: () => this.drawHearth(state),
    });
    layers.push({
      z: depth(villagePlaces.refuge),
      draw: () => this.drawRefuge(state.elapsed),
    });
    layers.push({ z: depth({ x: -4, z: 9 }), draw: () => this.drawWall() });
    layers.push({
      z: depth({ x: -7, z: 0.8 }),
      draw: () => this.drawLaundry(state),
    });
    layers.push({
      z: depth({ x: 13.9, z: -3 }),
      draw: () => this.drawTree(13.9, -3, 0.85),
    });
    layers.push({
      z: depth({ x: -13.5, z: -8 }),
      draw: () => this.drawTree(-13.5, -8, 1.1),
    });
    layers.push({ z: depth(state.position), draw: () => this.drawHero(state) });
    layers.sort((a, b) => a.z - b.z);
    layers.forEach((l) => l.draw());
    this.drawTree(13, 12, 1.15);
    this.drawTree(-14.5, 12.2, 1.1);
    this.c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const vignette = this.c.createRadialGradient(
      this.width / 2,
      this.height / 2,
      this.height * 0.25,
      this.width / 2,
      this.height / 2,
      Math.hypot(this.width, this.height) * 0.58,
    );
    vignette.addColorStop(0, '#1f344000');
    vignette.addColorStop(1, '#1f344089');
    this.c.fillStyle = vignette;
    this.c.fillRect(0, 0, this.width, this.height);
    if (overview) {
      this.brush.rect(12, 12, 220, 47, '#334956d9');
      this.label('빛바랜 광장 · PAINTED', 24, 33, '#ead3b3', 15, 'left');
      this.label(
        state.restored
          ? '차 상과 깃발이 돌아온 마을'
          : '오래된 석회벽과 닫힌 도장',
        24,
        50,
        '#aebfbb',
        11,
        'left',
      );
    }
  }
  dispose(): void {
    this.disposed = true;
    for (const image of this.images.values()) {
      image.onload = null;
      image.onerror = null;
    }
    this.images.clear();
    this.houses.clear();
    this.terrain.width = 1;
    this.terrain.height = 1;
  }
  private load(frame: AnimationFrame): Promise<void> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        if (!this.disposed) this.images.set(frame.localPath, image);
        resolve();
      };
      image.onerror = () =>
        reject(new Error(`아타호 프레임 실패: ${frame.localPath}`));
      image.src = resourceUrl(frame.localPath).href;
    });
  }
  private drawTerrain(p: PaintBrush): void {
    p.rect(0, 0, 1000, 700, '#3f5361');
    const land = [
      { x: 50, y: 165 },
      { x: 220, y: 102 },
      { x: 610, y: 86 },
      { x: 935, y: 170 },
      { x: 968, y: 548 },
      { x: 815, y: 642 },
      { x: 205, y: 654 },
      { x: 62, y: 558 },
    ];
    p.strokes(land, colors.ground, '#adb4ac', -0.18, 700, 10);
    const plaza = [
      { x: 280, y: 349 },
      { x: 456, y: 291 },
      { x: 641, y: 330 },
      { x: 705, y: 427 },
      { x: 550, y: 503 },
      { x: 300, y: 466 },
    ];
    p.strokes(plaza, '#aaa79a', '#d4c6ac', -0.17, 270, 2000);
    const routes = [
      [
        { x: 0, z: 12 },
        { x: 0, z: 5 },
        { x: -3, z: 4 },
        { x: -5, z: -2 },
        { x: -2, z: -4 },
      ],
      [
        { x: -5, z: -2 },
        { x: -7, z: -10.5 },
        { x: 3.8, z: -10.5 },
        { x: 4.5, z: -1 },
        { x: 10, z: -1 },
      ],
      [
        { x: 0, z: 5 },
        { x: 5.5, z: 5 },
        { x: 5, z: -1 },
        { x: 14.4, z: -1 },
        { x: 14.4, z: 10 },
        { x: 0, z: 11 },
      ],
    ];
    for (const route of routes)
      for (let i = 0; i < route.length - 1; i += 1) {
        const a = route[i],
          b = route[i + 1];
        if (a && b) {
          p.line(world(a), world(b), 31, '#aaa997', 0.73);
          p.line(
            { x: world(a).x - 3, y: world(a).y - 3 },
            { x: world(b).x - 3, y: world(b).y - 3 },
            13,
            '#d4c6ac',
            0.32,
          );
          const from = world(a),
            to = world(b),
            length = Math.hypot(to.x - from.x, to.y - from.y);
          for (let step = 0; step < length; step += 5) {
            const t = step / length,
              nx = -(to.y - from.y) / length,
              ny = (to.x - from.x) / length;
            for (const sign of [-1, 1]) {
              const width = 12 + seed(step + from.x) * 7;
              const point = {
                x: from.x + (to.x - from.x) * t + nx * width * sign,
                y: from.y + (to.y - from.y) * t + ny * width * sign,
              };
              p.line(
                point,
                { x: point.x + 8, y: point.y - 3 },
                1.3,
                '#d3c3a3',
                0.42,
              );
            }
          }
        }
      }
    const pond = [
      world({ x: 6.4, z: -11.2 }),
      world({ x: 12.7, z: -11.2 }),
      world({ x: 12.7, z: -3.4 }),
      world({ x: 6.4, z: -3.4 }),
    ];
    p.strokes(pond, '#3d6570', colors.water, -0.2, 120, 31);
    for (let i = 0; i < 32; i += 1) {
      const a = world({ x: 6.1, z: -11 + i * 0.24 });
      p.line(a, { x: a.x - 8, y: a.y - 4 }, 4, '#637575');
    }
    for (let i = 0; i < 52; i += 1) {
      const a = world({ x: 6.6 + seed(i) * 6, z: -3.4 });
      p.line(
        a,
        { x: a.x + 6, y: a.y - 15 - seed(i + 2) * 18 },
        2.3,
        colors.green,
      );
      p.line(
        { x: a.x + 6, y: a.y - 18 },
        { x: a.x + 4, y: a.y - 26 },
        4,
        '#b4b9a0',
      );
    }
    for (let i = 0; i < 70; i += 1) {
      const a = { x: 290 + seed(i + 5) * 350, y: 337 + seed(i + 10) * 130 };
      p.line(a, { x: a.x + 10 + seed(i) * 18, y: a.y - 4 }, 1, '#58646a', 0.4);
      if (i % 4 === 0) p.line(a, { x: a.x - 2, y: a.y - 8 }, 1, '#58646a', 0.3);
    }
    // 바깥쪽은 긴 청회색 터치로 흐리고 광장 중앙은 큰 밝은 면으로 읽게 한다.
    for (let i = 0; i < 48; i += 1) {
      const x = 100 + i * 17,
        y = 609 + seed(i) * 28;
      p.line({ x, y }, { x: x + 25, y: y - 8 }, 4, '#4e6974', 0.5);
    }
  }
  private drawHouse(
    p: PaintBrush,
    b: (typeof villageBuildings)[number],
    restored: boolean,
  ): void {
    const s = world(b),
      w = b.width * 25,
      d = b.depth * 16,
      h = b.id === 'dojo' ? 77 : b.id === 'home' ? 91 : 68;
    p.ellipse(s.x + 23, s.y + 4, w * 0.68, 16, '#41576166');
    const front = [
      { x: s.x - w / 2, y: s.y },
      { x: s.x + w / 2, y: s.y - 3 },
      { x: s.x + w / 2, y: s.y - h },
      { x: s.x - w / 2 - 5, y: s.y - h - 6 },
    ];
    const base =
      b.id === 'home'
        ? colors.rose
        : b.id === 'workshop'
          ? '#b69072'
          : colors.plaster;
    p.strokes(front, base, colors.pale, -0.32, 95, s.x);
    p.c.save();
    p.c.beginPath();
    front.forEach((point, i) =>
      i ? p.c.lineTo(point.x, point.y) : p.c.moveTo(point.x, point.y),
    );
    p.c.closePath();
    p.c.clip();
    const wash = p.c.createLinearGradient(s.x, s.y - h, s.x + 13, s.y);
    wash.addColorStop(0, '#ffe4b534');
    wash.addColorStop(0.45, '#d7c0a400');
    wash.addColorStop(1, '#36536065');
    p.c.fillStyle = wash;
    p.c.fillRect(s.x - w / 2 - 7, s.y - h - 10, w + 15, h + 12);
    for (let patch = 0; patch < 7; patch += 1) {
      const x = s.x - w / 2 + seed(s.x + patch) * w,
        y = s.y - 18 - seed(s.y + patch) * 37;
      p.c.globalAlpha = 0.23;
      p.polygon(
        [
          { x, y },
          { x: x + 24, y: y - 3 },
          { x: x + 31, y: y + 5 },
          { x: x + 15, y: y + 10 },
          { x: x - 3, y: y + 7 },
        ],
        patch % 2 ? '#e5cda6' : '#637b81',
      );
      p.c.globalAlpha = 1;
    }
    p.c.restore();
    const side = [
      { x: s.x + w / 2, y: s.y - 3 },
      { x: s.x + w / 2 - b.depth * 5, y: s.y - d - 3 },
      { x: s.x + w / 2 - b.depth * 5, y: s.y - d - h },
      { x: s.x + w / 2, y: s.y - h },
    ];
    p.strokes(side, '#796f6b', '#a59780', 1.5, 38, s.x + 9);
    p.line(front[0]!, front[1]!, 10, '#566269');
    p.line(
      { x: s.x - w / 2, y: s.y - 13 },
      { x: s.x + w / 2, y: s.y - 15 },
      2,
      '#dac1a0',
      0.7,
    );
    for (let i = 0; i < 5; i += 1) {
      const x = s.x - w / 2 + 11 + (i * w) / 5;
      p.line(
        { x, y: s.y - h + 6 },
        { x: x + 3, y: s.y - 8 },
        i % 2 ? 3 : 5,
        '#76604f',
        0.7,
      );
    }
    // 비대칭인 큰 지붕 면에 가로 붓자국을 겹쳐 기와 방향을 드러낸다.
    const roof = [
      { x: s.x - w / 2 - 20, y: s.y - h + 9 },
      { x: s.x - w / 2 - 10 - b.depth * 5, y: s.y - h - d - 18 },
      { x: s.x + w * 0.08 - b.depth * 5, y: s.y - h - d - 38 },
      { x: s.x + w / 2 - 9, y: s.y - h - d - 3 },
      { x: s.x + w / 2 + 25, y: s.y - h + 4 },
    ];
    const isFixed = b.id === 'dojo' && restored;
    p.strokes(
      roof,
      isFixed ? '#536d82' : b.id === 'store' ? '#92675d' : colors.roof,
      isFixed ? '#b3b7a2' : colors.roofLight,
      -0.12,
      160,
      s.y,
    );
    p.line(roof[0]!, roof[4]!, 7, colors.ink);
    // 지붕 아래의 큰 먹그림자는 작은 붓터치보다 먼저 입체를 읽게 한다.
    p.polygon(
      [
        { x: s.x - w / 2 - 4, y: s.y - h + 8 },
        { x: s.x + w / 2 + 3, y: s.y - h + 4 },
        { x: s.x + w / 2, y: s.y - h + 15 },
        { x: s.x - w / 2 - 2, y: s.y - h + 19 },
      ],
      '#47586759',
    );
    p.line(
      { x: roof[0]!.x, y: roof[0]!.y - 3 },
      { x: roof[4]!.x, y: roof[4]!.y - 3 },
      2,
      '#bbafa0',
      0.6,
    );
    if (b.id === 'home') {
      p.rect(s.x + w / 2 - 39, s.y - h - d - 29, 13, 24, '#7f786e');
      p.line(
        { x: s.x + w / 2 - 43, y: s.y - h - d - 28 },
        { x: s.x + w / 2 - 24, y: s.y - h - d - 28 },
        4,
        '#353e48',
      );
    } else if (b.id === 'workshop') {
      p.strokes(
        [
          { x: s.x - 15, y: s.y - h - 3 },
          { x: s.x - 32, y: s.y - h - 31 },
          { x: s.x - 3, y: s.y - h - 38 },
          { x: s.x + 20, y: s.y - h - 8 },
        ],
        '#9f8170',
        '#ddba90',
        -0.25,
        30,
        712,
      );
      p.line(
        { x: s.x - 28, y: s.y - h - 26 },
        { x: s.x - 7, y: s.y - h - 28 },
        3,
        '#465663',
      );
    }
    for (const x of [-w * 0.3, w * 0.29])
      this.window(p, s.x + x, s.y - h * 0.52, b.id === 'home');
    p.rect(s.x - 17, s.y - 45, 35, 42, '#394c55');
    if (b.id === 'dojo' && !restored) {
      p.line(
        { x: s.x - 20, y: s.y - 41 },
        { x: s.x + 20, y: s.y - 8 },
        7,
        colors.woodLight,
      );
      p.line(
        { x: s.x + 18, y: s.y - 42 },
        { x: s.x - 17, y: s.y - 9 },
        5,
        '#8c7863',
      );
    } else {
      p.rect(s.x - 14, s.y - 43, 29, 39, colors.wood);
      for (let x = -11; x < 14; x += 6)
        p.line(
          { x: s.x + x, y: s.y - 42 },
          { x: s.x + x + 1, y: s.y - 5 },
          1,
          '#d3af84',
        );
    }
    p.rect(s.x - 29, s.y - h + 8, 58, 16, '#685f52');
    p.rect(s.x - 26, s.y - h + 9, 52, 13, '#d9bd8d');
    p.c.font = '12px serif';
    p.c.textAlign = 'center';
    p.c.fillStyle = colors.ink;
    p.c.fillText(
      b.id === 'dojo'
        ? '새벽 도장'
        : b.id === 'workshop'
          ? '나무 공방'
          : b.id === 'home'
            ? '찻집'
            : '곡물 창고',
      s.x,
      s.y - h + 20,
    );
    // 석회가 벗겨진 얼룩과 찢긴 포스터는 벽에 붙어 건물 그림과 함께 가린다.
    for (let i = 0; i < 7; i += 1) {
      const x = s.x - w / 2 + 6 + seed(i + s.x) * (w - 15),
        y = s.y - 8 - seed(i + s.y) * 18;
      p.line({ x, y }, { x: x + 8, y: y - 2 }, 3, '#7b8279', 0.55);
    }
    p.polygon(
      [
        { x: s.x + w * 0.37, y: s.y - 36 },
        { x: s.x + w * 0.46, y: s.y - 34 },
        { x: s.x + w * 0.45, y: s.y - 18 },
        { x: s.x + w * 0.36, y: s.y - 20 },
      ],
      '#e0cca8',
    );
    p.line(
      { x: s.x + w * 0.38, y: s.y - 30 },
      { x: s.x + w * 0.44, y: s.y - 29 },
      2,
      '#a36e61',
    );
    if (b.id === 'workshop') {
      p.rect(s.x - 54, s.y - 8, 75, 9, '#6c5449');
      p.line(
        { x: s.x - 58, y: s.y - 10 },
        { x: s.x + 23, y: s.y - 12 },
        7,
        '#b09a7b',
      );
      for (let i = 0; i < 4; i += 1) {
        p.line(
          { x: s.x - 46 + i * 17, y: s.y - 12 },
          { x: s.x - 45 + i * 17, y: s.y - 23 },
          3,
          '#65544b',
        );
        p.line(
          { x: s.x - 50 + i * 17, y: s.y - 23 },
          { x: s.x - 39 + i * 17, y: s.y - 25 },
          5,
          '#a6ada0',
        );
      }
    }
    if (isFixed)
      for (const sign of [-1, 1]) {
        p.line(
          { x: s.x + sign * 68, y: s.y - 40 },
          { x: s.x + sign * 68, y: s.y - 2 },
          2,
          '#c3a17f',
        );
        p.polygon(
          [
            { x: s.x + sign * 68, y: s.y - 38 },
            { x: s.x + sign * 45, y: s.y - 36 },
            { x: s.x + sign * 49, y: s.y - 18 },
            { x: s.x + sign * 67, y: s.y - 21 },
          ],
          '#b27959',
        );
        p.ellipse(s.x + sign * 39, s.y - 29, 6, 8, '#e2bb7b');
      }
  }
  private window(p: PaintBrush, x: number, y: number, warm: boolean): void {
    p.rect(x - 13, y - 13, 27, 24, '#44545e');
    p.rect(x - 10, y - 11, 20, 18, warm ? '#d1b185' : '#7f9a99');
    p.line({ x, y: y - 11 }, { x, y: y + 9 }, 2, '#66594e');
    p.line({ x: x - 11, y }, { x: x + 10, y }, 2, '#66594e');
    p.line({ x: x - 16, y: y + 11 }, { x: x + 16, y: y + 10 }, 4, '#bd9c7c');
  }
  private drawWater(t: number): void {
    for (let i = 0; i < 18; i += 1) {
      const s = world({
        x: 6.9 + seed(i + 4) * 5.2,
        z: -10.8 + seed(i + 9) * 6.8,
      });
      this.brush.line(
        { x: s.x + Math.sin(t * 0.8 + i) * 3, y: s.y },
        { x: s.x + 10 + Math.sin(t * 0.8 + i) * 3, y: s.y - 1 },
        1.6,
        '#aec3b3',
        0.5,
      );
    }
  }
  private drawFloor(state: VillageSnapshot): void {
    const p = this.brush;
    if (state.target) {
      const s = world(state.target);
      p.ellipse(s.x, s.y, 8, 4, '#e8d2a56e');
      p.line({ x: s.x - 9, y: s.y }, { x: s.x + 9, y: s.y }, 1, '#ead8b8');
    }
    if (state.fireSeconds > 0) {
      const s = world(villagePlaces.hearth),
        gradient = this.c.createRadialGradient(s.x, s.y, 8, s.x, s.y, 81);
      gradient.addColorStop(0, '#ffc97d70');
      gradient.addColorStop(1, '#ffc97d00');
      this.c.fillStyle = gradient;
      this.c.fillRect(s.x - 81, s.y - 81, 162, 162);
    }
    if (state.restored) {
      const s = world({ x: -0.5, z: -3.3 });
      p.ellipse(s.x, s.y + 2, 31, 9, '#43596177');
      p.ellipse(s.x, s.y - 9, 26, 10, '#bca283');
      p.line(
        { x: s.x - 18, y: s.y - 7 },
        { x: s.x - 18, y: s.y + 5 },
        4,
        '#6d5c4c',
      );
      p.line(
        { x: s.x + 18, y: s.y - 7 },
        { x: s.x + 18, y: s.y + 5 },
        4,
        '#6d5c4c',
      );
      p.ellipse(s.x + 1, s.y - 14, 6, 4, '#64817d');
      p.rect(s.x - 15, s.y - 13, 5, 5, '#e0ceb0');
      p.rect(s.x + 11, s.y - 10, 5, 5, '#e0ceb0');
    }
  }
  private drawHearth(state: VillageSnapshot): void {
    const p = this.brush,
      s = world(villagePlaces.hearth);
    p.ellipse(s.x, s.y + 3, 25, 9, '#364e5b99');
    p.strokes(
      [
        { x: s.x - 19, y: s.y },
        { x: s.x + 20, y: s.y - 3 },
        { x: s.x + 16, y: s.y - 26 },
        { x: s.x - 14, y: s.y - 30 },
      ],
      '#727a76',
      '#b0aba0',
      -0.3,
      15,
      2,
    );
    p.rect(s.x - 11, s.y - 17, 22, 15, '#3c474c');
    p.line(
      { x: s.x - 22, y: s.y - 28 },
      { x: s.x + 20, y: s.y - 30 },
      6,
      '#b8afa0',
    );
    const h = state.fireSeconds > 0 ? 23 : 8;
    p.polygon(
      [
        { x: s.x - 10, y: s.y },
        { x: s.x - 6, y: s.y - h * 0.5 },
        { x: s.x, y: s.y - h - Math.sin(state.elapsed * 7) * 3 },
        { x: s.x + 6, y: s.y - h * 0.4 },
        { x: s.x + 10, y: s.y },
      ],
      '#d78855',
    );
    p.polygon(
      [
        { x: s.x - 4, y: s.y },
        { x: s.x + 1, y: s.y - h * 0.6 },
        { x: s.x + 5, y: s.y },
      ],
      '#efc782',
    );
    for (let i = 0; i < 5; i += 1) {
      const phase =
        (state.elapsed * (state.fireSeconds ? 12 : 6) + i * 11) % 65;
      p.c.globalAlpha = (1 - phase / 65) * 0.23;
      p.ellipse(
        s.x + Math.sin(phase * 0.05 + i) * 11,
        s.y - 35 - phase,
        5 + phase * 0.1,
        3 + phase * 0.08,
        '#d2d5c5',
      );
    }
    p.c.globalAlpha = 1;
    p.line(
      { x: s.x + 27, y: s.y - 4 },
      { x: s.x + 43, y: s.y - 8 },
      8,
      '#7e6757',
    );
    p.line(
      { x: s.x + 29, y: s.y - 13 },
      { x: s.x + 44, y: s.y - 16 },
      7,
      '#a58b69',
    );
    this.label('火', s.x, s.y - 32, '#665b4c', 10);
  }
  private drawRefuge(t: number): void {
    const p = this.brush,
      s = world(villagePlaces.refuge);
    p.ellipse(s.x, s.y, 48, 15, '#a2a795');
    p.line(
      { x: s.x - 32, y: s.y - 8 },
      { x: s.x + 18, y: s.y - 15 },
      8,
      '#8b7661',
    );
    p.line(
      { x: s.x - 29, y: s.y - 8 },
      { x: s.x - 28, y: s.y + 5 },
      4,
      '#584f46',
    );
    p.line(
      { x: s.x + 15, y: s.y - 14 },
      { x: s.x + 17, y: s.y + 1 },
      4,
      '#584f46',
    );
    p.ellipse(s.x - 7, s.y - 18, 7, 5, '#687d76');
    p.line(
      { x: s.x - 14, y: s.y - 20 },
      { x: s.x - 18, y: s.y - 24 },
      3,
      '#9eae9c',
    );
    p.rect(s.x + 9, s.y - 21, 5, 6, '#cfbfa0');
    p.line(
      { x: s.x + 36, y: s.y - 2 },
      { x: s.x + 36, y: s.y - 45 },
      3,
      '#695d50',
    );
    p.ellipse(s.x + 33 + Math.sin(t) * 1.5, s.y - 36, 7, 10, '#d0ac74');
    p.line(
      { x: s.x + 29, y: s.y - 46 },
      { x: s.x + 40, y: s.y - 46 },
      3,
      '#48525a',
    );
  }
  private drawWall(): void {
    const p = this.brush,
      a = world({ x: -5.3, z: 9 }),
      b = world({ x: -2, z: 9 });
    p.strokes(
      [
        { x: a.x, y: a.y },
        { x: b.x, y: b.y },
        { x: b.x, y: b.y - 27 },
        { x: a.x - 2, y: a.y - 30 },
      ],
      '#788183',
      '#b6b5a6',
      -0.3,
      40,
      33,
    );
    p.line(
      { x: a.x - 3, y: a.y - 31 },
      { x: b.x + 3, y: b.y - 29 },
      6,
      '#485b68',
    );
  }
  private drawLaundry(state: VillageSnapshot): void {
    const p = this.brush,
      a = world({ x: -9, z: 0.8 }),
      b = world({ x: -5, z: 0.8 });
    p.line(a, { x: a.x, y: a.y - 55 }, 3, '#6a594e');
    p.line(b, { x: b.x, y: b.y - 52 }, 3, '#6a594e');
    p.c.strokeStyle = '#ccb894';
    p.c.lineWidth = 1.4;
    p.c.beginPath();
    p.c.moveTo(a.x, a.y - 54);
    p.c.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 - 38, b.x, b.y - 52);
    p.c.stroke();
    for (let i = 0; i < 4; i += 1) {
      const x = a.x + 17 + i * 21,
        y = a.y - 48 - i * 2 + Math.sin(state.elapsed + i) * 1.2;
      const color = ['#d3c8ad', '#a67b6e', '#879d9a', '#c4b59a'][i] ?? '#ddd';
      p.polygon(
        [
          { x, y },
          { x: x + 13, y: y - 1 },
          { x: x + 14 + Math.sin(state.elapsed + i) * 2, y: y + 19 },
          { x: x + 1, y: y + 22 },
        ],
        color,
      );
      p.line(
        { x: x + 3, y: y + 2 },
        { x: x + 4, y: y + 17 },
        1,
        '#eee0bf',
        0.8,
      );
    }
  }
  private drawTree(x: number, z: number, size: number): void {
    const p = this.brush,
      s = world({ x, z });
    p.ellipse(s.x + 9, s.y + 3, 35 * size, 11 * size, '#354e5d66');
    p.line(s, { x: s.x - 5 * size, y: s.y - 83 * size }, 8 * size, '#665d55');
    p.line(
      { x: s.x - 2, y: s.y - 27 * size },
      { x: s.x + 29 * size, y: s.y - 76 * size },
      4 * size,
      '#605b56',
    );
    for (let i = 0; i < 35; i += 1) {
      const px = s.x + (seed(i + x) - 0.5) * 84 * size,
        py = s.y - 58 * size - seed(i + z) * 49 * size;
      p.line(
        { x: px, y: py },
        { x: px + 11 * size, y: py - 10 * size },
        (8 + seed(i) * 10) * size,
        i % 4 ? '#71897e' : '#a4ae8f',
        0.78,
      );
    }
  }
  private drawHero(state: VillageSnapshot): void {
    const p = this.brush,
      s = world(state.position),
      dir = state.direction;
    const suffix =
      Math.abs(dir.x) > Math.abs(dir.z)
        ? dir.x < 0
          ? '-left'
          : '-right'
        : dir.z < 0
          ? '-back'
          : '';
    const frames = this.motions.get(
      `${state.moving ? 'move' : 'stand'}${suffix}`,
    )?.frames;
    const f =
      frames?.[state.moving ? Math.floor(state.steps * 3) % frames.length : 0];
    if (!f) return;
    const image = this.images.get(f.localPath);
    if (!image) return;
    p.ellipse(s.x, s.y + 1, 14, 5, '#364f5b99');
    const scale = 0.84;
    this.c.imageSmoothingEnabled = false;
    this.c.drawImage(
      image,
      s.x - f.pivot.x * scale,
      s.y - (f.height - f.pivot.y) * scale,
      f.width * scale,
      f.height * scale,
    );
    this.c.imageSmoothingEnabled = true;
    if (state.nearby) {
      p.ellipse(s.x, s.y - 63, 13, 9, '#dfcda9');
      this.label('···', s.x, s.y - 59, '#5d655f', 14);
    }
  }
  private label(
    text: string,
    x: number,
    y: number,
    color: string,
    size: number,
    align: CanvasTextAlign = 'center',
  ): void {
    this.c.fillStyle = color;
    this.c.font = `${size}px Georgia, serif`;
    this.c.textAlign = align;
    this.c.fillText(text, x, y);
  }
}
