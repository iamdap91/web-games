import { drawCameraMovement } from './camera-movement.js';
import { drawCameraOptics } from './camera-optics.js';
import { height, width, } from './types.js';
export const cameraSamples = [
    {
        id: 'camera-transmitted-light',
        name: '투과광',
        category: 'camera',
        previewMs: 1840,
        description: '어퍼컷 접촉에 가는 밝은 핵과 두 겹의 확산을 즉시 드러내고 짧게 가라앉힙니다.',
        distinction: '그림 내부의 빛 처리이며 공간을 가로지르는 입사광과 다릅니다.',
    },
    {
        id: 'camera-para',
        name: '파라',
        category: 'camera',
        previewMs: 2100,
        description: '짙은 보라 그림자와 금빛 반사광을 화면 양쪽에 대비시킵니다.',
        distinction: '색 시트의 합성이며 인물·배경을 움직이거나 흐리지 않습니다.',
    },
    {
        id: 'camera-wavy-glass',
        name: '파도 유리',
        category: 'camera',
        previewMs: 2000,
        description: '서로 다른 두 물결로 윤곽을 크게 굴절시키고 화면 가장자리까지 같은 장면을 채웁니다.',
        distinction: '윤곽 자체의 굴절을 재해석하며 초점 블러와 구별합니다.',
    },
    {
        id: 'camera-diffusion',
        name: '디퓨전',
        category: 'camera',
        previewMs: 2100,
        description: '달과 밝은 면에서 빛을 넓게 퍼뜨리고 어두운 윤곽과 얼굴은 선명하게 남깁니다.',
        distinction: '원본의 선을 남기는 확산 합성입니다. 장면 자체를 흐리는 블러와 다릅니다.',
    },
    {
        id: 'camera-blur',
        name: '블러',
        category: 'camera',
        previewMs: 1800,
        beats: [
            { timeMs: 1620, label: '접근 노출 증가' },
            { timeMs: 1800, label: '방사형 노출 정점' },
            { timeMs: 1980, label: '선명한 회수' },
        ],
        description: '접근 때 타점 중심의 방사형 노출을 모으고 접촉 뒤180ms 안에 걷어 회수를 선명하게 보여줍니다.',
        distinction: '방향 없는 초점 흐림 대신 한 축을 향한 노출을 누적하는 방사형 블러입니다. 초점 넘기기의 디포커스와 다릅니다.',
    },
    {
        id: 'camera-lens-flare',
        name: '렌즈 플레어·고스트',
        category: 'camera',
        previewMs: 1850,
        description: '같은 접촉광에서 화면 반대편까지 이어지는 긴 렌즈 축에 크기가 다른 고스트를 드러냅니다.',
        distinction: '화면의 렌즈 축에 붙는 빛상이며 실제 공간에 존재하는 입자가 아닙니다.',
    },
    {
        id: 'camera-anamorphic',
        name: '아나모픽 플레어',
        category: 'camera',
        previewMs: 1850,
        description: '접촉광에서 화면을 가로지르는 가는 빛띠가 뻗고 양끝으로 서서히 사라집니다.',
        distinction: '원형 고스트보다 가로 방향의 광학적 번짐을 강조합니다.',
    },
    {
        id: 'camera-cross-light',
        name: '십자광',
        category: 'camera',
        previewMs: 1830,
        description: '접촉에 네 방향의 뾰족한 광선을 즉시 드러내고260ms 안에 줄입니다.',
        distinction: '국소 광점의 강조이며 화면 전체 수평 플레어나 반복 명멸이 아닙니다.',
    },
    {
        id: 'camera-screen-shake',
        name: '화면 흔들림',
        category: 'camera',
        previewMs: 1840,
        description: '한 번의 접촉에 짧고 큰 위치 진동을 주고 롤은 작게 남겨560ms 안에 감쇠합니다.',
        distinction: '충격 사건에 붙는 감쇠 진동이며 지속적인 손떨림과 다릅니다.',
    },
    {
        id: 'camera-contact-multi',
        name: '밀착 멀티',
        category: 'camera',
        previewMs: 2600,
        description: '앞 나무가 화면을 크게 가로지르는 동안 전투·지면과 먼 산은 점점 느리게 이송합니다.',
        distinction: '평면 셀의 크기는 고정합니다. z 투영으로 크기까지 변하는 멀티플레인과 구별합니다.',
    },
    {
        id: 'camera-flicker',
        name: '플리커',
        category: 'camera',
        previewMs: 2120,
        description: '같은 장면의 금빛·푸른 노출을400ms씩 유지한 뒤 끊어 교대합니다.',
        distinction: '한 번의 섬광과 다릅니다. 움직임 줄이기에서는 명멸 없이 일정한 노출로 바꿉니다.',
    },
    {
        id: 'camera-rack-focus',
        name: '초점 넘기기',
        category: 'camera',
        previewMs: 2500,
        description: '접촉 전에는 아타호만 선명하게 두고 접촉 뒤 곰왕으로 초점을 빠르게 넘겨 유지합니다.',
        beats: [
            { timeMs: 1500, label: '아타호 선명' },
            { timeMs: 2150, label: '초점 이동' },
            { timeMs: 2550, label: '곰왕 선명' },
        ],
        distinction: '같은 전투의 구도와 원본 동작을 공유하고 두 배우 레이어의 선명도만 교대합니다.',
    },
    {
        id: 'camera-follow-pan',
        name: '따라가는 PAN',
        category: 'camera',
        previewMs: 2200,
        description: '기존 어퍼컷 접근 중의 실제 아타호 위치를 따라 배경과 전장을 이송합니다.',
        distinction: '애니메이션 그림의 2D 수평 이송입니다. 3D 카메라의 제자리 회전은 아닙니다.',
    },
    {
        id: 'camera-slow-quick-pan',
        name: '지와 PAN·퀵 PAN',
        category: 'camera',
        previewMs: 2100,
        description: '공격자 쪽을 천천히 훑은 뒤 곰왕을 향해140ms 동안 수평 전환하고 접촉에 구도를 정착시킵니다.',
        beats: [
            { timeMs: 950, label: '느린 PAN' },
            { timeMs: 1730, label: '퀵 PAN' },
            { timeMs: 1900, label: '접촉 구도 정착' },
        ],
        distinction: '배율을 고정한 수평 이송의 속도 대비이며 급확대가 아닙니다.',
    },
    {
        id: 'camera-track-up-back',
        name: 'T.U·T.B',
        category: 'camera',
        previewMs: 2100,
        description: '같은 타점을 중심으로 접촉 시각에 두 배 넘게 접근해 유지하고 곧 넓은 구도로 물러납니다.',
        beats: [
            { timeMs: 1800, label: 'T.U 접촉에 도착' },
            { timeMs: 2100, label: '근접 구도 유지' },
            { timeMs: 2600, label: 'T.B 후퇴 중' },
            { timeMs: 3100, label: '와이드 복귀' },
        ],
        distinction: '2D 그림을 확대·축소하는 촬영 표현입니다. 원근이 변하는 3D 돌리와 구별합니다.',
    },
    {
        id: 'camera-handheld',
        name: '손떨림',
        category: 'camera',
        previewMs: 2100,
        description: '위치와 작은 롤이 끊임없이 조금씩 흔들립니다.',
        distinction: '특정 충격에 반응하거나 감쇠하지 않는 지속적인 촬영 흔들림입니다.',
    },
    {
        id: 'camera-multi-bokeh',
        name: '멀티 보케',
        category: 'camera',
        previewMs: 2100,
        description: '전경 나무는 크게 흐리고 배경 점광원은 넓은 빛망울로 퍼뜨리며 전투 배우만 선명하게 둡니다.',
        distinction: '전경·전투·배경을 세 깊이 판으로 나눈 고정 초점입니다. 연속 깊이·렌즈 조리개 시뮬레이션은 아닙니다.',
    },
    {
        id: 'camera-foggy',
        name: '포기',
        category: 'camera',
        previewMs: 2100,
        description: '젖빛 막으로 어두운 부분을 들어 올리고 달과 접촉광 주변에는 넓은 확산을 더합니다.',
        distinction: '포그 필터의 재해석입니다. 접촉광의 확산은 같은 광원의 점멸과 함께 생기고 사라집니다.',
    },
    {
        id: 'camera-double-shadow',
        name: '이중노출 그림자',
        category: 'camera',
        previewMs: 2100,
        description: '두 배우의 발아래 넓은 반투명 그림자를 따로 합성하고 그 안으로 눈밭 무늬가 비치게 합니다.',
        distinction: '몸의 잔상이 아닌 그림자 영역의 반노출입니다. 같은 배우의 동작을 유지하며 정밀한 광원 투영은 생략합니다.',
    },
    {
        id: 'camera-glow',
        name: '글로우',
        category: 'camera',
        previewMs: 1850,
        description: '비교 양쪽의 선명한 접촉광은 같게 두고 효과 쪽에서만 핵 주변으로 큰 원형 빛을 퍼뜨립니다.',
        distinction: '장면 전체의 대비를 바꾸는 디퓨전·포기와 달리 한 광원의 주변만 처리합니다.',
    },
    {
        id: 'camera-incident-light',
        name: '입사광 — 사선 광주·틴들 해석',
        category: 'camera',
        previewMs: 2100,
        description: '수관 밖에서 들어오는 사선 광주를 강조하고 그 빛 안을 지나는 먼지만 밝게 드러냅니다.',
        distinction: '入射光의 렌즈 플레어 용법과 구분한 해석입니다. 화면 렌즈의 고스트와 달리 공간 안에 빛줄기가 있습니다.',
    },
    {
        id: 'camera-multiplane',
        name: '멀티플레인 카메라',
        category: 'camera',
        previewMs: 2350,
        description: '아타호와 곰왕 원본을 수직 판에 두고 앞 나무와 먼 산을 z 깊이에 따라 원근 투영합니다.',
        distinction: '앞 나무는 거의 두 배로 커지며 바깥으로 지나가고 먼 산은 조금만 변합니다. 고정 크기 셀 이송이나 전체 줌과 다릅니다.',
    },
];
/** 프레임 시각만으로 계산해 역탐색에서도 같은 화면을 만든다. */
export function drawCamera(ctx, id, frame) {
    ctx.save();
    try {
        ctx.filter = 'none';
        ctx.fillStyle = '#18202e';
        ctx.fillRect(0, 0, width, height);
        if (!drawCameraOptics(ctx, id, frame))
            drawCameraMovement(ctx, id, frame);
    }
    finally {
        ctx.restore();
    }
}
