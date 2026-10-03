import { showCategory } from '../catalog/category-page.js';

showCategory('characters');

const adventurerSection = document.getElementById('adventurer');
const adventurerCard = document.getElementById(
  'resource-avatar/adventurer-toben',
);
if (!adventurerSection || !adventurerCard)
  throw new Error('모험가 리소스 영역이 없습니다.');
adventurerSection.append(adventurerCard);
