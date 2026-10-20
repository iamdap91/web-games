import {
  burst,
  ellipse,
  label,
  line,
  noise,
  palette,
  polygon,
  ring,
  smooth,
  star,
  windowed,
} from './drawing.js';
import {
  battleLayout,
  battleImpact,
  drawAtaho,
  drawBattle,
  drawBear,
  drawPortrait,
} from './battle.js';
import {
  height,
  width,
  type Context,
  type Frame,
  type Point,
  type Sample,
} from './types.js';
import {
  drawPerspectivePunch,
  drawHeadFirstFall,
  perspectivePunchTiming,
  headFirstFallTiming,
} from './impact-resource.js';
import { drawShockKoma } from './shock-koma.js';
import { drawShockKomaV2 } from './shock-koma-v2.js';

export const impactSamples: readonly Sample[] = [
  {
    id: 'impact-frame',
    name: '임팩트 프레임',
    category: 'impact',
    previewMs: 1840,
    description:
      '어퍼컷이 곰왕에게 닿는 순간을 실제 두 원본의 검은 윤곽과 추상 충격선으로 바꿉니다.',
    distinction: '새 몸을 그리지 않고 접촉 컷의 화면 표현만 잠깐 교체합니다.',
  },
  {
    id: 'shock-koma',
    name: '쇼크코마 · 극단색과 먹선',
    category: 'impact',
    previewMs: 1905,
    beats: [
      { timeMs: 1818, label: '극단색 1코마' },
      { timeMs: 1860, label: '명암 반전 1코마' },
      { timeMs: 1905, label: '먹선 2코마' },
      { timeMs: 1980, label: '원색 복귀' },
    ],
    description:
      '아타호의 어퍼컷 접촉을 극단색 1코마 → 흑백 반전 1코마 → 거친 먹선 2코마로 교체하고 원색 장면으로 돌아옵니다.',
    distinction:
      '24fps 기준 약 0.167초 동안 실제 두 배우의 명암·윤곽을 다시 그립니다. 원작의 새 동작 원화를 복제한 것은 아니며, 모션 감소에서는 낮은 대비의 먹선 한 장을 유지합니다.',
  },
  {
    id: 'shock-koma-v2',
    name: '쇼크코마 v2 · 섬광과 잔염',
    category: 'impact',
    previewMs: 2200,
    beats: [
      { timeMs: 1816, label: '발광 윤곽' },
      { timeMs: 1850, label: '적색 실루엣' },
      { timeMs: 1916, label: '백열핵' },
      { timeMs: 2200, label: '붉은 잔염' },
      { timeMs: 2566, label: '흑백 방사선' },
      { timeMs: 2666, label: '원색 복귀' },
    ],
    description:
      '수평 정권의 접촉을 발광 윤곽 → 적색 실루엣 → 백열핵 → 붉은 잔염 → 흑백 방사선으로 바꾼 뒤 원색 장면으로 돌아옵니다.',
    distinction:
      '사용자 영상 2~3초의 섬광과 긴 잔염을 기존 정권 윤곽과 절차 에너지로 재구성합니다. 원작의 새 동작을 복제한 것은 아니며, 모션 감소에서는 낮은 대비의 한 장을 유지합니다.',
  },
  {
    id: 'beta-flash',
    name: '베타 플래시',
    category: 'impact',
    previewMs: 1810,
    description:
      '검은 주변부와 비워 둔 흰 초점 공간 안에 아타호와 곰왕의 실제 윤곽을 남깁니다.',
    distinction: '화면 전체 반전과 달리 검정과 흰 여백의 면적을 설계합니다.',
  },
  {
    id: 'monochrome-invert',
    name: '흑백 반전',
    category: 'impact',
    previewMs: 1840,
    description:
      '같은 어퍼컷과 곰왕 피격 구도의 밝고 어두운 관계를 접촉 순간 뒤집습니다.',
    distinction: '원본 형태·비율·방향은 유지하고 명암 관계만 바꿉니다.',
  },
  {
    id: 'screen-shatter',
    name: '화면 갈라짐',
    category: 'impact',
    previewMs: 2170,
    description:
      '실제 아타호와 곰왕이 담긴 접촉 화면을 조각에 남긴 채 벌립니다.',
    distinction:
      '원본 배우의 새 회전 자세가 아니라 합성 화면의 조각이 이동합니다.',
  },
  {
    id: 'hisashi-punch',
    name: '히사시 펀치',
    category: 'impact',
    previewMs: 2260,
    description: '수평 정권의 접촉 프레임과 곰왕 피격 반응을 오래 붙잡습니다.',
    distinction:
      '접촉 구간의 재생 시간만 늘리고 몸과 상대 반응은 기존 프레임을 사용합니다.',
  },
  {
    id: 'action-cutin',
    name: '컷인',
    category: 'impact',
    previewMs: 1250,
    description:
      '곰왕을 향한 공격 위에 기존 아타호 얼굴의 별도 패널을 끼웁니다.',
    distinction: '행동을 남긴 채 같은 실제 인물의 눈 크롭을 함께 보여줍니다.',
  },
  {
    id: 'pon-yori',
    name: '퐁요리',
    category: 'impact',
    previewMs: 1900,
    description:
      '어퍼컷 와이드에서 타점 근접 구도로 중간 줌 이동 없이 전환합니다.',
    distinction: '원본 배우는 같은 비율이며 처음과 끝 구도를 컷으로 잇습니다.',
  },
  {
    id: 'obari-punch',
    name: '오바리 펀치 · 전경 정권 원화',
    category: 'impact',
    previewMs: 1870,
    beats: [
      { timeMs: perspectivePunchTiming.loadMs, label: '전용 장전 원화' },
      { timeMs: battleLayout.contactMs, label: '큰 전경 주먹 · 실제 타점' },
      { timeMs: perspectivePunchTiming.recoverMs, label: '공격자 회수 원화' },
      { timeMs: perspectivePunchTiming.recoilPeakMs, label: '곰왕 왼쪽 반동' },
      { timeMs: perspectivePunchTiming.idleMs, label: '공격자 기립' },
      { timeMs: perspectivePunchTiming.settledMs, label: '밀린 자리에서 정착' },
    ],
    description:
      '보유한 남동 장전·큰 전경 주먹·회수 원화를 직접 연결하고 실제 타점에서 곰왕을 왼쪽으로 밀어 늦게 정착시킵니다.',
    distinction:
      '몸 전체 확대 대신 전용 큰 주먹 원화를 씁니다. 기존 정권과 새 원화 시안을 비교하며 사용자 GIF 품질 검토는 대기 상태입니다.',
  },
  {
    id: 'inazuma-kick',
    name: '이나즈마 킥',
    category: 'impact',
    previewMs: 1900,
    description:
      '기존 A/B 사선 날아차기와 곰왕 피격에 낙하 방향의 번개 궤적을 더합니다.',
    distinction:
      '기존 점프·장전·신전·착지를 재사용하며 PNG를 돌리거나 발을 새로 키우지 않습니다.',
  },
  {
    id: 'kurumada-fall',
    name: '쿠루마다 낙하 · 머리 착지 원화',
    category: 'impact',
    previewMs: headFirstFallTiming.contactMs,
    beats: [
      { timeMs: battleLayout.contactMs, label: '어퍼컷 · 넓어지는 구도' },
      { timeMs: headFirstFallTiming.turnMs, label: '머리부터 낙하 원화' },
      { timeMs: headFirstFallTiming.terminalMs, label: '막판 하강 가속' },
      { timeMs: headFirstFallTiming.contactMs, label: '머리 접촉 · 압축 원화' },
      { timeMs: headFirstFallTiming.dustEndMs, label: '먼지 소거 · 구도 복귀' },
      { timeMs: headFirstFallTiming.settledMs, label: '착지 종결 구도' },
    ],
    description:
      '어퍼컷 뒤 구도를 넓혀 240px 낙차를 담고 마지막에 빠르게 하강합니다. 머리·어깨가 눌리는 착지 뒤 먼지와 구도 복귀로 끝냅니다.',
    distinction:
      'PixelLab에서 기존 곰왕을 기준으로 낙하·머리 착지 두 핵심 자세를 새로 제작했습니다. PNG 회전은 사용하지 않으며 작화 품질은 사용자 GIF 검토 대기입니다.',
  },
];

const contactMs = battleLayout.contactMs;
const impact = battleLayout.impact;

function sceneTime(frame: Frame): number {
  return Math.max(0, frame.timeMs);
}

function drawCombat(ctx: Context, frame: Frame, timeMs = frame.timeMs): void {
  drawBattle(ctx, frame, { timeMs });
}

function frameCamera(
  ctx: Context,
  scale: number,
  focus: Point,
  destination: Point,
): void {
  const x = Math.max(
    width * (1 - scale),
    Math.min(0, destination.x - focus.x * scale),
  );
  const y = Math.max(
    height * (1 - scale),
    Math.min(0, destination.y - focus.y * scale),
  );
  ctx.translate(x, y);
  ctx.scale(scale, scale);
}

function drawSilhouettes(
  ctx: Context,
  frame: Frame,
  timeMs = frame.timeMs,
): void {
  drawAtaho(ctx, frame, { timeMs, action: 'uppercut', silhouette: true });
  drawBear(ctx, frame, { timeMs, silhouette: true });
}

function drawAbstractImpact(ctx: Context, frame: Frame): void {
  ctx.fillStyle = frame.reducedMotion ? '#353548' : palette.paper;
  ctx.fillRect(0, 0, width, height);
  for (let i = 0; i < 19; i++) {
    const a = (i * Math.PI * 2) / 19 + noise(i + 9) * 0.15;
    const r = 95 + noise(i) * 65;
    polygon(
      ctx,
      [
        {
          x: impact.x + Math.cos(a - 0.04) * r,
          y: impact.y + Math.sin(a - 0.04) * r,
        },
        { x: impact.x + Math.cos(a) * 1100, y: impact.y + Math.sin(a) * 1100 },
        {
          x: impact.x + Math.cos(a + 0.17) * 1100,
          y: impact.y + Math.sin(a + 0.17) * 1100,
        },
      ],
      palette.ink,
    );
  }
  drawSilhouettes(ctx, frame);
  star(
    ctx,
    impact.x,
    impact.y,
    frame.reducedMotion ? 57 : 78,
    frame.reducedMotion ? '#aeabbc' : palette.paper,
    7,
    0.13,
  );
}

function drawBeta(ctx: Context, frame: Frame): void {
  const amount = windowed(sceneTime(frame), 1680, 2160, 65);
  ctx.save();
  ctx.globalAlpha *= amount * (frame.reducedMotion ? 0.6 : 1);
  ctx.fillStyle = '#080c17';
  ctx.fillRect(0, 0, width, height);
  ellipse(ctx, impact.x, impact.y, 184, 154, palette.paper);
  for (let i = 0; i < 38; i++) {
    const a = (i * Math.PI * 2) / 38;
    const inner = 180 + noise(i + 24) * 45;
    polygon(
      ctx,
      [
        {
          x: impact.x + Math.cos(a) * inner,
          y: impact.y + Math.sin(a) * inner * 0.83,
        },
        {
          x: impact.x + Math.cos(a - 0.026) * 1100,
          y: impact.y + Math.sin(a - 0.026) * 1100,
        },
        {
          x: impact.x + Math.cos(a + 0.026) * 1100,
          y: impact.y + Math.sin(a + 0.026) * 1100,
        },
      ],
      palette.paper,
    );
  }
  drawSilhouettes(ctx, frame);
  ctx.restore();
}

function drawInverted(ctx: Context, frame: Frame): void {
  ctx.save();
  // 인물만 검게 칠하지 않고 같은 접촉 화면 전체의 명암을 뒤집는다.
  ctx.filter = frame.reducedMotion
    ? 'grayscale(1) invert(1)'
    : 'grayscale(1) contrast(1.9) invert(1)';
  ctx.globalAlpha *= frame.reducedMotion ? 0.35 : 1;
  drawCombat(ctx, frame, contactMs);
  ctx.restore();
}

function drawShatter(ctx: Context, frame: Frame): void {
  const t = sceneTime(frame);
  drawCombat(ctx, frame);
  if (!frame.enhanced || t < contactMs || t > 3000) return;
  const age = (t - contactMs) / 1000;
  if (frame.reducedMotion) {
    ctx.save();
    ctx.globalAlpha *= 1 - smooth(age / 0.6);
    for (let i = 0; i < 11; i++) {
      const a = (i * Math.PI * 2) / 11;
      line(
        ctx,
        [
          impact,
          {
            x: impact.x + Math.cos(a) * 1100,
            y: impact.y + Math.sin(a) * 1100,
          },
        ],
        palette.paper,
        2,
      );
    }
    ctx.restore();
    return;
  }
  const boundary: readonly Point[] = [
    { x: 0, y: 0 },
    { x: 270, y: 0 },
    { x: 570, y: 0 },
    { x: 960, y: 0 },
    { x: 960, y: 230 },
    { x: 960, y: 540 },
    { x: 650, y: 540 },
    { x: 310, y: 540 },
    { x: 0, y: 540 },
    { x: 0, y: 245 },
  ];
  for (let i = 0; i < boundary.length; i++) {
    const a = boundary[i]!;
    const b = boundary[(i + 1) % boundary.length]!;
    const center = {
      x: (a.x + b.x + impact.x) / 3,
      y: (a.y + b.y + impact.y) / 3,
    };
    const p = Math.max(0, age - noise(i) * 0.06);
    const fly = p * p * 1.05 + p * 0.45;
    ctx.save();
    ctx.globalAlpha *= 1 - smooth((age - 0.65) / 0.45);
    ctx.translate(
      center.x + (center.x - impact.x) * fly,
      center.y + (center.y - impact.y) * fly + 130 * p * p,
    );
    ctx.rotate((noise(i + 18) - 0.5) * p * 1.4);
    ctx.translate(-center.x, -center.y);
    ctx.beginPath();
    ctx.moveTo(impact.x, impact.y);
    ctx.lineTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.closePath();
    ctx.clip();
    // 배우의 자세를 회전시키지 않고 접촉 화면 전체가 담긴 합성 조각만 돌린다.
    drawCombat(ctx, frame, contactMs);
    line(ctx, [impact, a, b, impact], palette.paper, 4.5);
    ctx.restore();
  }
}

function hisashiTime(t: number): number {
  if (t < contactMs) return t;
  if (t < 2800) return contactMs + (t - contactMs) * 0.04;
  return contactMs + (2800 - contactMs) * 0.04 + (t - 2800) * 1.35;
}

function drawHisashi(ctx: Context, frame: Frame): void {
  const t = sceneTime(frame);
  const impact = battleImpact(frame);
  drawCombat(ctx, frame, frame.enhanced ? hisashiTime(t) : t);
  if (!frame.enhanced || t < contactMs || t >= 3000) return;
  ctx.save();
  ctx.globalAlpha *=
    windowed(t, contactMs, 2800, 160) * (frame.reducedMotion ? 0.35 : 0.7);
  const p = smooth((t - contactMs) / 1000);
  ring(ctx, impact.x, impact.y, 29 + p * 18, 39 - p * 12, palette.paper, 3);
  for (let i = 0; i < 4; i++)
    line(
      ctx,
      [
        { x: impact.x + 30, y: impact.y - 15 + i * 10 },
        { x: impact.x + 39 + p * 12, y: impact.y - 11 + i * 10 },
      ],
      palette.ink,
      3,
    );
  ctx.restore();
}

function drawCutIn(ctx: Context, frame: Frame): void {
  const t = sceneTime(frame);
  drawCombat(ctx, frame);
  if (!frame.enhanced) return;
  const amount = windowed(t, 780, 1670, 90);
  if (amount <= 0) return;
  ctx.save();
  ctx.globalAlpha *= amount;
  if (!frame.reducedMotion)
    ctx.translate((1 - smooth((t - 780) / 100)) * 140, 0);
  polygon(
    ctx,
    [
      { x: 430, y: 40 },
      { x: 936, y: 40 },
      { x: 855, y: 228 },
      { x: 349, y: 228 },
    ],
    palette.paper,
  );
  ctx.beginPath();
  ctx.moveTo(442, 48);
  ctx.lineTo(925, 48);
  ctx.lineTo(847, 219);
  ctx.lineTo(363, 219);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = '#201326';
  ctx.fillRect(340, 40, 600, 190);
  for (let i = 0; i < 12; i++)
    line(
      ctx,
      [
        { x: 345, y: 60 + i * 16 },
        { x: 940, y: 5 + i * 16 },
      ],
      '#ad5676',
      6,
    );
  drawPortrait(ctx, frame, {
    x: 472,
    y: 48,
    width: 415,
    height: 174,
    crop: 'eyes',
  });
  ctx.restore();
}

function drawPonYori(ctx: Context, frame: Frame): void {
  const t = sceneTime(frame);
  if (!frame.enhanced || t < 1600 || t >= 2650) {
    drawCombat(ctx, frame);
    return;
  }
  ctx.save();
  const scale = frame.reducedMotion ? 1.3 : 2.45;
  frameCamera(ctx, scale, impact, { x: 480, y: 285 });
  drawCombat(ctx, frame);
  ctx.restore();
}

function drawObari(ctx: Context, frame: Frame): void {
  drawPerspectivePunch(ctx, frame);
}

function drawInazuma(ctx: Context, frame: Frame): void {
  const t = sceneTime(frame);
  drawBattle(ctx, frame, { action: 'kick' });
  if (!frame.enhanced) return;
  const amount = windowed(t, 1430, 1980, 160);
  ctx.save();
  ctx.globalAlpha *= amount * (frame.reducedMotion ? 0.28 : 0.88);
  polygon(
    ctx,
    [
      { x: impact.x - 204, y: impact.y - 253 },
      { x: impact.x - 38, y: impact.y - 45 },
      { x: impact.x - 79, y: impact.y - 54 },
      { x: impact.x + 26, y: impact.y + 38 },
      { x: impact.x - 154, y: impact.y - 94 },
      { x: impact.x - 97, y: impact.y - 92 },
    ],
    palette.blue,
  );
  if (!frame.reducedMotion)
    line(
      ctx,
      [
        { x: impact.x - 204, y: impact.y - 253 },
        { x: impact.x - 38, y: impact.y - 45 },
        { x: impact.x - 79, y: impact.y - 54 },
        { x: impact.x + 26, y: impact.y + 38 },
      ],
      palette.paper,
      4,
    );
  ctx.restore();
  if (t >= contactMs && t < 2180) {
    ctx.save();
    ctx.globalAlpha *= frame.reducedMotion ? 0.25 : 1;
    burst(ctx, impact.x, impact.y, (t - contactMs) / 380, palette.paper, 11);
    ctx.restore();
  }
}

function drawKurumada(ctx: Context, frame: Frame): void {
  drawHeadFirstFall(ctx, frame);
}

export function drawImpact(ctx: Context, id: string, frame: Frame): void {
  const t = sceneTime(frame);
  ctx.save();
  try {
    switch (id) {
      case 'impact-frame':
        drawCombat(ctx, frame);
        if (frame.enhanced && t >= contactMs && t < contactMs + 1000 / 12)
          drawAbstractImpact(ctx, frame);
        label(
          ctx,
          frame.enhanced
            ? '실제 원본 윤곽 + 접촉의 2코마 추상 충격 컷'
            : '실제 어퍼컷과 곰왕 피격',
        );
        break;
      case 'shock-koma':
        drawShockKoma(ctx, frame);
        break;
      case 'shock-koma-v2':
        drawShockKomaV2(ctx, frame);
        break;
      case 'beta-flash':
        drawCombat(ctx, frame);
        if (frame.enhanced) drawBeta(ctx, frame);
        label(
          ctx,
          frame.enhanced
            ? '검은 주변부 / 흰 타점 공간 / 실제 배우 윤곽'
            : '같은 실제 공격과 피격',
        );
        break;
      case 'monochrome-invert':
        drawCombat(ctx, frame);
        if (frame.enhanced && t >= contactMs && t < contactMs + 1000 / 12)
          drawInverted(ctx, frame);
        label(
          ctx,
          frame.enhanced
            ? '같은 접촉 화면 전체의 명암을 2코마 반전'
            : '같은 실제 공격과 피격',
        );
        break;
      case 'screen-shatter':
        drawShatter(ctx, frame);
        label(ctx, '아타호·곰왕 접촉 화면의 합성 조각');
        break;
      case 'hisashi-punch':
        drawHisashi(ctx, frame);
        label(
          ctx,
          frame.enhanced
            ? '같은 접촉·피격 프레임을 길게 붙잡음'
            : '같은 실제 일격의 정상 재생',
        );
        break;
      case 'action-cutin':
        drawCutIn(ctx, frame);
        label(
          ctx,
          frame.enhanced
            ? '실제 얼굴의 눈 크롭을 별도 패널에 삽입'
            : '어퍼컷 와이드 유지',
        );
        break;
      case 'pon-yori':
        drawPonYori(ctx, frame);
        label(
          ctx,
          frame.enhanced
            ? '와이드 → 타점 근접 컷 → 와이드'
            : '같은 실제 일격의 와이드',
        );
        break;
      case 'obari-punch':
        drawObari(ctx, frame);
        label(
          ctx,
          frame.enhanced
            ? '전경 정권 원화 시안 · 왼쪽 반동과 늦은 정착'
            : '보유 정권 기본 동작',
        );
        break;
      case 'inazuma-kick':
        drawInazuma(ctx, frame);
        label(
          ctx,
          frame.enhanced
            ? '기존 A/B 사선 날아차기 + 낙하 방향 번개'
            : '같은 기존 A/B 날아차기',
        );
        break;
      case 'kurumada-fall':
        drawKurumada(ctx, frame);
        label(
          ctx,
          frame.enhanced
            ? '낙하 원화 시안 · 큰 낙차 → 막판 가속 → 착지'
            : '같은 어퍼컷의 기본 피격',
        );
        break;
      default:
        drawCombat(ctx, frame);
    }
  } finally {
    ctx.restore();
  }
}
