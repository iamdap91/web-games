export const inkTrailScaleRange = { min: 0, max: 20, step: 0.1, initial: 1 };
export function inkTrailSizeMultiplier(options) {
    const value = options.inkTrailScale ?? inkTrailScaleRange.initial;
    return Number.isFinite(value)
        ? Math.max(inkTrailScaleRange.min, Math.min(inkTrailScaleRange.max, value))
        : inkTrailScaleRange.initial;
}
/** 최근 궤적을 시각에서 재구성해 저장한 그리기 이력에 의존하지 않는다. */
export function visibleInkTrailPoints(points, timeMs, lifetimeMs) {
    const first = points[0];
    const last = points.at(-1);
    if (!first || !last || lifetimeMs <= 0)
        return [];
    const from = Math.max(first.timeMs, timeMs - lifetimeMs);
    const to = Math.min(last.timeMs, timeMs);
    if (from >= to)
        return [];
    const at = (time) => {
        for (let index = 1; index < points.length; index++) {
            const next = points[index];
            if (time > next.timeMs)
                continue;
            const previous = points[index - 1];
            const progress = Math.max(0, Math.min(1, (time - previous.timeMs) /
                Math.max(0.0001, next.timeMs - previous.timeMs)));
            return {
                x: previous.x + (next.x - previous.x) * progress,
                y: previous.y + (next.y - previous.y) * progress,
                timeMs: time,
            };
        }
        return last;
    };
    return [
        at(from),
        ...points.filter((point) => point.timeMs > from && point.timeMs < to),
        at(to),
    ];
}
