import type { ComboSnapshot } from './player.js';
import { frameKey, type SourceFrame } from './source-frames.js';

import { drawMotionEffects } from './effects-drawing.js';
import { drawPoseWithParts } from './parts-drawing.js';
import {
  drawPose,
  posePosition,
  stageWidth,
  stageHeight,
  groundY,
  type PoseDrawingOptions,
} from './pose-drawing.js';
export { stageWidth, stageHeight } from './pose-drawing.js';

export type DrawingOptions = PoseDrawingOptions & {
  readonly showContacts: boolean;
  readonly enabledEffects: ReadonlySet<string>;
};

function drawDojo(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#efdfbf';
  ctx.fillRect(0, 0, stageWidth, stageHeight);
  ctx.fillStyle = '#e6cfa7';
  ctx.fillRect(0, 42, stageWidth, groundY - 42);
  ctx.fillStyle = '#7c5844';
  for (const x of [42, 435, 830]) ctx.fillRect(x, 0, 13, groundY);
  ctx.fillRect(0, 25, stageWidth, 14);
  ctx.fillStyle = '#f7eacb';
  ctx.fillRect(96, 68, 295, 131);
  ctx.fillRect(487, 68, 295, 131);
  ctx.strokeStyle = '#d5b98b';
  ctx.lineWidth = 3;
  for (const x of [170, 245, 320, 560, 635, 710]) {
    ctx.beginPath();
    ctx.moveTo(x, 68);
    ctx.lineTo(x, 199);
    ctx.stroke();
  }
  ctx.fillStyle = '#b88961';
  ctx.fillRect(0, groundY, stageWidth, stageHeight - groundY);
  ctx.strokeStyle = '#946e50';
  ctx.lineWidth = 2;
  for (const y of [groundY + 2, 352, 383]) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(stageWidth, y);
    ctx.stroke();
  }
}

function drawContact(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  elapsed: number,
): void {
  const progress = Math.min(1, elapsed / 140);
  ctx.save();
  ctx.globalAlpha *= 1 - progress;
  ctx.translate(x, y);
  ctx.strokeStyle = '#fff7d5';
  ctx.lineWidth = 4;
  const radius = 16 + progress * 35;
  for (let i = 0; i < 7; i++) {
    const angle = (i * Math.PI * 2) / 7;
    ctx.beginPath();
    ctx.moveTo(
      Math.cos(angle) * radius * 0.35,
      Math.sin(angle) * radius * 0.35,
    );
    ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawCombo(
  ctx: CanvasRenderingContext2D,
  snapshot: ComboSnapshot,
  frames: ReadonlyMap<string, SourceFrame>,
  options: DrawingOptions,
): void {
  drawDojo(ctx);
  const replacement = options.showMovement
    ? (snapshot.motion.effects ?? [])
        .filter(
          (effect) =>
            effect.kind === 'pose' && options.enabledEffects.has(effect.id),
        )
        .flatMap((effect) =>
          effect.kind === 'pose' ? effect.replacements : [],
        )
        .find(
          (item) =>
            item.motion === snapshot.step.motion &&
            item.frame === snapshot.step.frame,
        )
    : undefined;
  const pose = replacement
    ? { ...snapshot, step: { ...snapshot.step, ...replacement.replacement } }
    : snapshot;
  const source = frames.get(frameKey(pose.step));
  if (!source) return;
  const scale = options.scale;
  const moving = options.showMovement;
  const { x, y } = posePosition(pose, source, options);
  ctx.save();
  ctx.globalAlpha = snapshot.opacity;
  const airborne = moving ? Math.max(0, -snapshot.y) : 0;
  ctx.fillStyle = '#59413230';
  ctx.beginPath();
  ctx.ellipse(
    x,
    groundY + 3,
    Math.max(16, 34 - airborne * 0.4),
    7,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  drawMotionEffects(ctx, snapshot, frames, { ...options, layer: 'back' });
  if (replacement) drawPose(ctx, pose, source, options);
  else drawPoseWithParts(ctx, snapshot, source, options);
  drawMotionEffects(ctx, snapshot, frames, { ...options, layer: 'front' });
  if (
    options.showMovement &&
    options.showContacts &&
    snapshot.step.contact &&
    !snapshot.waiting
  ) {
    drawContact(
      ctx,
      x +
        (snapshot.step.contact.reach ??
          (snapshot.step.contact.kind === 'sweep' ? 35 : 26)) *
          scale,
      (snapshot.step.contact.heightReference === 'body' ? y : groundY) -
        snapshot.step.contact.height * scale,
      snapshot.stepElapsedMs,
    );
  }
  ctx.restore();
  ctx.fillStyle = '#614630';
  ctx.font = '15px sans-serif';
  ctx.fillText(
    snapshot.waiting ? '한 동작 완료' : snapshot.step.phase,
    28,
    391,
  );
}
