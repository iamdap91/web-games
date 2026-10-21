// 접촉광의 정점과 감쇠는 원래 길이로 읽히고, 접근·회수와 처음·끝 여백만 접는다.
const contactLightTiming = [
    { endMs: 650, rate: 3 },
    { endMs: 1700, rate: 1.5 },
    { endMs: 2250, rate: 1 },
    { endMs: 3500, rate: 1.5 },
    { endMs: 4200, rate: 3 },
];
// 정적인 광학 차이는 접촉 전후에 충분히 비교하고, 별도의 충격 표현은 더하지 않는다.
const fixedOpticsTiming = [
    { endMs: 650, rate: 3 },
    { endMs: 1450, rate: 1.5 },
    { endMs: 2250, rate: 1 },
    { endMs: 3500, rate: 1.5 },
    { endMs: 4200, rate: 3 },
];
// 계속 움직이는 굴절·미세 시차는 긴 구간을 같은 배율로 보내 잦은 속도 변화를 피한다.
const continuousOpticsTiming = [
    { endMs: 1600, rate: 1.5 },
    { endMs: 2250, rate: 1 },
    { endMs: 3500, rate: 1.5 },
    { endMs: 4200, rate: 3 },
];
export const cameraEditingTimingProfiles = {
    'camera-transmitted-light': contactLightTiming,
    'camera-para': fixedOpticsTiming,
    'camera-wavy-glass': continuousOpticsTiming,
    'camera-diffusion': fixedOpticsTiming,
    'camera-blur': [
        { endMs: 650, rate: 3 },
        { endMs: 1450, rate: 1.5 },
        // 방사형 노출이 모이고 접촉 뒤 걷히는 350+180ms를 함께 보호한다.
        { endMs: 1980, rate: 1 },
        { endMs: 3500, rate: 1.5 },
        { endMs: 4200, rate: 3 },
    ],
    'camera-lens-flare': contactLightTiming,
    'camera-anamorphic': contactLightTiming,
    'camera-cross-light': contactLightTiming,
    'camera-screen-shake': [
        { endMs: 650, rate: 3 },
        { endMs: 1700, rate: 1.5 },
        // 접촉 직전부터 560ms 감쇠가 끝날 때까지 진동 주파수와 수명을 유지한다.
        { endMs: 2360, rate: 1 },
        { endMs: 3500, rate: 1.5 },
        { endMs: 4200, rate: 3 },
    ],
    'camera-contact-multi': [
        { endMs: 250, rate: 3 },
        { endMs: 1700, rate: 1.5 },
        { endMs: 2250, rate: 1 },
        // 판별 이송 거리와 크기는 같게 두고 긴 이동과 정착 뒤 여백만 줄인다.
        { endMs: 3100, rate: 1.5 },
        { endMs: 4200, rate: 3 },
    ],
    // 색 교대는 실제 재생 시계를 따로 사용해 400ms를 유지하고 배우·무대만 빠르게 보낸다.
    'camera-flicker': fixedOpticsTiming,
    'camera-rack-focus': [
        { endMs: 650, rate: 3 },
        { endMs: 1600, rate: 1.5 },
        // 실제 접촉과 아타호→곰왕의 500ms 초점 이동을 한 호흡으로 유지한다.
        { endMs: 2400, rate: 1 },
        { endMs: 3500, rate: 1.5 },
        { endMs: 4200, rate: 3 },
    ],
    'camera-follow-pan': fixedOpticsTiming,
    'camera-slow-quick-pan': [
        // 느린 이동과 140ms 퀵 팬의 시간 차이는 남기고 긴 주변 읽기만 줄인다.
        { endMs: 1450, rate: 1.5 },
        { endMs: 1660, rate: 2 },
        { endMs: 2250, rate: 1 },
        { endMs: 3500, rate: 2 },
        { endMs: 4200, rate: 3 },
    ],
    'camera-track-up-back': [
        { endMs: 650, rate: 3 },
        { endMs: 900, rate: 2 },
        // 근접 구도 도착과 접촉 구도의 유지가 한 번의 확대 동작으로 이어진다.
        { endMs: 2180, rate: 1 },
        { endMs: 3000, rate: 1.5 },
        { endMs: 3500, rate: 2 },
        { endMs: 4200, rate: 3 },
    ],
    'camera-handheld': continuousOpticsTiming,
    'camera-multi-bokeh': fixedOpticsTiming,
    'camera-foggy': contactLightTiming,
    'camera-double-shadow': fixedOpticsTiming,
    'camera-glow': contactLightTiming,
    'camera-incident-light': continuousOpticsTiming,
    'camera-multiplane': [
        { endMs: 250, rate: 3 },
        { endMs: 1700, rate: 1.5 },
        { endMs: 2250, rate: 1 },
        { endMs: 3500, rate: 1.5 },
        { endMs: 4200, rate: 3 },
    ],
    'editing-harmony': [
        { endMs: 650, rate: 3 },
        { endMs: 1700, rate: 1.5 },
        // 회화판 즉시 전환과 그 뒤 1.2초의 종결 그림 읽기는 보호한다.
        { endMs: 3030, rate: 1 },
        { endMs: 4200, rate: 4 },
    ],
    'editing-still': [
        { endMs: 650, rate: 3 },
        { endMs: 1650, rate: 1.5 },
        // 멈춘 그림의 660ms 자체와 접촉 직전은 줄이지 않는다.
        { endMs: 2460, rate: 1 },
        // 시계가 660ms 늦어져 끝까지 이어지는 실제 회수도 모두 지나간다.
        { endMs: 4160, rate: 1.5 },
        { endMs: 4200, rate: 4 },
    ],
    'editing-triple': [
        { endMs: 650, rate: 3 },
        { endMs: 1500, rate: 1.5 },
        // 세 번 때리는 것으로 바뀌지 않게 600ms씩 같은 접촉을 재노출하는 세 컷을 유지한다.
        { endMs: 3300, rate: 1 },
        { endMs: 4200, rate: 2 },
    ],
    'editing-split': [
        { endMs: 650, rate: 3 },
        { endMs: 1700, rate: 1.5 },
        { endMs: 2250, rate: 1 },
        { endMs: 3500, rate: 1.5 },
        { endMs: 4200, rate: 3 },
    ],
    'editing-orbit': [
        { endMs: 450, rate: 3 },
        { endMs: 1600, rate: 1.5 },
        // 방향이 바뀌어도 접촉 원화와 팔 회수가 읽히도록 중심 구간은 유지한다.
        { endMs: 2100, rate: 1 },
        { endMs: 3350, rate: 1.5 },
        { endMs: 4200, rate: 3 },
    ],
    'editing-text-cuts': [
        { endMs: 650, rate: 3 },
        { endMs: 850, rate: 1.5 },
        { endMs: 1017, rate: 1 },
        { endMs: 1280, rate: 1.5 },
        { endMs: 1447, rate: 1 },
        { endMs: 1660, rate: 1.5 },
        // 문자 세 장의 167/167/125ms 노출과 마지막 문자 뒤 실제 접촉을 유지한다.
        { endMs: 1960, rate: 1 },
        { endMs: 3500, rate: 1.5 },
        { endMs: 4200, rate: 3 },
    ],
    'editing-extreme': [
        { endMs: 600, rate: 3 },
        // 긴 눈→짧은 입→더 긴 눈의 불균등한 컷 길이가 이 견본의 핵심이다.
        { endMs: 3300, rate: 1 },
        { endMs: 4200, rate: 4 },
    ],
    'editing-imaishi': [
        { endMs: 650, rate: 3 },
        { endMs: 1000, rate: 1.5 },
        // 130ms 장전, 42ms씩 두 돌파, 240ms 접촉 노출의 대비를 그대로 보존한다.
        { endMs: 2040, rate: 1 },
        { endMs: 3500, rate: 1.5 },
        { endMs: 4200, rate: 3 },
    ],
    'editing-shadow-play': [
        { endMs: 700, rate: 3 },
        { endMs: 1800, rate: 1.5 },
        // 왕관의 이동과 질문→행동→반전의 연결을 읽힌 뒤 종결로 보낸다.
        { endMs: 2850, rate: 1 },
        { endMs: 3500, rate: 1.5 },
        { endMs: 4200, rate: 4 },
    ],
    'editing-overlap': [
        // 앞 장면은 이미 같은 접촉 그림으로 정지해 있으므로 먼저 읽는 여백만 줄인다.
        { endMs: 1500, rate: 4 },
        { endMs: 3500, rate: 1 },
        { endMs: 4200, rate: 4 },
    ],
    'editing-wipe-iris': [
        { endMs: 1500, rate: 4 },
        // 쓸기와 원형 닫힘을 모두 원래 길이로 남겨 서로 다른 경계가 구별되게 한다.
        { endMs: 2800, rate: 1 },
        { endMs: 2900, rate: 4 },
        { endMs: 4000, rate: 1 },
        { endMs: 4200, rate: 4 },
    ],
    'editing-white-out': [
        { endMs: 1200, rate: 3 },
        // 흰색으로 잠기고 다음 장소가 돌아오는 긴 노출을 타격 섬광처럼 줄이지 않는다.
        { endMs: 3650, rate: 1 },
        { endMs: 4200, rate: 4 },
    ],
};
