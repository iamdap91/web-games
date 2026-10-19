import { drawCameraMovement } from './camera-movement.js';
import { drawCameraOptics } from './camera-optics.js';
import { height, width, } from './types.js';
export const cameraSamples = [
    {
        id: 'camera-transmitted-light',
        name: '투과광',
        category: 'camera',
        previewMs: 2100,
        description: '문양 안의 선택한 선을 밝은 핵과 좁은 번짐으로 발광시킵니다.',
        distinction: '그림 내부의 빛 처리이며 공간을 가로지르는 입사광과 다릅니다.',
    },
    {
        id: 'camera-para',
        name: '파라',
        category: 'camera',
        previewMs: 2100,
        description: '화면 양쪽에 농도가 다른 보라·금빛 색 시트를 겹칩니다.',
        distinction: '색 시트의 합성이며 인물·배경을 움직이거나 흐리지 않습니다.',
    },
    {
        id: 'camera-wavy-glass',
        name: '파도 유리',
        category: 'camera',
        previewMs: 2000,
        description: '같은 장면의 수평 띠들을 파형에 따라 좌우로 어긋나게 합니다.',
        distinction: '윤곽 자체의 굴절을 재해석하며 초점 블러와 구별합니다.',
    },
    {
        id: 'camera-diffusion',
        name: '디퓨전',
        category: 'camera',
        previewMs: 2100,
        description: '선명한 장면 위에 흐리고 밝은 노출을 낮은 농도로 겹칩니다.',
        distinction: '원본의 선을 남기는 확산 합성입니다. 장면 자체를 흐리는 블러와 다릅니다.',
    },
    {
        id: 'camera-blur',
        name: '블러',
        category: 'camera',
        previewMs: 2100,
        description: '배경·인물·대비 무늬의 윤곽을 함께 흐립니다.',
        distinction: '선명한 원본을 중첩하지 않는 초점 흐림이며 화면 안내는 선명합니다.',
    },
    {
        id: 'camera-lens-flare',
        name: '렌즈 플레어·고스트',
        category: 'camera',
        previewMs: 2100,
        description: '광원과 화면 중심의 반대편을 잇는 축에 원형 고스트를 배치합니다.',
        distinction: '화면의 렌즈 축에 붙는 빛상이며 실제 공간에 존재하는 입자가 아닙니다.',
    },
    {
        id: 'camera-anamorphic',
        name: '아나모픽 플레어',
        category: 'camera',
        previewMs: 2100,
        description: '강한 광점에서 수평으로 긴 가는 빛띠가 뻗습니다.',
        distinction: '원형 고스트보다 가로 방향의 광학적 번짐을 강조합니다.',
    },
    {
        id: 'camera-cross-light',
        name: '십자광',
        category: 'camera',
        previewMs: 1850,
        description: '한 광점에 짧게 네 방향의 뾰족한 광선을 드러냅니다.',
        distinction: '국소 광점의 강조이며 화면 전체 수평 플레어나 반복 명멸이 아닙니다.',
    },
    {
        id: 'camera-screen-shake',
        name: '화면 흔들림',
        category: 'camera',
        previewMs: 1840,
        description: '한 번의 접촉 뒤 화면이 크게 흔들렸다가 750ms 안에 감쇠합니다.',
        distinction: '충격 사건에 붙는 감쇠 진동이며 지속적인 손떨림과 다릅니다.',
    },
    {
        id: 'camera-contact-multi',
        name: '밀착 멀티',
        category: 'camera',
        previewMs: 3000,
        description: '가까운 나무·인물·산 셀을 다른 속도로 수평 이송합니다.',
        distinction: '평면 셀의 크기는 고정합니다. z 투영으로 크기까지 변하는 멀티플레인과 구별합니다.',
    },
    {
        id: 'camera-flicker',
        name: '플리커',
        category: 'camera',
        previewMs: 2120,
        description: '같은 장면의 밝은 노출 농도를 천천히 주기적으로 변화시킵니다.',
        distinction: '한 번의 섬광과 다릅니다. 움직임 줄이기에서는 명멸 없이 일정한 노출로 바꿉니다.',
    },
    {
        id: 'camera-rack-focus',
        name: '초점 넘기기',
        category: 'camera',
        previewMs: 2900,
        description: '전경 부적에서 뒤쪽 인물로 초점을 넘깁니다.',
        distinction: '구도와 위치를 고정하고 앞뒤 레이어의 선명도만 교대합니다.',
    },
    {
        id: 'camera-follow-pan',
        name: '따라가는 PAN',
        category: 'camera',
        previewMs: 2200,
        description: '오른쪽으로 이동하는 인물을 일정한 화면 위치에 두며 배경을 이송합니다.',
        distinction: '애니메이션 그림의 2D 수평 이송입니다. 3D 카메라의 제자리 회전은 아닙니다.',
    },
    {
        id: 'camera-slow-quick-pan',
        name: '지와 PAN·퀵 PAN',
        category: 'camera',
        previewMs: 2400,
        description: '주변을 천천히 훑다가 화면 밖 상대 쪽으로 빠르게 전환합니다.',
        distinction: '배율을 고정한 수평 이송의 속도 대비이며 급확대가 아닙니다.',
    },
    {
        id: 'camera-track-up-back',
        name: 'T.U·T.B',
        category: 'camera',
        previewMs: 2100,
        description: '같은 초점 중심으로 확대해 접근한 뒤 다시 축소해 물러납니다.',
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
        description: '중경 인물은 선명하게 두고 전경과 원경의 흐림 크기를 다르게 합니다.',
        distinction: '초점은 고정하고 깊이층마다 다른 흐림을 줍니다. 정밀한 렌즈 조리개 시뮬레이션은 아닙니다.',
    },
    {
        id: 'camera-foggy',
        name: '포기',
        category: 'camera',
        previewMs: 2100,
        description: '젖빛 막과 광원 주변 확산으로 화면 대비를 부드럽게 낮춥니다.',
        distinction: '정적인 포그 필터의 재해석이며 실제 연기·안개 입자를 추가하지 않습니다.',
    },
    {
        id: 'camera-double-shadow',
        name: '이중노출 그림자',
        category: 'camera',
        previewMs: 2100,
        description: '실제 몸 뒤에 위치가 다른 두 개의 어두운 노출을 겹칩니다.',
        distinction: '별도 배우가 아닌 그림자 합성이며 바닥 투영 물리를 계산하지 않습니다.',
    },
    {
        id: 'camera-glow',
        name: '글로우',
        category: 'camera',
        previewMs: 2100,
        description: '구체의 선명한 핵을 유지하며 광원 바깥으로만 빛을 넓게 퍼뜨립니다.',
        distinction: '장면 전체의 대비를 바꾸는 디퓨전·포기와 달리 한 광원의 주변만 처리합니다.',
    },
    {
        id: 'camera-incident-light',
        name: '입사광',
        category: 'camera',
        previewMs: 2100,
        description: '창 밖에서 들어오는 사선 빛이 먼지와 바닥의 밝은 자리를 드러냅니다.',
        distinction: '공간 안의 빛줄기이며 화면 렌즈의 고스트나 그림 내부의 투과광과 다릅니다.',
    },
    {
        id: 'camera-multiplane',
        name: '멀티플레인 카메라',
        category: 'camera',
        previewMs: 3000,
        description: 'z 깊이에 놓인 평면들을 카메라 전진·옆 이동에 맞춰 원근 투영합니다.',
        distinction: '가까운 층이 더 빨리 이동하고 커집니다. 고정 크기 셀 이송이나 단순 전체 줌과 다릅니다.',
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
