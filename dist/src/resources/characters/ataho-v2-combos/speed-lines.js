import { groundY, stageWidth, startX } from './pose-drawing.js';
function isTravelStep(step, next) {
    if (Math.abs(next.x - step.x) < 0.001 || step.durationMs <= 0)
        return false;
    if (/가드|복귀/.test(step.phase))
        return false;
    if (/^(running-|walking-)/.test(step.motion))
        return true;
    const airborne = (step.y ?? 0) < 0 || (next.y ?? 0) < 0;
    if (step.motion === 'jumping-1-south-east')
        return airborne && step.frame >= 3 && step.frame <= 6;
    if (step.motion === 'backflip-south-east')
        return airborne && step.frame >= 3;
    return airborne && step.motion === 'high-kick-south-east';
}
function travelRuns(motion) {
    const xs = motion.steps.map((step) => step.x);
    // 작은 체중 이동과 짧은 접근에는 배경 전체가 흐르는 표현을 붙이지 않는다.
    if (Math.max(...xs) - Math.min(...xs) < 20)
        return [];
    const runs = [];
    let timeMs = 0;
    for (const [index, step] of motion.steps.entries()) {
        const next = motion.steps[index + 1];
        const endMs = timeMs + step.durationMs;
        if (next && isTravelStep(step, next)) {
            const direction = next.x > step.x ? 1 : -1;
            const previous = runs.at(-1);
            if (previous?.endMs === timeMs && previous.direction === direction)
                runs[runs.length - 1] = { ...previous, endMs };
            else
                runs.push({ startMs: timeMs, endMs, direction });
        }
        timeMs = endMs;
    }
    return runs;
}
export function hasSpeedLines(motion) {
    return travelRuns(motion).length > 0;
}
function smoothStep(value) {
    const t = Math.max(0, Math.min(1, value));
    return t * t * (3 - 2 * t);
}
function horizontalSpeed(snapshot, scale) {
    const next = snapshot.motion.steps[snapshot.stepIndex + 1];
    if (!next)
        return 0;
    const step = snapshot.step;
    const progress = Math.max(0, Math.min(1, snapshot.stepElapsedMs / step.durationMs));
    const curve = step.movementCurve?.x;
    const multiplier = curve === 'ease-in'
        ? 2 * progress
        : curve === 'ease-out'
            ? 2 * (1 - progress)
            : 1;
    return (Math.abs(next.x - step.x) * scale * multiplier) / step.durationMs;
}
/** 절대 동작 시각과 원래 이동 속도로 계산해 정지·탐색·반복 결과를 같게 유지한다. */
export function sampleSpeedLines(snapshot, options) {
    if (snapshot.waiting)
        return [];
    const run = travelRuns(snapshot.motion).find((item) => snapshot.elapsedMs >= item.startMs && snapshot.elapsedMs < item.endMs);
    if (!run)
        return [];
    const fadeMs = Math.min(60, (run.endMs - run.startMs) / 3);
    const envelope = smoothStep((snapshot.elapsedMs - run.startMs) / fadeMs) *
        smoothStep((run.endMs - snapshot.elapsedMs) / fadeMs);
    const strength = Math.min(1, horizontalSpeed(snapshot, options.scale) / 0.75);
    if (envelope * strength < 0.001)
        return [];
    const x = startX + snapshot.x * options.scale;
    const feetY = groundY + snapshot.y * options.scale;
    const lines = [];
    for (let index = 0; index < 6; index++) {
        // 서로 다른 고정 주기로 흐르게 하고 주기 경계에서는 투명하게 만든다.
        const cycle = (snapshot.elapsedMs - run.startMs) / (120 + index * 17) + index * 0.173;
        const phase = cycle - Math.floor(cycle);
        const y = feetY + (-57 + index * 10) * options.scale;
        if (y < 24 || y > groundY - 4)
            continue;
        const near = x - run.direction * (14 * options.scale + phase * 80);
        const far = near - run.direction * (24 + index * 7) * options.scale;
        const fromX = Math.max(8, Math.min(stageWidth - 8, far));
        const toX = Math.max(8, Math.min(stageWidth - 8, near));
        if (Math.abs(toX - fromX) < 6)
            continue;
        lines.push({
            fromX,
            toX,
            y,
            opacity: snapshot.opacity *
                0.16 *
                envelope *
                strength *
                Math.sin(phase * Math.PI) ** 2,
            width: 1 + (index % 2) * 0.35,
        });
    }
    return lines;
}
/** 얼굴·손을 가리지 않도록 제외 영역과 만나는 선만 양쪽으로 나눈다. */
export function drawSpeedLines(ctx, lines, options) {
    ctx.save();
    const alpha = ctx.globalAlpha;
    // 도장의 밝은 벽·창에서도 보이도록 낮은 불투명도의 갈색 선을 쓴다.
    ctx.strokeStyle = '#79533c';
    ctx.lineCap = 'round';
    ctx.setLineDash([]);
    for (const line of lines) {
        if (line.opacity <= 0)
            continue;
        ctx.globalAlpha = alpha * line.opacity;
        ctx.lineWidth = line.width;
        const left = Math.min(line.fromX, line.toX);
        const right = Math.max(line.fromX, line.toX);
        const exclusion = options.exclusion;
        const gap = 4 + line.width * 0.5;
        const spans = exclusion &&
            line.y >= exclusion.top - gap &&
            line.y <= exclusion.bottom + gap
            ? [
                [left, Math.min(right, exclusion.left - gap)],
                [Math.max(left, exclusion.right + gap), right],
            ]
            : [[left, right]];
        ctx.beginPath();
        for (const [from, to] of spans) {
            if (from === undefined || to === undefined || to - from < 2)
                continue;
            ctx.moveTo(from, line.y);
            ctx.lineTo(to, line.y);
        }
        ctx.stroke();
    }
    ctx.restore();
}
