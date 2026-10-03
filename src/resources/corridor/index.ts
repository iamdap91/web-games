import manifest from '../../../resources/manifest.json' with { type: 'json' };
import {
  drawCorridor,
  drawViewport,
  gradePixels,
  prepareMapObjects,
  sceneHeight,
  sceneWidth,
} from './corridor-renderer.js';
import { backgrounds, selectBackground } from './background-presets.js';
import { drawIndustrial } from './industrial-renderer.js';

function getElement<T extends HTMLElement>(id: string, type: { new (): T }): T {
  const element = document.getElementById(id);
  if (!(element instanceof type))
    throw new Error(`화면 요소를 찾을 수 없습니다: ${id}`);
  return element;
}

function getContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D를 사용할 수 없습니다.');
  return context;
}

class CorridorPreview {
  private readonly kind = selectBackground(
    new URLSearchParams(location.search).get('map'),
  );
  private readonly preset = backgrounds[this.kind];
  private readonly canvas = getElement('scene', HTMLCanvasElement);
  private readonly context = getContext(this.canvas);
  private readonly original = document.createElement('canvas');
  private readonly originalContext = getContext(this.original);
  private readonly graded = document.createElement('canvas');
  private readonly gradedContext = getContext(this.graded);
  private readonly status = getElement('status', HTMLParagraphElement);
  private readonly originalButton = getElement('original', HTMLButtonElement);
  private readonly gradedButton = getElement('graded', HTMLButtonElement);
  private readonly resetButton = getElement('reset', HTMLButtonElement);
  private readonly modeLabel = getElement('mode-label', HTMLSpanElement);
  private readonly controls = {
    position: getElement('position', HTMLInputElement),
    saturation: getElement('saturation', HTMLInputElement),
    brightness: getElement('brightness', HTMLInputElement),
    chill: getElement('chill', HTMLInputElement),
    vignette: getElement('vignette', HTMLInputElement),
  };
  private readonly events = new AbortController();
  private readonly resizeObserver = new ResizeObserver(() => this.resize());
  private showOriginal = false;
  private ready = false;

  async start(): Promise<void> {
    const { signal } = this.events;
    window.addEventListener('pagehide', this.handlePageHide, { signal });
    const asset = manifest.assets.find((entry) => entry.id === this.preset.id);
    if (!asset?.localPath) throw new Error('복도 리소스 정보가 없습니다.');
    document.title = `${this.preset.label} · 리소스 뷰어`;
    getElement('title', HTMLHeadingElement).textContent = this.preset.title;
    getElement('intro', HTMLParagraphElement).textContent = this.preset.intro;
    getElement('map-label', HTMLSpanElement).textContent = this.preset.label;
    getElement('composition', HTMLParagraphElement).textContent =
      this.preset.note;
    const source = getElement('source', HTMLAnchorElement);
    source.href = asset.sourceUrl;
    source.textContent = `맵 원본 · ${this.preset.label}`;
    for (const key of [
      'saturation',
      'brightness',
      'chill',
      'vignette',
    ] as const) {
      this.controls[key].defaultValue = String(this.preset[key]);
      this.controls[key].value = String(this.preset[key]);
    }
    this.updateOutputs();
    document
      .querySelector(`[data-map="${this.kind}"]`)
      ?.setAttribute('aria-current', 'page');
    const image = new Image();
    image.src = `/${asset.localPath}`;
    try {
      await image.decode();
    } catch {
      throw new Error(`로컬 배경 이미지가 없습니다: ${asset.localPath}`);
    }
    if (signal.aborted) return;
    this.original.width = this.graded.width = this.preset.width;
    this.original.height = this.graded.height = this.preset.height;
    if (this.kind === 'corridor') {
      if (!asset.crop) throw new Error('복도 크롭 정보가 없습니다.');
      drawCorridor(this.originalContext, image, asset.crop);
    } else {
      if (!asset.regions) throw new Error('배경 조각 정보가 없습니다.');
      const components = new Map<string, HTMLImageElement>();
      await Promise.all(
        (asset.components ?? []).map(async (component) => {
          const image = new Image();
          image.src = `/${component.localPath}`;
          try {
            await image.decode();
          } catch {
            throw new Error(
              `로컬 장식 이미지가 없습니다: ${component.localPath}`,
            );
          }
          components.set(component.name, image);
        }),
      );
      if (signal.aborted) return;
      drawIndustrial(
        this.originalContext,
        prepareMapObjects(image),
        components,
        asset.regions,
        this.kind,
      );
    }
    this.ready = true;
    for (const [name, control] of Object.entries(this.controls)) {
      control.disabled = false;
      control.addEventListener(
        'input',
        () => {
          this.updateOutputs();
          if (name !== 'position' && name !== 'vignette') this.updateGrade();
          if (name !== 'position') this.showOriginal = false;
          this.draw();
        },
        { signal },
      );
    }
    this.originalButton.addEventListener(
      'click',
      () => {
        this.showOriginal = true;
        this.draw();
      },
      { signal },
    );
    this.gradedButton.addEventListener(
      'click',
      () => {
        this.showOriginal = false;
        this.draw();
      },
      { signal },
    );
    this.resetButton.addEventListener('click', this.reset, { signal });
    for (const button of [
      this.originalButton,
      this.gradedButton,
      this.resetButton,
    ])
      button.disabled = false;
    window.addEventListener('resize', this.resize, { signal });
    this.resizeObserver.observe(this.canvas);
    this.updateGrade();
    this.resize();
    this.status.textContent =
      '로컬 배경 준비 완료 · 좌우로 둘러보고 보정 전후를 비교해보세요.';
  }

  destroy(): void {
    this.ready = false;
    this.events.abort();
    this.resizeObserver.disconnect();
  }

  private readonly handlePageHide = (event: PageTransitionEvent): void => {
    if (!event.persisted) this.destroy();
  };

  private updateOutputs(): void {
    for (const [name, control] of Object.entries(this.controls)) {
      getElement(`${name}-value`, HTMLOutputElement).value =
        `${control.value}%`;
    }
  }

  private readonly reset = (): void => {
    for (const control of Object.values(this.controls))
      control.value = control.defaultValue;
    this.showOriginal = false;
    this.updateOutputs();
    this.updateGrade();
    this.draw();
  };

  private updateGrade(): void {
    const pixels = this.originalContext.getImageData(
      0,
      0,
      this.original.width,
      this.original.height,
    );
    gradePixels(pixels, {
      saturation: this.controls.saturation.valueAsNumber / 100,
      brightness: this.controls.brightness.valueAsNumber / 100,
      chill: this.controls.chill.valueAsNumber / 100,
      vignette: this.controls.vignette.valueAsNumber / 100,
    });
    this.gradedContext.putImageData(pixels, 0, 0);
  }

  private readonly resize = (): void => {
    const bounds = this.canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(bounds.width * ratio);
    this.canvas.height = Math.round(bounds.height * ratio);
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
    if (!this.ready) return;
    drawViewport(
      this.context,
      this.showOriginal ? this.original : this.graded,
      this.controls.position.valueAsNumber / 100,
      this.showOriginal ? 0 : this.controls.vignette.valueAsNumber / 100,
    );
    this.originalButton.setAttribute('aria-pressed', String(this.showOriginal));
    this.gradedButton.setAttribute('aria-pressed', String(!this.showOriginal));
    this.modeLabel.textContent = this.showOriginal
      ? '보정 전 · 재구성 배경'
      : '음습한 보정';
    this.canvas.setAttribute(
      'aria-label',
      this.showOriginal
        ? `보정 전 ${this.preset.label}`
        : `음습하게 보정한 ${this.preset.label}`,
    );
  }
}

const preview = new CorridorPreview();
void preview.start().catch((error: unknown) => {
  preview.destroy();
  const status = getElement('status', HTMLParagraphElement);
  status.textContent =
    error instanceof Error ? error.message : '배경을 불러오지 못했습니다.';
  status.setAttribute('role', 'alert');
});
