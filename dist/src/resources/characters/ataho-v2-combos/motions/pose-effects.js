const jabMotion = 'ataho-one-two-punch-south-east-south-east';
const jumpMotion = 'jumping-1-south-east';
const jabSmear = {
    id: 'jab-smear-drawing',
    label: '잽 팔 스미어 그림',
    summary: '잽이 뻗는 한 자세를 새로 그린 연결된 팔 스미어로 바꿉니다.',
    kind: 'pose',
    replacements: [
        {
            motion: jabMotion,
            frame: 1,
            replacement: {
                motion: 'presentation-jab-smear-south-east',
                frame: 2,
                // 생성 캔버스의 좌우 여백과 몸의 2px 이동을 기준점에 반영한다.
                anchor: { x: 64, y: 79 },
            },
        },
    ],
};
const takeoffExtension = {
    id: 'takeoff-extension-drawing',
    label: '도약 폄 그림',
    summary: '도약 순간을 다리와 몸통을 펴는 새 자세로 바꾸고 얼굴 크기는 유지합니다.',
    kind: 'pose',
    replacements: [
        {
            motion: jumpMotion,
            frame: 3,
            replacement: {
                motion: 'presentation-anatomical-jump-south-east',
                frame: 2,
                anchor: 'feet',
            },
        },
    ],
};
const landingCompression = {
    id: 'landing-compression-drawing',
    label: '착지 눌림 그림',
    summary: '두 발을 딛은 뒤 무릎과 골반이 더 접히는 새 압축 자세로 바꿉니다.',
    kind: 'pose',
    replacements: [
        {
            motion: jumpMotion,
            frame: 7,
            replacement: {
                motion: 'presentation-landing-drawing-south-east',
                frame: 0,
                anchor: 'feet',
            },
        },
    ],
};
export function withPoseEffects(motion) {
    const effects = ['rush', 'quick-jab', 'double-jab'].includes(motion.id)
        ? [jabSmear]
        : motion.id === 'flying-kick'
            ? [takeoffExtension, landingCompression]
            : [];
    if (!effects.length)
        return motion;
    return { ...motion, effects: [...(motion.effects ?? []), ...effects] };
}
