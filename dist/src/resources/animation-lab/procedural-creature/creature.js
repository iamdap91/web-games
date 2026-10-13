export const sceneSize = { width: 480, height: 260 };
export const groundY = 202;
const fixedStep = 1 / 120;
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
export function terrainHeight(x, rocks) {
    let y = groundY;
    for (const rock of rocks) {
        const offset = Math.abs(x - rock.x) / (rock.width / 2);
        if (offset >= 1)
            continue;
        // 완만한 돌 가장자리를 따라 발을 올리므로 별도 점프 애니메이션이 필요 없다.
        const rise = rock.height * Math.min(1, (1 - offset) * 2.8);
        y = Math.min(y, groundY - rise);
    }
    return y;
}
export function solveLeg(hip, requestedFoot, bend) {
    const dx = requestedFoot.x - hip.x;
    const dy = requestedFoot.y - hip.y;
    const requestedDistance = Math.hypot(dx, dy);
    const unitX = requestedDistance < 0.001 ? 0 : dx / requestedDistance;
    const unitY = requestedDistance < 0.001 ? 1 : dy / requestedDistance;
    const distance = Math.min(55.5, requestedDistance);
    const foot = {
        x: hip.x + unitX * distance,
        y: hip.y + unitY * distance,
    };
    const lift = Math.sqrt(Math.max(0, 28 * 28 - (distance / 2) ** 2));
    return {
        knee: {
            x: (hip.x + foot.x) / 2 - unitY * lift * bend,
            y: (hip.y + foot.y) / 2 + unitX * lift * bend,
        },
        foot,
    };
}
/** 지형, 접지, 스프링, 시간 상태를 소유한다. 화면과 입력 장치에는 의존하지 않는다. */
export class ProceduralCreature {
    x = 120;
    y = groundY - 30;
    vx = 0;
    vy = 0;
    angle = 0;
    facing = 1;
    manualMove = 0;
    automatic = true;
    paused = false;
    slow = false;
    accumulator = 0;
    time = 0;
    steps = 0;
    pushFlash = 0;
    rocks = [];
    nextRockId = 1;
    feet = [];
    tail = [];
    constructor() {
        this.reset();
    }
    reset() {
        this.x = 120;
        this.y = groundY - 30;
        this.vx = 0;
        this.vy = 0;
        this.angle = 0;
        this.facing = 1;
        this.manualMove = 0;
        this.automatic = true;
        this.paused = false;
        this.slow = false;
        this.accumulator = 0;
        this.time = 0;
        this.steps = 0;
        this.pushFlash = 0;
        this.nextRockId = 1;
        this.rocks = [
            { id: this.nextRockId++, x: 242, width: 70, height: 26 },
            { id: this.nextRockId++, x: 360, width: 56, height: 15 },
        ];
        this.feet = [0, 1, 2, 3].map((index) => {
            const x = this.x + (index % 2 === 0 ? -24 : 24);
            const y = terrainHeight(x, this.rocks);
            return {
                x,
                y,
                start: { x, y },
                target: { x, y },
                progress: 1,
                stepping: false,
            };
        });
        this.tail = Array.from({ length: 9 }, (_, index) => ({
            x: this.x - 32 - index * 7,
            y: this.y + 3 + index * 1.4,
            vx: 0,
            vy: 0,
        }));
    }
    move(direction) {
        this.manualMove = direction;
        if (direction !== 0)
            this.facing = direction;
    }
    toggleAutomatic() {
        this.automatic = !this.automatic;
    }
    togglePause() {
        this.paused = !this.paused;
        this.accumulator = 0;
    }
    toggleSlow() {
        this.slow = !this.slow;
    }
    reverse() {
        this.facing = this.facing === 1 ? -1 : 1;
        if (this.manualMove !== 0)
            this.manualMove = this.facing;
    }
    push() {
        this.vx -= this.facing * 155;
        this.vy -= 85;
        this.pushFlash = 0.8;
        for (const node of this.tail) {
            node.vx -= this.facing * 110;
            node.vy -= 50;
        }
    }
    addRock(x, height = 26) {
        const id = this.nextRockId++;
        this.rocks.push({
            id,
            x: clamp(x, 25, sceneSize.width - 25),
            width: 66,
            height: clamp(height, 10, 44),
        });
        // 제한된 실험 공간에서 돌이 무한히 쌓이지 않게 가장 오래된 돌을 교체한다.
        if (this.rocks.length > 8)
            this.rocks.shift();
        return id;
    }
    placeRock(id, x, height) {
        this.rocks = this.rocks.map((rock) => rock.id === id
            ? {
                ...rock,
                x: clamp(x, 25, sceneSize.width - 25),
                height: clamp(height, 10, 44),
            }
            : rock);
    }
    removeRock(id) {
        this.rocks = this.rocks.filter((rock) => rock.id !== id);
    }
    update(elapsed) {
        if (this.paused || !Number.isFinite(elapsed) || elapsed <= 0)
            return;
        this.accumulator += Math.min(elapsed, 0.1) * (this.slow ? 0.25 : 1);
        while (this.accumulator >= fixedStep) {
            this.step(fixedStep);
            this.accumulator -= fixedStep;
        }
    }
    get pose() {
        const legs = this.feet.map((foot, index) => {
            const hip = this.hip(index);
            const solved = solveLeg(hip, foot, index % 2 === 0 ? this.facing : this.facing === 1 ? -1 : 1);
            return {
                hip,
                ...solved,
                far: index >= 2,
                stepping: foot.stepping || Math.hypot(foot.x - hip.x, foot.y - hip.y) > 55.5,
            };
        });
        const onRock = terrainHeight(this.x, this.rocks) < groundY - 3;
        return {
            body: { x: this.x, y: this.y },
            angle: this.angle,
            facing: this.facing,
            velocity: this.vx,
            legs,
            tail: this.tail.map(({ x, y }) => ({ x, y })),
            rocks: this.rocks.map((rock) => ({ ...rock })),
            automatic: this.automatic,
            paused: this.paused,
            slow: this.slow,
            steps: this.steps,
            reaction: this.pushFlash > 0.1
                ? '밀림 → 발을 다시 딛고 몸을 추스르는 중'
                : onRock
                    ? '돌 넘기 → 발 높이와 몸 기울기를 계산'
                    : Math.abs(this.vx) > 8
                        ? '걷기 → 딛은 발은 땅에 고정'
                        : '대기 → 꼬리와 몸이 천천히 안정',
            pushFlash: this.pushFlash,
        };
    }
    hip(index) {
        const offset = index % 2 === 0 ? -23 : 23;
        return {
            x: this.x + Math.cos(this.angle) * offset,
            y: this.y + Math.sin(this.angle) * offset + (index >= 2 ? -3 : 3),
        };
    }
    step(dt) {
        this.time += dt;
        this.pushFlash = Math.max(0, this.pushFlash - dt);
        const drive = this.manualMove || (this.automatic ? this.facing : 0);
        const targetVelocity = drive * 46;
        this.vx += (targetVelocity - this.vx) * 5 * dt;
        this.x += this.vx * dt;
        if (this.x < 88 || this.x > sceneSize.width - 70) {
            this.x = clamp(this.x, 88, sceneSize.width - 70);
            this.vx *= -0.2;
            if (this.manualMove === 0)
                this.facing = this.x < 100 ? 1 : -1;
        }
        const rearY = terrainHeight(this.x - 26, this.rocks);
        const frontY = terrainHeight(this.x + 26, this.rocks);
        const slope = Math.atan2(frontY - rearY, 52);
        this.angle += (clamp(slope, -0.5, 0.5) - this.angle) * 9 * dt;
        const targetY = Math.min(frontY, rearY, terrainHeight(this.x, this.rocks)) - 29;
        this.vy += ((targetY - this.y) * 140 - this.vy * 19) * dt;
        this.y += this.vy * dt;
        // 새 돌을 몸 바로 아래 놓아도 몸통이 지형 안으로 들어가지 않게 한다.
        this.y = Math.min(this.y, terrainHeight(this.x, this.rocks) - 18);
        this.updateFeet(dt);
        this.updateTail(dt);
    }
    updateFeet(dt) {
        const moving = Math.abs(this.vx) > 6;
        for (const [index, foot] of this.feet.entries()) {
            const hip = this.hip(index);
            if (foot.stepping) {
                foot.progress = Math.min(1, foot.progress + dt / 0.22);
                const amount = foot.progress * foot.progress * (3 - 2 * foot.progress);
                foot.x = foot.start.x + (foot.target.x - foot.start.x) * amount;
                const surface = terrainHeight(foot.x, this.rocks);
                foot.y = Math.min(foot.start.y +
                    (foot.target.y - foot.start.y) * amount -
                    Math.sin(foot.progress * Math.PI) * 14, surface);
                if (foot.progress >= 1) {
                    foot.stepping = false;
                    foot.y = terrainHeight(foot.x, this.rocks);
                    this.steps += 1;
                }
                continue;
            }
            foot.y = terrainHeight(foot.x, this.rocks);
            const desiredX = hip.x + this.facing * (moving ? 14 : 0);
            const distance = Math.abs(foot.x - desiredX);
            const partner = this.feet[(index + 3) % 4];
            const reachEmergency = Math.hypot(foot.x - hip.x, foot.y - hip.y) > 53;
            if ((distance > 22 && !partner?.stepping) || reachEmergency) {
                foot.start = { x: foot.x, y: foot.y };
                foot.target = this.footTarget(hip, moving);
                foot.progress = 0;
                foot.stepping = true;
            }
        }
    }
    footTarget(hip, moving) {
        const desiredX = clamp(hip.x + this.facing * (moving ? 29 : 0), 15, sceneSize.width - 15);
        let best = { x: hip.x, y: terrainHeight(hip.x, this.rocks) };
        let bestCost = Number.POSITIVE_INFINITY;
        for (let offset = -36; offset <= 36; offset += 2) {
            const x = clamp(hip.x + offset, 15, sceneSize.width - 15);
            const y = terrainHeight(x, this.rocks);
            const distance = Math.hypot(x - hip.x, y - hip.y);
            if (distance > 53)
                continue;
            const cost = Math.abs(x - desiredX);
            if (cost < bestCost) {
                best = { x, y };
                bestCost = cost;
            }
        }
        return best;
    }
    updateTail(dt) {
        for (const [index, node] of this.tail.entries()) {
            const previous = this.tail[index - 1];
            const baseX = previous?.x ?? this.x - this.facing * 32;
            const baseY = previous?.y ?? this.y + 3;
            const wave = Math.sin(this.time * 3.8 - index * 0.55) *
                Math.min(2.3, Math.abs(this.vx) / 22 + 0.3);
            const targetX = baseX - this.facing * 7;
            const targetY = Math.min(terrainHeight(node.x, this.rocks) - 3, baseY + 1.6 + wave);
            node.vx += ((targetX - node.x) * 160 - node.vx * 21) * dt;
            node.vy += ((targetY - node.y) * 130 - node.vy * 18) * dt;
            node.x += node.vx * dt;
            node.y += node.vy * dt;
            node.y = Math.min(node.y, terrainHeight(node.x, this.rocks) - 2);
        }
    }
}
