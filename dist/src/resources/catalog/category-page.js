import manifest from '../../../resources/manifest.json' with { type: 'json' };
import { categories, createCategoryNavigation, } from './categories.js';
import { createCard } from './resource-card.js';
export function showCategory(id) {
    const category = categories.find((entry) => entry.id === id);
    const navigation = document.getElementById('categories');
    const catalog = document.getElementById('catalog');
    const status = document.getElementById('status');
    if (!category || !navigation || !catalog || !status)
        throw new Error('카테고리 목록 영역이 없습니다.');
    const assets = manifest.assets.filter((asset) => asset.category === id);
    navigation.replaceChildren(createCategoryNavigation(id));
    catalog.replaceChildren(...assets.map(createCard));
    status.textContent = `${category.name} ${assets.length}종 · 모든 카드에 출처 표시`;
}
