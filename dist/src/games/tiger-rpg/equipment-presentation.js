import { equipmentName, } from './equipment.js';
import { equipmentIconSources } from './equipment-icons.js';
export function equipmentIconUrl(id) {
    return equipmentIconSources[id];
}
export function equipmentGradeLabel(grade) {
    return grade === 2 ? '정제 ★★' : '일반 ★';
}
export function equipmentSlotLabel(slot) {
    return slot === 'charm' ? '부적' : '아대';
}
export function equipmentItemLabel(item) {
    return equipmentName(item);
}
export function equipmentModeLabel() {
    return '적용: 전투';
}
