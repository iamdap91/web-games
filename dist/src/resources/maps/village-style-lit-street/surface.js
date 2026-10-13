import { heightNormal, surfaceDiffuse } from '../village-style-lit2d/normal.js';
function canvasContext(canvas) {
    const context = canvas.getContext('2d');
    if (!context)
        throw new Error('2D Canvas를 사용할 수 없어요.');
    return context;
}
/** 색과 높이장을 따로 기록한다. 조명 이동은 각 픽셀의 실제 normal·거리·색에 반응한다. */
export class LitSurface {
    width;
    height;
    canvas = document.createElement('canvas');
    context;
    heights;
    colors = null;
    output = null;
    normals;
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.canvas.width = width;
        this.canvas.height = height;
        this.context = canvasContext(this.canvas);
        this.heights = new Float32Array(width * height);
        this.normals = new Float32Array(width * height * 3);
    }
    rect(x, y, width, height, color, relief = 0) {
        x = Math.round(x);
        y = Math.round(y);
        width = Math.round(width);
        height = Math.round(height);
        this.context.fillStyle = color;
        this.context.fillRect(x, y, width, height);
        for (let yy = Math.max(0, y); yy < Math.min(this.height, y + height); yy++)
            for (let xx = Math.max(0, x); xx < Math.min(this.width, x + width); xx++) {
                const edge = Math.min(xx - x, x + width - xx - 1, yy - y, y + height - yy - 1);
                this.heights[yy * this.width + xx] =
                    relief * Math.min(1, (edge + 1) / 3);
            }
    }
    poly(points, color) {
        const c = this.context;
        c.beginPath();
        points.forEach((p, i) => (i === 0 ? c.moveTo(...p) : c.lineTo(...p)));
        c.closePath();
        c.fillStyle = color;
        c.fill();
    }
    seal() {
        this.colors = this.context.getImageData(0, 0, this.width, this.height);
        this.output = this.context.createImageData(this.width, this.height);
        const get = (x, y) => this.heights[Math.max(0, Math.min(this.height - 1, y)) * this.width +
            Math.max(0, Math.min(this.width - 1, x))] ?? 0;
        for (let y = 0; y < this.height; y++)
            for (let x = 0; x < this.width; x++) {
                const n = heightNormal(get(x - 1, y), get(x + 1, y), get(x, y - 1), get(x, y + 1));
                const i = (y * this.width + x) * 3;
                this.normals[i] = n.x;
                this.normals[i + 1] = n.y;
                this.normals[i + 2] = n.z;
            }
    }
    shade(lights) {
        if (!this.colors || !this.output)
            return;
        for (let y = 0; y < this.height; y++)
            for (let x = 0; x < this.width; x++) {
                const pixel = y * this.width + x;
                const i = pixel * 4;
                if (!this.colors.data[i + 3])
                    continue;
                const n = {
                    x: this.normals[pixel * 3] ?? 0,
                    y: this.normals[pixel * 3 + 1] ?? 0,
                    z: this.normals[pixel * 3 + 2] ?? 1,
                };
                let warm = 0;
                for (const light of lights) {
                    const dx = light.x - x, dy = y - light.y;
                    const attenuation = 1 / (1 + (dx * dx + dy * dy) / 20000);
                    warm +=
                        surfaceDiffuse(n, { x: dx, y: dy, z: 75 }) *
                            attenuation *
                            light.power;
                }
                this.output.data[i] = Math.min(255, (this.colors.data[i] ?? 0) * (0.61 + warm * 0.78));
                this.output.data[i + 1] = Math.min(255, (this.colors.data[i + 1] ?? 0) * (0.67 + warm * 0.57));
                this.output.data[i + 2] = Math.min(255, (this.colors.data[i + 2] ?? 0) * (0.77 + warm * 0.29));
                this.output.data[i + 3] = this.colors.data[i + 3] ?? 0;
            }
        this.context.putImageData(this.output, 0, 0);
    }
    get reliefSamples() {
        return this.heights.filter((v) => v > 0).length;
    }
    dispose() {
        this.canvas.width = this.canvas.height = 1;
        this.colors = this.output = null;
        this.normals = new Float32Array(0);
    }
}
