import { paperEntrance, paperHeight, paperPlaces, paperRoute, paperRules, canWalkPaper, } from './layout.js';
/** 시설 반응·발견·귀환을 작은 한 바퀴의 경험으로 소유한다. */
export class PaperVisit {
    position = paperEntrance;
    facing = 'front';
    moving = false;
    restored = false;
    repair = { north: false, east: false };
    repairing = null;
    repairSeconds = 0;
    fire = 0;
    elapsed = 0;
    route = [];
    visited = new Set();
    shelterDiscovered = false;
    loopComplete = false;
    returningFromShelter = false;
    notice = null;
    noticeTime = 0;
    get snapshot() {
        const nearby = paperPlaces.find((place) => Math.hypot(place.x - this.position.x, place.z - this.position.z) < 1.45);
        return {
            player: {
                ...this.position,
                y: paperHeight(this.position),
                facing: this.facing,
                moving: this.moving,
            },
            nearby: nearby?.id ?? null,
            visited: [...this.visited],
            repair: { ...this.repair },
            repairing: this.repairing,
            repairProgress: this.repairing ? this.repairSeconds / 2.4 : 0,
            restored: this.restored,
            fire: this.fire,
            elapsed: this.elapsed,
            shelterDiscovered: this.shelterDiscovered,
            loopComplete: this.loopComplete,
            routeRemaining: this.route.length,
            notice: this.notice,
        };
    }
    navigate(point) {
        this.route = paperRoute(this.position, point, this.repair);
    }
    stop() {
        this.route = [];
        this.moving = false;
    }
    reset() {
        this.position = paperEntrance;
        this.returningFromShelter = false;
        this.facing = 'front';
        this.stop();
        this.tell('입구로 돌아왔어요. 복구와 방문 기록은 남아 있습니다.');
    }
    tell(text) {
        this.notice = text;
        this.noticeTime = 5.5;
    }
    toggleRestored() {
        const nearby = this.snapshot.nearby;
        const region = nearby === 'hearth' ? 'north' : nearby === 'dojo' ? 'east' : null;
        if (!region) {
            this.tell('화덕 앞에서 북쪽 책장을, 도장 앞에서 동쪽 책장을 수선해요.');
            return;
        }
        if (this.repairing)
            return;
        if (this.repair[region]) {
            this.tell('수선한 종이 발판과 인쇄는 그대로 남아 있어요.');
            return;
        }
        if (region === 'east' && !this.repair.north)
            return;
        this.repairing = region;
        this.repairSeconds = 0;
        this.stop();
        this.tell(region === 'north'
            ? '찢어진 북쪽 책장을 붙입니다. 인쇄와 발판이 완성될 때까지 기다려요.'
            : '도장 뒤 동쪽 책장을 수선합니다. 뒷장 쉼터로 갈 종이 발판이 펼쳐져요.');
    }
    interact() {
        const nearby = this.snapshot.nearby;
        if (!nearby)
            return false;
        this.visited.add(nearby);
        if (nearby === 'hearth') {
            this.fire = 10;
            this.tell('종이 불꽃이 톡! 화덕의 차 향이 골목에 퍼집니다.');
            this.toggleRestored();
        }
        else if (nearby === 'dojo')
            this.toggleRestored();
        else {
            this.returningFromShelter = true;
            this.tell('뒷장 쉼터 발견 · 동쪽 길을 따라 입구에 걸어서 돌아가요.');
        }
        this.stop();
        return true;
    }
    update(delta, input, yaw) {
        if (!Number.isFinite(delta) ||
            delta <= 0 ||
            !Number.isFinite(input.x) ||
            !Number.isFinite(input.z))
            return;
        const step = Math.min(delta, 0.05);
        this.elapsed += step;
        if (this.repairing) {
            this.repairSeconds = Math.min(2.4, this.repairSeconds + step);
            if (this.repairSeconds >= 2.4) {
                const region = this.repairing;
                this.repair = { ...this.repair, [region]: true };
                this.repairing = null;
                this.restored = this.repair.east;
                this.tell(region === 'north'
                    ? '북쪽 인쇄와 종이 발판 완성! 화덕 오른쪽 수선 길로 도장에 가세요.'
                    : '동쪽 인쇄와 종이 발판 완성! 도장 오른쪽으로 뒷장 쉼터에 갈 수 있어요.');
            }
        }
        this.fire = Math.max(0, this.fire - step);
        this.noticeTime = Math.max(0, this.noticeTime - step);
        if (!this.noticeTime)
            this.notice = null;
        let dx = input.x, dz = input.z;
        const direct = !!(dx || dz);
        if (direct)
            this.route = [];
        else {
            while (this.route[0] &&
                Math.hypot(this.route[0].x - this.position.x, this.route[0].z - this.position.z) < 0.001)
                this.route.shift();
            const waypoint = this.route[0];
            if (waypoint) {
                dx = waypoint.x - this.position.x;
                dz = waypoint.z - this.position.z;
            }
        }
        this.moving = false;
        const length = Math.hypot(dx, dz);
        if (length) {
            const sx = dx * Math.cos(yaw) - dz * Math.sin(yaw), sz = dx * Math.sin(yaw) + dz * Math.cos(yaw);
            this.facing =
                Math.abs(sx) > Math.abs(sz)
                    ? sx > 0
                        ? 'right'
                        : 'left'
                    : sz > 0
                        ? 'front'
                        : 'back';
            const distance = Math.min(step * paperRules.speed, direct ? Infinity : length);
            const count = Math.ceil(distance / 0.04), previous = this.position;
            for (let i = 0; i < count; i++) {
                const x = {
                    x: this.position.x + ((dx / length) * distance) / count,
                    z: this.position.z,
                };
                if (canWalkPaper(x, this.repair))
                    this.position = x;
                const z = {
                    x: this.position.x,
                    z: this.position.z + ((dz / length) * distance) / count,
                };
                if (canWalkPaper(z, this.repair))
                    this.position = z;
            }
            this.moving =
                Math.hypot(previous.x - this.position.x, previous.z - this.position.z) >
                    0.00001;
            const waypoint = this.route[0];
            if (waypoint &&
                Math.hypot(this.position.x - waypoint.x, this.position.z - waypoint.z) <
                    0.001)
                this.route.shift();
        }
        if (!this.shelterDiscovered &&
            Math.hypot(this.position.x - 7.5, this.position.z + 6.4) < 1.7) {
            this.shelterDiscovered = true;
            this.tell('어라, 지붕 뒤에 작은 마당이 숨어 있었네요.');
        }
        if (!this.loopComplete &&
            this.returningFromShelter &&
            this.moving &&
            this.visited.size === 3 &&
            Math.hypot(this.position.x - paperEntrance.x, this.position.z - paperEntrance.z) < 0.8) {
            this.loopComplete = true;
            this.tell('한 바퀴 완료 · 따뜻해진 골목을 다시 돌아왔어요.');
        }
    }
}
