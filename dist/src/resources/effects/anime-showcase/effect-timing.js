/** 공통 대기·접근만 먼저 줄이고 각 효과의 발생 이후는 따로 보호한다. */
const impactPreparation = [
    { endMs: 900, rate: 3 },
    { endMs: 1680, rate: 2 },
];
/** 렌더러의 원본4.2초 시계는 유지하고 기본1x에서 핵심 구간을 보존한다. */
export const effectTimingProfiles = {
    // 기존 내부1.35배로 짧은 핵·주방향 광을 보호하고, 잔광 뒤 회수만 압축한다.
    'fx-kanada-light': [
        ...impactPreparation,
        { endMs: 2100, rate: 1 },
        { endMs: 2200, rate: 1.25 },
        { endMs: 2800, rate: 1.65 },
        { endMs: 4200, rate: 3 },
    ],
    // 최초 두 굽힘과 선단은 보존하고, S축 전진과 손에서 이탈하는 후단은 서로 다른 비율로 압축한다.
    'fx-kanada-beam': [
        ...impactPreparation,
        { endMs: 1960, rate: 1 },
        { endMs: 2400, rate: 1.5 },
        { endMs: 3220, rate: 1.65 },
        { endMs: 3880, rate: 1.35 },
        { endMs: 4200, rate: 4 },
    ],
    // 이미28~68ms인 핵·창·방사·갈고리·세 갈래의 원화 노출은 더 줄이지 않는다.
    'fx-kanada-explosion': [
        ...impactPreparation,
        { endMs: 2040, rate: 1 },
        { endMs: 2480, rate: 1.45 },
        { endMs: 2900, rate: 1.65 },
        { endMs: 4200, rate: 3 },
    ],
    // 용의 발생과 머리 실루엣은 보존하고, 머리가 지난 화염 경로와 끝의 잔여를 압축한다.
    'fx-kanada-dragon': [
        ...impactPreparation,
        { endMs: 2000, rate: 1 },
        { endMs: 3700, rate: 1.65 },
        { endMs: 4200, rate: 1.5 },
    ],
    // 380ms부터 발사·회피하므로 앞900ms도 대기로 취급하지 않고 두 회피와 깊이 교차를 보호한다.
    'fx-itano': [
        { endMs: 350, rate: 3 },
        { endMs: 1770, rate: 1.2 },
        { endMs: 2400, rate: 1.4 },
        { endMs: 3660, rate: 1.65 },
        { endMs: 4200, rate: 4 },
    ],
    // 선행탄과 후속탄의 정체·재추진은 보호하고 각 탄의 퇴장 이후 여백만 빨리 걷는다.
    'fx-muraki': [
        { endMs: 380, rate: 3 },
        { endMs: 1770, rate: 1.2 },
        { endMs: 2420, rate: 1.35 },
        { endMs: 3700, rate: 1.65 },
        { endMs: 4200, rate: 4 },
    ],
    // 좁은 점묘 기둥의 빠른 압출은 보존하고, 뒤늦은 머리와 분진의 퇴장을 나눠 압축한다.
    'fx-anno': [
        ...impactPreparation,
        { endMs: 2120, rate: 1 },
        { endMs: 3000, rate: 1.35 },
        { endMs: 4120, rate: 1.65 },
        { endMs: 4200, rate: 4 },
    ],
    // 외곽이 밀려 나온 뒤 내부 암부가 말리는 차이를 남기고, 마지막 긴 연기 수명만 더 압축한다.
    'fx-iso-explosion': [
        ...impactPreparation,
        { endMs: 2250, rate: 1 },
        { endMs: 3000, rate: 1.25 },
        { endMs: 4120, rate: 1.65 },
        { endMs: 4200, rate: 4 },
    ],
    // 붙어 있던 네 실루엣이 벌어지는 시작을 보존하고, 이후 공통 탄도와 소멸만 압축한다.
    'fx-iso-debris': [
        ...impactPreparation,
        { endMs: 2140, rate: 1 },
        { endMs: 2760, rate: 1.25 },
        { endMs: 3450, rate: 1.5 },
        { endMs: 3900, rate: 1.65 },
        { endMs: 4200, rate: 4 },
    ],
    // 접촉 전 석재 판부터 큰 큐브·작은 잔편의 시차까지 보존해 재질의 연결을 잃지 않는다.
    'fx-nakamura': [
        { endMs: 900, rate: 3 },
        { endMs: 1630, rate: 2 },
        { endMs: 2140, rate: 1 },
        { endMs: 3040, rate: 1.45 },
        { endMs: 4150, rate: 1.65 },
        { endMs: 4200, rate: 4 },
    ],
    // 눌린 김이 위층으로 솟는 시작은 보존하고, 말리며 머무는 긴 구간을 압축한다.
    'fx-hashimoto': [
        ...impactPreparation,
        { endMs: 2180, rate: 1 },
        { endMs: 2900, rate: 1.3 },
        { endMs: 3960, rate: 1.6 },
        { endMs: 4200, rate: 4 },
    ],
    // 단색 덩어리의 결합·외곽 말림·분리가 순서대로 읽히게 하고, 죽은 여백만 크게 압축한다.
    'fx-norio': [
        ...impactPreparation,
        { endMs: 2100, rate: 1 },
        { endMs: 2760, rate: 1.3 },
        { endMs: 3868, rate: 1.55 },
        { endMs: 4200, rate: 4 },
    ],
    // 거친 긴 파편의 첫 네 번 이상 형상 교체를 남기고, 길게 떠 있는 잔여를 압축한다.
    'fx-mori': [
        ...impactPreparation,
        { endMs: 2140, rate: 1 },
        { endMs: 2840, rate: 1.5 },
        { endMs: 3600, rate: 1.65 },
        { endMs: 4200, rate: 4 },
    ],
    // 순간 교차광의 시작은 그대로 두고, 늦게 남는 거품과 끝의 여백을 따로 줄인다.
    'fx-araki': [
        ...impactPreparation,
        { endMs: 1960, rate: 1 },
        { endMs: 2230, rate: 1.25 },
        { endMs: 3060, rate: 1.65 },
        { endMs: 4200, rate: 4 },
    ],
    // 큰 불덩이와 각 갈고리 터치의 출현은 보존하고, 식은 작은 터치의 긴 수명만 압축한다.
    'fx-yoshinari': [
        ...impactPreparation,
        { endMs: 2160, rate: 1 },
        { endMs: 2820, rate: 1.3 },
        { endMs: 3680, rate: 1.6 },
        { endMs: 4200, rate: 4 },
    ],
    // 큰 거품과 작은 거품의 연속 발생은 보존하고, 각자 식고 수축한 뒤의 여백을 줄인다.
    'fx-oki': [
        ...impactPreparation,
        { endMs: 2240, rate: 1 },
        { endMs: 2840, rate: 1.35 },
        { endMs: 3400, rate: 1.6 },
        { endMs: 4200, rate: 4 },
    ],
    // 붙어 버티는 목과 끊기는 순간은 덜 압축하고, 끊긴 뒤 급출발과 잔여의 수명을 줄인다.
    'fx-kozuma': [
        ...impactPreparation,
        { endMs: 2020, rate: 1 },
        { endMs: 2560, rate: 1.6 },
        { endMs: 3000, rate: 1.2 },
        { endMs: 3120, rate: 1 },
        { endMs: 3600, rate: 1.45 },
        { endMs: 4200, rate: 1.65 },
    ],
    // 검정 구체의 합체·목 가늘어짐·분리·재결합은 폭발처럼 짧게 생략하지 않는다.
    'fx-tatsuzo': [
        ...impactPreparation,
        { endMs: 2200, rate: 1.2 },
        { endMs: 3200, rate: 1.25 },
        { endMs: 3590, rate: 1.2 },
        { endMs: 4000, rate: 1.65 },
        { endMs: 4200, rate: 4 },
    ],
    // 짧은 가지 파열과 첫 발광 조각은 보호하고, 분리 뒤 냉각·퇴장은 압축한다.
    'fx-shigeta': [
        ...impactPreparation,
        { endMs: 2050, rate: 1 },
        { endMs: 2500, rate: 1.35 },
        { endMs: 2900, rate: 1.65 },
        { endMs: 4200, rate: 4 },
    ],
    // 부모 파편이 자식과 잔편으로 이어지는 두 번의 분리 단계를 남긴다.
    'fx-anime-r': [
        ...impactPreparation,
        { endMs: 2140, rate: 1 },
        { endMs: 2760, rate: 1.25 },
        { endMs: 3440, rate: 1.45 },
        { endMs: 4200, rate: 4 },
    ],
    // 충전은 반복 윤곽을 읽을 만큼 남기고,160ms 신전·80ms 접촉·명중 전류4셀은 모두1x로 보호한다.
    'fx-kutsuna': [
        { endMs: 650, rate: 3 },
        { endMs: 1100, rate: 1.5 },
        { endMs: 2080, rate: 1.65 },
        { endMs: 2240, rate: 1.2 },
        { endMs: 2825, rate: 1 },
        { endMs: 3500, rate: 1.65 },
        { endMs: 4200, rate: 4 },
    ],
};
