import manifest from '../../resources/manifest.json' with { type: 'json' };
import { createCategoryNavigation } from './catalog/categories.js';
const navigation = document.getElementById('categories');
const status = document.getElementById('status');
if (!navigation || !status)
    throw new Error('카테고리 선택 영역이 없습니다.');
navigation.replaceChildren(createCategoryNavigation());
status.textContent = `총 ${manifest.assets.length}종 · 카테고리를 선택해 리소스와 출처를 확인하세요.`;
