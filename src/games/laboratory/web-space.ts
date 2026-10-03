import type { AnimationFrame } from '../../resources/preview/animation-player.js';
import { getContext, type GameAssets } from './assets.js';
import { passage, world, type GameSnapshot } from './game.js';
import { pipes, pipeShape } from './pipe-cascade.js';
import { drawPlayer } from './player-renderer.js';
import {
  cameraPosition,
  frameEdge,
  panelAngle,
  panelWidth,
  stagePanels,
} from './spatial-rules.js';

// 입력과 물리는 원래 게임에 두고, 페이지 경계와 3D 평면의 표시만 소유한다.
export class WebSpace {
  private readonly root = document.createElement('div');
  private readonly escapeLayer = document.createElement('canvas');
  private readonly rim = document.createElement('div');
  private readonly perspective = document.createElement('div');
  private readonly stage = document.createElement('div');
  private readonly actor = document.createElement('canvas');
  private readonly panels: HTMLDivElement[] = [];
  private density = 1;

  constructor(
    private readonly scene: HTMLCanvasElement,
    private readonly assets: GameAssets,
  ) {
    this.root.className = 'web-space';
    this.root.setAttribute('aria-hidden', 'true');
    this.root.hidden = true;
    this.escapeLayer.className = 'escape-layer';
    this.rim.className = 'frame-rim';
    this.perspective.className = 'stage-perspective';
    this.stage.className = 'fold-stage';
    this.actor.className = 'stage-actor';
    for (const x of stagePanels) {
      const panel = document.createElement('div');
      panel.className = 'wall-panel';
      const front = this.makeFront(x);
      front.className = 'wall-front';
      const back = this.makeBack();
      back.className = 'wall-back';
      const edge = document.createElement('div');
      edge.className = 'wall-edge';
      panel.append(front, back, edge);
      this.panels.push(panel);
      this.stage.append(panel);
    }
    this.stage.append(this.actor);
    this.perspective.append(this.stage);
    this.root.append(this.perspective, this.escapeLayer, this.rim);
    this.scene.parentElement?.append(this.root);
  }

  resize(width: number, density: number): void {
    this.root.style.transform = `scale(${width / 1000})`;
    // DOM 안의 Canvas도 기본 장면과 같은 실제 픽셀 밀도로 그린다.
    this.density = (density * width) / 1000;
    for (const [canvas, w, h] of [
      [this.escapeLayer, 1000, 430],
      [this.actor, 280, 180],
    ] as const) {
      canvas.width = Math.round(w * this.density);
      canvas.height = Math.round(h * this.density);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    }
  }

  render(state: GameSnapshot, frame: AnimationFrame): void {
    const escape =
      state.scenario === 'frame-escape' &&
      state.anomaly.activeElapsed !== null &&
      state.phase === 'playing';
    const folding =
      state.scenario === 'folding-stage' && state.phase !== 'complete';
    this.root.hidden = !escape && !folding;
    const elapsed = state.transitionElapsed;
    this.root.style.opacity =
      elapsed === null
        ? '1'
        : String(
            elapsed < passage.fadeOut
              ? 1 - elapsed / passage.fadeOut
              : Math.min(1, (elapsed - passage.fadeOut) / passage.fadeIn),
          );
    this.scene.closest('.stage')?.classList.toggle('frame-broken', escape);
    this.scene.style.clipPath = escape
      ? `inset(0 ${100 - frameEdge(state) / 10}% 0 0)`
      : '';
    this.escapeLayer.hidden = this.rim.hidden = !escape;
    this.perspective.hidden = !folding;
    if (escape) this.drawEscape(state, frame);
    if (folding) this.drawStage(state, frame);
  }

  destroy(): void {
    this.root.remove();
    this.scene.style.clipPath = '';
    this.scene.closest('.stage')?.classList.remove('frame-broken');
  }

  private context(
    canvas: HTMLCanvasElement,
    width: number,
    height: number,
  ): CanvasRenderingContext2D {
    const ctx = getContext(canvas);
    ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = false;
    return ctx;
  }

  private drawEscape(state: GameSnapshot, frame: AnimationFrame): void {
    const edge = frameEdge(state);
    const camera = cameraPosition(state.player.x);
    this.rim.style.width = `${edge}px`;
    const pulse = Math.max(0, 1 - (state.anomaly.activeElapsed ?? 0) / 0.9);
    this.rim.style.boxShadow = `${-pulse * 5}px 0 ${pulse * 24}px #b9dac777, 12px 12px 26px #0006`;
    const ctx = this.context(this.escapeLayer, 1000, 430);
    // 같은 좌표계로 경계 양쪽을 나누므로 통과 중 크기와 속도가 바뀌지 않는다.
    ctx.save();
    ctx.beginPath();
    ctx.rect(edge, 0, 1000 - edge, 430);
    ctx.clip();
    const floor = ctx.createLinearGradient(edge, 0, 1000, 0);
    floor.addColorStop(0, '#849184');
    floor.addColorStop(1, '#84918415');
    ctx.fillStyle = floor;
    ctx.fillRect(edge, world.ground, 1000 - edge, 2);
    ctx.fillStyle = '#00000030';
    ctx.fillRect(edge, world.ground + 2, 1000 - edge, 6);
    ctx.translate(-camera, 0);
    drawPlayer(ctx, this.assets, state.player, frame);
    ctx.restore();
    if (pulse > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, edge, 430);
      ctx.clip();
      ctx.globalAlpha = pulse * 0.25;
      drawPlayer(
        ctx,
        this.assets,
        {
          ...state.player,
          x: Math.min(edge - 35, 730),
          y: world.ground,
          flashRemaining: 0,
        },
        frame,
        false,
      );
      ctx.restore();
    }
  }

  private drawStage(state: GameSnapshot, frame: AnimationFrame): void {
    const camera = cameraPosition(state.player.x);
    this.panels.forEach((panel, index) => {
      panel.style.left = `${stagePanels[index]! - camera}px`;
      const angle = panelAngle(state.player.x, index);
      panel.style.transform = `rotateY(${angle}deg)`;
      panel.style.setProperty(
        '--panel-shade',
        String(Math.min(0.72, Math.abs(angle) / 180)),
      );
    });
    this.actor.style.left = `${state.player.x - camera - 140}px`;
    const ctx = this.context(this.actor, 280, 180);
    ctx.save();
    ctx.translate(140 - state.player.x, 160 - world.ground);
    drawPlayer(ctx, this.assets, state.player, frame);
    ctx.restore();
  }

  private makeFront(x: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = panelWidth;
    canvas.height = world.ground;
    const ctx = getContext(canvas);
    ctx.drawImage(
      this.assets.normal,
      x,
      0,
      panelWidth,
      world.ground,
      0,
      0,
      panelWidth,
      world.ground,
    );
    for (const pipe of pipes)
      ctx.drawImage(
        this.assets.pipe,
        pipe.x - x - pipe.width / 2,
        pipeShape.top,
        pipe.width,
        pipeShape.height,
      );
    return canvas;
  }

  private makeBack(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = panelWidth;
    canvas.height = world.ground;
    const ctx = getContext(canvas);
    ctx.fillStyle = '#24312f';
    ctx.fillRect(0, 0, panelWidth, world.ground);
    // 뒷면에는 보강재와 배선을 그려 앞면 그림의 단순 반전과 구분한다.
    ctx.globalAlpha = 0.16;
    ctx.drawImage(
      this.assets.normal,
      0,
      340,
      800,
      90,
      0,
      0,
      panelWidth,
      world.ground,
    );
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#536052';
    ctx.lineWidth = 12;
    ctx.strokeRect(9, 9, panelWidth - 18, world.ground - 18);
    ctx.beginPath();
    ctx.moveTo(14, 14);
    ctx.lineTo(panelWidth - 14, world.ground - 14);
    ctx.moveTo(panelWidth - 14, 14);
    ctx.lineTo(14, world.ground - 14);
    ctx.stroke();
    ctx.strokeStyle = '#0b1316';
    ctx.lineWidth = 4;
    for (const x of [85, 260, 415]) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x - 40, 110, x + 110, 180, x + 15, 340);
      ctx.stroke();
    }
    ctx.fillStyle = '#929b7f';
    for (const x of [12, panelWidth - 16])
      for (const y of [14, 165, 320]) ctx.fillRect(x, y, 4, 4);
    ctx.fillStyle = '#a2ac8655';
    ctx.font = '14px monospace';
    ctx.fillText('C-2 / BACK', 30, 50);
    return canvas;
  }
}
