import { drunkenRules } from './drunken-fist.js';
export const battleSkills = {
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
};
export const skillOrder = [
    'tiger',
    'sweep',
    'kick',
    'drink',
];
export const drinkMotion = { contactTime: 0.62, duration: 1.25 };
export const sweepRadius = 3.2;
/** 표시와 실제 피해 대상이 같은 중심과 범위를 사용한다. */
export function skillTargets(skill, targetId, enemies, areaCenter) {
    if (skill === 'sweep')
        return areaCenter
            ? enemies.filter((enemy) => enemy.health > 0 &&
                Math.hypot(enemy.x - areaCenter.x, enemy.z - areaCenter.z) <=
                    sweepRadius)
            : [];
    const target = enemies.find((enemy) => enemy.id === targetId && enemy.health > 0);
    return target ? [target] : [];
}
