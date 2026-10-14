import { samplePunch, type PunchSnapshot } from './punch-model.js';

export const punchFrames = [
  {
    x: 0,
    y: 0,
    headTop: 35,
    headShift: 0,
    leftFoot: 186,
    rightFoot: 311.5,
    baseline: 505,
  },
  {
    x: 384,
    y: 0,
    headTop: 34,
    headShift: 33.5,
    leftFoot: 163,
    rightFoot: 298.5,
    baseline: 505,
  },
  {
    x: 768,
    y: 0,
    headTop: 45,
    headShift: 12,
    leftFoot: 154.5,
    rightFoot: 298.5,
    baseline: 505,
  },
  {
    x: 1152,
    y: 0,
    headTop: 46,
    headShift: 9,
    leftFoot: 139,
    rightFoot: 296,
    baseline: 505,
  },
  {
    x: 0,
    y: 512,
    headTop: 30,
    headShift: -14,
    leftFoot: 172.5,
    rightFoot: 316.5,
    baseline: 490,
  },
  {
    x: 384,
    y: 512,
    headTop: 30,
    headShift: -15,
    leftFoot: 177.5,
    rightFoot: 315.5,
    baseline: 490,
  },
  {
    x: 768,
    y: 512,
    headTop: 28,
    headShift: 10,
    leftFoot: 173,
    rightFoot: 303,
    baseline: 490,
  },
  {
    x: 1152,
    y: 512,
    headTop: 25,
    headShift: 12,
    leftFoot: 175,
    rightFoot: 302,
    baseline: 490,
  },
] as const;

/** 머리 위치는 유지하고 다리 쪽으로 갈수록 두 발 기준에 맞춰 변형한다. */
export function mapPunchPoint(
  index: number,
  point: { readonly x: number; readonly y: number },
  motion: { readonly lean: number; readonly breathing: number },
): { x: number; y: number } {
  const frame = punchFrames[index]!;
  const base = punchFrames[0];
  const progress = Math.max(
    0,
    Math.min(1, (point.y - 210) / (frame.baseline - 210)),
  );
  const weight = progress * progress * (3 - 2 * progress);
  const footScale =
    (base.rightFoot - base.leftFoot) / (frame.rightFoot - frame.leftFoot);
  const footShift = base.leftFoot - frame.leftFoot * footScale;
  const horizontal = 1 + (footScale - 1) * weight;
  const shift = frame.headShift * (1 - weight) + footShift * weight;
  const vertical =
    (base.baseline - base.headTop) / (frame.baseline - frame.headTop);
  const y = base.headTop + (point.y - frame.headTop) * vertical;
  return {
    x: point.x * horizontal + shift + motion.lean * (1 - weight),
    y: y + (y - base.baseline) * motion.breathing,
  };
}

type DrawingOptions = {
  readonly mode: 'raw' | 'connected';
  readonly height: number;
  readonly background: 'light' | 'dark';
  readonly guides: boolean;
};

/** PNG는 변경하지 않고 표시 영역·상체 변형만 적용한다. */
export function drawPunch(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  snapshot: PunchSnapshot,
  options: DrawingOptions,
): void {
  const { mode, background, height } = options;
  const width = 480;
  const stageHeight = 350;
  const baseline = 302;
  const scale = height / 474;
  const originX = 212 - 245 * scale;
  const originY = baseline - 504 * scale;
  const pose = samplePunch(snapshot);
  const dark = background === 'dark';
  context.fillStyle = dark ? '#18221f' : '#f2eadc';
  context.fillRect(0, 0, width, stageHeight);
  context.fillStyle = dark ? '#22322b' : '#e4d9c5';
  context.fillRect(0, baseline + 4, width, stageHeight - baseline);
  context.strokeStyle = dark ? '#53624f' : '#c4b698';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(20, baseline + 4);
  context.lineTo(width - 20, baseline + 4);
  context.stroke();

  context.save();
  context.translate(originX, originY);
  context.scale(scale, scale);
  context.fillStyle = dark ? '#0b151580' : '#7c674c35';
  context.beginPath();
  context.ellipse(242, 504, 115, 11, 0, 0, Math.PI * 2);
  context.fill();
  if (mode === 'raw') {
    drawSheetPose(context, image, pose.rawFrame);
  } else {
    drawConnectedPose(context, image, pose.frame, pose);
  }
  context.restore();

  if (options.guides) {
    context.strokeStyle = dark ? '#e7bf79' : '#a26a23';
    context.setLineDash([4, 4]);
    for (const x of [186, 311.5]) {
      const screenX = originX + x * scale;
      context.beginPath();
      context.moveTo(screenX, baseline - 17);
      context.lineTo(screenX, baseline + 12);
      context.stroke();
    }
    context.setLineDash([]);
    context.fillStyle = dark ? '#e7bf79' : '#926726';
    context.font = '12px sans-serif';
    context.fillText('발 기준', 24, baseline - 12);
  }
}

export function drawPoseThumbnail(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  index: number,
): void {
  context.clearRect(0, 0, 96, 128);
  context.save();
  context.scale(0.23, 0.23);
  drawSheetPose(context, image, index);
  context.restore();
}

function sourceStrip(
  index: number,
  y: number,
): { left: number; width: number } {
  if (index === 5 && y < 340) return { left: 32, width: 352 };
  if (index === 2) return { left: 0, width: 372 };
  return { left: 0, width: index === 4 && y < 340 ? 416 : 384 };
}

function drawSheetPose(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  index: number,
): void {
  const frame = punchFrames[index]!;
  // 칸을 넘은 주먹은 보존하고 인접 칸에서 들어온 꼬리·주먹만 표시에서 제외한다.
  for (const [y, height] of [
    [0, 340],
    [340, 172],
  ] as const) {
    const strip = sourceStrip(index, y);
    context.drawImage(
      image,
      frame.x + strip.left,
      frame.y + y,
      strip.width,
      height,
      strip.left,
      y,
      strip.width,
      height,
    );
  }
}

function drawConnectedPose(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  index: number,
  motion: { readonly lean: number; readonly breathing: number },
): void {
  const frame = punchFrames[index]!;
  // 같은 전신 그림을 연속 띠로 변형해 다른 그림을 붙일 때 생기는 절단선을 피한다.
  for (let y = 0; y < 512; y += 4) {
    const strip = sourceStrip(index, y);
    const start = mapPunchPoint(index, { x: strip.left, y }, motion);
    const end = mapPunchPoint(
      index,
      { x: strip.left + strip.width, y },
      motion,
    );
    const bottom = mapPunchPoint(index, { x: strip.left, y: y + 4 }, motion);
    context.drawImage(
      image,
      frame.x + strip.left,
      frame.y + y,
      strip.width,
      4,
      start.x,
      start.y,
      end.x - start.x,
      bottom.y - start.y + 0.1,
    );
  }
}
