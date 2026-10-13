import { canWalkNatural, groundHeight, riverCenter, } from './layout.js';
export const highBridgeHeight = 3.9;
export function highDeck(p) {
    return p.x >= 4 && p.x <= 11.8 && Math.abs(p.z - 3) <= 0.68;
}
export function lowDeck(p) {
    return (p.z >= -3 &&
        p.z <= 7 &&
        Math.abs(p.x - riverCenter(p.z)) <=
            (p.z > 6.45 || p.z < -2.45 ? 1.95 : 0.52));
}
export function travelHeight(p) {
    if (p.layer === 'low')
        return 0.36;
    if (p.layer === 'high') {
        const lift = Math.min(1, Math.max(0, (p.x - 4) / 2), Math.max(0, (11.8 - p.x) / 2));
        return (groundHeight({ x: p.x, z: 3 }) * (1 - lift) + highBridgeHeight * lift);
    }
    return groundHeight(p);
}
export function canTravel(p) {
    if (p.layer === 'high')
        return highDeck(p);
    if (p.layer === 'low')
        return lowDeck(p);
    return canWalkNatural(p);
}
export function travelStep(from, p) {
    let layer = from.layer;
    if (layer === 'ground') {
        if (highDeck(p) && (p.x < 4.6 || p.x > 11.2))
            layer = 'high';
        else if (lowDeck(p) && (p.z > 6.45 || p.z < -2.45))
            layer = 'low';
    }
    else if (layer === 'high' && !highDeck(p)) {
        if (Math.abs(p.z - 3) > 0.68 || (p.x >= 4 && p.x <= 11.8))
            return null;
        layer = 'ground';
    }
    else if (layer === 'low' && !lowDeck(p)) {
        if (p.z >= -2.45 && p.z <= 6.45)
            return null;
        layer = 'ground';
    }
    const next = { x: p.x, z: p.z, layer };
    return canTravel(next) ? next : null;
}
/** 층을 경로 노드에 포함해 같은 평면 교점에서 다리 위와 아래가 섞이지 않는다. */
export function crossingRoute(from, target) {
    const unit = 0.4, size = 67, offset = 33;
    const layers = ['ground', 'high', 'low'];
    const encode = (p) => (layers.indexOf(p.layer) * size + Math.round(p.z / unit) + offset) * size +
        Math.round(p.x / unit) +
        offset;
    const decode = (id) => ({
        x: ((id % size) - offset) * unit,
        z: ((Math.floor(id / size) % size) - offset) * unit,
        layer: layers[Math.floor(id / (size * size))] ?? 'ground',
    });
    const goal = { ...target, layer: target.layer ?? 'ground' };
    if (!canTravel(goal))
        return [];
    const start = encode(from), last = encode(goal), open = new Set([start]), cost = new Map([[start, 0]]), prev = new Map();
    for (let n = 0; open.size && n < 18000; n++) {
        let current = -1, best = Infinity;
        for (const id of open) {
            const p = decode(id);
            const score = (cost.get(id) ?? 0) + Math.hypot(p.x - goal.x, p.z - goal.z);
            if (score < best) {
                best = score;
                current = id;
            }
        }
        if (current === last) {
            const result = [goal];
            let id = current;
            while (id !== start) {
                result.unshift(decode(id));
                id = prev.get(id) ?? start;
            }
            return result;
        }
        open.delete(current);
        const p = decode(current);
        for (const [dx, dz] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
        ]) {
            const q = travelStep(p, { x: p.x + dx * unit, z: p.z + dz * unit });
            if (!q)
                continue;
            const id = encode(q), next = (cost.get(current) ?? 0) + unit * (q.layer === 'low' ? 1.5 : 1);
            if (next < (cost.get(id) ?? Infinity)) {
                cost.set(id, next);
                prev.set(id, current);
                open.add(id);
            }
        }
    }
    return [];
}
