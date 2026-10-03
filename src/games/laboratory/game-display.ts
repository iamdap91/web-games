import { viewport } from './layout.js';

// 전체화면과 가용 공간만 관리하고 게임의 진행·입력 상태는 화면 객체에 맡긴다.
export class GameDisplay {
  private readonly events = new AbortController();
  private readonly compact = matchMedia(
    '(any-pointer: coarse), (max-width: 700px), (max-width: 1100px) and (max-height: 500px)',
  );
  private readonly observer = new ResizeObserver(() => this.fit());
  private expanded = false;
  private switching = false;

  constructor(
    private readonly shell: HTMLElement,
    private readonly slot: HTMLElement,
    private readonly frame: HTMLElement,
    private readonly button: HTMLButtonElement,
    private readonly message: HTMLElement,
    private readonly onChange: () => void,
  ) {
    const { signal } = this.events;
    this.button.addEventListener('click', () => void this.toggle(), { signal });
    document.addEventListener(
      'fullscreenchange',
      () => {
        this.expanded = document.fullscreenElement === this.shell;
        this.message.textContent = '';
        this.update();
      },
      { signal },
    );
    document.addEventListener(
      'keydown',
      (event) => {
        if (
          event.key === 'Escape' &&
          this.expanded &&
          !document.fullscreenElement
        ) {
          this.expanded = false;
          this.message.textContent = '';
          this.update();
        }
      },
      { signal },
    );
    this.compact.addEventListener('change', () => this.update(), { signal });
    window.addEventListener(
      'resize',
      () => {
        this.onChange();
        this.fit();
      },
      { signal },
    );
    this.observer.observe(this.slot);
    this.update();
  }

  destroy(): void {
    this.events.abort();
    this.observer.disconnect();
    document.body.classList.remove('compact-game', 'expanded-game');
    this.shell.classList.remove('immersive', 'expanded');
    this.frame.style.removeProperty('width');
  }

  private async toggle(): Promise<void> {
    if (this.switching) return;
    this.switching = true;
    this.button.disabled = true;
    this.onChange();
    this.message.textContent = '';
    try {
      if (this.expanded) {
        if (document.fullscreenElement === this.shell)
          await document.exitFullscreen();
        this.expanded = false;
      } else {
        this.expanded = true;
        this.update();
        try {
          if (!document.fullscreenEnabled || !this.shell.requestFullscreen)
            throw new Error('전체화면 미지원');
          await this.shell.requestFullscreen();
        } catch {
          this.message.textContent = '브라우저 안에서 화면을 확대했습니다.';
        }
      }
    } catch {
      this.message.textContent =
        '전체화면을 종료하지 못했습니다. 다시 눌러 주세요.';
    } finally {
      this.switching = false;
      this.button.disabled = false;
      if (!this.events.signal.aborted) this.update();
    }
  }

  private update(): void {
    document.body.classList.toggle('compact-game', this.compact.matches);
    document.body.classList.toggle('expanded-game', this.expanded);
    this.shell.classList.toggle(
      'immersive',
      this.compact.matches || this.expanded,
    );
    this.shell.classList.toggle('expanded', this.expanded);
    this.button.textContent = this.expanded ? '화면 축소' : '전체화면';
    this.button.setAttribute('aria-pressed', String(this.expanded));
    this.onChange();
    this.fit();
  }

  private fit(): void {
    if (!this.compact.matches && !this.expanded) {
      this.frame.style.removeProperty('width');
      return;
    }
    if (this.slot.clientWidth === 0 || this.slot.clientHeight === 0) return;
    // 테두리를 뺀 장면 비율을 유지하며 가용 화면을 최대한 채운다.
    const width = Math.max(
      0,
      Math.min(
        this.slot.clientWidth,
        ((this.slot.clientHeight - 2) * viewport.width) / viewport.height + 2,
      ),
    );
    this.frame.style.width = `${width}px`;
  }
}
