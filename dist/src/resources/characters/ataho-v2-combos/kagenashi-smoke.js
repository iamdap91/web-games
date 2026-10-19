function insideLobe(x, y, lobe) {
    return (((x - lobe.x) / lobe.radiusX) ** 2 + ((y - lobe.y) / lobe.radiusY) ** 2 <= 1);
}
/** 같은 시각의 외곽을 재구성하고 음영 대신 팽창과 갈라짐으로 연기를 읽힌다. */
export function drawKagenashiSmoke(ctx, options) {
    const { origin, side, progress, scale } = options;
    if (progress <= 0 || progress >= 1)
        return 0;
    const expansion = 1 - (1 - Math.min(1, progress / 0.3)) ** 3;
    const separation = Math.max(0, (progress - 0.4) / 0.6);
    const erosion = Math.max(0, (progress - 0.58) / 0.42);
    const size = (0.45 + expansion * 0.55) * (1 - erosion * 0.82);
    const lobes = [
        {
            x: 5 - separation * 2,
            y: 2 + separation * 1.5,
            radiusX: 4.5 * size,
            radiusY: 2.8 * size,
        },
        {
            x: 10 + expansion * 2,
            y: 3.4 + separation * 2,
            radiusX: 5.4 * size,
            radiusY: 3.8 * size,
        },
        {
            x: 16 + expansion * 2 + separation * 3,
            y: 2.8 + separation,
            radiusX: 4 * size,
            radiusY: 3.1 * size,
        },
    ];
    const crackHeight = Math.max(0, (progress - 0.38) / 0.34) * 10;
    const crackWidth = 0.45 + separation * 1.4;
    const drift = Math.round(3 + (1 - (1 - progress) ** 2) * 8);
    const originX = Math.round(origin.x / scale) * scale;
    const originY = Math.round(origin.y / scale) * scale;
    ctx.save();
    ctx.fillStyle = '#cdb794';
    ctx.globalAlpha *=
        Math.min(1, progress / 0.06) * Math.min(1, (1 - progress) / 0.12) * 0.86;
    // 내부 음영 없이 논리 픽셀 외곽과 아래에서 자라는 틈만 그린다.
    for (let y = 0; y < 11; y++) {
        for (let x = 0; x < 27; x++) {
            const sampleX = x + 0.5;
            const sampleY = y + 0.5;
            if (!lobes.some((lobe) => insideLobe(sampleX, sampleY, lobe)))
                continue;
            if (sampleY < crackHeight &&
                (Math.abs(sampleX - (8 + sampleY * 0.22)) < crackWidth ||
                    Math.abs(sampleX - (15.2 - sampleY * 0.15)) < crackWidth))
                continue;
            const pixelX = side === 1 ? x + drift : -x - drift - 1;
            ctx.fillRect(originX + pixelX * scale, originY - (y + 1) * scale, scale, scale);
        }
    }
    ctx.restore();
    return progress < 0.62 ? 1 : 3;
}
