import type { TimingProfile } from '../../cutscenes/scene-timing.js';

export const combinationTimingProfiles: Readonly<
  Record<string, TimingProfile>
> = {
  'background-run': [
    { endMs: 160, rate: 3 },
    // 질주·스퍼트·도약은 착지와 구도 정착까지 같은 배율로 보내 속도 연결을 보존한다.
    { endMs: 2250, rate: 1.5 },
    // 구도 정착 뒤 접촉 준비와 접촉 뒤 45ms 힘 받기는 그대로 유지한다.
    { endMs: 2505, rate: 1 },
    { endMs: 3000, rate: 1.5 },
    { endMs: 3300, rate: 3 },
  ],
  'already-cut': [
    { endMs: 1350, rate: 1.5 },
    // 125ms 안의 세 관통 코마를 그대로 읽힌다.
    { endMs: 1475, rate: 1 },
    { endMs: 1900, rate: 1.5 },
    { endMs: 2250, rate: 3 },
    // 지연 앞의 숨과 여덟 타격·팔 풀기를 보존해 정적의 원인과 결과를 잇는다.
    { endMs: 3200, rate: 1 },
    { endMs: 3540, rate: 1.5 },
    { endMs: 3900, rate: 3 },
  ],
  'falling-background': [
    { endMs: 1880, rate: 1.5 },
    // 자세 회복에서 마지막 가속·90ms 신전·75ms 접촉·착지까지 하나로 보호한다.
    { endMs: 2920, rate: 1 },
    { endMs: 3280, rate: 1.5 },
    { endMs: 3700, rate: 3 },
  ],
  'aerial-pursuit': [
    { endMs: 190, rate: 2 },
    { endMs: 470, rate: 1 },
    { endMs: 760, rate: 1.5 },
    // 각 타의 70ms 신전·65ms 접촉 자세·초기 밀림은 같은 길이로 남긴다.
    { endMs: 1000, rate: 1 },
    { endMs: 1230, rate: 1.5 },
    { endMs: 1470, rate: 1 },
    { endMs: 1620, rate: 1.5 },
    { endMs: 1860, rate: 1 },
    { endMs: 1960, rate: 1.5 },
    { endMs: 2200, rate: 1 },
    { endMs: 2500, rate: 2 },
    // 0.40초 급강하와 흐림 이탈·지면 접촉·접촉 원화 정지를 보호한다.
    { endMs: 3020, rate: 1 },
    { endMs: 3680, rate: 1.5 },
    { endMs: 4200, rate: 3 },
  ],
  'spiral-stairs': [
    { endMs: 1700, rate: 1.5 },
    // 도약부터 실제 타점의 70ms 접촉 원화까지는 카메라와 몸을 함께 읽힌다.
    { endMs: 2470, rate: 1 },
    { endMs: 2750, rate: 1.5 },
    { endMs: 3050, rate: 3 },
  ],
  'bullet-counter': [
    { endMs: 340, rate: 3 },
    { endMs: 1150, rate: 1.5 },
    // 장면 0.11초를 1.12초로 펴는 슬로모션과 반격·80ms 접촉을 보존한다.
    { endMs: 2540, rate: 1 },
    { endMs: 3200, rate: 1.5 },
    { endMs: 3500, rate: 3 },
  ],
  'orbit-2d': [
    { endMs: 340, rate: 3 },
    { endMs: 2240, rate: 1.5 },
    { endMs: 2620, rate: 2 },
    // 반대편에 선 뒤 80ms 신전·100ms 접촉 유지·초기 밀림을 한 박자로 남긴다.
    { endMs: 2860, rate: 1 },
    { endMs: 3200, rate: 1.5 },
    { endMs: 3500, rate: 3 },
  ],
  'time-stop': [
    { endMs: 650, rate: 2 },
    { endMs: 1080, rate: 1 },
    { endMs: 1160, rate: 4 },
    // 정지 세계 안의 다섯 60ms 이동을 유지하고 등 돌린 대기만 줄인다.
    { endMs: 1490, rate: 1 },
    { endMs: 2430, rate: 3 },
    // 색 귀환과 다섯 30ms 지연 타격·첫 밀림이 같은 세계 시각으로 연결된다.
    { endMs: 2810, rate: 1 },
    { endMs: 3400, rate: 1.5 },
    { endMs: 3700, rate: 3 },
  ],
  'ink-one-stroke': [
    { endMs: 170, rate: 3 },
    { endMs: 620, rate: 1 },
    { endMs: 1340, rate: 2 },
    // 같은 곡선의 붓·주먹·1.4608401577초 명중과 초기 밀림을 보호한다.
    { endMs: 1681, rate: 1 },
    { endMs: 1800, rate: 1.5 },
    // 낙관을 읽고 같은 공간의 색이 획에서 돌아오는 시간은 유지한다.
    { endMs: 2800, rate: 1 },
    { endMs: 3200, rate: 2 },
    { endMs: 3500, rate: 3 },
  ],
  'comic-panels': [
    { endMs: 120, rate: 3 },
    // 네 준비 칸의 260→200→140ms 간격과 120ms 진입을 보존한다.
    { endMs: 840, rate: 1 },
    { endMs: 1280, rate: 3 },
    { endMs: 1460, rate: 1 },
    { endMs: 1780, rate: 2 },
    // 100ms 신전·35ms 반전·판 어긋남과 단 한 번의 초기 반동을 유지한다.
    { endMs: 2245, rate: 1 },
    { endMs: 2360, rate: 2 },
    { endMs: 2860, rate: 1 },
    { endMs: 3300, rate: 4 },
  ],
  'rhythm-rush': [{ endMs: 1750, rate: 1 }],
  'piercing-dash': [{ endMs: 1450, rate: 1 }],
  'short-power': [{ endMs: 1600, rate: 1 }],
  'synergy-heavy-strike': [{ endMs: 1850, rate: 1 }],
  'synergy-explosive-rush': [{ endMs: 2200, rate: 1 }],
  'synergy-accelerating-flurry': [{ endMs: 2350, rate: 1 }],
  'synergy-delayed-pierce': [{ endMs: 2300, rate: 1 }],
  'synergy-reversal-counter': [{ endMs: 2800, rate: 1 }],
  'synergy-ground-break': [{ endMs: 2500, rate: 1 }],
  'synergy-final-blow': [{ endMs: 2600, rate: 1 }],
  'composite-fast': [
    { endMs: 950, rate: 3 },
    { endMs: 1510, rate: 1.5 },
    // 디딤·120ms 정권 신전·두 30fps 접촉 코마·140ms 초기 밀림을 보호한다.
    { endMs: 2007, rate: 1 },
    { endMs: 2390, rate: 1.5 },
    // 팔 회수와 정착한 구도를 읽힌 뒤 공통 4.2초의 긴 끝 여백을 접는다.
    { endMs: 3300, rate: 1 },
    { endMs: 4200, rate: 3 },
  ],
};
