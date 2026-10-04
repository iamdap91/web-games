export const arena = {
    columns: 13,
    rows: 11,
    collapseDelay: 0.95,
    repairDelay: 0.35,
    duration: 60,
};
export function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}
export function direction(from, to) {
    const length = distance(from, to);
    return length > 0
        ? { x: (to.x - from.x) / length, y: (to.y - from.y) / length }
        : { x: 0, y: 0 };
}
export class Board {
    tiles = Array.from({ length: arena.columns * arena.rows }, (_, i) => ({
        x: i % arena.columns,
        y: Math.floor(i / arena.columns),
        state: 'solid',
        remaining: 0,
        changedAt: 0,
    }));
    get snapshot() {
        return this.tiles.map((tile) => ({ ...tile }));
    }
    tileAt(point) {
        const x = Math.floor(point.x);
        const y = Math.floor(point.y);
        if (x < 0 || y < 0 || x >= arena.columns || y >= arena.rows)
            return undefined;
        return this.tiles[y * arena.columns + x];
    }
    supports(point) {
        const tile = this.tileAt(point);
        return tile?.state === 'solid' || tile?.state === 'cracking';
    }
    step(point, time) {
        const tile = this.tileAt(point);
        if (tile?.state !== 'solid')
            return;
        tile.state = 'cracking';
        tile.remaining = arena.collapseDelay;
        tile.changedAt = time;
    }
    update(dt, time) {
        for (const tile of this.tiles) {
            if (tile.state !== 'cracking' && tile.state !== 'repairing')
                continue;
            tile.remaining -= dt;
            if (tile.remaining > 0)
                continue;
            tile.state = tile.state === 'cracking' ? 'gone' : 'solid';
            tile.remaining = 0;
            tile.changedAt = time;
        }
    }
    repairNear(point, time, count) {
        const candidates = this.tiles.filter((tile) => tile.state === 'gone');
        candidates.sort((a, b) => distance({ x: a.x + 0.5, y: a.y + 0.5 }, point) -
            distance({ x: b.x + 0.5, y: b.y + 0.5 }, point));
        for (const tile of candidates.slice(0, count)) {
            tile.state = 'repairing';
            tile.remaining = arena.repairDelay;
            tile.changedAt = time;
        }
        return Math.min(count, candidates.length);
    }
}
