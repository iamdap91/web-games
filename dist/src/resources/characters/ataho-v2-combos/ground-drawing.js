export function drawGroundEffects(ctx, samples, options) {
    const scale = options.scale;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (const sample of samples) {
        const progress = Math.min(1, sample.ageMs / sample.durationMs);
        const spread = 1 - (1 - progress) ** 2;
        const opacity = (1 - progress) ** 1.5 * sample.strength;
        if (opacity <= 0)
            continue;
        const slide = sample.kind === 'slide';
        const particleCount = sample.kind === 'landing' ? 5 : 3;
        ctx.save();
        ctx.globalAlpha *= opacity;
        // 반짝이는 충격파 대신 나무 바닥과 같은 색의 낮고 짧은 마찰 자국을 둔다.
        ctx.fillStyle = '#79583d';
        ctx.globalAlpha *= 0.32;
        const trail = (2 + spread * (slide ? 6 : 3)) * scale;
        ctx.fillRect(Math.round(sample.x - trail * (slide && sample.direction > 0 ? 1 : 0.5)), Math.round(sample.y), Math.ceil(trail), scale);
        ctx.restore();
        ctx.save();
        ctx.globalAlpha *= opacity * 0.68;
        for (let index = 0; index < particleCount; index++) {
            const side = slide ? -sample.direction : index % 2 === 0 ? -1 : 1;
            const distance = (0.8 + spread * (2.2 + index * 0.8)) * scale;
            const rise = Math.sin(progress * Math.PI) * (0.8 + (index % 3) * 0.6);
            const size = index % 3 === 0 ? 2 : 1;
            ctx.fillStyle = index % 2 === 0 ? '#dfbc8a' : '#cba575';
            ctx.fillRect(Math.round(sample.x + side * distance), Math.round(sample.y - (rise + size) * scale), size * scale, scale);
        }
        ctx.restore();
    }
    ctx.restore();
}
