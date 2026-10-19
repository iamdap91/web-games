const unitScale = 2;
export function clamp(value) {
    return Math.max(0, Math.min(1, value));
}
export function sprite(context, image, frame, position, opacity = 1) {
    context.save();
    context.globalAlpha = opacity;
    context.drawImage(image, Math.round(position.x - frame.pivot.x * unitScale), Math.round(position.y - (frame.height - frame.pivot.y) * unitScale), frame.width * unitScale, frame.height * unitScale);
    context.restore();
}
/** 원본 그림의 작은 조각만 이동하며 새 자세나 좌우 반전을 만들지 않는다. */
export function scatter(context, image, frame, position, progress) {
    const amount = clamp(progress);
    const left = position.x - frame.pivot.x * unitScale;
    const top = position.y - (frame.height - frame.pivot.y) * unitScale;
    context.save();
    for (let y = 0; y < frame.height; y += 4) {
        for (let x = 0; x < frame.width; x += 4) {
            const seed = ((x * 13 + y * 7) % 29) / 29;
            context.globalAlpha = clamp(1 - amount * (1.1 + seed * 0.9));
            const offsetX = ((x - frame.width / 2) * 0.5 + (seed - 0.5) * 35) * amount;
            const offsetY = (-18 - seed * 26) * amount;
            context.drawImage(image, x, y, Math.min(4, frame.width - x), Math.min(4, frame.height - y), Math.round(left + x * unitScale + offsetX), Math.round(top + y * unitScale + offsetY), Math.min(4, frame.width - x) * unitScale, Math.min(4, frame.height - y) * unitScale);
        }
    }
    context.restore();
}
export function drawTarget(context, position, elapsed, contact, vector) {
    const hitTime = elapsed - contact;
    const recoil = hitTime < 0 ? 0 : Math.sin(clamp(hitTime / 0.19) * Math.PI) * 9;
    context.save();
    context.translate(Math.round(position.x + vector.x * recoil), Math.round(position.y + vector.y * recoil));
    context.fillStyle = '#10121c';
    context.fillRect(-31, -3, 62, 6);
    context.fillStyle = '#645155';
    context.fillRect(-5, -67, 10, 67);
    context.fillStyle = hitTime >= 0 && hitTime < 0.055 ? '#fff4ce' : '#aa8073';
    context.fillRect(-24, -92, 48, 65);
    context.fillStyle = '#795756';
    context.fillRect(-24, -88, 5, 57);
    context.fillStyle = '#e3b799';
    context.fillRect(-10, -72, 20, 25);
    context.fillStyle = '#614758';
    context.fillRect(-5, -67, 10, 15);
    context.fillStyle = '#e3b799';
    context.fillRect(vector.x > 0 ? 23 : -29, -81, 6, 9);
    context.restore();
}
export function drawPaper(context, position, angle, opacity = 1) {
    context.save();
    context.translate(Math.round(position.x), Math.round(position.y));
    context.rotate(angle);
    context.globalAlpha = opacity;
    context.fillStyle = '#493942';
    context.fillRect(-7, -12, 14, 24);
    context.fillStyle = '#e4bd65';
    context.fillRect(-5, -10, 10, 20);
    context.fillStyle = '#933c47';
    context.fillRect(-1, -7, 2, 13);
    context.fillRect(-4, -3, 8, 2);
    context.fillRect(0, 4, 4, 2);
    context.restore();
}
export function drawSeal(context, target, progress) {
    const t = clamp(progress);
    const scale = 1 + Math.floor(t * 2);
    const blocks = [
        [-1, -10, 2, 21],
        [-7, -4, 14, 2],
        [0, 5, 7, 2],
        [5, 5, 2, 6],
    ];
    context.save();
    context.translate(target.x, target.y - 61);
    context.globalAlpha = 1 - t;
    for (const [x, y, width, height] of blocks) {
        context.fillStyle = '#163d48';
        context.fillRect(x * scale - 2, y * scale - 2, width * scale + 4, height * scale + 4);
    }
    for (const [x, y, width, height] of blocks) {
        context.fillStyle = '#76d6c4';
        context.fillRect(x * scale, y * scale, width * scale, height * scale);
    }
    for (let i = 0; i < 7; i++) {
        const angle = (i * Math.PI * 2) / 7;
        context.fillStyle = i % 2 ? '#e4bd65' : '#6cb9b5';
        context.fillRect(Math.round(Math.cos(angle) * t * 34), Math.round(Math.sin(angle) * t * 27), 3, 4);
    }
    context.restore();
}
export function drawSlash(context, target, progress, sign) {
    const t = clamp(progress);
    const head = -39 + 78 * clamp(t * 2);
    const tail = Math.max(-39, head - 38);
    context.save();
    context.translate(target.x, target.y - (sign < 0 ? 40 : 60));
    context.globalAlpha = Math.min(1, (1 - t) * 2);
    context.strokeStyle = '#5d315b';
    context.lineWidth = 6;
    context.beginPath();
    context.moveTo(tail * sign, 2);
    context.quadraticCurveTo(((tail + head) / 2) * sign, -3, head * sign, -1);
    context.stroke();
    context.strokeStyle = '#e7d8cd';
    context.lineWidth = 2;
    context.stroke();
    context.restore();
}
export function drawStage(context, options) {
    const { home, target, light } = options;
    context.fillStyle = light ? '#e8dfcb' : '#242834';
    context.fillRect(0, 0, 640, 360);
    context.strokeStyle = light ? '#d1c7b2' : '#303747';
    context.lineWidth = 1;
    for (let y = 33; y < 360; y += 32) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(640, y);
        context.stroke();
    }
    context.strokeStyle = light ? '#b5a89c' : '#596076';
    context.beginPath();
    context.ellipse(home.x, home.y + 2, 28, 7, 0, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = light ? '#66575b' : '#aeb2c3';
    context.font = '13px sans-serif';
    context.textAlign = 'center';
    context.fillText('원위치', home.x, home.y + 30);
    context.fillText('표적', target.x, target.y + 28);
}
