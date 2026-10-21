import { drawGameStoneFace } from '../anime-showcase/technique-effect-resources.js';
import { clamp, line } from './drawing.js';
function polygon(context, points, color) {
    if (!points.length)
        return;
    context.beginPath();
    points.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
    context.closePath();
    context.fillStyle = color;
    context.fill();
}
/** 접촉 면과 같은 좌표의 돌벽에 기존 현무암의 픽셀 면색을 얹는다. */
export function drawStoneWall(context, frame, options) {
    const [a, b, c, d] = options.face;
    if (!a || !b || !c || !d)
        return;
    const depth = options.depth ?? 38;
    const shift = (point) => ({
        x: point.x + depth,
        y: point.y - depth * 0.6,
    });
    context.save();
    polygon(context, [b, shift(b), shift(c), c], '#2c3739');
    polygon(context, [a, shift(a), shift(b), b], '#70796b');
    polygon(context, options.face, '#515e58');
    drawGameStoneFace(context, frame, options.face);
    line(context, [...options.face, a].map((point) => [point.x, point.y]), '#273d37', 5);
    // 같은 면 안의 층리를 남겨 벽이 충돌 때만 나타나는 판처럼 보이지 않게 한다.
    for (const fraction of [0.28, 0.62, 0.83]) {
        const left = {
            x: a.x + (d.x - a.x) * fraction,
            y: a.y + (d.y - a.y) * fraction,
        };
        const right = {
            x: b.x + (c.x - b.x) * fraction,
            y: b.y + (c.y - b.y) * fraction,
        };
        line(context, [
            [left.x, left.y],
            [right.x, right.y],
        ], '#233b3875', 3);
    }
    const crack = clamp(options.crack ?? 0);
    if (options.contact && crack > 0) {
        context.save();
        context.beginPath();
        options.face.forEach((point, index) => index
            ? context.lineTo(point.x, point.y)
            : context.moveTo(point.x, point.y));
        context.closePath();
        context.clip();
        for (let index = 0; index < 7; index++) {
            const angle = (index * Math.PI * 2) / 7 + 0.23;
            const length = (35 + (index % 3) * 22) * crack;
            const { x, y } = options.contact;
            line(context, [
                [x, y],
                [
                    x + Math.cos(angle + 0.2) * length * 0.5,
                    y + Math.sin(angle + 0.2) * length * 0.5,
                ],
                [x + Math.cos(angle) * length, y + Math.sin(angle) * length],
            ], '#1e3332', 3);
        }
        context.restore();
    }
    context.restore();
}
/** 벽 접점은 짧은 별빛으로 읽히고 상대 명중의 큰 충격 코마와 구분한다. */
export function drawContactStar(context, options) {
    if (options.age < 0 || options.age >= 0.13)
        return;
    const progress = options.age / 0.13;
    const size = (options.size ?? 65) * (0.6 + progress * 0.55);
    context.save();
    context.globalAlpha *= (1 - progress) ** 0.7;
    for (let index = 0; index < 8; index++) {
        const angle = (index * Math.PI) / 4;
        const reach = size * (index % 2 ? 0.48 : 1);
        line(context, [
            [
                options.point.x + Math.cos(angle) * size * 0.12,
                options.point.y + Math.sin(angle) * size * 0.12,
            ],
            [
                options.point.x + Math.cos(angle) * reach,
                options.point.y + Math.sin(angle) * reach,
            ],
        ], index % 2 ? '#b5ded0' : '#fff2c4', index % 2 ? 3 : 5);
    }
    polygon(context, [
        { x: options.point.x - 7, y: options.point.y },
        { x: options.point.x, y: options.point.y - 14 },
        { x: options.point.x + 7, y: options.point.y },
        { x: options.point.x, y: options.point.y + 14 },
    ], '#fffce6');
    context.restore();
}
