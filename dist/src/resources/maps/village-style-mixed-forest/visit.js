import { facingFor } from '../../characters/ataho/facing.js';
import { canWalkForest, entrance, findRoute, forestPlaces, forestRules, rootHeight, } from './layout.js';
/** 작은 답사의 진행과 시간은 화면·재질과 독립적으로 소유한다. */
export class ForestVisit {
    position = { ...entrance };
    facing = 'right';
    moving = false;
    restored = false;
    discovered = false;
    fireSeconds = 0;
    elapsed = 0;
    steps = 0;
    normalEnabled = true;
    lightEnabled = true;
    route = [];
    visited = new Set();
    message = '앞 뿌리로 줄기 속 마당에, 뒤 뿌리로 이끼 뒤 쉼터에 가보세요.';
    get snapshot() {
        const nearby = forestPlaces
            .filter((p) => Math.hypot(p.x - this.position.x, p.z - this.position.z) <
            forestRules.interactionDistance)
            .sort((a, b) => Math.hypot(a.x - this.position.x, a.z - this.position.z) -
            Math.hypot(b.x - this.position.x, b.z - this.position.z))[0]?.id ?? null;
        return Object.freeze({
            position: Object.freeze({ ...this.position }),
            player: Object.freeze({
                ...this.position,
                y: rootHeight(this.position),
                facing: this.facing,
                moving: this.moving,
            }),
            nearby,
            visited: Object.freeze([...this.visited]),
            restored: this.restored,
            discovered: this.discovered,
            fireSeconds: this.fireSeconds,
            elapsed: this.elapsed,
            steps: this.steps,
            routeRemaining: this.route.length,
            normalEnabled: this.normalEnabled,
            lightEnabled: this.lightEnabled,
            message: this.message,
        });
    }
    navigate(point) {
        this.route = findRoute(this.position, point);
        if (!this.route.length)
            this.message =
                '뿌리 윗길을 골라주세요. 아래 숲과 줄기 몸체는 걸을 수 없어요.';
    }
    update(delta, input) {
        if (!Number.isFinite(delta) ||
            delta <= 0 ||
            !Number.isFinite(input.x) ||
            !Number.isFinite(input.z))
            return;
        const dt = Math.min(delta, 0.05);
        this.elapsed += dt;
        this.fireSeconds = Math.max(0, this.fireSeconds - dt);
        let direction = input;
        this.moving = false;
        if (input.x || input.z)
            this.route = [];
        else if (this.route[0]) {
            const next = this.route[0], length = Math.hypot(next.x - this.position.x, next.z - this.position.z);
            if (length <= forestRules.speed * dt) {
                this.steps += length;
                this.position = next;
                this.route.shift();
                this.moving = length > 0;
                direction = { x: 0, z: 0 };
            }
            else
                direction = {
                    x: next.x - this.position.x,
                    z: next.z - this.position.z,
                };
        }
        const magnitude = Math.hypot(direction.x, direction.z);
        if (magnitude > 0.0001) {
            this.facing = facingFor(direction);
            const previous = this.position, distance = forestRules.speed * dt, n = Math.ceil(distance / 0.035);
            for (let i = 0; i < n; i++) {
                const x = this.position.x + ((direction.x / magnitude) * distance) / n;
                if (canWalkForest({ x, z: this.position.z }))
                    this.position = { x, z: this.position.z };
                const z = this.position.z + ((direction.z / magnitude) * distance) / n;
                if (canWalkForest({ x: this.position.x, z }))
                    this.position = { x: this.position.x, z };
            }
            const moved = Math.hypot(this.position.x - previous.x, this.position.z - previous.z);
            this.steps += moved;
            this.moving = moved > 0.0001;
        }
        if (this.snapshot.nearby === 'refuge' && !this.discovered) {
            this.discovered = true;
            this.message =
                '이끼를 지나 높은 뿌리 쉼터 발견 — 돌아가는 포자 길이 켜졌어요.';
        }
    }
    interact() {
        const place = forestPlaces.find((p) => p.id === this.snapshot.nearby);
        if (!place)
            return;
        this.visited.add(place.id);
        this.message = place.description;
        if (place.id === 'hearth')
            this.fireSeconds = 12;
        if (place.id === 'dojo')
            this.restored = true;
        this.stop();
    }
    toggleRestored() {
        this.restored = !this.restored;
        this.message = this.restored
            ? '버섯 도장 복구 — 잎 패치와 포자 등이 돌아왔어요.'
            : '버섯 도장 복구 전 — 찢어진 지붕과 빈 줄기 마당.';
    }
    toggleNormal() {
        this.normalEnabled = !this.normalEnabled;
    }
    toggleLight() {
        this.lightEnabled = !this.lightEnabled;
    }
    stop() {
        this.moving = false;
        this.route = [];
    }
    reset() {
        this.position = { ...entrance };
        this.facing = 'right';
        this.stop();
    }
}
