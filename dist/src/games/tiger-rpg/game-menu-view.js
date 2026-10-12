import { MenuSound } from './menu-sound.js';
const menuKeys = new Set([
    'Space',
    'Escape',
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'Enter',
    'NumpadEnter',
    'KeyQ',
    'KeyW',
    'KeyE',
    'KeyR',
    'KeyF',
    'Tab',
]);
/** 선택과 표시를 소유한다. 루프 정지·재개와 음향·저장은 호출한 화면이 결정한다. */
export class GameMenuView {
    root;
    layer = document.createElement('div');
    panel = document.createElement('section');
    title = document.createElement('h2');
    description = document.createElement('p');
    content = document.createElement('div');
    choices = document.createElement('div');
    actions = document.createElement('div');
    detail = document.createElement('p');
    hint = document.createElement('p');
    lifetime = new AbortController();
    sound;
    heldKeys = new Set();
    consumedKeys = new Set();
    items = [];
    buttons = [];
    selectedId = null;
    previewId = null;
    onCancel = null;
    help = false;
    selecting = false;
    disposed = false;
    constructor(root, options = {}) {
        this.root = root;
        this.sound = new MenuSound(options.getSoundEnabled ?? (() => true));
        const stylesheet = document.createElement('link');
        stylesheet.rel = 'stylesheet';
        stylesheet.href = new URL('../../../../src/games/tiger-rpg/game-menu-view.css', import.meta.url).href;
        this.layer.className = 'rpg-menu-layer';
        this.layer.hidden = true;
        this.panel.className = 'rpg-menu-panel';
        this.panel.tabIndex = -1;
        this.panel.setAttribute('role', 'dialog');
        this.panel.setAttribute('aria-modal', 'true');
        this.description.className = 'rpg-menu-description';
        this.content.className = 'rpg-menu-content';
        this.choices.className = 'rpg-menu-choices';
        this.actions.className = 'rpg-menu-actions';
        this.detail.className = 'rpg-menu-detail';
        this.detail.setAttribute('aria-live', 'polite');
        this.hint.className = 'rpg-menu-hint';
        this.panel.append(this.title, this.description, this.content, this.choices, this.actions, this.detail, this.hint);
        this.layer.append(stylesheet, this.panel);
        root.append(this.layer);
        this.registerInput();
    }
    get visible() {
        return !this.layer.hidden;
    }
    show(model) {
        if (this.disposed)
            return;
        const previous = this.visible ? this.selectedId : null;
        this.help = false;
        this.panel.dataset.help = 'false';
        this.panel.dataset.layout = model.layout ?? '';
        this.setHeading(model.title, model.description ?? '');
        this.onCancel = model.onCancel;
        this.content.replaceChildren(...(model.content ? [model.content] : []));
        this.content.hidden = !model.content;
        this.setItems(model.items, model.initialId ?? previous);
        this.hint.textContent =
            model.hint ??
                (model.onCancel
                    ? '방향키 선택 · Space 확정 · Esc 돌아가기'
                    : '방향키 선택 · Space 확정');
        this.open();
    }
    showHelp(model) {
        if (this.disposed)
            return;
        this.help = true;
        this.panel.dataset.help = 'true';
        this.panel.dataset.layout = '';
        this.setHeading(model.title, '');
        this.onCancel = model.onBack;
        this.content.replaceChildren();
        for (const section of model.sections) {
            const group = document.createElement('section');
            const title = document.createElement('h3');
            title.textContent = section.title;
            group.append(title);
            for (const line of section.lines) {
                const paragraph = document.createElement('p');
                paragraph.textContent = line;
                group.append(paragraph);
            }
            this.content.append(group);
        }
        this.content.hidden = false;
        this.content.scrollTop = 0;
        this.setItems([{ id: 'back', label: '돌아가기', onSelect: model.onBack }], 'back');
        this.hint.textContent = '↑↓ 읽기 · Space / Esc 돌아가기';
        this.open();
    }
    setHeading(title, description) {
        this.title.textContent = title;
        this.panel.setAttribute('aria-label', title);
        this.description.textContent = description;
        this.description.hidden = !description;
    }
    setItems(items, preferred) {
        this.items = items;
        this.previewId = null;
        this.buttons = items.map((item) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'rpg-menu-choice';
            button.dataset.menuId = item.id;
            this.renderButton(button, item);
            button.addEventListener('focus', () => this.selectFromInput(item.id));
            button.addEventListener('click', () => {
                this.selectFromInput(item.id);
                if (this.items.find((choice) => choice.id === item.id)?.interaction !==
                    'preview')
                    this.confirm();
            });
            return button;
        });
        this.choices.replaceChildren(...this.buttons.filter((_, index) => items[index]?.placement !== 'action'));
        this.actions.replaceChildren(...this.buttons.filter((_, index) => items[index]?.placement === 'action'));
        this.updateActionsVisibility();
        const selected = items.find((item) => item.id === preferred && !item.disabled && !item.hidden) ?? items.find((item) => !item.disabled && !item.hidden);
        this.select(selected?.id ?? null);
    }
    renderButton(button, item) {
        if (item.content)
            button.replaceChildren(item.content);
        else
            button.textContent = item.label;
        button.setAttribute('aria-label', item.label);
        button.disabled = item.disabled ?? false;
        button.hidden = item.hidden ?? false;
    }
    updateActionsVisibility() {
        this.actions.hidden = !this.items.some((item) => item.placement === 'action' && !item.hidden);
    }
    /** 목록을 살펴보는 동안 별도의 실행 버튼만 갱신한다. */
    updateItem(item) {
        const index = this.items.findIndex((choice) => choice.id === item.id);
        const button = this.buttons[index];
        if (!button)
            return;
        this.items = this.items.map((choice) => choice.id === item.id ? item : choice);
        this.renderButton(button, item);
        this.updateActionsVisibility();
    }
    focusItem(id) {
        const item = this.items.find((choice) => choice.id === id);
        if (!item || item.disabled || item.hidden)
            return;
        this.selectFromInput(id);
        this.focusSelection();
    }
    open() {
        this.layer.hidden = false;
        // 메뉴를 연 키와 누르고 있던 이동 키는 놓을 때까지 다음 조작에 쓰지 않는다.
        for (const code of this.heldKeys)
            this.consumedKeys.add(code);
        this.focusSelection();
    }
    select(id) {
        this.selectedId = id;
        if (this.items.find((item) => item.id === id)?.interaction === 'preview')
            this.previewId = id;
        this.buttons.forEach((button) => {
            const selected = button.dataset.menuId === id;
            button.dataset.selected = String(selected);
            button.dataset.preview = String(button.dataset.menuId === this.previewId);
            button.setAttribute('aria-current', String(selected));
        });
        this.detail.textContent =
            this.items.find((item) => item.id === id)?.description ?? '';
        this.detail.hidden = !this.detail.textContent;
        this.items.find((item) => item.id === id)?.onHighlight?.();
    }
    selectFromInput(id) {
        const changed = this.selectedId !== id;
        this.select(id);
        if (changed && this.visible)
            this.sound.play();
    }
    focusSelection() {
        const button = this.buttons.find((choice) => choice.dataset.menuId === this.selectedId);
        (button ?? this.panel).focus({ preventScroll: true });
        button?.scrollIntoView({ block: 'nearest' });
    }
    moveSelection(direction) {
        const enabled = this.items.filter((item) => !item.disabled && !item.hidden);
        if (!enabled.length)
            return;
        const current = enabled.findIndex((item) => item.id === this.selectedId);
        const next = (Math.max(0, current) + direction + enabled.length) % enabled.length;
        this.selectFromInput(enabled[next].id);
        this.focusSelection();
    }
    moveHorizontal(direction) {
        const current = this.items.find((item) => item.id === this.selectedId);
        if (this.panel.dataset.layout === 'smithy') {
            if (direction > 0 && current?.interaction === 'preview') {
                const action = this.items.find((item) => item.placement === 'action');
                if (action)
                    this.focusItem(action.id);
                return;
            }
            if (direction < 0 && current?.placement === 'action' && this.previewId) {
                this.focusItem(this.previewId);
                return;
            }
        }
        this.moveSelection(direction);
    }
    confirm() {
        const item = this.items.find((choice) => choice.id === this.selectedId);
        if (!this.visible ||
            this.selecting ||
            !item ||
            item.disabled ||
            item.hidden)
            return;
        this.selecting = true;
        try {
            item.onSelect();
        }
        finally {
            this.selecting = false;
        }
    }
    registerInput() {
        const { signal } = this.lifetime;
        window.addEventListener('keydown', (event) => {
            if (!menuKeys.has(event.code) ||
                event.isComposing ||
                event.ctrlKey ||
                event.metaKey ||
                event.altKey)
                return;
            const consumed = this.consumedKeys.has(event.code);
            if (!consumed &&
                !this.visible &&
                !event.composedPath().includes(this.root))
                return;
            const wasHeld = this.heldKeys.has(event.code);
            this.heldKeys.add(event.code);
            if (!consumed && !this.visible)
                return;
            event.preventDefault();
            event.stopImmediatePropagation();
            this.consumedKeys.add(event.code);
            if (consumed || wasHeld || event.repeat)
                return;
            if (event.code === 'Escape')
                this.onCancel?.();
            else if (event.code === 'Space')
                this.confirm();
            else if (event.code === 'Tab')
                this.moveSelection(event.shiftKey ? -1 : 1);
            else if (event.code.startsWith('Arrow')) {
                const direction = event.code === 'ArrowUp' || event.code === 'ArrowLeft' ? -1 : 1;
                if (this.help &&
                    (event.code === 'ArrowUp' || event.code === 'ArrowDown'))
                    this.content.scrollBy({
                        top: direction * Math.max(48, this.content.clientHeight * 0.7),
                    });
                else if (event.code === 'ArrowLeft' || event.code === 'ArrowRight')
                    this.moveHorizontal(direction);
                else
                    this.moveSelection(direction);
            }
        }, { capture: true, signal });
        window.addEventListener('keyup', (event) => {
            // Space의 기본 click만 막고, 게임 쪽의 눌린 키 해제는 통과시킨다.
            if (this.consumedKeys.has(event.code))
                event.preventDefault();
            this.heldKeys.delete(event.code);
            this.consumedKeys.delete(event.code);
        }, { capture: true, signal });
        const clearKeys = () => {
            this.heldKeys.clear();
            this.consumedKeys.clear();
        };
        window.addEventListener('blur', clearKeys, { signal });
        document.addEventListener('visibilitychange', clearKeys, { signal });
    }
    close() {
        this.layer.hidden = true;
        this.onCancel = null;
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.close();
        this.lifetime.abort();
        this.sound.dispose();
        this.layer.remove();
        this.items = [];
        this.buttons = [];
        this.heldKeys.clear();
        this.consumedKeys.clear();
    }
}
