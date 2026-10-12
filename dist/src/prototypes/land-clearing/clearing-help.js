import { eAttackHoldTime } from './e-attack-input.js';
import { energyRules } from './harvest-energy.js';
import { rushRules } from './harvest-rush.js';
export const clearingControlHelp = [
    '방향키로 이동합니다.',
    '바람숲 입구의 단단한 균열바위는 약점 강타로만 부술 수 있습니다.',
    'Space를 길게 누르면 연속 공격, E를 짧게 눌렀다 떼면 한 번 공격합니다.',
    '바위 밀기·덩굴 걷기·고목 조사는 Space를 새로 누르거나 안내를 탭합니다.',
    '바람숲의 바위는 접근 방향으로 두 경로 중 하나를 골라 밀 수 있습니다. 이번 방문에는 한 번 밀고 다음 방문에 다시 선택합니다.',
    '덩굴은 Space 세 번으로 걷어냅니다. Q는 자원만 정리하고 W는 덩굴·굴리는 바위·고목에 피해 없이 튕깁니다.',
    '일반 공격으로 채집물을 정리하면 기세가 차며, 기술은 같은 기세를 나눠 씁니다.',
    'Esc로 일시정지 메뉴를 엽니다.',
];
export const clearingSkillHelp = {
    slam: {
        key: 'Q',
        name: '지면 강타',
        cost: energyRules.costs.slam,
        effect: '바닥을 내리찍어 주변 채집물을 한 번에 정리합니다. 균열바위에는 피해를 주지 않습니다.',
    },
    weakStrike: {
        key: 'E 길게',
        name: '약점 강타',
        cost: energyRules.costs.weakStrike,
        effect: `도장 Lv.2에서 해금합니다. E를 ${eAttackHoldTime}초 이상 눌렀다 떼거나 약점 강타 버튼을 클릭·탭하면 큰 대상 하나를 강타합니다. 놓는 순간 금빛 약점을 향하고 기세가 있어야 합니다. 메뉴·창 이탈은 충전을 취소합니다.`,
    },
    rush: {
        key: 'W',
        name: '돌진',
        cost: energyRules.costs.rush,
        effect: `${rushRules.duration}초 동안 방향키로 방향을 바꾸며 돌진합니다. 단단한 일반 대상에 부딪히면 튕긴 뒤 다시 타격합니다. 균열바위와 거목에는 피해 없이 튕깁니다.`,
    },
};
