import { sampleComboMotion } from './player.js';
import { groundY, startX } from './pose-drawing.js';
const profiles = {
    'charged-uppercut': {
        source: 'surprise-uppercut-south-east',
        side: 1,
        releaseDirection: { x: 0.3, y: -1 },
        poses: [
            { x: 55, y: 55, feetY: 77 },
            { x: 55, y: 55, feetY: 77 },
            { x: 68, y: 35, feetY: 79 },
        ],
    },
    cheolsango: {
        source: 'cheolsango-short',
        side: -1,
        releaseDirection: { x: -1, y: -0.08 },
        poses: [
            { x: 28, y: 51, feetY: 79 },
            { x: 29, y: 52, feetY: 82 },
            { x: 27, y: 53, feetY: 83 },
        ],
    },
};
function chargeWindow(motion, profile) {
    let timeMs = 0;
    let fromMs;
    for (const step of motion.steps) {
        if (step.motion === profile.source) {
            if (step.frame === 0 && fromMs === undefined)
                fromMs = timeMs;
            if (step.frame === 2 && fromMs !== undefined && timeMs > fromMs)
                return { fromMs, releaseMs: timeMs };
        }
        timeMs += step.durationMs;
    }
    return undefined;
}
export function hasLocalCharge(motion) {
    const profile = profiles[motion.id];
    return !!profile && !!chargeWindow(motion, profile);
}
function chargePosition(snapshot, profile, scale) {
    const point = profile.poses[snapshot.step.frame];
    if (!point || snapshot.step.motion !== profile.source)
        return undefined;
    return {
        x: startX + (snapshot.x + point.x - 48) * scale,
        y: groundY + (snapshot.y + point.y - point.feetY) * scale,
    };
}
function sampleGathering(position, profile, progress, scale) {
    const marks = [];
    for (let index = 0; index < 7; index++) {
        const travel = (progress - index * 0.085) / 0.48;
        if (travel < 0 || travel > 1)
            continue;
        const angle = -0.08 + ((index * 3) % 7) * 0.12;
        const radius = 3 + (1 - travel) ** 1.6 * (11 + (index % 3) * 1.5);
        const opacity = Math.sin(travel * Math.PI) * (0.48 + progress * 0.25);
        marks.push({
            x: position.x + Math.cos(angle) * radius * profile.side * scale,
            y: position.y + Math.sin(angle) * radius * scale,
            length: (2 + travel * 1.8) * scale,
            width: (index % 3 === 0 ? 1.25 : 0.85) * scale,
            rotation: profile.side === 1 ? angle : Math.PI - angle,
            opacity,
            highlight: index === 2 || index === 5,
        });
    }
    // 닫힌 광구 대신 손 바깥에 짧은 먹 획만 모아 준비 자세를 읽을 수 있게 한다.
    if (progress > 0.25) {
        for (let index = 0; index < 3; index++) {
            const angle = -0.16 + index * 0.43;
            const radius = (5.2 - progress * 1.9) * scale;
            marks.push({
                x: position.x + Math.cos(angle) * radius * profile.side,
                y: position.y + Math.sin(angle) * radius,
                length: (1.4 + progress * 1.5) * scale,
                width: scale,
                rotation: (profile.side === 1 ? angle : Math.PI - angle) + Math.PI / 2,
                opacity: (progress - 0.25) * 0.7,
                highlight: index === 1,
            });
        }
    }
    return marks;
}
function sampleRelease(position, profile, progress, scale) {
    const direction = profile.releaseDirection;
    const angle = Math.atan2(direction.y, direction.x);
    return Array.from({ length: 5 }, (_, index) => {
        const spread = (index - 2) * 0.22;
        const rotation = angle + spread;
        const distance = (3 + progress ** 0.7 * (10 + (index % 2) * 3)) * scale;
        return {
            x: position.x + Math.cos(rotation) * distance,
            y: position.y + Math.sin(rotation) * distance,
            length: (2 + (1 - progress) * 3.5) * scale,
            width: (index === 2 ? 1.4 : 0.9) * scale,
            rotation,
            opacity: (1 - progress) ** 1.5 * (index === 2 ? 0.7 : 0.55),
            highlight: index === 2,
        };
    });
}
export function sampleLocalCharge(snapshot, options) {
    if (!options.enabled || !options.showMovement || snapshot.waiting)
        return undefined;
    const profile = profiles[snapshot.motion.id];
    if (!profile)
        return undefined;
    const window = chargeWindow(snapshot.motion, profile);
    if (!window || snapshot.elapsedMs < window.fromMs)
        return undefined;
    if (snapshot.elapsedMs < window.releaseMs) {
        const position = chargePosition(snapshot, profile, options.scale);
        if (!position)
            return undefined;
        const progress = (snapshot.elapsedMs - window.fromMs) / (window.releaseMs - window.fromMs);
        return {
            ...position,
            phase: 'charge',
            progress,
            remainingMs: window.releaseMs - snapshot.elapsedMs,
            scale: options.scale,
            marks: sampleGathering(position, profile, progress, options.scale),
        };
    }
    const releaseDurationMs = 90;
    const progress = (snapshot.elapsedMs - window.releaseMs) / releaseDurationMs;
    if (progress >= 1)
        return undefined;
    // 방출된 조각은 발동 시점의 월드 위치에 남기고 회수 자세에 달라붙지 않는다.
    const position = chargePosition(sampleComboMotion(snapshot.motion, window.releaseMs), profile, options.scale);
    if (!position)
        return undefined;
    return {
        ...position,
        phase: 'release',
        progress,
        remainingMs: 0,
        scale: options.scale,
        marks: sampleRelease(position, profile, progress, options.scale),
    };
}
export function drawLocalCharge(ctx, sample) {
    ctx.save();
    for (const mark of sample.marks) {
        ctx.save();
        ctx.globalAlpha *= mark.opacity;
        ctx.translate(Math.round(mark.x), Math.round(mark.y));
        ctx.rotate(mark.rotation);
        ctx.fillStyle = mark.highlight ? '#d9eee1' : '#292b2b';
        // 가는 끝과 갈라진 뒷면으로 광선보다 작은 붓 조각에 가깝게 그린다.
        ctx.beginPath();
        ctx.moveTo(-mark.length * 0.55, -mark.width * 0.4);
        ctx.lineTo(-mark.length * 0.05, -mark.width * 0.55);
        ctx.lineTo(mark.length * 0.5, -mark.width * 0.1);
        ctx.lineTo(mark.length * 0.28, mark.width * 0.32);
        ctx.lineTo(-mark.length * 0.3, mark.width * 0.5);
        ctx.lineTo(-mark.length * 0.15, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
    ctx.restore();
}
