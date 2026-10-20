import { drawBear, drawHero } from './cast.js';
import { clamp, rand } from './drawing.js';
const sub = (a, b) => ({
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
});
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const unit = (a) => {
    const length = Math.hypot(a.x, a.y, a.z) || 1;
    return { x: a.x / length, y: a.y / length, z: a.z / length };
};
const cross = (a, b) => ({
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
});
function shade(hex, amount) {
    const value = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#789091';
    return `rgb(${[1, 3, 5].map((i) => Math.round(parseInt(value.slice(i, i + 2), 16) * amount)).join(',')})`;
}
/** m 단위 장면을 카메라 축으로 투영한다. 면과 배우 판의 깊이 정렬도 이 객체가 소유한다. */
export class WorldScene {
    context;
    camera;
    time;
    forward;
    right;
    up;
    items = [];
    ground = [];
    constructor(context, camera, time) {
        this.context = context;
        this.camera = camera;
        this.time = time;
        this.forward = unit(sub(camera.target, camera.position));
        const side = cross(this.forward, { x: 0, y: 1, z: 0 });
        this.right =
            Math.hypot(side.x, side.z) < 0.001 ? { x: 1, y: 0, z: 0 } : unit(side);
        this.up = cross(this.right, this.forward);
    }
    view(point) {
        const d = sub(point, this.camera.position);
        return {
            x: dot(d, this.right),
            y: dot(d, this.up),
            z: dot(d, this.forward),
        };
    }
    screen(p) {
        const scale = (this.camera.focal ?? 880) / Math.max(0.15, p.z), angle = this.camera.roll ?? 0;
        const x = p.x * scale, y = -p.y * scale;
        return {
            x: 640 + x * Math.cos(angle) - y * Math.sin(angle),
            y: 360 + x * Math.sin(angle) + y * Math.cos(angle),
            scale,
            depth: p.z,
        };
    }
    project(point) {
        const p = this.view(point);
        return p.z < 0.25 ? null : this.screen(p);
    }
    quad(vertices, color) {
        if (vertices.length < 3)
            return;
        const normal = unit(cross(sub(vertices[1], vertices[0]), sub(vertices[2], vertices[0])));
        const light = 0.72 + Math.max(0, dot(normal, unit({ x: -0.4, y: 1, z: 0.3 }))) * 0.3;
        const tick = Math.floor(this.time * 12);
        const points = vertices.map((point) => this.view({
            x: point.x +
                (rand(point.x * 23 + point.y * 3 + point.z * 11 + tick) - 0.5) *
                    0.022,
            y: point.y + (rand(point.z * 13 + point.x * 7 + tick + 5) - 0.5) * 0.022,
            z: point.z,
        }));
        // 근평면을 지나는 바닥·기둥은 잘라 투영 반전과 화면을 덮는 면을 막는다.
        const clipped = [];
        for (let i = 0; i < points.length; i++) {
            const a = points[i], b = points[(i + 1) % points.length], inside = a.z >= 0.25, nextInside = b.z >= 0.25;
            if (inside)
                clipped.push(a);
            if (inside !== nextInside) {
                const t = (0.25 - a.z) / (b.z - a.z);
                clipped.push({
                    x: a.x + (b.x - a.x) * t,
                    y: a.y + (b.y - a.y) * t,
                    z: 0.25,
                });
            }
        }
        if (clipped.length < 3)
            return;
        const projected = clipped.map((p) => this.screen(p));
        const depth = points.reduce((sum, p) => sum + p.z, 0) / points.length;
        this.items.push({
            depth,
            draw: () => {
                const c = this.context;
                c.beginPath();
                c.moveTo(projected[0].x, projected[0].y);
                for (const p of projected.slice(1))
                    c.lineTo(p.x, p.y);
                c.closePath();
                c.fillStyle = shade(color, light);
                c.fill();
                c.lineWidth = 1.3 + clamp(3 / depth);
                c.strokeStyle = '#1a2b32';
                c.stroke();
            },
        });
    }
    /** 넓은 바닥은 카드의 하체를 평균 깊이로 덮지 않도록 먼저 합성한다. */
    floorQuad(vertices, color) {
        const start = this.items.length;
        this.quad(vertices, color);
        this.ground.push(...this.items.splice(start));
    }
    floorBox(center, size, color) {
        const start = this.items.length;
        this.box(center, size, color);
        this.ground.push(...this.items.splice(start));
    }
    box(center, size, color) {
        const x = center.x - size.x / 2, y = center.y - size.y / 2, z = center.z - size.z / 2;
        const v = [
            { x, y, z },
            { x: x + size.x, y, z },
            { x: x + size.x, y: y + size.y, z },
            { x, y: y + size.y, z },
            { x, y, z: z + size.z },
            { x: x + size.x, y, z: z + size.z },
            { x: x + size.x, y: y + size.y, z: z + size.z },
            { x, y: y + size.y, z: z + size.z },
        ];
        for (const face of [
            [0, 3, 2, 1],
            [4, 5, 6, 7],
            [0, 4, 7, 3],
            [1, 2, 6, 5],
            [3, 7, 6, 2],
            [0, 1, 5, 4],
        ])
            this.quad(face.map((i) => v[i]), color);
    }
    column(base, height, radius = 0.48) {
        this.box({ x: base.x, y: base.y + 0.16, z: base.z }, { x: radius * 3, y: 0.32, z: radius * 3 }, '#6d8284');
        this.box({ x: base.x, y: base.y + height - 0.12, z: base.z }, { x: radius * 2.8, y: 0.35, z: radius * 2.8 }, '#a6b6ae');
        for (let i = 0; i < 8; i++) {
            const a = (i * Math.PI) / 4, b = ((i + 1) * Math.PI) / 4;
            const x = base.x + Math.sin(a) * radius, z = base.z + Math.cos(a) * radius;
            const nx = base.x + Math.sin(b) * radius, nz = base.z + Math.cos(b) * radius;
            // 긴 면 하나의 평균 깊이가 뒤쪽 기둥을 배우 앞에 놓지 않도록 나눈다.
            const segments = Math.ceil(height / 2.5);
            for (let segment = 0; segment < segments; segment++) {
                const low = base.y + (height * segment) / segments, high = base.y + (height * (segment + 1)) / segments;
                this.quad([
                    { x, y: low, z },
                    { x: nx, y: low, z: nz },
                    { x: nx, y: high, z: nz },
                    { x, y: high, z },
                ], i % 2 ? '#718b8c' : '#8da49f');
            }
        }
    }
    hero(assets, position, action, phase, options = {}) {
        const p = this.project(position);
        if (!p)
            return;
        const viewAngle = Math.atan2(this.camera.position.x - position.x, this.camera.position.z - position.z);
        this.items.push({
            depth: this.view({
                ...position,
                y: position.y +
                    (options.height ?? 2.5) * 0.5 * Math.cos(options.rotation ?? 0),
            }).z - 0.015,
            draw: () => drawHero(this.context, assets, {
                x: p.x,
                y: p.y,
                height: (options.height ?? 2.5) * p.scale,
                action,
                phase,
                facing: (options.facing ?? 0) - viewAngle,
                alpha: options.alpha,
                rotation: options.rotation,
            }),
        });
    }
    bear(assets, position, state, phase, options = {}) {
        const p = this.project(position);
        if (!p)
            return;
        this.items.push({
            depth: this.view({
                ...position,
                y: position.y + (options.height ?? 3.8) * 0.5,
            }).z,
            draw: () => drawBear(this.context, assets, {
                x: p.x,
                y: p.y,
                height: (options.height ?? 3.8) * p.scale,
                state,
                phase,
                alpha: options.alpha,
                rotation: options.rotation,
            }),
        });
    }
    render() {
        this.context.save();
        this.ground.sort((a, b) => b.depth - a.depth);
        for (const item of this.ground)
            item.draw();
        this.items.sort((a, b) => b.depth - a.depth);
        for (const item of this.items)
            item.draw();
        this.context.restore();
        this.items.length = 0;
        this.ground.length = 0;
    }
}
