export const clamp = (t) => Math.max(0, Math.min(1, t));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = (t) => 1 - Math.pow(1 - clamp(t), 3);
export const smooth = (t) => {
    const x = clamp(t);
    return x * x * (3 - 2 * x);
};
export const rand = (seed) => {
    const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return n - Math.floor(n);
};
export function line(c, points, color, width = 2) {
    if (!points.length)
        return;
    c.beginPath();
    c.moveTo(...points[0]);
    for (const p of points.slice(1))
        c.lineTo(...p);
    c.strokeStyle = color;
    c.lineWidth = width;
    c.stroke();
}
export function sky(c, time = 0) {
    const g = c.createLinearGradient(0, 0, 0, 720);
    g.addColorStop(0, '#193548');
    g.addColorStop(0.6, '#a3bcbd');
    g.addColorStop(1, '#dfd6b7');
    c.fillStyle = g;
    c.fillRect(0, 0, 1280, 720);
    for (let i = 0; i < 11; i++) {
        const x = ((i * 227 + time * 13) % 1600) - 160, y = 70 + rand(i + 18) * 180;
        c.fillStyle = i % 2 ? '#e5e9d0' : '#c1d1ca';
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + 150, y - 18);
        c.lineTo(x + 270, y + 12);
        c.lineTo(x + 245, y + 31);
        c.lineTo(x + 35, y + 37);
        c.closePath();
        c.fill();
    }
}
export function background2D(c, time) {
    sky(c, time);
    c.fillStyle = '#536c70';
    for (let i = 0; i < 13; i++) {
        const x = i * 120 - 100 + Math.sin(time * 0.3) * 25;
        c.beginPath();
        c.moveTo(x, 470);
        c.lineTo(x + 70, 230 + rand(i) * 90);
        c.lineTo(x + 145, 470);
        c.fill();
    }
    c.fillStyle = '#293e45';
    c.fillRect(0, 490, 1280, 230);
    for (let i = 0; i < 18; i++) {
        c.fillStyle = i % 2 ? '#5b7774' : '#75918a';
        c.fillRect(i * 85 - 50, 490 + rand(i + 2) * 150, 100, 3);
    }
    c.fillStyle = '#142e35';
    for (let i = 0; i < 9; i++) {
        c.beginPath();
        c.moveTo(i * 170 - 90, 720);
        c.lineTo(i * 170 + 40, 570 + rand(i) * 60);
        c.lineTo(i * 170 + 170, 720);
        c.fill();
    }
}
/** 배경만 한 방향으로 노출을 겹쳐 흐린다. 임의의 띠 변위로 공간을 찢지 않는다. */
export function smearBackground(c, surfaces, draw, amount, vertical = false) {
    const full = surfaces.get('background');
    draw(full);
    if (amount <= 0.001) {
        c.drawImage(full.canvas, 0, 0);
        return;
    }
    const small = surfaces.get('background-small', 426, 240);
    small.imageSmoothingEnabled = true;
    small.drawImage(full.canvas, 0, 0, 426, 240);
    c.save();
    c.imageSmoothingEnabled = true;
    c.drawImage(small.canvas, 0, 0, 1280, 720);
    const strength = clamp(amount);
    for (let index = 6; index >= 1; index--) {
        const offset = (index / 6) * 110 * strength;
        c.globalAlpha = 0.07 + (1 - index / 6) * 0.05;
        c.drawImage(small.canvas, vertical ? 0 : -offset, vertical ? -offset : 0, 1280 + (vertical ? 0 : offset), 720 + (vertical ? offset : 0));
    }
    c.restore();
}
export function speedLines(c, time, amount = 1, vertical = false) {
    if (amount <= 0)
        return;
    c.save();
    c.globalAlpha = 0.65 * clamp(amount);
    for (let i = 0; i < 38; i++) {
        const p = rand(i + 8), q = rand(i + 18), a = ((time * 1.9 + p) % 1) * 1550 - 180;
        if (vertical)
            line(c, [
                [p * 1280, a * 0.6],
                [p * 1280, a * 0.6 + 40 + q * 210],
            ], i % 3 ? '#d5ecde' : '#101d2b', 1 + q * 4);
        else
            line(c, [
                [a, q * 720],
                [a + 50 + p * 300, q * 720],
            ], i % 3 ? '#e8f4d9' : '#142738', 1 + q * 4);
    }
    c.restore();
}
export function burst(c, x, y, progress, size = 180, color = '#ffdc83') {
    if (progress < 0 || progress > 1)
        return;
    const p = clamp(progress);
    c.save();
    c.translate(x, y);
    c.globalAlpha = 1 - p;
    c.fillStyle = color;
    c.beginPath();
    for (let i = 0; i < 24; i++) {
        const a = (i * Math.PI) / 12, r = size * (i % 2 ? 0.18 : 0.65 + rand(i) * 0.4) * (1 + p);
        const px = Math.cos(a) * r, py = Math.sin(a) * r * 0.7;
        if (i === 0)
            c.moveTo(px, py);
        else
            c.lineTo(px, py);
    }
    c.closePath();
    c.fill();
    c.strokeStyle = '#fffdeb';
    c.lineWidth = 8 * (1 - p);
    c.beginPath();
    c.ellipse(0, 0, size * p * 1.5, size * p * 0.8, 0, 0, Math.PI * 2);
    c.stroke();
    c.restore();
}
/** 원본 몸은 유지하고 접촉점의 짧은 권격 궤적만 늘인다. */
export function fistSmear(c, x, y, progress, angle = 0, size = 190, source) {
    if (progress < 0 || progress > 1)
        return;
    const p = clamp(progress);
    if (source) {
        // 확인한 원본 전완 패치만 손목 축으로 돌려 늘린다. 몸·얼굴은 합성하지 않는다.
        const { crop, image } = source, base = size / 58, stretch = 1 + Math.sin(p * Math.PI) * 2.1;
        c.save();
        c.translate(x - Math.cos(angle) * size * 0.5, y - Math.sin(angle) * size * 0.5);
        c.rotate(angle + Math.PI / 2);
        c.globalAlpha = Math.sin(p * Math.PI);
        c.imageSmoothingEnabled = false;
        c.drawImage(image, crop.x, crop.y, crop.width, crop.height, -crop.wristX * base, -crop.wristY * base * stretch, crop.width * base, crop.height * base * stretch);
        c.restore();
    }
    c.save();
    c.translate(x, y);
    c.rotate(angle);
    c.globalAlpha = Math.sin(p * Math.PI);
    c.fillStyle = '#fff6ce';
    c.beginPath();
    c.moveTo(-size, 30);
    c.bezierCurveTo(-size * 0.2, -size * 0.75, size * 0.7, -size * 0.4, size, 0);
    c.bezierCurveTo(size * 0.45, -size * 0.08, -size * 0.3, -size * 0.15, -size, 30);
    c.fill();
    for (let i = 0; i < 8; i++)
        line(c, [
            [-size * (0.4 + rand(i) * 0.6), 20 + i * 3],
            [size * 0.9, rand(i + 30) * 30 - 20],
        ], i % 2 ? '#e5be72' : '#fffdec', 2 + (i % 3));
    c.restore();
}
export function finishMatte(c) {
    const g = c.createRadialGradient(640, 330, 200, 640, 360, 750);
    g.addColorStop(0, '#0000');
    g.addColorStop(1, '#07121c75');
    c.fillStyle = g;
    c.fillRect(0, 0, 1280, 720);
    c.fillStyle = '#071017';
    c.fillRect(0, 0, 1280, 26);
    c.fillRect(0, 694, 1280, 26);
}
