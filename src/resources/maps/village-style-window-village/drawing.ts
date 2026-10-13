import { motionFor } from './motion.js';
import manifest from '../../../../resources/manifest.json' with { type: 'json' };
import { resourceUrl } from '../../catalog/resource-url.js';
import {
  AnimationPlayer,
  type Animation,
  type AnimationFrame,
} from '../../preview/animation-player.js';
import {
  createHouse,
  createTerrain,
  worldPixel,
  type HouseArt,
} from './art.js';
import { drawPixelResident } from './resident.js';
import {
  buildings,
  fixtures,
  type BuildingId,
  type VillagePoint,
  type VillageSnapshot,
} from './village.js';
export class WindowVillageDrawing {
  readonly ready: Promise<void>;
  private readonly context: CanvasRenderingContext2D;
  private readonly terrain = createTerrain();
  private readonly houses = new Map<BuildingId, HouseArt>();
  private readonly animation: AnimationPlayer;
  private readonly images = new Map<string, HTMLImageElement>();
  private width = 1000;
  private height = 650;
  private scale = 1;
  private camera: VillagePoint = { x: 0, z: 0 };
  private previousElapsed = 0;
  private shadeTime = -1;
  private version = '';
  private repaired = false;
  private disposed = false;
  private motion = 'stand';
  private lightSide = -1;
  constructor(private readonly canvas: HTMLCanvasElement) {
    const c = canvas.getContext('2d');
    if (!c) throw new Error('2D Canvas를 사용할 수 없어요.');
    this.context = c;
    const asset = manifest.assets.find((a) => a.id === 'ai/tiger-hero');
    if (!asset) throw new Error('승인된 아타호가 없습니다.');
    const motions: ReadonlyMap<string, Animation> = new Map(
      Object.entries(asset.animations).filter(
        ([name]) =>
          name === 'stand' ||
          name === 'move' ||
          name.startsWith('stand-') ||
          name.startsWith('move-'),
      ),
    );
    this.animation = new AnimationPlayer(motions, this.motion);
    this.ready = Promise.all(
      [...motions.values()].flatMap((a) => a.frames).map((f) => this.load(f)),
    ).then(() => undefined);
    for (const b of buildings) this.houses.set(b.id, createHouse(b.id, false));
  }
  private load(frame: AnimationFrame): Promise<void> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        if (!this.disposed) this.images.set(frame.localPath, image);
        resolve();
      };
      image.onerror = () =>
        reject(
          new Error(`아타호 프레임을 불러오지 못했어요: ${frame.localPath}`),
        );
      image.src = resourceUrl(frame.localPath).href;
    });
  }
  resize(): void {
    const bounds = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, bounds.width);
    this.height = Math.max(1, bounds.height);
    const dpr = Math.min(2, devicePixelRatio || 1);
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
  }
  changeLight(): void {
    this.lightSide *= -1;
    this.shadeTime = -1;
  }
  project(point: VillagePoint): { readonly x: number; readonly y: number } {
    return {
      x: this.width / 2 + (point.x - this.camera.x) * 20 * this.scale,
      y: this.height * 0.53 + (point.z - this.camera.z) * 14 * this.scale,
    };
  }
  pointerToWorld(x: number, y: number): VillagePoint {
    const b = this.canvas.getBoundingClientRect();
    return {
      x: this.camera.x + (x - b.left - this.width / 2) / (20 * this.scale),
      z: this.camera.z + (y - b.top - this.height * 0.53) / (14 * this.scale),
    };
  }
  get diagnostics() {
    return {
      camera: {
        ...this.camera,
        scale: this.scale,
        width: this.width,
        height: this.height,
      },
      light: {
        side: this.lightSide,
        method: 'albedo·height normal·lamp diffuse·distance',
        time: this.shadeTime,
      },
      windows: [...this.houses].map(([id, art]) => ({
        id,
        pixels: art.windows.map((w) => ({
          x: w.x + art.x,
          y: w.y + art.y,
          width: w.width,
          height: w.height,
        })),
      })),
      normal: { source: '기와·나무 결·돌길 높이장', spriteUnmodified: true },
      pixel: { art: 1, resident: 1, spriteScale: 0.86 },
    };
  }
  render(state: VillageSnapshot, overview: boolean): void {
    if (this.disposed) return;
    const inside = buildings.find((b) => b.id === state.inside);
    this.camera =
      inside && !overview ? { x: inside.x, z: inside.z - 2.2 } : { x: 0, z: 0 };
    this.scale =
      Math.min(this.width / 650, this.height / 490) *
      (inside && !overview ? 1.8 : 1);
    const delta = Math.max(0, state.elapsed - this.previousElapsed);
    this.previousElapsed = state.elapsed;
    const name = motionFor(state.direction, state.moving);
    if (name !== this.motion) {
      this.motion = name;
      this.animation.play(name);
    }
    this.animation.update(delta);
    this.shade(state);
    const c = this.context;
    c.setTransform(
      this.canvas.width / this.width,
      0,
      0,
      this.canvas.height / this.height,
      0,
      0,
    );
    c.fillStyle = '#243d3b';
    c.fillRect(0, 0, this.width, this.height);
    c.save();
    c.translate(this.width / 2, this.height * 0.53);
    c.scale(this.scale, this.scale);
    c.translate(-360 - this.camera.x * 20, -280 - this.camera.z * 14);
    c.imageSmoothingEnabled = false;
    c.drawImage(this.terrain.canvas, 0, 0);
    this.water(state.elapsed);
    for (const [id, house] of this.houses) {
      c.drawImage(house.base.canvas, house.x, house.y);
      this.life(id, state, house);
    }
    const depth = [
      ...buildings.map((b) => ({
        z: b.z,
        kind: 'building' as const,
        id: b.id,
      })),
      { z: state.position.z, kind: 'hero' as const, id: 'hero' as const },
    ].sort((a, b) => a.z - b.z);
    for (const object of depth) {
      if (object.kind === 'hero') this.hero(state);
      else this.roof(object.id, state);
    }
    for (const [x, z] of [
      [-12, -10],
      [-12, 7],
      [12, 9],
      [12, -12],
      [-5, -12],
    ])
      this.tree(x ?? 0, z ?? 0);
    this.labels(state);
    c.restore();
  }
  private shade(state: VillageSnapshot): void {
    if (this.repaired !== state.repaired) {
      const art = this.houses.get('dojo');
      art?.base.dispose();
      art?.roof.dispose();
      this.houses.set('dojo', createHouse('dojo', state.repaired));
      this.repaired = state.repaired;
    }
    const version = `${state.worked}/${state.repaired}/${state.fireSeconds > 0}/${this.lightSide}`;
    if (
      this.shadeTime >= 0 &&
      state.elapsed - this.shadeTime < 0.15 &&
      version === this.version
    )
      return;
    this.version = version;
    this.shadeTime = state.elapsed;
    const lights = buildings.map((b) => {
      const p = worldPixel(b);
      const power =
        b.id === 'workshop'
          ? state.fireSeconds > 0
            ? 1.4
            : 0.75
          : b.id === 'dojo'
            ? state.repaired
              ? 1.0
              : 0.38
            : 0.9;
      return { x: p.x + this.lightSide * 32, y: p.y - 25, power };
    });
    this.terrain.shade(lights);
    for (const art of this.houses.values()) {
      const local = lights.map((l) => ({
        ...l,
        x: l.x - art.x,
        y: l.y - art.y,
      }));
      art.base.shade(local);
      art.roof.shade(local);
    }
  }
  private life(id: BuildingId, state: VillageSnapshot, art: HouseArt): void {
    const x = art.x,
      y = art.y;
    const active =
      id === 'workshop'
        ? state.fireSeconds > 0
        : id === 'dojo'
          ? state.trainingSeconds > 0
          : state.tea;
    drawPixelResident(this.context, {
      x: x + 118,
      y: y + 139,
      role: id === 'workshop' ? 'smith' : id === 'dojo' ? 'trainer' : 'host',
      active,
      elapsed: state.elapsed,
    });
    if (id === 'workshop') {
      if (state.fireSeconds > 0) {
        const pose = Math.floor(state.elapsed * 8) % 3;
        this.rect(x + 41, y + 113 - pose, 13, 13 + pose, '#e69c4e');
        this.rect(x + 45, y + 113 - pose * 2, 6, 13 + pose * 2, '#f4ca77');
      } else this.rect(x + 45, y + 123, 9, 2, '#b76f3e');
      if (state.worked) this.rect(x + 111, y + 105, 13, 3, '#bb9b61');
    }
    if (id === 'dojo' && state.trainingSeconds > 0)
      this.rect(
        x + 100,
        y + 88,
        5 + (Math.floor(state.elapsed * 5) % 3) * 2,
        4,
        '#cfb274',
      );
    if (id === 'teahouse' && state.tea) {
      this.rect(x + 55, y + 106, 6, 5, '#d9cea7');
      this.rect(x + 56, y + 105, 4, 2, '#8c7150');
      this.rect(
        x + 56 + (Math.floor(state.elapsed * 2) % 2),
        y + 100,
        1,
        4,
        '#e4d9b7',
      );
    }
  }
  private roof(id: BuildingId, state: VillageSnapshot): void {
    const art = this.houses.get(id);
    if (!art) return;
    const c = this.context;
    c.globalAlpha = state.inside === id ? 0.06 : 1;
    c.drawImage(art.roof.canvas, art.x, art.y);
    c.globalAlpha = 1;
    if (state.inside === id) return;
    for (const w of art.windows) {
      const x = art.x + w.x,
        y = art.y + w.y;
      c.globalAlpha = 0.1;
      this.rect(x, y, w.width, w.height, '#ffd28b');
      c.globalAlpha = 1;
      this.rect(x + 16, y, 2, w.height, '#886f48');
      this.rect(x, y + 13, w.width, 2, '#886f48');
      this.rect(x - 2, y + w.height, w.width + 4, 3, '#b59b6d');
    }
  }
  private hero(state: VillageSnapshot): void {
    const { frame } = this.animation.currentFrame,
      image = this.images.get(frame.localPath);
    if (!image) return;
    const p = worldPixel(state.position),
      s = 0.86;
    this.rect(p.x - 11, p.y - 2, 23, 3, '#263b3766');
    this.context.drawImage(
      image,
      Math.round(p.x - frame.pivot.x * s),
      Math.round(p.y - (frame.height - frame.pivot.y) * s),
      frame.width * s,
      frame.height * s,
    );
    if (state.nearbyDoor || state.nearbyFixture)
      this.label('Space', p.x, p.y - 60, 8, '#fff0c4');
  }
  private tree(x: number, z: number): void {
    const p = worldPixel({ x, z });
    const ellipse = (
      cx: number,
      cy: number,
      rx: number,
      ry: number,
      color: string,
    ): void => {
      // 수관 외곽을 두 픽셀 띠로 끊어 주민과 같은 선명한 픽셀 경계를 유지한다.
      for (let yy = -ry; yy <= ry; yy += 2) {
        const half = Math.sqrt(Math.max(0, 1 - (yy / ry) ** 2)) * rx;
        this.rect(cx - half, cy + yy, Math.max(2, half * 2), 2, color);
      }
    };
    ellipse(p.x + 3, p.y + 2, 19, 5, '#304b3d44');
    this.rect(p.x - 3, p.y - 26, 6, 29, '#6a654a');
    this.rect(p.x - 1, p.y - 24, 2, 24, '#918163');
    this.rect(p.x - 9, p.y - 24, 7, 3, '#6a654a');
    this.rect(p.x + 3, p.y - 31, 8, 3, '#6a654a');
    ellipse(p.x + 1, p.y - 34, 24, 16, '#49644d');
    ellipse(p.x - 10, p.y - 46, 18, 16, '#5a7356');
    ellipse(p.x + 11, p.y - 48, 18, 16, '#5f7958');
    ellipse(p.x, p.y - 57, 13, 14, '#6d825c');
    this.rect(p.x - 7, p.y - 66, 8, 2, '#89986c');
    this.rect(p.x + 6, p.y - 53, 7, 2, '#839365');
    this.rect(p.x - 18, p.y - 47, 6, 2, '#7a8b61');
    this.rect(p.x + 13, p.y - 35, 6, 2, '#6c825b');
  }
  private water(elapsed: number): void {
    for (let i = 0; i < 21; i++) {
      const y = 89 + i * 18;
      if (y > 328 && y < 387) continue;
      const x = 441 + (Math.floor(elapsed * 2 + i) % 5);
      this.rect(x, y, 13, 1, '#91afa0');
    }
  }
  private labels(state: VillageSnapshot): void {
    for (const b of buildings) {
      const p = worldPixel(b),
        locked =
          b.id === 'dojo'
            ? !state.worked
            : b.id === 'teahouse'
              ? !state.repaired
              : false;
      this.label(
        `${b.name}${locked ? ' · 잠김' : state.inside === b.id ? ' · 실내' : ''}`,
        p.x,
        p.y + 14,
        9,
        '#eee3bf',
      );
    }
    this.label('개울 다리', 451, 401, 8, '#dcd5b4');
    this.label('마을 입구', 320, 456, 9, '#eee3bf');
    if (state.inside)
      for (const f of fixtures.filter((f) => f.room === state.inside)) {
        const p = worldPixel(f);
        this.label(`${f.name} · Space`, p.x, p.y - 28, 8, '#f1dcaa');
      }
  }
  private rect(
    x: number,
    y: number,
    w: number,
    h: number,
    color: string,
  ): void {
    this.context.fillStyle = color;
    this.context.fillRect(
      Math.round(x),
      Math.round(y),
      Math.round(w),
      Math.round(h),
    );
  }
  private label(
    text: string,
    x: number,
    y: number,
    size: number,
    color: string,
  ): void {
    const c = this.context;
    c.font = `600 ${size}px "Apple SD Gothic Neo", sans-serif`;
    c.textAlign = 'center';
    c.fillStyle = '#253e39';
    c.fillRect(
      Math.round(x - text.length * size * 0.29 - 3),
      Math.round(y - size),
      Math.round(text.length * size * 0.58 + 6),
      size + 4,
    );
    c.fillStyle = color;
    c.fillText(text, Math.round(x), Math.round(y));
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.images.clear();
    this.terrain.dispose();
    for (const art of this.houses.values()) {
      art.base.dispose();
      art.roof.dispose();
    }
    this.houses.clear();
    this.canvas.width = this.canvas.height = 1;
  }
}
