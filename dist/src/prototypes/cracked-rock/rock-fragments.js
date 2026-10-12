import { rockForm, rockRingVertices } from './rock-form.js';
export const fragmentRules = {
    duration: 0.45,
    spread: 1.1,
    reducedSpread: 0.55,
    tilt: -0.2,
    sink: 0.15,
};
/** 표시와 충돌은 같은 파괴 시각에서 이동량과 기울기를 계산한다. */
export function fragmentPose(options) {
    const progress = Math.min(1, Math.max(0, options.elapsed / fragmentRules.duration));
    return {
        x: options.sign *
            progress *
            (options.motion === 'reduced'
                ? fragmentRules.reducedSpread
                : fragmentRules.spread),
        y: -progress * fragmentRules.sink,
        tilt: options.motion === 'reduced'
            ? 0
            : options.sign * progress * fragmentRules.tilt,
    };
}
function cross(a, b, c) {
    return (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
}
function convexHull(points) {
    const sorted = [...points].sort((a, b) => a.x - b.x || a.z - b.z);
    const half = (values) => {
        const hull = [];
        for (const point of values) {
            while (hull.length >= 2 &&
                cross(hull[hull.length - 2], hull.at(-1), point) <= 1e-10)
                hull.pop();
            hull.push(point);
        }
        hull.pop();
        return hull;
    };
    return [...half(sorted), ...half(sorted.reverse())];
}
/** 실제 조각의 모든 꼭짓점을 기울인 뒤 지면에 투영해 볼록 충돌 경계를 만든다. */
export function fragmentFootprints(options) {
    const angle = options.placement.weakNormal
        ? Math.atan2(options.placement.weakNormal.x, options.placement.weakNormal.z)
        : 0;
    return [-1, 1].map((sign) => {
        const pose = fragmentPose({
            sign,
            elapsed: options.elapsed,
            motion: options.motion,
        });
        const points = [];
        for (const ring of rockForm.rings) {
            const vertices = rockRingVertices(ring);
            const clipped = [
                ...vertices.filter((vertex) => vertex.x * sign >= 0),
                {
                    x: 0,
                    y: ring.y,
                    z: rockForm.radius * ring.scale * Math.cos(Math.PI / 8),
                },
                {
                    x: 0,
                    y: ring.y,
                    z: -rockForm.radius * ring.scale * Math.cos(Math.PI / 8),
                },
            ];
            for (const vertex of clipped) {
                const x = vertex.x * Math.cos(pose.tilt) -
                    vertex.y * Math.sin(pose.tilt) +
                    pose.x;
                points.push({
                    x: options.placement.center.x +
                        Math.cos(angle) * x +
                        Math.sin(angle) * vertex.z,
                    z: options.placement.center.z -
                        Math.sin(angle) * x +
                        Math.cos(angle) * vertex.z,
                });
            }
        }
        return convexHull(points);
    });
}
