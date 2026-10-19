import { signatureHeight, signatureWidth, } from './contracts.js';
function unit(value) {
    return Math.max(0, Math.min(1, value));
}
function smooth(value) {
    const t = unit(value);
    return t * t * (3 - 2 * t);
}
function ellipse(ctx, x, y, width, height, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, width, height, 0, 0, Math.PI * 2);
    ctx.fill();
}
/** 기존 눈솔온천의 돌·물·대나무·눈 팔레트로 비교용 고정 배경을 만든다. */
function prepareSpring(ctx) {
    const sky = ctx.createLinearGradient(0, 0, 0, 385);
    sky.addColorStop(0, '#8da5a7');
    sky.addColorStop(1, '#d8ddd4');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, signatureWidth, signatureHeight);
    for (let index = 0; index < 12; index++) {
        const x = index * 92 - 58;
        const y = 94 + (index % 3) * 24;
        ctx.fillStyle = index % 2 ? '#6c847a' : '#71867f';
        ctx.beginPath();
        ctx.moveTo(x, 349);
        ctx.lineTo(x + 48, y);
        ctx.lineTo(x + 98, 349);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#d8ddd4';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(x + 29, y + 93);
        ctx.lineTo(x + 48, y + 55);
        ctx.lineTo(x + 68, y + 101);
        ctx.stroke();
    }
    ctx.fillStyle = '#d8ddd4';
    ctx.fillRect(0, 352, signatureWidth, signatureHeight - 352);
    ctx.fillStyle = '#a5aaa3';
    ctx.fillRect(0, 420, signatureWidth, 120);
    ctx.strokeStyle = '#838d84';
    ctx.lineWidth = 2;
    for (let row = 0; row < 4; row++) {
        const y = 420 + row * 38;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(signatureWidth, y);
        ctx.stroke();
        for (let x = (row % 2) * 83; x < signatureWidth; x += 170) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + 17, y + 38);
            ctx.stroke();
        }
    }
    // 곧은 울타리와 수평 홈통이 작은 굴절의 방향과 범위를 읽게 한다.
    for (let x = 418; x <= 850; x += 27) {
        ctx.fillStyle = '#83775e';
        ctx.fillRect(x, 206, 13, 180);
        ctx.fillStyle = '#ab9a78';
        ctx.fillRect(x + 3, 209, 3, 172);
    }
    ctx.fillStyle = '#756b54';
    ctx.fillRect(407, 236, 459, 12);
    ctx.fillRect(407, 308, 459, 11);
    ctx.fillStyle = '#e0e4d9';
    ctx.fillRect(405, 199, 463, 10);
    ellipse(ctx, 647, 411, 227, 75, '#858f88');
    ellipse(ctx, 647, 407, 204, 59, '#87aaa2');
    ellipse(ctx, 647, 399, 186, 44, '#95b4aa');
    for (let index = 0; index < 13; index++) {
        const angle = (index / 13) * Math.PI * 2;
        const x = 647 + Math.cos(angle) * 218;
        const y = 413 + Math.sin(angle) * 67;
        ellipse(ctx, x, y, 26 + (index % 3) * 4, 14 + (index % 2) * 4, '#8d9a92');
        ellipse(ctx, x - 4, y - 5, 23 + (index % 3) * 4, 10, '#abb5b0');
        if (Math.sin(angle) < 0)
            ellipse(ctx, x - 6, y - 10, 19, 5, '#e2e6dd');
    }
}
function drawSpout(ctx) {
    ctx.strokeStyle = '#79573e';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(457, 392);
    ctx.lineTo(457, 320);
    ctx.stroke();
    ctx.strokeStyle = '#6f8057';
    ctx.lineWidth = 19;
    ctx.beginPath();
    ctx.moveTo(427, 313);
    ctx.lineTo(546, 355);
    ctx.stroke();
    ctx.strokeStyle = '#98a775';
    ctx.lineWidth = 10;
    ctx.stroke();
    ctx.strokeStyle = '#c0c69b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(429, 308);
    ctx.lineTo(548, 350);
    ctx.stroke();
}
/** 정적 온천과 복사 표면의 수명을 소유하고 매 프레임에는 준비된 배경만 읽는다. */
export class HeatHazeSurface {
    background = document.createElement('canvas');
    disposed = false;
    constructor() {
        this.background.width = signatureWidth;
        this.background.height = signatureHeight;
        const ctx = this.background.getContext('2d');
        if (!ctx)
            throw new Error('온천 열굴절의 배경을 준비할 수 없습니다.');
        prepareSpring(ctx);
    }
    draw(ctx, frame) {
        if (this.disposed)
            throw new Error('정리된 온천 배경은 다시 재생할 수 없습니다.');
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(this.background, 0, 0);
        const heat = smooth((frame.timeMs - 450) / 1100) *
            (1 - smooth((frame.timeMs - 4170) / 630));
        let movedTiles = 0;
        if (frame.enhanced && !frame.reducedMotion && heat > 0) {
            const tile = 8;
            for (let y = 144; y < 392; y += tile) {
                for (let x = 432; x < 848; x += tile) {
                    const horizontal = Math.sin(unit((x - 432) / 416) * Math.PI) ** 1.2;
                    const vertical = unit((y - 144) / 180) * unit((392 - y) / 38);
                    const mask = horizontal * vertical * heat;
                    // y+time의 위상이 위로 이동한다. 직전 프레임의 흔들림을 다시 복사하지 않는다.
                    const flow = Math.sin(y * 0.072 + frame.timeMs * 0.006 + x * 0.017) +
                        Math.sin(y * 0.119 + frame.timeMs * 0.009 - x * 0.013) * 0.42;
                    const dx = Math.round(flow * mask * 3.1);
                    const dy = Math.round(Math.sin(x * 0.034 + y * 0.061 + frame.timeMs * 0.005) * mask * 0.9);
                    if (!dx && !dy)
                        continue;
                    ctx.drawImage(this.background, x + dx, y + dy, tile, tile, x, y, tile, tile);
                    movedTiles++;
                }
            }
        }
        this.drawWaterAndSteam(ctx, frame, heat);
        ctx.restore();
        return movedTiles;
    }
    drawWaterAndSteam(ctx, frame, heat) {
        const time = frame.reducedMotion ? 0 : frame.timeMs;
        // 물이 나오는 전경 홈통은 굴절 뒤에 그려 물줄기와의 접속을 선명하게 유지한다.
        drawSpout(ctx);
        if (frame.timeMs >= 450 && frame.timeMs < 4500) {
            ctx.strokeStyle = '#b5d3c7';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(547, 355);
            ctx.quadraticCurveTo(557, 371, 557, 393);
            ctx.stroke();
        }
        for (let index = 0; index < 3; index++) {
            const phase = (time / 2300 + index / 3) % 1;
            ctx.save();
            ctx.globalAlpha = (1 - phase) * (0.12 + heat * 0.18);
            ctx.strokeStyle = '#e2e6dd';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.ellipse(570, 401, 8 + phase * 73, 3 + phase * 16, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
        for (let index = 0; index < 6; index++) {
            const phase = (time / 4300 + index / 6) % 1;
            const x = 530 + (index % 3) * 89 + Math.sin(phase * 4 + index) * 13;
            const y = 392 - phase * 163;
            ctx.save();
            ctx.globalAlpha = Math.sin(phase * Math.PI) * (0.025 + heat * 0.045);
            ellipse(ctx, x, y, 21 + phase * 33, 13 + phase * 21, '#edf0e5');
            ctx.restore();
        }
    }
    dispose() {
        this.disposed = true;
        this.background.width = this.background.height = 1;
    }
}
