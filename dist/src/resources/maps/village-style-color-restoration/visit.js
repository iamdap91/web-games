import { facingFor } from '../../characters/ataho/facing.js';
import { canWalkColor, colorEntrance, colorFloors, colorPlaces, colorRoute, insideRect, restorationRules, } from './layout.js';
/** 구역 복구 시간과 실제로 열리는 공간·통과 기록을 방문 객체가 함께 소유한다. */
export class ColorVisit {
    position = { ...colorEntrance };
    facing = 'right';
    moving = false;
    stage = 0;
    progress = [0, 0];
    restoring = null;
    visited = new Set();
    firstBridgeCrossed = false;
    roomVisited = false;
    returnBridgeCrossed = false;
    returned = false;
    elapsed = 0;
    steps = 0;
    visits = 1;
    route = [];
    message = '먼저 흰 안료 공방으로 가보세요. 가까이에서 복구하면 색과 동쪽 다리가 돌아와요.';
    get snapshot() {
        const nearby = colorPlaces
            .filter((p) => p.id !== 'room' || this.stage === 2)
            .find((p) => Math.hypot(p.x - this.position.x, p.z - this.position.z) <
            restorationRules.interactionDistance)?.id ?? null;
        return Object.freeze({
            position: Object.freeze({ ...this.position }),
            player: Object.freeze({
                ...this.position,
                y: 0,
                facing: this.facing,
                moving: this.moving,
            }),
            stage: this.stage,
            regionProgress: Object.freeze([...this.progress]),
            restoring: this.restoring,
            nearby,
            visited: Object.freeze([...this.visited]),
            firstBridgeCrossed: this.firstBridgeCrossed,
            roomVisited: this.roomVisited,
            returnBridgeCrossed: this.returnBridgeCrossed,
            returned: this.returned,
            elapsed: this.elapsed,
            steps: this.steps,
            routeRemaining: this.route.length,
            visits: this.visits,
            message: this.message,
        });
    }
    navigate(point) {
        this.route = colorRoute(this.position, point, this.stage);
        if (!this.route.length)
            this.message =
                '다리와 방은 복구가 끝나야 걸을 수 있어요. 먼저 가까운 공방·찻집을 살펴보세요.';
    }
    interact() {
        const place = this.snapshot.nearby;
        if (!place)
            return;
        this.stop();
        this.visited.add(place);
        if (place === 'workshop' && this.stage === 0 && !this.restoring) {
            this.restoring = 'workshop';
            this.message = '안료를 개고 다리를 잇는 중… 서쪽 생활에 색이 돌아와요.';
            return;
        }
        if (place === 'teahouse' &&
            this.stage === 1 &&
            !this.restoring &&
            this.firstBridgeCrossed) {
            this.restoring = 'teahouse';
            this.message = '찻집 뒤편을 잇는 중… 새로운 방과 귀환길이 생겨요.';
            return;
        }
        this.message =
            place === 'room'
                ? '새 다락방에 들렀어요. 남쪽 새 다리로 입구에 돌아가보세요.'
                : this.restoring
                    ? '복구 중이에요. 색이 퍼지고 길이 이어질 때까지 잠시 기다려주세요.'
                    : '복구한 색과 길은 남아 있어요. 안쪽 방과 귀환 다리로 걸어보세요.';
    }
    update(delta, input) {
        if (!Number.isFinite(delta) ||
            delta <= 0 ||
            !Number.isFinite(input.x) ||
            !Number.isFinite(input.z))
            return;
        const previousPosition = this.position;
        const dt = Math.min(delta, 0.05);
        this.elapsed += dt;
        if (this.restoring) {
            const region = this.restoring === 'workshop' ? 0 : 1;
            this.progress[region] = Math.min(1, this.progress[region] + dt / restorationRules.seconds);
            if (this.progress[region] === 1) {
                this.stage = region === 0 ? 1 : 2;
                this.restoring = null;
                this.message =
                    region === 0
                        ? '서쪽 색과 다리가 돌아왔어요. 동쪽 흰 찻집으로 건너가보세요.'
                        : '동쪽 색과 새 방이 돌아왔어요. 안쪽 방에서 쉬고 남쪽 다리로 귀환해보세요.';
            }
        }
        let direction = input;
        this.moving = false;
        if (input.x || input.z)
            this.route = [];
        else if (this.route[0]) {
            const next = this.route[0];
            direction = { x: next.x - this.position.x, z: next.z - this.position.z };
        }
        const length = Math.hypot(direction.x, direction.z);
        if (length > 0.0001) {
            this.facing = facingFor(direction);
            const distance = Math.min(restorationRules.speed * dt, input.x || input.z ? Infinity : length), before = this.position, n = Math.max(1, Math.ceil(distance / 0.035));
            for (let i = 0; i < n; i++) {
                const x = {
                    x: this.position.x + ((direction.x / length) * distance) / n,
                    z: this.position.z,
                };
                if (canWalkColor(x, this.stage))
                    this.position = x;
                const z = {
                    x: this.position.x,
                    z: this.position.z + ((direction.z / length) * distance) / n,
                };
                if (canWalkColor(z, this.stage))
                    this.position = z;
            }
            const moved = Math.hypot(this.position.x - before.x, this.position.z - before.z);
            this.steps += moved;
            this.moving = moved > 0.0001;
            if (this.route[0] &&
                Math.hypot(this.position.x - this.route[0].x, this.position.z - this.route[0].z) < 0.002)
                this.route.shift();
        }
        if (this.stage >= 1 &&
            insideRect(this.position, colorFloors.firstBridge) &&
            Math.abs(this.position.x) < 1)
            this.firstBridgeCrossed = true;
        if (this.stage === 2 &&
            insideRect(this.position, colorFloors.room) &&
            this.position.z < -4)
            this.roomVisited = true;
        if (this.stage === 2 &&
            insideRect(this.position, colorFloors.returnBridge) &&
            Math.abs(this.position.x) < 1)
            this.returnBridgeCrossed = true;
        if (!this.returned &&
            this.moving &&
            Math.hypot(previousPosition.x - colorEntrance.x, previousPosition.z - colorEntrance.z) >= 0.8 &&
            this.roomVisited &&
            this.returnBridgeCrossed &&
            Math.hypot(this.position.x - colorEntrance.x, this.position.z - colorEntrance.z) < 0.8) {
            this.returned = true;
            this.message =
                '색과 길을 되찾고 한 바퀴 돌아왔어요. 재방문해도 두 구역과 새 방은 남아 있어요.';
        }
    }
    stop() {
        this.route = [];
        this.moving = false;
    }
    reset() {
        this.position = { ...colorEntrance };
        this.visits++;
        this.facing = 'right';
        this.stop();
        this.message = '입구로 돌아왔어요. 색·복구·통과·방문 기록은 이어져요.';
    }
}
