import manifest from '../../resources/manifest.json' with { type: 'json' };
import { AnimationPlayer, type Animation } from './animation-player.js';
import {
  drawFrame,
  drawLandscape,
  sceneHeight,
  sceneWidth,
} from './preview-renderer.js';

const motionNames: Readonly<Record<string, string>> = {
  stand: '대기',
  move: '이동',
  jump: '점프',
  attack1: '공격',
  hit1: '피격',
  die1: '사망',
};

function getElement<T extends HTMLElement>(id: string, type: { new (): T }): T {
  const element = document.getElementById(id);
  if (!(element instanceof type))
    throw new Error(`화면 요소를 찾을 수 없습니다: ${id}`);
  return element;
}

export class ResourcePreview {
  private readonly canvas = getElement('scene', HTMLCanvasElement);
  private readonly status = getElement('status', HTMLParagraphElement);
  private readonly toggle = getElement('toggle', HTMLButtonElement);
  private readonly select = getElement('motion', HTMLSelectElement);
  private readonly output = getElement('frame', HTMLOutputElement);
  private readonly context: CanvasRenderingContext2D;
  private readonly images = new Map<string, HTMLImageElement>();
  private readonly imagePaths: readonly string[];
  private readonly animation: AnimationPlayer;
  private readonly name: string;
  private readonly scale: number;
  private readonly resizeObserver = new ResizeObserver(() =>
    this.resizeCanvas(),
  );
  private readonly events = new AbortController();
  private state: 'idle' | 'loading' | 'running' | 'destroyed' = 'idle';
  private paused = false;
  private previousTime = 0;
  private animationFrameId = 0;

  constructor(id: string, scale: number) {
    const context = this.canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D를 사용할 수 없습니다.');
    this.context = context;

    const asset = manifest.assets.find((entry) => entry.id === id);
    if (!asset) throw new Error(`리소스 목록에 ${id}가 없습니다.`);
    const animations = new Map<string, Animation>();
    for (const [name, animation] of Object.entries(asset.animations)) {
      if (!animation || animation.frames.length === 0) continue;
      animations.set(name, animation);
    }
    this.animation = new AnimationPlayer(animations, 'stand');
    this.name = asset.name;
    this.scale = scale;
    this.imagePaths = [
      ...new Set(
        [...animations.values()].flatMap((animation) =>
          animation.frames.map((frame) => frame.localPath),
        ),
      ),
    ];
    this.select.replaceChildren(
      ...[...animations.keys()].map(
        (name) => new Option(motionNames[name] ?? name, name),
      ),
    );
    this.select.value = 'stand';
  }

  async start(): Promise<void> {
    if (this.state !== 'idle') return;
    this.state = 'loading';
    const { signal } = this.events;
    window.addEventListener('pagehide', this.handlePageHide, { signal });
    this.resizeCanvas();
    try {
      await Promise.all(this.imagePaths.map((path) => this.loadImage(path)));
    } catch (error: unknown) {
      if (signal.aborted) return;
      this.destroy();
      throw error;
    }
    // 로딩 중 화면이 종료되면 이벤트와 실행 루프를 다시 등록하지 않는다.
    if (signal.aborted) return;

    this.state = 'running';
    this.select.disabled = false;
    this.toggle.disabled = false;
    this.status.textContent = `로컬 이미지 ${this.images.size}개 준비 완료 · 모션을 선택해보세요`;
    this.select.addEventListener('change', this.handleMotionChange, { signal });
    this.toggle.addEventListener('click', this.handleToggle, { signal });
    window.addEventListener('resize', this.resizeCanvas, { signal });
    this.resizeObserver.observe(this.canvas);
    this.animationFrameId = requestAnimationFrame(this.animate);
  }

  destroy(): void {
    this.state = 'destroyed';
    cancelAnimationFrame(this.animationFrameId);
    this.resizeObserver.disconnect();
    this.events.abort();
    this.images.clear();
    this.select.disabled = true;
    this.toggle.disabled = true;
  }

  private async loadImage(path: string): Promise<void> {
    const image = new Image();
    image.src = `/${path}`;
    try {
      await image.decode();
    } catch {
      throw new Error(`로컬 이미지가 없습니다: ${path}`);
    }
    if (!this.events.signal.aborted) this.images.set(path, image);
  }

  private readonly handlePageHide = (event: PageTransitionEvent): void => {
    // 뒤로 가기 캐시에 보관되는 화면은 복귀 후 기존 상태로 재생을 이어간다.
    if (!event.persisted) this.destroy();
  };

  private readonly handleMotionChange = (): void => {
    this.animation.play(this.select.value);
    this.draw();
  };

  private readonly handleToggle = (): void => {
    this.paused = !this.paused;
    this.toggle.textContent = this.paused ? '재생' : '일시정지';
  };

  private readonly resizeCanvas = (): void => {
    const bounds = this.canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(bounds.width * ratio);
    this.canvas.height = Math.round(bounds.height * ratio);
    // 월드 좌표를 backing store에 직접 매핑해 CSS 크기와 DPR을 함께 반영한다.
    this.context.setTransform(
      this.canvas.width / sceneWidth,
      0,
      0,
      this.canvas.height / sceneHeight,
      0,
      0,
    );
    this.context.imageSmoothingEnabled = false;
    this.draw();
  };

  private draw(): void {
    drawLandscape(this.context);
    const { frame, index, totalFrames } = this.animation.currentFrame;
    const image = this.images.get(frame.localPath);
    if (!image) return;
    drawFrame(this.context, frame, image, this.name, this.scale);
    const label = `${index + 1} / ${totalFrames} 프레임`;
    if (this.output.value !== label) this.output.value = label;
  }

  private readonly animate = (time: number): void => {
    const delta =
      this.previousTime === 0
        ? 0
        : Math.min((time - this.previousTime) / 1000, 0.1);
    this.previousTime = time;
    if (!this.paused && !document.hidden) {
      this.animation.update(delta);
      this.draw();
    }
    this.animationFrameId = requestAnimationFrame(this.animate);
  };
}

export function startPreview(id: string, scale: number): void {
  const status = getElement('status', HTMLParagraphElement);
  const showError = (error: unknown): void => {
    status.textContent =
      error instanceof Error ? error.message : '리소스를 불러오지 못했습니다.';
    status.setAttribute('role', 'alert');
  };
  try {
    const preview = new ResourcePreview(id, scale);
    void preview.start().catch(showError);
  } catch (error: unknown) {
    showError(error);
  }
}
