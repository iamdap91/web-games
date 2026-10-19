import { comboDuration, sampleComboMotion, } from '../../characters/ataho-v2-combos/player.js';
import { frameKey } from '../../characters/ataho-v2-combos/source-frames.js';
import { clamp, ellipse, smooth, stage } from './drawing.js';
export const battleLayout = {
    contactMs: 1800,
    impact: { x: 584, y: 246 },
    attacker: { x: 548, ground: 440, scale: 3.5 },
    target: { x: 650, ground: 440, scale: 2.7 },
};
function actionFor(frame, action) {
    return action ?? (frame.sampleId === 'inazuma-kick' ? 'kick' : 'uppercut');
}
/** 원본 준비·접촉·회수를 공유하고 접촉 한 번을 1800ms에 배치한다. */
function motionTime(motion, timeMs) {
    const index = motion.steps.findIndex((s) => s.contact);
    const contact = motion.steps[index];
    const before = motion.steps
        .slice(0, index)
        .reduce((sum, s) => sum + s.durationMs, 0);
    if (timeMs < 1000)
        return 0;
    if (timeMs < 1800)
        return clamp((timeMs - 1000) / 800) * before;
    if (timeMs < 1960)
        return before + clamp((timeMs - 1800) / 160) * contact.durationMs;
    return (before +
        contact.durationMs +
        clamp((timeMs - 1960) / 840) *
            (comboDuration(motion) - before - contact.durationMs));
}
export function atahoPosition(frame, options = {}) {
    const t = options.timeMs ?? frame.timeMs, action = actionFor(frame, options.action), motion = frame.assets[action];
    const pose = sampleComboMotion(motion, motionTime(motion, t)), contact = motion.steps.find((s) => s.contact);
    const scale = options.scale ?? battleLayout.attacker.scale;
    const approach = action === 'uppercut'
        ? smooth((t - 650) / 650) * 208 * (1 - smooth((t - 2850) / 650))
        : 0;
    const root = action === 'uppercut'
        ? battleLayout.attacker.x - 208 + approach
        : battleLayout.impact.x - (contact.contact?.reach ?? 0) * scale;
    const ground = action === 'uppercut'
        ? battleLayout.attacker.ground
        : battleLayout.impact.y +
            ((contact.contact?.height ?? 0) - (contact.y ?? 0)) * scale;
    return {
        x: (options.x ?? root) + (pose.x - contact.x) * scale,
        ground: (options.ground ?? ground) + pose.y * scale,
    };
}
export function sampleAtahoSprite(frame, options = {}) {
    const t = options.timeMs ?? frame.timeMs;
    const action = actionFor(frame, options.action);
    const motion = frame.assets[action];
    const pose = sampleComboMotion(motion, motionTime(motion, t));
    const source = frame.assets.frames.get(frameKey(pose.step));
    if (!source)
        throw new Error(`아타호 원본이 없습니다: ${frameKey(pose.step)}`);
    const scale = options.scale ?? battleLayout.attacker.scale;
    const position = atahoPosition(frame, options);
    const anchor = pose.step.anchor;
    const anchorX = typeof anchor === 'object' ? anchor.x : source.anchorX;
    const anchorY = typeof anchor === 'object'
        ? anchor.y
        : anchor === 'feet'
            ? source.feetY
            : source.anchorY;
    const left = position.x - anchorX * scale;
    const top = position.ground - anchorY * scale;
    return {
        image: source.image,
        left,
        top,
        width: source.image.naturalWidth * scale,
        height: source.image.naturalHeight * scale,
        position,
    };
}
export function drawAtaho(ctx, frame, options = {}) {
    const sprite = sampleAtahoSprite(frame, options);
    ctx.save();
    ctx.globalAlpha *= options.opacity ?? 1;
    ctx.imageSmoothingEnabled = false;
    if (options.silhouette)
        ctx.filter = 'brightness(0)';
    ctx.drawImage(sprite.image, Math.round(sprite.left), Math.round(sprite.top), sprite.width, sprite.height);
    ctx.restore();
}
function bearFrame(frames, timeMs, loop = false) {
    const total = frames.reduce((sum, f) => sum + (f.durationSeconds ?? 0.1) * 1000, 0);
    let remaining = loop ? Math.max(0, timeMs) % total : Math.max(0, timeMs);
    for (const f of frames) {
        remaining -= (f.durationSeconds ?? 0.1) * 1000;
        if (remaining < 0)
            return f;
    }
    return frames[frames.length - 1];
}
export function drawBear(ctx, frame, options = {}) {
    const t = options.timeMs ?? frame.timeMs;
    const age = t - battleLayout.contactMs;
    const state = options.state && options.state !== 'auto'
        ? options.state
        : age >= 0 && age < 900
            ? 'hit'
            : 'stand';
    const source = bearFrame(frame.assets.bear[state], state === 'stand' ? t : Math.max(0, age) * (state === 'hit' ? 0.65 : 1), state === 'stand');
    const recoil = state === 'stand'
        ? 0
        : Math.sin(clamp(age / 900) * Math.PI) * (frame.reducedMotion ? 5 : 22);
    const x = (options.x ?? battleLayout.target.x) + recoil;
    const ground = (options.ground ?? battleLayout.target.ground) - recoil * 0.45;
    const scale = options.scale ?? battleLayout.target.scale;
    ctx.save();
    ctx.globalAlpha *= options.opacity ?? 1;
    ctx.imageSmoothingEnabled = false;
    if (options.silhouette)
        ctx.filter = 'brightness(0)';
    ctx.drawImage(source.image, Math.round(x - source.pivot.x * scale), Math.round(ground - (source.height - source.pivot.y) * scale), source.width * scale, source.height * scale);
    ctx.restore();
}
export function drawBattleActors(ctx, frame, options = {}) {
    const current = { ...frame, timeMs: options.timeMs ?? frame.timeMs };
    const position = atahoPosition(current, { action: options.action });
    const air = clamp((battleLayout.attacker.ground - position.ground) / 180);
    ellipse(ctx, position.x, 448, 58 * (1 - air * 0.45), 10 * (1 - air * 0.4), '#14293b32');
    ellipse(ctx, 657, 448, 115, 15, '#14293b32');
    drawBear(ctx, current);
    drawAtaho(ctx, current, { action: options.action });
}
export function drawBattle(ctx, frame, options = {}) {
    if (options.background !== false)
        stage(ctx, 0);
    drawBattleActors(ctx, frame, options);
}
/** 원본 얼굴에서 같은 비율로 잘라 쓰는 컷이며 눈·입의 새 원화를 생성하지 않는다. */
export function drawPortrait(ctx, frame, options) {
    const image = frame.assets.portrait;
    const crop = options.crop ?? 'face';
    const area = crop === 'eyes'
        ? { x: 360, y: 260, w: 820, h: 260 }
        : crop === 'mouth'
            ? { x: 440, y: 410, w: 650, h: 250 }
            : { x: 270, y: 20, w: 1000, h: 900 };
    const ratio = Math.max(options.width / area.w, options.height / area.h);
    const sw = options.width / ratio, sh = options.height / ratio;
    ctx.drawImage(image, area.x + (area.w - sw) / 2, area.y + (area.h - sh) / 2, sw, sh, options.x, options.y, options.width, options.height);
}
