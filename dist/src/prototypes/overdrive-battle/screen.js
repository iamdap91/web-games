import { isMonsterId, monsterBattleName } from './monster-catalog.js';
import { monsterIntentLabel } from './monster-intents.js';
import { battleHeading } from './battle-heading.js';
import { cardinalFacing } from '../../resources/characters/ataho/facing.js';
import { EquipmentHud } from '../../games/tiger-rpg/equipment-hud.js';
import { EquipmentMenuView } from '../../games/tiger-rpg/equipment-menu-view.js';
import { GameMenuView, } from '../../games/tiger-rpg/game-menu-view.js';
import { waitForRenderedFrame } from '../../games/tiger-rpg/screen-ready.js';
import { DamageNumbers } from './damage-numbers.js';
import { HealingNumbers } from './healing-numbers.js';
import { BattleVictory } from './battle-victory.js';
import { BattleSelection, commandAvailable, commandOrder, } from './battle-selection.js';
import { areaSkillRadius, battleSkills, } from './battle-skills.js';
import { drunkenRules } from './drunken-fist.js';
import { BattleWorld, battleRules, guardReductionPercent, } from './world.js';
import { BattleScene } from './scene.js';
import { BattleSound } from './battle-sound.js';
import { driveFinishers, overdriveRules } from './overdrive.js';
import { GlassShatter } from './glass-shatter.js';
import { introImpactPoint, introPose, overdriveIntro, } from './overdrive-intro.js';
import { OverdriveCinematic } from './overdrive-cinematic.js';
import { barragePose } from './tiger-barrage.js';
import { rageRules } from './rage.js';
import { armoredBoarRules } from './armored-boar.js';
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
    // 입장 값 검증을 화면·이벤트 생성보다 먼저 끝내 잘못된 입장이 수명을 남기지 않게 한다.
    const world = new BattleWorld(Math.random, options.entry);
    return new BattleScreen(options, world);
}
function previewSummary(preview) {
    const parts = [];
    if (preview.action === 'ice')
        parts.push('빙결');
    if (preview.moves.length)
        parts.push(`${preview.movementRequiresSurvival ? '생존 시 ' : ''}이동 ${preview.moves.length}체`);
    if (preview.shardTargetIds.length)
        parts.push(`파편 ${preview.shardTargetIds.length}체`);
    if (preview.collisionPairs.length)
        parts.push(`충돌 ${preview.collisionPairs.length}쌍`);
    if (preview.spreadTargetIds.length)
        parts.push(`불씨 확산 ${preview.spreadTargetIds.length}체`);
    if (preview.fieldMoves.length)
        parts.push(`장판 이동 ${preview.fieldMoves.length}개`);
    if (preview.spreadField)
        parts.push(`최종 장판 ${preview.fieldResults.length}개`);
    return parts.join(' · ');
}
const movementKeys = new Set([
    'ArrowUp',
    'ArrowLeft',
    'ArrowDown',
    'ArrowRight',
]);
const attackKeys = ['Space', 'KeyE'];
const armorReduction = guardReductionPercent(armoredBoarRules.armorMultiplier);
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
    ally: '아군',
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
    guardHint = this.element('#guard small');
    attackHint = this.element('#attack small');
    turnOrder = this.element('.turn-order');
    skillCommandName = this.element('#skill strong');
    skillCommandCost = this.element('#skill small');
    skillPanel = this.element('#skill-panel');
    skillDescription = this.element('#skill-description');
    skillButtons = new Map();
    drunkenStatus = this.element('#drunken-status');
    overdriveKey = this.element('#overdrive-key');
    overdriveCard = this.element('.overdrive-card');
    breakablePanels = [
        this.commandPanel,
        this.element('.hero-status'),
        this.turnOrder,
    ];
    victoryButton = this.element('#battle-victory');
    victoryHud = [
        this.element('.heading'),
        this.turnOrder,
        this.element('#message'),
        this.commandPanel,
        this.dock,
        this.element('#enemy-labels'),
        this.element('#damage-labels'),
        this.element('footer'),
    ];
    overlay = this.element('#overlay');
    menu = new GameMenuView(this.root, {
        getSoundEnabled: () => this.options.menu?.getSoundEnabled() ?? !this.sound.isMuted,
    });
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
    healingNumbers = new HealingNumbers(this.element('#damage-labels'));
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
    interactionLabels = this.element('#interaction-labels');
    fieldLabels = new Map();
    interactionNotices = [];
    visibleSkill = null;
    lastInteractionEvents = [];
    order = new Map();
    lifetime = new AbortController();
    keys = new Set();
    // 상태가 바뀌어 이동·공격 입력을 비워도 실제 키를 놓기 전에는 다시 받지 않는다.
    heldKeys = new Set();
    world;
    equipmentHud;
    equipmentMenu;
    selection;
    sound = new BattleSound();
    driveFeedback = new OverdriveFeedback();
    dev = new URLSearchParams(location.search).get('dev') === '1';
    reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    victory = new BattleVictory({
        reducedMotion: this.reducedMotion,
    });
    glass = new GlassShatter(this.shardContainer, this.reducedMotion);
    cinematic = new OverdriveCinematic(this.root, this.reducedMotion);
    scene = null;
    frameId = 0;
    previousTime = 0;
    phase = 'command';
    activeActorId = 0;
    rageReveal = 'empty';
    paused = false;
    transitionBlocked = false;
    returning = false;
    suspended = false;
    loaded = false;
    failed = false;
    disposed = false;
    constructor(options, world) {
        this.options = options;
        this.world = world;
        this.selection = new BattleSelection(this.world);
        const state = this.world.snapshot;
        this.root.dataset.encounter = options.entry.encounter;
        this.root.dataset.mode = state.advanced ? 'prototype' : 'turn';
        this.root.dataset.overdrive = String(state.overdriveUnlocked);
        this.root.dataset.interactionLab = String(options.entry.interactionLab ?? false);
        if (options.entry.interactionLab)
            this.view.host.dataset.embedded = 'true';
        if (!state.advanced) {
            this.view.host.dataset.embedded = 'true';
            this.canvas.setAttribute('aria-label', '산길 전투. 위아래 방향키로 공격, 기술, 방어를 고르고 Space로 선택합니다. 유일한 기술은 이름과 비용을 확인한 뒤 바로 선택합니다. 오른쪽 방향키는 기술 목록만 엽니다. 맹호각은 적의 다음 행동을 한 번 막습니다. 살아 있는 적이 하나면 단일 대상 행동을 즉시 실행하고, 여러 적이면 방향키로 대상을 고르고 Space 또는 클릭으로 실행합니다. Esc로 취소하거나 잠시 쉽니다.');
        }
        const heading = battleHeading(options.entry.encounter);
        this.element('h1').textContent = heading.title;
        this.element('.eyebrow').textContent = heading.region;
        if (options.entry.interactionLab) {
            this.element('h1').textContent = '속성 전투 실험';
            this.element('.eyebrow').textContent = '아타호 · 일반 턴 조합';
            this.canvas.setAttribute('aria-label', '속성 전투 실험. 위아래 방향키로 기술을 고르고 Space로 선택합니다. 방향키로 대상이나 바닥 범위를 고르고 Space로 실행합니다. 불장판은 빈 바닥에도 놓을 수 있습니다. Esc는 선택 취소, R은 오버드라이브입니다.');
        }
        if (options.entry.monsterFormation) {
            this.element('h1').textContent = '몬스터 전투 실험';
            this.element('.eyebrow').textContent = '독립 전투';
        }
        options.root.append(this.view.host);
        const orderList = this.element('.order-list');
        this.root.dataset.party = String(!!state.companion);
        const companionCard = this.element('#companion-card');
        companionCard.hidden = !state.companion;
        if (state.companion) {
            const portrait = companionCard.querySelector('img');
            portrait.src = portrait.dataset.src;
        }
        for (const button of this.root.querySelectorAll('[data-ally]')) {
            button.addEventListener('click', () => this.confirmTarget(Number(button.dataset.ally)), { signal: this.lifetime.signal });
        }
        for (const fighter of [
            state.player,
            ...(state.companion ? [state.companion] : []),
            ...state.enemies,
        ]) {
            if (orderList.childElementCount > 0) {
                const arrow = document.createElement('i');
                arrow.textContent = '›';
                orderList.append(arrow);
            }
            const item = document.createElement('span');
            item.textContent = fighter.kind === 'yeti' ? '예티' : fighter.name;
            item.classList.toggle('order-hero', fighter.id <= 0);
            orderList.append(item);
            this.order.set(fighter.id, item);
        }
        const equipmentRoot = this.element('#battle-equipment');
        const equipmentContext = options.menu?.equipment;
        const equipmentState = equipmentContext?.getState();
        const loadout = options.entry.equipmentLoadout ?? equipmentState?.loadout;
        // 메뉴도 입장 사본을 사용해 이후 마을의 장착과 전투 표시가 섞이지 않게 한다.
        const capturedEquipment = equipmentState && loadout
            ? {
                ...equipmentState,
                equipment: {
                    owned: { ...equipmentState.equipment.owned },
                    equipped: { ...equipmentState.equipment.equipped },
                },
                materials: { ...equipmentState.materials },
                facilities: { ...equipmentState.facilities },
                loadout: {
                    charm: loadout.charm ? { ...loadout.charm } : null,
                    bracer: loadout.bracer ? { ...loadout.bracer } : null,
                },
                canChange: false,
                unavailableReason: '전투 중에는 출발할 때 장착한 장비를 확인할 수 있습니다. 변경은 마을에서 가능합니다.',
            }
            : null;
        this.equipmentMenu =
            equipmentContext && capturedEquipment
                ? new EquipmentMenuView(this.menu, {
                    ...equipmentContext,
                    getState: () => capturedEquipment,
                })
                : null;
        equipmentRoot.hidden = !this.equipmentMenu;
        this.equipmentHud =
            equipmentRoot.hidden || !loadout
                ? null
                : new EquipmentHud(equipmentRoot, {
                    loadout,
                    onOpen: () => this.showEquipment(),
                });
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
        for (const id of new Set([
            ...state.availableSkills,
            ...(state.companion ? ['ward'] : []),
        ])) {
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
        this.victoryButton.addEventListener('click', () => this.confirmVictory({ freshPress: true }), { signal });
        const labelContainer = this.element('#enemy-labels');
        for (const enemy of this.world.snapshot.enemies) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'enemy-label';
            const name = document.createElement('span');
            name.className = 'enemy-name';
            const displayName = isMonsterId(enemy.kind)
                ? monsterBattleName(enemy.kind)
                : enemy.name;
            name.textContent = displayName;
            const value = document.createElement('span');
            name.append(value);
            const health = document.createElement('progress');
            health.max = enemy.maxHealth;
            health.setAttribute('aria-label', `${displayName} 체력`);
            const intent = document.createElement('span');
            intent.className = 'enemy-intent';
            intent.hidden = true;
            const frozen = document.createElement('span');
            frozen.className = 'interaction-status frozen';
            frozen.hidden = true;
            const ember = document.createElement('span');
            ember.className = 'interaction-status ember';
            ember.hidden = true;
            button.append(name, intent, frozen, ember, health);
            button.addEventListener('click', () => {
                this.confirmTarget(enemy.id);
            }, { signal });
            button.addEventListener('focus', () => {
                if (this.selection.snapshot.pendingCommand !== null &&
                    !this.selection.selectingAlly)
                    this.world.selectTarget(enemy.id);
            }, { signal });
            labelContainer.append(button);
            this.labels.set(enemy.id, {
                button,
                health,
                value,
                intent,
                frozen,
                ember,
            });
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
        this.element('#reset').addEventListener('click', () => this.reset(), {
            signal,
        });
        this.element('#battle-menu').addEventListener('click', () => this.openMenu(), { signal });
        this.element('#sound').addEventListener('click', () => this.toggleMenuSound(), { signal });
        if (options.menu)
            this.setSoundEnabled(options.menu.getSoundEnabled());
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
        if (this.disposed || this.transitionBlocked)
            return;
        if (this.victory.snapshot.visible)
            this.victoryButton.focus();
        else
            this.canvas.focus();
    }
    openMenu() {
        if (this.disposed || this.transitionBlocked || this.returning)
            return;
        this.setPaused(true);
    }
    setSoundEnabled(enabled) {
        if (this.disposed)
            return;
        this.sound.setMuted(!enabled);
        const button = this.element('#sound');
        button.textContent = enabled ? '소리 켬' : '소리 끔';
        button.setAttribute('aria-pressed', String(!enabled));
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
                ...(this.world.snapshot.overdriveUnlocked
                    ? [this.cinematic.load(), this.sound.load(this.lifetime.signal)]
                    : []),
            ]);
            if (this.disposed)
                return;
            this.loaded = true;
            // 로딩 완료는 화면 전환 잠금과 별개다. 암전 뒤 준비 화면이 남지 않게 한다.
            this.overlay.hidden = true;
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
        if (this.menu.visible || this.transitionBlocked || this.returning)
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
        if (this.victory.snapshot.visible) {
            if (movementKeys.has(event.code) ||
                attackKeys.includes(event.code) ||
                ['Escape', 'KeyR'].includes(event.code))
                event.preventDefault();
            if (event.code === 'Space')
                this.confirmVictory({ freshPress: firstPress });
            return;
        }
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
            !event.target.matches('.commands button, .skill-list button, .overdrive-trigger, .enemy-label, [data-ally]'))
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
                        this.selection.cycleTarget(direction);
                    else if (event.code === 'ArrowLeft' && selection.skillsOpen)
                        this.cancelSelection();
                    else if (event.code === 'ArrowRight') {
                        if (!selection.skillsOpen && selection.selectedCommand === 'skill')
                            this.openSkills();
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
    openSkills() {
        if (!this.loaded || this.paused || this.suspended || this.failed)
            return;
        if (!this.selection.openSkills())
            return;
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
    toggleMenuSound() {
        if (this.disposed || this.transitionBlocked || this.returning)
            return;
        const enabled = !(this.options.menu?.getSoundEnabled() ?? !this.sound.isMuted);
        this.options.menu?.onSoundChange(enabled);
        this.setSoundEnabled(enabled);
        if (this.paused && this.menu.visible)
            this.showPauseMenu();
    }
    showPauseMenu(initialId) {
        const items = [
            {
                id: 'resume',
                label: '계속하기',
                onSelect: () => this.setPaused(false),
            },
            {
                id: 'sound',
                label: `소리: ${this.sound.isMuted ? '끔' : '켬'}`,
                description: this.world.snapshot.advanced
                    ? '전투 효과음의 재생 여부를 바꿉니다.'
                    : '현재 산길 전투는 무음입니다. 설정은 다음 채집·전투에도 적용됩니다.',
                onSelect: () => this.toggleMenuSound(),
            },
            {
                id: 'help',
                label: '조작 안내',
                onSelect: () => this.showControlsHelp(),
            },
        ];
        if (this.equipmentMenu)
            items.splice(1, 0, {
                id: 'equipment',
                label: '장비',
                description: '출발할 때 장착한 장비와 효과를 확인합니다.',
                onSelect: () => this.showEquipment(),
            });
        const failure = this.options.menu?.getSaveFailure();
        if (failure)
            items.push({
                id: 'save-retry',
                label: '저장 다시 시도',
                description: failure,
                onSelect: () => {
                    if (this.disposed || this.transitionBlocked || this.returning)
                        return;
                    this.options.menu?.onRetrySave();
                    if (!this.disposed && !this.transitionBlocked)
                        this.showPauseMenu();
                },
            });
        if (!this.world.snapshot.advanced)
            items.push({
                id: 'return',
                label: this.options.entry.encounter === 'mushroom-pack'
                    ? '전투 끝내기'
                    : '마을로 돌아가기',
                onSelect: () => this.returnToCaller(),
            });
        this.menu.show({
            title: '잠깐 숨 고르기',
            // 귀환 버튼을 누르는 동안 설명이 펼쳐져 버튼 위치가 바뀌지 않게 한다.
            description: this.world.snapshot.advanced
                ? undefined
                : this.options.entry.encounter === 'mushroom-pack'
                    ? '전투를 끝낸 뒤 부적을 바꾸어 다시 시작할 수 있습니다.'
                    : '마을로 돌아가면 탐험을 마칩니다. 자원은 잃지 않습니다.',
            items,
            initialId,
            onCancel: () => this.setPaused(false),
        });
    }
    showEquipment() {
        if (!this.equipmentMenu ||
            this.disposed ||
            this.transitionBlocked ||
            this.returning)
            return;
        if (!this.paused)
            this.setPaused(true);
        if (!this.paused)
            return;
        this.equipmentMenu.showEquipment({
            onBack: () => this.showPauseMenu('equipment'),
        });
    }
    showControlsHelp() {
        if (!this.paused ||
            this.disposed ||
            this.transitionBlocked ||
            this.returning)
            return;
        const state = this.world.snapshot;
        const guardReduction = state.guardDamageMultiplier === 0.5
            ? '절반으로'
            : `${guardReductionPercent(state.guardDamageMultiplier)}%`;
        const sections = [
            {
                title: '행동과 대상 선택',
                lines: [
                    '↑↓로 행동을 고르고 Space 또는 클릭·터치로 선택합니다. 기술이 하나면 바로 선택하고, 여러 개면 목록에서 고릅니다.',
                    '→는 기술 수와 관계없이 목록만 엽니다. 기술 이름·기력 비용·설명을 확인한 뒤 확정하세요.',
                    '단일 대상 행동은 살아 있는 적이 하나면 즉시 실행합니다. 여러 적이 있으면 방향키로 대상을 고르고 Space 또는 클릭으로 실행합니다.',
                    ...(state.availableSkills.includes('sweep')
                        ? [
                            '선풍각은 방향키 또는 마우스로 바닥 범위를 정하고 Space 또는 클릭으로 실행합니다.',
                        ]
                        : []),
                    'Esc는 대상 선택을 취소합니다. 기술창에서는 ← / Esc로 돌아갑니다.',
                    'Tab으로도 버튼을 고를 수 있고 클릭·터치로 실행할 수 있습니다.',
                ],
            },
            {
                title: '턴제 전투',
                lines: [
                    `공격은 기력 +${state.basicAttackStaminaRecovery}, 방어는 이번 적 차례의 피해를 ${guardReduction} 줄이고 기력 +4를 회복합니다.`,
                    '행동을 마치면 적의 차례가 이어집니다. 선택 중에는 턴이 진행되지 않습니다.',
                    'Esc 또는 메뉴 버튼으로 쉬고, 계속하기를 고르면 이어서 진행합니다.',
                ],
            },
        ];
        if (state.availableSkills.length > 0)
            sections.push({
                title: '기술',
                lines: state.availableSkills.map((id) => {
                    const skill = battleSkills[id];
                    return `${skill.name} · 기력 ${skill.cost} 소모. ${skill.description}`;
                }),
            });
        if (state.overdriveUnlocked && !state.advanced)
            sections.push({
                title: '오버드라이브',
                lines: [
                    '공격·기술·방어로 게이지를 채웁니다. 내 차례에 R 또는 오버드라이브 버튼으로 발동합니다.',
                    '8초 동안 방향키로 이동하고 Space를 길게 눌러 연속 공격합니다. 시간이 끝나면 턴제로 돌아옵니다.',
                ],
            });
        if (state.advanced)
            sections.push({
                title: '오버드라이브와 분노',
                lines: [
                    '오버드라이브 게이지가 가득 찬 내 차례에 R로 발동합니다. 취권 중에는 사용할 수 없습니다.',
                    '오버드라이브 중에는 방향키로 이동하고 Space 또는 E를 길게 눌러 연속 공격합니다.',
                    '분노가 가득 차면 초구취호패타 선택지가 나타납니다.',
                    '개발 탭에서 분노·오버드라이브 게이지를 조절할 수 있습니다.',
                ],
            });
        if (this.options.entry.encounter.startsWith('trail-'))
            sections.push({
                title: '두 번째 원정',
                lines: [
                    '남은 체력은 다음 전투로 이어집니다. 패배하거나 철수하면 원정을 마치고 마을로 돌아갑니다.',
                    '예티는 힘을 모은 다음 차례에 강공격합니다. 방어로 피해를 줄이거나 맹호각으로 강공격을 끊으면 다음 한 번의 타격 피해가 2배가 됩니다.',
                ],
            });
        if (state.healer)
            sections.push({
                title: '버섯 정령',
                lines: [
                    '정령은 회복을 준비한 다음 자기 차례에 가장 다친 생존 동료 한 마리를 최대 24 회복합니다.',
                    '맹호각으로 정령의 차례를 막으면 회복 준비도 취소됩니다. 정령은 다시 준비해야 합니다.',
                    ...(this.options.entry.encounter === 'mushroom-pack'
                        ? [
                            '부적 선택은 다음 전투 시작에 적용됩니다. 이 전투는 저장이나 보상이 없습니다.',
                        ]
                        : [
                            '정령을 먼저 처치하거나 슬라임부터 줄여 받는 피해를 낮출 수 있습니다. 장비 변경은 다음 원정부터 적용됩니다.',
                        ]),
                ],
            });
        sections.push(...(this.options.menu?.helpSections ?? []));
        this.menu.showHelp({
            title: '전투 조작 안내',
            sections,
            onBack: () => this.showPauseMenu('help'),
        });
    }
    showVictory() {
        this.menu.close();
        this.victory.show();
        this.renderVictory();
        this.focus();
    }
    renderVictory() {
        const state = this.victory.snapshot;
        this.victoryButton.hidden = !state.visible;
        this.victoryButton.setAttribute('aria-disabled', String(!state.canConfirm));
        this.root.dataset.victory = String(state.visible);
        this.root.style.setProperty('--victory-progress', String(state.progress));
        for (const node of this.victoryHud)
            node.inert = state.visible;
    }
    confirmVictory(input) {
        if (this.disposed ||
            this.failed ||
            this.paused ||
            this.suspended ||
            this.transitionBlocked ||
            this.returning ||
            !this.canContinueExploration(this.world.snapshot))
            return;
        if (this.victory.confirm(input))
            this.returnToCaller();
    }
    showResultMenu(state) {
        const items = [];
        if (state.advanced ||
            (this.options.entry.encounter === 'first-expedition' &&
                state.phase === 'defeat'))
            items.push({
                id: 'retry',
                label: '다시 대결',
                onSelect: () => this.reset(),
            });
        if (this.options.entry.monsterFormation)
            items.push({
                id: 'return',
                label: '편성으로 돌아가기',
                onSelect: () => this.returnToCaller(),
            });
        else if (!state.advanced)
            items.push({
                id: 'return',
                label: this.options.entry.encounter === 'mushroom-pack'
                    ? '전투 끝내기'
                    : '마을로 돌아가기',
                onSelect: () => this.returnToCaller(),
            });
        this.menu.show({
            title: state.phase === 'victory' ? '승리!' : '이번에는 여기까지',
            description: state.advanced
                ? `${state.message}${state.overdrive.hits > 0 ? `\n마지막 오버드라이브 ${state.overdrive.hits}연타 · ${state.overdrive.damage} 피해` : ''}`
                : this.options.entry.encounter === 'mushroom-pack'
                    ? '다른 부적을 골라 다시 도전해보세요. 보상과 저장은 없습니다.'
                    : this.options.entry.encounter === 'first-expedition'
                        ? '자원은 잃지 않습니다. 다시 도전하거나 마을로 돌아갈 수 있습니다.'
                        : '원정을 마치고 마을로 돌아갑니다. 자원은 잃지 않습니다.',
            items,
            onCancel: null,
        });
    }
    canContinueExploration(state) {
        return state.phase === 'victory' && !state.advanced;
    }
    returnToCaller() {
        if (this.disposed ||
            this.returning ||
            this.transitionBlocked ||
            (this.world.snapshot.advanced && !this.options.entry.monsterFormation))
            return;
        const phase = this.world.snapshot.phase;
        let outcome;
        if (phase === 'victory' || phase === 'defeat')
            outcome = phase;
        else if (this.paused || this.failed)
            outcome = 'retreat';
        else
            return;
        const result = {
            battleId: this.options.entry.battleId,
            outcome,
            playerHp: this.world.snapshot.player.health,
            overdriveGauge: this.world.snapshot.overdrive.gauge,
            ...(this.world.snapshot.companion
                ? {
                    companion: {
                        id: 'yeonmuk',
                        hp: this.world.snapshot.companion.health,
                    },
                }
                : {}),
        };
        // 암전 동안 마지막 전투 장면은 유지하고 진행·입력만 멈춘다.
        this.returning = true;
        this.menu.close();
        this.setTransitionBlocked(true);
        this.options.onReturn(result);
    }
    reset() {
        if (!this.loaded ||
            this.failed ||
            this.disposed ||
            this.transitionBlocked ||
            this.returning)
            return;
        if (!this.world.snapshot.advanced &&
            (this.options.entry.encounter !== 'first-expedition' ||
                this.world.snapshot.phase !== 'defeat'))
            return;
        this.world.reset();
        this.victory.reset();
        this.renderVictory();
        this.scene?.reset();
        this.phase = 'command';
        this.selection.reset();
        this.keys.clear();
        this.clearEffects();
        this.setPaused(false);
        this.canvas.focus();
    }
    setPaused(paused) {
        if (!this.loaded ||
            this.failed ||
            this.disposed ||
            this.transitionBlocked ||
            this.returning)
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
        this.overlay.hidden = true;
        if (paused)
            this.showPauseMenu();
        else {
            this.menu.close();
            this.focus();
        }
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
        this.equipmentHud?.setVisible(!blocked);
        if (blocked)
            this.menu.close();
        else if (this.paused && !this.returning && !this.failed)
            this.showPauseMenu();
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
        this.victory.reset();
        this.renderVictory();
        this.keys.clear();
        cancelAnimationFrame(this.frameId);
        this.sound.stop();
        this.overlay.hidden = true;
        this.menu.show({
            title: '대결을 준비하지 못했어요',
            description: message,
            items: this.world.snapshot.advanced
                ? [
                    {
                        id: 'reload',
                        label: '다시 열기',
                        onSelect: () => location.reload(),
                    },
                ]
                : [
                    {
                        id: 'return',
                        label: this.options.entry.encounter === 'mushroom-pack'
                            ? '전투 끝내기'
                            : '마을로 돌아가기',
                        onSelect: () => this.returnToCaller(),
                    },
                ],
            onCancel: null,
        });
    }
    changePhase(state) {
        if (state.phase === this.phase &&
            state.activeActorId === this.activeActorId)
            return;
        this.phase = state.phase;
        this.activeActorId = state.activeActorId;
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
            this.overlay.hidden = true;
            if (this.canContinueExploration(state))
                this.showVictory();
            else
                this.showResultMenu(state);
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
        this.victory.update(dt);
        const impacts = this.world.takeImpacts();
        const healings = this.world.takeHealings();
        const interactionEvents = this.world.takeInteractionEvents();
        if (interactionEvents.length)
            this.lastInteractionEvents = interactionEvents;
        this.scene?.addInteractionEvents(interactionEvents);
        this.addInteractionNotices(interactionEvents);
        const state = this.world.snapshot;
        const preview = this.selection.preview;
        this.driveFeedback.update(dt, state);
        this.driveFeedback.addImpacts(impacts);
        this.scene?.addImpacts(impacts);
        this.scene?.addHealings(healings);
        for (const healing of healings)
            this.healingNumbers.add(healing);
        for (const impact of impacts) {
            this.damageNumbers.add(impact);
            this.sound.impact(impact);
        }
        this.scene?.render(state, dt, {
            selectingTarget: this.selection.snapshot.pendingCommand !== null &&
                !this.selection.selectingAlly,
            affectedIds: this.selection.affectedTargets(state),
            areaCenter: this.selection.selectingArea
                ? (preview?.center ?? this.selection.snapshot.areaCenter)
                : null,
            areaRadius: this.selection.selectingArea
                ? (preview?.radius ??
                    areaSkillRadius(this.selection.snapshot.selectedSkill))
                : null,
            preview: this.selection.snapshot.pendingCommand !== null ? preview : null,
        }, this.driveFeedback.snapshot);
        this.changePhase(state);
        this.renderHud(state);
        this.renderVictory();
        this.renderEffects(state);
        this.renderInteractionLabels(state, dt);
        this.damageNumbers.update(dt, (impact, height) => this.scene?.project(impact, height));
        this.healingNumbers.update(dt, (point, height) => this.scene?.project(point, height));
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
                interactionPreview: preview,
                interactionEvents: this.lastInteractionEvents,
                ...this.scene?.diagnostics,
            });
    }
    positionCommands(state) {
        // 낮은 통합 화면은 세 명령과 상태를 하단 좌우에 두어 전장을 확보한다.
        const compact = (!state.advanced || state.interactions !== null) &&
            this.root.clientHeight <= 450;
        this.root.dataset.compact = String(compact);
        const feet = this.scene?.project(state.activeActorId === 0
            ? state.player
            : (state.companion ?? state.player));
        if (!feet)
            return;
        const width = this.commandPanel.offsetWidth +
            (this.skillPanel.hidden ? 0 : this.skillPanel.offsetWidth + 10);
        const height = state.interactions !== null
            ? this.commandPanel.offsetHeight
            : Math.max(this.commandPanel.offsetHeight, this.skillPanel.hidden ? 0 : this.skillPanel.offsetHeight);
        const inset = state.interactions !== null
            ? Math.min(this.dock.offsetLeft, this.root.clientWidth -
                this.dock.offsetLeft -
                this.dock.offsetWidth)
            : this.dock.offsetLeft;
        const left = Math.max(inset, Math.min(feet.x - this.commandPanel.offsetWidth * 0.5, this.root.clientWidth - width - inset));
        // 아타호 발밑을 기준으로 두되 하단 상태창과 겹치지 않게 제한한다.
        const top = Math.max(inset, compact
            ? this.root.clientHeight - height - 32
            : Math.min(feet.z + 18, this.dock.offsetTop - height - 16));
        const partyLeft = Math.min(this.root.clientWidth - width - inset, this.dock.offsetLeft +
            this.element('.hero-status').offsetWidth +
            this.element('#companion-card').offsetWidth +
            36);
        const partyTop = Math.max(inset, this.root.clientHeight - height - 64);
        this.commandPanel.style.left = `${state.companion ? partyLeft : compact ? inset : left}px`;
        this.commandPanel.style.top = `${state.companion ? partyTop : top}px`;
        if (state.interactions !== null && !this.skillPanel.hidden) {
            const panelTop = Math.max(inset, Math.min(top, this.root.clientHeight - this.skillPanel.offsetHeight - 32));
            this.skillPanel.style.top = `${panelTop - top}px`;
        }
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
            button.hidden = !state.availableSkills.includes(id);
            const unavailable = state.energy < battleSkills[id].cost;
            button.disabled = !choosing || this.paused || this.suspended;
            button.setAttribute('aria-disabled', String(unavailable || button.disabled));
            button.classList.toggle('unavailable', unavailable);
            button.classList.toggle('selected', id === selection.selectedSkill);
            button.setAttribute('aria-current', String(id === selection.selectedSkill));
        }
        if (skills && this.visibleSkill !== selection.selectedSkill) {
            const button = this.skillButtons.get(selection.selectedSkill);
            const list = this.element('#skill-list');
            if (button) {
                const bounds = button.getBoundingClientRect();
                const viewport = list.getBoundingClientRect();
                if (bounds.top < viewport.top)
                    list.scrollTop += bounds.top - viewport.top;
                else if (bounds.bottom > viewport.bottom)
                    list.scrollTop += bounds.bottom - viewport.bottom;
            }
            this.visibleSkill = selection.selectedSkill;
        }
        if (!skills)
            this.visibleSkill = null;
        const soleSkillId = state.availableSkills.length === 1 ? state.availableSkills[0] : undefined;
        const soleSkill = soleSkillId ? battleSkills[soleSkillId] : undefined;
        this.skillCommandName.textContent = soleSkill?.name ?? '기술';
        this.skillCommandCost.textContent = soleSkill
            ? `기력 ${soleSkill.cost}`
            : '목록 ▸';
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
                    (state.activeActorId !== 0 ||
                        !state.advanced ||
                        state.rage < rageRules.capacity)) ||
                    (name === 'overdrive' && !state.overdriveUnlocked) ||
                    (name === 'skill' && state.availableSkills.length === 0);
            button.disabled =
                this.paused || this.suspended || !commandAvailable(name, state);
            const selected = choosing && name === selection.selectedCommand;
            button.classList.toggle('selected', selected);
            button.classList.toggle('kick-guidance', name === 'skill' &&
                state.kickGuidance &&
                choosing &&
                !skills &&
                !targeting &&
                !button.disabled);
            button.setAttribute('aria-current', String(selected));
        }
        const target = this.selection.selectingAlly
            ? [state.player, ...(state.companion ? [state.companion] : [])].find((ally) => ally.id === selection.allyTargetId)
            : state.enemies.find((enemy) => enemy.id === state.targetId);
        const affected = this.selection.affectedTargets(state).length;
        const preview = this.selection.preview;
        const prediction = preview ? previewSummary(preview) : '';
        const placingField = area && selection.selectedSkill === 'fire-field';
        this.targetName.textContent = area
            ? placingField
                ? `바닥 지정 · 적 ${affected}체 포함`
                : `범위 안 ${affected}체 · 방향키로 위치 이동`
            : targeting && target
                ? `대상: ${target.name}`
                : skills
                    ? '← / Esc 돌아가기'
                    : '↑↓ 이동 · Space 선택';
        const soleSkillDescription = soleSkill
            ? `${soleSkill.name} · 기력 ${soleSkill.cost} · ${skillTargetLabels[soleSkill.target]} · ${soleSkill.description}${state.energy < soleSkill.cost ? ' 기력이 부족합니다.' : ''}`
            : '';
        this.commands
            .get('skill')
            .setAttribute('aria-label', soleSkillDescription || '기술 목록 열기');
        const commandMessage = state.activeActorId !== 0 && !skills
            ? '연묵의 차례 · 부적 공격 또는 호신부로 동료를 지켜주세요.'
            : soleSkill && selection.selectedCommand === 'skill'
                ? [
                    soleSkillDescription,
                    ...(state.kickGuidance
                        ? ['맹호각으로 슬라임의 다음 공격을 끊어보자.']
                        : []),
                ].join(' ')
                : state.kickGuidance
                    ? '맹호각으로 슬라임의 다음 공격을 끊어보자.'
                    : state.boar?.ready
                        ? '멧돼지가 돌진을 준비했습니다. 방어하거나 맹호각으로 끊으면 빈틈을 노릴 수 있습니다.'
                        : this.options.entry.interactionLab
                            ? '얼리기 → 바람 모으기 → 일반 공격 · 불씨/불장판 → 바람'
                            : state.overdriveUnlocked &&
                                state.overdrive.gauge >= overdriveRules.capacity
                                ? '기가 가득 찼다! R · 오버드라이브 — 방향키 이동, Space 공격'
                                : state.healer?.ready
                                    ? '버섯 정령이 회복을 준비했습니다. 맹호각으로 끊거나 정령을 처치하세요.'
                                    : state.boss?.ready
                                        ? '예티의 강공격이 다가옵니다. 방어 또는 맹호각!'
                                        : state.boar?.exposed
                                            ? '갑옷의 빈틈이 드러났다! 다음 돌진 준비 전에 공격을 몰아치자.'
                                            : state.boar
                                                ? `갑옷은 피해를 ${armorReduction}% 줄입니다. 돌진 뒤나 맹호각으로 균형을 무너뜨린 뒤가 기회입니다.`
                                                : '아타호의 차례. 사용할 행동을 골라보세요.';
        this.message.textContent = area
            ? placingField || affected > 0 || (preview?.fieldMoves.length ?? 0) > 0
                ? `${selectedSkill.name} · ${placingField ? '빈 바닥도 가능' : `${affected}체 포함`}${prediction ? ` · ${prediction}` : ''} · Space 확정`
                : `${selectedSkill.name} · 범위에 대상이 없습니다. 위치를 옮겨주세요.`
            : targeting
                ? `${selection.pendingCommand === 'skill' ? selectedSkill.name : commandNames[selection.pendingCommand]}${prediction ? ` · ${prediction}` : ''} · Space 실행`
                : choosing
                    ? commandMessage
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
                    ? this.canContinueExploration(state)
                        ? this.options.entry.encounter === 'mushroom-pack'
                            ? 'Space 또는 클릭으로 전투 끝내기'
                            : this.options.entry.encounter === 'mushroom-grove'
                                ? 'Space 또는 클릭으로 버섯숲 복귀'
                                : 'Space 또는 클릭으로 산길 복귀'
                        : 'Space 또는 클릭으로 마을 귀환'
                    : '↑↓ 선택 · Space 또는 클릭으로 확정';
    }
    renderParty(state) {
        const companion = state.companion;
        if (!companion)
            return;
        const actor = state.activeActorId === 0 ? state.player : companion;
        this.element('#command-actor').textContent = actor.name;
        this.skillPanel.setAttribute('aria-label', `${actor.name} 기술`);
        this.element('.hero-status').classList.toggle('current-actor', actor.id === 0 && state.phase === 'command');
        this.element('.hero-status').classList.toggle('incapacitated', state.player.health === 0);
        this.element('.hero-status').classList.toggle('protected', state.protectedId === 0);
        const card = this.element('#companion-card');
        card.classList.toggle('current-actor', actor.id === companion.id && state.phase === 'command');
        card.classList.toggle('incapacitated', companion.health === 0);
        card.classList.toggle('protected', state.protectedId === companion.id);
        this.element('#companion-health').max =
            companion.maxHealth;
        this.element('#companion-health').value =
            companion.health;
        this.element('#companion-health-label').textContent =
            `${companion.health} / ${companion.maxHealth}`;
        this.element('#companion-status').textContent =
            companion.health === 0
                ? '전투불능'
                : state.protectedId === companion.id
                    ? '호신부 · 다음 피격 ½'
                    : state.companionGuarding
                        ? '방어 · 피해 ½'
                        : state.phase === 'overdrive' ||
                            state.phase === 'breaking' ||
                            state.phase === 'returning'
                            ? '아타호의 연격을 기다리는 중'
                            : actor.id === companion.id
                                ? '행동 선택'
                                : '대기';
        const selecting = this.selection.selectingAlly && state.phase === 'command';
        this.element('#party-targets').hidden = !selecting;
        for (const button of this.root.querySelectorAll('[data-ally]')) {
            const id = Number(button.dataset.ally);
            const ally = id === 0 ? state.player : companion;
            button.disabled = this.paused || this.suspended || ally.health <= 0;
            button.classList.toggle('selected', id === this.selection.snapshot.allyTargetId);
            button.setAttribute('aria-current', String(id === this.selection.snapshot.allyTargetId));
        }
    }
    renderHud(state) {
        this.root.dataset.phase = state.phase;
        const command = state.phase === 'command' && !this.paused && !this.suspended;
        const selectingTarget = state.phase === 'command' &&
            this.selection.snapshot.pendingCommand !== null;
        this.renderParty(state);
        this.renderSelection(state);
        this.renderRageReveal(state);
        this.renderDevelopmentPanel(state);
        this.health.max = state.player.maxHealth;
        const companionTurn = state.activeActorId !== 0;
        this.attackHint.textContent = companionTurn
            ? '원거리 · 피해 20'
            : `기력 +${state.basicAttackStaminaRecovery}`;
        this.guardHint.textContent = companionTurn
            ? '이번 적 차례 피해 ½'
            : state.guardDamageMultiplier === 0.5
                ? '피해 ½ · 기력 +4'
                : `피해 −${guardReductionPercent(state.guardDamageMultiplier)}% · 기력 +4`;
        this.health.value = state.player.health;
        this.energy.value = state.energy;
        this.gauge.value = state.overdrive.gauge;
        this.overdriveCard.style.setProperty('--drive-fill', String(state.overdrive.gauge / overdriveRules.capacity));
        const locked = state.drunken.turns > 0 || state.player.health <= 0;
        const driveReady = !locked && state.overdrive.gauge >= overdriveRules.capacity;
        this.overdriveCard.classList.toggle('locked', locked);
        this.overdriveKey.classList.toggle('lock-icon', locked);
        this.overdriveKey.textContent = locked ? '' : 'R';
        this.commands
            .get('overdrive')
            .setAttribute('aria-label', state.player.health <= 0
            ? '아타호 전투불능 · 오버드라이브 사용 불가'
            : locked
                ? `취권 ${state.drunken.turns}턴 동안 오버드라이브 사용 불가`
                : '아타호 오버드라이브 발동 (R)');
        this.drunkenStatus.hidden =
            state.player.health <= 0 || (!locked && state.drunken.drinks === 0);
        this.drunkenStatus.textContent = locked
            ? `취권 ${state.drunken.turns}턴 · 치명타 ${Math.round(drunkenRules.drunkenCriticalChance * 100)}%`
            : `한 잔~ ${state.drunken.drinks} / ${drunkenRules.drinksToActivate}`;
        this.drunkenStatus.classList.toggle('active', locked);
        this.overdriveCard.classList.toggle('ready', driveReady);
        this.healthLabel.textContent = `${state.player.health} / ${state.player.maxHealth}`;
        this.energyLabel.textContent = `${state.energy} / ${battleRules.maxEnergy}`;
        this.gaugeLabel.textContent =
            state.player.health <= 0
                ? '전투불능'
                : locked
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
                        : companionTurn
                            ? '연묵의 차례'
                            : '아타호의 차례';
        this.order.forEach((node, id) => {
            node.classList.toggle('active', id <= 0
                ? id === state.activeActorId &&
                    state.phase !== 'enemy-turn' &&
                    state.phase !== 'victory' &&
                    state.phase !== 'defeat'
                : state.action?.actorId === id ||
                    (state.healer?.enemyId === id &&
                        state.healer.targetId !== null) ||
                    state.monsterStates.some((monster) => monster.enemyId === id && monster.healingTargetId !== null));
            node.classList.toggle('dead', (id === 0
                ? state.player
                : id === state.companion?.id
                    ? state.companion
                    : state.enemies.find((enemy) => enemy.id === id))?.health === 0);
        });
        const affectedIds = this.selection.affectedTargets(state);
        for (const enemy of state.enemies) {
            const label = this.labels.get(enemy.id);
            label.button.hidden = enemy.health <= 0;
            const selected = enemy.id === state.targetId &&
                ((selectingTarget &&
                    !this.selection.selectingArea &&
                    !this.selection.selectingAlly) ||
                    state.phase === 'overdrive');
            label.button.disabled =
                !command ||
                    !selectingTarget ||
                    this.selection.selectingArea ||
                    this.selection.selectingAlly;
            label.button.classList.toggle('selected', selected);
            label.button.classList.toggle('affected', affectedIds.includes(enemy.id));
            label.button.classList.toggle('staggered', enemy.staggered);
            const frozen = state.interactions?.frozen.find((item) => item.enemyId === enemy.id);
            const ember = state.interactions?.embers.find((item) => item.enemyId === enemy.id);
            const holding = ['breaking', 'overdrive', 'returning'].includes(state.phase)
                ? ' · 유지'
                : '';
            label.frozen.hidden = !frozen;
            label.frozen.textContent = frozen
                ? `빙결 ${frozen.remainingTurns}턴${holding}`
                : '';
            label.ember.hidden = !ember;
            label.ember.textContent = ember
                ? `불씨 ${ember.remainingTurns}턴${holding}`
                : '';
            label.button.classList.toggle('frozen', !!frozen);
            label.button.classList.toggle('ember', !!ember);
            const yeti = state.boss?.enemyId === enemy.id;
            const boar = state.boar?.enemyId === enemy.id;
            const boss = yeti || boar;
            const healer = state.healer?.enemyId === enemy.id;
            const healingReady = healer && state.healer.ready;
            const healing = healer && state.healer.targetId !== null;
            const healingTarget = state.enemies.find((ally) => ally.id === state.healer?.targetId);
            const monster = state.monsterStates.find((monster) => monster.enemyId === enemy.id);
            const receivingHeal = state.healer?.targetId === enemy.id ||
                state.monsterStates.some((monster) => monster.healingTargetId === enemy.id);
            const heavyAttack = boss &&
                state.action?.kind === 'enemy' &&
                state.action.actorId === enemy.id;
            const charged = heavyAttack ||
                (yeti && state.boss.ready) ||
                (boar && state.boar.ready);
            const blocked = state.blockedEnemyId === enemy.id;
            label.intent.hidden = !boss && !healer && !blocked && !receivingHeal;
            label.intent.textContent = blocked
                ? healer
                    ? '회복 준비 취소'
                    : '행동 차단'
                : healer
                    ? healing
                        ? `${healingTarget?.name ?? '동료'} 회복!`
                        : healingReady
                            ? '다음: 회복 · 맹호각으로 취소'
                            : '다친 동료를 회복'
                    : receivingHeal
                        ? '정령의 회복 대상'
                        : !boss
                            ? ''
                            : boar
                                ? heavyAttack
                                    ? '돌진!'
                                    : charged
                                        ? '다음: 돌진 · 방어/맹호각'
                                        : state.boar.exposed
                                            ? '갑옷의 빈틈 · 피해 감소 없음'
                                            : `갑옷 · 피해 ${armorReduction}% 감소`
                                : heavyAttack
                                    ? '강공격!'
                                    : charged
                                        ? '다음: 강공격 · 방어/맹호각'
                                        : state.boss.exposed
                                            ? '빈틈! 다음 타격 2배'
                                            : '다음: 기 모으기';
            if (monster) {
                label.intent.hidden = false;
                label.intent.textContent = monsterIntentLabel(monster, state);
            }
            const intentTargetId = state.enemyTargets.find((intent) => intent.enemyId === enemy.id)?.targetId;
            if (intentTargetId !== undefined &&
                !healer &&
                !(monster?.role === 'support' &&
                    (monster.ready || monster.healingTargetId !== null))) {
                label.intent.hidden = false;
                const allyName = intentTargetId === 0 ? '아타호' : '연묵';
                label.intent.textContent = `${label.intent.textContent || '공격'}\n→ ${allyName}`;
            }
            if (monster && receivingHeal)
                label.intent.textContent += '\n회복 받는 중';
            label.intent.textContent = label.intent.textContent
                .replace(' · 방어/맹호각', '\n방어/맹호각')
                .replace(' · 맹호각', '\n맹호각')
                .replace(' · 없으면 공격', '\n없으면 공격');
            label.button.classList.toggle('action-blocked', blocked);
            label.button.classList.toggle('boss', boss || monster?.role === 'charger');
            label.button.classList.toggle('healer', healer || monster?.role === 'support');
            label.button.classList.toggle('healing-ready', healingReady ||
                healing ||
                receivingHeal ||
                (monster?.role === 'support' && monster.ready));
            label.button.classList.toggle('charged', charged ||
                (monster?.role === 'charger' &&
                    (monster.ready ||
                        (state.action?.kind === 'enemy' &&
                            state.action.actorId === enemy.id))));
            label.button.classList.toggle('exposed', (boar && state.boar.exposed && !heavyAttack) ||
                (monster?.exposed ?? false));
            label.button.setAttribute('aria-pressed', String(selected));
            label.button.setAttribute('aria-label', `${enemy.name}, 체력 ${enemy.health} / ${enemy.maxHealth}${enemy.staggered ? ', 다음 행동 불가' : ''}${frozen ? `, ${label.frozen.textContent}` : ''}${ember ? `, ${label.ember.textContent}` : ''}${boss || healer || monster || blocked || receivingHeal ? `, ${label.intent.textContent}` : ''}${affectedIds.includes(enemy.id) ? ', 기술 피해 대상' : ''}, 공격 대상으로 선택`);
            label.health.value = enemy.health;
            label.value.textContent = `${enemy.health}${enemy.staggered ? '\n행동 불가' : ''}`;
            const point = this.scene?.projectEnemyLabel(enemy);
            if (point) {
                label.button.style.left = `${point.x}px`;
                label.button.style.top = `${point.z}px`;
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
        this.positionEnemyLabels();
    }
    positionEnemyLabels() {
        const root = this.root.getBoundingClientRect();
        const viewport = this.root.ownerDocument.documentElement;
        const gap = 8;
        const placed = [
            this.turnOrder,
            this.element('.heading'),
            this.message,
            this.element('.drive-clock'),
            this.element('.combo'),
        ]
            .filter((element) => {
            const style = getComputedStyle(element);
            return style.visibility !== 'hidden' && Number(style.opacity) > 0;
        })
            .map((element) => {
            const rect = element.getBoundingClientRect();
            return {
                left: rect.left - root.left,
                right: rect.right - root.left,
                top: rect.top - root.top,
                bottom: rect.bottom - root.top,
            };
        })
            .filter((rect) => rect.right > rect.left && rect.bottom > rect.top);
        const buttons = [...this.labels.values()]
            .map((label) => label.button)
            .filter((button) => !button.hidden && button.style.left && button.style.top)
            .sort((a, b) => Number(b.classList.contains('selected')) -
            Number(a.classList.contains('selected')));
        for (const button of buttons) {
            const rect = button.getBoundingClientRect();
            if (!rect.width || !rect.height)
                continue;
            const origin = { left: rect.left - root.left, top: rect.top - root.top };
            const pointer = button.classList.contains('selected')
                ? getComputedStyle(button, '::before')
                : null;
            const pointerEnd = pointer
                ? Number.parseFloat(pointer.top) + Number.parseFloat(pointer.height)
                : rect.height;
            const height = Math.max(rect.height, Number.isFinite(pointerEnd) ? pointerEnd : rect.height);
            const minLeft = Math.max(gap, gap - root.left);
            const minTop = Math.max(gap, gap - root.top);
            const maxLeft = Math.max(minLeft, Math.min(root.width, viewport.clientWidth - root.left) -
                rect.width -
                gap);
            const maxTop = Math.max(minTop, Math.min(root.height, viewport.clientHeight - root.top) - height - gap);
            const clampLeft = (left) => Math.max(minLeft, Math.min(maxLeft, left));
            const clampTop = (top) => Math.max(minTop, Math.min(maxTop, top));
            const lefts = new Set([clampLeft(origin.left)]);
            const tops = new Set([clampTop(origin.top)]);
            for (const other of placed) {
                lefts.add(clampLeft(other.left - rect.width - gap));
                lefts.add(clampLeft(other.right + gap));
                tops.add(clampTop(other.top - height - gap));
                tops.add(clampTop(other.bottom + gap));
            }
            let best = {
                left: clampLeft(origin.left),
                top: clampTop(origin.top),
                overlap: Infinity,
                distance: Infinity,
            };
            // 실제 경계로 겹침을 피하고, 공간이 부족할 때도 가리는 면적과 이동량을 최소화한다.
            for (const top of tops) {
                for (const left of lefts) {
                    const overlap = placed.reduce((total, other) => {
                        const width = Math.max(0, Math.min(left + rect.width, other.right + gap) -
                            Math.max(left, other.left - gap));
                        const heightOverlap = Math.max(0, Math.min(top + height, other.bottom + gap) -
                            Math.max(top, other.top - gap));
                        return total + width * heightOverlap;
                    }, 0);
                    const distance = (left - origin.left) ** 2 + (top - origin.top) ** 2;
                    if (overlap < best.overlap ||
                        (overlap === best.overlap && distance < best.distance))
                        best = { left, top, overlap, distance };
                    if (overlap === 0 && distance === 0)
                        break;
                }
                if (best.overlap === 0 && best.distance === 0)
                    break;
            }
            button.style.left = `${Number.parseFloat(button.style.left) + best.left - origin.left}px`;
            button.style.top = `${Number.parseFloat(button.style.top) + best.top - origin.top}px`;
            placed.push({
                left: best.left,
                right: best.left + rect.width,
                top: best.top,
                bottom: best.top + height,
            });
        }
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
            const direction = cardinalFacing(state.player.facing) === 'left' ? -1 : 1;
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
    addInteractionNotices(events) {
        const names = {
            freeze: '빙결',
            shatter: '빙결 파괴',
            collision: '충돌',
            ignite: '불씨',
            spread: '불씨 확산',
            field: '불장판',
        };
        for (const event of events) {
            const name = names[event.kind];
            if (!name)
                continue;
            const element = document.createElement('span');
            element.className = `interaction-notice ${event.kind}`;
            element.textContent = name;
            this.interactionLabels.append(element);
            this.interactionNotices.push({
                element,
                point: event.point,
                remaining: 0.8,
            });
        }
        while (this.interactionNotices.length > 12)
            this.interactionNotices.shift()?.element.remove();
    }
    renderInteractionLabels(state, dt) {
        const fields = state.interactions?.fields ?? [];
        for (const [id, label] of this.fieldLabels) {
            if (!fields.some((field) => field.id === id)) {
                label.remove();
                this.fieldLabels.delete(id);
            }
        }
        for (const field of fields) {
            let label = this.fieldLabels.get(field.id);
            if (!label) {
                label = document.createElement('span');
                label.className = 'interaction-field-label';
                this.fieldLabels.set(field.id, label);
                this.interactionLabels.append(label);
            }
            label.textContent = `불 ${field.remainingTurns}턴`;
            const point = this.scene?.projectFieldLabel(field);
            if (point) {
                label.style.left = `${point.x}px`;
                label.style.top = `${point.z}px`;
            }
        }
        for (let index = this.interactionNotices.length - 1; index >= 0; index--) {
            const notice = this.interactionNotices[index];
            notice.remaining -= dt;
            if (notice.remaining <= 0) {
                notice.element.remove();
                this.interactionNotices.splice(index, 1);
                continue;
            }
            const point = this.scene?.project(notice.point, 1.25);
            if (point) {
                notice.element.style.left = `${point.x}px`;
                notice.element.style.top = `${point.z - (0.8 - notice.remaining) * 16}px`;
            }
            notice.element.style.opacity = String(Math.min(1, notice.remaining / 0.2));
        }
    }
    clearEffects() {
        this.interactionNotices.forEach((notice) => notice.element.remove());
        this.interactionNotices.length = 0;
        this.fieldLabels.forEach((label) => label.remove());
        this.fieldLabels.clear();
        this.lastInteractionEvents = [];
        this.sound.stop();
        this.clearRageReveal();
        this.damageNumbers.clear();
        this.healingNumbers.clear();
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
        if (this.rageReveal !== 'pending' ||
            state.phase !== 'command' ||
            state.activeActorId !== 0 ||
            state.player.health <= 0 ||
            resting)
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
        this.menu.dispose();
        this.equipmentHud?.dispose();
        this.victory.reset();
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
