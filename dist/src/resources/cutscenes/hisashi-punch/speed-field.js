function grain(index) {
    const value = Math.sin(index * 127.1 + 311.7) * 43758.5453;
    return value - Math.floor(value);
}
/** 주먹의 진행 방향으로 흐르는 거친 선을 그리고 타점의 표정과 주먹은 비운다. */
export function drawSpeedField(ctx, options) {
    const strength = Math.min(1, Math.max(0, options.strength));
    if (strength === 0)
        return;
    const { monochrome, focus, reducedMotion } = options;
    const timeMs = reducedMotion ? 0 : options.timeMs;
    const count = Math.ceil((monochrome ? 58 : 18) * strength * (reducedMotion ? 0.5 : 1));
    const span = 1900;
    ctx.save();
    // 선 끝까지 가리지 않도록 시작점 판정 대신 그리는 영역에서 접촉부를 비운다.
    ctx.beginPath();
    ctx.rect(0, 0, 960, 540);
    ctx.rect(focus.x - 115, focus.y - 70, 230, 140);
    ctx.clip('evenodd');
    const opacity = ctx.globalAlpha * strength;
    ctx.lineCap = 'butt';
    for (let i = 0; i < count; i++) {
        const speed = 1.2 + grain(i + 31) * 1.1;
        const phase = grain(i + 67) * span + timeMs * speed;
        const x = (((phase % span) + span) % span) - 430;
        const slope = 0.035 + grain(i + 111) * 0.075;
        const y = -65 + grain(i + 173) * 760 - x * slope;
        const length = (monochrome ? 180 : 110) +
            grain(i + 229) * (monochrome ? 280 : 170) +
            strength * 75;
        const rise = length * slope;
        const width = (monochrome ? 1.5 : 0.6) + grain(i + 283) * (monochrome ? 6.5 : 1.5);
        ctx.globalAlpha =
            opacity *
                (monochrome ? 0.2 + grain(i + 337) * 0.56 : 0.12 + grain(i + 337) * 0.2);
        ctx.fillStyle = monochrome
            ? i % 4 === 0
                ? '#333333'
                : '#101112'
            : i % 3 === 0
                ? '#d8b764'
                : '#f8efd6';
        // 긴 사선에 불규칙한 틈과 가는 꼬리를 남겨 거친 흐름을 만든다.
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - length * 0.2, y + rise * 0.2 + width * 0.28);
        ctx.lineTo(x - length * 0.28, y + rise * 0.28 + width * 0.82);
        ctx.lineTo(x - length * 0.57, y + rise * 0.57 + width * 0.45);
        ctx.lineTo(x - length, y + rise);
        ctx.lineTo(x - length * 0.77, y + rise * 0.77 - width * 0.22);
        ctx.lineTo(x - length * 0.65, y + rise * 0.65 - width * 0.78);
        ctx.lineTo(x - length * 0.32, y + rise * 0.32 - width * 0.35);
        ctx.closePath();
        ctx.fill();
        if (i % 2 !== 0)
            continue;
        const offset = width + 2 + grain(i + 389) * 5;
        ctx.strokeStyle = ctx.fillStyle;
        ctx.globalAlpha *= 0.52;
        ctx.lineWidth = monochrome ? 0.7 + grain(i + 443) * 0.7 : 0.6;
        ctx.beginPath();
        ctx.moveTo(x - length * 0.08, y + rise * 0.08 + offset);
        ctx.lineTo(x - length * 0.77, y + rise * 0.77 + offset);
        ctx.stroke();
    }
    ctx.restore();
}
