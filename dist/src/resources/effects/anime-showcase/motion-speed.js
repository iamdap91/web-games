import { battleImpact, battleLayout } from './battle.js';
import { clamp, mix, noise, smooth } from './drawing.js';
import { height, width, } from './types.js';
/** 누적 입자 상태 없이 같은 재생 시각·탐색·GIF에서 같은 후류를 만든다. */
export function drawSpeedStreamlines(ctx, frame, flow) {
    const age = frame.timeMs - battleLayout.contactMs;
    const settling = smooth((age + 130) / 100) * (1 - smooth(age / 120)) * 0.16;
    const strength = Math.max(Math.sqrt(clamp(flow.velocity / 0.385)), settling);
    if (!frame.enhanced || strength <= 0)
        return;
    ctx.save();
    ctx.globalAlpha *= strength * (frame.reducedMotion ? 0.32 : 1);
    // 얼굴·주먹·피격 표정 앞에는 선이 지나가지 않도록 타점 주변을 비운다.
    const impact = battleImpact(frame);
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.moveTo(flow.x + 98, 345);
    ctx.ellipse(flow.x + 12, 345, 86, 111, 0, 0, Math.PI * 2);
    ctx.clip('evenodd');
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.rect(impact.x - 38, impact.y - 66, 204, 146);
    ctx.clip('evenodd');
    drawStreaks(ctx, frame, flow, strength);
    drawSlipstreams(ctx, frame, flow, strength);
    ctx.restore();
}
function drawStreaks(ctx, frame, flow, strength) {
    const count = frame.reducedMotion ? 18 : 68;
    const opacity = ctx.globalAlpha;
    const distance = frame.reducedMotion
        ? 0
        : flow.travel * 5 + Math.max(0, frame.timeMs - 1800) * 0.9;
    for (let i = 0; i < count; i++) {
        const near = i % 7 === 0;
        const depth = near ? 1 : 0.28 + noise(i + 41) * 0.5;
        // 가장 긴 선의 꼬리까지 화면을 벗어난 뒤 순환해야 이탈 중 끊기지 않는다.
        const margin = 500;
        const span = width + margin * 2;
        const head = ((((noise(i + 13) * span - distance * depth) % span) + span) % span) -
            margin;
        const y = 92 + ((i + noise(i + 71) * 0.8) / count) * 392;
        const peripheral = Math.abs(y - 340) > 112;
        const wake = 1 - smooth((head - flow.x + (peripheral ? -150 : 45)) / 240);
        if (wake <= 0)
            continue;
        const length = (86 + noise(i + 101) * 224 + (near ? 160 : 0)) * (0.4 + strength * 0.6);
        const thickness = near
            ? 3.5 + noise(i + 149) * 3
            : 0.9 + noise(i + 149) * 1.8;
        const tail = head + length;
        ctx.globalAlpha =
            opacity * wake * (near ? 0.7 : 0.3 + noise(i + 173) * 0.36);
        ctx.fillStyle =
            i % 4 === 0 ? '#283b42' : i % 3 === 0 ? '#a9c4c7' : '#f4e9ce';
        ctx.beginPath();
        ctx.moveTo(head, y);
        ctx.lineTo(head + length * 0.23, y - thickness * 0.5);
        ctx.lineTo(head + length * 0.63, y - thickness * 0.18);
        ctx.lineTo(tail, y);
        ctx.lineTo(head + length * 0.35, y + thickness * 0.32);
        ctx.closePath();
        ctx.fill();
    }
    ctx.globalAlpha = opacity;
}
function slipstreamPoint(x, side, lane, p) {
    const q = 1 - p;
    const center = 344;
    const radius = side < 0 ? 137 + lane * 19 : 104 + lane * 15;
    return {
        x: x +
            118 * q ** 3 +
            3 * 20 * q * q * p -
            3 * 175 * q * p * p -
            414 * p ** 3,
        y: center +
            side *
                (radius * 0.53 * q ** 3 +
                    3 * radius * 1.2 * q * q * p +
                    3 * radius * q * p * p +
                    radius * 0.72 * p ** 3),
    };
}
/** 곡선 전체를 고정하지 않고 몸 바깥에서 뒤쪽으로 짧은 구간만 흘린다. */
function drawSlipstreams(ctx, frame, flow, strength) {
    const opacity = ctx.globalAlpha;
    const distance = frame.reducedMotion
        ? 0
        : flow.travel / 170 + Math.max(0, frame.timeMs - 1800) / 450;
    for (const side of [-1, 1]) {
        for (let lane = 0; lane < (frame.reducedMotion ? 1 : 2); lane++) {
            const phase = (distance + 0.16 + lane * 0.43 + (side > 0 ? 0.24 : 0)) % 1;
            const begin = phase;
            const end = Math.min(1, begin + 0.27 + lane * 0.07);
            ctx.globalAlpha =
                opacity * Math.sin(phase * Math.PI) * (lane ? 0.38 : 0.75);
            ctx.fillStyle = lane ? '#273d43' : '#ecdfbd';
            ctx.beginPath();
            for (const edge of [-1, 1]) {
                for (let j = 0; j <= 12; j++) {
                    const along = edge < 0 ? j / 12 : 1 - j / 12;
                    const p = mix(begin, end, along);
                    const point = slipstreamPoint(flow.x, side, lane, p);
                    const thickness = Math.sin(along * Math.PI) * (1.1 + strength * 1.9);
                    const y = point.y + edge * thickness;
                    if (edge < 0 && j === 0)
                        ctx.moveTo(point.x, y);
                    else
                        ctx.lineTo(point.x, y);
                }
            }
            ctx.closePath();
            ctx.fill();
        }
    }
    ctx.globalAlpha = opacity;
}
