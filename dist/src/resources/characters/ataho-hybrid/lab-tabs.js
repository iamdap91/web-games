import { embeddedScene, registerEmbeddedScene, } from '../../catalog/embedded-scene.js';
const labTabs = [
    {
        id: 'attacks',
        page: 'pixellab-attacks.html',
        label: '공격 모션',
        description: '정권지르기·발차기·철산고의 준비, 타격, 복귀 자세를 살펴봅니다.',
    },
    {
        id: 'walk',
        page: 'pixellab-walk.html',
        label: '측면 걷기',
        description: '오른쪽 원화와 생성된 걷기를 같은 크기와 발 기준으로 비교합니다. 왼쪽 반전도 확인할 수 있습니다.',
    },
    {
        id: 'side',
        page: 'side.html',
        label: '좌우 기준 그림',
        description: '승인 원화의 외형과 화풍을 유지한 오른쪽 기준, 왼쪽 반전을 비교합니다.',
    },
    {
        id: 'idle',
        page: 'pixellab-idle.html',
        label: '정면 대기 시험',
        description: '승인 원화, 축소한 입력, 생성된 대기를 같은 크기로 비교합니다.',
    },
    {
        id: 'art',
        page: 'art.html',
        label: '승인 원화',
        description: '선택한 비도트 원화 01과 현재 도트 정면 그림의 외형을 비교합니다.',
    },
    {
        id: 'hybrid',
        page: 'motion.html',
        label: '기존 하이브리드 비교',
        description: '현재 프레임 방식과 기존 비도트 하이브리드 시안을 같은 장면에서 비교합니다. ← → 이동, J 정권, K 회전발차기, Space 일시정지.',
    },
];
class AtahoLabTabs {
    events = new AbortController();
    buttons = [
        ...document.querySelectorAll('[role="tab"]'),
    ];
    panel = document.querySelector('#lab-panel');
    description = document.querySelector('#lab-description');
    status = document.querySelector('#lab-status');
    retry = document.querySelector('#lab-retry');
    current;
    resize;
    loadingTimer;
    frame;
    frameEvents;
    constructor() {
        registerEmbeddedScene(() => this.dispose());
        const options = { signal: this.events.signal };
        for (const button of this.buttons) {
            button.addEventListener('click', () => this.select(button.dataset.tab), options);
            button.addEventListener('keydown', (event) => this.navigate(event, button), options);
        }
        window.addEventListener('hashchange', () => this.showHash(), options);
        window.addEventListener('pagehide', (event) => {
            if (!event.persisted)
                this.dispose();
        }, options);
        this.retry.addEventListener('click', () => {
            if (this.current)
                this.load(this.current);
        }, options);
        this.showHash();
    }
    select(id) {
        if (!id)
            return;
        if (location.hash === `#${id}`)
            return;
        location.hash = id;
    }
    showHash() {
        const tab = labTabs.find((item) => item.id === location.hash.slice(1)) ?? labTabs[0];
        if (location.hash !== `#${tab.id}`)
            history.replaceState(null, '', `#${tab.id}`);
        if (this.current?.id === tab.id)
            return;
        this.current = tab;
        for (const button of this.buttons) {
            const selected = button.dataset.tab === tab.id;
            button.setAttribute('aria-selected', String(selected));
            button.tabIndex = selected ? 0 : -1;
        }
        this.panel.setAttribute('aria-labelledby', `tab-${tab.id}`);
        this.description.textContent = tab.description;
        this.load(tab);
    }
    navigate(event, button) {
        const index = this.buttons.indexOf(button);
        let next;
        if (event.key === 'ArrowRight')
            next = (index + 1) % this.buttons.length;
        else if (event.key === 'ArrowLeft')
            next = (index - 1 + this.buttons.length) % this.buttons.length;
        else if (event.key === 'Home')
            next = 0;
        else if (event.key === 'End')
            next = this.buttons.length - 1;
        else
            return;
        event.preventDefault();
        const target = this.buttons[next];
        target.focus();
        this.select(target.dataset.tab);
    }
    load(tab) {
        this.resize?.disconnect();
        this.frameEvents?.abort();
        window.clearTimeout(this.loadingTimer);
        this.releaseFrame();
        const frame = document.createElement('iframe');
        this.frame = frame;
        this.frameEvents = new AbortController();
        frame.title = `아타호 · ${tab.label}`;
        frame.setAttribute('scrolling', 'no');
        const url = new URL(tab.page, location.href);
        url.search = location.search;
        url.searchParams.set('embedded', '1');
        url.hash = '';
        this.panel.setAttribute('aria-busy', 'true');
        this.retry.hidden = true;
        this.status.textContent = `${tab.label} 화면을 불러오는 중이에요.`;
        frame.addEventListener('load', () => this.frameLoaded(frame, tab), {
            once: true,
            signal: this.frameEvents.signal,
        });
        frame.addEventListener('error', () => this.fail(tab), {
            once: true,
            signal: this.frameEvents.signal,
        });
        this.loadingTimer = window.setTimeout(() => {
            if (this.frame === frame)
                this.fail(tab);
        }, 15000);
        frame.src = url.href;
        this.panel.replaceChildren(frame);
    }
    frameLoaded(frame, tab) {
        if (this.frame !== frame)
            return;
        window.clearTimeout(this.loadingTimer);
        const main = frame.contentDocument?.querySelector('main');
        if (!main) {
            this.fail(tab);
            return;
        }
        this.panel.setAttribute('aria-busy', 'false');
        this.retry.hidden = true;
        this.status.textContent = `${tab.label} · 탭은 ← →, Home, End로 선택할 수 있어요.`;
        const fit = () => {
            const child = frame.contentWindow;
            if (!child || this.frame !== frame)
                return;
            const bottom = main.getBoundingClientRect().bottom + child.scrollY;
            const margin = parseFloat(child.getComputedStyle(main).marginBottom) || 0;
            frame.style.height = `${Math.ceil(bottom + margin)}px`;
        };
        this.resize = new ResizeObserver(fit);
        this.resize.observe(main);
        fit();
        void frame.contentDocument?.fonts.ready.then(fit);
    }
    fail(tab) {
        this.panel.setAttribute('aria-busy', 'false');
        this.status.textContent = `${tab.label} 화면을 불러오지 못했어요. 다시 불러오기를 눌러 주세요.`;
        this.retry.hidden = false;
    }
    dispose() {
        this.events.abort();
        this.frameEvents?.abort();
        this.resize?.disconnect();
        window.clearTimeout(this.loadingTimer);
        this.releaseFrame();
    }
    releaseFrame() {
        if (embeddedScene)
            this.frame?.contentWindow?.dispatchEvent(new Event('resource-scene-dispose'));
        this.frame?.remove();
        this.frame = undefined;
    }
}
const childTab = document.body.dataset.labTab;
if (childTab) {
    if (new URL(location.href).searchParams.get('embedded') === '1') {
        document.documentElement.dataset.embedded = 'true';
    }
    else {
        const target = new URL('index.html', location.href);
        target.search = location.search;
        target.hash = childTab;
        location.replace(target.href);
    }
}
else {
    new AtahoLabTabs();
}
