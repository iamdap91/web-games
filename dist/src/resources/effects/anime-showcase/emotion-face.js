import { drawPortrait } from './battle.js';
import { ellipse, smooth } from './drawing.js';
export const portraitEyes = [
    { x: 433, y: 270, side: -1 },
    { x: 525, y: 257, side: 1 },
];
const face = { x: 345, y: 140, width: 270, height: 313 };
function falloff(x, y) {
    return Math.exp(-(x * x + y * y) * 2);
}
/** 원본의 털·눈·선화를 유지한 채 눈썹과 입 주변의 좌표만 바꾼다. */
class EmotionPortrait {
    source = document.createElement('canvas');
    pixels;
    expressions = new Map();
    constructor(frame) {
        this.source.width = face.width;
        this.source.height = face.height;
        const ctx = this.source.getContext('2d', { willReadFrequently: true });
        if (!ctx)
            throw new Error('감정 초상을 준비할 수 없습니다.');
        ctx.translate(-face.x, -face.y);
        drawPortrait(ctx, frame, face);
        this.pixels = ctx.getImageData(0, 0, face.width, face.height).data;
    }
    create(emotion) {
        const canvas = document.createElement('canvas');
        canvas.width = face.width;
        canvas.height = face.height;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            throw new Error('감정 표정을 그릴 수 없습니다.');
        const result = ctx.createImageData(face.width, face.height);
        for (let y = 0; y < face.height; y++) {
            for (let x = 0; x < face.width; x++) {
                const wx = x + face.x, wy = y + face.y;
                let sy = y;
                for (const eye of portraitEyes) {
                    const dx = wx - eye.x, dy = wy - eye.y;
                    const weight = falloff(dx / 40, dy / 43);
                    if (emotion === 'anger')
                        sy += eye.side * dx * 0.48 * weight;
                    if (emotion === 'sad')
                        sy -= eye.side * dx * 0.38 * weight;
                    if (emotion === 'shock' || emotion === 'white')
                        sy -= dy * 0.45 * weight;
                    if (emotion === 'empty')
                        sy += 3 * weight;
                }
                const mouth = falloff((wx - 482) / 51, (wy - 324) / 27);
                if (emotion === 'anger' || emotion === 'sad' || emotion === 'empty')
                    sy += 18 * mouth;
                const sourceY = Math.max(0, Math.min(face.height - 1, Math.round(sy)));
                let sourceIndex = (sourceY * face.width + x) * 4;
                // 놀란 입은 원래 입선만 가까운 턱 털의 픽셀로 메워 코와 뺨의 색면을 남긴다.
                const openMouth = emotion === 'shock' || emotion === 'white';
                const insideMouth = ((wx - 482) / 61) ** 2 + ((wy - 323) / 23) ** 2 < 1;
                if (openMouth &&
                    insideMouth &&
                    this.pixels[sourceIndex] +
                        this.pixels[sourceIndex + 1] +
                        this.pixels[sourceIndex + 2] <
                        360) {
                    sourceIndex =
                        (Math.min(face.height - 1, sourceY + 29) * face.width + x) * 4;
                }
                const destination = (y * face.width + x) * 4;
                for (let channel = 0; channel < 4; channel++)
                    result.data[destination + channel] =
                        this.pixels[sourceIndex + channel];
                if (emotion === 'empty') {
                    for (const eye of portraitEyes) {
                        if (((wx - eye.x) / 11) ** 2 + ((wy - eye.y) / 10) ** 2 >= 1)
                            continue;
                        const light = (result.data[destination] +
                            result.data[destination + 1] +
                            result.data[destination + 2]) /
                            3;
                        result.data[destination] = Math.min(113, light * 0.75);
                        result.data[destination + 1] = Math.min(103, light * 0.7);
                        result.data[destination + 2] = Math.min(81, light * 0.6);
                    }
                }
            }
        }
        ctx.putImageData(result, 0, 0);
        ctx.translate(-face.x, -face.y);
        if (emotion === 'white')
            for (const eye of portraitEyes)
                ellipse(ctx, eye.x, eye.y + 1, 18, 11, '#fff2d9');
        if (emotion === 'shock' || emotion === 'white') {
            ellipse(ctx, 482, 327, 10, 17, '#302322');
            ellipse(ctx, 482, 337, 6, 4, '#ac7569');
        }
        return canvas;
    }
    draw(ctx, emotion) {
        let canvas = this.expressions.get(emotion);
        if (!canvas) {
            canvas = this.create(emotion);
            this.expressions.set(emotion, canvas);
        }
        ctx.drawImage(canvas, face.x, face.y);
    }
    dispose() {
        this.source.width = this.source.height = 1;
        for (const canvas of this.expressions.values())
            canvas.width = canvas.height = 1;
        this.expressions.clear();
    }
}
const portraits = new WeakMap();
export function drawEmotionPortrait(ctx, frame, emotion, amount) {
    drawPortrait(ctx, frame, face);
    if (emotion === 'calm' || amount <= 0)
        return;
    let portrait = portraits.get(ctx);
    if (!portrait) {
        portrait = new EmotionPortrait(frame);
        portraits.set(ctx, portrait);
    }
    ctx.save();
    ctx.globalAlpha *= smooth(amount);
    portrait.draw(ctx, emotion);
    ctx.restore();
}
export function disposeEmotionPortrait(ctx) {
    portraits.get(ctx)?.dispose();
    portraits.delete(ctx);
}
