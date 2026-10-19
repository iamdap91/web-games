import { kiMotions } from '../../characters/ataho-v2-combos/motions/ki-motions.js';
import { sampleKi } from '../../characters/ataho-v2-combos/ki-sampling.js';
import { drawEruption } from '../../characters/ataho-v2-combos/ki-spatial-drawing.js';
import { battleOptions } from './battle.js';
const source = kiMotions.find((motion) => motion.id === 'ki-eruption');
if (!source)
    throw new Error('조합실의 지열파 원본이 없습니다.');
const definition = source.ki;
const eruptions = [
    { hitIndex: 0, radius: 70, count: 6, size: 0.65 },
    { hitIndex: 1, radius: 204, count: 8, size: 0.8 },
    { hitIndex: 2, radius: 350, count: 12, size: 1 },
]
    .flatMap((ring) => Array.from({ length: ring.count }, (_, index) => {
    const angle = (index * Math.PI * 2) / ring.count;
    return {
        x: Math.cos(angle) * ring.radius,
        y: Math.sin(angle) * ring.radius * 0.22,
        hitIndex: ring.hitIndex,
        size: ring.size,
    };
}))
    .sort((a, b) => a.y - b.y);
/** 원본 지열파의 세 분출을 작은 근거리→중거리→큰 외곽 원으로 한 번씩 배치한다. */
export function drawGeothermalWave(ctx, frames, origin, sourceTimeMs) {
    const sample = sampleKi(definition, sourceTimeMs);
    for (const eruption of eruptions) {
        const hit = definition.hits[eruption.hitIndex];
        const dissolveMs = eruption.hitIndex === definition.hits.length - 1 ? 220 : 0;
        if (sourceTimeMs < hit.atMs ||
            sourceTimeMs >= hit.atMs + hit.durationMs + dissolveMs)
            continue;
        ctx.save();
        ctx.translate(origin.x + eruption.x, origin.y + eruption.y);
        const scale = battleOptions.scale * eruption.size;
        ctx.scale(scale, scale);
        // 분출은 수직으로 유지하고 원본의 (target.x, 0)만 실제 지면점에 정렬한다.
        ctx.translate(-definition.target.x, 0);
        drawEruption(ctx, definition, sample, frames, {
            hitIndex: eruption.hitIndex,
        });
        ctx.restore();
    }
}
