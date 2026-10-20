import { drawAtaho, drawBear } from './battle.js';
import { ellipse, label, line, mix, noise, polygon, smooth, } from './drawing.js';
import { height, width, } from './types.js';
const focalLength = 560;
const horizonY = 185;
const cameraRadius = 8;
const cameraHeight = 3.8;
const nearDepth = 1;
/** 월드의 물체를 돌리지 않고 중심을 향한 카메라의 위치·축에서 좌표를 구한다. */
class OrbitView {
    cosine;
    sine;
    cameraX;
    cameraZ;
    constructor(angle) {
        this.cosine = Math.cos(angle);
        this.sine = Math.sin(angle);
        this.cameraX = -cameraRadius * this.sine;
        this.cameraZ = -cameraRadius * this.cosine;
    }
    view(point) {
        const x = point.x - this.cameraX;
        const z = point.z - this.cameraZ;
        return {
            x: x * this.cosine - z * this.sine,
            y: cameraHeight - point.y,
            depth: x * this.sine + z * this.cosine,
        };
    }
    project(point) {
        return this.projectView(this.view(point));
    }
    projectView(point) {
        const scale = focalLength / Math.max(nearDepth, point.depth);
        return {
            x: width / 2 + point.x * scale,
            y: horizonY + point.y * scale,
            depth: point.depth,
            scale,
        };
    }
    /** 카메라 뒤로 이어지는 바닥 선은 근평면에서 잘라 커다란 뒤집힌 격자를 피한다. */
    groundLine(ctx, from, to, color) {
        let a = this.view(from);
        let b = this.view(to);
        if (a.depth < nearDepth && b.depth < nearDepth)
            return;
        const clipped = (outside, inside) => {
            const progress = (nearDepth - outside.depth) / (inside.depth - outside.depth);
            return {
                x: mix(outside.x, inside.x, progress),
                y: mix(outside.y, inside.y, progress),
                depth: nearDepth,
            };
        };
        if (a.depth < nearDepth)
            a = clipped(a, b);
        if (b.depth < nearDepth)
            b = clipped(b, a);
        line(ctx, [this.projectView(a), this.projectView(b)], color, 1.5);
    }
}
function drawSurroundings(ctx, view) {
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#15243b');
    sky.addColorStop(1, '#8b9ca5');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);
    // 무한 수평면의 높이는 일정하고 그 위의 무늬·산·탑은 모두 같은 월드에 고정한다.
    ctx.fillStyle = '#a4b6bc';
    ctx.fillRect(0, horizonY, width, height - horizonY);
    const mountains = [];
    for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2;
        const x = Math.sin(angle) * 22;
        const z = Math.cos(angle) * 22;
        const tangentX = Math.cos(angle) * 4.4;
        const tangentZ = -Math.sin(angle) * 4.4;
        const points = [
            { x: x - tangentX, y: 0, z: z - tangentZ },
            { x, y: 7 + noise(i) * 6, z },
            { x: x + tangentX, y: 0, z: z + tangentZ },
        ];
        if (points.some((point) => view.view(point).depth < 4))
            continue;
        mountains.push({
            depth: view.view({ x, y: 0, z }).depth,
            points,
            color: i % 2 ? '#58758d' : '#6d8999',
        });
    }
    for (const mountain of mountains.sort((a, b) => b.depth - a.depth))
        polygon(ctx, mountain.points.map((point) => view.project(point)), mountain.color);
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const x = Math.sin(angle) * 15;
        const z = Math.cos(angle) * 15;
        const base = view.project({ x, y: 0, z });
        if (base.depth < 4 || base.x < -100 || base.x > width + 100)
            continue;
        const top = view.project({ x, y: 5 + (i % 3), z });
        line(ctx, [base, top], '#294c65', base.scale * 0.4);
        ellipse(ctx, top.x, top.y, base.scale * 0.2, base.scale * 0.2, i % 2 ? '#e1b57a' : '#90d4df');
    }
    for (let i = -14; i <= 14; i++) {
        const value = i * 1.25;
        const color = i % 4 === 0 ? '#526f82a0' : '#74909a80';
        view.groundLine(ctx, { x: value, y: 0, z: -18 }, { x: value, y: 0, z: 18 }, color);
        view.groundLine(ctx, { x: -18, y: 0, z: value }, { x: 18, y: 0, z: value }, color);
    }
}
function columnObject(ctx, view, x, z) {
    const base = view.project({ x, y: 0, z });
    const top = view.project({ x, y: 4.6, z });
    return {
        depth: base.depth,
        draw: () => {
            const radius = base.scale * 0.28;
            const shade = ctx.createLinearGradient(base.x - radius, 0, base.x + radius, 0);
            shade.addColorStop(0, '#29495f');
            shade.addColorStop(0.4, '#8baab3');
            shade.addColorStop(1, '#385c70');
            ctx.fillStyle = shade;
            ctx.fillRect(base.x - radius, top.y, radius * 2, base.y - top.y);
            ellipse(ctx, top.x, top.y, radius * 1.35, radius * 0.38, '#d2e1dd');
            ellipse(ctx, base.x, base.y, radius * 1.4, radius * 0.35, '#658390');
        },
    };
}
/** 공간의 반대편까지 도는 견본이며 배우의 없는 옆·뒷면 원화는 만들어내지 않는다. */
export function drawEditingOrbit(ctx, frame) {
    const progress = frame.enhanced ? smooth((frame.timeMs - 450) / 2900) : 0;
    const shownProgress = frame.enhanced && frame.reducedMotion
        ? frame.timeMs < 2000
            ? 0
            : 1
        : progress;
    const view = new OrbitView(mix(0.1, 2.55, shownProgress));
    drawSurroundings(ctx, view);
    const objects = [
        columnObject(ctx, view, -3, -2),
        columnObject(ctx, view, 3, 2),
        columnObject(ctx, view, 3, -2),
        columnObject(ctx, view, -3, 2),
    ];
    for (const [x, z, who] of [
        [-0.9, 0, 'ataho'],
        [1.15, 0.25, 'bear'],
    ]) {
        const base = view.project({ x, y: 0, z });
        ellipse(ctx, base.x, base.y + 4, base.scale * (who === 'ataho' ? 0.7 : 1.2), base.scale * 0.13, '#213b4c50');
        objects.push({
            depth: base.depth,
            draw: () => {
                if (who === 'ataho') {
                    drawAtaho(ctx, frame, {
                        x: base.x,
                        ground: base.y,
                        scale: (3.4 * cameraRadius) / base.depth,
                    });
                    return;
                }
                drawBear(ctx, frame, {
                    x: base.x,
                    ground: base.y,
                    scale: (2.6 * cameraRadius) / base.depth,
                });
            },
        });
    }
    for (const object of objects.sort((a, b) => b.depth - a.depth))
        object.draw();
    label(ctx, '공간 회전 · 인물 다각도 원화 미재현');
    label(ctx, !frame.enhanced
        ? '시작 방향 고정'
        : frame.reducedMotion
            ? '움직임 줄이기 · 시작과 반대편 구도만 표시'
            : '정면 → 측면 → 반대편 · 지형과 가림 순서로 경로를 확인', 40, 518);
}
