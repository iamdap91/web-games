import { normalPixels } from './normal.js';
export const mapSize = { width: 640, height: 400 };
export function mapPoint(point) {
    return { x: 320 + point.x * 20, y: 235 + point.z * 12 };
}
function context(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx)
        throw new Error('Canvas를 사용할 수 없어요.');
    return ctx;
}
function canvas() {
    const c = document.createElement('canvas');
    c.width = mapSize.width;
    c.height = mapSize.height;
    return c;
}
/** 세 지도는 동일한 픽셀 좌표를 사용하며 색과 요철을 독립적으로 기록한다. */
export function createVillageArt(restored) {
    const albedo = canvas(), normal = canvas(), mask = canvas();
    const c = context(albedo), m = context(mask), heights = new Float32Array(mapSize.width * mapSize.height);
    c.imageSmoothingEnabled = false;
    m.fillStyle = '#090000';
    m.fillRect(0, 0, 640, 400);
    const rect = (x, y, w, h, color, height = 0, emission = 0) => {
        x = Math.round(x);
        y = Math.round(y);
        w = Math.round(w);
        h = Math.round(h);
        c.fillStyle = color;
        c.fillRect(x, y, w, h);
        for (let yy = Math.max(0, y); yy < Math.min(400, y + h); yy++)
            for (let xx = Math.max(0, x); xx < Math.min(640, x + w); xx++) {
                const edge = Math.min(xx - x, x + w - 1 - xx, yy - y, y + h - 1 - yy);
                heights[yy * 640 + xx] = height * Math.min(1, (edge + 1) / 3);
            }
        m.fillStyle = `rgb(${emission},0,0)`;
        m.fillRect(x, y, w, h);
    };
    const poly = (points, color) => {
        c.fillStyle = color;
        c.beginPath();
        for (const [i, p] of points.entries()) {
            if (i === 0)
                c.moveTo(p[0], p[1]);
            else
                c.lineTo(p[0], p[1]);
        }
        c.closePath();
        c.fill();
    };
    const random = (seed) => {
        const n = Math.sin(seed * 91.73 + 4.8) * 43219;
        return n - Math.floor(n);
    };
    rect(0, 0, 640, 400, '#152730');
    poly([
        [30, 375],
        [53, 180],
        [67, 102],
        [191, 57],
        [490, 64],
        [577, 127],
        [611, 376],
    ], '#2c4143');
    // 어두운 배경 위에 읽히는 돌길을 먼저 놓고 가장자리에 식생을 모은다.
    rect(94, 163, 452, 190, '#5d645c');
    for (let y = 168; y < 352; y += 9)
        for (let x = 96; x < 544; x += 17) {
            const offset = (Math.floor(y / 9) % 2) * 8;
            rect(x + offset, y, 15, 7, ['#697366', '#77816e', '#8a8a76'][Math.floor(random(x + y) * 3)] ??
                '#768270', 2 + random(x * y) * 2);
        }
    for (let i = 0; i < 170; i++) {
        const x = 40 + random(i) * 557, y = 71 + random(i + 400) * 297;
        if (x > 90 && x < 553 && y > 154 && y < 358)
            continue;
        rect(x, y, 4 + random(i + 8) * 4, 2, '#3d5850', 2);
        rect(x + 1, y - 1, 2, 2, '#6c7b5b', 3);
    }
    const house = (x, y, w, label, roof, wood) => {
        rect(x - w / 2 - 6, y + 2, w + 16, 7, '#253738');
        rect(x - w / 2, y - 62, w, 62, '#363932');
        for (let row = 0; row < 7; row++)
            for (let col = 0; col < w - 7; col += 17) {
                const offset = (row % 2) * 8;
                const xx = x - w / 2 + 3 + col + offset;
                if (xx + 14 < x + w / 2)
                    rect(xx, y - 58 + row * 8, 14, 6, row % 3 ? '#a4946e' : '#8d8866', 5);
            }
        rect(x - w / 2 - 9, y - 76, w + 18, 12, '#263c43');
        for (let row = 0; row < 4; row++)
            for (let col = 0; col < w + 8 - (3 - row) * 9; col += 10) {
                const xx = x - w / 2 - 6 + (3 - row) * 5 + col + (row % 2) * 4, yy = y - 108 + row * 8;
                if (xx < x + w / 2 + 9)
                    rect(xx, yy, 9, 7, roof, 6 + row);
            }
        rect(x - w / 2 - 8, y - 78, w + 16, 5, '#c0b383', 7);
        rect(x - w / 2 + 10, y - 112, w - 20, 4, '#a5a487', 6);
        rect(x - w / 2 - 12, y - 82, 8, 4, roof, 7);
        rect(x + w / 2 + 4, y - 82, 8, 4, roof, 7);
        rect(x - w / 2 + 2, y - 68, w - 4, 6, wood, 5);
        rect(x - 13, y - 47, 26, 48, '#282f2c', 2);
        for (let col = 0; col < 5; col++)
            rect(x - 11 + col * 5, y - 44, 3, 41, wood, 6);
        rect(x - 16, y - 3, 32, 4, '#c2af7b', 5);
        for (const side of [-1, 1]) {
            rect(x + side * (w * 0.32) - 10, y - 47, 20, 27, '#303b3c', 3);
            rect(x + side * (w * 0.32) - 7, y - 43, 14, 18, '#ecc583', 2, restored ? 165 : 75);
            rect(x + side * (w * 0.32) - 1, y - 45, 2, 24, wood, 5);
            rect(x + side * (w * 0.32) - 9, y - 34, 18, 2, wood, 5);
        }
        rect(x - 28, y - 66, 56, 14, '#374344', 4);
        c.font = 'bold 9px monospace';
        c.textAlign = 'center';
        c.fillStyle = '#ddc99a';
        c.fillText(label, x, y - 56);
        const lantern = (lx) => {
            rect(lx - 5, y - 39, 10, 14, restored ? '#ec9960' : '#af7455', 3, restored ? 200 : 95);
            rect(lx - 6, y - 41, 12, 3, '#343a34', 3);
            rect(lx - 6, y - 24, 12, 2, '#443a2c', 3);
        };
        lantern(x - w / 2 - 1);
        lantern(x + w / 2 + 1);
        rect(x + w / 2 - 20, y - 120, 13, 17, '#6d776d', 4);
        rect(x + w / 2 - 22, y - 122, 17, 4, '#acaf8a', 6);
    };
    house(148, 173, 99, '茶房', '#56766d', '#866647');
    house(340, 175, 141, restored ? '道場' : '修繕中', restored ? '#608e87' : '#5c6861', restored ? '#aa8153' : '#72664d');
    house(521, 171, 78, '工房', '#876a53', '#96744e');
    if (!restored) {
        rect(300, 135, 76, 5, '#b1a07a', 5);
        rect(323, 118, 6, 43, '#8f8064', 5);
    }
    const barrel = (x, y) => {
        rect(x - 9, y - 20, 18, 21, '#403d32', 3);
        for (let i = 0; i < 4; i++)
            rect(x - 7 + i * 4, y - 19, 3, 18, '#967852', 4);
        rect(x - 10, y - 16, 20, 3, '#778075', 3);
        rect(x - 10, y - 5, 20, 3, '#778075', 3);
    };
    barrel(79, 208);
    barrel(567, 211);
    barrel(222, 183);
    barrel(437, 183);
    const h = mapPoint({ x: -7, z: 3 });
    rect(h.x - 18, h.y - 32, 36, 32, '#3f4841', 1);
    for (let row = 0; row < 4; row++)
        for (let col = 0; col < 3; col++)
            rect(h.x - 17 + col * 12 + (row % 2) * 2, h.y - 30 + row * 7, 10, 5, '#a4a387', 5);
    rect(h.x - 20, h.y - 35, 40, 5, '#c0b993', 6);
    rect(h.x - 9, h.y - 17, 18, 18, '#2c3431', 0);
    rect(h.x - 5, h.y - 10, 10, 9, '#eca962', 2, 235);
    rect(h.x - 2, h.y - 15, 4, 14, '#f5d992', 2, 245);
    const bench = mapPoint({ x: 8, z: 4.7 });
    rect(bench.x - 37, bench.y - 18, 74, 6, '#9b7e58', 7);
    rect(bench.x - 35, bench.y - 11, 70, 6, '#b49864', 6);
    for (const dx of [-30, 29])
        rect(bench.x + dx, bench.y - 4, 5, 11, '#725e44', 5);
    for (const x of [109, 526]) {
        rect(x, 274, 3, 42, '#78664c', 4);
        rect(x - 7, 271, 18, 4, '#b0a37e', 5);
        rect(x - 4, 274, 12, 14, '#dfba73', 3, 140);
    }
    const plant = (x, y) => {
        rect(x - 8, y - 9, 16, 12, '#96715a', 4);
        rect(x - 10, y - 12, 20, 4, '#c5a57c', 5);
        for (let i = 0; i < 7; i++) {
            rect(x - 10 + random(i + x) * 19, y - 14 - random(i + y) * 14, 4, 8, '#567957', 3);
            rect(x - 9 + random(i + x) * 19, y - 17 - random(i + y) * 14, 3, 3, '#9a9c70', 5);
        }
    };
    for (const [x, y] of [
        [67, 271],
        [83, 342],
        [570, 343],
        [595, 265],
        [254, 182],
        [418, 181],
    ])
        if (x !== undefined && y !== undefined)
            plant(x, y);
    c.textAlign = 'center';
    c.font = '9px monospace';
    c.fillStyle = '#cbc89f';
    c.fillText('불빛 화덕', h.x, h.y + 26);
    c.fillText('달빛 쉼터', bench.x, bench.y + 35);
    rect(286, 357, 68, 3, '#beaf81', 4);
    context(normal).putImageData(new ImageData(normalPixels(heights, 640, 400), 640, 400), 0, 0);
    return { albedo, normal, mask };
}
