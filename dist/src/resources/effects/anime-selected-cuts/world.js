import { drawBear, drawHero } from './cast.js';
const nearPlane = 0.25;
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
/** 게임 무대와 같은 카메라로 배우 판과 타점을 투영하고 배우 사이의 깊이를 정렬한다. */
export class WorldScene {
    context;
    camera;
    forward;
    right;
    up;
    items = [];
    constructor(context, camera) {
        this.context = context;
        this.camera = camera;
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
        return p.z < nearPlane ? null : this.screen(p);
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
        this.items.sort((a, b) => b.depth - a.depth);
        for (const item of this.items)
            item.draw();
        this.context.restore();
        this.items.length = 0;
    }
}
