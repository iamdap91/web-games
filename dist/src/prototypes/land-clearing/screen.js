import { PathFollower } from '../../games/tiger-rpg/path-follower.js';
import { bridgeElevation } from './discovery-scene.js';
import { forestClearingLayout } from './forest-clearing-layout.js';
import { EAttackInput } from './e-attack-input.js';
import { largeObjectLayout } from './clearing-large-object.js';
import { EquipmentHud } from '../../games/tiger-rpg/equipment-hud.js';
import { EquipmentMenuView } from '../../games/tiger-rpg/equipment-menu-view.js';
import { GameMenuView, } from '../../games/tiger-rpg/game-menu-view.js';
import { clearingControlHelp, clearingSkillHelp } from './clearing-help.js';
import { waitForRenderedFrame } from '../../games/tiger-rpg/screen-ready.js';
import { clearingMarkup } from './screen-template.js';
import { energyRules } from './harvest-energy.js';
import { ClearingHudFeedback } from './hud-feedback.js';
import { discoveryLayout } from './clearing-discovery.js';
import { ClearingWorld, obstacleTypes, } from './world.js';
import { ClearingScene } from './scene.js';
import { ImpactSound } from './impact-sound.js';
/** 귀환 때 입력·루프를 멈추고 결과를 한 번 전달한다. 최종 제거는 호출자 책임이다. */
export function mountClearing(options) {
    return new ClearingScreen(options);
}
export function mountClearingPrototype(root) {
    return new ClearingScreen({ root });
}
const movementKeys = new Set([
    'ArrowUp',
    'ArrowLeft',
    'ArrowDown',
    'ArrowRight',
]);
const attackKeys = ['Space'];
function targetDescription(target) {
    if (target.health === 0)
        return 'Space · 쓰러진 나무 방향 바꾸기';
    const label = target.id === largeObjectLayout.gate.id
        ? '균열바위'
        : target.id === largeObjectLayout.tree.id
            ? '쇠약한 거목'
            : target.id === discoveryLayout.source.id
                ? '물이 새는 바위'
                : obstacleTypes[target.kind].label;
    const action = { brush: '정리하기', rock: '깨기', tree: '쓰러뜨리기' }[target.kind];
    return `Space / E · ${label} ${action} · ${target.health}타`;
}
function interactionDescription(state) {
    if (state.rush.action || state.weakStrike.action || state.slam.action)
        return '';
    if (state.forest.action)
        return {
            push: '힘을 실어 바위를 밀어낸다…',
            cut: '엉킨 덩굴을 걷어낸다…',
            inspect: '고목 안의 자루를 꺼내는 중…',
        }[state.forest.action.kind];
    if (state.forest.rock.phase === 'rolling')
        return '바위가 굴러갑니다 · 방향키로 비켜설 수 있어요';
    if (state.forest.target)
        return '';
    if (state.crateTargetId !== null)
        return 'Space · 떠내려온 상자 열기';
    const target = state.obstacles.find((item) => item.id === state.targetId);
    if (state.weakStrike.targetId !== null)
        return '';
    if (target?.id === largeObjectLayout.gate.id) {
        if (!state.weakStrike.unlocked)
            return '균열바위 · 도장 Lv.2에서 약점 강타 해금';
        if (state.energy.charge < 1)
            return '기세 부족';
        if (state.weakStrike.targetId !== target.id)
            return '균열바위 · 금빛 균열 쪽으로 접근';
        return '';
    }
    if (target)
        return targetDescription(target);
    return '';
}
class ClearingScreen {
    options;
    canvas;
    overlay;
    menuButton;
    resetButton;
    targetLabel;
    woodLabel;
    stoneLabel;
    woodGain;
    stoneGain;
    hudFeedback;
    exitHint;
    notice;
    charge;
    chargeLabel;
    rushButton;
    rushRequested = false;
    slamButton;
    slamRequested = false;
    weakStrikeButton;
    weakStrikeRequested = false;
    attackRequested = false;
    eAttack = new EAttackInput();
    diagnostics;
    lifetime = new AbortController();
    keys = new Set();
    world;
    follower;
    sound = new ImpactSound();
    soundEnabled = true;
    menuView;
    equipmentMenu;
    equipmentHud;
    dev = new URLSearchParams(location.search).get('dev') === '1';
    scene = null;
    frameId = 0;
    previousTime = 0;
    loaded = false;
    ready;
    host = document.createElement('section');
    stylesheet = document.createElement('link');
    paused = false;
    transitionBlocked = false;
    returning = false;
    storyBlocked = false;
    failed = false;
    disposed = false;
    interactRequested = false;
    noticeTime = 0;
    constructor(options) {
        this.options = options;
        this.world = new ClearingWorld('entry' in options ? options.entry : undefined);
        this.follower = options.companion
            ? new PathFollower({
                ...this.world.snapshot.player,
                y: bridgeElevation(this.world.snapshot.player, this.world.snapshot.discovery.logs),
            })
            : null;
        if (this.follower) {
            const player = this.follower.snapshot;
            const at = { ...player, x: player.x - 0.7 };
            this.follower.reset(player, this.world.canStand(at) ? at : player);
        }
        this.hudFeedback = new ClearingHudFeedback(this.world.snapshot);
        this.host.className = 'clearing-screen';
        this.host.setAttribute('aria-label', '숲속 공터');
        this.host.innerHTML = clearingMarkup;
        options.root.append(this.host);
        const element = (selector) => {
            const node = this.host.querySelector(selector);
            if (!node)
                throw new Error(`화면 요소가 없습니다: ${selector}`);
            return node;
        };
        this.canvas = element('#clearing');
        this.overlay = element('#overlay');
        this.menuButton = element('#menu');
        this.resetButton = element('#reset');
        this.targetLabel = element('#target');
        this.woodLabel = element('#wood');
        this.stoneLabel = element('#stone');
        this.woodGain = element('#wood-gain');
        this.stoneGain = element('#stone-gain');
        this.exitHint = element('#exit-hint');
        this.notice = element('#notice');
        this.charge = element('#charge');
        this.chargeLabel = element('#charge-label');
        this.weakStrikeButton = element('#weak-strike');
        const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
        this.world.setReducedMotion(motion.matches);
        motion.addEventListener('change', () => {
            this.world.setReducedMotion(motion.matches);
            this.scene?.setReducedMotion(motion.matches);
        }, { signal: this.lifetime.signal });
        this.rushButton = element('#rush');
        this.slamButton = element('#slam');
        this.diagnostics = element('#diagnostics');
        this.menuView = new GameMenuView(this.host, {
            getSoundEnabled: () => this.options.menu?.getSoundEnabled() ?? this.soundEnabled,
        });
        const equipment = options.menu?.equipment;
        this.equipmentMenu = equipment
            ? new EquipmentMenuView(this.menuView, equipment)
            : null;
        this.equipmentHud = equipment
            ? new EquipmentHud(this.host, {
                loadout: equipment.getState().loadout,
                onOpen: () => this.openEquipmentMenu(),
            })
            : null;
        this.equipmentHud?.setVisible(false);
        this.setSoundEnabled(options.menu?.getSoundEnabled() ?? true);
        const integrated = 'entry' in options;
        this.resetButton.hidden = integrated;
        this.menuButton.hidden = integrated;
        if (integrated) {
            this.exitHint.hidden = false;
            this.canvas.setAttribute('aria-label', `${this.canvas.getAttribute('aria-label')} 남쪽 숲길의 맵 경계로 이동하면 마을로 돌아갑니다.`);
        }
        this.registerInput();
        this.ready = this.start();
        // 호출자는 ready의 거부를 처리할 수 있고 독립 화면은 오류 안내를 계속 보여 준다.
        void this.ready.catch(() => { });
    }
    registerInput() {
        const { signal } = this.lifetime;
        this.host.addEventListener('keydown', (event) => {
            // 버튼의 기본 Enter가 제거한 게임 확정 별칭으로 남지 않게 한다.
            if (event.key === 'Enter' && event.target instanceof HTMLButtonElement)
                event.preventDefault();
            if (!this.canPlay)
                return;
            if (event.code === 'Escape') {
                event.preventDefault();
                if (!event.repeat)
                    this.openMenu();
                return;
            }
            if (event.code === 'KeyE') {
                if (event.target instanceof HTMLButtonElement)
                    return;
                event.preventDefault();
                if (!event.repeat && !this.keys.has(event.code)) {
                    this.eAttack.press(performance.now() / 1000);
                    this.keys.add(event.code);
                    this.sound.unlock();
                }
                return;
            }
            if (event.code === 'KeyQ' || event.code === 'KeyW') {
                if (event.target instanceof HTMLButtonElement)
                    return;
                event.preventDefault();
                if (!event.repeat && !this.keys.has(event.code)) {
                    if (event.code === 'KeyQ')
                        this.slamRequested = true;
                    else
                        this.rushRequested = true;
                    this.sound.unlock();
                    this.keys.add(event.code);
                }
                return;
            }
            if (!movementKeys.has(event.code) && !attackKeys.includes(event.code))
                return;
            if (event.target instanceof HTMLButtonElement)
                return;
            event.preventDefault();
            // 잠금·일시정지·버튼 선택 뒤에는 남은 키 반복으로 공격이나 보행을 재개하지 않는다.
            if (event.repeat && !this.keys.has(event.code))
                return;
            if (event.code === 'Space' &&
                !event.repeat &&
                !this.keys.has(event.code))
                this.interactRequested = true;
            this.keys.add(event.code);
            if (attackKeys.includes(event.code))
                this.sound.unlock();
        }, { signal });
        window.addEventListener('keyup', (event) => {
            this.keys.delete(event.code);
            if (event.code !== 'KeyE')
                return;
            if (!this.canPlay) {
                this.eAttack.cancel();
                return;
            }
            const action = this.eAttack.release(performance.now() / 1000);
            if (action === 'attack')
                this.attackRequested = true;
            else if (action === 'weakStrike')
                this.weakStrikeRequested = true;
        }, { signal });
        window.addEventListener('blur', this.loseFocus, { signal });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden)
                this.loseFocus();
        }, { signal });
        this.slamButton.addEventListener('click', () => {
            if (!this.canPlay)
                return;
            this.slamRequested = true;
            this.canvas.focus();
        }, { signal });
        this.rushButton.addEventListener('click', () => {
            if (!this.canPlay)
                return;
            this.rushRequested = true;
            this.canvas.focus();
        }, { signal });
        this.weakStrikeButton.addEventListener('click', () => {
            if (!this.canPlay)
                return;
            this.weakStrikeRequested = true;
            this.sound.unlock();
            this.canvas.focus();
        }, { signal });
        this.host
            .querySelector('#forest-hint')
            .addEventListener('click', () => {
            if (!this.canPlay)
                return;
            this.interactRequested = true;
            this.sound.unlock();
            this.canvas.focus();
        }, { signal });
        this.menuButton.addEventListener('click', () => this.openMenu(), {
            signal,
        });
        this.resetButton.addEventListener('click', () => {
            if ('entry' in this.options || !this.canPlay)
                return;
            this.clearInput();
            this.world.reset();
            this.hudFeedback.reset(this.world.snapshot);
            this.renderHudFeedback(performance.now());
            this.scene?.reset();
            this.clearNotice();
            this.canvas.focus();
        }, { signal });
        this.canvas.addEventListener('pointerdown', () => this.canvas.focus(), {
            signal,
        });
        this.canvas.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            this.showError('그래픽 연결이 끊겼어요. 화면을 다시 열어 주세요.');
        }, { signal });
    }
    async start() {
        try {
            await this.loadStylesheet();
            if (this.disposed)
                return;
            this.scene = new ClearingScene(this.canvas, this.world.snapshot, {
                companion: this.options.companion,
            });
            await this.scene.load();
            if (this.disposed)
                return;
            this.loaded = true;
            this.setPaused(false);
            const state = this.world.snapshot;
            this.scene.render(state, 0, this.follower?.snapshot);
            this.renderHud(state);
            this.renderHudFeedback(performance.now());
            await waitForRenderedFrame(this.lifetime.signal);
            if (this.disposed)
                return;
            this.focus();
            if (!this.transitionBlocked)
                this.schedule();
        }
        catch (error) {
            if (this.disposed)
                return;
            this.scene?.dispose();
            this.scene = null;
            this.showError(error instanceof Error
                ? error.message
                : '공터를 준비하지 못했어요. WebGL 2 지원 브라우저에서 열어 주세요.');
            throw error;
        }
    }
    loadStylesheet() {
        return new Promise((resolve, reject) => {
            const { signal } = this.lifetime;
            this.stylesheet.rel = 'stylesheet';
            this.stylesheet.href = new URL('../../../../src/prototypes/land-clearing/style.css', import.meta.url).href;
            this.stylesheet.addEventListener('load', () => resolve(), {
                once: true,
                signal,
            });
            this.stylesheet.addEventListener('error', () => reject(new Error('채집 화면 스타일을 불러오지 못했어요.')), { once: true, signal });
            signal.addEventListener('abort', () => resolve(), { once: true });
            document.head.append(this.stylesheet);
        });
    }
    returnToTown() {
        if (!('entry' in this.options) || !this.canPlay)
            return;
        const result = this.world.returnToTown();
        if (!result)
            return;
        this.returning = true;
        this.setTransitionBlocked(true);
        this.options.onReturn(result);
    }
    showError(message) {
        this.failed = true;
        this.clearInput();
        this.clearHudFeedback();
        cancelAnimationFrame(this.frameId);
        this.frameId = 0;
        this.overlay.hidden = true;
        this.host.dataset.menuOpen = 'true';
        this.menuView.show({
            title: '공터를 준비하지 못했어요',
            description: message,
            items: [
                { id: 'reload', label: '다시 열기', onSelect: () => location.reload() },
            ],
            onCancel: null,
        });
    }
    clearInput = () => {
        // 창 밖에서 키를 놓쳐도 입력이 남지 않고, 복귀 시 누적 시간을 건너뛴다.
        this.keys.clear();
        this.interactRequested = false;
        this.eAttack.cancel();
        this.attackRequested = false;
        this.weakStrikeRequested = false;
        this.slamRequested = false;
        this.rushRequested = false;
        this.world.cancelSkillRequest();
        this.previousTime = performance.now();
    };
    loseFocus = () => {
        this.clearInput();
        // 창을 떠난 동안 자동 돌진으로 멀리 이동하지 않는다.
        this.world.stopRush();
        this.hudFeedback.synchronizeReadiness(this.world.snapshot);
        this.renderHudFeedback(performance.now());
    };
    setPaused(paused) {
        if (!this.loaded || this.failed)
            return;
        this.paused = paused;
        this.clearInput();
        this.hudFeedback.synchronizeReadiness(this.world.snapshot);
        this.renderHudFeedback(performance.now());
        this.overlay.hidden = true;
        this.host.dataset.menuOpen = String(paused);
        cancelAnimationFrame(this.frameId);
        this.frameId = 0;
        this.renderHud(this.world.snapshot);
        this.renderDiagnostics(this.world.snapshot);
        if (!paused)
            this.schedule();
    }
    openMenu() {
        if (!this.canPlay)
            return;
        this.setPaused(true);
        this.showPauseMenu();
    }
    openEquipmentMenu() {
        if (!this.canPlay || !this.equipmentMenu)
            return;
        this.setPaused(true);
        this.equipmentMenu.showEquipment({ onBack: () => this.resumePlaying() });
    }
    setSoundEnabled(enabled) {
        if (this.disposed)
            return;
        this.soundEnabled = enabled;
        this.sound.setEnabled(enabled);
    }
    showPauseMenu() {
        if (!this.paused ||
            this.disposed ||
            this.failed ||
            this.storyBlocked ||
            this.transitionBlocked ||
            this.returning)
            return;
        const menu = this.options.menu;
        this.setSoundEnabled(menu?.getSoundEnabled() ?? this.soundEnabled);
        const failure = menu?.getSaveFailure() ?? null;
        const items = [
            {
                id: 'resume',
                label: '계속하기',
                description: '공터 정리를 이어갑니다.',
                onSelect: () => this.resumePlaying(),
            },
            {
                id: 'sound',
                label: `소리: ${this.soundEnabled ? '켜짐' : '꺼짐'}`,
                description: '채집 타격음을 켜거나 끕니다.',
                onSelect: () => {
                    this.setSoundEnabled(!this.soundEnabled);
                    menu?.onSoundChange(this.soundEnabled);
                    this.showPauseMenu();
                },
            },
            {
                id: 'help',
                label: '조작 안내',
                description: '이동·공격·기술과 기세를 확인합니다.',
                onSelect: () => this.showHelp(),
            },
        ];
        if (this.equipmentMenu)
            items.splice(1, 0, {
                id: 'equipment',
                label: '장비',
                description: '출발할 때 장착한 부적·아대를 확인합니다.',
                onSelect: () => this.equipmentMenu?.showEquipment({
                    onBack: () => this.showPauseMenu(),
                }),
            });
        if (failure && menu)
            items.push({
                id: 'save-retry',
                label: '저장 다시 시도',
                description: failure,
                onSelect: () => {
                    menu.onRetrySave();
                    this.showPauseMenu();
                },
            });
        this.menuView.show({
            title: '잠깐 쉬어가기',
            description: failure ?? '준비되면 공터 정리를 이어가세요.',
            items,
            onCancel: () => this.resumePlaying(),
        });
    }
    showHelp() {
        this.menuView.showHelp({
            title: '채집 조작 안내',
            sections: [
                {
                    title: '기본 조작',
                    lines: [
                        ...clearingControlHelp,
                        ...('entry' in this.options
                            ? ['남쪽 숲길의 맵 경계를 넘으면 마을로 돌아갑니다.']
                            : []),
                    ],
                },
                ...Object.values(clearingSkillHelp).map((skill) => ({
                    title: `${skill.key} · ${skill.name} · 기세 ${skill.cost}칸`,
                    lines: [skill.effect],
                })),
                ...(this.options.menu?.helpSections ?? []),
            ],
            onBack: () => this.showPauseMenu(),
        });
    }
    resumePlaying() {
        if (this.failed ||
            this.disposed ||
            this.storyBlocked ||
            this.transitionBlocked ||
            this.returning)
            return;
        this.menuView.close();
        this.setPaused(false);
        this.focus();
    }
    schedule() {
        if (!this.loaded ||
            this.disposed ||
            this.failed ||
            this.paused ||
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
            this.paused ||
            this.transitionBlocked ||
            this.returning)
            return;
        const dt = this.storyBlocked
            ? 0
            : Math.max(0, Math.min((now - this.previousTime) / 1000, 0.05));
        this.previousTime = now;
        this.updateWorld(dt);
        if (this.world.canReturn) {
            this.returnToTown();
            if (this.disposed || this.returning || this.transitionBlocked)
                return;
        }
        this.presentImpacts();
        this.presentLoot();
        this.presentSlams();
        this.presentDiscoveries();
        this.presentForestEvents();
        if (this.disposed)
            return;
        this.noticeTime = Math.max(0, this.noticeTime - dt);
        this.notice.hidden = this.noticeTime <= 0;
        const state = this.world.snapshot;
        this.follower?.follow({
            ...state.player,
            y: bridgeElevation(state.player, state.discovery.logs),
        }, (point) => this.world.canStand(point));
        this.scene?.render(state, dt, this.follower?.snapshot);
        this.renderHud(state);
        this.hudFeedback.update(state, now);
        this.renderHudFeedback(now);
        this.renderDiagnostics(state);
        if (!this.paused && !this.transitionBlocked && !this.returning)
            this.frameId = requestAnimationFrame(this.tick);
    };
    renderDiagnostics(state) {
        if (!this.dev)
            return;
        this.diagnostics.textContent = JSON.stringify({
            ...state,
            paused: this.paused,
            transitionBlocked: this.transitionBlocked,
            storyBlocked: this.storyBlocked,
            canReturn: this.world.canReturn,
            eCharge: this.eAttack.progress(performance.now() / 1000),
            ...this.scene?.diagnostics,
        });
    }
    get canPlay() {
        return (this.loaded &&
            !this.disposed &&
            !this.failed &&
            !this.paused &&
            !this.storyBlocked &&
            !this.transitionBlocked &&
            !this.returning);
    }
    updateWorld(dt) {
        const pressed = (key) => Number(this.keys.has(key));
        this.world.update(dt, {
            x: pressed('ArrowRight') - pressed('ArrowLeft'),
            z: pressed('ArrowDown') - pressed('ArrowUp'),
            interact: this.interactRequested,
            working: this.attackRequested || attackKeys.some((key) => this.keys.has(key)),
            slam: this.slamRequested,
            rush: this.rushRequested,
            weakStrike: this.weakStrikeRequested,
        });
        this.interactRequested = false;
        this.attackRequested = false;
        this.weakStrikeRequested = false;
        this.slamRequested = false;
        this.rushRequested = false;
    }
    presentImpacts() {
        const impacts = this.world.takeImpacts();
        this.scene?.addImpacts(impacts);
        for (const impact of impacts) {
            if (!impact.source || impact.source === 'normal')
                this.sound.play(impact);
        }
    }
    presentLoot() {
        const events = this.world.takeLootEvents();
        this.scene?.addLootEvents(events);
        if (events.some((event) => event.type === 'opened'))
            this.showNotice('떠내려온 상자를 열었어요', 2);
    }
    presentSlams() {
        const slams = this.world.takeSlams();
        this.scene?.addSlams(slams, this.world.snapshot);
        for (const slam of slams) {
            this.showNotice(slam.cleared > 0
                ? `지면 강타 · ${slam.cleared}개를 한 번에!`
                : '지면 강타', 2);
        }
    }
    presentDiscoveries() {
        for (const event of this.world.takeDiscoveries()) {
            const message = {
                'spring-opened': '샘물과 함께 나뭇가지가 떠내려와요',
                'bridge-ready': '쓰러진 나무가 물길을 이었어요',
                'bank-reached': '물길 너머 꽃밭까지 길이 이어졌어요',
                'grove-opened': '균열바위가 갈라졌다. 바람숲으로 가는 길이 열렸다!',
                'logging-yard-route-opened': '덩굴이 걷혔다. 벌목터 운반길이 다시 이어졌다!',
                'grove-found': '바람숲 발견 · 이곳의 잡목과 바위는 자재를 2개씩 줍니다.',
            }[event];
            this.showNotice(message, 3);
            if ('entry' in this.options)
                this.options.onDiscovery?.(event);
            // 통지에서 호스트가 화면을 전환해도 뒤따르는 렌더·통지·루프를 남기지 않는다.
            if (this.disposed)
                return;
        }
    }
    presentForestEvents() {
        for (const event of this.world.takeForestEvents())
            this.showNotice({
                'hollow-claimed': '옛 채집 자루 · 목재 +2 · 돌 +2',
                'hollow-empty': '고목 안은 이제 비어 있어요.',
                'roll-completed': '바위가 멈췄어요. 정리된 길을 둘러보세요.',
            }[event], 2.5);
    }
    showNotice(message, duration) {
        this.notice.textContent = message;
        this.noticeTime = duration;
    }
    clearNotice() {
        this.notice.textContent = '';
        this.noticeTime = 0;
    }
    renderHud(state) {
        this.equipmentHud?.setVisible(this.canPlay);
        this.charge.max = energyRules.capacity;
        this.charge.value = state.energy.charge;
        this.chargeLabel.textContent = `기세 ${state.energy.charge} / ${energyRules.capacity}`;
        this.slamButton.dataset.ready = String(state.slam.ready);
        this.rushButton.dataset.ready = String(state.rush.ready);
        this.rushButton.disabled =
            !state.rush.ready ||
                this.paused ||
                this.storyBlocked ||
                this.transitionBlocked ||
                this.returning;
        this.rushButton.title = `${clearingSkillHelp.rush.name} · ${clearingSkillHelp.rush.key} · 기세 ${clearingSkillHelp.rush.cost}칸 · ${clearingSkillHelp.rush.effect}`;
        this.slamButton.disabled =
            !state.slam.ready ||
                !!state.slam.action ||
                this.paused ||
                this.storyBlocked ||
                this.transitionBlocked ||
                this.returning;
        this.slamButton.title = `${clearingSkillHelp.slam.name} · ${clearingSkillHelp.slam.key} · 기세 ${clearingSkillHelp.slam.cost}칸 · ${clearingSkillHelp.slam.effect}`;
        this.weakStrikeButton.disabled = !this.canPlay || !state.weakStrike.ready;
        this.weakStrikeButton.dataset.ready = String(state.weakStrike.ready);
        this.weakStrikeButton.querySelector('.skill-lock').hidden =
            state.weakStrike.unlocked;
        this.weakStrikeButton.querySelector('.skill-cost').hidden =
            !state.weakStrike.unlocked;
        this.weakStrikeButton.title = `약점 강타 · ${clearingSkillHelp.weakStrike.effect}`;
        const forestHint = this.host.querySelector('#forest-hint');
        const forestMarker = this.scene?.forestMarker;
        const forestTarget = state.forest.target;
        forestHint.hidden =
            !this.canPlay ||
                !forestMarker?.visible ||
                !forestTarget ||
                !!state.slam.action ||
                !!state.rush.action ||
                !!state.weakStrike.action ||
                !!state.swing;
        forestHint.disabled = forestHint.hidden;
        forestHint.dataset.nearby = 'true';
        forestHint.querySelector('strong').textContent =
            forestTarget === 'boulder'
                ? '굴리는 바위'
                : forestTarget === 'vine'
                    ? '덩굴 장막'
                    : '속이 빈 고목';
        forestHint.querySelector('span').textContent =
            forestTarget === 'boulder'
                ? `Space · ${state.forest.pushDirection === 'east' ? '돌' : '목재'} 쪽 밀기 · ${state.forest.previewTargets.length}개 정리`
                : forestTarget === 'vine'
                    ? `Space · 운반길 열기 · ${3 - state.forest.vine.hits}타`
                    : state.forest.hollow.phase === 'claimed'
                        ? 'Space · 빈 고목 살펴보기'
                        : 'Space · 안쪽 조사하기';
        if (forestMarker) {
            forestHint.style.left = `${forestMarker.x}px`;
            forestHint.style.top = `${forestMarker.y}px`;
            const equipment = this.host.querySelector('.equipment-hud');
            if (!forestHint.hidden && equipment && !equipment.hidden) {
                const labelBounds = forestHint.getBoundingClientRect();
                const equipmentBounds = equipment.getBoundingClientRect();
                // 짧은 가로 화면에서도 두 줄 안내가 장착 표시를 덮지 않게 한다.
                if (labelBounds.left < equipmentBounds.right &&
                    labelBounds.right > equipmentBounds.left &&
                    labelBounds.top < equipmentBounds.bottom &&
                    labelBounds.bottom > equipmentBounds.top) {
                    forestHint.style.left = `${forestMarker.x - (labelBounds.right - equipmentBounds.left + 8)}px`;
                }
            }
        }
        const weakHint = this.host.querySelector('#weak-hint');
        const weakMarker = this.scene?.weakMarker;
        weakHint.hidden =
            !this.canPlay ||
                !weakMarker?.visible ||
                !!state.weakStrike.action ||
                !!state.slam.action ||
                !!state.rush.action;
        const eCharge = this.eAttack.progress(performance.now() / 1000);
        const chargeProgress = eCharge ?? 0;
        for (const element of [weakHint, this.weakStrikeButton]) {
            element.style.setProperty('--hold-progress', String(chargeProgress));
            element.dataset.charged = String(eCharge === 1 && state.weakStrike.unlocked && state.energy.charge >= 1);
        }
        weakHint.dataset.available = String(state.weakStrike.unlocked && state.energy.charge >= 1);
        const weakStatus = weakHint.querySelector('.weak-status');
        weakStatus.textContent = state.weakStrike.unlocked
            ? state.energy.charge < 1
                ? '기세 부족'
                : ''
            : '도장 Lv.2에서 해금';
        weakStatus.hidden = !weakStatus.textContent;
        weakHint.setAttribute('aria-label', `${eCharge === 1 ? 'E 놓기' : eCharge === null ? 'E 길게 눌렀다 떼기' : 'E 충전 중'} · 약점 강타 · ${weakStatus.textContent || '기세 1칸'}`);
        weakHint.title = clearingSkillHelp.weakStrike.effect;
        if (weakMarker) {
            weakHint.style.left = `${weakMarker.x}px`;
            weakHint.style.top = `${weakMarker.y}px`;
        }
        this.woodLabel.textContent = String(state.wood);
        this.stoneLabel.textContent = String(state.stone);
        const marker = this.scene?.exitMarker;
        this.exitHint.hidden = !('entry' in this.options) || !marker?.visible;
        if (marker) {
            this.exitHint.style.left = `${marker.x}px`;
            this.exitHint.style.top = `${marker.y}px`;
        }
        const groveHint = this.host.querySelector('#grove-hint');
        const groveMarker = this.scene?.groveMarker;
        // 약점 안내가 사라지는 강타 동작 중에도 숲 이름표를 띄우지 않는다.
        const gateHintActive = (state.weakStrike.targetId === largeObjectLayout.gate.id &&
            !weakHint.hidden) ||
            state.weakStrike.action?.targetId === largeObjectLayout.gate.id;
        groveHint.hidden =
            gateHintActive ||
                !('entry' in this.options) ||
                !groveMarker?.visible ||
                this.storyBlocked ||
                this.paused ||
                this.transitionBlocked;
        if (groveMarker) {
            groveHint.style.left = `${groveMarker.x}px`;
            groveHint.style.top = `${groveMarker.y}px`;
        }
        groveHint.querySelector('span').textContent = state.grove.unlocked
            ? state.grove.inside
                ? '공터 ←'
                : '동쪽 숲길 →'
            : '약점 강타로 균열바위를 부수면 열려요';
        this.host.querySelector('.location-tag h1').textContent = state.forest
            .insideLoggingYard
            ? forestClearingLayout.title
            : state.grove.inside
                ? '바람숲'
                : '숲속 공터';
        this.targetLabel.textContent = interactionDescription(state);
        this.targetLabel.hidden = !this.targetLabel.textContent;
    }
    renderHudFeedback(now) {
        const feedback = this.hudFeedback.snapshot(now);
        for (const [element, amount] of [
            [this.woodGain, feedback.woodGain],
            [this.stoneGain, feedback.stoneGain],
        ]) {
            element.textContent = amount > 0 ? `+${amount}` : '';
            element.hidden = amount <= 0;
        }
        this.slamButton.dataset.readyPulse = String(feedback.slamPulse);
        this.rushButton.dataset.readyPulse = String(feedback.rushPulse);
    }
    clearHudFeedback() {
        this.hudFeedback.reset(this.world.snapshot);
        this.renderHudFeedback(performance.now());
    }
    getSpeakerAnchor(speaker) {
        if (speaker !== 'ataho' || !this.loaded || this.failed || this.disposed)
            return null;
        const anchor = this.scene?.speakerAnchor;
        if (!anchor)
            return null;
        const canvas = this.canvas.getBoundingClientRect();
        const root = this.options.root.getBoundingClientRect();
        return {
            x: anchor.x + canvas.left - root.left,
            y: anchor.y + canvas.top - root.top,
            visible: anchor.visible && canvas.width > 0 && canvas.height > 0,
        };
    }
    setStoryBlocked(blocked) {
        if (this.disposed)
            return;
        this.storyBlocked = blocked;
        this.loseFocus();
        this.renderHud(this.world.snapshot);
        this.renderDiagnostics(this.world.snapshot);
        if (blocked)
            this.menuView.close();
        else if (this.paused &&
            !this.transitionBlocked &&
            !this.failed &&
            !this.returning)
            this.showPauseMenu();
    }
    setTransitionBlocked(blocked) {
        if (this.disposed)
            return;
        this.transitionBlocked = blocked;
        this.host.inert = blocked;
        this.loseFocus();
        this.renderHud(this.world.snapshot);
        this.renderDiagnostics(this.world.snapshot);
        cancelAnimationFrame(this.frameId);
        this.frameId = 0;
        if (blocked)
            this.menuView.close();
        else {
            if (this.paused && !this.storyBlocked && !this.failed && !this.returning)
                this.showPauseMenu();
            this.schedule();
        }
    }
    focus() {
        if (this.canPlay)
            this.canvas.focus();
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.clearHudFeedback();
        this.lifetime.abort();
        cancelAnimationFrame(this.frameId);
        this.clearInput();
        this.equipmentHud?.dispose();
        this.menuView.dispose();
        this.scene?.dispose();
        this.sound.dispose();
        this.stylesheet.remove();
        this.host.remove();
    }
}
