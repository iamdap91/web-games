const volleyBody = [
    [0, 0],
    [0.28, 6 / 12],
    [0.52, 8 / 12],
    [1.05, 1],
];
const eruptionBody = [
    [0, 0],
    [0.45, 3 / 8],
    [0.68, 3 / 8],
    [1.02, 1],
];
const inkBody = [
    [0, 0],
    [0.24, 3 / 12],
    [0.44, 7 / 12],
    [1.08, 1],
];
const lungeTravel = {
    begin: 0.18,
    arrive: 0.4,
    returnStart: 0.78,
    returnEnd: 1.04,
    jumpHeight: 0,
};
const spinTravel = {
    begin: 0.18,
    arrive: 0.36,
    returnStart: 1.05,
    returnEnd: 1.35,
    jumpHeight: 0,
};
const plungeTravel = {
    begin: 0.18,
    arrive: 0.64,
    returnStart: 0.82,
    returnEnd: 1.15,
    jumpHeight: 58,
};
const additions = {
    lunge: {
        label: '질풍 찌르기',
        description: '상체를 낮춤 → 짧게 돌진 → 단검 찌르기 → 뒷걸음 회수',
        travel: lungeTravel,
        duration: 1.7,
        bodyDuration: 1.02,
        contacts: [0.5],
        phases: [
            [0.2, '낮게 준비'],
            [0.4, '파고들기'],
            [0.57, '단검 찌르기'],
            [0.78, '회수'],
            [lungeTravel.returnEnd, '뒷걸음 복귀'],
        ],
    },
    spin: {
        label: '월륜 베기',
        description: '접근 → 회전하며 단검 베기 → 자세 회복',
        travel: spinTravel,
        duration: 1.85,
        bodyDuration: 1.14,
        bodyStart: 0.26,
        bodyKeyframes: {
            'south-east': [
                [0, 0],
                [0.26, 0],
                [0.55, 1 / 12],
                [0.7, 4 / 12],
                [1.14, 1],
            ],
            'north-west': [
                [0, 0],
                [0.26, 0],
                [0.55, 4 / 12],
                [1.14, 1],
            ],
        },
        contacts: [0.55],
        phases: [
            [0.2, '회전 준비'],
            [0.36, '접근'],
            [1.05, '회전 베기'],
            [1.14, '회전 마무리'],
            [spinTravel.returnEnd, '복귀'],
        ],
    },
    plunge: {
        label: '낙영 베기',
        description: '도약 준비 → 뛰어오름 → 단검 내려베기 → 착지 → 복귀',
        travel: plungeTravel,
        duration: 1.95,
        bodyDuration: 1.12,
        bodyKeyframes: {
            'north-west': [
                [0, 0],
                [0.64, 7 / 12],
                [1.12, 1],
            ],
        },
        contacts: [0.64],
        phases: [
            [0.18, '도약 준비'],
            [0.4, '뛰어오름'],
            [0.64, '공중 내려베기'],
            [0.8, '착지'],
            [plungeTravel.returnEnd, '복귀'],
        ],
    },
    volley: {
        label: '삼연부',
        description: '부적 세 장 펼치기 → 쓸어 보내기 → 세 번의 부착·발동 → 회수',
        duration: 1.9,
        bodyDuration: 1.05,
        bodyKeyframes: { 'south-east': volleyBody, 'north-west': volleyBody },
        contacts: [0.55, 0.67, 0.79],
        phases: [
            [0.22, '부적 펼치기'],
            [0.38, '쓸어 보내기'],
            [0.55, '세 갈래 비행'],
            [0.83, '부적 연속 발동'],
            [1.08, '손을 거둠'],
        ],
    },
    eruption: {
        label: '폭진부',
        description: '부적을 모음 → 낮게 손바닥으로 누름 → 지면 부적 발동 → 회수',
        duration: 1.8,
        bodyDuration: 1.02,
        bodyKeyframes: { 'south-east': eruptionBody, 'north-west': eruptionBody },
        contacts: [0.64],
        phases: [
            [0.24, '부적 모으기'],
            [0.45, '지면에 부적 전개'],
            [0.64, '손바닥으로 누르기'],
            [0.9, '지면 술식 타격'],
            [1.05, '자세 회복'],
        ],
    },
    ink: {
        label: '묵선부',
        description: '부적을 당김 → 몸을 틀어 가로 한 획 → 먹획 사출 → 회수',
        duration: 1.85,
        bodyDuration: 1.08,
        bodyKeyframes: { 'south-east': inkBody, 'north-west': inkBody },
        contacts: [0.66],
        phases: [
            [0.24, '부적을 당김'],
            [0.44, '가로 한 획'],
            [0.66, '먹획 비행'],
            [0.88, '먹획 적중'],
            [1.1, '손을 거둠'],
        ],
    },
};
export function attackDefinition(actor, move) {
    if (move !== 'basic')
        return additions[move];
    return actor === 'biwol'
        ? {
            label: '뒤잡기 가로베기',
            description: '준비 → 흩어짐 → 적 뒤에서 재등장 → 가로베기 → 복귀',
            duration: 1.45,
            bodyDuration: 0.83,
            contacts: [0.48],
            phases: [
                [0.13, '단검 준비'],
                [0.27, '형체가 흩어짐'],
                [0.34, '뒤로 이동'],
                [0.42, '뒤에서 재등장'],
                [0.51, '가로베기'],
                [0.67, '마무리 자세'],
                [0.83, '원위치로 복귀'],
            ],
        }
        : {
            label: '부적 부착·발동',
            description: '부적을 당김 → 사출 → 비행 → 부착 → 문양 발동 → 회수',
            duration: 1.45,
            bodyDuration: 0.84,
            contacts: [0.48],
            phases: [
                [0.18, '부적을 당김'],
                [0.29, '손목으로 사출'],
                [0.43, '부적 비행'],
                [0.48, '부적 부착'],
                [0.65, '문양 발동'],
                [0.84, '손을 거둠'],
            ],
        };
}
