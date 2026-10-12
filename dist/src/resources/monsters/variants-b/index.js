import { resourceUrl } from '../../catalog/resource-url.js';
import manifest from '../../../../resources/manifest.json' with { type: 'json' };
import generation from '../../../../resources/monsters-b-generation.json' with { type: 'json' };
import { startPreview } from '../../preview/preview.js';
import { showOriginals } from '../../preview/originals.js';
const themeLabels = {
    ridge: '산등성이',
    ruins: '유적',
    snow: '설원',
};
const roleLabels = {
    charger: '돌진형',
    ranged: '원거리형',
    support: '지원형',
    armored: '갑주형',
    rusher: '속공형',
    striker: '타격형',
};
function element(id, type) {
    const found = document.getElementById(id);
    if (!(found instanceof type))
        throw new Error(`화면 요소가 없습니다: ${id}`);
    return found;
}
class MonsterPreviewPage {
    events = new AbortController();
    select = element('monster', HTMLSelectElement);
    start() {
        this.showOriginalGallery();
        const available = generation.monsters.filter((monster) => manifest.assets.some((asset) => asset.id === monster.assetId));
        const first = available[0];
        if (!first) {
            element('status', HTMLParagraphElement).textContent =
                '다섯 모션을 완성한 몬스터부터 재생할 수 있어요.';
            return;
        }
        const requested = new URL(location.href).searchParams.get('monster');
        const chosen = available.find((monster) => monster.id === requested) ?? first;
        this.select.replaceChildren(...available.map((monster) => new Option(monster.name, monster.id)));
        this.select.value = chosen.id;
        this.select.disabled = false;
        element('monster-info', HTMLParagraphElement).textContent =
            `${themeLabels[chosen.theme] ?? chosen.theme} · ${roleLabels[chosen.role] ?? chosen.role}`;
        const { signal } = this.events;
        this.select.addEventListener('change', this.changeMonster, { signal });
        window.addEventListener('pagehide', this.handlePageHide, { signal });
        startPreview(chosen.assetId, 4);
        showOriginals(chosen.assetId);
    }
    showOriginalGallery() {
        const gallery = element('original-gallery', HTMLDivElement);
        for (const monster of generation.monsters) {
            const original = monster.selectedOriginal;
            if (!original)
                continue;
            const figure = document.createElement('figure');
            const image = new Image();
            image.src = resourceUrl(original.localPath).href;
            image.alt = `${monster.name} 고정 원본`;
            image.loading = 'lazy';
            const caption = document.createElement('figcaption');
            caption.textContent = monster.name;
            figure.append(image, caption);
            gallery.append(figure);
        }
    }
    changeMonster = () => {
        // 페이지 전환으로 기존 미리보기의 이미지·입력·재생 루프를 함께 정리한다.
        const url = new URL(location.href);
        url.searchParams.set('monster', this.select.value);
        location.assign(url);
    };
    handlePageHide = (event) => {
        if (!event.persisted)
            this.events.abort();
    };
}
try {
    new MonsterPreviewPage().start();
}
catch (error) {
    element('status', HTMLParagraphElement).textContent =
        error instanceof Error ? error.message : '미리보기를 준비하지 못했습니다.';
}
