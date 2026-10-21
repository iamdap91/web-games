import type { TimingProfile } from '../../cutscenes/scene-timing.js';

// 원본 시각은 유지하고 대기·접근·회수만 접는다. 짧은 신전과 접촉은 원래 길이로 읽힌다.
const standardActionTiming: TimingProfile = [
  { endMs: 900, rate: 3 },
  { endMs: 1680, rate: 2 },
  { endMs: 1960, rate: 1 },
  { endMs: 2850, rate: 1.8 },
  { endMs: 3500, rate: 2.5 },
  { endMs: 4200, rate: 4 },
];

export const actionTimingProfiles: Readonly<Record<string, TimingProfile>> = {
  // 2코마 교체·3코마 플래시는 공통 신전/접촉 구간 안에서 원래 노출 시간을 보존한다.
  'impact-frame': standardActionTiming,
  'beta-flash': standardActionTiming,
  'monochrome-invert': standardActionTiming,
  'shock-koma': [
    { endMs: 900, rate: 3 },
    { endMs: 1680, rate: 2 },
    // 24fps의 1·1·2코마를 중간에서 끊거나 짧게 만들지 않는다.
    { endMs: 1800 + (1000 / 24) * 4, rate: 1 },
    { endMs: 2850, rate: 1.8 },
    { endMs: 3500, rate: 2.5 },
    { endMs: 4200, rate: 4 },
  ],
  'shock-koma-v2': [
    { endMs: 900, rate: 3 },
    { endMs: 1680, rate: 2 },
    // 앞의 짧은 섬광과 뒤의 긴 잔염 대비가 본질이므로 30fps 25코마를 함께 지킨다.
    { endMs: 1800 + (1000 / 30) * 25, rate: 1 },
    { endMs: 2850, rate: 1.8 },
    { endMs: 3500, rate: 2.5 },
    { endMs: 4200, rate: 4 },
  ],
  'screen-shatter': [
    { endMs: 900, rate: 3 },
    { endMs: 1680, rate: 2 },
    // 갈라지는 첫 화면은 남기고, 이미 분리된 조각의 이탈과 소거를 빠르게 끝낸다.
    { endMs: 1920, rate: 1 },
    { endMs: 2900, rate: 1.6 },
    { endMs: 3500, rate: 2.5 },
    { endMs: 4200, rate: 4 },
  ],
  'hisashi-punch': [
    { endMs: 900, rate: 3 },
    { endMs: 1300, rate: 2 },
    { endMs: 1680, rate: 1.8 },
    // 120ms 신전과 560ms 느린 접촉을 함께 보존해 느림과 빠름의 대비를 남긴다.
    { endMs: 2360, rate: 1 },
    { endMs: 2850, rate: 1.8 },
    { endMs: 3500, rate: 2.5 },
    { endMs: 4200, rate: 4 },
  ],
  'action-cutin': [
    { endMs: 900, rate: 3 },
    { endMs: 1040, rate: 2 },
    // 눈과 본동작을 함께 읽을 약 0.37초는 확보한다. 패널의 즉시 삽입/제거는 유지한다.
    { endMs: 1600, rate: 1.5 },
    { endMs: 1680, rate: 2 },
    { endMs: 1960, rate: 1 },
    { endMs: 2850, rate: 1.8 },
    { endMs: 3500, rate: 2.5 },
    { endMs: 4200, rate: 4 },
  ],
  // 근접 컷의 첫 200ms와 실제 접촉은 보존하고, 맞은 뒤의 근접 유지와 복귀를 줄인다.
  'pon-yori': standardActionTiming,
  'obari-punch': [
    { endMs: 900, rate: 3 },
    { endMs: 1680, rate: 2 },
    // 큰 주먹 원화와 곰왕이 멀어지는 반동의 정점까지 같은 시계로 남긴다.
    { endMs: 2020, rate: 1 },
    { endMs: 2800, rate: 1.7 },
    { endMs: 3500, rate: 3 },
    { endMs: 4200, rate: 4 },
  ],
  'inazuma-kick': [
    { endMs: 900, rate: 3 },
    { endMs: 1540, rate: 2 },
    // A 장전을 읽을 150ms와 B 신전 80ms를 남겨 두 자세의 대비를 보존한다.
    { endMs: 1720, rate: 1.2 },
    { endMs: 1900, rate: 1 },
    { endMs: 2800, rate: 1.8 },
    { endMs: 3500, rate: 2.5 },
    { endMs: 4200, rate: 4 },
  ],
  'kurumada-fall': [
    { endMs: 900, rate: 3 },
    { endMs: 1680, rate: 2 },
    { endMs: 1960, rate: 1 },
    { endMs: 2380, rate: 1.8 },
    // 머리부터인 자세가 먼저 읽힌 뒤 가속해야 착지의 방향과 큰 낙차가 남는다.
    { endMs: 2780, rate: 1.4 },
    { endMs: 3140, rate: 1 },
    { endMs: 3860, rate: 1.8 },
    { endMs: 4200, rate: 3 },
  ],
  // 각각 60ms·80ms인 변형 중간그림은 공통 보호 구간 안에 둔다.
  'smear-frame': standardActionTiming,
  obake: standardActionTiming,
  'background-animation': [
    { endMs: 450, rate: 3 },
    // 질주의 공간을 보여주되 긴 이동은 1.5배로 접고, 구도 정착부터는 선명하게 남긴다.
    { endMs: 1450, rate: 1.5 },
    { endMs: 1650, rate: 1.3 },
    { endMs: 1960, rate: 1 },
    { endMs: 2800, rate: 1.8 },
    { endMs: 3500, rate: 2.5 },
    { endMs: 4200, rate: 4 },
  ],
  // 준비 원화를 짧게 읽힌 뒤 생략된 연결을 건너뛰는 성질은 시간 압축 뒤에도 유지된다.
  nakanuki: standardActionTiming,
  midareuchi: [
    { endMs: 900, rate: 3 },
    { endMs: 1800 - (1000 / 24) * 16, rate: 2 },
    // 8·2·5·1코마의 총 16코마와 각 코마 길이를 바꾸면 다른 노출표가 된다.
    { endMs: 1960, rate: 1 },
    { endMs: 2850, rate: 1.8 },
    { endMs: 3500, rate: 2.5 },
    { endMs: 4200, rate: 4 },
  ],
  strobe: [
    { endMs: 900, rate: 3 },
    { endMs: 1150, rate: 2 },
    // 마지막 포착 1750ms와 그 뒤 360ms 수명까지 지켜 120ms 간격이 실제로 유지되게 한다.
    { endMs: 2110, rate: 1 },
    { endMs: 2850, rate: 2 },
    { endMs: 3500, rate: 2.5 },
    { endMs: 4200, rate: 4 },
  ],
  'motion-metamorphosis': [
    { endMs: 900, rate: 3 },
    { endMs: 1150, rate: 2 },
    // 650ms 외곽 이동은 그대로 보여 교차 페이드와 구별하고 접촉 뒤에만 빨리 걷는다.
    { endMs: 1960, rate: 1 },
    { endMs: 2080, rate: 1.5 },
    { endMs: 2850, rate: 2 },
    { endMs: 3500, rate: 2.5 },
    { endMs: 4200, rate: 4 },
  ],
  'wave-propagation': [
    { endMs: 650, rate: 3 },
    { endMs: 950, rate: 2 },
    // 1000ms 동안 꼭짓점이 뿌리에서 끝까지 전달되는 과정은 생략하지 않는다.
    { endMs: 1950, rate: 1 },
    { endMs: 2380, rate: 1.8 },
    { endMs: 3500, rate: 3 },
    { endMs: 4200, rate: 4 },
  ],
  'araki-flutter': [
    { endMs: 650, rate: 3 },
    // 360ms 반복 주기와 부위별 위상차는 유지하고, 반복 전후의 긴 대기만 접는다.
    { endMs: 1650, rate: 1 },
    { endMs: 1800, rate: 1.5 },
    { endMs: 1960, rate: 1 },
    { endMs: 2800, rate: 2.2 },
    { endMs: 3500, rate: 3 },
    { endMs: 4200, rate: 4 },
  ],
  'squash-stretch': [
    { endMs: 650, rate: 3 },
    { endMs: 1050, rate: 2 },
    // 실제 관절 폄 110ms와 착지 눌림 120ms는 남기고 공중의 긴 체류만 줄인다.
    { endMs: 1160, rate: 1 },
    { endMs: 1740, rate: 1.5 },
    { endMs: 2000, rate: 1 },
    { endMs: 2800, rate: 1.8 },
    { endMs: 3500, rate: 3 },
    { endMs: 4200, rate: 4 },
  ],
  // 1716~1800ms의 짧은 통과 두 장은 공통 보호 구간에 포함된다.
  'kanada-motion': standardActionTiming,
  'kanada-perspective': [
    { endMs: 900, rate: 3 },
    { endMs: 1680, rate: 2 },
    // 발과 몸통의 서로 다른 원근을 읽을 수 있게 B 원화가 이어지는 회수 초반까지 남긴다.
    { endMs: 2100, rate: 1 },
    { endMs: 2850, rate: 1.8 },
    { endMs: 3500, rate: 2.5 },
    { endMs: 4200, rate: 4 },
  ],
  'focus-lines': [
    { endMs: 900, rate: 3 },
    { endMs: 1680, rate: 2 },
    // 선이 모인 접촉 화면과 마지막 70ms 회수는 지키고 긴 모임의 앞부분을 줄인다.
    { endMs: 2050, rate: 1 },
    { endMs: 2850, rate: 1.8 },
    { endMs: 3500, rate: 2.5 },
    { endMs: 4200, rate: 4 },
  ],
  'speed-streamlines': [
    { endMs: 900, rate: 3 },
    { endMs: 950, rate: 2 },
    // 달리기 네 장의 두 순환은 빠르게 지나가되 발 디딤 60ms와 120ms 신전은 따로 읽힌다.
    { endMs: 1510, rate: 1.5 },
    { endMs: 1960, rate: 1 },
    { endMs: 2850, rate: 1.8 },
    { endMs: 3500, rate: 2.5 },
    { endMs: 4200, rate: 4 },
  ],
};
