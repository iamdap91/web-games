import manifest from '../../../resources/manifest.json' with { type: 'json' };
import { createCard, createText } from '../catalog/resource-card.js';
const groups = [
    { name: '공간', anchor: 'space', description: '복도의 바탕과 경계' },
    { name: '소품', anchor: 'props', description: '익숙한 물건이 달라지는 순간' },
    {
        name: '조명·단서',
        anchor: 'clues',
        description: '시선을 이끌고 탐색을 만드는 것',
    },
    { name: '위협', anchor: 'threat', description: '복도 끝에 나타날 존재' },
    {
        name: '효과음',
        anchor: 'audio',
        description: '화면 밖에서 들려오는 인기척 · 눌러서 들어보기',
    },
];
function showCollection() {
    const container = document.getElementById('collection');
    const status = document.getElementById('status');
    if (!container || !status)
        throw new Error('리소스 목록 영역이 없습니다.');
    const sections = document.createDocumentFragment();
    let count = 0;
    for (const group of groups) {
        const section = document.createElement('section');
        section.id = group.anchor;
        section.append(createText('h2', group.name), createText('p', group.description));
        const grid = document.createElement('div');
        grid.className = 'resource-grid';
        for (const asset of manifest.assets) {
            if (!('collection' in asset) ||
                asset.collection !== 'haunted-house' ||
                asset.group !== group.name)
                continue;
            grid.append(createCard(asset));
            count += 1;
        }
        section.append(grid);
        sections.append(section);
    }
    container.replaceChildren(sections);
    status.textContent = `${count}종의 리소스 · 이미지·상태 비교와 효과음 미리듣기`;
}
showCollection();
