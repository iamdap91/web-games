import { battleLayout, drawAtaho, drawBattle, drawBear } from './battle.js';
import { label, line, noise, polygon } from './drawing.js';
import { height, width } from './types.js';
const komaMs = 1000 / 24;
const contactMs = battleLayout.contactMs;
const finishMs = contactMs + komaMs * 4;
export const shockKomaCuts = [
    contactMs,
    contactMs + komaMs,
    contactMs + komaMs * 2,
    finishMs,
];
function surface() {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const brush = canvas.getContext('2d', { willReadFrequently: true });
    if (!brush)
        throw new Error('쇼크코마 작화 판을 만들 수 없습니다.');
    return { canvas, brush };
}
function background(brush, style, reduced) {
    const paper = reduced ? '#7e8d99' : '#faf4e3';
    brush.fillStyle =
        style === 'color' ? '#e62d26' : style === 'negative' ? '#090b11' : paper;
    brush.fillRect(0, 0, width, height);
    if (reduced)
        return;
    const focus = { x: 540, y: 250 };
    // 원근 중심을 타점에 두되 폭이 다른 쐐기로 색면의 면적을 불균등하게 나눈다.
    polygon(brush, [
        { x: 0, y: 0 },
        { x: 445, y: 0 },
        { x: focus.x - 40, y: focus.y - 22 },
        { x: 0, y: 410 },
    ], style === 'color' ? '#121018' : style === 'negative' ? paper : '#18161c');
    polygon(brush, [
        { x: width, y: height },
        { x: 744, y: height },
        { x: focus.x + 14, y: focus.y + 26 },
        { x: width, y: 310 },
    ], style === 'color'
        ? '#ffd13c'
        : style === 'negative'
            ? '#e6372d'
            : '#dc3b2c');
    if (style !== 'ink')
        return;
    // 고정된 선화 판이다. 매 RAF마다 난수를 바꾸지 않아 코마 탐색과 GIF가 일치한다.
    for (let i = 0; i < 62; i++) {
        const angle = noise(i + 90) * Math.PI * 2;
        const radius = 160 + noise(i + 14) * 65;
        const x = focus.x + Math.cos(angle) * radius;
        const y = focus.y + Math.sin(angle) * radius;
        line(brush, [
            { x, y },
            {
                x: x + Math.cos(angle + 0.03) * (190 + noise(i + 9) * 480),
                y: y + Math.sin(angle + 0.03) * (190 + noise(i + 9) * 480),
            },
        ], i % 9 === 0 ? '#cc302a' : '#29242a', 1.1 + noise(i + 7) * 3.1);
    }
}
/** 실제 접촉 원화의 명암과 경계를 색면·반전·비백 선화로 교체한 세 장. */
class ShockKomaPlates {
    plates;
    calm;
    constructor(frame) {
        this.plates = [
            this.paint(frame, 'color', contactMs + 18),
            this.paint(frame, 'negative', contactMs + komaMs + 18),
            this.paint(frame, 'ink', contactMs + komaMs * 2 + 18),
        ];
        this.calm = this.paint(frame, 'ink', contactMs + 18, true);
    }
    paint(frame, style, timeMs, reduced = false) {
        const target = surface();
        const actors = surface();
        const current = { ...frame, reducedMotion: reduced };
        if (!reduced) {
            // 충격 작화만 타점 가까이 자른 컷으로 교체하고 복귀할 때 원래 구도로 돌아온다.
            actors.brush.translate(540 - battleLayout.impact.x * 1.45, 250 - battleLayout.impact.y * 1.45);
            actors.brush.scale(1.45, 1.45);
        }
        drawBear(actors.brush, current, { timeMs });
        drawAtaho(actors.brush, current, { timeMs, action: 'uppercut' });
        actors.brush.resetTransform();
        const source = actors.brush.getImageData(0, 0, width, height);
        const pixels = source.data;
        background(target.brush, style, reduced);
        const result = actors.brush.createImageData(width, height);
        const output = result.data;
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const p = (y * width + x) * 4;
                if (pixels[p + 3] < 40)
                    continue;
                const light = pixels[p] * 0.2126 +
                    pixels[p + 1] * 0.7152 +
                    pixels[p + 2] * 0.0722;
                const edge = pixels[p - 1] < 40 ||
                    pixels[p + 7] < 40 ||
                    pixels[p - width * 4 + 3] < 40 ||
                    pixels[p + width * 4 + 3] < 40;
                let color;
                if (style === 'color') {
                    color =
                        light < 60
                            ? [16, 13, 22]
                            : light < 137
                                ? [213, 36, 26]
                                : light < 210
                                    ? [255, 200, 46]
                                    : [255, 247, 211];
                }
                else if (style === 'negative') {
                    color =
                        light < 92
                            ? [250, 246, 228]
                            : light < 190
                                ? [19, 19, 26]
                                : [224, 56, 42];
                }
                else {
                    const ink = light < 57 ||
                        (light < 174 && (x + y * 2 + Math.floor(y / 17)) % 13 < 3);
                    color = reduced
                        ? ink
                            ? [39, 49, 61]
                            : [154, 170, 181]
                        : edge
                            ? [202, 42, 38]
                            : ink
                                ? [20, 18, 24]
                                : [250, 245, 227];
                }
                output[p] = color[0];
                output[p + 1] = color[1];
                output[p + 2] = color[2];
                output[p + 3] = pixels[p + 3];
            }
        }
        actors.brush.putImageData(result, 0, 0);
        target.brush.drawImage(actors.canvas, 0, 0);
        actors.canvas.width = actors.canvas.height = 1;
        return target.canvas;
    }
    draw(ctx, cell, reduced) {
        ctx.drawImage(reduced ? this.calm : this.plates[Math.min(cell, 2)], 0, 0);
    }
    dispose() {
        for (const canvas of [...this.plates, this.calm])
            canvas.width = canvas.height = 1;
    }
}
const surfaces = new WeakMap();
export function drawShockKoma(ctx, frame) {
    const active = frame.enhanced && frame.timeMs >= contactMs && frame.timeMs < finishMs;
    let plates = surfaces.get(ctx);
    // 접촉 때 판 생성으로 박자가 늦어지지 않도록 선택한 첫 화면에서 준비한다.
    if (frame.enhanced && !plates) {
        plates = new ShockKomaPlates(frame);
        surfaces.set(ctx, plates);
    }
    if (active && plates) {
        plates.draw(ctx, Math.floor((frame.timeMs - contactMs) / komaMs), frame.reducedMotion);
    }
    else {
        drawBattle(ctx, frame, { action: 'uppercut' });
    }
    ctx.fillStyle = '#10131dcc';
    ctx.fillRect(28, 468, frame.enhanced && !frame.reducedMotion ? 585 : 345, 36);
    label(ctx, frame.enhanced
        ? frame.reducedMotion
            ? '모션 감소 · 낮은 대비의 먹선 1장 유지'
            : '극단색 1코마 → 명암 반전 1코마 → 먹선 2코마 → 원색 복귀'
        : '같은 어퍼컷 · 같은 접촉 시각');
}
export function disposeShockKoma(ctx) {
    surfaces.get(ctx)?.dispose();
    surfaces.delete(ctx);
}
