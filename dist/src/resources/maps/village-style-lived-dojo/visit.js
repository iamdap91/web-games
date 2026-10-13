import { canVillageStep, villageHeight, villagePoints, villageRoute, villageTerrain, } from './layout.js';
/** 보행과 복구·방문·세계 시간을 소유하고 입구 복귀는 진행을 보존한다. */
export class VillageVisit {
    position = { x: -1.2, z: 11.2 };
    facing = 'front';
    moving = false;
    restored = false;
    fire = 0;
    elapsed = 0;
    training = 0;
    warmed = false;
    teaReady = false;
    tea = 0;
    shortcutUsed = false;
    arrival = null;
    route = [];
    visited = new Set();
    get snapshot() {
        return Object.freeze({
            ...this.position,
            height: villageHeight(this.position),
            moving: this.moving,
            facing: this.facing,
            restored: this.restored,
            fire: this.fire,
            visited: Object.freeze([...this.visited]),
            routeRemaining: this.route.length,
            nearby: this.nearby?.id ?? null,
            elapsed: this.elapsed,
            training: this.training,
            warmed: this.warmed,
            teaReady: this.teaReady,
            tea: this.tea,
            shortcutUsed: this.shortcutUsed,
            interiorOpen: this.restored &&
                this.position.z < -3.6 &&
                this.position.z > -9.6 &&
                this.position.x > -3.5 &&
                this.position.x < 5.4,
            arrival: this.arrival,
        });
    }
    get nearby() {
        return villagePoints.find((p) => Math.hypot(p.x - this.position.x, p.z - this.position.z) < 1.65);
    }
    navigate(to) {
        this.route = villageRoute(this.position, to, this.restored);
    }
    stop() {
        this.route = [];
        this.moving = false;
    }
    returnToEntrance() {
        this.position = { x: -1.2, z: 11.2 };
        this.facing = 'front';
        this.stop();
    }
    restore() {
        if (this.restored)
            return '도장은 이미 복구되었어요. 열린 문으로 들어가 수련 마루를 둘러보세요.';
        if (this.nearby?.id !== 'dojo')
            return '계단 위 도장 문앞으로 걸어가 복구해 주세요.';
        this.restored = true;
        return '도장 복구! 지붕을 고치고 수련 마루를 열었어요. 안을 지나 동쪽 뒤문으로 나가면 쉼터 지름길입니다.';
    }
    interact() {
        const point = this.nearby;
        if (!point)
            return '온빛 화덕 → 언덕 도장 → 나무 뒤 쉼터를 찾아보세요.';
        this.visited.add(point.id);
        if (point.id === 'fire') {
            this.fire = 18;
            this.warmed = true;
            return '장작을 넣자 찻물이 데워집니다. 도장에서 수련을 마치면 뒤뜰 쉼터에 따뜻한 차가 준비돼요.';
        }
        if (point.id === 'training') {
            this.training = this.warmed ? 9 : 6;
            this.teaReady = false;
            return this.warmed
                ? '온기를 받은 수련생과 호흡을 맞췄어요. 수련이 끝나면 뒤뜰 쉼터에서 차를 나눠요.'
                : '수련생과 호흡을 맞췄어요. 화덕에서 찻물을 데우면 수련 뒤 쉼터에 차가 준비됩니다.';
        }
        if (point.id === 'rear')
            return this.restored
                ? '수련복을 말리는 뒤뜰이에요. 문에서 나온 길은 쉼터까지 곧장 이어집니다.'
                : '수련복을 말리는 뒤뜰이에요. 도장을 복구하면 이쪽 뒤문과 수련 마루가 연결됩니다.';
        if (point.id === 'dojo') {
            return this.restore();
        }
        if (this.teaReady) {
            this.tea = 8;
            return '수련을 마친 뒤 따뜻한 차를 나눴어요. 도장 마당에서 시작한 하루가 쉼터까지 이어집니다.';
        }
        return '나무 뒤 쉼터예요. 화덕에서 찻물을 데우고 도장 수련을 마치면 차가 준비됩니다.';
    }
    update(seconds, input) {
        if (!Number.isFinite(seconds) || seconds <= 0)
            return;
        this.elapsed += seconds;
        this.fire = Math.max(0, this.fire - seconds);
        const trainingBefore = this.training;
        this.training = Math.max(0, this.training - seconds);
        if (trainingBefore > 0 && this.training === 0 && this.warmed)
            this.teaReady = true;
        this.tea = Math.max(0, this.tea - seconds);
        let dx = input.x, dz = input.z;
        if (dx || dz)
            this.route = [];
        else if (this.route[0]) {
            const target = this.route[0];
            dx = target.x - this.position.x;
            dz = target.z - this.position.z;
            if (Math.hypot(dx, dz) < 0.08) {
                this.route.shift();
                dx = 0;
                dz = 0;
            }
        }
        const magnitude = Math.hypot(dx, dz);
        this.moving = magnitude > 0;
        if (!this.moving)
            return;
        this.facing =
            Math.abs(dx) > Math.abs(dz)
                ? dx > 0
                    ? 'right'
                    : 'left'
                : dz > 0
                    ? 'front'
                    : 'back';
        const distance = Math.min(4.6 * Math.min(seconds, 0.04), this.route.length ? magnitude : Infinity);
        const previous = this.position;
        const nextX = {
            x: this.position.x + (dx / magnitude) * distance,
            z: this.position.z,
        };
        if (canVillageStep(this.position, nextX, this.restored))
            this.position = nextX;
        const nextZ = {
            x: this.position.x,
            z: this.position.z + (dz / magnitude) * distance,
        };
        if (canVillageStep(this.position, nextZ, this.restored))
            this.position = nextZ;
        if (this.restored &&
            previous.x < 4.05 &&
            this.position.x >= 4.05 &&
            Math.abs(this.position.z + 7) < 0.65)
            this.shortcutUsed = true;
        if (villageHeight(previous) < villageTerrain.upperHeight &&
            villageHeight(this.position) === villageTerrain.upperHeight)
            this.arrival =
                Math.max(previous.x, this.position.x) > villageTerrain.rampEdgeX
                    ? 'hill'
                    : 'stairs';
    }
}
