import { viewport } from './layout.js';
import type { AnimationFrame } from '../../resources/preview/animation-player.js';
import { getContext, type GameAssets } from './assets.js';
import { passage, type GameSnapshot } from './game.js';
import { smooth } from './event-rules.js';
import { loading } from './loading-wheel.js';
import { drawRoom } from './renderer.js';
import { drawPlayer } from './player-renderer.js';
import { cameraPosition } from './spatial-rules.js';

// 로딩 표시는 CSS 픽셀 크기를 유지한다. 게임 배율에 따라 거대한 물체가 되지 않는다.
export class LoadingOverlay {
  private readonly root = document.createElement('div');
  private readonly surface = document.createElement('canvas');
  private readonly room = document.createElement('canvas');
  private readonly indicator = document.createElement('div');
  private readonly spinner = document.createElement('div');
  private density = 1;

  constructor(
    scene: HTMLCanvasElement,
    private readonly assets: GameAssets,
  ) {
    this.root.className = 'loading-overlay';
    this.root.hidden = true;
    this.root.setAttribute('aria-hidden', 'true');
    this.surface.className = 'loading-surface';
    this.indicator.className = 'loading-indicator';
    this.spinner.className = 'loading-spinner';
    const label = document.createElement('span');
    label.textContent = 'Loading…';
    this.indicator.append(this.spinner, label);
    this.root.append(this.surface, this.indicator);
    this.room.width = viewport.width;
    this.room.height = viewport.height;
    scene.parentElement?.append(this.root);
  }

  resize(width: number, density: number): void {
    this.density = (width * density) / viewport.width;
    this.surface.width = Math.round(width * density);
    this.surface.height = Math.round(viewport.height * this.density);
  }

  render(state: GameSnapshot, frame: AnimationFrame): void {
    const active =
      state.scenario === 'loading-wheel' &&
      state.progress !== 8 &&
      state.phase !== 'complete';
    this.root.hidden = !active;
    if (!active) return;
    const { wheel, player } = state;
    const camera = cameraPosition(player.x);
    const hub = wheel.phase === 'waiting' ? 500 : wheel.x - camera;
    this.indicator.style.left = `${hub / 10}%`;
    this.spinner.style.transform = `rotate(${wheel.elapsed * 420}deg)`;
    const ctx = getContext(this.surface);
    ctx.setTransform(this.density, 0, 0, this.density, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#101617';
    ctx.fillRect(0, 0, viewport.width, viewport.height);
    const source = getContext(this.room);
    source.clearRect(0, 0, viewport.width, viewport.height);
    drawRoom(source, this.assets, state, frame, { actor: false });
    // 벽과 바닥의 실제 픽셀을 가늘게 모아 로딩 지점으로 당긴다.
    for (let y = 0; y < viewport.height; y += 5) {
      const pinch =
        Math.exp(-Math.pow((y - 215) / 115, 2)) * wheel.strength * 0.21;
      const h = Math.min(5, viewport.height - y);
      ctx.drawImage(
        this.room,
        0,
        y,
        viewport.width,
        h,
        hub * pinch,
        y,
        viewport.width * (1 - pinch),
        h,
      );
    }
    this.drawFragments(ctx, state, hub);
    const proximity = 1 - smooth(Math.abs(player.x - wheel.x) / 210);
    const lift =
      wheel.phase === 'waiting' ? 0 : proximity * wheel.strength * 95;
    const caught =
      wheel.caughtElapsed === null
        ? 0
        : smooth(wheel.caughtElapsed / loading.disappear);
    const fromX = player.x - camera;
    const fromY = player.y - 30 - lift;
    ctx.save();
    ctx.translate(
      fromX + (hub - fromX) * caught,
      fromY + (215 - fromY) * caught,
    );
    ctx.rotate(-caught * Math.PI * 3);
    const size = Math.pow(1 - caught, 1.4);
    ctx.scale(size, size);
    drawPlayer(
      ctx,
      this.assets,
      {
        ...player,
        x: 0,
        y: 30,
        flashRemaining: caught > 0 ? 0 : player.flashRemaining,
      },
      frame,
      false,
    );
    ctx.restore();
    // 처음부터 있는 얇은 로딩 막은 흡수 중에도 UI처럼 남는다.
    ctx.fillStyle = `rgb(8 12 14 / ${0.42 + wheel.strength * 0.08})`;
    ctx.fillRect(0, 0, viewport.width, viewport.height);
    const elapsed = state.transitionElapsed;
    const fade =
      elapsed === null
        ? 0
        : elapsed < passage.fadeOut
          ? elapsed / passage.fadeOut
          : Math.max(0, 1 - (elapsed - passage.fadeOut) / passage.fadeIn);
    ctx.fillStyle = `rgb(5 10 12 / ${fade})`;
    ctx.fillRect(0, 0, viewport.width, viewport.height);
    this.indicator.style.opacity = String(1 - fade);
  }

  private drawFragments(
    ctx: CanvasRenderingContext2D,
    state: GameSnapshot,
    hub: number,
  ): void {
    const { wheel } = state;
    if (wheel.strength === 0) return;
    ctx.save();
    for (let i = 0; i < 18; i++) {
      const t = ((wheel.elapsed - loading.wait) * 0.6 + i / 18) % 1;
      const angle = i * 2.4 - t * 1.6;
      const distance = (1 - t) * (1 - t) * 290;
      const size = 1 - t;
      ctx.save();
      ctx.globalAlpha = Math.sin(t * Math.PI) * wheel.strength * 0.8;
      ctx.translate(
        hub + Math.cos(angle) * distance,
        215 + Math.sin(angle) * distance * 0.57,
      );
      ctx.rotate(angle + Math.PI / 2);
      ctx.drawImage(
        this.room,
        (i * 53) % 950,
        160 + ((i * 31) % 190),
        28,
        8,
        -14 * size,
        -4 * size,
        28 * size,
        8 * size,
      );
      ctx.restore();
    }
    ctx.restore();
  }

  destroy(): void {
    this.root.remove();
  }
}
