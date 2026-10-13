import {
  embeddedScene,
  registerEmbeddedScene,
  reportEmbeddedSelection,
} from '../../catalog/embedded-scene.js';
import { Hd2dVillageScene } from './scene.js';
import { VillageVisit, villagePoints } from './visit.js';
function element<T extends HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`화면 요소가 없습니다: ${selector}`);
  return found;
}
/** 입력·표시와 장면 수명을 소유한다. */
class Hd2dVillageScreen {
  private readonly lifetime = new AbortController();
  private readonly keys = new Set<string>();
  private readonly visit = new VillageVisit();
  private readonly canvas = element<HTMLCanvasElement>('canvas');
  private readonly scene = new Hd2dVillageScene(this.canvas);
  private readonly resizeObserver = new ResizeObserver(() =>
    this.scene.resize(),
  );
  private frame = 0;
  private lastTime = performance.now();
  private elapsed = 0;
  private ready = false;
  private disposed = false;
  private paused = false;
  private overview = false;
  constructor() {
    this.registerInput();
    this.resizeObserver.observe(this.canvas);
    registerEmbeddedScene(() => this.dispose());
    window.addEventListener('pagehide', () => this.dispose(), {
      once: true,
      signal: this.lifetime.signal,
    });
    Object.defineProperty(window, 'villageStyleHd2d', {
      configurable: true,
      get: () => ({
        ready: this.ready,
        snapshot: this.visit.snapshot,
        paused: this.paused,
        overview: this.overview,
        disposed: this.disposed,
        sprite: this.scene.actorMetrics,
        screenPositions: Object.fromEntries(
          villagePoints.map((point) => [point.id, this.scene.project(point)]),
        ),
      }),
    });
    reportEmbeddedSelection('local/village-style-hd2d');
    void this.load();
  }
  private async load(): Promise<void> {
    try {
      await this.scene.load();
      if (this.disposed) return;
      this.ready = true;
      if (!embeddedScene) this.canvas.focus();
      this.lastTime = performance.now();
      this.frame = requestAnimationFrame(this.render);
    } catch (error) {
      element('#status').textContent =
        error instanceof Error
          ? error.message
          : '아타호 리소스를 불러오지 못했어요.';
    }
  }
  private interact = (): void => {
    if (this.paused) return;
    element('.notice').textContent = this.visit.interact();
    this.canvas.focus();
  };
  private clearInput = (): void => {
    this.keys.clear();
    this.visit.stop();
  };
  private togglePause = (): void => {
    this.paused = !this.paused;
    this.clearInput();
    element('.paused').hidden = !this.paused;
    element('#pause').setAttribute('aria-pressed', String(this.paused));
    this.canvas.focus();
  };
  private toggleOverview = (): void => {
    this.overview = !this.overview;
    element('#overview').setAttribute('aria-pressed', String(this.overview));
    this.canvas.focus();
  };
  private toggleRestored = (): void => {
    this.visit.toggleRestored();
    element('.notice').textContent = this.visit.snapshot.restored
      ? '도장 복구 · 기와, 문, 등불의 변화를 비교해 보세요.'
      : '도장 복구 전 · 덧댄 지붕과 꺼진 등불';
    this.canvas.focus();
  };
  private registerInput(): void {
    const { signal } = this.lifetime;
    window.addEventListener(
      'keydown',
      (event) => {
        const key = event.key.toLowerCase();
        if (
          ![
            'arrowup',
            'arrowdown',
            'arrowleft',
            'arrowright',
            'w',
            'a',
            's',
            'd',
            'r',
            'm',
            'escape',
            ' ',
          ].includes(key)
        )
          return;
        event.preventDefault();
        if (!event.repeat) {
          if (key === 'escape') this.togglePause();
          if (key === 'm') this.toggleOverview();
          if (key === 'r') this.toggleRestored();
          if (key === ' ') this.interact();
        }
        if (!this.paused) this.keys.add(key);
      },
      { signal },
    );
    window.addEventListener(
      'keyup',
      (event) => this.keys.delete(event.key.toLowerCase()),
      { signal },
    );
    window.addEventListener('blur', this.clearInput, { signal });
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) this.clearInput();
      },
      { signal },
    );
    this.canvas.addEventListener(
      'pointerdown',
      (event) => {
        if (this.paused || !this.ready) return;
        this.canvas.focus();
        const point = this.scene.pick(event.clientX, event.clientY);
        if (point) {
          this.visit.navigate(point);
          if (!this.visit.snapshot.routeRemaining)
            element('.notice').textContent =
              '걸을 수 있는 바닥이나 계단을 눌러 주세요.';
        }
      },
      { signal },
    );
    element('#restore').addEventListener('click', this.toggleRestored, {
      signal,
    });
    element('#overview').addEventListener('click', this.toggleOverview, {
      signal,
    });
    element('#pause').addEventListener('click', this.togglePause, { signal });
    element('#interact').addEventListener('click', this.interact, { signal });
    element('#reset').addEventListener(
      'click',
      () => {
        this.visit.reset();
        this.keys.clear();
        element('.notice').textContent =
          '입구로 돌아왔어요. 두 길로 마을을 돌아보세요.';
        this.canvas.focus();
      },
      { signal },
    );
  }
  private render = (time: number): void => {
    if (this.disposed) return;
    const seconds = Math.min(0.04, Math.max(0, (time - this.lastTime) / 1000));
    this.lastTime = time;
    if (!this.paused) {
      this.elapsed += seconds;
      this.visit.update(seconds, {
        x:
          Number(this.keys.has('d') || this.keys.has('arrowright')) -
          Number(this.keys.has('a') || this.keys.has('arrowleft')),
        z:
          Number(this.keys.has('s') || this.keys.has('arrowdown')) -
          Number(this.keys.has('w') || this.keys.has('arrowup')),
      });
    }
    const snapshot = this.visit.snapshot;
    this.scene.render(snapshot, this.elapsed, this.overview);
    const nearby = this.visit.nearby;
    element('.prompt').hidden = !nearby;
    element('.prompt').textContent = nearby
      ? `${nearby.name} · Space / 시설 사용`
      : '';
    element('#status').textContent =
      `${snapshot.height > 2.7 ? '상층 마당' : snapshot.height > 0.2 ? '계단 · 오르막' : '아래 골목'} · 높이 ${snapshot.height.toFixed(1)} · 시설 ${snapshot.visited.length}/3`;
    element('#restore').setAttribute('aria-pressed', String(snapshot.restored));
    this.frame = requestAnimationFrame(this.render);
  };
  private dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.ready = false;
    this.clearInput();
    cancelAnimationFrame(this.frame);
    this.lifetime.abort();
    this.resizeObserver.disconnect();
    this.scene.dispose();
  }
}
new Hd2dVillageScreen();
