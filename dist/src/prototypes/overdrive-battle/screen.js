import { waitForRenderedFrame } from '../../games/tiger-rpg/screen-ready.js';
import { DamageNumbers } from './damage-numbers.js';
import { BattleSelection, commandAvailable, commandOrder, } from './battle-selection.js';
import { battleSkills } from './battle-skills.js';
import { drunkenRules } from './drunken-fist.js';
import { BattleWorld, battleRules, } from './world.js';
import { BattleScene } from './scene.js';
import { BattleSound } from './battle-sound.js';
import { driveFinishers, overdriveRules } from './overdrive.js';
import { GlassShatter } from './glass-shatter.js';
import { introImpactPoint, introPose, overdriveIntro, } from './overdrive-intro.js';
import { OverdriveCinematic } from './overdrive-cinematic.js';
import { barragePose } from './tiger-barrage.js';
import { rageRules } from './rage.js';
import { OverdriveFeedback } from './overdrive-feedback.js';
import { battleMarkup } from './screen-template.js';
function createBattleView() {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = new URL('../../../../src/prototypes/overdrive-battle/style.css', import.meta.url).href;
    shadow.innerHTML = battleMarkup;
    shadow.prepend(stylesheet);
    return { host, shadow, stylesheet };
}
export function mountBattle(options) {
    return new BattleScreen(options);
}
const movementKeys = new Set([
    'ArrowUp',
    'ArrowLeft',
    'ArrowDown',
    'ArrowRight',
]);
const attackKeys = ['Space', 'KeyE'];
const commandNames = {
    attack: '공격',
    skill: '기술',
    guard: '방어',
    ultimate: '초구취호패타',
    overdrive: 'OVERDRIVE',
};
const skillTargetLabels = {
    single: '단일',
    area: '범위',
    self: '자신',
};
const selectionDirections = {
    ArrowUp: -1,
    ArrowLeft: -1,
    ArrowDown: 1,
    ArrowRight: 1,
};
class BattleScreen {
    options;
    ready;
    view = createBattleView();
    root = this.element('#battle-screen');
    canvas = this.element('#battle');
    dock = this.element('#battle-dock');
    commandPanel = this.element('#command-panel');
    skillPanel = this.element('#skill-panel');
    skillDescription = this.element('#skill-description');
    skillButtons = new Map();
    drunkenStatus = this.element('#drunken-status');
    overdriveKey = this.element('#overdrive-key');
    overdriveCard = this.element('.overdrive-card');
    breakablePanels = [
        this.commandPanel,
        this.element('.hero-status'),
        this.element('.turn-order'),
    ];
    overlay = this.element('#overlay');
    overlayTitle = this.element('#overlay-title');
    overlayMessage = this.element('#overlay-message');
    resume = this.element('#resume');
    retry = this.element('#retry');
    returnButton = this.element('#return');
    overlayChoice = 0;
    message = this.element('#message');
    health = this.element('#health');
    energy = this.element('#energy');
    gauge = this.element('#gauge');
    healthLabel = this.element('#health-label');
    energyLabel = this.element('#energy-label');
    gaugeLabel = this.element('#gauge-label');
    targetName = this.element('#target-name');
    selectionStep = this.element('#selection-step');
    cancelTarget = this.element('#cancel-target');
    roundLabel = this.element('#round');
    turnLabel = this.element('#turn-label');
    footerHint = this.element('#footer-hint');
    driveHud = this.element('#drive-hud');
    driveTime = this.element('#drive-time');
    driveFill = this.element('#drive-time-fill');
    hitCount = this.element('#hit-count');
    driveDamage = this.element('#drive-damage');
    driveRule = this.element('#drive-rule');
    rageGauge = this.element('.rage-gauge');
    rageMeter = this.element('#rage');
    ultimateTitle = this.element('#ultimate-title');
    returnSummary = this.element('#return-summary');
    damageNumbers = new DamageNumbers(this.element('#damage-labels'));
    shardContainer = this.element('#shards');
    diagnostics = this.element('#diagnostics');
    devPanel = this.element('#dev-panel');
    devToggle = this.element('#dev-toggle');
    devGauges = [
        { kind: 'rage', capacity: rageRules.capacity },
        { kind: 'overdrive', capacity: overdriveRules.capacity },
    ].map(({ kind, capacity }) => ({
        kind,
        capacity,
        slider: this.element(`#dev-${kind}`),
        value: this.element(`#dev-${kind}-value`),
        presets: this.element(`#dev-${kind}-presets`).querySelectorAll('button'),
    }));
    commands = new Map();
    labels = new Map();
    order = new Map();
    lifetime = new AbortController();
    keys = new Set();
    // 상태가 바뀌어 이동·공격 입력을 비워도 실제 키를 놓기 전에는 다시 받지 않는다.
    heldKeys = new Set();
    world;
    selection;
    sound = new BattleSound();
    driveFeedback = new OverdriveFeedback();
    dev = new URLSearchParams(location.search).get('dev') === '1';
    reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    glass = new GlassShatter(this.shardContainer, this.reducedMotion);
    cinematic = new OverdriveCinematic(this.root, this.reducedMotion);
    scene = null;
    frameId = 0;
    previousTime = 0;
    phase = 'command';
    rageReveal = 'empty';
    paused = false;
    transitionBlocked = false;
    returning = false;
    suspended = false;
    loaded = false;
    failed = false;
    disposed = false;
    constructor(options) {
        this.options = options;
        this.world = new BattleWorld(Math.random, options.entry);
        this.selection = new BattleSelection(this.world);
        const state = this.world.snapshot;
        this.root.dataset.encounter = options.entry.encounter;
        if (options.entry.encounter === 'first-expedition') {
            this.view.host.dataset.embedded = 'true';
            this.canvas.setAttribute('aria-label', '산길 첫 원정. 위아래 방향키로 공격, 기술, 방어를 고르고 Space로 선택합니다. 기술의 맹호각은 적의 다음 행동을 한 번 막습니다. 방향키로 대상을 고르고 Space 또는 클릭으로 실행합니다. Esc로 취소하거나 잠시 쉽니다.');
        }
        options.root.append(this.view.host);
        const orderList = this.element('.order-list');
        for (const fighter of [state.player, ...state.enemies]) {
            if (orderList.childElementCount > 0) {
                const arrow = document.createElement('i');
                arrow.textContent = '›';
                orderList.append(arrow);
            }
            const item = document.createElement('span');
            item.textContent = fighter.kind === 'yeti' ? '예티' : fighter.name;
            item.classList.toggle('order-hero', fighter.id === 0);
            orderList.append(item);
            this.order.set(fighter.id, item);
        }
        const { signal } = this.lifetime;
        for (const command of commandOrder) {
            const button = this.element(`#${command}`);
            this.commands.set(command, button);
            button.addEventListener('click', () => this.chooseCommand(command), {
                signal,
            });
            button.addEventListener('focus', () => {
                this.selection.focusCommand(command);
            }, { signal });
        }
        for (const id of state.availableSkills) {
            const button = document.createElement('button');
            button.type = 'button';
            const name = document.createElement('strong');
            name.textContent = battleSkills[id].name;
            const target = battleSkills[id].target;
            const icon = document.createElement('span');
            icon.className = `skill-target-icon target-${target}`;
            icon.setAttribute('aria-hidden', 'true');
            const title = document.createElement('span');
            title.className = 'skill-name';
            title.append(icon, name);
            button.title = `${skillTargetLabels[target]} 대상`;
            const cost = document.createElement('small');
            cost.textContent =
                id === 'drink'
                    ? `기력 +${drunkenRules.energyRecovery}`
                    : `기력 −${battleSkills[id].cost}`;
            button.setAttribute('aria-label', `${battleSkills[id].name}, ${skillTargetLabels[target]} 대상, ${cost.textContent}`);
            button.append(title, cost);
            button.addEventListener('click', () => this.chooseSkill(id), { signal });
            button.addEventListener('focus', () => {
                this.selection.focusSkill(id);
            }, { signal });
            this.element('#skill-list').append(button);
            this.skillButtons.set(id, button);
        }
        this.element('#skill-back').addEventListener('click', () => this.cancelSelection(), { signal });
        this.cancelTarget.addEventListener('click', () => this.cancelSelection(), {
            signal,
        });
        const labelContainer = this.element('#enemy-labels');
        for (const enemy of this.world.snapshot.enemies) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'enemy-label';
            const name = document.createElement('span');
            name.className = 'enemy-name';
            name.textContent = enemy.name;
            const value = document.createElement('span');
            name.append(value);
            const health = document.createElement('progress');
            health.max = enemy.maxHealth;
            health.setAttribute('aria-label', `${enemy.name} 체력`);
            button.append(name, health);
            button.addEventListener('click', () => {
                this.confirmTarget(enemy.id);
            }, { signal });
            button.addEventListener('focus', () => {
                if (this.selection.snapshot.pendingCommand !== null)
                    this.world.selectTarget(enemy.id);
            }, { signal });
            labelContainer.append(button);
            this.labels.set(enemy.id, { button, health, value });
        }
        this.view.shadow.addEventListener('keydown', this.keyDown, { signal });
        window.addEventListener('keyup', (event) => {
            this.keys.delete(event.code);
            this.heldKeys.delete(event.code);
        }, { signal });
        window.addEventListener('blur', () => this.setSuspended(true), { signal });
        window.addEventListener('focus', () => this.setSuspended(document.hidden), {
            signal,
        });
        document.addEventListener('visibilitychange', () => {
            this.setSuspended(document.hidden || !document.hasFocus());
        }, { signal });
        this.canvas.addEventListener('pointerdown', (event) => {
            if (!this.loaded || this.paused || this.suspended)
                return;
            this.canvas.focus();
            if (this.selection.selectingArea) {
                const point = this.scene?.pickGround({
                    x: event.clientX,
                    y: event.clientY,
                });
                if (point) {
                    this.selection.aimAt(point);
                    this.confirmTarget();
                }
                return;
            }
            const id = this.scene?.pick({ x: event.clientX, y: event.clientY }, this.world.snapshot);
            if (id !== null && id !== undefined)
                this.confirmTarget(id);
        }, { signal });
        this.canvas.addEventListener('pointermove', (event) => {
            if (!this.selection.selectingArea ||
                this.paused ||
                this.suspended ||
                event.pointerType === 'touch')
                return;
            const point = this.scene?.pickGround({
                x: event.clientX,
                y: event.clientY,
            });
            if (point)
                this.selection.aimAt(point);
        }, { signal });
        this.canvas.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            this.showError('그래픽 연결이 끊겼어요. 화면을 다시 열어 주세요.');
        }, { signal });
        this.resume.addEventListener('click', () => {
            if (this.failed) {
                location.reload();
                return;
            }
            this.setPaused(false);
            this.canvas.focus();
        }, { signal });
        this.retry.addEventListener('click', () => this.reset(), { signal });
        this.returnButton.addEventListener('click', () => this.returnToCaller(), {
            signal,
        });
        this.element('#reset').addEventListener('click', () => this.reset(), {
            signal,
        });
        const soundButton = this.element('#sound');
        soundButton.addEventListener('click', () => {
            const muted = this.sound.toggle();
            soundButton.textContent = muted ? '소리 끔' : '소리 켬';
            soundButton.setAttribute('aria-pressed', String(muted));
        }, { signal });
        if (state.advanced)
            this.bindDevelopmentPanel();
        this.renderHud(state);
        this.ready = this.start();
    }
    element(selector) {
        const node = this.view.shadow.querySelector(selector);
        if (!node)
            throw new Error(`화면 요소가 없습니다: ${selector}`);
        return node;
    }
    focus() {
        if (!this.disposed && !this.transitionBlocked)
            this.canvas.focus();
    }
    loadStyles() {
        return new Promise((resolve, reject) => {
            const { signal } = this.lifetime;
            const stylesheet = this.view.stylesheet;
            if (stylesheet.sheet || signal.aborted) {
                resolve();
                return;
            }
            stylesheet.addEventListener('load', () => resolve(), {
                once: true,
                signal,
            });
            stylesheet.addEventListener('error', () => reject(new Error('전투 화면 스타일을 불러오지 못했어요.')), { once: true, signal });
            signal.addEventListener('abort', () => resolve(), { once: true });
        });
    }
    bindDevelopmentPanel() {
        const { signal } = this.lifetime;
        this.devToggle.addEventListener('click', () => this.setDevelopmentPanelOpen(this.devPanel.hidden === true), { signal });
        this.element('#dev-close').addEventListener('click', () => this.setDevelopmentPanelOpen(false), { signal });
        this.devPanel.addEventListener('focusin', () => this.keys.clear(), {
            signal,
        });
        for (const control of this.devGauges) {
            control.slider.max = String(control.capacity);
            control.slider.addEventListener('input', () => this.adjustDevelopmentGauge(control.kind, control.slider.valueAsNumber), { signal });
            for (const button of control.presets) {
                button.addEventListener('click', () => this.adjustDevelopmentGauge(control.kind, (control.capacity * Number(button.value)) / 100), { signal });
            }
        }
    }
    setDevelopmentPanelOpen(open) {
        if (!this.world.snapshot.advanced)
            return;
        this.devPanel.hidden = !open;
        this.devToggle.setAttribute('aria-expanded', String(open));
        this.keys.clear();
        if (open) {
            this.renderDevelopmentPanel(this.world.snapshot);
            this.devGauges[0]?.slider.focus();
        }
        else
            this.canvas.focus();
    }
    adjustDevelopmentGauge(gauge, amount) {
        if (!this.loaded || this.failed)
            return;
        this.world.setGaugeForDevelopment(gauge, amount);
        const state = this.world.snapshot;
        if (state.rage < rageRules.capacity)
            this.clearRageReveal();
        // 선택 중인 필살기를 비활성화하면 대상 선택도 함께 해제한다.
        this.selection.syncAvailability(state);
        this.renderDevelopmentPanel(state);
    }
    renderDevelopmentPanel(state) {
        if (this.devPanel.hidden)
            return;
        for (const control of this.devGauges) {
            const amount = control.kind === 'rage' ? state.rage : state.overdrive.gauge;
            const value = String(Math.round(amount));
            if (control.slider.value !== value)
                control.slider.value = value;
            const label = `${value}%`;
            if (control.value.textContent !== label)
                control.value.textContent = label;
            for (const button of control.presets) {
                button.setAttribute('aria-pressed', String(amount === (control.capacity * Number(button.value)) / 100));
            }
        }
    }
    async start() {
        try {
            this.scene = new BattleScene(this.canvas, this.world.snapshot, {
                reducedMotion: this.reducedMotion,
            });
            await Promise.all([
                this.loadStyles(),
                this.scene.load(),
                ...(this.world.snapshot.advanced
                    ? [this.cinematic.load(), this.sound.load(this.lifetime.signal)]
                    : []),
            ]);
            if (this.disposed)
                return;
            this.loaded = true;
            this.setPaused(false);
            this.setSuspended(document.hidden || !document.hasFocus());
            this.previousTime = performance.now();
            this.renderFrame(0);
            await waitForRenderedFrame(this.lifetime.signal);
            if (this.disposed)
                return;
            if (!this.transitionBlocked)
                this.schedule();
            this.focus();
        }
        catch (error) {
            if (this.disposed)
                return;
            this.scene?.dispose();
            this.scene = null;
            this.showError(error instanceof Error
                ? error.message
                : '전투를 준비하지 못했어요. WebGL 2 지원 브라우저에서 열어 주세요.');
            throw error;
        }
    }
    keyDown = (input) => {
        if (!(input instanceof KeyboardEvent) || this.disposed)
            return;
        const event = input;
        const firstPress = !event.repeat && !this.heldKeys.has(event.code);
        this.heldKeys.add(event.code);
        const selection = this.selection.snapshot;
        if (event.metaKey || event.ctrlKey || event.altKey || event.isComposing)
            return;
        if (movementKeys.has(event.code) ||
            attackKeys.includes(event.code) ||
            ['KeyR', 'Enter', 'Escape'].includes(event.code))
            event.stopPropagation();
        if (!this.overlay.hidden && this.handleOverlayKey(event, firstPress))
            return;
        // Enter의 브라우저 기본 클릭도 막아 포커스 위치에 따라 확정키가 달라지지 않게 한다.
        if (event.key === 'Enter' &&
            event.target instanceof Node &&
            this.root.contains(event.target) &&
            !this.devPanel.contains(event.target) &&
            !this.devToggle.contains(event.target)) {
            event.preventDefault();
            return;
        }
        if (!this.loaded || this.failed || this.suspended)
            return;
        if (event.code === 'Escape') {
            event.preventDefault();
            if (firstPress) {
                if (!this.devPanel.hidden)
                    this.setDevelopmentPanelOpen(false);
                else if (!this.paused &&
                    (selection.pendingCommand !== null || selection.skillsOpen))
                    this.cancelSelection();
                else
                    this.setPaused(!this.paused);
            }
            return;
        }
        if (this.paused)
            return;
        // 슬라이더 조작과 개발 버튼의 키 입력은 전투로 전달하지 않는다.
        if (event.target instanceof Node && this.devPanel.contains(event.target))
            return;
        // 전투 버튼의 기본 Space 클릭은 막아 한 번의 입력이 두 단계를 넘지 않게 한다.
        if (event.target instanceof HTMLButtonElement &&
            !event.target.matches('.commands button, .skill-list button, .overdrive-trigger, .enemy-label'))
            return;
        const state = this.world.snapshot;
        if (state.phase === 'command') {
            const direction = selectionDirections[event.code];
            if (direction !== undefined) {
                event.preventDefault();
                if (this.selection.selectingArea) {
                    if (firstPress) {
                        this.keys.add(event.code);
                        this.moveAreaCursor({
                            x: event.code === 'ArrowLeft'
                                ? -10
                                : event.code === 'ArrowRight'
                                    ? 10
                                    : 0,
                            z: event.code === 'ArrowUp'
                                ? -10
                                : event.code === 'ArrowDown'
                                    ? 10
                                    : 0,
                        });
                    }
                    this.canvas.focus();
                    return;
                }
                if (firstPress) {
                    if (selection.pendingCommand !== null)
                        this.world.cycleTarget(direction);
                    else if (event.code === 'ArrowLeft' && selection.skillsOpen)
                        this.cancelSelection();
                    else if (event.code === 'ArrowRight') {
                        if (!selection.skillsOpen && selection.selectedCommand === 'skill')
                            this.chooseCommand('skill');
                    }
                    else if (event.code === 'ArrowUp' || event.code === 'ArrowDown') {
                        if (selection.skillsOpen) {
                            this.selection.cycleSkill(direction);
                        }
                        else
                            this.selection.cycleCommand(direction);
                    }
                    this.canvas.focus();
                }
                return;
            }
            if (event.code === 'Space') {
                event.preventDefault();
                if (firstPress) {
                    if (selection.pendingCommand !== null)
                        this.confirmTarget();
                    else if (selection.skillsOpen)
                        this.chooseSkill(selection.selectedSkill);
                    else
                        this.chooseCommand(selection.selectedCommand);
                }
                return;
            }
            if (event.code === 'KeyR' && selection.pendingCommand === null) {
                event.preventDefault();
                if (firstPress)
                    this.chooseCommand('overdrive');
                return;
            }
        }
        if (movementKeys.has(event.code) || attackKeys.includes(event.code)) {
            event.preventDefault();
            if (state.phase === 'overdrive' && firstPress) {
                this.keys.add(event.code);
                if (attackKeys.includes(event.code))
                    this.sound.unlock();
            }
        }
    };
    chooseCommand(command) {
        if (!this.loaded || this.paused || this.suspended || this.failed)
            return;
        if (!this.selection.chooseCommand(command))
            return;
        this.sound.unlock();
        this.keys.clear();
        this.canvas.focus();
    }
    chooseSkill(id) {
        if (!this.loaded || this.paused || this.suspended || this.failed)
            return;
        if (!this.selection.chooseSkill(id))
            return;
        this.keys.clear();
        this.canvas.focus();
    }
    moveAreaCursor(offset) {
        if (!this.selection.snapshot.areaCenter)
            return;
        const point = this.scene?.moveGroundPoint(this.selection.snapshot.areaCenter, offset);
        if (point)
            this.selection.aimAt(point);
    }
    confirmTarget(id) {
        if (!this.loaded || this.paused || this.suspended || this.failed)
            return;
        if (!this.selection.confirmTarget(id))
            return;
        this.keys.clear();
        this.canvas.focus();
    }
    cancelSelection() {
        this.selection.cancelSelection();
        this.keys.clear();
        this.canvas.focus();
    }
    overlayChoices() {
        return [this.resume, this.retry, this.returnButton].filter((button) => !button.hidden && !button.disabled);
    }
    resetOverlayChoice() {
        this.overlayChoice = 0;
        this.renderOverlayChoice();
    }
    renderOverlayChoice() {
        const selected = this.overlayChoices()[this.overlayChoice];
        for (const button of [this.resume, this.retry, this.returnButton])
            button.setAttribute('aria-current', String(button === selected));
    }
    handleOverlayKey(event, firstPress) {
        const direction = selectionDirections[event.code];
        if (event.code !== 'Space' && direction === undefined)
            return false;
        event.preventDefault();
        if (!firstPress || this.suspended)
            return true;
        const choices = this.overlayChoices();
        if (choices.length === 0)
            return true;
        const focused = choices.findIndex((button) => button === event.target);
        if (focused >= 0)
            this.overlayChoice = focused;
        if (direction !== undefined) {
            this.overlayChoice =
                (this.overlayChoice + direction + choices.length) % choices.length;
            this.renderOverlayChoice();
            choices[this.overlayChoice]?.focus();
        }
        else
            choices[this.overlayChoice]?.click();
        return true;
    }
    returnToCaller() {
        if (this.disposed ||
            this.returning ||
            this.transitionBlocked ||
            this.world.snapshot.advanced)
            return;
        const phase = this.world.snapshot.phase;
        let outcome;
        if (phase === 'victory' || phase === 'defeat')
            outcome = phase;
        else if (this.paused || this.failed)
            outcome = 'retreat';
        else
            return;
        const result = { battleId: this.options.entry.battleId, outcome };
        // 암전 동안 마지막 전투 장면은 유지하고 진행·입력만 멈춘다.
        this.returning = true;
        this.setTransitionBlocked(true);
        this.options.onReturn(result);
    }
    reset() {
        if (!this.loaded || this.failed || this.disposed)
            return;
        if (!this.world.snapshot.advanced && this.world.snapshot.phase !== 'defeat')
            return;
        this.world.reset();
        this.scene?.reset();
        this.phase = 'command';
        this.selection.reset();
        this.keys.clear();
        this.clearEffects();
        this.setPaused(false);
        this.canvas.focus();
    }
    setPaused(paused) {
        if (!this.loaded || this.failed)
            return;
        const phase = this.world.snapshot.phase;
        if (phase === 'victory' || phase === 'defeat')
            return;
        this.paused = paused;
        this.updateHudResting();
        if (paused)
            this.sound.stop();
        this.keys.clear();
        this.previousTime = performance.now();
        this.overlay.hidden = !paused;
        this.overlayTitle.textContent = '잠깐 숨 고르기';
        this.overlayMessage.textContent = this.world.snapshot.advanced
            ? '당신의 차례는 기다려줍니다.'
            : '↑↓ 선택 · Space 확정 · Esc 계속하기';
        this.resume.textContent = '계속하기';
        this.resume.hidden = false;
        this.retry.hidden = true;
        this.returnButton.hidden = this.world.snapshot.advanced;
        this.resetOverlayChoice();
    }
    setSuspended(suspended) {
        if (this.disposed)
            return;
        // 창 이탈은 팝업 없이 멈추고 복귀 시 이어간다. 수동 일시정지는 유지한다.
        this.suspended = suspended;
        this.updateHudResting();
        if (suspended) {
            this.sound.stop();
            // 창 밖에서 놓은 키의 keyup은 받지 못하므로 다음 새 입력부터 다시 추적한다.
            this.heldKeys.clear();
        }
        this.keys.clear();
        this.previousTime = performance.now();
    }
    setTransitionBlocked(blocked) {
        if (this.disposed)
            return;
        this.transitionBlocked = blocked;
        this.view.host.inert = blocked;
        this.keys.clear();
        this.heldKeys.clear();
        this.sound.stop();
        this.updateHudResting();
        cancelAnimationFrame(this.frameId);
        this.frameId = 0;
        if (!blocked)
            this.schedule();
    }
    updateHudResting() {
        const resting = this.paused || this.suspended || this.transitionBlocked;
        // 숨겨진 탭에서는 다음 프레임을 기다리지 않고 CSS 연출도 즉시 멈춘다.
        this.commandPanel.classList.toggle('resting', resting);
        this.root.classList.toggle('resting', resting);
        this.rageGauge.classList.toggle('resting', resting);
        this.overdriveCard.classList.toggle('resting', resting);
    }
    showError(message) {
        this.failed = true;
        this.keys.clear();
        cancelAnimationFrame(this.frameId);
        this.overlay.hidden = false;
        this.overlayTitle.textContent = '대결을 준비하지 못했어요';
        this.overlayMessage.textContent = message;
        this.resume.textContent = '다시 열기';
        this.resume.hidden = false;
        this.retry.hidden = true;
        this.returnButton.hidden = this.world.snapshot.advanced;
        if (!this.world.snapshot.advanced)
            this.resume.hidden = true;
        this.resetOverlayChoice();
    }
    changePhase(state) {
        if (state.phase === this.phase)
            return;
        this.phase = state.phase;
        this.selection.changePhase(state.phase);
        this.keys.clear();
        this.root.classList.remove('glass-impact', 'glass-burst');
        if (state.phase === 'breaking') {
            this.sound.unleash();
        }
        if (state.phase === 'ultimate')
            this.sound.beginBarrage();
        if (state.phase !== 'breaking') {
            this.glass.clear();
            this.cinematic.clear();
        }
        if (state.phase === 'victory' || state.phase === 'defeat') {
            this.overlay.hidden = false;
            this.overlayTitle.textContent =
                state.phase === 'victory' ? '승리!' : '이번에는 여기까지';
            const result = state.overdrive.hits > 0
                ? `\n마지막 오버드라이브 ${state.overdrive.hits}연타 · ${state.overdrive.damage} 피해`
                : '';
            this.overlayMessage.textContent = `${state.message}${result}`;
            this.resume.hidden = true;
            this.retry.hidden = !state.advanced && state.phase === 'victory';
            this.returnButton.hidden = state.advanced;
            if (!state.advanced)
                this.overlayMessage.textContent =
                    state.phase === 'victory'
                        ? '산길의 슬라임을 물리쳤습니다. 마을로 돌아가세요.'
                        : '자원은 잃지 않습니다. 다시 도전하거나 마을로 돌아갈 수 있습니다.';
            this.resetOverlayChoice();
        }
    }
    schedule() {
        if (!this.loaded ||
            this.disposed ||
            this.failed ||
            this.transitionBlocked ||
            this.returning ||
            this.frameId)
            return;
        this.previousTime = performance.now();
        this.frameId = requestAnimationFrame(this.tick);
    }
    tick = (now) => {
        this.frameId = 0;
        if (this.disposed ||
            this.failed ||
            this.transitionBlocked ||
            this.returning)
            return;
        const dt = this.paused || this.suspended
            ? 0
            : Math.max(0, Math.min((now - this.previousTime) / 1000, 0.05));
        this.previousTime = now;
        const pressed = (code) => Number(this.keys.has(code));
        if (this.selection.selectingArea && dt > 0) {
            const x = Number(this.keys.has('ArrowRight')) -
                Number(this.keys.has('ArrowLeft'));
            const z = Number(this.keys.has('ArrowDown')) - Number(this.keys.has('ArrowUp'));
            const length = Math.hypot(x, z);
            if (length > 0)
                this.moveAreaCursor({
                    x: (x / length) * dt * 220,
                    z: (z / length) * dt * 220,
                });
        }
        this.world.update(dt, {
            x: pressed('ArrowRight') - pressed('ArrowLeft'),
            z: pressed('ArrowDown') - pressed('ArrowUp'),
            attacking: attackKeys.some((key) => this.keys.has(key)),
        });
        this.renderFrame(dt);
        this.frameId = requestAnimationFrame(this.tick);
    };
    renderFrame(dt) {
        const impacts = this.world.takeImpacts();
        const state = this.world.snapshot;
        this.driveFeedback.update(dt, state);
        this.driveFeedback.addImpacts(impacts);
        this.scene?.addImpacts(impacts);
        for (const impact of impacts) {
            this.damageNumbers.add(impact);
            this.sound.impact(impact);
        }
        this.scene?.render(state, dt, {
            selectingTarget: this.selection.snapshot.pendingCommand !== null,
            affectedIds: this.selection.affectedTargets(state),
            areaCenter: this.selection.selectingArea
                ? this.selection.snapshot.areaCenter
                : null,
        }, this.driveFeedback.snapshot);
        this.changePhase(state);
        this.renderHud(state);
        this.renderEffects(state);
        this.damageNumbers.update(dt, (impact, height) => this.scene?.project(impact, height));
        // 필살기 선택지가 추가된 높이로 배치해 등장 첫 프레임의 겹침을 막는다.
        if (state.phase === 'command')
            this.positionCommands(state);
        if (this.dev)
            this.diagnostics.textContent = JSON.stringify({
                ...state,
                paused: this.paused,
                transitionBlocked: this.transitionBlocked,
                suspended: this.suspended,
                selectedCommand: this.selection.snapshot.selectedCommand,
                pendingCommand: this.selection.snapshot.pendingCommand,
                areaCenter: this.selection.snapshot.areaCenter,
                ready: this.loaded,
                ...this.scene?.diagnostics,
            });
    }
    positionCommands(state) {
        // 낮은 통합 화면은 세 명령과 상태를 하단 좌우에 두어 전장을 확보한다.
        const compact = !state.advanced && this.root.clientHeight <= 450;
        this.root.dataset.compact = String(compact);
        const feet = this.scene?.project(state.player);
        if (!feet)
            return;
        const width = this.commandPanel.offsetWidth +
            (this.skillPanel.hidden ? 0 : this.skillPanel.offsetWidth + 10);
        const height = Math.max(this.commandPanel.offsetHeight, this.skillPanel.hidden ? 0 : this.skillPanel.offsetHeight);
        const inset = this.dock.offsetLeft;
        const left = Math.max(inset, Math.min(feet.x - this.commandPanel.offsetWidth * 0.5, this.root.clientWidth - width - inset));
        // 아타호 발밑을 기준으로 두되 하단 상태창과 겹치지 않게 제한한다.
        const top = Math.max(inset, compact
            ? this.root.clientHeight - height - 32
            : Math.min(feet.z + 18, this.dock.offsetTop - height - 16));
        this.commandPanel.style.left = `${compact ? inset : left}px`;
        this.commandPanel.style.top = `${top}px`;
    }
    renderSelection(state) {
        const selection = this.selection.snapshot;
        const choosing = state.phase === 'command';
        const targeting = choosing && selection.pendingCommand !== null;
        const skills = choosing && selection.skillsOpen && !targeting;
        const area = targeting && this.selection.selectingArea;
        this.root.dataset.selection = area
            ? 'area'
            : targeting
                ? 'target'
                : skills
                    ? 'skill'
                    : 'command';
        this.skillPanel.hidden = !skills;
        this.commands.get('skill').setAttribute('aria-expanded', String(skills));
        for (const [id, button] of this.skillButtons) {
            const unavailable = state.energy < battleSkills[id].cost;
            button.disabled = !choosing || this.paused || this.suspended;
            button.setAttribute('aria-disabled', String(unavailable || button.disabled));
            button.classList.toggle('unavailable', unavailable);
            button.classList.toggle('selected', id === selection.selectedSkill);
            button.setAttribute('aria-current', String(id === selection.selectedSkill));
        }
        const selectedSkill = battleSkills[selection.selectedSkill];
        const drinkInfo = state.drunken.turns > 0
            ? '취권 중에는 기력만 회복합니다.'
            : `현재 ${state.drunken.drinks} / ${drunkenRules.drinksToActivate}잔 · 세 번째 잔에 취권`;
        const description = [
            `${skillTargetLabels[selectedSkill.target]} · ${selectedSkill.description}`,
        ];
        if (selection.selectedSkill === 'drink')
            description.push(drinkInfo);
        if (state.energy < selectedSkill.cost)
            description.push('기력이 부족합니다.');
        this.skillDescription.textContent = description.join(' ');
        this.selectionStep.textContent = area
            ? '범위 지정'
            : targeting
                ? '대상 선택'
                : skills
                    ? '기술 선택'
                    : '행동 선택';
        this.cancelTarget.hidden = !targeting && !skills;
        for (const [name, button] of this.commands) {
            button.hidden =
                (name === 'ultimate' &&
                    (!state.advanced || state.rage < rageRules.capacity)) ||
                    (name === 'overdrive' && !state.advanced) ||
                    (name === 'skill' && state.availableSkills.length === 0);
            button.disabled =
                this.paused || this.suspended || !commandAvailable(name, state);
            const selected = choosing && name === selection.selectedCommand;
            button.classList.toggle('selected', selected);
            button.setAttribute('aria-current', String(selected));
        }
        const target = state.enemies.find((enemy) => enemy.id === state.targetId);
        const affected = this.selection.affectedTargets(state).length;
        this.targetName.textContent = area
            ? `범위 안 ${affected}체 · 방향키로 위치 이동`
            : targeting && target
                ? `대상: ${target.name}`
                : skills
                    ? '← / Esc 돌아가기'
                    : '↑↓ 이동 · Space 선택';
        this.message.textContent = area
            ? affected > 0
                ? `선풍각 · ${affected}체 포함 · Space 또는 클릭으로 확정`
                : '선풍각 · 범위 안에 적이 없습니다. 위치를 옮겨주세요.'
            : targeting
                ? `${selection.pendingCommand === 'skill' ? selectedSkill.name : commandNames[selection.pendingCommand]} · 대상을 고른 뒤 Space 또는 적 클릭`
                : choosing
                    ? !state.advanced && skills
                        ? '맹호각은 적의 다음 행동을 한 번 막습니다.'
                        : '아타호의 차례. 사용할 행동을 골라보세요.'
                    : state.message;
        this.footerHint.textContent = area
            ? '방향키/마우스 범위 이동 · Space/클릭 실행 · Esc 취소'
            : targeting
                ? '방향키 대상 · Space 실행 · Esc 취소'
                : choosing
                    ? skills
                        ? '↑↓ 기술 · Space 선택 · ←/Esc 돌아가기'
                        : '↑↓ 행동 · Space 선택 · → 기술 열기'
                    : state.phase === 'overdrive'
                        ? '방향키 이동 · Space/E 공격 · Esc 쉬기'
                        : 'Esc 쉬기';
        if (!state.advanced &&
            (state.phase === 'victory' || state.phase === 'defeat'))
            this.footerHint.textContent =
                state.phase === 'victory'
                    ? 'Space 또는 클릭으로 마을 귀환'
                    : '↑↓ 선택 · Space 또는 클릭으로 확정';
    }
    renderHud(state) {
        this.root.dataset.phase = state.phase;
        const command = state.phase === 'command' && !this.paused && !this.suspended;
        const selectingTarget = state.phase === 'command' &&
            this.selection.snapshot.pendingCommand !== null;
        this.renderSelection(state);
        this.renderRageReveal(state);
        this.renderDevelopmentPanel(state);
        this.health.value = state.player.health;
        this.energy.value = state.energy;
        this.gauge.value = state.overdrive.gauge;
        this.overdriveCard.style.setProperty('--drive-fill', String(state.overdrive.gauge / overdriveRules.capacity));
        const locked = state.drunken.turns > 0;
        const driveReady = !locked && state.overdrive.gauge >= overdriveRules.capacity;
        this.overdriveCard.classList.toggle('locked', locked);
        this.overdriveKey.classList.toggle('lock-icon', locked);
        this.overdriveKey.textContent = locked ? '' : 'R';
        this.commands
            .get('overdrive')
            .setAttribute('aria-label', locked
            ? `취권 ${state.drunken.turns}턴 동안 오버드라이브 사용 불가`
            : '아타호 오버드라이브 발동 (R)');
        this.drunkenStatus.hidden = !locked && state.drunken.drinks === 0;
        this.drunkenStatus.textContent = locked
            ? `취권 ${state.drunken.turns}턴 · 치명타 ${Math.round(drunkenRules.drunkenCriticalChance * 100)}%`
            : `한 잔~ ${state.drunken.drinks} / ${drunkenRules.drinksToActivate}`;
        this.drunkenStatus.classList.toggle('active', locked);
        this.overdriveCard.classList.toggle('ready', driveReady);
        this.healthLabel.textContent = `${state.player.health} / ${state.player.maxHealth}`;
        this.energyLabel.textContent = `${state.energy} / ${battleRules.maxEnergy}`;
        this.gaugeLabel.textContent = locked
            ? `취권 ${state.drunken.turns}턴`
            : `${state.overdrive.gauge}%`;
        this.roundLabel.textContent = `ROUND ${String(state.round).padStart(2, '0')}`;
        this.turnLabel.textContent =
            state.phase === 'enemy-turn'
                ? '적의 차례'
                : state.phase === 'victory'
                    ? '전투 종료'
                    : state.phase === 'defeat'
                        ? '전투 종료'
                        : '아타호의 차례';
        this.order.forEach((node, id) => {
            node.classList.toggle('active', id === 0 ? state.phase !== 'enemy-turn' : state.action?.actorId === id);
            node.classList.toggle('dead', id > 0 && state.enemies.find((enemy) => enemy.id === id)?.health === 0);
        });
        const affectedIds = this.selection.affectedTargets(state);
        for (const enemy of state.enemies) {
            const label = this.labels.get(enemy.id);
            label.button.hidden = enemy.health <= 0;
            const selected = enemy.id === state.targetId &&
                ((selectingTarget && !this.selection.selectingArea) ||
                    state.phase === 'overdrive');
            label.button.disabled =
                !command || !selectingTarget || this.selection.selectingArea;
            label.button.classList.toggle('selected', selected);
            label.button.classList.toggle('affected', affectedIds.includes(enemy.id));
            label.button.classList.toggle('staggered', enemy.staggered);
            label.button.setAttribute('aria-pressed', String(selected));
            label.button.setAttribute('aria-label', `${enemy.name}, 체력 ${enemy.health} / ${enemy.maxHealth}${enemy.staggered ? ', 다음 행동 불가' : ''}${affectedIds.includes(enemy.id) ? ', 기술 피해 대상' : ''}, 공격 대상으로 선택`);
            label.health.value = enemy.health;
            label.value.textContent = `${enemy.health}${enemy.staggered ? ' · 행동 불가' : ''}`;
            const point = this.scene?.projectEnemyLabel(enemy);
            if (point) {
                label.button.style.left = `${point.x}px`;
                label.button.style.top = `${state.advanced ? point.z : Math.max(label.button.offsetHeight + (selected ? 12 : 0) + 8, point.z)}px`;
            }
        }
        this.driveHud.hidden =
            state.phase !== 'overdrive' && state.phase !== 'ultimate';
        this.rageMeter.value = state.rage;
        this.rageGauge.style.setProperty('--rage-fill', `${state.rage}%`);
        this.rageGauge.classList.toggle('ready', state.rage >= rageRules.capacity);
        this.rageGauge.classList.toggle('empty', state.rage === 0);
        this.ultimateTitle.hidden = state.barrage === null;
        this.ultimateTitle.style.opacity = state.barrage
            ? String(Math.min(1, state.barrage.elapsed / 0.08) *
                (1 - Math.max(0, (state.barrage.elapsed - 0.42) / 0.22)))
            : '0';
        this.driveTime.textContent = state.overdrive.remaining.toFixed(1);
        this.driveFill.style.transform = `scaleX(${state.overdrive.remaining / overdriveRules.duration})`;
        this.hitCount.textContent = String(state.barrage?.hits ?? state.overdrive.hits);
        this.driveDamage.textContent = `${state.barrage?.damage ?? state.overdrive.damage} 피해`;
        this.driveRule.textContent = `${state.overdrive.chain % overdriveRules.finisherInterval} / ${overdriveRules.finisherInterval} · ${driveFinishers[state.overdrive.upcomingFinisher].name}`;
        this.returnSummary.hidden = state.phase !== 'returning';
        this.returnSummary.textContent = `${state.overdrive.hits}연타 · ${state.overdrive.damage} 피해`;
    }
    renderEffects(state) {
        this.root.classList.toggle('drive-revealed', state.phase === 'breaking' && state.phaseTime >= overdriveIntro.bannerAt);
        this.renderIntro(state);
        this.renderBarrage(state);
        this.renderDrive(state);
    }
    renderIntro(state) {
        if (state.phase === 'breaking' && this.scene) {
            this.sound.updateIntro(state.phaseTime);
            const direction = state.player.facing === 'left' ? -1 : 1;
            const hero = this.scene.project({
                x: state.player.x + introPose(state.phaseTime).offset * direction,
                z: state.player.z,
            }, overdriveIntro.fistHeight);
            const impact = introImpactPoint(state.player);
            const point = this.scene.project(impact, impact.height);
            const fist = this.scene.project({
                x: state.player.x +
                    direction * (overdriveIntro.lunge + overdriveIntro.fistReach),
                z: state.player.z,
            }, overdriveIntro.fistHeight);
            if (state.phaseTime >= overdriveIntro.impactAt && !this.glass.active) {
                this.glass.start(this.canvas, this.breakablePanels, {
                    x: point.x,
                    y: point.z,
                });
                this.root.classList.add('glass-impact');
                this.sound.strike();
            }
            if (this.glass.render(state.phaseTime)) {
                this.root.classList.add('glass-burst');
                this.sound.releasePower();
            }
            this.cinematic.render({
                time: state.phaseTime,
                width: this.canvas.clientWidth,
                height: this.canvas.clientHeight,
                hero: { x: hero.x, y: hero.z },
                fist: { x: fist.x, y: fist.z },
                impact: { x: point.x, y: point.z },
                direction,
            });
        }
    }
    renderBarrage(state) {
        if (state.barrage && this.scene) {
            const pose = barragePose(state.barrage);
            const hero = this.scene.project(pose.point, 1.05 + pose.height);
            const enemy = state.enemies.find((item) => item.id === state.barrage?.targetId);
            const target = this.scene.project(state.barrage.target, enemy?.kind === 'yeti' ? 1.8 : 0.85);
            this.cinematic.renderBarrage({
                state: state.barrage,
                width: this.canvas.clientWidth,
                height: this.canvas.clientHeight,
                hero: { x: hero.x, y: hero.z },
                target: { x: target.x, y: target.z },
                direction: pose.direction,
            });
        }
    }
    renderDrive(state) {
        const feedback = this.driveFeedback.snapshot;
        this.root.style.setProperty('--drive-impact-dim', this.reducedMotion ? '0' : feedback.dim.toFixed(3));
        if (state.phase !== 'breaking' &&
            state.phase !== 'ultimate' &&
            this.scene) {
            const scene = this.scene;
            const focus = scene.project(feedback.focus, 1);
            this.root.style.setProperty('--drive-impact-x', `${focus.x}px`);
            this.root.style.setProperty('--drive-impact-y', `${focus.z}px`);
            this.cinematic.renderDrive({
                feedback,
                width: this.canvas.clientWidth,
                height: this.canvas.clientHeight,
                project: (point, targetId) => {
                    const enemy = state.enemies.find((item) => item.id === targetId);
                    const projected = scene.project(point, enemy?.kind === 'yeti' ? 1.8 : 0.85);
                    return { x: projected.x, y: projected.z };
                },
            });
        }
    }
    clearEffects() {
        this.sound.stop();
        this.clearRageReveal();
        this.damageNumbers.clear();
        this.glass.clear();
        this.cinematic.clear();
        this.driveFeedback.reset();
        this.root.style.removeProperty('--drive-impact-dim');
        this.root.classList.remove('glass-impact', 'glass-burst', 'drive-revealed');
    }
    renderRageReveal(state) {
        const resting = this.paused || this.suspended || this.transitionBlocked;
        if (state.rage < rageRules.capacity) {
            this.clearRageReveal();
            return;
        }
        if (this.rageReveal === 'empty')
            this.rageReveal = 'pending';
        // 적 차례에 충전되어도 명령창이 보이는 내 차례까지 등장을 보류한다.
        if (this.rageReveal !== 'pending' || state.phase !== 'command' || resting)
            return;
        this.rageReveal = 'shown';
        this.commandPanel.classList.add('rage-revealing');
        this.rageGauge.classList.add('igniting');
        this.commands.get('ultimate').classList.add('revealing');
    }
    clearRageReveal() {
        if (this.rageReveal === 'empty')
            return;
        this.rageReveal = 'empty';
        this.commandPanel.classList.remove('rage-revealing');
        this.rageGauge.classList.remove('igniting');
        this.commands.get('ultimate').classList.remove('revealing');
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.lifetime.abort();
        cancelAnimationFrame(this.frameId);
        this.keys.clear();
        this.heldKeys.clear();
        this.clearEffects();
        this.glass.dispose();
        this.cinematic.dispose();
        this.labels.forEach((label) => label.button.remove());
        this.skillButtons.forEach((button) => button.remove());
        this.scene?.dispose();
        this.sound.dispose();
        this.view.host.remove();
    }
}
