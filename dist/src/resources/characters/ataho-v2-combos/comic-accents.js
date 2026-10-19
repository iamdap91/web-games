import { sampleComboMotion } from './player.js';
import { groundY, stageHeight, stageWidth, startX } from './pose-drawing.js';
import { sampleSandbag, sandbagBodyTransform, } from './sandbag.js';
export function hasImpactLettering(motion) {
    return motion.id === 'cheolsango' || motion.finisher?.theme === 'omnislash';
}
export function hasEndSilhouette(motion) {
    return (motion.finisher?.theme === 'demon' || motion.finisher?.theme === 'omnislash');
}
export function hasBrushGlyph(motion) {
    return (motion.finisher?.theme === 'drunken-tiger' &&
        motion.finisher.endGlyph === '虎');
}
export function hasActionFrame(motion) {
    return motion.finisher?.theme === 'omnislash';
}
function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
}
function smooth(value) {
    const t = clamp(value, 0, 1);
    return t * t * (3 - 2 * t);
}
function stepStart(motion, index) {
    return motion.steps
        .slice(0, index)
        .reduce((sum, step) => sum + step.durationMs, 0);
}
function bagBounds(state) {
    const matrix = sandbagBodyTransform(state);
    const points = [-state.width / 2, state.width / 2].flatMap((x) => [0, state.height].map((y) => ({
        x: matrix.a * x + matrix.c * y + matrix.e,
        y: matrix.b * x + matrix.d * y + matrix.f,
    })));
    return {
        left: Math.min(...points.map((point) => point.x)) - 5,
        right: Math.max(...points.map((point) => point.x)) + 5,
        top: Math.min(...points.map((point) => point.y)) - 5,
        bottom: Math.max(...points.map((point) => point.y)) + 5,
    };
}
function finalConnected(contacts) {
    const last = contacts.at(-1);
    // 끝타가 빗나가면 앞선 명중을 결정타로 승격하지 않는다.
    return last
        ? contacts
            .filter((contact) => contact.connected &&
            Math.abs(contact.plannedTimeMs - last.plannedTimeMs) < 0.01)
            .sort((a, b) => a.timeMs - b.timeMs)
            .at(-1)
        : undefined;
}
function sampleLettering(snapshot, contact, target, scale) {
    const heavy = snapshot.motion.id === 'cheolsango';
    const lifetimeMs = heavy ? 160 : 180;
    const age = snapshot.elapsedMs - contact.timeMs;
    if (age < 0 || age >= lifetimeMs)
        return;
    const enter = smooth(age / 18);
    const opacity = smooth(age / 12) * (1 - smooth((age - 100) / (lifetimeMs - 100)));
    const fontSize = (heavy ? 22 : 25) * scale;
    // 샌드백 아래·옆의 여백에 놓고, 겹치는 획은 별도 제외 마스크로 가린다.
    const rightRoom = stageWidth - target.right;
    const direction = rightRoom > fontSize * 1.7 ? 1 : -1;
    const center = {
        x: clamp(direction > 0
            ? target.right + fontSize * 0.85
            : target.left - fontSize * 0.85, 55 + fontSize / 2, stageWidth - 55 - fontSize / 2),
        y: clamp(heavy ? contact.y + 35 * scale : contact.y + 18 * scale, 82 + fontSize / 2, groundY + 28 - fontSize * 0.15),
    };
    return {
        text: heavy ? '쿵' : '쾅',
        style: heavy ? 'heavy' : 'falling',
        center,
        fontSize,
        opacity,
        scaleX: (heavy ? 1.28 : 0.96) * (0.86 + enter * 0.14),
        scaleY: (heavy ? 0.82 : 1.2) * (0.9 + enter * 0.1),
        rotation: heavy ? -0.035 : -0.2 * contact.directionX,
    };
}
function sampleFrame(snapshot, contact, scale) {
    const age = snapshot.elapsedMs - contact.timeMs;
    if (age < -130 || age >= 120)
        return;
    const pose = sampleComboMotion(snapshot.motion, contact.timeMs);
    const bodyX = startX + pose.x * scale;
    const bodyY = groundY + pose.y * scale;
    const rect = {
        left: clamp(Math.min(bodyX - 47 * scale, contact.x - 43 * scale), 54, stageWidth - 180),
        right: clamp(Math.max(bodyX + 47 * scale, contact.x + 43 * scale), 180, stageWidth - 54),
        top: clamp(Math.min(bodyY - 76 * scale, contact.y - 40 * scale), 64, groundY - 90),
        bottom: groundY + 18,
    };
    return {
        rect,
        opacity: age < 0 ? smooth((age + 130) / 28) * 0.68 : (1 - age / 120) * 0.68,
        burstOpacity: age < 0 ? 0 : (1 - age / 120) ** 1.5,
        burstCenter: { x: contact.x, y: contact.y },
        burstProgress: clamp(age / 120, 0, 1),
    };
}
/** 기존 접촉·종결 구간만 읽어 정지·탐색·반복에서 같은 그림을 돌려준다. */
export function sampleComicAccents(snapshot, options) {
    const { motion } = snapshot;
    const scale = options.scale;
    const bodyCenter = {
        x: startX + snapshot.x * scale,
        y: groundY + (snapshot.y - 32) * scale,
    };
    const brushGlyphActive = options.showMovement &&
        !!options.showSandbag &&
        !!options.showBrushGlyph &&
        hasBrushGlyph(motion);
    const empty = {
        scale,
        bodyCenter,
        silhouetteOpacity: 0,
        brushGlyphActive,
        suppressImpactDecoration: false,
        exclusions: [],
    };
    if (!options.showMovement || !options.showSandbag || snapshot.waiting)
        return empty;
    const enabled = (options.showImpactLettering && hasImpactLettering(motion)) ||
        (options.showEndSilhouette && hasEndSilhouette(motion)) ||
        brushGlyphActive ||
        (options.showActionFrame && hasActionFrame(motion));
    if (!enabled)
        return empty;
    const bag = sampleSandbag(snapshot, options);
    const contact = bag ? finalConnected(bag.contacts) : undefined;
    if (!bag || !contact)
        return empty;
    const target = bagBounds(bag);
    const bodyBounds = {
        left: bodyCenter.x - 36 * scale,
        right: bodyCenter.x + 36 * scale,
        top: groundY + (snapshot.y - 77) * scale,
        bottom: groundY + snapshot.y * scale + 3,
    };
    const lettering = options.showImpactLettering && hasImpactLettering(motion)
        ? sampleLettering(snapshot, contact, {
            left: Math.min(target.left, bodyBounds.left),
            right: Math.max(target.right, bodyBounds.right),
            top: Math.min(target.top, bodyBounds.top),
            bottom: Math.max(target.bottom, bodyBounds.bottom),
        }, scale)
        : undefined;
    const actionFrame = options.showActionFrame && hasActionFrame(motion)
        ? sampleFrame(snapshot, contact, scale)
        : undefined;
    const finish = motion.finisher?.beats.find((beat) => beat.emphasis === 'finish' &&
        snapshot.stepIndex >= beat.fromStep &&
        snapshot.stepIndex <= beat.toStep);
    const finishAge = finish
        ? snapshot.elapsedMs - stepStart(motion, finish.fromStep)
        : -1;
    const connected = snapshot.elapsedMs >= contact.timeMs;
    // 현재 자세를 쓰며 지나간 종결 그림을 다시 꺼내거나 hold를 추가하지 않는다.
    const silhouetteOpacity = options.showEndSilhouette &&
        hasEndSilhouette(motion) &&
        connected &&
        finishAge >= 0
        ? smooth(finishAge / 14) * (1 - smooth((finishAge - 120) / 90))
        : 0;
    const glyphWindow = finish
        ? Math.min(180, motion.steps[finish.fromStep].durationMs)
        : 0;
    const brushGlyph = brushGlyphActive && connected && finishAge >= 0 && finishAge < glyphWindow
        ? {
            text: '虎',
            center: { x: 740, y: 244 },
            fontSize: 122,
            opacity: smooth(finishAge / 16) *
                (1 - smooth((finishAge - glyphWindow + 45) / 45)) *
                0.58,
            reveal: smooth(finishAge / 42),
            settle: smooth(finishAge / 58),
        }
        : undefined;
    return {
        ...empty,
        silhouetteOpacity,
        lettering,
        actionFrame,
        brushGlyph,
        suppressImpactDecoration: !!lettering || !!actionFrame?.burstOpacity,
        exclusions: [bodyBounds, target],
    };
}
function stageClip(ctx) {
    // 무대 제목·진행 표시·Canvas 바깥 UI로 연출을 내보내지 않는다.
    ctx.beginPath();
    ctx.rect(28, 58, stageWidth - 56, Math.min(stageHeight - 58, groundY + 36) - 58);
    ctx.clip();
}
function excludeActors(ctx, bounds) {
    // 겹친 제외 사각형이 짝수 규칙으로 다시 열리지 않게 하나씩 교차한다.
    for (const bound of bounds) {
        const clip = new Path2D();
        clip.rect(0, 0, stageWidth, stageHeight);
        clip.rect(bound.left, bound.top, bound.right - bound.left, bound.bottom - bound.top);
        ctx.clip(clip, 'evenodd');
    }
}
/** 어두운 몸의 윤곽을 읽을 수 있는 종결 배경만 배우 아래에 그린다. */
export function drawComicBackdrop(ctx, sample) {
    if (!sample.silhouetteOpacity && !sample.actionFrame)
        return;
    ctx.save();
    stageClip(ctx);
    if (sample.silhouetteOpacity) {
        const { x, y } = sample.bodyCenter;
        const radius = 79 * sample.scale;
        const wash = ctx.createRadialGradient(x, y, 12 * sample.scale, x, y, radius);
        wash.addColorStop(0, '#eadfc7');
        wash.addColorStop(0.65, '#d8c8a7a0');
        wash.addColorStop(1, '#d8c8a700');
        ctx.globalAlpha *= sample.silhouetteOpacity * 0.74;
        ctx.fillStyle = wash;
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    const frame = sample.actionFrame;
    if (frame) {
        const clip = new Path2D();
        clip.rect(0, 0, stageWidth, stageHeight);
        clip.rect(frame.rect.left, frame.rect.top, frame.rect.right - frame.rect.left, frame.rect.bottom - frame.rect.top);
        ctx.save();
        ctx.clip(clip, 'evenodd');
        ctx.globalAlpha = frame.opacity * 0.13;
        ctx.fillStyle = '#322b25';
        ctx.fillRect(0, 0, stageWidth, stageHeight);
        ctx.restore();
    }
    ctx.restore();
}
function drawLettering(ctx, sample) {
    ctx.save();
    ctx.translate(sample.center.x, sample.center.y);
    ctx.rotate(sample.rotation);
    ctx.scale(sample.scaleX, sample.scaleY);
    ctx.globalAlpha *= sample.opacity;
    ctx.font = `900 ${sample.fontSize}px "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = sample.style === 'heavy' ? 5 : 4;
    ctx.strokeStyle = '#f3e7cf';
    ctx.strokeText(sample.text, 0, 0);
    ctx.fillStyle = sample.style === 'heavy' ? '#362c28' : '#7a3428';
    ctx.fillText(sample.text, 0, 0);
    ctx.restore();
}
function drawFrame(ctx, frame, scale) {
    const { left, top, right, bottom } = frame.rect;
    ctx.save();
    ctx.strokeStyle = '#40342c';
    ctx.globalAlpha *= frame.opacity;
    ctx.lineWidth = 1.4;
    ctx.strokeRect(left, top, right - left, bottom - top);
    ctx.restore();
    if (!frame.burstOpacity)
        return;
    // 내부 틀 클립은 이 충격 도형에만 해제하며 몸·대상은 그대로 둔다.
    ctx.save();
    ctx.globalAlpha *= frame.burstOpacity * 0.58;
    ctx.fillStyle = '#44352d';
    const { x, y } = frame.burstCenter;
    const radius = (48 + Math.sqrt(frame.burstProgress) * 32) * scale;
    for (const [index, angle] of [
        -2.15, -1.32, -0.58, 0.24, 0.94, 1.8, 2.72,
    ].entries()) {
        const along = { x: Math.cos(angle), y: Math.sin(angle) };
        const length = radius * (index % 2 ? 1.08 : 0.82);
        const inner = radius * 0.35;
        const width = (index % 2 ? 2.2 : 1.2) * scale;
        ctx.beginPath();
        ctx.moveTo(x + along.x * inner, y + along.y * inner);
        ctx.lineTo(x + along.x * length - along.y * width, y + along.y * length + along.x * width);
        ctx.lineTo(x + along.x * (length + 8 * scale), y + along.y * (length + 8 * scale));
        ctx.lineTo(x + along.x * length + along.y * width, y + along.y * length - along.x * width);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
}
function drawBrushGlyph(ctx, glyph) {
    ctx.save();
    ctx.translate(glyph.center.x, glyph.center.y + (1 - glyph.settle) * -7);
    const settleScale = 1.04 - glyph.settle * 0.04;
    ctx.transform(settleScale, -0.025, -0.065, settleScale, 0, 0);
    ctx.globalAlpha *= glyph.opacity;
    ctx.font = `900 ${glyph.fontSize}px "Songti SC", "Noto Serif CJK SC", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const half = glyph.fontSize * 0.65;
    ctx.beginPath();
    ctx.rect(-half, -half, half * 2, half * 2 * glyph.reveal);
    ctx.clip();
    ctx.fillStyle = '#7c482c';
    ctx.globalAlpha *= 0.25;
    ctx.fillText(glyph.text, 0, 0);
    ctx.globalAlpha /= 0.25;
    // 기존 글리프를 붓결 방향의 불규칙한 띠로 마스킹한다. 새 자형으로 속이지 않는다.
    ctx.beginPath();
    for (let row = 0; row < 48; row++) {
        const y = -half + (row * half) / 24;
        const gap = row % 7 === 0 ? 1.5 : row % 3 === 0 ? 0.8 : 0.35;
        const inset = (row % 5) * 0.45;
        ctx.rect(-half + inset, y, half * 2 - inset * 2, half / 24 - gap);
    }
    ctx.clip();
    ctx.fillStyle = '#744023';
    ctx.fillText(glyph.text, 0, 0);
    ctx.restore();
}
/** root는 현재 원화의 실제 알파 경계를 bodyBounds로 넘겨 제외 범위를 보완할 수 있다. */
export function drawComicOverlay(ctx, sample, options = {}) {
    if (!sample.lettering && !sample.actionFrame && !sample.brushGlyph)
        return;
    ctx.save();
    stageClip(ctx);
    excludeActors(ctx, options.bodyBounds
        ? [options.bodyBounds, ...sample.exclusions.slice(1)]
        : sample.exclusions);
    if (sample.actionFrame)
        drawFrame(ctx, sample.actionFrame, sample.scale);
    if (sample.lettering)
        drawLettering(ctx, sample.lettering);
    if (sample.brushGlyph)
        drawBrushGlyph(ctx, sample.brushGlyph);
    ctx.restore();
}
