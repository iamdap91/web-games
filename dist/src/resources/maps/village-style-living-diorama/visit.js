import { facingFor } from '../../characters/ataho/facing.js';
import { canStepLivingDiorama, canWalkLivingDiorama, groundHeight, livingDioramaPlaces, livingDioramaRules, livingDioramaRoute, } from './layout.js';
/** 높은 도장 마당과 담 뒤 쉼터의 이동·경로·시설 반응·복구 상태를 소유한다. */
export class LivingDioramaVisit {
    position = { x: -2, z: 10.5 };
    facing = 'front';
    moving = false;
    workshopReady = false;
    practiced = false;
    clothPrepared = false;
    fire = 0;
    restored = false;
    training = 0;
    cloth = 0;
    period = 'day';
    returned = false;
    notice = null;
    noticeTime = 0;
    shelterDiscovered = false;
    visited = new Set();
    route = [];
    get snapshot() {
        const nearby = livingDioramaPlaces
            .filter((p) => Math.hypot(p.x - this.position.x, p.z - this.position.z) <=
            livingDioramaRules.interactionDistance)
            .sort((a, b) => Math.hypot(a.x - this.position.x, a.z - this.position.z) -
            Math.hypot(b.x - this.position.x, b.z - this.position.z))[0];
        return {
            position: { ...this.position },
            player: {
                ...this.position,
                y: groundHeight(this.position),
                facing: this.facing,
                moving: this.moving,
            },
            nearby: nearby?.id ?? null,
            nearbyID: nearby?.id ?? null,
            visited: [...this.visited],
            workshopReady: this.workshopReady,
            practiced: this.practiced,
            clothPrepared: this.clothPrepared,
            fire: this.fire,
            training: this.training,
            cloth: this.cloth,
            period: this.period,
            returned: this.returned,
            restored: this.restored,
            notice: this.notice,
            shelterDiscovered: this.shelterDiscovered,
            routeLength: this.route.length,
        };
    }
    reset() {
        this.position = { x: -2, z: 10.5 };
        this.facing = 'front';
        this.cancelRoute();
    }
    stop() {
        this.moving = false;
    }
    cancelRoute() {
        this.route = [];
        this.stop();
    }
    navigate(point) {
        this.route = [
            ...livingDioramaRoute(this.position, point, { restored: this.restored }),
        ];
        if (!this.route.length)
            this.tell('그곳까지 길이 이어지지 않아요. 다른 길목을 눌러 보세요.');
    }
    walk(delta, input) {
        this.stop();
        if (!Number.isFinite(delta) ||
            delta <= 0 ||
            !Number.isFinite(input.x) ||
            !Number.isFinite(input.z))
            return;
        let direction = input;
        let remaining = Infinity;
        const manual = !!(input.x || input.z);
        if (manual)
            this.route = [];
        else {
            while (this.route[0] &&
                Math.hypot(this.route[0].x - this.position.x, this.route[0].z - this.position.z) < 0.06) {
                const waypoint = this.route.shift();
                // 단상 모서리에서 다음 축으로 돌 때 높이 경계의 미세 오차를 남기지 않는다.
                if (waypoint &&
                    canStepLivingDiorama(this.position, waypoint, {
                        restored: this.restored,
                    }))
                    this.position = waypoint;
            }
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
        const previous = this.position, distance = Math.min(Math.min(delta, 0.05) * livingDioramaRules.speed, remaining), steps = Math.ceil(distance / 0.035);
        for (let i = 0; i < steps; i++) {
            this.move({
                x: this.position.x + ((direction.x / length) * distance) / steps,
                z: this.position.z,
            });
            this.move({
                x: this.position.x,
                z: this.position.z + ((direction.z / length) * distance) / steps,
            });
        }
        this.moving =
            Math.hypot(previous.x - this.position.x, previous.z - this.position.z) >
                0.00001;
        if (!manual && !this.moving)
            this.cancelRoute();
        if (!this.returned &&
            this.moving &&
            Math.hypot(previous.x + 2, previous.z - 10.5) >= 1.2 &&
            this.restored &&
            this.visited.size === livingDioramaPlaces.length &&
            Math.hypot(this.position.x + 2, this.position.z - 10.5) < 1.2) {
            this.returned = true;
            this.tell('마당 한 바퀴 완료 — 일하는 공방, 수련하는 도장, 쉬는 쉼터, 천이 펼쳐진 시장을 둘러보고 돌아왔다.');
        }
        if (!this.shelterDiscovered &&
            Math.hypot(this.position.x - 9, this.position.z + 6.7) < 2) {
            this.shelterDiscovered = true;
            this.tell('담 뒤 쉼터 발견 — 북쪽 다리로 귀환하거나 수로 끝을 지나 천시장으로 우회할 수 있다.');
        }
    }
    move(point) {
        if (canStepLivingDiorama(this.position, point, { restored: this.restored }))
            this.position = point;
    }
    interact() {
        const nearby = livingDioramaPlaces.find((p) => p.id === this.snapshot.nearby);
        if (!nearby)
            return false;
        if (nearby.id === 'dojo' && !this.workshopReady) {
            this.tell('공방의 불씨와 안료를 먼저 준비하자. 화덕 마당을 사용하면 도장을 복구할 수 있다.');
            return false;
        }
        if (nearby.id === 'market' && !this.practiced) {
            this.tell('도장을 복구하고 수련한 뒤 시장에서 새 천을 펼치자.');
            return false;
        }
        this.visited.add(nearby.id);
        this.tell(nearby.description);
        if (nearby.id === 'hearth') {
            this.fire = 18;
            this.workshopReady = true;
        }
        if (nearby.id === 'dojo') {
            if (!this.restored)
                this.toggleRestored();
            this.training = 12;
            this.practiced = true;
            this.tell('도장 수련 — 돌아온 주민이 마당에서 발 디딤을 연습한다.');
        }
        if (nearby.id === 'market') {
            this.cloth = 8;
            this.clothPrepared = true;
        }
        this.cancelRoute();
        return true;
    }
    toggleRestored() {
        this.restored = !this.restored;
        this.cancelRoute();
        if (!canWalkLivingDiorama(this.position, { restored: this.restored })) {
            // 복구 비교로 새 소품이 발 위치에 생기면 같은 높이의 빈 곳으로 옮긴다.
            const previous = this.position;
            search: for (let distance = 0.15; distance <= 1.8; distance += 0.15)
                for (let i = 0; i < 16; i++) {
                    const angle = (i * Math.PI) / 8, point = {
                        x: previous.x + Math.cos(angle) * distance,
                        z: previous.z + Math.sin(angle) * distance,
                    };
                    if (canStepLivingDiorama(previous, point, { restored: this.restored })) {
                        this.position = point;
                        break search;
                    }
                }
        }
        this.tell(this.restored
            ? '도장 복구 — 천막과 훈련 북, 주민 수련과 저녁 등불이 돌아왔다.'
            : '복구 전 — 지붕 틈과 빈 훈련 마당.');
    }
    togglePeriod() {
        this.period = this.period === 'day' ? 'evening' : 'day';
        this.tell(this.period === 'evening'
            ? '저녁 — 공방 창에 따뜻한 빛이 깃들었다.'
            : '낮 — 큰 지붕과 재질의 명암을 살펴보자.');
    }
    tell(message) {
        this.notice = message;
        this.noticeTime = 6;
    }
    update(delta) {
        if (!Number.isFinite(delta) || delta <= 0)
            return;
        const step = Math.min(delta, 0.05);
        this.fire = Math.max(0, this.fire - step);
        this.training = Math.max(0, this.training - step);
        this.cloth = Math.max(0, this.cloth - step);
        this.noticeTime = Math.max(0, this.noticeTime - step);
        if (!this.noticeTime)
            this.notice = null;
    }
}
