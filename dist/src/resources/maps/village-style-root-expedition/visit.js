import { facingFor } from '../../characters/ataho/facing.js';
import { canWalkForest, entrance, findRoute, forestPlaces, forestRules, rootHeight, inShortcutGap, shortcutRules, } from './layout.js';
/** 작은 답사의 진행과 시간은 화면·재질과 독립적으로 소유한다. */
export class ForestVisit {
    position = { ...entrance };
    facing = 'right';
    moving = false;
    restored = false;
    discovered = false;
    shortcut = 'sealed';
    openingSeconds = 0;
    shortcutCrossed = false;
    returned = false;
    visits = 1;
    fireSeconds = 0;
    elapsed = 0;
    steps = 0;
    normalEnabled = true;
    lightEnabled = true;
    route = [];
    visited = new Set();
    message = '왼쪽 뿌리는 끊겨 있어요. 화덕에서 앞길을 돌아 이끼 뒤 쉼터를 찾아보세요.';
    get snapshot() {
        const nearby = forestPlaces
            .filter((p) => Math.hypot(p.x - this.position.x, p.z - this.position.z) <
            forestRules.interactionDistance)
            .sort((a, b) => Math.hypot(a.x - this.position.x, a.z - this.position.z) -
            Math.hypot(b.x - this.position.x, b.z - this.position.z))[0]?.id ?? null;
        return Object.freeze({
            shortcut: this.shortcut,
            openingProgress: this.openingSeconds / shortcutRules.openingSeconds,
            shortcutCrossed: this.shortcutCrossed,
            returned: this.returned,
            visits: this.visits,
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
        this.route = findRoute(this.position, point, this.shortcut === 'open');
        if (!this.route.length)
            this.message =
                '끊긴 뿌리는 쉼터에서 포자 씨앗을 조사하면 연결돼요. 먼저 오른쪽 앞길로 돌아가세요.';
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
        if (this.shortcut === 'growing') {
            this.openingSeconds = Math.min(shortcutRules.openingSeconds, this.openingSeconds + dt);
            if (this.openingSeconds >= shortcutRules.openingSeconds) {
                this.shortcut = 'open';
                this.message =
                    '뿌리 끝이 맞닿았어요. 푸른 포자를 따라 왼쪽 뒤길로 돌아가세요.';
            }
        }
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
                if (canWalkForest({ x, z: this.position.z }, this.shortcut === 'open'))
                    this.position = { x, z: this.position.z };
                const z = this.position.z + ((direction.z / magnitude) * distance) / n;
                if (canWalkForest({ x: this.position.x, z }, this.shortcut === 'open'))
                    this.position = { x: this.position.x, z };
            }
            const moved = Math.hypot(this.position.x - previous.x, this.position.z - previous.z);
            this.steps += moved;
            this.moving = moved > 0.0001;
        }
        if (this.snapshot.nearby === 'refuge' && !this.discovered) {
            this.discovered = true;
            this.message =
                '이끼 사이에서 포자 씨앗을 찾았어요. Space / 조사로 끊긴 뿌리를 깨워보세요.';
        }
        if (this.shortcut === 'open' && inShortcutGap(this.position))
            this.shortcutCrossed = true;
        if (this.shortcutCrossed &&
            !this.returned &&
            this.moving &&
            Math.hypot(previousPosition.x - entrance.x, previousPosition.z - entrance.z) >= shortcutRules.returnDistance &&
            Math.hypot(this.position.x - entrance.x, this.position.z - entrance.z) <
                shortcutRules.returnDistance) {
            this.returned = true;
            this.message =
                '포자길로 귀환했어요. 다음 답사에는 짧은 뒷길과 넓은 앞길을 골라 걸을 수 있어요.';
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
        if (place.id === 'refuge') {
            if (this.shortcut === 'sealed') {
                this.shortcut = 'growing';
                this.message =
                    '포자 씨앗을 깨웠어요. 왼쪽 끊긴 구간에서 새 뿌리가 자라고 있어요…';
            }
            else
                this.message =
                    this.shortcut === 'growing'
                        ? '뿌리 끝이 아직 자라고 있어요. 맞닿은 뒤에 건너갈 수 있어요.'
                        : '포자 씨앗이 자란 길은 남아 있어요. 푸른 포자를 따라 짧은 뒷길로 돌아가세요.';
        }
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
        this.visits++;
        this.position = { ...entrance };
        this.facing = 'right';
        this.stop();
        this.message =
            this.shortcut === 'open'
                ? '다시 답사해요. 열린 뒷길과 넓은 앞길을 자유롭게 고르세요.'
                : '입구로 돌아왔어요. 발견과 조사 기록은 남아 있어요.';
    }
}
