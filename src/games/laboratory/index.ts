import { AnimationPlayer } from '../../resources/preview/animation-player.js';
import { getContext, loadAssets, type GameAssets } from './assets.js';
import {
  LaboratoryGame,
  isSelection,
  type Direction,
  type Motion,
  type ScenarioSelection,
} from './game.js';
import { drawGame, viewport } from './renderer.js';

function element<T extends HTMLElement>(id: string, type: { new (): T }): T {
  const node = document.getElementById(id);
  if (!(node instanceof type)) throw new Error(`화면 요소가 없습니다: ${id}`);
  return node;
}

function setText(node: HTMLElement, value: string): void {
  if (node.textContent !== value) node.textContent = value;
}

class GameScreen {
  private readonly game = new LaboratoryGame();
  private readonly canvas = element('scene', HTMLCanvasElement);
  private readonly context = getContext(this.canvas);
  private readonly status = element('status', HTMLParagraphElement);
  private readonly progress = element('progress', HTMLElement);
  private readonly roundLabel = element('round-label', HTMLSpanElement);
  private readonly result = element('result', HTMLDivElement);
  private readonly resultTitle = element('result-title', HTMLHeadingElement);
  private readonly continueButton = element('continue', HTMLButtonElement);
  private readonly restartButton = element('restart', HTMLButtonElement);
  private readonly replayButton = element('replay', HTMLButtonElement);
  private readonly selection = element('scenario', HTMLSelectElement);
  private readonly diagnostics = element('diagnostics', HTMLParagraphElement);
  private readonly developer =
    new URLSearchParams(location.search).get('dev') === '1';
  private readonly events = new AbortController();
  private readonly observer = new ResizeObserver(() => this.resize());
  private readonly keys = new Set<string>();
  private readonly pointers = new Map<number, Direction>();
  private assets: GameAssets | null = null;
  private animation: AnimationPlayer | null = null;
  private motion: Motion = 'stand';
  private requestId = 0;
  private previousTime = 0;
  private accumulator = 0;
  private paused = false;
  private lastPhase = '';

  async start(): Promise<void> {
    const { signal } = this.events;
    window.addEventListener(
      'pagehide',
      (event) => {
        this.clearInput();
        if (!event.persisted) this.destroy();
      },
      { signal },
    );
    this.assets = await loadAssets();
    if (signal.aborted) return;
    this.animation = new AnimationPlayer(this.assets.animations, 'stand');
    element('developer', HTMLElement).hidden = !this.developer;
    this.selection.disabled = this.replayButton.disabled = !this.developer;
    this.restartButton.disabled = false;
    this.selection.addEventListener('change', () => this.restart(), { signal });
    this.replayButton.addEventListener('click', () => this.restart(), {
      signal,
    });
    this.restartButton.addEventListener('click', () => this.restart(), {
      signal,
    });
    this.continueButton.addEventListener(
      'click',
      () => {
        this.clearInput();
        this.game.continue();
        this.canvas.focus({ preventScroll: true });
      },
      { signal },
    );
    window.addEventListener('keydown', this.keyDown, { signal });
    window.addEventListener('keyup', (event) => this.keys.delete(event.code), {
      signal,
    });
    window.addEventListener(
      'blur',
      () => {
        this.paused = true;
        this.clearInput();
      },
      { signal },
    );
    window.addEventListener(
      'focus',
      () => {
        this.paused = false;
        this.previousTime = 0;
      },
      { signal },
    );
    document.addEventListener(
      'visibilitychange',
      () => {
        this.paused = document.hidden;
        this.clearInput();
      },
      { signal },
    );
    this.canvas.addEventListener('blur', () => this.clearInput(), { signal });
    this.canvas.addEventListener('pointerdown', () => this.canvas.focus(), {
      signal,
    });
    this.bindPointer('left', -1);
    this.bindPointer('right', 1);
    this.bindPointer('jump', 0);
    window.addEventListener('resize', () => this.resize(), { signal });
    this.observer.observe(this.canvas);
    this.resize();
    this.updateInterface();
    this.requestId = requestAnimationFrame(this.tick);
  }

  destroy(): void {
    this.events.abort();
    this.observer.disconnect();
    cancelAnimationFrame(this.requestId);
    this.clearInput();
  }

  private restart(): void {
    const value = this.selection.value;
    const selection: ScenarioSelection =
      this.developer && isSelection(value) ? value : 'random';
    this.clearInput();
    this.game.reset(selection);
    this.motion = 'stand';
    this.animation?.play('stand');
    this.canvas.focus({ preventScroll: true });
  }

  private readonly keyDown = (event: KeyboardEvent): void => {
    // 선택 상자·버튼의 방향키와 Space는 브라우저 기본 조작에 맡긴다.
    if (document.activeElement !== this.canvas) return;
    if (!['ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) return;
    event.preventDefault();
    if (event.repeat) return;
    this.keys.add(event.code);
    this.game.face(this.direction);
    if (event.code === 'Space') this.game.jump(this.direction);
  };

  private bindPointer(id: string, direction: Direction): void {
    const button = element(id, HTMLButtonElement);
    const { signal } = this.events;
    button.disabled = false;
    button.addEventListener(
      'pointerdown',
      (event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        this.canvas.focus({ preventScroll: true });
        button.setPointerCapture(event.pointerId);
        if (id === 'jump') this.game.jump(this.direction);
        else {
          this.pointers.set(event.pointerId, direction);
          this.game.face(direction);
        }
      },
      { signal },
    );
    const release = (event: PointerEvent): void => {
      this.pointers.delete(event.pointerId);
    };
    button.addEventListener('pointerup', release, { signal });
    button.addEventListener('pointercancel', release, { signal });
    button.addEventListener('lostpointercapture', release, { signal });
  }

  private get direction(): Direction {
    const values = [...this.pointers.values()];
    const left = this.keys.has('ArrowLeft') || values.includes(-1);
    const right = this.keys.has('ArrowRight') || values.includes(1);
    return left === right ? 0 : left ? -1 : 1;
  }

  private clearInput(): void {
    this.keys.clear();
    this.pointers.clear();
    this.accumulator = 0;
    this.previousTime = 0;
  }

  private resize(): void {
    const bounds = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.round(bounds.width * devicePixelRatio);
    this.canvas.height = Math.round(bounds.height * devicePixelRatio);
    this.context.setTransform(
      this.canvas.width / viewport.width,
      0,
      0,
      this.canvas.height / viewport.height,
      0,
      0,
    );
    this.context.imageSmoothingEnabled = false;
  }

  private readonly tick = (now: number): void => {
    if (this.events.signal.aborted) return;
    const elapsed = this.previousTime
      ? Math.min((now - this.previousTime) / 1000, 0.1)
      : 0;
    this.previousTime = now;
    if (!this.paused && !document.hidden) {
      this.accumulator += elapsed;
      // 프레임이 느려져도 긴 거리를 건너뛰지 않도록 고정 간격으로 계산한다.
      while (this.accumulator >= 1 / 120) {
        this.game.update(1 / 120, this.direction);
        this.accumulator -= 1 / 120;
      }
      const state = this.game.snapshot;
      if (state.player.motion !== this.motion) {
        this.motion = state.player.motion;
        this.animation?.play(this.motion);
      }
      if (state.phase === 'playing' || state.phase === 'reference')
        this.animation?.update(elapsed);
    }
    if (this.assets && this.animation)
      drawGame(
        this.context,
        this.assets,
        this.game.snapshot,
        this.animation.currentFrame.frame,
      );
    this.updateInterface();
    this.requestId = requestAnimationFrame(this.tick);
  };

  private updateInterface(): void {
    const state = this.game.snapshot;
    setText(this.progress, `${state.progress} / 8`);
    setText(
      this.roundLabel,
      state.phase === 'reference'
        ? '기준 통로 · 이상 없음'
        : state.phase === 'complete'
          ? '탈출 성공'
          : `C-2 / ${String(state.progress + 1).padStart(2, '0')}`,
    );
    setText(
      this.status,
      state.message ||
        (state.phase === 'reference'
          ? '이곳은 정상 통로입니다. 화면을 눌러 이동하고, 오른쪽 끝까지 모습을 익혀보세요.'
          : '화면을 눌러 탐험하세요. 이상이 있으면 왼쪽 끝, 없으면 오른쪽 끝으로 이동하세요.'),
    );
    const result = state.phase === 'result' || state.phase === 'complete';
    this.result.hidden = !result;
    setText(this.resultTitle, state.message);
    setText(
      this.continueButton,
      state.phase === 'complete' ? '다시 탐험하기' : '다음 통로로',
    );
    setText(
      element('result-label', HTMLParagraphElement),
      state.phase === 'complete' ? 'OUTSIDE / 탈출 성공' : 'C-2 / 판단 결과',
    );
    if (result && state.phase !== this.lastPhase) {
      this.clearInput();
      this.continueButton.focus({ preventScroll: true });
    }
    this.lastPhase = state.phase;
    if (this.developer) {
      const names = {
        normal: '정상',
        'giant-door': '거대해진 철문',
        'falling-pipe': '급강하하는 배관',
      };
      setText(
        this.diagnostics,
        `현재: ${names[state.scenario]} · 위치: ${Math.round(state.player.x)}, ${Math.round(state.player.y)} · 플래시점프: ${state.player.flashAvailable ? '가능' : '사용함'} · 배관: ${state.pipeElapsed === null ? '대기' : '발동'}`,
      );
    }
  }
}

const screen = new GameScreen();
void screen.start().catch((error: unknown) => {
  screen.destroy();
  const status = element('status', HTMLParagraphElement);
  status.textContent =
    error instanceof Error ? error.message : '게임을 시작하지 못했습니다.';
  status.setAttribute('role', 'alert');
});
