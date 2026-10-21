import {
  ellipse,
  label,
  line,
  noise,
  palette,
  polygon,
  smooth,
  star,
} from './drawing.js';
import {
  battleLayout,
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
import { drawShockKomaVariant } from './shock-koma-variants.js';
import { shockKomaSample } from './shock-koma-selection.js';

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
  shockKomaSample(),
  {
    id: 'beta-flash',
    name: '베타 플래시',
    category: 'impact',
    previewMs: 1820,
    description:
      '접촉 순간 3코마 동안 검은 주변부와 흰 초점 여백을 즉시 교체해 실제 두 배우의 윤곽을 남깁니다.',
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
    previewMs: 2100,
    beats: [
      { timeMs: 1680, label: '장전 끝 · 짧은 신전' },
      { timeMs: 1800, label: '정권 접촉' },
      { timeMs: 2100, label: '접촉만 느리게 진행' },
      { timeMs: 2360, label: '정상 회수로 방출' },
    ],
    description:
      '장전 뒤 정권을 빠르게 뻗고 접촉 구간만 560ms로 늘린 뒤 빠르게 회수합니다.',
    distinction:
      '배우와 상대가 같은 시계로 느려집니다. 충격 링·잔상·흔들림 없이 기존 원화의 시간 대비만 사용합니다.',
  },
  {
    id: 'action-cutin',
    name: '컷인',
    category: 'impact',
    previewMs: 1250,
    beats: [
      { timeMs: 1040, label: '공격 위에 얼굴 패널 삽입' },
      { timeMs: 1250, label: '눈과 공격을 함께 읽기' },
      { timeMs: 1600, label: '패널 제거 · 타격 공간 확보' },
    ],
    description:
      '장전 중 얼굴 패널을 즉시 삽입하고 신전 전에 걷어, 눈과 이어지는 일격의 대비를 만듭니다.',
    distinction: '행동을 남긴 채 같은 실제 인물의 눈 크롭을 함께 보여줍니다.',
  },
  {
    id: 'pon-yori',
    name: '퐁요리',
    category: 'impact',
    previewMs: 1840,
    beats: [
      { timeMs: 1700, label: '접촉 전 · 와이드' },
      { timeMs: 1760, label: '신전 · 즉시 근접 컷' },
      { timeMs: 1840, label: '같은 타점의 피격' },
      { timeMs: 2250, label: '즉시 와이드 복귀' },
    ],
    description:
      '접촉 직전 와이드에서 타점 근접으로 즉시 바꾸고, 피격을 읽은 뒤 와이드로 돌아옵니다.',
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
      '별도 충격광 없이 전용 큰 주먹 원화로 원근을 드러냅니다. 기존 정권과 보유 원화 시안을 비교하며 사용자 GIF 품질 검토는 대기 상태입니다.',
  },
  {
    id: 'inazuma-kick',
    name: '이나즈마 킥',
    category: 'impact',
    previewMs: 1800,
    beats: [
      { timeMs: 1540, label: 'A · 무릎 모아 장전' },
      { timeMs: 1720, label: 'B · 짧은 사선 신전 시작' },
      { timeMs: 1800, label: '발바닥 접촉' },
      { timeMs: 2260, label: '같은 다리를 접어 착지' },
    ],
    description:
      '기존 A 장전은 읽히게 남기고 B 사선 신전은 80ms로 압축해 발이 먼저 닿는 일격을 보여 줍니다.',
    distinction:
      '발의 궤도와 신전 원화로 낙하를 읽게 합니다. 별도 번개·충격광을 더하지 않고 원본 비율을 유지합니다.',
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
      { timeMs: headFirstFallTiming.settledMs, label: '착지 종결 구도' },
    ],
    description:
      '어퍼컷 뒤 240px 낙차와 막판 하강 가속을 보여 줍니다. 머리·어깨가 눌리는 착지 원화로 힘을 받고 끝냅니다.',
    distinction:
      '보유한 낙하·머리 착지 두 자세를 재사용하고 먼지·충격광은 더하지 않습니다. PNG 회전 없이 원본 비율을 지키며 작화 품질은 사용자 GIF 검토 대기입니다.',
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
  const age = sceneTime(frame) - contactMs;
  if (age < 0 || age >= 1000 / 8) return;
  const amount = 1;
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

/** 장전을 읽힌 뒤 신전을 압축하고, 두 배우의 접촉 시간만 함께 늘린다. */
function hisashiTime(t: number): number {
  if (t < 1300) return t;
  if (t < 1680) return 1300 + ((t - 1300) / 380) * 200;
  if (t < contactMs) return 1500 + ((t - 1680) / 120) * 300;
  if (t < 2360) return contactMs + (t - contactMs) * 0.16;
  return contactMs + 560 * 0.16 + (t - 2360) * 1.8;
}

function drawHisashi(ctx: Context, frame: Frame): void {
  const t = sceneTime(frame);
  drawCombat(ctx, frame, frame.enhanced ? hisashiTime(t) : t);
}

function drawCutIn(ctx: Context, frame: Frame): void {
  const t = sceneTime(frame);
  drawCombat(ctx, frame);
  if (!frame.enhanced) return;
  const amount = t >= 1040 && t < 1600 ? 1 : 0;
  if (amount <= 0) return;
  ctx.save();
  ctx.globalAlpha *= amount;
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
  if (!frame.enhanced || t < 1760 || t >= 2250) {
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
  // 비교판은 같은 원본 킥의 균등 노출, 연출판은 A 장전과 B 신전의 시간 대비다.
  const t = sceneTime(frame);
  let timeMs = t;
  if (frame.enhanced && t >= 1000) {
    if (t < 1540) timeMs = 1000 + ((t - 1000) / 540) * 680;
    else if (t < 1720) timeMs = 1680;
    else if (t < contactMs) timeMs = 1680 + ((t - 1720) / 80) * 120;
    else if (t < 1900) timeMs = contactMs + (t - contactMs) * 1.6;
    else timeMs = 1960 + (t - 1900) * 1.8;
  }
  drawBattle(ctx, frame, { action: 'kick', timeMs });
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
        if (!frame.shockVariant || frame.shockVariant === 'ink')
          drawShockKoma(ctx, frame);
        else if (frame.shockVariant === 'embers') drawShockKomaV2(ctx, frame);
        else drawShockKomaVariant(ctx, frame, frame.shockVariant);
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
            ? '짧은 신전 → 느린 접촉 560ms → 빠른 회수'
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
            ? 'A/B 장전 → 사선 신전 → 발 접촉 · 별도 번개 없음'
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
