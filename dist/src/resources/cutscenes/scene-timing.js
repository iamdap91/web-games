/** 기법의 노출은 보존하고 준비·회수만 압축하는 단조로운 재생 시간표다. */
export class SceneTiming {
    sourceDurationMs;
    durationMs;
    sourceBoundaries;
    segments;
    constructor(sourceDurationMs, profile) {
        this.sourceDurationMs = sourceDurationMs;
        let sourceStart = 0;
        let start = 0;
        this.segments = profile.map(({ endMs, rate }) => {
            if (!Number.isFinite(endMs) ||
                !Number.isFinite(rate) ||
                rate <= 0 ||
                endMs <= sourceStart ||
                endMs > sourceDurationMs + 0.001)
                throw new Error('연출 시간표의 끝과 속도가 올바르지 않습니다.');
            const segment = {
                sourceStart,
                sourceEnd: endMs,
                start,
                end: start + (endMs - sourceStart) / rate,
                rate,
            };
            sourceStart = endMs;
            start = segment.end;
            return segment;
        });
        if (!this.segments.length ||
            Math.abs(sourceStart - sourceDurationMs) > 0.001)
            throw new Error('연출 시간표가 원본의 끝까지 이어져야 합니다.');
        this.durationMs = start;
        this.sourceBoundaries = [0, ...profile.map(({ endMs }) => endMs)];
    }
    toSource(timeMs) {
        if (!Number.isFinite(timeMs) || timeMs <= 0)
            return 0;
        const segment = this.segments.find(({ end }) => timeMs < end);
        if (!segment)
            return this.sourceDurationMs;
        return segment.sourceStart + (timeMs - segment.start) * segment.rate;
    }
    toPresentation(sourceMs) {
        if (!Number.isFinite(sourceMs) || sourceMs <= 0)
            return 0;
        const segment = this.segments.find(({ sourceEnd }) => sourceMs < sourceEnd);
        if (!segment)
            return this.durationMs;
        return segment.start + (sourceMs - segment.sourceStart) / segment.rate;
    }
}
