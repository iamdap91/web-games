import manifest from '../../../../resources/manifest.json' with { type: 'json' };
import { resourceUrl } from '../../catalog/resource-url.js';
import {
  AnimationPlayer,
  type Animation,
  type AnimationFrame,
} from '../../preview/animation-player.js';
import { cardinalFacing } from '../../characters/ataho/facing.js';
import {
  colorFloors,
  colorPlaces,
  colorTrees,
  roomWalls,
  roomFurniture,
  workshopBody,
  teahouseBody,
  type ColorPoint,
  type Rect,
} from './layout.js';
import type { ColorSnapshot } from './visit.js';
type ScreenPoint = { readonly x: number; readonly y: number };
const paper = '#fffdf2',
  ink = '#394238';
function mixColor(color: string, amount: number): string {
  const hex = color.slice(1),
    base = [255, 253, 242],
    target = [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
  return `rgb(${base.map((value, i) => Math.round(value + (target[i]! - value) * Math.max(0, Math.min(1, amount)))).join(',')})`;
}
/** 지역 선화·생성된 방/다리·원본 인물의 렌더와 이미지 수명을 소유한다. */
export class ColorDrawing {
  private readonly context: CanvasRenderingContext2D;
  private readonly images = new Map<string, HTMLImageElement>();
  private readonly motions: ReadonlyMap<string, Animation>;
  private readonly animation: AnimationPlayer;
  private lastMotion = 'stand';
  private width = 1;
  private height = 1;
  private pixelRatio = 1;
  private scale = 1;
  private camera: ColorPoint = { x: 0, z: 0.5 };
  private disposed = false;
  private renderCount = 0;
  private lastState: ColorSnapshot | null = null;
  private actorFrame: AnimationFrame | null = null;
  private actorFrameIndex = 0;
  constructor(private readonly canvas: HTMLCanvasElement) {
    const c = canvas.getContext('2d');
    if (!c) throw new Error('선화 Canvas를 사용할 수 없어요.');
    this.context = c;
    const hero = manifest.assets.find((a) => a.id === 'ai/tiger-hero');
    if (!hero) throw new Error('승인된 아타호 리소스가 없어요.');
    this.motions = new Map(
      Object.entries(hero.animations).filter(([id]) =>
        /^(stand|move)(-(back|left|right))?$/.test(id),
      ),
    );
    this.animation = new AnimationPlayer(this.motions, 'stand');
  }
  async load(): Promise<void> {
    const frames = [...this.motions.values()].flatMap((m) => m.frames),
      paths = new Set(frames.map((f) => f.localPath));
    await Promise.all(
      [...paths].map(
        (path) =>
          new Promise<void>((resolve, reject) => {
            const image = new Image();
            image.onload = () => {
              if (!this.disposed) this.images.set(path, image);
              resolve();
            };
            image.onerror = () =>
              reject(new Error(`아타호를 읽지 못했어요: ${path}`));
            image.src = resourceUrl(path).href;
          }),
      ),
    );
  }
  private resize(): void {
    const box = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, box.width);
    this.height = Math.max(1, box.height);
    this.pixelRatio = Math.min(2, devicePixelRatio || 1);
    const w = Math.round(this.width * this.pixelRatio),
      h = Math.round(this.height * this.pixelRatio);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }
  project(point: ColorPoint): ScreenPoint {
    return Object.freeze({
      x: this.width / 2 + (point.x - this.camera.x) * 29 * this.scale,
      y: this.height / 2 + (point.z - this.camera.z) * 24 * this.scale,
    });
  }
  groundFromPointer(x: number, y: number): ColorPoint {
    const box = this.canvas.getBoundingClientRect();
    return {
      x:
        (((x - box.left) * this.width) / box.width - this.width / 2) /
          (29 * this.scale) +
        this.camera.x,
      z:
        (((y - box.top) * this.height) / box.height - this.height / 2) /
          (24 * this.scale) +
        this.camera.z,
    };
  }
  private point(point: ColorPoint): ScreenPoint {
    return { x: point.x * 29, y: point.z * 24 };
  }
  private polygon(
    points: readonly ScreenPoint[],
    fill: string | null,
    lineWidth = 2.2,
  ): void {
    const first = points[0];
    if (!first) return;
    const c = this.context;
    c.beginPath();
    c.moveTo(first.x, first.y);
    for (const p of points.slice(1)) c.lineTo(p.x, p.y);
    c.closePath();
    if (fill) {
      c.fillStyle = fill;
      c.fill();
    }
    c.strokeStyle = ink;
    c.lineJoin = 'round';
    c.lineWidth = lineWidth;
    c.stroke();
  }
  private line(points: readonly ScreenPoint[], width = 2, color = ink): void {
    const first = points[0];
    if (!first) return;
    const c = this.context;
    c.beginPath();
    c.moveTo(first.x, first.y);
    for (const p of points.slice(1)) c.lineTo(p.x, p.y);
    c.strokeStyle = color;
    c.lineWidth = width;
    c.lineCap = 'round';
    c.stroke();
  }
  private ellipse(
    p: ScreenPoint,
    rx: number,
    ry: number,
    fill: string,
    lineWidth = 2,
  ): void {
    const c = this.context;
    c.beginPath();
    c.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI * 2);
    c.fillStyle = fill;
    c.fill();
    if (lineWidth) {
      c.strokeStyle = ink;
      c.lineWidth = lineWidth;
      c.stroke();
    }
  }
  private text(
    value: string,
    point: ScreenPoint,
    size = 12,
    color = ink,
  ): void {
    const c = this.context;
    c.fillStyle = color;
    c.font = `650 ${size}px system-ui,sans-serif`;
    c.textAlign = 'center';
    c.fillText(value, point.x, point.y);
  }
  private floor(rect: Rect, fill: string): void {
    const s = this.point(rect),
      w = rect.width * 29,
      h = rect.depth * 24,
      c = this.context;
    c.beginPath();
    c.roundRect(s.x - w / 2, s.y - h / 2, w, h, 10);
    c.fillStyle = fill;
    c.fill();
    c.strokeStyle = ink;
    c.lineWidth = 2.5;
    c.stroke();
  }
  private regionColor(
    point: ColorPoint,
    region: number,
    color: string,
    state: ColorSnapshot,
  ): string {
    const place = colorPlaces[region]!,
      distance = Math.hypot(point.x - place.x, point.z - place.z);
    const progress = state.regionProgress[region] ?? 0;
    return mixColor(
      color,
      progress === 1
        ? 1
        : Math.max(0, Math.min(1, (progress * 20 - distance) / 2)),
    );
  }
  private land(
    rect: Rect,
    region: number,
    color: string,
    state: ColorSnapshot,
  ): void {
    const c = this.context;
    this.floor(rect, paper);
    const place = this.point(colorPlaces[region]!);
    c.save();
    c.beginPath();
    c.arc(
      place.x,
      place.y,
      (state.regionProgress[region] ?? 0) * 650,
      0,
      Math.PI * 2,
    );
    c.clip();
    this.floor(rect, color);
    c.restore();
    for (let i = 0; i < 4; i++) {
      const p = this.point({
        x: rect.x + Math.sin(i * 2.1) * rect.width * 0.35,
        z: rect.z + Math.cos(i * 1.3) * rect.depth * 0.35,
      });
      this.line(
        [
          { x: p.x - 5, y: p.y },
          { x: p.x, y: p.y - 8 },
          { x: p.x + 4, y: p.y },
        ],
        1.2,
        '#aaa98e',
      );
    }
  }
  private bridge(rect: Rect, progress: number): void {
    const c = this.context,
      p = this.point(rect),
      w = rect.width * 29,
      h = rect.depth * 24;
    if (progress < 1) {
      c.save();
      c.setLineDash([6, 7]);
      this.polygon(
        [
          { x: p.x - w / 2, y: p.y - h / 2 },
          { x: p.x + w / 2, y: p.y - h / 2 },
          { x: p.x + w / 2, y: p.y + h / 2 },
          { x: p.x - w / 2, y: p.y + h / 2 },
        ],
        null,
        1.3,
      );
      c.restore();
    }
    if (progress > 0) {
      c.save();
      c.beginPath();
      c.rect(p.x - w / 2, p.y - h / 2, w * progress, h);
      c.clip();
      this.floor(rect, '#ebc88d');
      for (let x = -w / 2 + 12; x < w / 2; x += 17)
        this.line(
          [
            { x: p.x + x, y: p.y - h / 2 },
            { x: p.x + x + 1, y: p.y + h / 2 },
          ],
          1.4,
        );
      c.restore();
    }
    if (progress === 1) {
      for (const y of [-h / 2, h / 2])
        this.line(
          [
            { x: p.x - w / 2, y: p.y + y - 5 },
            { x: p.x + w / 2, y: p.y + y - 5 },
          ],
          3,
        );
      for (const x of [-w / 2, w / 2])
        this.line(
          [
            { x: p.x + x, y: p.y - h / 2 - 11 },
            { x: p.x + x, y: p.y - h / 2 + 1 },
          ],
          3,
        );
    }
  }
  private house(
    rect: Rect,
    label: string,
    region: number,
    state: ColorSnapshot,
  ): void {
    const p = this.point({ x: rect.x, z: rect.z + rect.depth / 2 }),
      w = rect.width * 29,
      depth = rect.depth * 24;
    const wall = this.regionColor(
        rect,
        region,
        region === 0 ? '#e8bc91' : '#c1d8cb',
        state,
      ),
      roof = this.regionColor(
        rect,
        region,
        region === 0 ? '#b5ceb0' : '#d99e98',
        state,
      );
    this.ellipse({ x: p.x + 4, y: p.y + 5 }, w * 0.56, 10, '#d6d2bf', 0);
    this.polygon(
      [
        { x: p.x - w / 2, y: p.y },
        { x: p.x + w / 2, y: p.y + 1 },
        { x: p.x + w / 2, y: p.y - 57 },
        { x: p.x - w / 2, y: p.y - 58 },
      ],
      wall,
    );
    this.polygon(
      [
        { x: p.x - w / 2 - 9, y: p.y - 55 },
        { x: p.x - w / 2 + 12, y: p.y - depth - 55 },
        { x: p.x + 5, y: p.y - depth - 76 },
        { x: p.x + w / 2 + 12, y: p.y - 59 },
        { x: p.x + 5, y: p.y - 61 },
      ],
      roof,
      3.4,
    );
    this.line(
      [
        { x: p.x - w / 2 - 7, y: p.y - 56 },
        { x: p.x + 5, y: p.y - 61 },
        { x: p.x + w / 2 + 10, y: p.y - 60 },
      ],
      2.3,
    );
    this.polygon(
      [
        { x: p.x - 17, y: p.y },
        { x: p.x - 18, y: p.y - 36 },
        { x: p.x + 17, y: p.y - 37 },
        { x: p.x + 18, y: p.y },
      ],
      this.regionColor(rect, region, '#be936e', state),
    );
    for (const offset of [-w * 0.29, w * 0.29]) {
      this.polygon(
        [
          { x: p.x + offset - 11, y: p.y - 40 },
          { x: p.x + offset + 11, y: p.y - 40 },
          { x: p.x + offset + 11, y: p.y - 20 },
          { x: p.x + offset - 11, y: p.y - 20 },
        ],
        this.regionColor(rect, region, '#c8dfe2', state),
      );
      this.line(
        [
          { x: p.x + offset, y: p.y - 40 },
          { x: p.x + offset, y: p.y - 20 },
        ],
        1.5,
      );
    }
    this.text(label, { x: p.x, y: p.y - 44 }, 11);
    if ((state.regionProgress[region] ?? 0) > 0.85) {
      for (const x of [-w / 2 + 7, w / 2 - 7])
        this.flower(
          { x: p.x + x, y: p.y + 5 },
          region === 0 ? '#df9785' : '#e6bc68',
        );
    }
  }
  private flower(p: ScreenPoint, color: string): void {
    this.line(
      [
        { x: p.x, y: p.y },
        { x: p.x, y: p.y - 18 },
      ],
      2,
      '#526e4e',
    );
    this.ellipse({ x: p.x, y: p.y - 20 }, 7, 6, color);
    this.polygon(
      [
        { x: p.x - 7, y: p.y },
        { x: p.x + 8, y: p.y },
        { x: p.x + 5, y: p.y + 11 },
        { x: p.x - 5, y: p.y + 11 },
      ],
      '#d4ab82',
      1.5,
    );
  }
  private room(state: ColorSnapshot): void {
    const c = this.context,
      progress = state.regionProgress[1] ?? 0,
      complete = state.stage === 2;
    if (!complete) {
      if (!progress) return;
      c.save();
      c.globalAlpha = 0.35;
      this.floor(colorFloors.room, '#f6ddb4');
      this.text('이어지는 방', { x: 174, y: -159 }, 11);
      c.restore();
      return;
    }
    this.floor(colorFloors.room, '#ead5b0');
    for (let z = -7.2; z < -1.7; z += 0.7)
      this.line(
        [
          { x: 4 * 29, y: z * 24 },
          { x: 8 * 29, y: z * 24 },
        ],
        1,
        '#bfad91',
      );
    for (const wall of roomWalls) {
      const p = this.point(wall),
        w = Math.max(8, wall.width * 29),
        d = wall.depth * 24;
      this.polygon(
        [
          { x: p.x - w / 2, y: p.y + d / 2 },
          { x: p.x + w / 2, y: p.y + d / 2 },
          { x: p.x + w / 2, y: p.y - d / 2 - 29 },
          { x: p.x - w / 2, y: p.y - d / 2 - 29 },
        ],
        '#b9d0bf',
      );
      this.line(
        [
          { x: p.x - w / 2, y: p.y - d / 2 - 29 },
          { x: p.x + w / 2, y: p.y - d / 2 - 29 },
        ],
        3.4,
      );
    }
    for (const item of roomFurniture) {
      const p = this.point(item),
        w = item.width * 29,
        d = item.depth * 24;
      this.polygon(
        [
          { x: p.x - w / 2, y: p.y + d / 2 },
          { x: p.x + w / 2, y: p.y + d / 2 },
          { x: p.x + w / 2, y: p.y - d / 2 - 10 },
          { x: p.x - w / 2, y: p.y - d / 2 - 10 },
        ],
        item.depth > 1 ? '#adbacd' : '#d2b286',
      );
      if (item.depth > 1)
        this.ellipse({ x: p.x, y: p.y - d / 2 - 5 }, 10, 5, paper, 1.5);
      else this.ellipse({ x: p.x, y: p.y - 13 }, 5, 4, paper, 1.2);
    }
    this.text('다락방', { x: 6 * 29, y: -7.8 * 24 - 35 }, 12);
    this.text('동쪽 찻집', { x: 6 * 29, y: -1.4 * 24 - 7 }, 10);
    // 지붕은 뒤쪽 띠만 남겨 실제 걸을 수 있는 방과 연결 복도를 읽히게 한다.
    this.polygon(
      [
        { x: 3.8 * 29 - 9, y: -7.8 * 24 - 30 },
        { x: 8.2 * 29 + 9, y: -7.8 * 24 - 30 },
        { x: 8.2 * 29 + 4, y: -7.8 * 24 - 51 },
        { x: 3.8 * 29 + 3, y: -7.8 * 24 - 54 },
      ],
      '#d99e98',
      3,
    );
  }
  private tree(tree: (typeof colorTrees)[number], state: ColorSnapshot): void {
    const p = this.point(tree);
    this.line(
      [
        { x: p.x, y: p.y },
        { x: p.x + 1, y: p.y - 43 },
      ],
      8,
      this.regionColor(tree, tree.region, '#ae926d', state),
    );
    this.ellipse(
      { x: p.x - 11, y: p.y - 51 },
      24,
      22,
      this.regionColor(tree, tree.region, '#b4d0a0', state),
    );
    this.ellipse(
      { x: p.x + 14, y: p.y - 54 },
      21,
      24,
      this.regionColor(tree, tree.region, '#c1d6a8', state),
    );
    this.line(
      [
        { x: p.x, y: p.y - 31 },
        { x: p.x - 13, y: p.y - 49 },
        { x: p.x, y: p.y - 38 },
        { x: p.x + 15, y: p.y - 58 },
      ],
      1.3,
      '#6e7760',
    );
  }
  private hero(state: ColorSnapshot): void {
    const facing = cardinalFacing(state.player.facing),
      suffix = facing === 'front' ? '' : `-${facing}`,
      motion = this.motions.get(
        `${state.player.moving ? 'move' : 'stand'}${suffix}`,
      );
    if (!motion) return;
    const { index, frame } = this.animation.currentFrame;
    if (!frame) return;
    const image = this.images.get(frame.localPath);
    if (!image) return;
    this.actorFrame = frame;
    this.actorFrameIndex = index;
    const p = this.point(state.position),
      c = this.context,
      size = 0.92;
    this.ellipse({ x: p.x, y: p.y + 1 }, 13, 4, '#d3ceba', 0);
    c.imageSmoothingEnabled = false;
    c.drawImage(
      image,
      p.x - frame.pivot.x * size,
      p.y - (frame.height - frame.pivot.y) * size,
      frame.width * size,
      frame.height * size,
    );
    c.imageSmoothingEnabled = true;
    if (state.nearby) {
      this.ellipse({ x: p.x, y: p.y - 76 }, 13, 9, paper);
      this.text('···', { x: p.x, y: p.y - 73 }, 12);
    }
  }
  render(
    state: ColorSnapshot,
    delta: number,
    options: { readonly overview: boolean },
  ): void {
    if (this.disposed) return;
    this.lastState = state;
    const facing = cardinalFacing(state.player.facing),
      suffix = facing === 'front' ? '' : `-${facing}`,
      motion = `${state.player.moving ? 'move' : 'stand'}${suffix}`;
    if (motion !== this.lastMotion) {
      this.lastMotion = motion;
      this.animation.play(motion);
    }
    this.animation.update(delta);
    this.renderCount++;
    this.resize();
    this.scale = options.overview
      ? Math.min(this.width / 755, this.height / 565) * 0.97
      : Math.min(1.5, Math.max(1, this.width / 650));
    this.camera = options.overview
      ? { x: 0, z: 0.5 }
      : { x: state.position.x * 0.89, z: state.position.z * 0.84 - 0.3 };
    const c = this.context;
    c.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    c.fillStyle = '#eee9d8';
    c.fillRect(0, 0, this.width, this.height);
    c.save();
    c.translate(
      this.width / 2 - this.camera.x * 29 * this.scale,
      this.height / 2 - this.camera.z * 24 * this.scale,
    );
    c.scale(this.scale, this.scale);
    const left = this.point({ x: -1.5, z: -9 }),
      right = this.point({ x: 1.5, z: 9 });
    c.fillStyle = '#d8e6e5';
    c.fillRect(left.x, left.y, right.x - left.x, right.y - left.y);
    for (let z = -8; z < 9; z += 2)
      this.line(
        [
          { x: -20, y: z * 24 },
          { x: -5, y: z * 24 + 4 },
          { x: 10, y: z * 24 },
        ],
        1,
        '#92b2b5',
      );
    this.land(colorFloors.west, 0, '#e0e8cb', state);
    this.land(colorFloors.east, 1, '#d5e4d3', state);
    this.bridge(colorFloors.firstBridge, state.regionProgress[0] ?? 0);
    this.bridge(colorFloors.returnBridge, state.regionProgress[1] ?? 0);
    const entrance = this.point({ x: -8, z: 6 });
    this.ellipse(entrance, 20, 11, '#e7d5a8');
    this.text('입구', { x: entrance.x, y: entrance.y + 27 }, 12);
    this.room(state);
    const layers: { z: number; draw: () => void }[] = [
      {
        z: workshopBody.z + workshopBody.depth / 2,
        draw: () => this.house(workshopBody, '안료 공방', 0, state),
      },
      { z: state.position.z, draw: () => this.hero(state) },
    ];
    if (state.stage < 2)
      layers.push({
        z: teahouseBody.z + teahouseBody.depth / 2,
        draw: () => this.house(teahouseBody, '동쪽 찻집', 1, state),
      });
    for (const tree of colorTrees)
      layers.push({ z: tree.z, draw: () => this.tree(tree, state) });
    layers.sort((a, b) => a.z - b.z).forEach((item) => item.draw());
    if (state.stage === 2) {
      this.flower(this.point({ x: 3.2, z: 5.5 }), '#ddb268');
      this.flower(this.point({ x: -3.2, z: 5.5 }), '#df9486');
      this.text('귀환길', { x: 0, y: 5.3 * 24 + 39 }, 11);
    }
    if (state.stage >= 1) this.text('동쪽으로', { x: 0, y: -31 }, 11);
    c.restore();
  }
  get screenPositions() {
    return Object.freeze(
      Object.fromEntries(colorPlaces.map((p) => [p.id, this.project(p)])),
    );
  }
  get diagnostics() {
    return Object.freeze({
      renderCount: this.renderCount,
      cssWidth: this.width,
      cssHeight: this.height,
      backingWidth: this.canvas.width,
      backingHeight: this.canvas.height,
      pixelRatio: this.pixelRatio,
      actorOriginalRgba: true,
      actorFrameCount: [...this.motions.values()].reduce(
        (n, m) => n + m.frames.length,
        0,
      ),
      actorFrameIndex: this.actorFrameIndex,
      actorFrame: this.actorFrame
        ? Object.freeze({
            width: this.actorFrame.width,
            height: this.actorFrame.height,
            pivot: Object.freeze({ ...this.actorFrame.pivot }),
            path: this.actorFrame.localPath,
          })
        : null,
      firstBridgeOpen: (this.lastState?.stage ?? 0) >= 1,
      roomOpen: this.lastState?.stage === 2,
      returnBridgeOpen: this.lastState?.stage === 2,
      generatedFloorsShareMovementRules: true,
      disposed: this.disposed,
    });
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.images.clear();
  }
}
