import { studioSourceDefinitions } from './sources.js';
import manifest from '../../../../resources/manifest.json' with { type: 'json' };
import { resourceUrl } from '../../catalog/resource-url.js';
import { resolveCombinationSelection } from '../../effects/anime-selected-cuts/combination-variants.js';
export const studioGroups = [
    {
        id: 'finished',
        name: '완성 컷씬',
        description: '아타호 단독 컷씬 · 호왕일격·암중호격·히사시 펀치',
    },
    {
        id: 'techniques',
        name: '기법 견본',
        description: '충격·속도·FX·촬영·편집의 개별 기법',
    },
    {
        id: 'combinations',
        name: '기법 조합',
        description: '23유형 · 유형 안에서 바리에이션 선택',
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
        const override = definition.source === 'showcase' && 'studioGroup' in state
            ? state.studioGroup
            : undefined;
        const group = override === 'expressions' || override === 'combinations'
            ? override
            : definition.group;
        const techniques = 'techniques' in state && Array.isArray(state.techniques)
            ? state.techniques.filter((name) => typeof name === 'string')
            : [];
        const variantLabels = 'variants' in state && Array.isArray(state.variants)
            ? state.variants.flatMap((variant) => typeof variant === 'object' &&
                variant !== null &&
                'label' in variant &&
                typeof variant.label === 'string'
                ? [variant.label]
                : [])
            : [];
        const variantOrigins = Object.fromEntries('variants' in state && Array.isArray(state.variants)
            ? state.variants.flatMap((variant) => {
                if (typeof variant !== 'object' ||
                    variant === null ||
                    !('value' in variant) ||
                    typeof variant.value !== 'string' ||
                    !('techniques' in variant) ||
                    !Array.isArray(variant.techniques))
                    return [];
                const origin = variant.techniques
                    .filter((value) => typeof value === 'string')
                    .join(' + ');
                return origin ? [[variant.value, origin]] : [];
            })
            : []);
        return {
            id: `${definition.source}:${state.id}`,
            source: definition.source,
            sampleId: state.id,
            group,
            title: state.label,
            origin: group === 'combinations' && techniques.length > 0
                ? techniques.join(' + ')
                : group === 'expressions'
                    ? '표정 연출'
                    : definition.source === 'showcase' && group === 'combinations'
                        ? '합성'
                        : definition.origin,
            description: asset.notes,
            tags: asset.components,
            variantLabels,
            variantOrigins,
            recordPath: 'generationRecordPath' in asset &&
                typeof asset.generationRecordPath === 'string'
                ? asset.generationRecordPath
                : 'resources/cutscene-studio.json',
        };
    });
});
export function studioSceneUrl(item, variant) {
    const path = studioSourceDefinitions.find((source) => source.source === item.source).path;
    const url = resourceUrl(path);
    url.searchParams.set('studio', '1');
    url.searchParams.set('embed', '1');
    if (variant)
        url.searchParams.set('variant', variant);
    url.hash = item.sampleId;
    return url;
}
export function findStudioItem(id) {
    return studioItems.find((item) => item.id === id);
}
export function readStudioSelection(url) {
    const id = url.searchParams.get('item');
    const legacyShockKoma = id === 'showcase:shock-koma-v2';
    const requestedVariant = url.searchParams.get('variant') || undefined;
    const combination = id?.startsWith('selected:')
        ? resolveCombinationSelection(id.slice('selected:'.length), requestedVariant)
        : undefined;
    return {
        item: findStudioItem(legacyShockKoma
            ? 'showcase:shock-koma'
            : combination
                ? `selected:${combination.id}`
                : id),
        variant: legacyShockKoma
            ? 'embers'
            : combination
                ? combination.variant
                : requestedVariant,
    };
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
    const named = inGroup.filter((item) => matches(`${item.title} ${item.origin} ${item.variantLabels.join(' ')} ${Object.values(item.variantOrigins).join(' ')}`));
    if (named.length)
        return named;
    return inGroup.filter((item) => matches(`${item.title} ${item.origin} ${item.tags.join(' ')}`));
}
