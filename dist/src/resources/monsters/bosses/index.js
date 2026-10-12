import { resourceUrl } from '../../catalog/resource-url.js';
import manifest from '../../../../resources/manifest.json' with { type: 'json' };
import plan from '../../../../resources/map-boss-plan.json' with { type: 'json' };
import { monsterDefinition } from '../../../prototypes/overdrive-battle/monster-catalog.js';
import { mapBossDefinitions, mapBossMaps, } from '../../../prototypes/overdrive-battle/map-boss-catalog.js';
import { mapBossFormations } from '../../../prototypes/overdrive-battle/map-boss-formations.js';
import { ResourcePreview } from '../../preview/preview.js';
import { showOriginals } from '../../preview/originals.js';
import { drawFrame, drawLandscape, sceneHeight, sceneWidth, } from '../../preview/preview-renderer.js';
function element(id, type) {
    const found = document.getElementById(id);
    if (!(found instanceof type))
        throw new Error(`보스 갤러리 요소가 없습니다: ${id}`);
    return found;
}
const definitions = mapBossDefinitions.map((item) => monsterDefinition(item.id));
function readyAsset(assetId) {
    const asset = manifest.assets.find((item) => item.id === assetId);
    return plan.requiredMotions.every((motion) => Object.entries(asset?.animations ?? {}).some(([name, value]) => name === motion && !!value?.frames.length));
}
function slotName(id) {
    const kind = mapBossFormations.find((formation) => formation.monsters[0] === id)?.kind;
    return kind === 'miniboss-a'
        ? '중간보스 A'
        : kind === 'miniboss-b'
            ? '중간보스 B'
            : '보스';
}
/** 계획의 명단을 표시하며 실제 자산·전투 카탈로그는 공급 세션의 완료본만 연결한다. */
class MapBossGallery {
    map = element('map', HTMLSelectElement);
    grade = element('grade', HTMLSelectElement);
    select = element('monster', HTMLSelectElement);
    count = element('count', HTMLParagraphElement);
    name = element('monster-name', HTMLSpanElement);
    summary = element('monster-summary', HTMLParagraphElement);
    status = element('status', HTMLParagraphElement);
    canvas = element('scene', HTMLCanvasElement);
    motion = element('motion', HTMLSelectElement);
    toggle = element('toggle', HTMLButtonElement);
    restart = element('restart', HTMLButtonElement);
    originals = element('originals', HTMLDivElement);
    originalsPanel = element('originals-panel', HTMLDetailsElement);
    events = new AbortController();
    referenceFrame = manifest.assets.find((asset) => asset.id === 'ai/tiger-hero')?.animations.stand?.frames[0];
    referenceImage = new Image();
    observer = new ResizeObserver(() => {
        if (!this.preview)
            this.drawReference();
    });
    preview = null;
    constructor() {
        if (!this.referenceFrame)
            throw new Error('아타호 대기 리소스가 없습니다.');
        for (const map of mapBossMaps)
            this.map.append(new Option(map.name, map.id));
        const { signal } = this.events;
        this.map.addEventListener('change', () => this.filter(this.select.value), {
            signal,
        });
        this.grade.addEventListener('change', () => this.filter(this.select.value), { signal });
        this.select.addEventListener('change', () => this.showSelected(), {
            signal,
        });
        this.restart.addEventListener('click', () => this.preview?.restart(), {
            signal,
        });
        window.addEventListener('pagehide', (event) => {
            if (event.persisted)
                return;
            this.preview?.destroy();
            this.observer.disconnect();
            this.events.abort();
            this.referenceImage.src = '';
        }, { signal });
        this.referenceImage.src = resourceUrl(this.referenceFrame.localPath).href;
        void this.referenceImage
            .decode()
            .then(() => {
            if (!signal.aborted && !this.preview)
                this.drawReference();
        })
            .catch(() => {
            if (!signal.aborted)
                this.status.textContent = '아타호 비교 이미지를 불러오지 못했습니다.';
        });
        this.observer.observe(this.canvas);
        const requested = new URL(location.href).searchParams.get('asset');
        this.filter(requested ??
            definitions.find((item) => readyAsset(item.assetId))?.assetId);
    }
    filter(preferred) {
        const creatures = definitions.filter((item) => (!this.map.value || item.mapId === this.map.value) &&
            (!this.grade.value || item.grade === this.grade.value));
        this.select.replaceChildren();
        for (const map of mapBossMaps) {
            const group = document.createElement('optgroup');
            group.label = map.name;
            for (const creature of creatures.filter((item) => item.mapId === map.id)) {
                group.append(new Option(`${slotName(creature.id)} · ${creature.name}${readyAsset(creature.assetId) ? '' : ' · 모션 준비 중'}`, creature.assetId));
            }
            if (group.childElementCount)
                this.select.append(group);
        }
        this.select.disabled = creatures.length === 0;
        this.select.value =
            creatures.find((item) => item.assetId === preferred)?.assetId ??
                creatures[0]?.assetId ??
                '';
        const ready = definitions.filter((item) => readyAsset(item.assetId)).length;
        this.count.textContent = `${creatures.length}종 표시 · 지도 ${mapBossMaps.length}개 · 기본 5모션 등록 ${ready}/${definitions.length}종`;
        this.showSelected();
    }
    clearPreview() {
        this.preview?.destroy();
        this.preview = null;
        const context = this.canvas.getContext('2d');
        if (context) {
            context.save();
            context.resetTransform();
            context.clearRect(0, 0, this.canvas.width, this.canvas.height);
            context.restore();
        }
        this.motion.replaceChildren();
        this.motion.disabled = true;
        this.toggle.disabled = true;
        this.toggle.textContent = '일시정지';
        this.restart.disabled = true;
        element('frame', HTMLOutputElement).value = '—';
        element('motion-notes', HTMLParagraphElement).textContent = '';
        this.originals.replaceChildren();
        this.originalsPanel.open = false;
        this.originalsPanel.hidden = true;
        this.status.setAttribute('role', 'status');
    }
    drawReference() {
        const frame = this.referenceFrame;
        const context = this.canvas.getContext('2d');
        if (!frame || !context || this.events.signal.aborted)
            return;
        const bounds = this.canvas.getBoundingClientRect();
        const ratio = window.devicePixelRatio || 1;
        this.canvas.width = Math.round(bounds.width * ratio);
        this.canvas.height = Math.round(bounds.height * ratio);
        context.setTransform(this.canvas.width / sceneWidth, 0, 0, this.canvas.height / sceneHeight, 0, 0);
        context.imageSmoothingEnabled = false;
        drawLandscape(context);
        if (this.referenceImage.complete && this.referenceImage.naturalWidth > 0)
            drawFrame(context, frame, this.referenceImage, '아타호 · 대기 기준', 2, {
                x: sceneWidth * 0.26,
            });
    }
    showSelected() {
        this.clearPreview();
        const creature = definitions.find((item) => item.assetId === this.select.value);
        if (!creature) {
            this.name.textContent = '선택 결과 없음';
            this.summary.textContent = '';
            this.status.textContent = '다른 지도나 등급을 선택해 주세요.';
            this.drawReference();
            return;
        }
        this.name.textContent = `${slotName(creature.id)} · ${creature.name}`;
        this.summary.textContent = `${mapBossMaps.find((map) => map.id === creature.mapId)?.name ?? ''} · ${slotName(creature.id)} · ${plan.creatures.find((item) => item.id === creature.id)?.context ?? ''}`;
        this.canvas.setAttribute('aria-label', `${creature.name}과 아타호 크기 비교`);
        this.motion.setAttribute('aria-label', `${creature.name} 모션`);
        const asset = manifest.assets.find((item) => item.id === creature.assetId);
        if (asset && 'originals' in asset && asset.originals) {
            this.originalsPanel.hidden = false;
            showOriginals(creature.assetId);
        }
        if (!asset || !readyAsset(creature.assetId)) {
            this.status.textContent =
                '기본 5모션 준비 중 · 아타호 대기 기준만 표시합니다. 보스 모션은 아직 재생하지 않습니다.';
            this.drawReference();
            return;
        }
        const animations = asset.animations;
        const maxHeight = Math.max(this.referenceFrame?.height ?? 1, ...Object.values(animations).flatMap((animation) => animation?.frames.map((frame) => frame.height) ?? []));
        const scale = Math.min(3, (sceneHeight * 0.6) / maxHeight);
        this.status.textContent = `${creature.name}의 실제 로컬 모션을 불러오는 중…`;
        try {
            const preview = new ResourcePreview(creature.assetId, scale, {
                reference: { assetId: 'ai/tiger-hero', scale },
            });
            this.preview = preview;
            void preview
                .start()
                .then(() => {
                if (this.preview === preview && !this.events.signal.aborted)
                    this.restart.disabled = false;
            })
                .catch((error) => this.showError(preview, error));
        }
        catch (error) {
            this.showError(null, error);
        }
    }
    showError(preview, error) {
        if (this.preview !== preview || this.events.signal.aborted)
            return;
        this.status.textContent =
            error instanceof Error
                ? error.message
                : '보스 모션을 불러오지 못했습니다.';
        this.status.setAttribute('role', 'alert');
    }
}
new MapBossGallery();
