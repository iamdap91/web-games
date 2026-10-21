/** 유형 ID와 재생 컷 ID의 관계를 원본 화면·연출실의 주소 복원에 함께 사용한다. */
export const combinationVariantGroups = [
    {
        id: 'background-run',
        variantIds: ['background-run', 'synergy-explosive-rush'],
    },
    {
        id: 'already-cut',
        variantIds: ['already-cut', 'synergy-delayed-pierce'],
    },
    {
        id: 'bullet-counter',
        variantIds: ['bullet-counter', 'synergy-reversal-counter'],
    },
    {
        id: 'comic-panels',
        variantIds: ['comic-panels', 'synergy-final-blow'],
    },
    {
        id: 'rhythm-rush',
        variantIds: ['rhythm-rush', 'synergy-accelerating-flurry'],
    },
    {
        id: 'short-power',
        variantIds: ['short-power', 'synergy-heavy-strike'],
    },
];
export function resolveCombinationSelection(id, variant) {
    const group = combinationVariantGroups.find((entry) => entry.variantIds.includes(id));
    if (!group)
        return { id, variant: undefined };
    // 과거 독립 항목 주소는 그때 보던 변형판을 우선해 보존한다.
    return {
        id: group.id,
        variant: id !== group.id
            ? id
            : (group.variantIds.find((value) => value === variant) ?? group.id),
    };
}
