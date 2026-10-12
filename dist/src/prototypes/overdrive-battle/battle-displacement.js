/** 예고와 실행이 같은 경로·도착 위치를 사용한다. 다음 이동은 앞선 도착 위치를 반영한다. */
export function planDisplacements(enemies, player, requests, space) {
    const positions = new Map(enemies.map((enemy) => [enemy.id, { ...enemy }]));
    const moves = [];
    for (const request of [...requests].sort((a, b) => a.enemyId - b.enemyId)) {
        const enemy = positions.get(request.enemyId);
        if (!enemy || enemy.health <= 0)
            continue;
        const from = { x: enemy.x, z: enemy.z };
        const path = [from];
        const length = Math.hypot(request.direction.x, request.direction.z);
        if (!Number.isFinite(length) ||
            !Number.isFinite(request.distance) ||
            length === 0 ||
            request.distance <= 0) {
            moves.push({ enemyId: enemy.id, from, to: from, path, blockedBy: null });
            continue;
        }
        const distance = Math.min(request.distance, Math.hypot(space.width, space.depth));
        const steps = Math.ceil(distance / 0.05);
        let to = from;
        let blockedBy = null;
        for (let step = 1; step <= steps; step++) {
            const next = {
                x: from.x + ((request.direction.x / length) * distance * step) / steps,
                z: from.z + ((request.direction.z / length) * distance * step) / steps,
            };
            if (Math.abs(next.x) > space.width / 2 - enemy.radius ||
                Math.abs(next.z) > space.depth / 2 - enemy.radius) {
                blockedBy = { kind: 'boundary' };
                break;
            }
            if (Math.hypot(next.x - player.x, next.z - player.z) <
                enemy.radius + player.radius - 1e-6) {
                blockedBy = { kind: 'player' };
                break;
            }
            const obstacle = [...positions.values()]
                .filter((other) => other.id !== enemy.id && other.health > 0)
                .sort((a, b) => a.id - b.id)
                .find((other) => Math.hypot(next.x - other.x, next.z - other.z) <
                enemy.radius + other.radius - 1e-6);
            if (obstacle) {
                blockedBy = { kind: 'enemy', enemyId: obstacle.id };
                break;
            }
            to = next;
            path.push(next);
        }
        positions.set(enemy.id, { ...enemy, ...to });
        moves.push({ enemyId: enemy.id, from, to, path, blockedBy });
    }
    return moves;
}
