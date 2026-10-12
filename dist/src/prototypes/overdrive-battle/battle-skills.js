import { drunkenRules } from './drunken-fist.js';
export const battleSkills = {
    ward: {
        name: '호신부',
        target: 'ally',
        cost: 0,
        damage: 0,
        description: '아군 하나의 이번 적 차례 다음 피격 1회를 절반으로 줄입니다. 방어와 중첩되지 않습니다.',
    },
    tiger: {
        name: '호격권',
        target: 'single',
        cost: 6,
        damage: 46,
        description: '적 하나에게 묵직한 정권을 날립니다.',
    },
    sweep: {
        name: '선풍각',
        target: 'area',
        cost: 8,
        damage: 28,
        radius: 3.2,
        description: '지정한 위치로 이동해 원 안의 모든 적을 휩씁니다.',
    },
    kick: {
        name: '맹호각',
        target: 'single',
        cost: 8,
        damage: 24,
        description: '적 하나를 공격하고 다음 행동을 1회 막습니다.',
    },
    drink: {
        name: '한 잔~',
        target: 'self',
        cost: 0,
        damage: 0,
        description: `기력 +${drunkenRules.energyRecovery}. ${drunkenRules.drinksToActivate}잔을 마시면 다음 ${drunkenRules.duration}턴 동안 취권!`,
    },
    ice: {
        name: '실험 · 얼리기',
        target: 'single',
        cost: 3,
        damage: 0,
        description: '3턴 동안 묶습니다. 일반 공격으로 깨면 주변에 파편 피해를 줍니다.',
    },
    'wind-push': {
        name: '실험 · 밀기',
        target: 'single',
        cost: 3,
        damage: 0,
        description: '적을 밀고 가까운 불씨와 장판을 옮깁니다. 얼음은 유지합니다.',
    },
    'wind-gather': {
        name: '실험 · 모으기',
        target: 'area',
        cost: 3,
        damage: 0,
        radius: 3.2,
        description: '범위의 적과 장판을 지정 중심으로 모으고 불씨를 퍼뜨립니다.',
    },
    ember: {
        name: '실험 · 불씨',
        target: 'single',
        cost: 3,
        damage: 0,
        description: '적에게 3턴 불씨를 남깁니다. 바람으로 주변 적에게 한 번 퍼뜨릴 수 있습니다.',
    },
    'fire-field': {
        name: '실험 · 불장판',
        target: 'area',
        cost: 4,
        damage: 0,
        radius: 1.25,
        description: '바닥에 3턴 장판을 놓습니다. 바람으로 옮기고 한 번 확산합니다.',
    },
};
export const skillOrder = [
    'tiger',
    'sweep',
    'kick',
    'drink',
];
export const elementSkillOrder = [
    'ice',
    'wind-push',
    'wind-gather',
    'ember',
    'fire-field',
];
export function isElementSkill(skill) {
    return elementSkillOrder.some((id) => id === skill);
}
export function areaSkillRadius(skill) {
    const definition = battleSkills[skill];
    return 'radius' in definition ? definition.radius : null;
}
export const drinkMotion = { contactTime: 0.62, duration: 1.25 };
export const sweepRadius = battleSkills.sweep.radius;
/** 표시와 실제 피해 대상이 같은 중심과 범위를 사용한다. */
export function skillTargets(skill, targetId, enemies, areaCenter) {
    const radius = areaSkillRadius(skill);
    if (radius !== null)
        return areaCenter
            ? enemies.filter((enemy) => enemy.health > 0 &&
                Math.hypot(enemy.x - areaCenter.x, enemy.z - areaCenter.z) <=
                    radius)
            : [];
    const target = enemies.find((enemy) => enemy.id === targetId && enemy.health > 0);
    return target ? [target] : [];
}
