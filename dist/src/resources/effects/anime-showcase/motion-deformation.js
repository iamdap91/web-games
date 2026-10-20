import { battleLayout, drawAtaho, sampleAtahoSprite } from './battle.js';
import { clamp, smooth } from './drawing.js';
function alignSprite(sprite) {
    return {
        ...sprite,
        left: Math.round(sprite.left),
        top: Math.round(sprite.top),
    };
}
/** 같은 원본의 픽셀 행을 다시 배치하며 별도 몸 그림이나 누적 프레임을 만들지 않는다. */
function drawRows(ctx, sprite, geometry) {
    const sourceHeight = sprite.image.naturalHeight;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let y = 0; y < sourceHeight; y++) {
        const row = geometry(y);
        const next = geometry(y + 1);
        ctx.drawImage(sprite.image, 0, y, sprite.image.naturalWidth, 1, row.x, row.y, row.width, Math.max(0.2, next.y - row.y) + 0.35);
    }
    ctx.restore();
}
export function drawAtahoBreakdown(ctx, frame, options) {
    const strength = clamp(options.strength) * (frame.reducedMotion ? 0.3 : 1);
    if (strength <= 0) {
        drawAtaho(ctx, frame, { action: 'uppercut' });
        return;
    }
    const sprite = alignSprite(sampleAtahoSprite(frame, { action: 'uppercut' }));
    const pixelX = sprite.width / sprite.image.naturalWidth;
    const pixelY = sprite.height / sprite.image.naturalHeight;
    drawRows(ctx, sprite, (y) => {
        const upper = 1 - smooth((y - 35) / 35);
        const phase = ((y - 24) / 48) * Math.PI * 2;
        const smear = options.kind === 'smear';
        const widthFactor = smear
            ? 1 + upper * strength * 0.2
            : 1 + Math.sin(phase) * upper * strength * 0.23;
        const offsetX = smear
            ? upper * strength * 8 * pixelX
            : Math.sin(phase + 0.4) * upper * strength * 16 * pixelX;
        const offsetY = smear
            ? -upper * strength * 27 * pixelY
            : -(y - 60) * upper * strength * 0.26 * pixelY;
        return {
            x: sprite.left + offsetX - (sprite.width * (widthFactor - 1)) / 2,
            y: sprite.top + y * pixelY + offsetY,
            width: sprite.width * widthFactor,
        };
    });
}
// 어퍼컷 1번 원본의 머리 위 털, 꼬리 끝 털, 오른쪽 옷 가장자리다. 얼굴은 제외한다.
const flutterPatches = [
    {
        x: 33,
        y: 27,
        width: 8,
        height: 7,
        root: 'bottom',
        amplitude: 5.4,
        delay: 0,
    },
    {
        x: 64,
        y: 44,
        width: 7,
        height: 12,
        // 꼬리는 몸에 붙는 왼쪽을 고정하고 바깥 끝만 위아래로 나부끼게 한다.
        root: 'left',
        amplitude: 3.2,
        delay: 0.7,
    },
    {
        x: 56,
        y: 60,
        width: 7,
        height: 8,
        root: 'left',
        amplitude: 3.9,
        delay: 1.3,
    },
];
function drawFlutterPatch(ctx, sprite, patch, phase, strength) {
    const sx = sprite.width / sprite.image.naturalWidth;
    const sy = sprite.height / sprite.image.naturalHeight;
    const horizontal = patch.root === 'bottom';
    const count = horizontal ? patch.height : patch.width;
    for (let i = 0; i < count; i++) {
        const tip = horizontal ? 1 - i / count : i / count;
        const flutter = (Math.sin(phase - patch.delay - tip * 1.1) +
            Math.sin(phase * 2 - patch.delay - tip * 2) * 0.18) *
            tip *
            tip *
            patch.amplitude *
            strength;
        const x = patch.x + (horizontal ? 0 : i);
        const y = patch.y + (horizontal ? i : 0);
        ctx.drawImage(sprite.image, x, y, horizontal ? patch.width : 1, horizontal ? 1 : patch.height, sprite.left + x * sx + (horizontal ? flutter * sx : 0), sprite.top + y * sy + (horizontal ? 0 : flutter * sy), (horizontal ? patch.width : 1) * sx + (horizontal ? 0 : 0.35), (horizontal ? 1 : patch.height) * sy + (horizontal ? 0.35 : 0));
    }
}
export function drawAtahoFlutter(ctx, frame, options) {
    const strength = options.strength * (frame.reducedMotion ? 0.3 : 1);
    if (strength <= 0) {
        drawAtaho(ctx, frame, {
            timeMs: options.timeMs,
            x: options.x,
            action: 'uppercut',
        });
        return;
    }
    const sprite = alignSprite(sampleAtahoSprite(frame, {
        timeMs: options.timeMs,
        x: options.x,
        action: 'uppercut',
    }));
    const sx = sprite.width / sprite.image.naturalWidth;
    const sy = sprite.height / sprite.image.naturalHeight;
    ctx.save();
    ctx.beginPath();
    ctx.rect(sprite.left, sprite.top, sprite.width, sprite.height);
    for (const patch of flutterPatches)
        ctx.rect(sprite.left + patch.x * sx, sprite.top + patch.y * sy, patch.width * sx, patch.height * sy);
    ctx.clip('evenodd');
    drawAtaho(ctx, frame, {
        timeMs: options.timeMs,
        x: options.x,
        action: 'uppercut',
    });
    ctx.restore();
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const phase = ((frame.timeMs - 650) / (frame.reducedMotion ? 680 : 360)) * Math.PI * 2;
    for (const patch of flutterPatches)
        drawFlutterPatch(ctx, sprite, patch, phase, strength);
    ctx.restore();
}
/** 기존 B 그림을 발 쪽이 가깝고 몸통 쪽이 먼 평면으로 투영한다. 새 관절 방향은 만들지 않는다. */
export function drawAtahoPerspective(ctx, frame) {
    const sprite = alignSprite(sampleAtahoSprite(frame, { action: 'kick' }));
    const contact = frame.assets.kick.steps.find((step) => step.contact);
    const source = contact
        ? frame.assets.frames.get(`${contact.motion}:${contact.frame}`)
        : undefined;
    if (source?.image !== sprite.image) {
        drawAtaho(ctx, frame, { action: 'kick' });
        return;
    }
    const strength = frame.reducedMotion ? 0.3 : 1;
    const sw = sprite.image.naturalWidth;
    const sh = sprite.image.naturalHeight;
    const focus = battleLayout.impact;
    const depth = (x) => (1 + strength * 1.3) / (1 + strength * 2.6 * (1 - x / sw));
    const projectedX = (x) => focus.x + (sprite.left + (x / sw) * sprite.width - focus.x) * depth(x);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let x = 0; x < sw; x++) {
        const scale = depth(x + 0.5);
        ctx.drawImage(sprite.image, x, 0, 1, sh, projectedX(x), focus.y + (sprite.top - focus.y) * scale, Math.max(0.2, projectedX(x + 1) - projectedX(x)) + 0.35, sprite.height * scale);
    }
    ctx.restore();
}
