import { stageHeight, stageWidth } from './pose-drawing.js';
const cutinMotions = new Set([
    'finisher-demon',
    'finisher-omnislash-v5',
    'finisher-drunken-tiger',
    'finisher-ryuko-ranbu',
    'finisher-phoenix',
    'finisher-galactica-phantom',
    'finisher-pegasus-meteor',
    'finisher-pegasus-meteor-circus',
]);
const cutinDurationMs = 220;
const slideInMs = 50;
const slideOutMs = 130;
export function hasCutin(motion) {
    return cutinMotions.has(motion.id) && motion.finisher !== undefined;
}
/** 기존 도입 자세 안에서만 정지한다. 접촉이나 원래 동작 시간은 추가하지 않는다. */
export function cutinStop(motion) {
    if (!hasCutin(motion))
        return undefined;
    return { timeMs: 70, durationMs: 90 };
}
function clampUnit(value) {
    return Math.max(0, Math.min(1, value));
}
/** 실제 시각을 참조하지 않아 탐색·정지·반복에서 같은 시각의 컷인이 같다. */
export function sampleCutin(snapshot, options) {
    if (!options.enabled ||
        !options.showMovement ||
        !hasCutin(snapshot.motion) ||
        snapshot.waiting ||
        snapshot.elapsedMs >= cutinDurationMs)
        return undefined;
    const elapsed = snapshot.elapsedMs;
    const incoming = clampUnit(elapsed / slideInMs);
    const outgoing = clampUnit((elapsed - slideOutMs) / (cutinDurationMs - slideOutMs));
    const easeIn = 1 - (1 - incoming) ** 3;
    const opacity = clampUnit(elapsed / 24) * (1 - outgoing) * snapshot.opacity;
    return {
        title: snapshot.motion.title.replace(/ · .*$/, ''),
        accent: snapshot.motion.finisher.accent,
        opacity,
        offsetX: -stageWidth * (1 - easeIn) + 100 * outgoing ** 2,
        dim: 0.16 * opacity,
    };
}
/** 화면 위쪽 띠에 모아 몸·접촉점·샌드백을 읽을 공간을 남긴다. */
export function drawCutin(ctx, sample, frames) {
    const source = frames.get('cutin:ataho');
    if (!source || sample.opacity <= 0)
        return;
    ctx.save();
    ctx.globalAlpha *= sample.dim;
    ctx.fillStyle = '#121019';
    ctx.fillRect(0, 0, stageWidth, stageHeight);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha *= sample.opacity;
    ctx.translate(Math.round(sample.offsetX), 0);
    ctx.beginPath();
    ctx.moveTo(46, 22);
    ctx.lineTo(862, 22);
    ctx.lineTo(820, 130);
    ctx.lineTo(4, 130);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = '#17131d';
    ctx.fillRect(0, 22, stageWidth, 108);
    const glow = ctx.createLinearGradient(80, 0, 830, 0);
    glow.addColorStop(0, '#38251e');
    glow.addColorStop(0.55, '#201923');
    glow.addColorStop(1, '#17131d');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 22, stageWidth, 108);
    // 그림을 확대해 눈·코 중심으로 잘라 보이며 원본 파일과 알파는 바꾸지 않는다.
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(source.image, 80, -38, 520, 520 / 1.5);
    ctx.fillStyle = '#17131d';
    ctx.beginPath();
    ctx.moveTo(540, 22);
    ctx.lineTo(862, 22);
    ctx.lineTo(820, 130);
    ctx.lineTo(490, 130);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = sample.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(46, 23);
    ctx.lineTo(862, 23);
    ctx.moveTo(4, 129);
    ctx.lineTo(820, 129);
    ctx.stroke();
    ctx.fillStyle = sample.accent;
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('필살', 573, 54);
    ctx.fillStyle = '#ffefd2';
    ctx.font = 'bold 23px serif';
    ctx.fillText(sample.title, 570, 88);
    ctx.restore();
}
