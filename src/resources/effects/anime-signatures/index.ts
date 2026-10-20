import { registerEmbeddedScene } from '../../catalog/embedded-scene.js';
import {
  connectStudioScene,
  redirectToStudio,
  studioMode,
} from '../../cutscenes/studio/bridge.js';
import type { StudioConnection } from '../../cutscenes/studio/contracts.js';
import { loadSignatureAssets } from './assets.js';
import {
  signatureHeight,
  signatureScenes,
  signatureWidth,
  type SignatureAssets,
  type SignatureFacing,
  type SignatureResult,
  type SignatureScene,
} from './contracts.js';
import { drawSignature } from './drawing.js';
import { exportSignatureGif } from './gif-export.js';
import { advancedIds } from './advanced-contracts.js';
import { actingIds } from './acting-contracts.js';
import { dramaticIds } from './dramatic-contracts.js';

function element<T extends HTMLElement>(id: string, type: { new (): T }): T {
  const value = document.getElementById(id);
  if (!(value instanceof type)) throw new Error(`화면 요소가 없습니다: ${id}`);
  return value;
}

function selectedScene(): SignatureScene {
  return (
    signatureScenes.find((scene) => `#${scene.id}` === location.hash) ??
    signatureScenes[0]!
  );
}

/** 재생 시간과 진행 규칙은 화면 크기와 그리기에서 독립적으로 유지한다. */
class SignaturePlayer {
  private elapsedMs = 0;
  private playing = false;
  private speed = 1;
  private repeating = true;

  constructor(private durationMs: number) {}

  get snapshot(): { readonly timeMs: number; readonly playing: boolean } {
    return { timeMs: this.elapsedMs, playing: this.playing };
  }

  select(durationMs: number): void {
    this.durationMs = durationMs;
    this.elapsedMs = 0;
    this.playing = false;
  }

  play(): void {
    if (this.elapsedMs >= this.durationMs) this.elapsedMs = 0;
    this.playing = true;
  }

  pause(): void {
    this.playing = false;
  }

  restart(): void {
    this.elapsedMs = 0;
    this.playing = true;
  }

  seek(timeMs: number): void {
    if (!Number.isFinite(timeMs)) return;
    this.elapsedMs = Math.max(0, Math.min(timeMs, this.durationMs));
    this.playing = false;
  }

  setSpeed(speed: number): void {
    if (Number.isFinite(speed) && speed > 0) this.speed = speed;
  }

  setRepeating(repeating: boolean): void {
    this.repeating = repeating;
  }

  advance(deltaMs: number): void {
    if (!this.playing) return;
    const nextMs = this.elapsedMs + Math.max(0, deltaMs) * this.speed;
    if (nextMs < this.durationMs) {
      this.elapsedMs = nextMs;
    } else if (this.repeating) {
      this.elapsedMs = nextMs % this.durationMs;
    } else {
      this.elapsedMs = this.durationMs;
      this.playing = false;
    }
  }
}

/** 입력·화면·루프의 수명을 모으고 그리기에 필요한 상태만 전달한다. */
class SignatureScreen {
  private readonly events = new AbortController();
  private readonly original = element('original', HTMLCanvasElement);
  private readonly enhanced = element('enhanced', HTMLCanvasElement);
  private readonly originalCtx = this.original.getContext('2d');
  private readonly enhancedCtx = this.enhanced.getContext('2d');
  private readonly selection = element('scene', HTMLSelectElement);
  private readonly facing = element('facing', HTMLSelectElement);
  private readonly reducedMotion = element('reduced-motion', HTMLInputElement);
  private readonly play = element('play', HTMLButtonElement);
  private readonly restart = element('restart', HTMLButtonElement);
  private readonly keyPose = element('key-pose', HTMLButtonElement);
  private readonly loop = element('loop', HTMLInputElement);
  private readonly speed = element('speed', HTMLSelectElement);
  private readonly seek = element('seek', HTMLInputElement);
  private readonly time = element('time', HTMLOutputElement);
  private readonly phase = element('phase', HTMLOutputElement);
  private readonly detail = element('detail', HTMLParagraphElement);
  private readonly status = element('playback-status', HTMLParagraphElement);
  private readonly loading = element('loading', HTMLDivElement);
  private readonly exportButton = element('export', HTMLButtonElement);
  private readonly cancelExport = element('cancel-export', HTMLButtonElement);
  private readonly exportStatus = element('export-status', HTMLSpanElement);
  private readonly observer = new ResizeObserver(() => this.resize());
  private readonly objectUrls = new Map<string, number>();
  private scene = selectedScene();
  private readonly player = new SignaturePlayer(this.scene.durationMs);
  private assets: SignatureAssets | null = null;
  private exportAbort: AbortController | null = null;
  private frameId = 0;
  private lastFrameMs = 0;
  private pixelRatio = 1;
  private disposed = false;
  private comparing = true;
  private studio?: StudioConnection;

  constructor() {
    const dramatic = document.createElement('optgroup');
    dramatic.label = '극적 애니 연출 · 6종';
    const acting = document.createElement('optgroup');
    acting.label = '인물과 재질 · 5종';
    const studies = document.createElement('optgroup');
    studies.label = '심화 연출 · 5종';
    const signatures = document.createElement('optgroup');
    signatures.label = '애니 포즈와 기법 · 9종';
    for (const scene of signatureScenes) {
      const option = document.createElement('option');
      option.value = scene.id;
      option.textContent = scene.title;
      (dramaticIds.some((id) => id === scene.id)
        ? dramatic
        : actingIds.some((id) => id === scene.id)
          ? acting
          : advancedIds.some((id) => id === scene.id)
            ? studies
            : signatures
      ).append(option);
    }
    this.selection.append(dramatic, acting, studies, signatures);
    this.reducedMotion.checked = matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const signal = this.events.signal;
    this.selection.addEventListener(
      'change',
      () => {
        const scene = signatureScenes.find(
          (candidate) => candidate.id === this.selection.value,
        );
        if (scene) this.select(scene);
      },
      { signal },
    );
    window.addEventListener('hashchange', () => this.select(selectedScene()), {
      signal,
    });
    this.facing.addEventListener(
      'change',
      () => {
        this.exportAbort?.abort();
        this.render();
      },
      { signal },
    );
    this.reducedMotion.addEventListener(
      'change',
      () => {
        this.exportAbort?.abort();
        if (this.reducedMotion.checked) this.player.pause();
        this.render();
      },
      { signal },
    );
    this.play.addEventListener('click', () => this.toggle(), { signal });
    this.restart.addEventListener(
      'click',
      () => {
        this.player.restart();
        this.lastFrameMs = 0;
        this.render();
      },
      { signal },
    );
    this.keyPose.addEventListener(
      'click',
      () => this.scrub(this.scene.previewMs),
      { signal },
    );
    this.seek.addEventListener(
      'input',
      () => this.scrub(Number(this.seek.value)),
      { signal },
    );
    this.speed.addEventListener(
      'change',
      () => this.player.setSpeed(Number(this.speed.value)),
      { signal },
    );
    this.loop.addEventListener(
      'change',
      () => this.player.setRepeating(this.loop.checked),
      { signal },
    );
    this.exportButton.addEventListener('click', () => void this.exportGif(), {
      signal,
    });
    this.cancelExport.addEventListener(
      'click',
      () => this.exportAbort?.abort(),
      {
        signal,
      },
    );
    window.addEventListener('keydown', this.onKeyDown, { signal });
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) this.pause();
      },
      { signal },
    );
    window.addEventListener(
      'blur',
      () => {
        if (!studioMode) this.pause();
      },
      { signal },
    );
    window.addEventListener('pagehide', () => this.dispose(), {
      signal,
      once: true,
    });
    this.observer.observe(this.original);
    this.observer.observe(this.enhanced);
    this.resize();
    this.select(this.scene);
    this.studio = connectStudioScene('signatures', {
      snapshot: () => ({
        itemId: this.scene.id,
        title: this.scene.title,
        description: `${this.scene.description}\n${this.scene.application}`,
        timeMs: this.player.snapshot.timeMs,
        durationMs: this.scene.durationMs,
        playing: this.player.snapshot.playing,
        loading: this.assets === null,
        beats: [{ timeMs: this.scene.previewMs, label: '핵심 자세' }],
        loop: this.loop.checked,
        compare: this.comparing,
        facing: this.direction,
        facingOptions: [...this.facing.options]
          .filter((option) => !option.disabled)
          .map((option) => ({
            value: option.value,
            label: option.textContent ?? option.value,
          })),
        reducedMotion: this.reducedMotion.checked,
        exporting: this.exportAbort !== null,
        exportStatus: this.exportStatus.textContent ?? '',
      }),
      select: (id) => {
        const scene = signatureScenes.find((entry) => entry.id === id);
        if (scene) this.select(scene);
      },
      toggle: () => this.toggle(),
      restart: () => {
        if (!this.assets) return;
        this.player.restart();
        this.lastFrameMs = 0;
        this.render();
      },
      seek: (timeMs) => this.scrub(timeMs),
      speed: (rate) => {
        this.speed.value = String(rate);
        this.player.setSpeed(rate);
      },
      loop: (enabled) => {
        this.loop.checked = enabled;
        this.player.setRepeating(enabled);
      },
      compare: (enabled) => this.setComparing(enabled),
      facing: (value) => {
        const option = [...this.facing.options].find(
          (entry) => entry.value === value && !entry.disabled,
        );
        if (!option || this.facing.disabled) return;
        this.facing.value = option.value;
        this.exportAbort?.abort();
        this.render();
      },
      reduced: (enabled) => {
        this.reducedMotion.checked = enabled;
        this.exportAbort?.abort();
        if (enabled) this.player.pause();
        this.render();
      },
      gif: () => void this.exportGif(),
      cancelExport: () => this.exportAbort?.abort(),
    });
    this.setComparing(this.comparing);
    void this.load();
  }

  private setComparing(enabled: boolean): void {
    this.comparing = enabled;
    const figure = this.original.closest('figure');
    if (figure instanceof HTMLElement) figure.hidden = !enabled;
    const comparison = this.original.closest('.comparison');
    comparison?.classList.toggle('comparing', enabled);
    this.resize();
  }

  private get direction(): SignatureFacing {
    return this.facing.value === 'north-west' ? 'north-west' : 'south-east';
  }

  private async load(): Promise<void> {
    try {
      if (!this.originalCtx || !this.enhancedCtx) {
        throw new Error('브라우저에서 장면을 그릴 수 없습니다.');
      }
      const assets = await loadSignatureAssets();
      if (this.disposed) {
        assets.acting.heat.dispose();
        assets.shatter.dispose();
        return;
      }
      this.assets = assets;
      for (const control of this.controls()) control.disabled = false;
      for (const option of this.selection.options) {
        const scene = signatureScenes.find(
          (entry) => entry.id === option.value,
        );
        if (!scene) continue;
        option.disabled = assets.unavailable.has(scene.id);
        option.textContent = `${scene.title}${option.disabled ? ' · 자세 준비 중' : ''}`;
      }
      const unavailableCount = assets.unavailable.size;
      element('availability', HTMLParagraphElement).textContent =
        unavailableCount > 0
          ? `${signatureScenes.length - unavailableCount}개 장면을 볼 수 있습니다. 나머지 ${unavailableCount}개 기법은 캐릭터의 새 자세를 준비 중입니다.`
          : '';
      this.loading.hidden = true;
      this.select(this.scene);
      this.frameId = requestAnimationFrame(this.tick);
    } catch (error) {
      if (this.disposed) return;
      this.loading.textContent =
        error instanceof Error ? error.message : '그림을 불러오지 못했습니다.';
      this.status.textContent = '그림을 확인한 뒤 화면을 새로 열어주세요.';
    }
  }

  private controls(): readonly (
    HTMLSelectElement | HTMLButtonElement | HTMLInputElement
  )[] {
    return [
      this.selection,
      this.facing,
      this.reducedMotion,
      this.play,
      this.restart,
      this.keyPose,
      this.loop,
      this.speed,
      this.seek,
      this.exportButton,
    ];
  }

  private select(requested: SignatureScene): void {
    const scene = this.assets?.unavailable.has(requested.id)
      ? signatureScenes.find((entry) => !this.assets?.unavailable.has(entry.id))
      : requested;
    if (!scene) return;
    this.exportAbort?.abort();
    this.scene = scene;
    this.selection.value = scene.id;
    this.player.select(scene.durationMs);
    this.seek.max = String(scene.durationMs);
    const fixedFacing = [
      'minagawa',
      'dezaki',
      'itano',
      'metamorphosis',
      'rolling-smoke',
      'cube-debris',
      'water-landing',
      'heat-haze',
      ...dramaticIds,
    ].includes(scene.id);
    this.facing.disabled = !this.assets || fixedFacing;
    if (fixedFacing) this.facing.value = 'south-east';
    for (const option of this.facing.options) {
      option.disabled = fixedFacing && option.value === 'north-west';
      if (option.value === 'south-east') {
        option.textContent = fixedFacing ? '원화 방향' : '오른쪽 앞 · SE';
      }
    }
    this.lastFrameMs = 0;
    element('scene-title', HTMLHeadingElement).textContent = scene.title;
    element('enhanced-label', HTMLSpanElement).textContent = scene.title;
    element('description', HTMLParagraphElement).textContent =
      scene.description;
    element('application', HTMLElement).textContent = scene.application;
    element('reference', HTMLAnchorElement).href = scene.referenceUrl;
    if (location.hash !== `#${scene.id}`) {
      history.replaceState(null, '', `#${scene.id}`);
    }
    if (this.assets) {
      if (this.reducedMotion.checked) this.player.seek(scene.previewMs);
      else if (!studioMode) this.player.play();
    }
    this.render();
  }

  private resize(): void {
    if (this.disposed) return;
    this.pixelRatio = Math.min(devicePixelRatio || 1, 2);
    for (const canvas of [this.original, this.enhanced]) {
      canvas.width = Math.round(signatureWidth * this.pixelRatio);
      canvas.height = Math.round(signatureHeight * this.pixelRatio);
    }
    this.render();
  }

  private toggle(): void {
    if (!this.assets) return;
    if (this.player.snapshot.playing) this.player.pause();
    else this.player.play();
    this.lastFrameMs = 0;
    this.render();
  }

  private pause(): void {
    this.player.pause();
    this.lastFrameMs = 0;
    this.render();
  }

  private scrub(timeMs: number): void {
    if (!this.assets) return;
    this.player.seek(timeMs);
    this.lastFrameMs = 0;
    this.render();
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (
      !this.assets ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      (event.target instanceof Element &&
        event.target.closest('input,select,button,a,[contenteditable]'))
    ) {
      return;
    }
    if (event.code === 'Space') {
      event.preventDefault();
      if (!event.repeat) this.toggle();
    } else if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
      event.preventDefault();
      this.scrub(
        this.player.snapshot.timeMs + (event.code === 'ArrowLeft' ? -100 : 100),
      );
    }
  };

  private readonly tick = (now: number): void => {
    if (this.disposed) return;
    const before = this.player.snapshot;
    const deltaMs =
      this.lastFrameMs === 0 ? 0 : Math.min(now - this.lastFrameMs, 100);
    this.lastFrameMs = now;
    this.player.advance(deltaMs);
    if (before.playing) this.render();
    this.frameId = requestAnimationFrame(this.tick);
  };

  private render(): void {
    if (!this.assets || !this.originalCtx || !this.enhancedCtx || this.disposed)
      return;
    const snapshot = this.player.snapshot;
    const frame = {
      scene: this.scene,
      timeMs: snapshot.timeMs,
      facing: this.direction,
      reducedMotion: this.reducedMotion.checked,
    };
    for (const ctx of [this.originalCtx, this.enhancedCtx]) {
      ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    }
    drawSignature(this.originalCtx, this.assets, { ...frame, enhanced: false });
    const result = drawSignature(this.enhancedCtx, this.assets, {
      ...frame,
      enhanced: true,
    });
    element('enhanced-label', HTMLSpanElement).textContent =
      this.scene.id === 'itano' && frame.reducedMotion
        ? '움직임 줄이기 · 고정 경로 도해'
        : this.scene.title;
    this.renderResult(result);
    for (const canvas of [this.original, this.enhanced]) {
      canvas.dataset.scene = this.scene.id;
      canvas.dataset.timeMs = String(Math.round(snapshot.timeMs));
      canvas.dataset.playing = String(snapshot.playing);
      canvas.dataset.facing = frame.facing;
      canvas.dataset.reducedMotion = String(frame.reducedMotion);
    }
    this.enhanced.dataset.phase = result.phase;
    this.enhanced.dataset.poseIndex = String(result.poseIndex);
    this.seek.value = String(snapshot.timeMs);
    this.time.value = `${(snapshot.timeMs / 1000).toFixed(2)} / ${(this.scene.durationMs / 1000).toFixed(2)}초`;
    this.play.textContent = snapshot.playing ? '일시정지' : '재생';
    const status = snapshot.playing
      ? '재생 중 · 두 장면이 같은 시간으로 진행됩니다.'
      : '일시정지 · 시간을 옮기거나 핵심 자세를 살펴보세요.';
    if (this.status.textContent !== status) this.status.textContent = status;
  }

  private renderResult(result: SignatureResult): void {
    if (this.phase.value !== result.phase) this.phase.value = result.phase;
    if (this.detail.textContent !== result.detail)
      this.detail.textContent = result.detail;
  }

  private async exportGif(): Promise<void> {
    if (!this.assets || this.exportAbort || this.disposed) return;
    const controller = new AbortController();
    this.exportAbort = controller;
    this.exportButton.disabled = true;
    this.cancelExport.hidden = false;
    this.pause();
    const scene = this.scene;
    const facing = this.direction;
    let previousPercent = -1;
    try {
      const blob = await exportSignatureGif({
        scene,
        assets: this.assets,
        facing,
        reducedMotion: this.reducedMotion.checked,
        signal: controller.signal,
        onProgress: (progress) => {
          const percent = Math.floor(progress * 20) * 5;
          if (this.disposed || percent === previousPercent) return;
          previousPercent = percent;
          this.exportStatus.textContent = `GIF 만드는 중 ${percent}%`;
        },
      });
      if (this.disposed || controller.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${scene.id}-${facing}.gif`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      const timeoutId = window.setTimeout(() => {
        URL.revokeObjectURL(url);
        this.objectUrls.delete(url);
      }, 1000);
      this.objectUrls.set(url, timeoutId);
      this.exportStatus.textContent = `${scene.title} GIF를 저장했습니다.`;
    } catch (error) {
      if (this.disposed) return;
      this.exportStatus.textContent = controller.signal.aborted
        ? 'GIF 저장을 취소했습니다.'
        : error instanceof Error
          ? error.message
          : 'GIF를 저장하지 못했습니다.';
    } finally {
      if (this.exportAbort === controller) this.exportAbort = null;
      if (!this.disposed) {
        this.exportButton.disabled = false;
        this.cancelExport.hidden = true;
      }
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.events.abort();
    this.studio?.dispose();
    this.exportAbort?.abort();
    this.observer.disconnect();
    cancelAnimationFrame(this.frameId);
    for (const [url, timeoutId] of this.objectUrls) {
      clearTimeout(timeoutId);
      URL.revokeObjectURL(url);
    }
    this.objectUrls.clear();
    this.assets?.acting.heat.dispose();
    this.assets?.shatter.dispose();
    this.assets = null;
  }
}

if (!redirectToStudio('signatures')) {
  const screen = new SignatureScreen();
  registerEmbeddedScene(() => screen.dispose());
}
