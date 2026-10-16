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
const shoulderKeyposes = {
    id: 'cheolsango-shoulder-keyposes',
    label: '어깨 장전·충돌 그림',
    summary: '몸통을 모으는 장전·어깨를 싣는 연결·충돌의 새 세 자세를 비교합니다.',
    kind: 'pose',
    replacements: [0, 1, 2, 3].map((frame) => ({
        motion: 'cheolsango-short',
        frame,
        replacement: {
            motion: 'presentation-cheolsango-keyposes-south-east',
            frame: frame === 0 ? 0 : frame === 3 ? 2 : 1,
            anchor: 'feet',
        },
    })),
};
export function withPoseEffects(motion) {
    const effects = ['rush', 'quick-jab', 'double-jab'].includes(motion.id)
        ? [jabSmear]
        : motion.id === 'flying-kick'
            ? [takeoffExtension, landingCompression]
            : motion.id === 'cheolsango'
                ? [shoulderKeyposes]
                : motion.id === 'slide-sweep'
                    ? [
                        connectionDrawing('slide-pivot-drawing', '손 짚고 회전하는 그림', '미끄러진 뒤 한 손으로 바닥을 받치며 골반을 돌리는 연결 자세를 표시합니다.', [{ motion: 'running-slide-south-east', frame: 4, drawing: 0 }]),
                    ]
                    : motion.id === 'backflip-reentry'
                        ? [
                            connectionDrawing('backflip-landing-drawing', '회전 뒤 착지 그림', '뒤공중회피에서 두 발을 낮게 딛는 자세로 연결합니다.', [{ motion: jumpMotion, frame: 7, drawing: 1 }]),
                        ]
                        : motion.id === 'drink-guard'
                            ? [
                                connectionDrawing('drink-prop-handling-drawing', '물체 꺼내기·거두기 그림', '마실 물체를 허리에서 꺼내고 허리로 거두는 두 연결 자세를 표시합니다.', [
                                    { motion: 'drinking-south-east', frame: 0, drawing: 2 },
                                    { motion: 'drinking-south-east', frame: 5, drawing: 3 },
                                ]),
                            ]
                            : [];
    const elbowEffects = motion.steps.some((step) => step.motion === 'ataho-firewood-elbow-chop-south-east-south-east')
        ? [elbowKeyposes]
        : [];
    if (!effects.length && !elbowEffects.length)
        return motion;
    return {
        ...motion,
        effects: [...(motion.effects ?? []), ...effects, ...elbowEffects],
    };
}
const elbowKeyposes = {
    id: 'elbow-down-keyposes',
    label: '팔꿈치 장전·하강 그림',
    summary: '접힌 팔을 모으는 장전과 아래쪽 팔꿈치 접촉 자세 두 장을 비교합니다.',
    kind: 'pose',
    replacements: [2, 3, 4, 5].map((frame) => ({
        motion: 'ataho-firewood-elbow-chop-south-east-south-east',
        frame,
        ...(frame >= 4 ? { contact: { height: 22, reach: 23 } } : {}),
        replacement: {
            motion: 'presentation-elbow-keyposes-south-east',
            frame: frame < 4 ? 0 : 1,
            anchor: 'feet',
        },
    })),
};
/** 공격 조합에서는 선택 설정과 관계없이 승인된 장전·하강 그림을 사용한다. */
export function withRequiredElbowDrawing(step) {
    const drawing = elbowKeyposes.replacements.find((item) => item.motion === step.motion && item.frame === step.frame);
    if (!drawing)
        return step;
    return {
        ...step,
        ...drawing.replacement,
        contact: step.contact && drawing.contact
            ? { ...step.contact, ...drawing.contact }
            : step.contact,
    };
}
function connectionDrawing(id, label, summary, sources) {
    return {
        id,
        label,
        summary,
        kind: 'pose',
        replacements: sources.map((source) => ({
            motion: source.motion,
            frame: source.frame,
            replacement: {
                motion: 'presentation-motion-connections-south-east',
                frame: source.drawing,
                anchor: 'feet',
            },
        })),
    };
}
