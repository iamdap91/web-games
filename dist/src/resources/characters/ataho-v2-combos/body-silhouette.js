import { stageWidth, stageHeight } from './pose-drawing.js';
/** 화면이 표면을 소유하고 현재 자세의 알파에만 검은 종결 색을 더한다. */
export class BodySilhouette {
    canvas = document.createElement('canvas');
    context = this.canvas.getContext('2d');
    constructor() {
        this.canvas.width = stageWidth;
        this.canvas.height = stageHeight;
    }
    draw(ctx, drawBody, opacity) {
        if (opacity <= 0)
            return;
        const mask = this.context;
        mask.clearRect(0, 0, stageWidth, stageHeight);
        mask.save();
        drawBody(mask);
        mask.globalCompositeOperation = 'source-in';
        mask.fillStyle = '#10151b';
        mask.fillRect(0, 0, stageWidth, stageHeight);
        mask.restore();
        ctx.save();
        ctx.globalAlpha *= Math.min(1, opacity);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(this.canvas, 0, 0);
        ctx.restore();
    }
    destroy() {
        this.canvas.width = 0;
        this.canvas.height = 0;
    }
}
