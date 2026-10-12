import manifest from '../../../../resources/manifest.json' with { type: 'json' };
import { monsterCatalog, normalMonsterIds, monsterRoleNames, monsterThemeNames, } from '../../../prototypes/overdrive-battle/monster-catalog.js';
import { ResourcePreview } from '../../preview/preview.js';
import { showOriginals } from '../../preview/originals.js';
import { sceneHeight } from '../../preview/preview-renderer.js';
const basicMotions = ['stand', 'move', 'attack1', 'hit1', 'die1'];
const previousAssetIds = [
    'ai/slime',
    'ai/yeti',
    'ai/mushroom-spirit',
    'ai/forest-wolf',
    'ai/armored-boar',
];
function element(id, type) {
    const found = document.getElementById(id);
    if (!(found instanceof type))
        throw new Error(`갤러리 요소가 없습니다: ${id}`);
    return found;
}
function animationsFor(assetId) {
    return (manifest.assets.find((asset) => asset.id === assetId)?.animations ?? null);
}
function hasBasicMotions(assetId) {
    const animations = animationsFor(assetId);
    return basicMotions.every((motion) => !!animations?.[motion]?.frames.length);
}
function galleryEntries() {
    const previous = previousAssetIds.map((assetId) => {
        const asset = manifest.assets.find((item) => item.id === assetId);
        if (!asset)
            throw new Error(`기존 몬스터 리소스가 없습니다: ${assetId}`);
        return {
            assetId,
            name: asset.name,
            theme: 'previous',
            role: null,
        };
    });
    return [
        ...previous,
        ...[...monsterCatalog.values()]
            .filter((monster) => monster.grade === 'normal')
            .map((monster) => ({
            assetId: monster.assetId,
            name: monster.name,
            theme: monster.theme,
            role: monster.role,
        })),
    ];
}
/** 선택과 필터 수명을 소유하고 실제 모션 재생은 기존 ResourcePreview에 맡긴다. */
class MonsterGallery {
    entries = galleryEntries();
    theme = element('theme', HTMLSelectElement);
    role = element('role', HTMLSelectElement);
    select = element('monster', HTMLSelectElement);
    count = element('count', HTMLParagraphElement);
    name = element('monster-name', HTMLSpanElement);
    summary = element('monster-summary', HTMLParagraphElement);
    status = element('status', HTMLParagraphElement);
    canvas = element('scene', HTMLCanvasElement);
    originals = element('originals', HTMLDivElement);
    originalsPanel = element('originals-panel', HTMLDetailsElement);
    restart = element('restart', HTMLButtonElement);
    events = new AbortController();
    preview = null;
    constructor() {
        this.theme.append(new Option('기존 몬스터', 'previous'));
        for (const [value, label] of Object.entries(monsterThemeNames))
            this.theme.append(new Option(label, value));
        for (const [value, label] of Object.entries(monsterRoleNames))
            this.role.append(new Option(label, value));
        const { signal } = this.events;
        this.theme.addEventListener('change', () => this.filter(this.select.value), { signal });
        this.role.addEventListener('change', () => this.filter(this.select.value), {
            signal,
        });
        this.select.addEventListener('change', () => this.showSelected(), {
            signal,
        });
        this.restart.addEventListener('click', () => this.preview?.restart(), {
            signal,
        });
        window.addEventListener('pagehide', (event) => {
            if (!event.persisted) {
                this.preview?.destroy();
                this.events.abort();
            }
        }, { signal });
        const requested = new URL(location.href).searchParams.get('asset');
        const firstReady = this.entries.find((entry) => entry.theme !== 'previous' && hasBasicMotions(entry.assetId));
        this.filter(requested ?? firstReady?.assetId);
    }
    filter(preferred) {
        const entries = this.entries.filter((entry) => (!this.theme.value || entry.theme === this.theme.value) &&
            (!this.role.value || entry.role === this.role.value));
        const groups = new Map();
        this.select.replaceChildren();
        for (const entry of entries) {
            let group = groups.get(entry.theme);
            if (!group) {
                group = document.createElement('optgroup');
                group.label =
                    entry.theme === 'previous'
                        ? '기존 몬스터'
                        : monsterThemeNames[entry.theme];
                groups.set(entry.theme, group);
                this.select.append(group);
            }
            const pending = entry.theme !== 'previous' && !hasBasicMotions(entry.assetId);
            group.append(new Option(`${entry.name}${pending ? ' · 모션 준비 중' : ''}`, entry.assetId));
        }
        this.select.disabled = entries.length === 0;
        this.select.value =
            entries.find((entry) => entry.assetId === preferred)?.assetId ??
                entries[0]?.assetId ??
                '';
        const registered = [...monsterCatalog.values()].filter((monster) => monster.grade === 'normal' && hasBasicMotions(monster.assetId)).length;
        this.count.textContent = `${entries.length}종 표시 · 기존 ${previousAssetIds.length}종 · 신규 ${normalMonsterIds.length}종 중 기본 5모션 등록 ${registered}종`;
        this.showSelected();
    }
    clearPreview() {
        this.preview?.destroy();
        this.preview = null;
        this.restart.disabled = true;
        const context = this.canvas.getContext('2d');
        if (context) {
            // 기존 뷰어의 월드 변환을 잠시 풀고 backing store 전체를 비운다.
            context.save();
            context.resetTransform();
            context.clearRect(0, 0, this.canvas.width, this.canvas.height);
            context.restore();
        }
        element('motion', HTMLSelectElement).replaceChildren();
        element('motion', HTMLSelectElement).disabled = true;
        element('toggle', HTMLButtonElement).disabled = true;
        element('toggle', HTMLButtonElement).textContent = '일시정지';
        element('frame', HTMLOutputElement).value = '—';
        element('motion-notes', HTMLParagraphElement).textContent = '';
        this.originals.replaceChildren();
        this.originalsPanel.open = false;
        this.originalsPanel.hidden = true;
        this.status.setAttribute('role', 'status');
    }
    showSelected() {
        this.clearPreview();
        const entry = this.entries.find((item) => item.assetId === this.select.value);
        if (!entry) {
            this.name.textContent = '선택 결과 없음';
            this.summary.textContent = '';
            this.status.textContent = '다른 테마나 역할을 선택해 주세요.';
            return;
        }
        this.name.textContent = entry.name;
        this.canvas.setAttribute('aria-label', `${entry.name} 모션 미리보기`);
        element('motion', HTMLSelectElement).setAttribute('aria-label', `${entry.name} 모션`);
        this.summary.textContent =
            entry.theme === 'previous'
                ? '기존 몬스터의 등록된 모션을 재생합니다.'
                : `${monsterThemeNames[entry.theme]} · ${monsterRoleNames[entry.role]}`;
        const asset = manifest.assets.find((item) => item.id === entry.assetId);
        if (asset && 'originals' in asset && asset.originals) {
            this.originalsPanel.hidden = false;
            showOriginals(entry.assetId);
        }
        const animations = animationsFor(entry.assetId);
        if (!animations?.stand?.frames.length ||
            (entry.theme !== 'previous' && !hasBasicMotions(entry.assetId))) {
            this.status.textContent =
                '기본 5모션을 준비 중입니다. 원본 후보만으로는 모션 재생을 시작하지 않습니다.';
            return;
        }
        const height = Math.max(1, ...Object.values(animations).flatMap((motion) => motion?.frames.map((frame) => frame.height) ?? []));
        // 한 개체의 모든 모션에 같은 배율을 사용해 자세 사이의 상대 크기를 유지한다.
        const scale = Math.min(4, (sceneHeight * 0.6) / height);
        this.status.textContent = `${entry.name}의 로컬 모션을 불러오는 중…`;
        try {
            const preview = new ResourcePreview(entry.assetId, scale);
            this.preview = preview;
            void preview
                .start()
                .then(() => {
                if (this.preview === preview && !this.events.signal.aborted)
                    this.restart.disabled = false;
            })
                .catch((error) => {
                if (this.preview !== preview || this.events.signal.aborted)
                    return;
                this.status.textContent =
                    error instanceof Error
                        ? error.message
                        : '모션을 불러오지 못했습니다.';
                this.status.setAttribute('role', 'alert');
            });
        }
        catch (error) {
            this.status.textContent =
                error instanceof Error ? error.message : '모션을 불러오지 못했습니다.';
            this.status.setAttribute('role', 'alert');
        }
    }
}
new MonsterGallery();
