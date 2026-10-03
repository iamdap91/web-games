import manifest from '../../resources/manifest.json' with { type: 'json' };

const sceneWidth = 960;
const sceneHeight = 480;
const groundY = 365;
// 원본 재생 시간 확인 전 미리보기에만 사용하는 임시 값이다.
const frameDuration = 0.14;
const motionNames: Record<string, string> = {
  stand: '대기',
  move: '이동',
  jump: '점프',
  attack1: '공격',
  hit1: '피격',
  die1: '사망',
};
type Frame = {
  width: number;
  height: number;
  pivot: { x: number; y: number };
  localPath: string;
  durationSeconds?: number;
};
type Animation = { frames: Frame[] };
type Actor = {
  name: string;
  scale: number;
  animations: Map<string, Animation>;
  motion: string;
  elapsed: number;
  output: HTMLOutputElement;
};

function getElement<T extends HTMLElement>(id: string, type: { new (): T }): T {
  const element = document.getElementById(id);
  if (!(element instanceof type))
    throw new Error(`화면 요소를 찾을 수 없습니다: ${id}`);
  return element;
}

const canvas = getElement('scene', HTMLCanvasElement);
const status = getElement('status', HTMLParagraphElement);
const toggle = getElement('toggle', HTMLButtonElement);
const context = canvas.getContext('2d');
if (!context) throw new Error('Canvas 2D를 사용할 수 없습니다.');
const ctx = context;
const images = new Map<string, HTMLImageElement>();
let actor: Actor | undefined;
let paused = false;
let previousTime = 0;

function createActor(id: string, scale: number): Actor {
  const asset = manifest.assets.find((entry) => entry.id === id);
  if (!asset) throw new Error(`리소스 목록에 ${id}가 없습니다.`);
  const select = getElement('motion', HTMLSelectElement);
  const animations = new Map<string, Animation>();
  for (const [name, animation] of Object.entries(asset.animations)) {
    if (!animation || animation.frames.length === 0) continue;
    animations.set(name, animation);
    select.add(new Option(motionNames[name] ?? name, name));
  }
  select.value = 'stand';
  const actor: Actor = {
    name: asset.name,
    scale,
    animations,
    motion: 'stand',
    elapsed: 0,
    output: getElement('frame', HTMLOutputElement),
  };
  select.addEventListener('change', () => {
    actor.motion = select.value;
    actor.elapsed = 0;
    draw();
  });
  return actor;
}

async function loadImage(frame: Frame): Promise<void> {
  if (images.has(frame.localPath)) return;
  const image = new Image();
  image.src = `/${frame.localPath}`;
  try {
    await image.decode();
  } catch {
    throw new Error(`로컬 이미지가 없습니다: ${frame.localPath}`);
  }
  images.set(frame.localPath, image);
}

function resizeCanvas(): void {
  const bounds = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(bounds.width * ratio);
  canvas.height = Math.round(bounds.height * ratio);
  // 월드 좌표를 backing store에 직접 매핑해 CSS 크기와 DPR을 함께 반영한다.
  ctx.setTransform(
    canvas.width / sceneWidth,
    0,
    0,
    canvas.height / sceneHeight,
    0,
    0,
  );
  ctx.imageSmoothingEnabled = false;
  draw();
}

function drawLandscape(): void {
  ctx.fillStyle = '#e5efde';
  ctx.fillRect(0, 0, sceneWidth, sceneHeight);
  ctx.fillStyle = '#f7f5ce';
  ctx.beginPath();
  ctx.arc(757, 91, 39, 0, Math.PI * 2);
  ctx.fill();
  for (const [x, y, radius] of [
    [80, 370, 220],
    [355, 385, 185],
    [700, 380, 210],
    [995, 385, 190],
  ]) {
    if (x === undefined || y === undefined || radius === undefined) continue;
    ctx.fillStyle = '#cbdcc1';
    ctx.beginPath();
    ctx.arc(x, y, radius, Math.PI, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#93b18b';
  ctx.fillRect(0, groundY, sceneWidth, 12);
  ctx.fillStyle = '#d2c8a9';
  ctx.fillRect(0, groundY + 12, sceneWidth, sceneHeight - groundY);
  ctx.fillStyle = '#b6aa89';
  for (let x = 15; x < sceneWidth; x += 37)
    ctx.fillRect(x, 397 + (x % 3) * 12, 5, 3);
}

function drawActor(actor: Actor): void {
  const animation = actor.animations.get(actor.motion);
  if (!animation) return;
  const durations = animation.frames.map(
    (frame) => frame.durationSeconds ?? frameDuration,
  );
  const total = durations.reduce((sum, duration) => sum + duration, 0);
  let remaining = actor.elapsed % total;
  let index = 0;
  while (index < durations.length - 1 && remaining >= durations[index]!) {
    remaining -= durations[index]!;
    index += 1;
  }
  const frame = animation.frames[index];
  if (!frame) return;
  const image = images.get(frame.localPath);
  if (!image) return;
  const scale = actor.scale;
  const x = sceneWidth / 2;
  ctx.fillStyle = '#254b3822';
  ctx.beginPath();
  ctx.ellipse(x, groundY, 47, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // MSW 기준점은 이미지 왼쪽 아래를 기준으로 제공되므로 Canvas 상단 좌표로 변환한다.
  ctx.drawImage(
    image,
    x - frame.pivot.x * scale,
    groundY - (frame.height - frame.pivot.y) * scale,
    frame.width * scale,
    frame.height * scale,
  );
  ctx.fillStyle = '#35513d';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(actor.name, x, groundY + 67);
  const label = `${index + 1} / ${animation.frames.length} 프레임`;
  if (actor.output.value !== label) actor.output.value = label;
}

function draw(): void {
  drawLandscape();
  if (actor) drawActor(actor);
}

function animate(time: number): void {
  const delta =
    previousTime === 0 ? 0 : Math.min((time - previousTime) / 1000, 0.1);
  previousTime = time;
  if (!paused && !document.hidden) {
    if (actor) actor.elapsed += delta;
    draw();
  }
  requestAnimationFrame(animate);
}

async function start(id: string, scale: number): Promise<void> {
  actor = createActor(id, scale);
  resizeCanvas();
  const frames = [...actor.animations.values()].flatMap(
    (animation) => animation.frames,
  );
  const uniqueFrames = [
    ...new Map(frames.map((frame) => [frame.localPath, frame])).values(),
  ];
  await Promise.all(uniqueFrames.map(loadImage));
  document.querySelectorAll('select').forEach((select) => {
    select.disabled = false;
  });
  toggle.disabled = false;
  status.textContent = `로컬 이미지 ${images.size}개 준비 완료 · 모션을 선택해보세요`;
  toggle.addEventListener('click', () => {
    paused = !paused;
    toggle.textContent = paused ? '재생' : '일시정지';
  });
  new ResizeObserver(resizeCanvas).observe(canvas);
  window.addEventListener('resize', resizeCanvas);
  requestAnimationFrame(animate);
}

export function startPreview(id: string, scale: number): void {
  start(id, scale).catch((error: unknown) => {
    status.textContent =
      error instanceof Error ? error.message : '리소스를 불러오지 못했습니다.';
    status.setAttribute('role', 'alert');
  });
}
