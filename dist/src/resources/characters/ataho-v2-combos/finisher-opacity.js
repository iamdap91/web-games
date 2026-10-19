export const finisherOpacityDefaults = {
    attackTrail: 0.15,
    movementTrail: 0.15,
    kiTrail: 0.15,
    legacySweep: 0.15,
    inkImpact: 0.15,
    backdrop: 0.15,
    paths: 0.15,
    hitTraces: 0.24,
    release: 0.24,
};
export const finisherOpacityRange = { min: 0, max: 100, step: 1 };
export const finisherOpacityControls = [
    {
        key: 'attackTrail',
        label: '공격 수묵 궤적',
        description: '손발·팔꿈치·어깨의 공격 경로를 따라 남는 먹선.',
    },
    {
        key: 'movementTrail',
        label: '발밑 수묵 꼬리',
        description: '빠르게 이동할 때 발밑에 남는 검은 먹꼬리.',
    },
    {
        key: 'kiTrail',
        label: '기공탄 수묵 꼬리',
        description: '날아가는 기공탄 뒤에 붙는 먹꼬리. 기공탄 본체의 진하기는 그대로입니다.',
    },
    {
        key: 'legacySweep',
        label: '이전 방식 먹획',
        description: '공격 방향에 맞춰 붙이는 기존 붓질 그림. 추적 수묵 궤적과 바꿔 씁니다.',
    },
    {
        key: 'inkImpact',
        label: '명중 먹튀김',
        description: '공격이 닿는 위치에 터지는 먹튀김.',
    },
    {
        key: 'backdrop',
        label: '공간 장식',
        description: '몸 뒤의 힘 모으는 고리, 표적 주변 곡선, 순간이동 지점 파편. 배경 암전은 별도입니다.',
    },
    {
        key: 'paths',
        label: '몸통 이동선',
        description: '몸·공격 분신이 지나온 길을 몸통 높이에서 잇는 색선.',
    },
    {
        key: 'hitTraces',
        label: '명중 선무늬',
        description: '중간 명중에 잠깐 보이는 X자 선. 무신패참은 납작한 타원입니다.',
    },
    {
        key: 'release',
        label: '끝타 퍼짐선',
        description: '마지막 명중 뒤 퍼지는 방사선·상승선과 중심의 작은 고리.',
    },
];
/** 100%는 원본 효과에 컨셉의 고정 감쇠를 추가하지 않는다는 뜻이다. */
export function finisherOpacityValue(options, key) {
    const value = options.finisherOpacity?.[key] ?? finisherOpacityDefaults[key];
    return Number.isFinite(value)
        ? Math.max(0, Math.min(1, value))
        : finisherOpacityDefaults[key];
}
export function isFinisherOpacityKey(value) {
    return finisherOpacityControls.some((control) => control.key === value);
}
/** 현재 제작된 기술 전체의 지원 범위이며, 재생 프레임마다 항목을 숨기지 않는다. */
export function supportsFinisherOpacity(motion, key) {
    const theme = motion.finisher?.theme;
    if (!theme)
        return false;
    switch (key) {
        case 'attackTrail':
            return !motion.ki;
        case 'movementTrail':
            return theme !== 'omnislash' && theme !== 'meteor';
        case 'kiTrail':
            return !!motion.ki;
        case 'legacySweep':
        case 'inkImpact':
            return true;
        case 'backdrop':
            return theme !== 'drunken-tiger' && theme !== 'phoenix';
        case 'paths':
            return theme === 'demon' || theme === 'dragon';
        case 'hitTraces':
        case 'release':
            return (theme !== 'phoenix' &&
                theme !== 'galactica' &&
                theme !== 'drunken-tiger');
    }
}
