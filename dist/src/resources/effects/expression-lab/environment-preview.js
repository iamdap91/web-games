const screenUp = Math.cos(Math.PI / 6);
const actorPixelsPerUnit = 32;
export const environmentLayout = {
    screenUp,
    start: { x: -5.2, y: 0, z: 1.5 },
    bounds: { minX: -6.1, maxX: 6.1, minZ: -3, maxZ: 3.1 },
    bridge: { minX: -1.8, maxX: 1.8, halfDepth: 0.58, top: 2.8, bottom: 2.58 },
    rampOuterX: 4,
    actor: {
        radius: 0.19,
        height: 66 / actorPixelsPerUnit / screenUp + 0.035,
        pixelsPerUnit: actorPixelsPerUnit,
        speed: 2.8,
    },
    discovery: { x: 0, z: -1.65, radius: 0.48 },
};
const routes = {
    upper: [
        { x: -4.15, z: 0 },
        { x: -1.8, z: 0 },
        { x: 1.8, z: 0 },
        { x: 4.15, z: 0 },
        { x: 5.2, z: 1.5 },
    ],
    lower: [
        { x: -4.4, z: 1.9 },
        { x: 0, z: 1.9 },
        { x: 0, z: -1.65 },
        { x: 4.4, z: -1.65 },
        { x: 5.2, z: 1.5 },
    ],
};
const disabled = {
    secondary: false,
    lighting: false,
    height: false,
    reducedMotion: false,
};
/** 표시와 독립해서 다리의 상하·이동·반응 시간을 한 곳에서 소유한다. */
export class EnvironmentPreview {
    position = { ...environmentLayout.start };
    direction = { x: 1, z: 0 };
    movement = { x: 0, z: 0 };
    options = disabled;
    route = 'manual';
    waypoint = 0;
    moving = false;
    routeFinished = false;
    discovered = false;
    discoveryAge = 0;
    pulseAge = 10;
    time = 0;
    fallSpeed = 0;
    leafAngle = 0;
    leafVelocity = 0;
    clothAngle = 0;
    clothVelocity = 0;
    disposed = false;
    get snapshot() {
        return {
            position: { ...this.position },
            direction: { ...this.direction },
            moving: this.moving,
            route: this.route,
            routeFinished: this.routeFinished,
            discovered: this.discovered,
            discoveryAge: this.discoveryAge,
            pulseAge: this.pulseAge,
            leafAngle: this.leafAngle,
            clothAngle: this.clothAngle,
            time: this.time,
            options: { ...this.options },
        };
    }
    setMovement(direction) {
        if (this.disposed)
            return;
        const x = Number.isFinite(direction.x) ? direction.x : 0;
        const z = Number.isFinite(direction.z) ? direction.z : 0;
        const length = Math.max(1, Math.hypot(x, z));
        this.movement = { x: x / length, z: z / length };
        if (x || z) {
            this.route = 'manual';
            this.routeFinished = false;
        }
    }
    followRoute(route) {
        if (this.disposed)
            return;
        this.reset();
        this.route = route;
    }
    pulse() {
        if (this.disposed)
            return;
        this.pulseAge = 0;
        this.leafVelocity += 3.4;
        this.clothVelocity += 1.65;
    }
    update(delta, options) {
        if (this.disposed)
            return;
        const raised = !this.options.height && options.height;
        this.options = { ...options };
        if (raised && this.route !== 'lower') {
            const ramp = rampHeight(this.position);
            const support = ramp ??
                (this.route === 'upper' && onBridge(this.position)
                    ? environmentLayout.bridge.top
                    : 0);
            this.position = { ...this.position, y: support };
            this.fallSpeed = 0;
        }
        if (!options.secondary || options.reducedMotion) {
            this.leafAngle = this.leafVelocity = 0;
            this.clothAngle = this.clothVelocity = 0;
        }
        if (!options.height) {
            this.position = { ...this.position, y: 0 };
            this.fallSpeed = 0;
            this.discovered = false;
            this.discoveryAge = 0;
        }
        if (!Number.isFinite(delta) || delta <= 0)
            return;
        // 경로·계단·감쇠가 프레임 속도에 따라 달라지지 않도록 같은 작은 간격으로 진행한다.
        let remaining = Math.min(delta, 1);
        while (remaining > 0.000001) {
            const step = Math.min(remaining, 1 / 120);
            this.step(step);
            remaining -= step;
        }
    }
    reset() {
        if (this.disposed)
            return;
        this.position = { ...environmentLayout.start };
        this.direction = { x: 1, z: 0 };
        this.movement = { x: 0, z: 0 };
        this.route = 'manual';
        this.waypoint = 0;
        this.moving = false;
        this.routeFinished = false;
        this.discovered = false;
        this.discoveryAge = 0;
        this.pulseAge = 10;
        this.time = 0;
        this.fallSpeed = 0;
        this.leafAngle = this.leafVelocity = 0;
        this.clothAngle = this.clothVelocity = 0;
    }
    dispose() {
        this.disposed = true;
        this.movement = { x: 0, z: 0 };
        this.moving = false;
    }
    step(delta) {
        this.time += delta;
        this.pulseAge += delta;
        if (this.discovered)
            this.discoveryAge += delta;
        const movement = this.routeMovement(delta);
        const speed = environmentLayout.actor.speed * delta;
        const before = this.position;
        this.tryMove({ x: movement.x * speed, z: 0 }, delta);
        this.tryMove({ x: 0, z: movement.z * speed }, delta);
        this.moving =
            Math.hypot(this.position.x - before.x, this.position.z - before.z) >
                0.00001;
        if (this.moving)
            this.direction = movement;
        if (this.options.height)
            this.updateGravity(delta);
        this.updateDiscovery();
        this.updateSecondary(delta);
    }
    routeMovement(delta) {
        if (this.route === 'manual' || this.routeFinished)
            return this.movement;
        const points = routes[this.route];
        const target = points[this.waypoint];
        if (!target) {
            this.routeFinished = true;
            return { x: 0, z: 0 };
        }
        const x = target.x - this.position.x;
        const z = target.z - this.position.z;
        const distance = Math.hypot(x, z);
        if (distance <= environmentLayout.actor.speed * delta) {
            this.waypoint += 1;
            return {
                x: x / (environmentLayout.actor.speed * delta),
                z: z / (environmentLayout.actor.speed * delta),
            };
        }
        return { x: x / distance, z: z / distance };
    }
    tryMove(change, delta) {
        const bounds = environmentLayout.bounds;
        const x = Math.max(bounds.minX, Math.min(bounds.maxX, this.position.x + change.x));
        const z = Math.max(bounds.minZ, Math.min(bounds.maxZ, this.position.z + change.z));
        let y = this.position.y;
        if (this.options.height) {
            const ramp = rampHeight({ x, z });
            if (ramp !== null) {
                // 높은 경사면에 옆으로 들어와 순간이동하지 않고 낮은 입구에서 걸어 오른다.
                if (ramp > y + environmentLayout.actor.speed * delta * 1.2 + 0.02)
                    return;
                y = ramp;
            }
            else if (onBridge({ x, z }) &&
                y >= environmentLayout.bridge.top - 0.12) {
                y = environmentLayout.bridge.top;
            }
            if (ramp === null && bridgeHits({ x, y, z }))
                return;
        }
        this.position = { x, y, z };
    }
    updateGravity(delta) {
        const ramp = rampHeight(this.position);
        const support = ramp ??
            (onBridge(this.position) &&
                this.position.y >= environmentLayout.bridge.top - 0.12
                ? environmentLayout.bridge.top
                : 0);
        if (this.position.y <= support + 0.015) {
            this.position = { ...this.position, y: support };
            this.fallSpeed = 0;
            return;
        }
        this.fallSpeed += delta * 8;
        this.position = {
            ...this.position,
            y: Math.max(support, this.position.y - this.fallSpeed * delta),
        };
    }
    updateDiscovery() {
        const point = environmentLayout.discovery;
        if (!this.options.height || this.discovered || this.position.y > 0.1)
            return;
        if (Math.hypot(this.position.x - point.x, this.position.z - point.z) >
            point.radius)
            return;
        this.discovered = true;
        this.discoveryAge = 0;
        this.pulse();
    }
    updateSecondary(delta) {
        if (!this.options.secondary || this.options.reducedMotion) {
            this.leafAngle = this.leafVelocity = 0;
            this.clothAngle = this.clothVelocity = 0;
            return;
        }
        this.leafVelocity +=
            (-this.leafAngle * 30 - this.leafVelocity * 4.8) * delta;
        this.leafAngle += this.leafVelocity * delta;
        // 잎보다 무겁고 늦게 돌아오는 천으로 같은 충격의 차이를 읽게 한다.
        this.clothVelocity +=
            (-this.clothAngle * 12 - this.clothVelocity * 3.1) * delta;
        this.clothAngle += this.clothVelocity * delta;
    }
}
function onBridge(point) {
    const bridge = environmentLayout.bridge;
    return (point.x >= bridge.minX &&
        point.x <= bridge.maxX &&
        Math.abs(point.z) <= bridge.halfDepth);
}
export function rampHeight(point) {
    const bridge = environmentLayout.bridge;
    const absoluteX = Math.abs(point.x);
    if (Math.abs(point.z) > bridge.halfDepth ||
        absoluteX < bridge.maxX ||
        absoluteX > environmentLayout.rampOuterX)
        return null;
    return (((environmentLayout.rampOuterX - absoluteX) /
        (environmentLayout.rampOuterX - bridge.maxX)) *
        bridge.top);
}
/** 같은 x·z에서도 발~머리 AABB와 다리의 밑면/윗면을 비교한다. */
export function bridgeHits(position) {
    const bridge = environmentLayout.bridge;
    const actor = environmentLayout.actor;
    const horizontal = position.x + actor.radius > bridge.minX &&
        position.x - actor.radius < bridge.maxX &&
        Math.abs(position.z) < bridge.halfDepth + actor.radius;
    return (horizontal &&
        position.y < bridge.top - 0.005 &&
        position.y + actor.height > bridge.bottom);
}
