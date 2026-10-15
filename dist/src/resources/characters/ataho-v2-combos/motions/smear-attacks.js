function groundedSteps(source, poses) {
    return poses.map((pose) => ({
        ...pose,
        motion: source,
        x: 0,
        y: 0,
        anchor: 'feet',
    }));
}
export const smearAttacks = [
    {
        id: 'new-smear-hook-south-east',
        title: '크게 감아치는 훅 · 남동쪽',
        summary: '가로로 이어지는 짧은 팔 궤적 뒤 주먹을 멈추고 가드로 거둔다.',
        priority: 'review',
        review: '남동쪽 두 번째 생성 원본의 0→2→3→4→6→7→8번을 사용한다. 첫 가로 변형인 1번은 빼고 3번 띠를 40ms만 재생해 하나의 공격으로 잇는다. 4번의 분명한 주먹을 접촉 후보로 100ms 유지하고 발·높이는 고정한다. 얼굴은 오른쪽을 향하지만 준비 중 몸통이 크게 돌아가고, 띠가 몸 앞을 감싸는 형체와 끝 자세의 짧은 팔 뻗음은 남는다. 효과 없는 GIF로 동작과 회수를 검토하는 시안이다.',
        steps: groundedSteps('smear-hook-stable-south-east', [
            { frame: 0, durationMs: 120, phase: '가드 준비' },
            { frame: 2, durationMs: 100, phase: '몸통을 모아 훅 준비' },
            { frame: 3, durationMs: 40, phase: '가로 팔 궤적 · 짧은 변형' },
            {
                frame: 4,
                durationMs: 100,
                phase: '1타 · 훅 끝 주먹 접촉 후보',
                // 104×96 원본의 주먹 끝 (83, 44), pivot x52, feetY 79.
                contact: { kind: 'punch', reach: 31, height: 35 },
            },
            { frame: 6, durationMs: 50, phase: '타격 여운' },
            { frame: 7, durationMs: 70, phase: '팔 회수' },
            { frame: 8, durationMs: 160, phase: '가드 복귀' },
        ]),
    },
    {
        id: 'new-smear-hammerfist-south-east',
        title: '대각 망치주먹 · 남동쪽',
        summary: '올린 주먹을 대각 띠로 내려친 뒤 낮은 타격 자세에서 거둔다.',
        priority: 'review',
        review: '남동쪽 두 번째 생성 원본의 0→1→3→4→5→6→7→8번을 사용한다. 4번 대각 띠는 40ms, 5번 낮은 주먹은 접촉 후보로 100ms 유지한다. 첫 생성의 분리된 선과 흰 섬광은 사용하지 않으며 원본 픽셀 수정 없이 발·높이를 고정한다. 준비 주먹이 머리 위로 충분히 올라가지 않고 띠의 가느다란 시작점이 팔과 분리돼 보일 수 있다. 하향 망치주먹을 남동쪽 화면의 대각 연출로 비교하는 시안이다.',
        steps: groundedSteps('smear-hammerfist-clean-south-east', [
            { frame: 0, durationMs: 90, phase: '가드 준비' },
            { frame: 1, durationMs: 50, phase: '주먹 들어 준비' },
            { frame: 3, durationMs: 100, phase: '내려치기 직전' },
            { frame: 4, durationMs: 40, phase: '대각 팔 궤적 · 짧은 변형' },
            {
                frame: 5,
                durationMs: 100,
                phase: '1타 · 낮은 망치주먹 접촉 후보',
                // 96×96 원본의 주먹 끝 (73, 58), pivot x48, feetY 79.
                contact: { kind: 'punch', reach: 25, height: 21 },
            },
            { frame: 6, durationMs: 50, phase: '내려친 팔 거두기' },
            { frame: 7, durationMs: 70, phase: '가드로 팔 올리기' },
            { frame: 8, durationMs: 150, phase: '가드 복귀' },
        ]),
    },
];
