import manifest from '../../../resources/manifest.json' with { type: 'json' };
import { createText } from './resource-card.js';
export const categories = [
    { id: 'characters', name: '캐릭터', description: '플레이어 · 몬스터 · 유령' },
    { id: 'backgrounds', name: '배경', description: '공간 · 벽 · 바닥' },
    { id: 'props', name: '소품', description: '문 · 가구 · 조명 · 단서' },
    { id: 'audio', name: '사운드', description: '발소리 · 문소리 · 환경 효과음' },
];
export function createCategoryNavigation(current) {
    const links = document.createDocumentFragment();
    for (const category of categories) {
        const count = manifest.assets.filter((asset) => asset.category === category.id).length;
        const link = document.createElement('a');
        link.href = `/src/resources/${category.id}/`;
        if (category.id === current)
            link.setAttribute('aria-current', 'page');
        link.append(createText('strong', `${category.name} ${count}`), createText('span', category.description));
        links.append(link);
    }
    return links;
}
