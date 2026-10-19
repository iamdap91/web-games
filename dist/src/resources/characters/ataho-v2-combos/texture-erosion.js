function noise(column, row, seed) {
    let value = Math.imul(column, 374761393) ^ Math.imul(row, 668265263) ^ seed;
    value = Math.imul(value ^ (value >>> 13), 1274126177);
    return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}
function threshold(column, row, seed) {
    // 작은 구멍이 가까운 구멍과 한 덩어리로 벌어지도록 거친 노이즈장을 공유한다.
    const cluster = noise(Math.floor(column / 4), Math.floor(row / 4), seed);
    return cluster * 0.72 + noise(column, row, seed + 71) * 0.28;
}
/** 남은 픽셀만 통과시켜 이미 그린 몸과 배경의 알파에는 손대지 않는다. */
export function drawWithTextureErosion(ctx, options, draw) {
    if (options.progress <= 0) {
        draw();
        return;
    }
    if (options.progress >= 1)
        return;
    const { bounds } = options;
    const pixelSize = Math.max(1, options.pixelSize ?? 2);
    const firstColumn = Math.floor(bounds.x / pixelSize);
    const lastColumn = Math.ceil((bounds.x + bounds.width) / pixelSize);
    const firstRow = Math.floor(bounds.y / pixelSize);
    const lastRow = Math.ceil((bounds.y + bounds.height) / pixelSize);
    const direction = options.direction;
    const directionX = direction ? direction.to.x - direction.from.x : 0;
    const directionY = direction ? direction.to.y - direction.from.y : 0;
    const lengthSquared = directionX * directionX + directionY * directionY;
    const hasDirection = !!direction && lengthSquared > 0;
    const noiseWeight = hasDirection ? 0.26 : 1;
    const edgeRange = 0.12 * noiseWeight;
    const path = new Path2D();
    const edge = options.edgeGlow ? new Path2D() : undefined;
    for (let row = firstRow; row < lastRow; row += 1) {
        let runStart;
        for (let column = firstColumn; column <= lastColumn; column += 1) {
            const grain = threshold(column, row, options.seed);
            const along = hasDirection && direction
                ? Math.min(1, Math.max(0, ((column * pixelSize + pixelSize / 2 - direction.from.x) *
                    directionX +
                    (row * pixelSize + pixelSize / 2 - direction.from.y) *
                        directionY) /
                    lengthSquared))
                : 0;
            // 전진하는 후단 앞쪽의 작은 구멍부터 무너져 직선 와이프와 구별된다.
            const value = along * (1 - noiseWeight) + grain * noiseWeight;
            const survives = column < lastColumn && value >= options.progress;
            if (edge && survives && value < options.progress + edgeRange)
                edge.rect(column * pixelSize, row * pixelSize, pixelSize, pixelSize);
            if (survives && runStart === undefined)
                runStart = column;
            if (survives || runStart === undefined)
                continue;
            path.rect(runStart * pixelSize, row * pixelSize, (column - runStart) * pixelSize, pixelSize);
            runStart = undefined;
        }
    }
    ctx.save();
    ctx.clip(path);
    draw();
    ctx.restore();
    if (edge) {
        ctx.save();
        ctx.clip(edge);
        // 기공을 다시 그려 경계의 실제 알파만 밝힌다. 빈 노이즈 칸은 발광하지 않는다.
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha *= 0.85;
        draw();
        ctx.restore();
    }
}
