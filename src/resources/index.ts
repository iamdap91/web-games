import manifest from '../../resources/manifest.json' with { type: 'json' };
import { createCard, createText } from './catalog/resource-card.js';

const categories = [
  { id: 'characters', name: '캐릭터', description: '플레이어 · 몬스터 · 유령' },
  { id: 'backgrounds', name: '배경', description: '공간 · 벽 · 바닥' },
  { id: 'props', name: '소품', description: '문 · 가구 · 조명 · 단서' },
  { id: 'audio', name: '사운드', description: '발소리 · 문소리 · 환경 효과음' },
] as const;

function showCatalog(): void {
  const navigation = document.getElementById('categories');
  const catalog = document.getElementById('catalog');
  const status = document.getElementById('status');
  if (!navigation || !catalog || !status)
    throw new Error('리소스 목록 영역이 없습니다.');
  const sections = document.createDocumentFragment();
  for (const category of categories) {
    const assets = manifest.assets.filter(
      (asset) => asset.category === category.id,
    );
    const link = document.createElement('a');
    link.href = `#${category.id}`;
    link.append(
      createText('strong', `${category.name} ${assets.length}`),
      createText('span', category.description),
    );
    navigation.append(link);
    const section = document.createElement('section');
    section.id = category.id;
    section.append(
      createText('h2', `${category.name} · ${assets.length}`),
      createText('p', category.description),
    );
    const grid = document.createElement('div');
    grid.className = 'resource-grid';
    grid.append(...assets.map(createCard));
    section.append(grid);
    sections.append(section);
  }
  catalog.replaceChildren(sections);
  status.textContent = `총 ${manifest.assets.length}종 · 모든 카드에 출처 표시`;
}

showCatalog();
