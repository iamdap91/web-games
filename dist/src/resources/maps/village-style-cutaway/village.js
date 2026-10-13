export const cutawayNodes = [
    { x: -15, z: 0 },
    { x: -10, z: 0 },
    { x: -2, z: 0 },
    { x: 9, z: 0 },
    { x: 14, z: 0 },
    { x: 15, z: 0 },
    { x: -12, z: 4 },
    { x: -6, z: 4 },
    { x: -1, z: 4 },
    { x: 1, z: 4 },
    { x: 8, z: 4 },
    { x: 10, z: 4 },
    { x: 12, z: 4 },
    { x: 3, z: 8 },
    { x: 5, z: 8 },
    { x: 12, z: 8 },
];
export const cutawayEdges = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [6, 7],
    [7, 8],
    [8, 9],
    [9, 10],
    [10, 11],
    [11, 12],
    [13, 14],
    [14, 15],
    [2, 7],
    [4, 11],
    [9, 14],
];
export const cutawayFacilities = [
    { id: 'hearth', name: '공방 화덕', x: -10, z: 0 },
    { id: 'dojo', name: '2층 도장', x: 8, z: 4 },
    { id: 'refuge', name: '다락 쉼터', x: 3, z: 8 },
];
const entrance = { x: -14, z: 0 };
const speed = 4;
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function node(index) {
    const point = cutawayNodes[index];
    if (!point)
        throw new Error('보행 연결점이 없습니다.');
    return point;
}
export function projectToCorridor(point) {
    let best = { point: node(0), edge: cutawayEdges[0], distance: Infinity };
    for (const edge of cutawayEdges) {
        const a = node(edge[0]), b = node(edge[1]);
        const dx = b.x - a.x, dz = b.z - a.z;
        const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / (dx * dx + dz * dz)));
        const candidate = { x: a.x + dx * t, z: a.z + dz * t };
        const gap = distance(candidate, point);
        if (gap < best.distance)
            best = { point: candidate, edge, distance: gap };
    }
    return best;
}
export function isCutawayWalkable(point) {
    return projectToCorridor(point).distance < 0.015;
}
function nodeRoute(start, end) {
    const costs = Array(cutawayNodes.length).fill(Infinity);
    const previous = Array(cutawayNodes.length).fill(-1);
    const remaining = new Set(cutawayNodes.map((_, i) => i));
    costs[start] = 0;
    while (remaining.size) {
        let current = -1;
        let minimum = Infinity;
        for (const i of remaining) {
            if ((costs[i] ?? Infinity) < minimum) {
                current = i;
                minimum = costs[i];
            }
        }
        if (current < 0 || current === end)
            break;
        remaining.delete(current);
        for (const [a, b] of cutawayEdges) {
            const next = a === current ? b : b === current ? a : -1;
            if (next < 0 || !remaining.has(next))
                continue;
            const cost = minimum + distance(node(current), node(next));
            if (cost < (costs[next] ?? Infinity)) {
                costs[next] = cost;
                previous[next] = current;
            }
        }
    }
    const result = [end];
    while (result[0] !== start) {
        const before = previous[result[0]];
        if (before === undefined || before < 0)
            return [];
        result.unshift(before);
    }
    return result;
}
export function corridorRoute(from, to) {
    const source = projectToCorridor(from), target = projectToCorridor(to);
    let best = [];
    let shortest = Infinity;
    const consider = (points) => {
        let length = 0;
        for (let i = 1; i < points.length; i++)
            length += distance(points[i - 1], points[i]);
        if (length < shortest) {
            shortest = length;
            best = points.slice(1);
        }
    };
    if (source.edge === target.edge)
        consider([source.point, target.point]);
    for (const a of source.edge)
        for (const b of target.edge) {
            const route = nodeRoute(a, b);
            if (route.length)
                consider([source.point, ...route.map(node), target.point]);
        }
    return best.filter((p, i, route) => i === 0 || distance(p, route[i - 1]) > 0.001);
}
/** 바닥과 계단의 연결망 위에서만 움직인다. 화면의 위쪽을 눌러도 층을 순간이동하지 않는다. */
export class CutawayVillage {
    position = { ...entrance };
    direction = { x: 1, z: 0 };
    route = [];
    restored = false;
    fireSeconds = 0;
    restSeconds = 0;
    elapsed = 0;
    steps = 0;
    moving = false;
    visited = new Set();
    message = '열린 집으로 들어가세요. 화덕 → 계단 → 2층 도장 → 다락 쉼터';
    get snapshot() {
        const nearby = cutawayFacilities.find((f) => distance(this.position, f) < 0.85)?.id ??
            null;
        const projection = projectToCorridor(this.position);
        return {
            position: { ...this.position },
            direction: { ...this.direction },
            target: this.route.length
                ? { ...this.route[this.route.length - 1] }
                : null,
            nearby,
            moving: this.moving,
            floor: Math.round(this.position.z / 4),
            onStairs: node(projection.edge[0]).z !== node(projection.edge[1]).z,
            restored: this.restored,
            fireSeconds: this.fireSeconds,
            restSeconds: this.restSeconds,
            elapsed: this.elapsed,
            steps: this.steps,
            visited: [...this.visited],
            message: this.message,
        };
    }
    walkTo(point) {
        if (!Number.isFinite(point.x) || !Number.isFinite(point.z))
            return;
        this.route = [...corridorRoute(this.position, point)];
    }
    update(delta, input) {
        this.elapsed += delta;
        this.fireSeconds = Math.max(0, this.fireSeconds - delta);
        this.restSeconds = Math.max(0, this.restSeconds - delta);
        this.moving = false;
        if (Math.hypot(input.x, input.z) > 0.1) {
            this.route = [];
            this.moveDirect(delta, input);
            return;
        }
        let budget = speed * delta;
        while (budget > 0 && this.route.length) {
            const target = this.route[0];
            const gap = distance(this.position, target);
            if (gap < 0.001) {
                this.route.shift();
                continue;
            }
            const step = Math.min(budget, gap);
            this.advance(target, step);
            budget -= step;
            if (step === gap)
                this.route.shift();
        }
    }
    interact() {
        const nearby = this.snapshot.nearby;
        if (!nearby) {
            this.message =
                '같은 층의 시설 가까이에서 사용하세요. 위층은 계단을 따라갑니다.';
            return;
        }
        this.visited.add(nearby);
        if (nearby === 'hearth') {
            this.fireSeconds = 8;
            this.message =
                '장작이 타오르고 공방 손이 바빠집니다. 왼쪽 계단이나 바깥 계단을 골라 올라가세요.';
        }
        else if (nearby === 'dojo') {
            this.toggleRestored();
        }
        else {
            this.restSeconds = 8;
            this.message =
                this.visited.size === 3
                    ? '집의 하루를 모두 들여다봤어요. 다락 차 향을 뒤로하고 바깥 계단으로 돌아갈까요?'
                    : '다락의 작은 쉼터를 찾았어요. 숙소 창문 너머로 마을 불빛이 보입니다.';
        }
    }
    toggleRestored() {
        this.restored = !this.restored;
        this.message = this.restored
            ? '도장이 밝아졌어요. 낡은 상자 대신 수련 매트와 장비가 들어오고 주민이 연습을 시작합니다.'
            : '복구 전의 도장입니다. 비어 있는 내부 공간을 비교하세요.';
    }
    reset() {
        this.position = { ...entrance };
        this.route = [];
        this.moving = false;
        this.message = '입구로 돌아왔어요. 복구와 방문 기록은 남아 있습니다.';
    }
    advance(target, step) {
        const gap = distance(this.position, target);
        if (!gap)
            return;
        const dx = (target.x - this.position.x) / gap, dz = (target.z - this.position.z) / gap;
        this.direction = { x: dx, z: dz };
        this.position = {
            x: this.position.x + dx * step,
            z: this.position.z + dz * step,
        };
        this.steps += step;
        this.moving = true;
    }
    moveDirect(delta, input) {
        // 교차점에서는 누른 방향과 가장 가까운 길을 고른다. 계단 중간은 그 계단의 접선만 허용한다.
        const choices = [];
        for (const [a, b] of cutawayEdges) {
            const pa = node(a), pb = node(b);
            const d = distance(pa, pb);
            if (Math.abs(distance(pa, this.position) + distance(pb, this.position) - d) > 0.02)
                continue;
            for (const target of [pa, pb]) {
                const gap = distance(this.position, target);
                if (gap < 0.001)
                    continue;
                choices.push({
                    point: target,
                    score: ((target.x - this.position.x) * input.x +
                        (target.z - this.position.z) * input.z) /
                        gap /
                        Math.hypot(input.x, input.z),
                });
            }
        }
        choices.sort((a, b) => b.score - a.score);
        const chosen = choices[0];
        if (chosen && chosen.score > 0.25)
            this.advance(chosen.point, Math.min(speed * delta, distance(chosen.point, this.position)));
    }
}
