import * as THREE from 'three';
import { resourceUrl } from '../../catalog/resource-url.js';
import { registerEmbeddedScene } from '../../catalog/embedded-scene.js';
import {
  frameRegion,
  frameCount,
  frameSize,
  directionCount,
  motionNames,
  MotionPlayback,
  type MotionName,
} from './motion.js';
import { WoodenModel } from './model.js';
import { sheetMetadata, sheetPath } from './metadata.js';

function element<T extends HTMLElement>(
  id: string,
  constructor: { new (): T },
): T {
  const node = document.getElementById(id);
  if (!(node instanceof constructor)) throw new Error(`요소 없음: ${id}`);
  return node;
}

class PrerenderLab {
  private readonly model = new WoodenModel();
  private readonly playback = new MotionPlayback();
  private readonly events = new AbortController();
  private readonly modelCanvas = element('model', HTMLCanvasElement);
  private readonly spriteCanvas = element('sprite', HTMLCanvasElement);
  private readonly renderer = new THREE.WebGLRenderer({
    canvas: this.modelCanvas,
    alpha: true,
    antialias: true,
  });
  private readonly context: CanvasRenderingContext2D;
  private readonly pause = element('pause', HTMLButtonElement);
  private readonly frameInput = element('frame', HTMLInputElement);
  private readonly frameOutput = element('frame-output', HTMLOutputElement);
  private readonly status = element('status', HTMLParagraphElement);
  private readonly download = element('download', HTMLButtonElement);
  private sheet: HTMLImageElement | HTMLCanvasElement | null = null;
  private direction = 0;
  private request = 0;
  private previousTime = 0;
  private disposed = false;

  constructor() {
    const context = this.spriteCanvas.getContext('2d');
    if (!context) throw new Error('2D Canvas를 사용할 수 없습니다.');
    this.context = context;
    this.renderer.setSize(384, 384, false);
    this.renderer.setClearColor(0, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    const eventOptions = { signal: this.events.signal };
    element('motion', HTMLSelectElement).addEventListener(
      'change',
      (event) => {
        const target = event.currentTarget;
        if (!(target instanceof HTMLSelectElement)) return;
        const motion = target.value;
        if (motionNames.includes(motion as MotionName))
          this.playback.select(motion as MotionName);
      },
      eventOptions,
    );
    element('direction', HTMLSelectElement).addEventListener(
      'change',
      (event) => {
        const target = event.currentTarget;
        if (target instanceof HTMLSelectElement)
          this.direction = Number(target.value);
      },
      eventOptions,
    );
    element('speed', HTMLSelectElement).addEventListener(
      'change',
      (event) => {
        const target = event.currentTarget;
        if (target instanceof HTMLSelectElement)
          this.playback.setSpeed(Number(target.value));
      },
      eventOptions,
    );
    this.pause.addEventListener(
      'click',
      () => this.playback.togglePaused(),
      eventOptions,
    );
    this.frameInput.addEventListener(
      'input',
      () => this.playback.seek(Number(this.frameInput.value)),
      eventOptions,
    );
    this.download.addEventListener(
      'click',
      () => void this.downloadSheet(),
      eventOptions,
    );
    element('metadata', HTMLButtonElement).addEventListener(
      'click',
      () => {
        this.downloadBlob(
          new Blob([JSON.stringify(sheetMetadata, null, 2)], {
            type: 'application/json',
          }),
          'wooden-scout.json',
        );
      },
      eventOptions,
    );
    window.addEventListener('pagehide', () => this.dispose(), {
      once: true,
      signal: this.events.signal,
    });
    registerEmbeddedScene(() => this.dispose());
    void this.loadSheet();
    this.request = requestAnimationFrame(this.animate);
  }

  private async loadSheet(): Promise<void> {
    if (new URLSearchParams(location.search).get('bake') === '1') {
      this.sheet = this.bake();
      this.status.textContent = '원본 모델에서 144장을 새로 구웠어요.';
      this.download.disabled = false;
      this.spriteCanvas.dataset.sheetReady = 'true';
      return;
    }
    const image = new Image();
    image.src = resourceUrl(sheetPath).href;
    try {
      await image.decode();
      if (
        image.width !== sheetMetadata.sheetWidth ||
        image.height !== sheetMetadata.sheetHeight
      )
        throw new Error('프레임 규격 불일치');
      if (this.disposed) return;
      this.sheet = image;
      this.status.textContent = '저장한 PNG · 4방향 × 3동작 × 12장 = 144장';
    } catch {
      if (this.disposed) return;
      this.sheet = this.bake();
      this.status.textContent =
        '저장 그림이 없어 이번 실행에서 구웠어요 · PNG로 저장할 수 있어요.';
    }
    this.download.disabled = false;
    this.spriteCanvas.dataset.sheetReady = 'true';
  }

  /** 베이크가 끝난 뒤 2D 재생은 이 시트만 읽는다. */
  private bake(): HTMLCanvasElement {
    const atlas = document.createElement('canvas');
    atlas.width = sheetMetadata.sheetWidth;
    atlas.height = sheetMetadata.sheetHeight;
    const context = atlas.getContext('2d');
    if (!context) throw new Error('시트 Canvas를 사용할 수 없습니다.');
    this.renderer.setSize(frameSize, frameSize, false);
    for (const motion of motionNames) {
      for (let direction = 0; direction < directionCount; direction++) {
        for (let frame = 0; frame < frameCount; frame++) {
          this.model.pose(motion, frame / frameCount, direction);
          this.renderer.render(this.model.scene, this.model.camera);
          const region = frameRegion(motion, direction, frame);
          context.drawImage(this.modelCanvas, region.x, region.y);
        }
      }
    }
    this.renderer.setSize(384, 384, false);
    return atlas;
  }

  private readonly animate = (time: number): void => {
    if (this.disposed) return;
    if (this.previousTime)
      this.playback.advance(Math.min((time - this.previousTime) / 1000, 0.1));
    this.previousTime = time;
    const state = this.playback.state;
    this.model.pose(state.motion, state.phase, this.direction);
    this.renderer.render(this.model.scene, this.model.camera);
    this.context.clearRect(0, 0, 384, 384);
    this.context.imageSmoothingEnabled = false;
    if (this.sheet) {
      const region = frameRegion(state.motion, this.direction, state.frame);
      this.context.drawImage(
        this.sheet,
        region.x,
        region.y,
        frameSize,
        frameSize,
        0,
        0,
        384,
        384,
      );
    }
    this.pause.textContent = state.paused ? '재생' : '일시정지';
    this.frameInput.value = String(state.frame);
    this.frameOutput.value = `${String(state.frame + 1).padStart(2, '0')} / ${frameCount}`;
    this.spriteCanvas.dataset.frame = String(state.frame);
    this.spriteCanvas.dataset.motion = state.motion;
    this.spriteCanvas.dataset.direction = String(this.direction);
    this.request = requestAnimationFrame(this.animate);
  };

  private async downloadSheet(): Promise<void> {
    if (!this.sheet) return;
    if (this.sheet instanceof HTMLImageElement) {
      this.downloadBlob(
        await (await fetch(resourceUrl(sheetPath))).blob(),
        'wooden-scout.png',
      );
      return;
    }
    this.sheet.toBlob((blob) => {
      if (blob) this.downloadBlob(blob, 'wooden-scout.png');
    }, 'image/png');
  }

  private downloadBlob(blob: Blob, name: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  exportSheet(): string {
    const sheet = this.sheet;
    if (!sheet) throw new Error('그림을 준비 중입니다.');
    if (sheet instanceof HTMLCanvasElement) return sheet.toDataURL('image/png');
    const canvas = document.createElement('canvas');
    canvas.width = sheet.width;
    canvas.height = sheet.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('시트 Canvas를 사용할 수 없습니다.');
    context.drawImage(sheet, 0, 0);
    return canvas.toDataURL('image/png');
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.request);
    this.events.abort();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.model.dispose();
    this.sheet = null;
  }
}

const lab = new PrerenderLab();
Object.defineProperty(window, 'exportPrerenderSheet', {
  value: () => lab.exportSheet(),
});
