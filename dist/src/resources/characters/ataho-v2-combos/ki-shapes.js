export function clamp(value) {
    return Math.max(0, Math.min(1, value));
}
export function polygon(ctx, points, color) {
    const first = points[0];
    if (!first)
        return;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    for (const point of points.slice(1))
        ctx.lineTo(point.x, point.y);
    ctx.closePath();
    ctx.fill();
}
export function ellipse(ctx, point, radiusX, radiusY, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(point.x, point.y, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.fill();
}
export function line(ctx, points, color, width) {
    const first = points[0];
    if (!first)
        return;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    for (const point of points.slice(1))
        ctx.lineTo(point.x, point.y);
    ctx.stroke();
}
