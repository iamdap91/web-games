import { DojoScene, dojoViews } from './scene.js';
import { DojoWalk } from './walk.js';
import { registerEmbeddedScene } from '../../catalog/embedded-scene.js';
import { dojoStages } from '../dojo/dojo-layout.js';
import { kitchenStages } from '../kitchen/kitchen-layout.js';
import { smithyLevels } from '../smithy/smithy-layout.js';
import { townHallLevels, } from '../town-hall/town-hall-layout.js';
function element(selector) {
    const node = document.querySelector(selector);
    if (!node)
        throw new Error(`화면 요소가 없습니다: ${selector}`);
    return node;
}
const hallCopy = {
    1: {
        title: '마을이 모이는 첫 자리',
        description: '큰 본채와 넓은 나무 현관 앞에 흙광장이 열려 있습니다. 소박한 모습으로 마을의 중심을 지킵니다.',
        changes: [
            '낮고 넓은 나무 지붕과 단순한 처마',
            '목재 현관·중앙 계단과 큰 회관 본채',
            '길이 모이는 흙광장과 빛바랜 풀·회갈색 땅',
        ],
    },
    2: {
        title: '중심을 갖춰가는 청사',
        description: '석재 기단을 정돈하고 현관에 작은 박공을 올렸습니다. 광장 가운데 포장로가 생깁니다.',
        changes: [
            '푸른 지붕과 낮은 중앙 박공',
            '정비된 석재 기단과 넓은 계단',
            '현관 앞 포장과 돌아오기 시작한 풀빛·햇빛의 온기',
        ],
    },
    3: {
        title: '마을의 중심, 청사',
        description: '높은 지붕과 마을 문장 아래, 완성된 광장이 펼쳐집니다. 길을 따라 돌아오면 청사가 먼저 반깁니다.',
        changes: [
            '높은 사면 지붕과 큰 중앙 박공',
            '마을 문장과 대칭 깃발',
            '중앙 문양을 새긴 석재 광장과 생기 있는 자연색·따뜻한 빛',
        ],
    },
};
const stageCopy = {
    weathered: {
        number: 'Lv.0',
        label: '쇠락한 도장',
        title: '명맥을 잇는 도장',
        description: '지붕과 벽이 무너진 자리에도, 수련목 앞의 흙은 오늘도 다져져 있습니다.',
        changes: [
            '크게 무너진 오른쪽 처마와 드러난 서까래',
            '나무 뼈대가 드러난 벽과 부서진 마루',
            '쓰러진 울타리와 잔해 사이의 수련 자리',
        ],
    },
    patched: {
        number: 'Lv.1',
        label: '응급 수리',
        title: '다시 손을 대다',
        description: '기둥을 받치고 비 새는 지붕을 막았습니다. 돌아와 수련할 길부터 열어둡니다.',
        changes: [
            '버팀목으로 세운 기둥과 판자로 덮은 지붕',
            '낡은 목재 사이에 새로 끼운 벽과 마루',
            '한쪽에 모은 잔해와 현관까지 이어진 흙길',
        ],
    },
    restored: {
        number: 'Lv.2',
        label: '복구 완료',
        title: '다시 수련할 자리',
        description: '익숙한 간판을 다시 걸고, 도장으로 돌아오는 길을 정돈했습니다.',
        changes: [
            '이어진 기와와 바로 선 처마',
            '수리한 마루와 불을 밝힌 현관 등불',
            '디딤돌 진입로와 정돈된 마당 경계',
        ],
    },
};
const kitchenCopy = {
    weathered: {
        label: '방치된 취사터',
        title: '불이 꺼진 자리',
        description: '무너진 아궁이와 기울어진 식탁. 오래된 솥만 자리를 지킵니다.',
        changes: [
            '끊어진 차양과 무너진 아궁이',
            '틈이 벌어진 식탁과 내려앉은 벤치',
        ],
    },
    usable: {
        label: '첫 복구',
        title: '다시 피운 불',
        description: '아궁이에 불이 들어오고 솥에서 김이 오릅니다. 첫 복구부터 식사할 자리가 생깁니다.',
        changes: [
            '바로 세운 차양 기둥과 부분 보수한 지붕',
            '수리한 아궁이·식탁과 한 사람의 밥그릇',
        ],
    },
    restored: {
        label: '정돈된 식사터',
        title: '함께 앉을 자리',
        description: '차양 아래 취사 공간과 긴 식탁을 정돈했습니다. 회관 옆에 머물 자리가 늘어납니다.',
        changes: [
            '완성된 나무 차양과 짧은 천 장식',
            '긴 식탁의 그릇들과 디딤돌로 이어진 길',
        ],
    },
};
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
const smithyCopy = {
    0: {
        label: '쇠락한 공방',
        title: '식어버린 화덕',
        description: '무너진 굴뚝과 작업대 사이에 녹슨 모루가 남아 있습니다.',
        changes: ['무너진 화덕과 끊어진 차양', '녹슨 도구와 틈이 벌어진 작업대'],
    },
    1: {
        label: '첫 복구',
        title: '무구를 손볼 자리',
        description: '화덕에 불을 넣고 모루와 작업대를 정돈했습니다. 첫 복구부터 무구를 손볼 수 있는 모습입니다.',
        changes: [
            '불이 켜진 화덕과 연기가 오르는 굴뚝',
            '부분 보수한 차양과 권갑이 놓인 작업대',
        ],
    },
    2: {
        label: '복구 완료',
        title: '다시 갖춘 공방',
        description: '차양을 완성하고 무구 걸이와 담금질 통을 정돈했습니다.',
        changes: [
            '완성된 나무 차양과 무구 걸이',
            '손질한 모루·담금질 통과 디딤돌 진입로',
        ],
    },
    3: {
        label: '최종 강화',
        title: '산중 무구 공방',
        description: '청동 테두리의 권갑과 보호구를 걸었습니다. 금속 차양의 권갑 표식이 완성된 공방을 알립니다.',
        changes: [
            '청동 테두리의 금속 차양과 권갑 표식',
            '보호구 진열과 넓게 정돈된 석재 작업 바닥',
        ],
    },
};
class DojoScreen {
    canvas = element('#dojo');
    status = element('#status');
    zoom = element('#zoom');
    lifetime = new AbortController();
    observer;
    walk = new DojoWalk();
    keys = new Set();
    diagnostics = element('#diagnostics');
    dev = new URLSearchParams(location.search).get('dev') === '1';
    scene = null;
    stage = 'weathered';
    ready = false;
    paused = false;
    disposed = false;
    frameId = 0;
    previousTime = 0;
    constructor() {
        registerEmbeddedScene(() => this.dispose());
        const { signal } = this.lifetime;
        for (const level of townHallLevels)
            element(`#hall-${level}`).addEventListener('click', () => this.selectHallLevel(level), { signal });
        for (const stage of dojoStages)
            element(`#${stage}`).addEventListener('click', () => this.selectStage(stage), { signal });
        for (const stage of kitchenStages)
            element(`#kitchen-${stage}`).addEventListener('click', () => this.selectKitchenStage(stage), { signal });
        for (const level of smithyLevels)
            element(`#smithy-${level}`).addEventListener('click', () => this.selectSmithyLevel(level), { signal });
        for (const view of dojoViews)
            element(`#view-${view}`).addEventListener('click', () => this.selectView(view), { signal });
        this.zoom.addEventListener('input', () => {
            this.clearInput();
            this.scene?.setZoom(this.zoom.valueAsNumber / 100);
            element('#zoom-value').value = `${this.zoom.value}%`;
            this.draw(0);
        }, { signal });
        element('#reset').addEventListener('click', () => {
            this.clearInput();
            this.walk.reset();
            this.zoom.value = '100';
            element('#zoom-value').value = '100%';
            this.scene?.setZoom(1);
            this.selectView('village');
            this.draw(0);
            this.canvas.focus({ preventScroll: true });
        }, { signal });
        element('#pause').addEventListener('click', () => this.togglePause(), {
            signal,
        });
        this.canvas.addEventListener('pointerdown', () => this.canvas.focus({ preventScroll: true }), { signal });
        this.canvas.addEventListener('keydown', (event) => {
            if (!this.ready)
                return;
            const requestedHallLevel = townHallLevels.find((_, index) => event.code === ['KeyZ', 'KeyX', 'KeyC'][index]);
            const requestedStage = dojoStages.find((_, index) => event.code === `Digit${index + 1}`);
            const requestedKitchenStage = kitchenStages.find((_, index) => event.code === `Digit${index + 4}`);
            const requestedSmithyLevel = smithyLevels.find((_, index) => event.code === `Digit${[7, 8, 9, 0][index]}`);
            if (event.code === 'Escape') {
                event.preventDefault();
                if (!event.repeat)
                    this.togglePause();
            }
            else if (requestedHallLevel !== undefined) {
                if (!event.repeat)
                    this.selectHallLevel(requestedHallLevel);
            }
            else if (requestedStage) {
                if (!event.repeat)
                    this.selectStage(requestedStage);
            }
            else if (requestedKitchenStage) {
                if (!event.repeat)
                    this.selectKitchenStage(requestedKitchenStage);
            }
            else if (requestedSmithyLevel !== undefined) {
                if (!event.repeat)
                    this.selectSmithyLevel(requestedSmithyLevel);
            }
            else if (movementKeys.has(event.code)) {
                event.preventDefault();
                if (!this.paused)
                    this.keys.add(event.code);
            }
        }, { signal });
        window.addEventListener('keyup', (event) => this.keys.delete(event.code), {
            signal,
        });
        window.addEventListener('blur', () => this.clearInput(), { signal });
        this.canvas.addEventListener('blur', () => this.clearInput(), { signal });
        document.addEventListener('visibilitychange', () => {
            this.clearInput();
            cancelAnimationFrame(this.frameId);
            this.frameId = 0;
            if (!document.hidden && this.ready)
                this.schedule();
        }, { signal });
        this.canvas.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            this.fail('그래픽 연결이 끊겼어요. 새로고침해 주세요.');
        }, { signal });
        this.observer = new ResizeObserver(() => this.draw(0));
        this.observer.observe(this.canvas);
        void this.start();
    }
    async start() {
        try {
            this.scene = new DojoScene(this.canvas);
            await this.scene.load();
            if (this.disposed)
                return;
            this.ready = true;
            document
                .querySelectorAll('[data-control]')
                .forEach((control) => {
                control.disabled = false;
            });
            this.selectHallLevel(1);
            this.selectStage('weathered');
            this.selectKitchenStage('weathered');
            this.selectSmithyLevel(0);
            const requestedView = new URL(location.href).searchParams.get('view');
            this.selectView(dojoViews.find((view) => view === requestedView) ?? 'village');
            this.schedule();
        }
        catch (error) {
            if (!this.disposed)
                this.fail(error instanceof Error
                    ? error.message
                    : '미리보기를 준비하지 못했어요.');
        }
    }
    selectHallLevel(level) {
        if (!this.ready)
            return;
        this.clearInput();
        this.scene?.setHallLevel(level);
        const copy = hallCopy[level];
        element('#hall-badge').textContent = `회관 Lv.${level}`;
        element('#hall-number').textContent = `Lv.${level}`;
        element('#hall-title').textContent = copy.title;
        element('#hall-description').textContent = copy.description;
        element('#hall-changes').replaceChildren(...copy.changes.map((text) => {
            const item = document.createElement('li');
            item.textContent = text;
            return item;
        }));
        for (const name of townHallLevels)
            element(`#hall-${name}`).setAttribute('aria-pressed', String(name === level));
        this.draw(0);
        this.canvas.focus({ preventScroll: true });
    }
    selectStage(stage) {
        if (!this.ready)
            return;
        this.clearInput();
        this.stage = stage;
        this.scene?.setStage(stage);
        const copy = stageCopy[stage];
        element('#stage-number').textContent = copy.number;
        element('#stage-title').textContent = copy.title;
        element('#stage-description').textContent = copy.description;
        element('#stage-badge').textContent = `도장 ${copy.number}`;
        element('#changes').replaceChildren(...copy.changes.map((text) => {
            const item = document.createElement('li');
            item.textContent = text;
            return item;
        }));
        for (const name of dojoStages)
            element(`#${name}`).setAttribute('aria-pressed', String(name === stage));
        this.status.textContent =
            'WASD·방향키 이동 / 회관 Z·X·C / 도장 1·2·3 / 식사터 4·5·6 / 대장간 7·8·9·0 / Esc 멈춤';
        this.draw(0);
        this.canvas.focus({ preventScroll: true });
    }
    selectKitchenStage(stage) {
        if (!this.ready)
            return;
        this.clearInput();
        this.scene?.setKitchenStage(stage);
        const copy = kitchenCopy[stage];
        element('#kitchen-badge').textContent =
            `식사터 Lv.${kitchenStages.indexOf(stage)}`;
        element('#kitchen-title').textContent = copy.title;
        element('#kitchen-description').textContent = copy.description;
        element('#kitchen-changes').replaceChildren(...copy.changes.map((text) => {
            const item = document.createElement('li');
            item.textContent = text;
            return item;
        }));
        for (const name of kitchenStages)
            element(`#kitchen-${name}`).setAttribute('aria-pressed', String(name === stage));
        this.draw(0);
        this.canvas.focus({ preventScroll: true });
    }
    clearInput() {
        this.keys.clear();
        this.walk.stop();
    }
    selectSmithyLevel(level) {
        if (!this.ready)
            return;
        this.clearInput();
        this.scene?.setSmithyLevel(level);
        const copy = smithyCopy[level];
        element('#smithy-badge').textContent = `대장간 Lv.${level}`;
        element('#smithy-number').textContent = `Lv.${level}`;
        element('#smithy-title').textContent = copy.title;
        element('#smithy-description').textContent = copy.description;
        element('#smithy-changes').replaceChildren(...copy.changes.map((text) => {
            const item = document.createElement('li');
            item.textContent = text;
            return item;
        }));
        for (const name of smithyLevels)
            element(`#smithy-${name}`).setAttribute('aria-pressed', String(name === level));
        this.draw(0);
        this.canvas.focus({ preventScroll: true });
    }
    selectView(view) {
        const url = new URL(location.href);
        url.searchParams.set('view', view);
        history.replaceState(null, '', url);
        if (!this.ready)
            return;
        this.clearInput();
        this.scene?.setView(view);
        for (const name of dojoViews)
            element(`#view-${name}`).setAttribute('aria-pressed', String(name === view));
        this.draw(0);
        this.canvas.focus({ preventScroll: true });
    }
    togglePause() {
        if (!this.ready)
            return;
        this.paused = !this.paused;
        this.clearInput();
        const button = element('#pause');
        button.textContent = this.paused ? '계속 걷기' : '잠깐 멈춤';
        button.setAttribute('aria-pressed', String(this.paused));
        this.draw(0);
        this.canvas.focus({ preventScroll: true });
    }
    schedule() {
        if (this.disposed || !this.ready || document.hidden || this.frameId)
            return;
        this.previousTime = performance.now();
        this.frameId = requestAnimationFrame(this.tick);
    }
    tick = (now) => {
        this.frameId = 0;
        if (this.disposed || !this.ready || document.hidden)
            return;
        const dt = this.paused
            ? 0
            : Math.min(0.05, Math.max(0, (now - this.previousTime) / 1000));
        this.previousTime = now;
        const pressed = (a, b) => Number(this.keys.has(a) || this.keys.has(b));
        if (!this.paused)
            this.walk.update(dt, {
                x: pressed('KeyD', 'ArrowRight') - pressed('KeyA', 'ArrowLeft'),
                z: pressed('KeyS', 'ArrowDown') - pressed('KeyW', 'ArrowUp'),
            });
        this.draw(dt);
        this.frameId = requestAnimationFrame(this.tick);
    };
    draw(dt) {
        if (!this.ready || this.disposed)
            return;
        this.scene?.render(this.walk.snapshot, dt);
        if (this.dev)
            this.diagnostics.textContent = JSON.stringify({
                ...this.walk.snapshot,
                stage: this.stage,
                paused: this.paused,
                ...this.scene?.diagnostics,
            });
    }
    fail(message) {
        this.ready = false;
        this.clearInput();
        cancelAnimationFrame(this.frameId);
        this.frameId = 0;
        this.scene?.dispose();
        this.scene = null;
        this.status.textContent = message;
        document
            .querySelectorAll('[data-control]')
            .forEach((control) => {
            control.disabled = true;
        });
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.ready = false;
        this.lifetime.abort();
        this.observer.disconnect();
        cancelAnimationFrame(this.frameId);
        this.clearInput();
        this.scene?.dispose();
    }
}
let screen = new DojoScreen();
window.addEventListener('pagehide', () => {
    screen?.dispose();
    screen = null;
});
window.addEventListener('pageshow', (event) => {
    if (event.persisted && !screen)
        screen = new DojoScreen();
});
