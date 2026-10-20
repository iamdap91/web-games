import { drawBattle } from './battle.js';
import { noise } from './drawing.js';
const pigments = [
    [30, 28, 39],
    [63, 54, 65],
    [104, 77, 71],
    [142, 96, 66],
    [187, 129, 72],
    [221, 166, 97],
    [246, 216, 161],
    [250, 235, 200],
    [56, 76, 91],
    [87, 111, 121],
    [144, 161, 158],
    [192, 199, 181],
];
function pigment(r, g, b) {
    let best = pigments[0];
    let distance = Infinity;
    for (const color of pigments) {
        const difference = (r - color[0]) ** 2 + (g - color[1]) ** 2 + (b - color[2]) ** 2;
        if (difference < distance) {
            best = color;
            distance = difference;
        }
    }
    return best;
}
/** 접촉 원화를 밑그림으로 삼아 인물과 배경을 같은 안료·붓자국으로 다시 칠한 종결 판. */
class HarmonyPlate {
    canvas = document.createElement('canvas');
    constructor(frame) {
        this.canvas.width = 960;
        this.canvas.height = 540;
        const brush = this.canvas.getContext('2d');
        if (!brush)
            throw new Error('하모니 종결 판을 만들 수 없습니다.');
        const source = document.createElement('canvas');
        source.width = 480;
        source.height = 270;
        const underdrawing = source.getContext('2d', { willReadFrequently: true });
        if (!underdrawing)
            throw new Error('하모니 밑그림을 만들 수 없습니다.');
        underdrawing.scale(0.5, 0.5);
        // 종결 판은 인물이 작은 일반 전경 대신 타격의 두 실루엣을 중심으로 잡는다.
        underdrawing.translate(520 - 584 * 1.22, 260 - 246 * 1.22);
        underdrawing.scale(1.22, 1.22);
        drawBattle(underdrawing, frame, { timeMs: 1830 });
        const pixels = underdrawing.getImageData(0, 0, 480, 270).data;
        brush.fillStyle = '#dfd0ab';
        brush.fillRect(0, 0, 960, 540);
        // 필터를 덮는 대신 배경과 인물의 색면 전체를 제한된 안료로 다시 쌓는다.
        for (let y = 0; y < 270; y += 2) {
            for (let x = 0; x < 480; x += 2) {
                const index = (y * 480 + x) * 4;
                const color = pigment(pixels[index], pixels[index + 1], pixels[index + 2]);
                const seed = y * 480 + x;
                const grain = 0.93 + noise(seed) * 0.14;
                brush.fillStyle = `rgb(${color.map((v) => Math.round(v * grain)).join(' ')})`;
                brush.beginPath();
                brush.ellipse(x * 2 + 1, y * 2 + 1, 3.6 + noise(seed + 3) * 1.2, 2.6, -0.45, 0, Math.PI * 2);
                brush.fill();
                // 원화의 경계에서만 선을 살려 색면 위에 선화가 올라온 관계를 만든다.
                const next = index + 4;
                const edge = Math.abs(pixels[index] - (pixels[next] ?? pixels[index])) +
                    Math.abs(pixels[index + 1] - (pixels[next + 1] ?? pixels[index + 1]));
                if (x < 478 && edge > 115) {
                    brush.strokeStyle = '#282431b0';
                    brush.lineWidth = 1.8;
                    brush.beginPath();
                    brush.moveTo(x * 2 + 2, y * 2 - 1);
                    brush.lineTo(x * 2 + 3, y * 2 + 4);
                    brush.stroke();
                }
            }
        }
        source.width = source.height = 1;
    }
    draw(ctx) {
        ctx.drawImage(this.canvas, 0, 0);
    }
    dispose() {
        this.canvas.width = this.canvas.height = 1;
    }
}
const plates = new WeakMap();
export function drawHarmonyPlate(ctx, frame) {
    let variants = plates.get(ctx);
    if (!variants) {
        variants = new Map();
        plates.set(ctx, variants);
    }
    let plate = variants.get(frame.reducedMotion);
    if (!plate) {
        plate = new HarmonyPlate(frame);
        // 감소 모드의 피격 위치가 다르므로 먼저 연 판을 다른 모드에 재사용하지 않는다.
        variants.set(frame.reducedMotion, plate);
    }
    plate.draw(ctx);
}
export function disposeHarmonyPlate(ctx) {
    plates.get(ctx)?.forEach((plate) => plate.dispose());
    plates.delete(ctx);
}
