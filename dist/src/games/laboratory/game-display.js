import { viewport } from './layout.js';
// 표시 방향과 가용 공간만 관리하고 게임의 진행·입력 상태는 화면 객체에 맡긴다.
export class GameDisplay {
    shell;
    slot;
    frame;
    button;
    onChange;
    events = new AbortController();
    compact = matchMedia('(any-pointer: coarse), (max-width: 700px), (max-width: 1100px) and (max-height: 500px)');
    observer = new ResizeObserver(() => this.fit());
    landscapeMode = false;
    rotatedView = false;
    constructor(shell, slot, frame, button, onChange) {
        this.shell = shell;
        this.slot = slot;
        this.frame = frame;
        this.button = button;
        this.onChange = onChange;
        const { signal } = this.events;
        this.button.addEventListener('click', () => {
            this.landscapeMode = !this.landscapeMode;
            this.update();
        }, { signal });
        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape' || !this.landscapeMode)
                return;
            this.landscapeMode = false;
            this.update();
        }, { signal });
        this.compact.addEventListener('change', () => this.update(), { signal });
        window.addEventListener('resize', () => this.update(), { signal });
        this.observer.observe(this.slot);
        this.update();
    }
    get rotated() {
        return this.rotatedView;
    }
    destroy() {
        this.events.abort();
        this.observer.disconnect();
        document.body.classList.remove('compact-game', 'landscape-game');
        this.shell.classList.remove('immersive', 'landscape-mode', 'rotated');
        this.frame.style.removeProperty('width');
    }
    update() {
        // 기기를 가로로 돌렸다면 CSS로 한 번 더 돌리지 않는다.
        this.rotatedView = this.landscapeMode && innerHeight > innerWidth;
        document.body.classList.toggle('compact-game', this.compact.matches);
        document.body.classList.toggle('landscape-game', this.landscapeMode);
        this.shell.classList.toggle('immersive', this.compact.matches || this.landscapeMode);
        this.shell.classList.toggle('landscape-mode', this.landscapeMode);
        this.shell.classList.toggle('rotated', this.rotatedView);
        this.button.textContent = this.landscapeMode ? '기본 화면' : '가로 모드';
        this.button.setAttribute('aria-pressed', String(this.landscapeMode));
        this.fit();
        this.onChange();
    }
    fit() {
        if (!this.compact.matches && !this.landscapeMode) {
            this.frame.style.removeProperty('width');
            return;
        }
        if (this.slot.clientWidth === 0 || this.slot.clientHeight === 0)
            return;
        // client 크기는 회전 전의 로컬 좌표이므로 장면 비율을 그대로 유지할 수 있다.
        const width = Math.max(0, Math.min(this.slot.clientWidth, ((this.slot.clientHeight - 2) * viewport.width) / viewport.height + 2));
        this.frame.style.width = `${width}px`;
    }
}
