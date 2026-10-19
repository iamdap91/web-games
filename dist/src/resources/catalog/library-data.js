import { resourceUrl } from './resource-url.js';
import manifest from '../../../resources/manifest.json' with { type: 'json' };
import { representativeFrame } from './asset-frame.js';
export const libraryCategories = [
    {
        id: 'characters',
        name: '캐릭터',
        description: '주인공 · 동료 · NPC · 외형 비교',
    },
    {
        id: 'cutscenes',
        name: '컷씬',
        description: '필살기 시네마틱 · 장면 전환 · 전용 연출',
    },
    { id: 'monsters', name: '몬스터', description: '일반 · 중간보스 · 보스' },
    { id: 'maps', name: '맵·마을', description: '원정 지도 · 지역 마을 · 배경' },
    {
        id: 'facilities',
        name: '시설',
        description: '회관 · 도장 · 식사터 · 대장간',
    },
    { id: 'environment', name: '자연물', description: '나무 · 바위 · 숲 경관' },
    {
        id: 'props',
        name: '소품·장비',
        description: '생활 소품 · 지역 소품 · 장비',
    },
    {
        id: 'effects',
        name: '효과',
        description: '부적 · 호신부 · 연출 · 애니메이션 실험',
    },
    { id: 'materials', name: '재질', description: '질감 · 외곽선 비교' },
    { id: 'audio', name: '사운드', description: '전투 · 행동 · 환경음' },
    {
        id: 'archive',
        name: 'archive',
        description: '이전 이동맵 · 지역 마을 시안',
    },
];
const existingMonsters = new Set([
    'ai/slime',
    'ai/yeti',
    'ai/forest-wolf',
    'ai/armored-boar',
    'ai/mushroom-spirit',
]);
function assetCategory(asset) {
    if (asset.category === 'audio' || asset.category === 'effects')
        return asset.category;
    if (asset.category === 'monsters' ||
        asset.id.startsWith('ai/monster-') ||
        asset.id.startsWith('mob/') ||
        existingMonsters.has(asset.id))
        return 'monsters';
    if (asset.collection?.includes('scenery'))
        return 'environment';
    if (asset.collection?.includes('details'))
        return 'props';
    if (asset.category === 'backgrounds')
        return 'maps';
    if (asset.category === 'props')
        return 'props';
    return 'characters';
}
function assetGroup(asset, category) {
    if (asset.id.startsWith('ai/herbalist-camp-'))
        return 'PixelLab 맵 실험';
    if (category === 'characters') {
        if (asset.id.includes('ataho') || asset.id.includes('tiger-hero'))
            return '아타호';
        if (asset.id.includes('yeonmuk') || asset.id.includes('fox-talismanist'))
            return '연묵';
        if (asset.id.includes('biwol'))
            return '비월';
        return 'NPC·기타 캐릭터';
    }
    if (category === 'monsters')
        return asset.tier === 'boss'
            ? '보스'
            : asset.tier === 'miniboss'
                ? '중간보스'
                : '일반 몬스터';
    if (category === 'props' && asset.collection === 'equipment')
        return '장비';
    if (asset.collection === 'village-resource-pack')
        return '마을 생활 묶음';
    if (category === 'props')
        return '생활·지역 소품';
    if (category === 'maps')
        return '배경';
    if (category === 'environment')
        return '숲 경관';
    return libraryCategories.find((item) => item.id === category).name;
}
function fileEntry(asset) {
    const category = assetCategory(asset);
    const group = assetGroup(asset, category);
    const previewPath = category === 'monsters' &&
        (asset.id.startsWith('ai/monster-') || existingMonsters.has(asset.id))
        ? `src/resources/monsters/${asset.tier ? 'bosses' : 'gallery'}/?asset=${encodeURIComponent(asset.id)}`
        : asset.previewPath;
    return {
        id: asset.id,
        name: asset.name,
        category,
        group,
        project: asset.collection === 'haunted-house' ||
            asset.id.startsWith('map/') ||
            asset.id.startsWith('avatar/')
            ? 'other'
            : 'tiger-rpg',
        notes: asset.notes,
        sourceName: asset.sourceName,
        sourceUrl: asset.sourceUrl,
        thumbnailPath: asset.audio
            ? undefined
            : representativeFrame(asset)?.localPath,
        previewPath,
        comparisonPath: asset.id === 'ai/young-ataho'
            ? 'src/resources/characters/young-ataho/concept.html'
            : asset.previewPath !== previewPath
                ? asset.previewPath
                : undefined,
        asset,
        states: [],
        kind: 'files',
        keywords: [
            asset.id,
            asset.name,
            group,
            group === '비월' ? '토끼 닌자 rabbit ninja' : undefined,
            asset.sourceName,
            asset.collection,
            asset.theme,
            asset.mapName,
            ...Object.keys(asset.animations),
        ]
            .filter(Boolean)
            .join(' '),
    };
}
const animationLabs = new Set([
    'local/procedural-creature-lab',
    'local/sprite-stacking-lab',
    'local/prerendered-model-lab',
]);
const archivedMapIds = new Set([
    ...['boar', 'bear', 'armadillo', 'mantis'].flatMap((region) => [
        `local/regional-trail-${region}`,
        `local/regional-trail-${region}-alternate`,
    ]),
    'local/village-harbor',
    'local/village-onsen',
]);
function proceduralCategory(id) {
    if (archivedMapIds.has(id))
        return 'archive';
    if (id === 'local/biwol-basic-attack' || id === 'local/yeonmuk-basic-attack')
        return 'characters';
    if (id === 'local/ataho-shadow-cutscene' ||
        id === 'local/ataho-tiger-awakening-cutscene' ||
        id === 'local/ataho-hisashi-punch-cutscene' ||
        id === 'local/anime-signatures' ||
        id === 'local/anime-showcase')
        return 'cutscenes';
    if (id === 'local/herbalist-camp')
        return 'maps';
    if (id.startsWith('local/regional-trail-'))
        return 'maps';
    if (id === 'local/village-hybrid-references')
        return 'materials';
    if (animationLabs.has(id))
        return 'effects';
    if (id === 'local/2-5d-expression-lab')
        return 'effects';
    if (id.includes('ataho'))
        return 'characters';
    if (id.includes('town-life'))
        return 'props';
    if (id.includes('atlas') || id.includes('village'))
        return 'maps';
    if (id.includes('environment'))
        return 'environment';
    if (id.includes('material'))
        return 'materials';
    return 'facilities';
}
function proceduralGroup(id, category) {
    if (category === 'archive')
        return id.startsWith('local/regional-trail-')
            ? '이전 이동맵 A/B'
            : '이전 지역 마을';
    if (id === 'local/biwol-basic-attack')
        return '비월';
    if (id === 'local/yeonmuk-basic-attack')
        return '연묵';
    if (id === 'local/2-5d-expression-lab' ||
        id === 'local/anime-signatures' ||
        id === 'local/anime-showcase')
        return '표현 비교';
    if (category === 'cutscenes')
        return '아타호';
    if (id === 'local/herbalist-camp')
        return 'PixelLab 맵 실험';
    if (id.startsWith('local/regional-trail-'))
        return '지역 이동맵';
    if (id.startsWith('local/village-style-'))
        return '마을 스타일 실험';
    if (id === 'local/village-hybrid-references')
        return '혼합 표현 연구';
    if (animationLabs.has(id))
        return '애니메이션 실험';
    if (category === 'characters')
        return '아타호';
    if (category === 'maps')
        return id.includes('atlas') ? '원정 지도' : '지역 마을';
    const facilities = {
        'local/mountain-town-hall': '회관',
        'local/mountain-smithy': '대장간',
        'local/outdoor-kitchen': '식사터',
        'local/mountain-dojo': '도장',
    };
    return (facilities[id] ??
        libraryCategories.find((item) => item.id === category).name);
}
const entries = [
    ...manifest.assets.map(fileEntry),
    ...manifest.proceduralAssets.map((asset) => {
        const category = proceduralCategory(asset.id);
        const group = proceduralGroup(asset.id, category);
        const states = asset.states.map((state) => state.label);
        return {
            id: asset.id,
            name: asset.name,
            category,
            group,
            project: 'tiger-rpg',
            notes: asset.notes,
            sourceName: asset.sourceName,
            sourcePath: asset.sourcePath,
            previewPath: asset.previewPath,
            thumbnailPath: 'imagePath' in asset ? asset.imagePath : undefined,
            states,
            kind: 'procedural',
            keywords: [
                asset.id,
                asset.name,
                group,
                ...states,
                ...asset.components,
            ].join(' '),
        };
    }),
];
const categoryOrder = new Map(libraryCategories.map((category, index) => [category.id, index]));
const characterOrder = {
    아타호: 0,
    연묵: 1,
    비월: 2,
    'NPC·기타 캐릭터': 3,
};
const atahoMembers = entries.filter((entry) => entry.previewPath?.startsWith('src/resources/characters/ataho-hybrid/index.html'));
const atahoComparison = {
    id: 'local/ataho-comparison',
    name: '아타호 비교',
    category: 'characters',
    group: '아타호',
    project: 'tiger-rpg',
    notes: '비도트 원화·방향·대기·걷기·공격과 기존 하이브리드를 한 작업실에서 비교합니다.',
    sourceName: 'Codex ImageGen · PixelLab · Three.js 합성',
    sourcePath: 'src/resources/characters/ataho-hybrid/lab-tabs.ts',
    thumbnailPath: atahoMembers.find((entry) => entry.id === 'local/ataho-nonpixel-front-draft')?.thumbnailPath,
    previewPath: 'src/resources/characters/ataho-hybrid/index.html?motion=shoulder-v2#attacks',
    states: [
        'ImageGen 정권 연결',
        '공격',
        '걷기',
        '좌우 기준 그림',
        '정면 대기',
        '승인 원화',
        '기존 하이브리드',
    ],
    kind: 'procedural',
    keywords: [
        '아타호 비교',
        ...atahoMembers.map((entry) => entry.keywords),
    ].join(' '),
    members: atahoMembers,
};
export const libraryEntries = [
    atahoComparison,
    ...entries.filter((entry) => !atahoMembers.includes(entry)),
].sort((a, b) => categoryOrder.get(a.category) - categoryOrder.get(b.category) ||
    (a.category === 'characters'
        ? (characterOrder[a.group] ?? 3) - (characterOrder[b.group] ?? 3)
        : 0));
const atahoNavigation = [
    ['v2 동작', 'local/ataho-v2-combos', '동작 조합실'],
    ['v2 동작', 'ai/ataho-v2', 'v2 원본 모션'],
    ['기존 캐릭터', 'ai/tiger-hero', '기본 아타호'],
    ['기존 캐릭터', 'ai/young-ataho', '젊은 아타호'],
    ['외형·동작 연구', 'local/ataho-comparison', '비도트·하이브리드 비교'],
    [
        '외형·동작 연구',
        'local/ataho-skeleton-walk-comparison',
        'Skeleton 걷기 비교',
    ],
    [
        '외형·동작 연구',
        'local/ataho-skeleton-reference-front',
        'Skeleton 기준 원화',
    ],
    ['외형·동작 연구', 'local/ataho-pixel-three-tests', '세 가지 도트 실험'],
    ['외형·동작 연구', 'ai/tiger-hero-side-volume', '측면 보정'],
    ['외형·동작 연구', 'ai/tiger-hero-candidates', '연령별 외형'],
];
/** 사이드바의 아타호 자료만 용도별로 정리하고 상세 이름은 유지한다. */
export function atahoNavigationEntries(entries) {
    const remaining = new Map(entries.map((entry) => [entry.id, entry]));
    const navigation = [];
    for (const [section, id, label] of atahoNavigation) {
        const entry = remaining.get(id);
        if (!entry)
            continue;
        navigation.push({ section, label, entry });
        remaining.delete(id);
    }
    // 새 연구 자료도 이름을 등록하기 전부터 목록에서 찾을 수 있게 한다.
    for (const entry of remaining.values())
        navigation.push({ section: '외형·동작 연구', label: entry.name, entry });
    return navigation;
}
/** 목록에서는 묶되 기존 개별 리소스 주소와 제작 기록 연결은 유지한다. */
export function findLibraryEntry(id) {
    return (libraryEntries.find((entry) => entry.id === id) ??
        entries.find((entry) => entry.id === id));
}
export function libraryListEntry(entry) {
    return libraryEntries.find((item) => item.members?.includes(entry)) ?? entry;
}
export function filterLibrary(filter) {
    const words = filter.query?.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean) ?? [];
    return libraryEntries.filter((entry) => (filter.project === 'all' || entry.project === filter.project) &&
        (!filter.category || entry.category === filter.category) &&
        (!filter.group || entry.group === filter.group) &&
        words.every((word) => entry.keywords.toLocaleLowerCase().includes(word)));
}
/** 목록과 상세의 선택 상태를 같은 라이브러리 주소에 보존한다. */
export function libraryLocation(filter, assetId) {
    const params = new URLSearchParams();
    if (filter.project !== 'tiger-rpg')
        params.set('project', filter.project);
    if (filter.category)
        params.set('category', filter.category);
    if (filter.group)
        params.set('group', filter.group);
    if (filter.query)
        params.set('q', filter.query);
    if (assetId)
        params.set('asset', assetId);
    const search = params.toString();
    return `${resourceUrl('src/resources/').pathname}${search ? `?${search}` : ''}`;
}
export function readLibraryFilter(url) {
    const requested = url.searchParams.get('category');
    const category = libraryCategories.find((item) => item.id === requested)?.id;
    const project = url.searchParams.get('project');
    return {
        project: project === 'all' || project === 'other' ? project : 'tiger-rpg',
        category,
        group: category ? (url.searchParams.get('group') ?? undefined) : undefined,
        query: url.searchParams.get('q') ?? '',
    };
}
