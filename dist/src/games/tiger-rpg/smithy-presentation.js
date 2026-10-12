import { equipmentCraftReason, equipmentDefinitions, equipmentIds, equipmentRefineReason, } from './equipment.js';
import { equipmentGradeLabel } from './equipment-presentation.js';
export function smithyItems(work, state) {
    return equipmentIds.filter((id) => work === 'craft' || state.equipment.owned[id] !== undefined);
}
/** 제작 화면은 보유 장비를 강화 작업으로 바꾸지 않는다. 비용 판정은 공통 규칙을 사용한다. */
export function smithyOffer(id, work, state) {
    const grade = state.equipment.owned[id];
    const complete = work === 'craft' ? grade !== undefined : grade === 2;
    const missing = work === 'refine' && grade === undefined;
    const targetGrade = complete || missing ? null : work === 'craft' ? 1 : 2;
    const status = grade === undefined
        ? '미보유'
        : `${equipmentGradeLabel(grade)}${complete ? (work === 'craft' ? ' · 제작 완료' : ' · 강화 완료') : ''}`;
    const reason = complete
        ? null
        : !state.canChange
            ? (state.unavailableReason ?? '마을에서 작업할 수 있어요.')
            : work === 'craft'
                ? equipmentCraftReason(id, state)
                : equipmentRefineReason(id, state);
    return {
        grade,
        targetGrade,
        status,
        cost: targetGrade === null
            ? null
            : equipmentDefinitions[id][work === 'craft' ? 'craftCost' : 'refineCost'],
        reason,
        canExecute: targetGrade !== null && reason === null,
    };
}
