import { arena } from './board.js';
import { movement } from './actors.js';
import { ArenaGame } from './game.js';
import { renderArena } from './renderer.js';
function element(id) {
    const found = document.getElementById(id);
    if (!found)
        throw new Error(`게임 요소를 찾을 수 없습니다: ${id}`);
    return found;
}
const movementKeys = new Set([
    'KeyW',
    'KeyA',
    'KeyS',
    'KeyD',
    'ArrowUp',
    'ArrowLeft',
    'ArrowDown',
    'ArrowRight',
]);
class ArenaScreen {
    game = new ArenaGame();
    canvas = element('arena');
    ctx;
    events = new AbortController();
    keys = new Set();
    ui = {
        overlay: element('overlay'),
        title: element('overlay-title'),
        description: element('overlay-description'),
        kicker: element('overlay-kicker'),
        instructions: element('instructions'),
        result: element('result'),
        play: element('play'),
        time: element('time'),
        timeFill: element('time-fill'),
        kills: element('kills'),
        score: element('score'),
        best: element('best'),
        pause: element('pause'),
        status: element('status'),
        dash: element('dash'),
        dashLabel: element('dash-label'),
        dashFill: element('dash-fill'),
        joystick: element('joystick'),
        thumb: element('thumb'),
        announcement: element('announcement'),
        diagnostics: element('diagnostics'),
    };
    diagnosticMode = new URLSearchParams(location.search).has('dev');
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    touchDirection = { x: 0, y: 0 };
    joystickPointer = null;
    frame = 0;
    previousTime = 0;
    accumulator = 0;
    paused = false;
    best = 0;
    lastPhase = 'ready';
    animationTime = 0;
    constructor() {
        const ctx = this.canvas.getContext('2d');
        if (!ctx)
            throw new Error('Canvas 2D를 사용할 수 없습니다.');
        this.ctx = ctx;
        try {
            const saved = Number(localStorage.getItem('crumbling-arena-best'));
            if (Number.isFinite(saved) && saved >= 0)
                this.best = Math.floor(saved);
        }
        catch {
            /* 저장소를 사용할 수 없어도 게임은 계속한다. */
        }
        this.ui.best.textContent = String(this.best).padStart(4, '0');
        const options = { signal: this.events.signal };
        window.addEventListener('keydown', this.keyDown, options);
        window.addEventListener('keyup', this.keyUp, options);
        window.addEventListener('blur', this.pauseOnLeave, options);
        document.addEventListener('visibilitychange', this.visibilityChanged, options);
        this.ui.play.addEventListener('click', this.play, options);
        this.ui.pause.addEventListener('click', this.togglePause, options);
        this.ui.dash.addEventListener('pointerdown', this.touchDash, options);
        this.ui.dash.addEventListener('click', (event) => {
            if (event.detail === 0)
                this.dash();
        }, options);
        this.ui.joystick.addEventListener('pointerdown', this.joystickDown, options);
        this.ui.joystick.addEventListener('pointermove', this.joystickMove, options);
        this.ui.joystick.addEventListener('pointerup', this.joystickUp, options);
        this.ui.joystick.addEventListener('pointercancel', this.joystickUp, options);
        this.ui.joystick.addEventListener('lostpointercapture', this.joystickUp, options);
        window.addEventListener('pagehide', this.dispose, {
            ...options,
            once: true,
        });
        this.frame = requestAnimationFrame(this.tick);
    }
    input() {
        const horizontal = Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) -
            Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft'));
        const vertical = Number(this.keys.has('KeyS') || this.keys.has('ArrowDown')) -
            Number(this.keys.has('KeyW') || this.keys.has('ArrowUp'));
        return horizontal || vertical
            ? { x: horizontal, y: vertical }
            : this.touchDirection;
    }
    clearInput() {
        this.keys.clear();
        if (this.joystickPointer !== null &&
            this.ui.joystick.hasPointerCapture(this.joystickPointer))
            this.ui.joystick.releasePointerCapture(this.joystickPointer);
        this.joystickPointer = null;
        this.touchDirection = { x: 0, y: 0 };
        this.ui.thumb.style.transform = '';
    }
    play = () => {
        this.clearInput();
        if (!this.paused)
            this.game.start();
        this.paused = false;
        this.lastPhase = 'playing';
        this.accumulator = 0;
        this.previousTime = performance.now();
        this.ui.overlay.hidden = true;
        this.ui.pause.disabled = false;
        this.ui.pause.setAttribute('aria-label', '일시정지');
        this.ui.pause.textContent = 'Ⅱ';
        this.ui.announcement.textContent =
            '시작! 이동하세요. 밟은 발판은 1초 뒤 무너집니다.';
        this.canvas.focus({ preventScroll: true });
    };
    dash() {
        if (!this.paused)
            this.game.dash(this.input());
    }
    keyDown = (event) => {
        // 버튼의 Enter/Space 활성화는 브라우저에 맡겨 키보드 메뉴 조작을 유지한다.
        if (event.target instanceof HTMLButtonElement &&
            (event.code === 'Space' || event.code === 'Enter'))
            return;
        if (movementKeys.has(event.code)) {
            event.preventDefault();
            if (!this.paused)
                this.keys.add(event.code);
        }
        if (event.code === 'Space') {
            event.preventDefault();
            if (!event.repeat)
                this.dash();
        }
        if (event.code === 'Escape' && !event.repeat) {
            event.preventDefault();
            this.togglePause();
        }
    };
    keyUp = (event) => {
        this.keys.delete(event.code);
    };
    touchDash = (event) => {
        event.preventDefault();
        this.dash();
    };
    joystickDown = (event) => {
        if (this.joystickPointer !== null)
            return;
        event.preventDefault();
        this.joystickPointer = event.pointerId;
        this.ui.joystick.setPointerCapture(event.pointerId);
        this.joystickMove(event);
    };
    joystickMove = (event) => {
        if (event.pointerId !== this.joystickPointer)
            return;
        const rect = this.ui.joystick.getBoundingClientRect();
        const x = event.clientX - (rect.left + rect.width / 2);
        const y = event.clientY - (rect.top + rect.height / 2);
        const magnitude = Math.hypot(x, y);
        const radius = rect.width * 0.31;
        const scale = magnitude > radius ? radius / magnitude : 1;
        this.touchDirection =
            magnitude < 8 ? { x: 0, y: 0 } : { x: x / magnitude, y: y / magnitude };
        this.ui.thumb.style.transform = `translate(${x * scale}px, ${y * scale}px)`;
    };
    joystickUp = (event) => {
        if (event.pointerId !== this.joystickPointer)
            return;
        this.joystickPointer = null;
        this.touchDirection = { x: 0, y: 0 };
        this.ui.thumb.style.transform = '';
        if (this.ui.joystick.hasPointerCapture(event.pointerId))
            this.ui.joystick.releasePointerCapture(event.pointerId);
    };
    togglePause = () => {
        if (this.game.snapshot.phase !== 'playing')
            return;
        if (this.paused) {
            this.play();
            return;
        }
        this.paused = true;
        this.clearInput();
        this.ui.overlay.hidden = false;
        this.ui.kicker.textContent = 'TAKE A BREATH';
        this.ui.title.textContent = '잠깐, 숨 고르기.';
        this.ui.description.textContent = '돌아오면 멈춘 자리에서 이어집니다.';
        this.ui.instructions.hidden = true;
        this.ui.result.hidden = true;
        this.ui.play.innerHTML = '계속하기 <span>↗</span>';
        this.ui.pause.setAttribute('aria-label', '계속하기');
        this.ui.pause.textContent = '▷';
        this.ui.play.focus({ preventScroll: true });
    };
    pauseOnLeave = () => {
        if (!this.paused && this.game.snapshot.phase === 'playing')
            this.togglePause();
        this.clearInput();
    };
    visibilityChanged = () => {
        if (document.hidden)
            this.pauseOnLeave();
    };
    showResult(game) {
        this.clearInput();
        this.ui.overlay.hidden = false;
        this.ui.pause.disabled = true;
        this.ui.kicker.textContent =
            game.phase === 'won' ? 'YOU OUTLASTED THE HOLLOW' : 'ONE MORE RUN?';
        this.ui.title.textContent =
            game.phase === 'won' ? '끝까지 살아남았다.' : '이번엔 여기까지.';
        this.ui.description.textContent =
            game.phase === 'won'
                ? '사라지는 길 위에서, 마지막까지.'
                : `${game.cause}. ${game.cause.startsWith('발판') ? '빈틈은 대시로 뛰어넘으세요.' : '적도 대시로 통과할 수 있어요.'}`;
        this.ui.instructions.hidden = true;
        this.ui.result.hidden = false;
        this.ui.result.innerHTML = `${String(game.score).padStart(4, '0')} <span>${game.elapsed.toFixed(1)}초 생존 · 적 ${game.kills}마리 격파</span>`;
        this.ui.play.innerHTML = '다시 도전 <span>↗</span>';
        this.ui.announcement.textContent = `${this.ui.title.textContent} ${game.elapsed.toFixed(1)}초 생존, 적 ${game.kills}마리, ${game.score}점.`;
        if (game.score > this.best) {
            this.best = game.score;
            this.ui.best.textContent = String(this.best).padStart(4, '0');
            try {
                localStorage.setItem('crumbling-arena-best', String(this.best));
            }
            catch {
                /* 비공개 브라우징 등 저장 제한은 진행에 영향을 주지 않는다. */
            }
        }
        this.ui.play.focus({ preventScroll: true });
    }
    updateHud(game) {
        const remaining = Math.max(0, arena.duration - game.elapsed)
            .toFixed(1)
            .split('.');
        this.ui.time.innerHTML = `${remaining[0]}<span>.${remaining[1]}</span>`;
        this.ui.timeFill.style.width = `${100 * (1 - game.elapsed / arena.duration)}%`;
        this.ui.kills.textContent = String(game.kills).padStart(2, '0');
        this.ui.score.textContent = String(game.score).padStart(4, '0');
        this.ui.dashFill.style.width = `${100 * (1 - game.player.cooldown / movement.dashCooldown)}%`;
        this.ui.dashLabel.textContent =
            game.player.cooldown > 0
                ? `${game.player.cooldown.toFixed(1)}s`
                : '대시 준비';
        this.ui.dash.classList.toggle('charging', game.player.cooldown > 0);
        this.ui.status.textContent =
            game.phase === 'ready'
                ? '60초 생존 / 자동 공격 없음'
                : `WAVE 0${game.wave} / ${game.wave === 1 ? '적을 함정으로 유인하세요' : game.wave === 2 ? '보라색 적은 틈을 뛰어넘어요' : '마지막까지 움직이세요'}`;
        if (this.diagnosticMode)
            this.ui.diagnostics.textContent = JSON.stringify({
                ...game,
                paused: this.paused,
                input: this.input(),
            });
    }
    tick = (now) => {
        const dt = this.previousTime
            ? Math.min(0.1, (now - this.previousTime) / 1000)
            : 0;
        this.previousTime = now;
        if (!this.paused) {
            this.animationTime += dt;
            this.accumulator += dt;
            while (this.accumulator >= 1 / 120) {
                this.game.update(1 / 120, this.input());
                this.accumulator -= 1 / 120;
            }
        }
        const game = this.game.snapshot;
        if (game.phase !== this.lastPhase) {
            this.lastPhase = game.phase;
            if (game.phase === 'lost' || game.phase === 'won')
                this.showResult(game);
        }
        this.updateHud(game);
        renderArena(this.canvas, this.ctx, game, this.animationTime, this.reducedMotion);
        this.frame = requestAnimationFrame(this.tick);
    };
    dispose = () => {
        cancelAnimationFrame(this.frame);
        this.clearInput();
        this.events.abort();
    };
}
new ArenaScreen();
// 뒤로 가기 캐시에서 복원되면 종료했던 입력과 실행 루프를 새 화면에 연결한다.
window.addEventListener('pageshow', (event) => {
    if (event.persisted)
        new ArenaScreen();
});
