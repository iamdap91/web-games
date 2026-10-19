import refinement from '../../../../resources/ataho-v2-motion-refinement.json' with { type: 'json' };
import continuity from '../../../../resources/ataho-v2-motion-continuity.json' with { type: 'json' };
import elbowContact from '../../../../resources/ataho-v2-elbow-contact.json' with { type: 'json' };
import kiPoses from '../../../../resources/ataho-v2-ki-pose-generation.json' with { type: 'json' };
import impactAttacks from '../../../../resources/ataho-v2-impact-attacks.json' with { type: 'json' };
import finisherIdentities from '../../../../resources/ataho-v2-finisher-identities.json' with { type: 'json' };
import inazumaKick from '../../../../resources/ataho-v2-inazuma-kick-keyposes-r2.json' with { type: 'json' };
const generatedPath = 'public/assets/maplestory/ataho-v2-combo-generated/20261014/';
export const supplementFrames = {
    [inazumaKick.playback.sourceMotionId]: {
        label: '강화 날아차기 · 공중 장전 A / 대각 신전 B',
        frames: inazumaKick.playback.frames,
    },
    'presentation-galactica-charge-east': {
        label: '팬텀 동쪽 전용 장전',
        frames: finisherIdentities.chargeSource.frames,
    },
    'presentation-aerial-smash-south-east': {
        label: '공중 양손 내려찍기 원본',
        frames: impactAttacks.sources.aerial.frames,
    },
    'presentation-martial-stomp-load-south-east': {
        label: '진각 발 들기 원본',
        frames: impactAttacks.sources.stompLoad.frames,
    },
    'presentation-martial-stomp-impact-south-east': {
        label: '진각 수직 디딤 원본',
        frames: impactAttacks.sources.stompImpact.frames,
    },
    'presentation-ki-beam-poses-south-east': {
        label: '파동포 준비·발사·반동 그림',
        frames: kiPoses.frames,
    },
    'presentation-elbow-keyposes-south-east': {
        label: '팔꿈치 장전·하강 접촉 그림',
        frames: elbowContact.drawings,
    },
    'presentation-motion-connections-south-east': {
        label: '접지·소품 연결 그림',
        frames: continuity.drawings,
    },
    'presentation-cheolsango-keyposes-south-east': {
        label: '어깨 장전·충돌 추가 그림',
        frames: refinement.drawings,
    },
    'generated-dodge-lean': {
        label: '생성 보강 · 뒤젖힘',
        frames: [
            {
                width: 96,
                height: 96,
                pivot: { x: 48, y: 16 },
                localPath: `${generatedPath}dodge-lean-96.png`,
            },
        ],
    },
    'generated-slide-sweep': {
        label: '생성 보강 · 하단 타격',
        frames: [
            {
                width: 96,
                height: 96,
                pivot: { x: 48, y: 16 },
                localPath: `${generatedPath}slide-sweep-96.png`,
            },
        ],
    },
};
export function supplementFrameView(step) {
    if (step.motion === 'presentation-ki-beam-poses-south-east')
        return kiPoses.frames[step.frame];
    if (step.motion === 'presentation-elbow-keyposes-south-east')
        return elbowContact.drawings[step.frame];
    if (step.motion === 'presentation-motion-connections-south-east')
        return continuity.drawings[step.frame];
    return step.motion === 'presentation-cheolsango-keyposes-south-east'
        ? refinement.drawings[step.frame]
        : undefined;
}
export function withSupplement(motion) {
    if (motion.id === 'slide-sweep') {
        return {
            ...motion,
            supplementedReview: '기존 쓸기의 정점과 짧은 유지 구간을 생성 자세 한 장으로 교체해 오른쪽으로 뻗은 다리와 발을 보이게 했다. 얼굴과 도트 질감은 원본과 조금 달라 비교 후보로 둔다. 누운 슬라이딩에서 한 손을 짚는 회전 자세로 넘어가는 연결은 보완할 여지가 있다.',
            supplementedMissingPose: '연출에서 손 짚고 회전하는 그림도 켜면 낮은 연결과 생성 하단 타격을 함께 비교할 수 있다.',
            supplementedSteps: motion.steps.map((step) => step.motion === 'leg-sweep-south-east' && step.frame === 3
                ? {
                    ...step,
                    motion: 'generated-slide-sweep',
                    frame: 0,
                    phase: step.contact ? '하단 타격 · 보강' : '다리 회수 직전',
                }
                : step),
        };
    }
    return motion;
}
export function applySupplement(motion) {
    // 현재 선택한 박자에 그림 교체를 적용해 두 설정이 서로 덮어쓰지 않게 한다.
    const supplemented = withSupplement(motion);
    if (!supplemented.supplementedSteps)
        return motion;
    return {
        ...motion,
        steps: supplemented.supplementedSteps,
        review: supplemented.supplementedReview ?? motion.review,
        missingPose: supplemented.supplementedMissingPose,
    };
}
