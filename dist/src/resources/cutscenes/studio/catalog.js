import { studioSourceDefinitions } from './sources.js';
import manifest from '../../../../resources/manifest.json' with { type: 'json' };
import { resourceUrl } from '../../catalog/resource-url.js';
export const studioGroups = [
    {
        id: 'finished',
        name: '완성 컷씬',
        description: '고른 컷 10개 · 아타호 필살기 3개',
    },
    {
        id: 'techniques',
        name: '기법 견본',
        description: '충격·속도·FX·촬영·편집·합성',
    },
    {
        id: 'expressions',
        name: '표정 연출',
        description: '표정·감정 기호·코믹 반응',
    },
    {
        id: 'poses',
        name: '포즈·연기 비교',
        description: '포즈·표정·재질·장면의 기본/연출 비교',
    },
];
export const studioItems = studioSourceDefinitions.flatMap((definition) => {
    const asset = manifest.proceduralAssets.find((asset) => asset.id === definition.assetId);
    if (!asset)
        throw new Error(`연출실 목록이 없습니다: ${definition.assetId}`);
    const states = definition.single
        ? [{ id: 'full-cutscene', label: asset.name.replace(/^아타호 · /, '') }]
        : asset.states;
    return states.map((state) => {
        const expression = definition.source === 'showcase' &&
            'studioGroup' in state &&
            state.studioGroup === 'expressions';
        return {
            id: `${definition.source}:${state.id}`,
            source: definition.source,
            sampleId: state.id,
            group: expression ? 'expressions' : definition.group,
            title: state.label,
            origin: expression ? '표정 연출' : definition.origin,
            description: asset.notes,
            tags: asset.components,
            recordPath: 'generationRecordPath' in asset &&
                typeof asset.generationRecordPath === 'string'
                ? asset.generationRecordPath
                : 'resources/cutscene-studio.json',
        };
    });
});
export function studioSceneUrl(item) {
    const path = studioSourceDefinitions.find((source) => source.source === item.source).path;
    const url = resourceUrl(path);
    url.searchParams.set('studio', '1');
    url.searchParams.set('embed', '1');
    url.hash = item.sampleId;
    return url;
}
export function findStudioItem(id) {
    return studioItems.find((item) => item.id === id);
}
export function filterStudioItems(group, query) {
    const terms = query
        .toLocaleLowerCase('ko')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    const inGroup = studioItems.filter((item) => item.group === group);
    const matches = (text) => terms.every((term) => text.toLocaleLowerCase('ko').includes(term));
    // 이름에 맞는 견본이 있으면 묶음의 공통 태그가 다른 항목까지 끌고 오지 않게 한다.
    const named = inGroup.filter((item) => matches(`${item.title} ${item.origin}`));
    if (named.length)
        return named;
    return inGroup.filter((item) => matches(`${item.title} ${item.origin} ${item.tags.join(' ')}`));
}
