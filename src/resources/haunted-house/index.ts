import manifest from '../../../resources/manifest.json' with { type: 'json' };
import type { Animation } from '../preview/animation-player.js';

type CollectionAsset = {
  readonly name: string;
  readonly notes: string;
  readonly sourceUrl: string;
  readonly animations: Readonly<Record<string, Animation | undefined>>;
};

const groups = [
  { name: '공간', anchor: 'space', description: '복도의 바탕과 경계' },
  { name: '소품', anchor: 'props', description: '익숙한 물건이 달라지는 순간' },
  {
    name: '조명·단서',
    anchor: 'clues',
    description: '시선을 이끌고 탐색을 만드는 것',
  },
  { name: '위협', anchor: 'threat', description: '복도 끝에 나타날 존재' },
] as const;

const motionNames: Readonly<Record<string, string>> = {
  stand: '기본·대기',
  move: '이동',
  chase: '추격',
};

function createText<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.textContent = text;
  return element;
}

function createImage(
  path: string,
  name: string,
  width: number,
): HTMLImageElement {
  const image = document.createElement('img');
  image.src = new URL(`../../../${path}`, document.baseURI).href;
  image.alt = name;
  image.loading = 'lazy';
  image.style.width = `${width * 2}px`;
  return image;
}

function createFrames(asset: CollectionAsset): HTMLDetailsElement {
  const details = document.createElement('details');
  details.append(createText('summary', '파일·프레임 정보 펼치기'));
  for (const [motion, animation] of Object.entries(asset.animations)) {
    if (!animation) continue;
    details.append(
      createText(
        'h4',
        `${motionNames[motion] ?? motion} · ${animation.frames.length}프레임`,
      ),
    );
    const strip = document.createElement('div');
    strip.className = 'frames';
    for (const [index, frame] of animation.frames.entries()) {
      const figure = document.createElement('figure');
      const link = document.createElement('a');
      link.href = new URL(`../../../${frame.localPath}`, document.baseURI).href;
      link.append(
        createImage(
          frame.localPath,
          `${asset.name} ${motion} ${index}`,
          frame.width,
        ),
      );
      figure.append(
        link,
        createText(
          'figcaption',
          `#${index} · ${frame.width} × ${frame.height} · 기준점 (${frame.pivot.x}, ${frame.pivot.y})`,
        ),
      );
      strip.append(figure);
    }
    details.append(strip);
    const first = animation.frames[0];
    if (first) details.append(createText('code', first.localPath));
  }
  return details;
}

function createCard(asset: CollectionAsset): HTMLElement {
  const frame = asset.animations.stand?.frames[0];
  if (!frame) throw new Error(`기본 프레임이 없습니다: ${asset.name}`);
  const card = document.createElement('article');
  card.className = 'resource-card';
  const stage = document.createElement('div');
  stage.className = 'resource-image';
  stage.append(createImage(frame.localPath, asset.name, frame.width));
  const frameCount = Object.values(asset.animations).reduce(
    (sum, animation) => sum + (animation?.frames.length ?? 0),
    0,
  );
  const metadata = createText(
    'p',
    `${frame.width} × ${frame.height}px · 총 ${frameCount}프레임`,
  );
  metadata.className = 'metadata';
  const source = document.createElement('a');
  source.href = asset.sourceUrl;
  source.target = '_blank';
  source.rel = 'noopener noreferrer';
  source.textContent = '공식 출처 보기 ↗';
  card.append(
    stage,
    createText('h3', asset.name),
    metadata,
    createText('p', asset.notes),
    source,
    createFrames(asset),
  );
  return card;
}

function showCollection(): void {
  const container = document.getElementById('collection');
  const status = document.getElementById('status');
  if (!container || !status) throw new Error('리소스 목록 영역이 없습니다.');
  const sections = document.createDocumentFragment();
  let count = 0;
  for (const group of groups) {
    const section = document.createElement('section');
    section.id = group.anchor;
    section.append(
      createText('h2', group.name),
      createText('p', group.description),
    );
    const grid = document.createElement('div');
    grid.className = 'resource-grid';
    for (const asset of manifest.assets) {
      if (
        !('collection' in asset) ||
        asset.collection !== 'haunted-house' ||
        asset.group !== group.name
      )
        continue;
      grid.append(createCard(asset));
      count += 1;
    }
    section.append(grid);
    sections.append(section);
  }
  container.replaceChildren(sections);
  status.textContent = `${count}종의 리소스 · 정적 원본 미리보기`;
}

showCollection();
