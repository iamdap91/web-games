import { facingFor } from '../../characters/ataho/facing.js';
import { bookEntrance, bookPlaces, bookRules, bookRoute, canWalkBook, } from './layout.js';
/** 조립 단계·완료 경계·연속 보행·12fps 장식 시간의 소유자. */
export class BookVisit {
    position = { ...bookEntrance };
    facing = 'front';
    moving = false;
    folds = [0, 0];
    folding = null;
    visited = new Set();
    returned = false;
    route = [];
    elapsed = 0;
    notice = null;
    noticeTime = 0;
    get snapshot() {
        const nearby = bookPlaces
            .filter((p) => Math.hypot(p.x - this.position.x, p.z - this.position.z) <=
            bookRules.interactionDistance)
            .sort((a, b) => Math.hypot(a.x - this.position.x, a.z - this.position.z) -
            Math.hypot(b.x - this.position.x, b.z - this.position.z))[0];
        return Object.freeze({
            player: Object.freeze({
                ...this.position,
                y: bookRules.ground,
                facing: this.facing,
                moving: this.moving,
            }),
            position: Object.freeze({ ...this.position }),
            access: Object.freeze({
                firstOpen: this.folds[0] >= 1,
                secondOpen: this.folds[1] >= 1,
            }),
            folds: Object.freeze([...this.folds]),
            nearby: nearby?.id ?? null,
            visited: Object.freeze([...this.visited]),
            returned: this.returned,
            folding: this.folding,
            routeLength: this.route.length,
            elapsed: this.elapsed,
            modelTime: Math.floor((this.elapsed + 1e-9) * 12) / 12,
            notice: this.notice,
        });
    }
    cancelRoute() {
        this.route = [];
        this.moving = false;
    }
    reset() {
        this.position = { ...bookEntrance };
        this.facing = 'front';
        this.cancelRoute();
    }
    navigate(requested) {
        this.route = [...bookRoute(this.position, requested, this.snapshot.access)];
        if (!this.route.length)
            this.tell('그 장은 아직 접혀 있다. 먼저 가까운 시설을 사용해 다리를 펼치자.');
    }
    interact() {
        const nearby = bookPlaces.find((p) => p.id === this.snapshot.nearby);
        if (!nearby)
            return false;
        if (this.folding !== null) {
            this.tell('접착 중 — 펼침이 끝난 뒤 길을 건너자.');
            return false;
        }
        if (nearby.stage !== 2 && this.folds[nearby.stage] < 1) {
            this.folding = nearby.stage;
            this.cancelRoute();
            this.tell(nearby.stage === 0
                ? '첫 펼침 — 공방의 벽과 첫 종이 다리를 세우고 있다.'
                : '둘째 펼침 — 도장과 전망대로 가는 다리를 세우고 있다.');
            return true;
        }
        this.visited.add(nearby.id);
        this.tell(nearby.id === 'rest'
            ? '책갈피 전망대 발견 — 두 종이 다리를 지나 제본 공방 입구로 돌아가자.'
            : '접힌 건축을 받치는 탭과 이음선을 살펴보았다.');
        return true;
    }
    walk(delta, input) {
        this.moving = false;
        if (!Number.isFinite(delta) ||
            delta <= 0 ||
            !Number.isFinite(input.x) ||
            !Number.isFinite(input.z))
            return;
        let direction = input, remaining = Infinity;
        if (input.x || input.z)
            this.route = [];
        else {
            while (this.route[0] &&
                Math.hypot(this.route[0].x - this.position.x, this.route[0].z - this.position.z) < 0.04)
                this.position = this.route.shift();
            const target = this.route[0];
            if (target) {
                direction = {
                    x: target.x - this.position.x,
                    z: target.z - this.position.z,
                };
                remaining = Math.hypot(direction.x, direction.z);
            }
        }
        const length = Math.hypot(direction.x, direction.z);
        if (!length)
            return;
        this.facing = facingFor(direction);
        const distance = Math.min(Math.min(delta, 0.05) * bookRules.speed, remaining), parts = Math.ceil(distance / 0.04), before = this.position;
        const access = this.snapshot.access;
        for (let i = 0; i < parts; i++) {
            const x = {
                x: this.position.x + ((direction.x / length) * distance) / parts,
                z: this.position.z,
            };
            if (canWalkBook(x, access))
                this.position = x;
            const z = {
                x: this.position.x,
                z: this.position.z + ((direction.z / length) * distance) / parts,
            };
            if (canWalkBook(z, access))
                this.position = z;
        }
        this.moving =
            Math.hypot(before.x - this.position.x, before.z - this.position.z) >
                0.00001;
        if (!this.moving && this.route.length)
            this.cancelRoute();
        if (!this.returned &&
            this.moving &&
            Math.hypot(before.x - bookEntrance.x, before.z - bookEntrance.z) >= 0.9 &&
            this.visited.has('rest') &&
            Math.hypot(this.position.x - bookEntrance.x, this.position.z - bookEntrance.z) < 0.9) {
            this.returned = true;
            this.tell('책 속 마을 한 바퀴 완료 — 펼친 두 다리를 건너 공방으로 귀환했다.');
        }
    }
    update(delta) {
        if (!Number.isFinite(delta) || delta <= 0)
            return;
        const step = Math.min(delta, 0.05);
        this.elapsed += step;
        if (this.folding !== null) {
            const index = this.folding;
            this.folds[index] = Math.min(1, (this.folds[index] ?? 0) + step / bookRules.foldDuration);
            if (this.folds[index] > 1 - 1e-9) {
                this.folds[index] = 1;
                this.folding = null;
                this.visited.add(bookPlaces[index].id);
                this.tell(index === 0
                    ? '첫 다리 펼침 완료 — 이제 가운데 도장 마당으로 걸어갈 수 있다.'
                    : '둘째 다리 펼침 완료 — 책갈피 전망대로 가는 길이 이어졌다.');
            }
        }
        this.noticeTime = Math.max(0, this.noticeTime - step);
        if (!this.noticeTime)
            this.notice = null;
    }
    tell(message) {
        this.notice = message;
        this.noticeTime = 5;
    }
}
