import type { AnimationFrame } from './animation-player.js';

export const sceneWidth = 960;
export const sceneHeight = 480;
const groundY = 365;

export function drawLandscape(ctx: CanvasRenderingContext2D): void {
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

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  frame: AnimationFrame,
  image: HTMLImageElement,
  name: string,
  scale: number,
): void {
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
  ctx.fillText(name, x, groundY + 67);
}
