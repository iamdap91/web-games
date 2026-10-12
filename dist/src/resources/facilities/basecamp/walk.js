import { facingFor } from '../../characters/ataho/facing.js';
import { basecampLayout, basecampTrees, insideBasecampGround, placeFootprint, } from '../../maps/basecamp/basecamp-layout.js';
import { dojoLayout, dojoObstacles, inside, } from '../dojo/dojo-layout.js';
import { townHallLayout, townHallObstacles, } from '../town-hall/town-hall-layout.js';
import { kitchenObstacles } from '../kitchen/kitchen-layout.js';
import { smithyObstacles } from '../smithy/smithy-layout.js';
const walkObstacles = [
    ...dojoObstacles.map((box) => placeFootprint(box, basecampLayout.placements.dojo)),
    ...kitchenObstacles.map((box) => placeFootprint(box, basecampLayout.placements.kitchen)),
    ...smithyObstacles.map((box) => placeFootprint(box, basecampLayout.placements.smithy)),
    ...townHallObstacles,
];
export function dojoGroundHeight(point) {
    const local = {
        x: point.x - basecampLayout.placements.dojo.x,
        z: point.z - basecampLayout.placements.dojo.z,
    };
    for (const [position, layout] of [
        [local, dojoLayout],
        [point, townHallLayout],
    ]) {
        const { porch, steps } = layout;
        if (inside(position, porch))
            return porch.height;
        if (inside(position, steps))
            return (((steps.z + steps.depth / 2 - position.z) / steps.depth) * porch.height);
    }
    return 0;
}
export function canWalkDojo(point, fromHeight) {
    const { radius } = dojoLayout.actor;
    if (!insideBasecampGround(point, radius) ||
        Math.abs(dojoGroundHeight(point) - fromHeight) > 0.1)
        return false;
    if (walkObstacles.some((box) => {
        const dx = Math.max(0, Math.abs(point.x - box.x) - box.width / 2);
        const dz = Math.max(0, Math.abs(point.z - box.z) - box.depth / 2);
        return Math.hypot(dx, dz) < radius;
    }))
        return false;
    return !basecampTrees.some((tree) => Math.hypot(point.x - tree.x, point.z - tree.z) < radius + tree.size * 0.2);
}
/** 보행·충돌만 담당한다. 화면별 속도와 무관하게 작은 간격으로 충돌을 확인한다. */
export class DojoWalk {
    position = { ...basecampLayout.spawn };
    facing = 'front';
    moving = false;
    speed;
    obstacles;
    constructor(options = {}) {
        this.speed = options.speed ?? dojoLayout.actor.speed;
        this.obstacles = options.obstacles ?? [];
        if (options.spawn)
            this.position = { ...options.spawn };
    }
    setObstacles(obstacles) {
        this.obstacles = obstacles.map((obstacle) => ({ ...obstacle }));
    }
    setMovementSpeed(speed) {
        if (Number.isFinite(speed) && speed > 0)
            this.speed = speed;
    }
    reset() {
        this.position = { ...basecampLayout.spawn };
        this.facing = 'front';
        this.stop();
    }
    face(facing) {
        this.facing = facing;
        this.stop();
    }
    stop() {
        this.moving = false;
    }
    update(delta, input) {
        this.stop();
        const length = Math.hypot(input.x, input.z);
        if (!Number.isFinite(delta) || !Number.isFinite(length) || !length)
            return;
        const dt = Math.max(0, Math.min(delta, 0.05));
        this.facing = facingFor(input);
        const cos = Math.cos(dojoLayout.cameraYaw);
        const sin = Math.sin(dojoLayout.cameraYaw);
        const distance = this.speed * dt;
        const dx = ((input.x * cos + input.z * sin) / length) * distance;
        const dz = ((-input.x * sin + input.z * cos) / length) * distance;
        const previous = this.position;
        const steps = Math.max(1, Math.ceil(distance / 0.035));
        for (let i = 0; i < steps; i++) {
            this.tryMove({ x: this.position.x + dx / steps, z: this.position.z });
            this.tryMove({ x: this.position.x, z: this.position.z + dz / steps });
        }
        this.moving =
            Math.hypot(this.position.x - previous.x, this.position.z - previous.z) >
                0.00001;
    }
    tryMove(point) {
        if (this.obstacles.some((obstacle) => Math.hypot(point.x - obstacle.x, point.z - obstacle.z) <
            obstacle.radius + dojoLayout.actor.radius))
            return;
        if (canWalkDojo(point, dojoGroundHeight(this.position)))
            this.position = point;
    }
    get snapshot() {
        return {
            ...this.position,
            y: dojoGroundHeight(this.position),
            facing: this.facing,
            moving: this.moving,
        };
    }
}
