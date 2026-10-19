import { sprite, stage } from '../../cutscenes/shared/drawing.js';
import { signatureHeight, signatureWidth, } from './contracts.js';
export const dramaticCrackOrigin = { x: 591, y: 220 };
function noise(index) {
    const value = Math.sin(index * 127.1 + 73.7) * 43758.5453;
    return value - Math.floor(value);
}
function makeShard(points, index) {
    const center = {
        x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
        y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
    };
    const x = Math.min(...points.map((point) => point.x));
    const y = Math.min(...points.map((point) => point.y));
    const dx = center.x - dramaticCrackOrigin.x;
    const dy = center.y - dramaticCrackOrigin.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const speed = 410 + noise(index + 4) * 470;
    return {
        points,
        center,
        bounds: {
            x,
            y,
            width: Math.max(...points.map((point) => point.x)) - x,
            height: Math.max(...points.map((point) => point.y)) - y,
        },
        delayMs: Math.min(110, distance * 0.14) + noise(index + 21) * 45,
        velocity: { x: (dx / distance) * speed, y: (dy / distance) * speed - 45 },
        spin: (noise(index + 35) - 0.5) * 2.7,
    };
}
/** 방사선 위 꼭짓점을 공유해 화면 네 모서리까지 빈틈 없이 한 장의 내용을 나눈다. */
function fracture() {
    const center = dramaticCrackOrigin;
    const corners = [
        { x: 0, y: 0 },
        { x: signatureWidth, y: 0 },
        { x: signatureWidth, y: signatureHeight },
        { x: 0, y: signatureHeight },
    ];
    const angles = [
        ...corners.map((point) => Math.atan2(point.y - center.y, point.x - center.x)),
        ...Array.from({ length: 13 }, (_, index) => -Math.PI + ((index + 0.15 + noise(index) * 0.45) / 13) * Math.PI * 2),
    ].sort((a, b) => a - b);
    const rings = [0.17, 0.43, 0.72, 1];
    const rays = angles.map((angle, index) => {
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        const reach = Math.min(dx > 0 ? (signatureWidth - center.x) / dx : -center.x / dx, dy > 0 ? (signatureHeight - center.y) / dy : -center.y / dy);
        return rings.map((ring) => {
            const radius = ring === 1 ? 1 : ring * (0.89 + noise(index + 9) * 0.2);
            return {
                x: center.x + dx * reach * radius,
                y: center.y + dy * reach * radius,
            };
        });
    });
    const pieces = [];
    rays.forEach((ray, index) => {
        const next = rays[(index + 1) % rays.length];
        ray.forEach((point, ring) => {
            const points = ring === 0
                ? [center, point, next[ring]]
                : [ray[ring - 1], point, next[ring], next[ring - 1]];
            pieces.push(makeShard(points, pieces.length));
        });
    });
    return pieces;
}
function photoBackground(ctx) {
    stage(ctx, 0);
    ctx.fillStyle = '#0d1829b8';
    ctx.fillRect(0, 0, signatureWidth, signatureHeight);
    ctx.fillStyle = '#d4c9a2';
    ctx.fillRect(125, 110, 3, 229);
    ctx.fillRect(824, 110, 3, 229);
    const glow = ctx.createRadialGradient(598, 227, 24, 598, 227, 530);
    glow.addColorStop(0, '#a8c6b12b');
    glow.addColorStop(1, '#080e1800');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, signatureWidth, signatureHeight);
}
function preparePhoto(ctx, pose) {
    photoBackground(ctx);
    ctx.imageSmoothingEnabled = false;
    const scale = 15;
    // 원본을 같은 비율로 확대한 클로즈업이다. 조각이 된 뒤에만 합성층을 회전한다.
    ctx.drawImage(pose.sprite.image, 591 - pose.pivot.x * scale, -17, pose.sprite.image.naturalWidth * scale, pose.sprite.image.naturalHeight * scale);
    ctx.fillStyle = '#070b13';
    ctx.fillRect(0, 0, signatureWidth, 32);
    ctx.fillRect(0, signatureHeight - 32, signatureWidth, 32);
}
/** 충격 컷의 원래 내용과 뒤 풍경을 화면 단위로 소유하며 시각 탐색에도 같은 조각을 쓴다. */
export class DramaticShatterSurface {
    photo = document.createElement('canvas');
    settled = document.createElement('canvas');
    shards = fracture();
    prepared = false;
    disposed = false;
    constructor() {
        for (const canvas of [this.photo, this.settled]) {
            canvas.width = signatureWidth;
            canvas.height = signatureHeight;
        }
    }
    prepare(assets) {
        if (this.disposed)
            throw new Error('정리된 충격 컷을 다시 준비할 수 없습니다.');
        if (this.prepared)
            return;
        const pair = assets.acting.reaction.get('south-east');
        const calm = assets.idle.get('yeonmuk')?.get('south-east');
        if (!pair?.[0] || !calm)
            throw new Error('화면 균열에 사용할 연묵의 표정 원화가 없습니다.');
        const front = this.photo.getContext('2d');
        const rear = this.settled.getContext('2d');
        if (!front || !rear)
            throw new Error('화면 균열의 합성 표면을 준비할 수 없습니다.');
        preparePhoto(front, pair[0]);
        photoBackground(rear);
        rear.fillStyle = '#090f1366';
        rear.beginPath();
        rear.ellipse(594, 478, 58, 9, 0, 0, Math.PI * 2);
        rear.fill();
        rear.imageSmoothingEnabled = false;
        sprite(rear, calm, 594, 477, 288);
        this.prepared = true;
    }
    drawPhoto(ctx) {
        this.assertPrepared();
        ctx.drawImage(this.photo, 0, 0);
    }
    drawSettled(ctx) {
        this.assertPrepared();
        ctx.drawImage(this.settled, 0, 0);
    }
    drawShard(ctx, shard) {
        this.assertPrepared();
        const b = shard.bounds;
        ctx.drawImage(this.photo, b.x, b.y, b.width, b.height, b.x, b.y, b.width, b.height);
    }
    assertPrepared() {
        if (!this.prepared || this.disposed)
            throw new Error('준비되지 않은 충격 컷입니다.');
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.photo.width = this.photo.height = 1;
        this.settled.width = this.settled.height = 1;
    }
}
