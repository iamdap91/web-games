/** 이동 구간과 원의 첫 접촉을 구해 빠른 돌진도 바위를 통과하지 않게 한다. */
export function sweepCircle(options) {
    const { origin, destination, center, radius } = options;
    const offset = { x: origin.x - center.x, z: origin.z - center.z };
    const travel = { x: destination.x - origin.x, z: destination.z - origin.z };
    const c = offset.x ** 2 + offset.z ** 2 - radius ** 2;
    const b = 2 * (offset.x * travel.x + offset.z * travel.z);
    if (c < -1e-8)
        return 0;
    if (c <= 1e-8)
        return b < -1e-9 ? 0 : null;
    const a = travel.x ** 2 + travel.z ** 2;
    if (a <= 1e-12)
        return null;
    const determinant = b ** 2 - 4 * a * c;
    if (determinant < 0)
        return null;
    const contact = (-b - Math.sqrt(determinant)) / (2 * a);
    return contact >= 0 && contact <= 1 ? contact : null;
}
function edges(vertices) {
    return vertices.map((a, index) => {
        const b = vertices[(index + 1) % vertices.length];
        const x = b.x - a.x, z = b.z - a.z;
        const size = Math.hypot(x, z);
        return {
            a,
            b,
            size,
            along: { x: x / size, z: z / size },
            normal: { x: z / size, z: -x / size },
        };
    });
}
function dot(a, b) {
    return a.x * b.x + a.z * b.z;
}
function subtract(a, b) {
    return { x: a.x - b.x, z: a.z - b.z };
}
function nearestBoundary(point, vertices) {
    const candidates = edges(vertices).map((edge) => {
        const offset = subtract(point, edge.a);
        const along = Math.max(0, Math.min(edge.size, dot(offset, edge.along)));
        const nearest = {
            x: edge.a.x + edge.along.x * along,
            z: edge.a.z + edge.along.z * along,
        };
        return {
            edge,
            nearest,
            distance: Math.hypot(point.x - nearest.x, point.z - nearest.z),
            signed: dot(offset, edge.normal),
        };
    });
    const inside = candidates.every((candidate) => candidate.signed <= 1e-9);
    const closest = candidates.sort((a, b) => a.distance - b.distance)[0];
    return { ...closest, inside };
}
export function overlapsShape(shape, point, radius) {
    if (shape.kind === 'circle')
        return (Math.hypot(point.x - shape.center.x, point.z - shape.center.z) <
            shape.radius + radius - 1e-8);
    const boundary = nearestBoundary(point, shape.vertices);
    return boundary.inside || boundary.distance < radius - 1e-8;
}
/** 조각이 벌어지며 캐릭터에 닿으면 가장 가까운 바깥 면으로 밀어낸다. */
export function pushOutsidePolygon(options) {
    const boundary = nearestBoundary(options.point, options.vertices);
    if (!boundary.inside && boundary.distance >= options.radius)
        return options.point;
    const normal = boundary.inside || boundary.distance < 1e-9
        ? boundary.edge.normal
        : {
            x: (options.point.x - boundary.nearest.x) / boundary.distance,
            z: (options.point.z - boundary.nearest.z) / boundary.distance,
        };
    return {
        x: boundary.nearest.x + normal.x * (options.radius + 1e-7),
        z: boundary.nearest.z + normal.z * (options.radius + 1e-7),
    };
}
/** 확장 다각형의 면·둥근 꼭짓점과 첫 접촉을 찾아 돌진 관통을 막는다. */
export function sweepShape(options) {
    const { shape, origin, destination, radius } = options;
    if (shape.kind === 'circle')
        return sweepCircle({
            origin,
            destination,
            center: shape.center,
            radius: radius + shape.radius,
        });
    if (overlapsShape(shape, origin, radius))
        return 0;
    const travel = subtract(destination, origin);
    const contacts = [];
    for (const edge of edges(shape.vertices)) {
        const speed = dot(travel, edge.normal);
        if (speed < -1e-9) {
            const time = (radius - dot(subtract(origin, edge.a), edge.normal)) / speed;
            const along = dot({
                x: origin.x + travel.x * time - edge.a.x,
                z: origin.z + travel.z * time - edge.a.z,
            }, edge.along);
            if (time >= -1e-9 && time <= 1 && along >= 0 && along <= edge.size)
                contacts.push(Math.max(0, time));
        }
        const corner = sweepCircle({ origin, destination, center: edge.a, radius });
        if (corner !== null)
            contacts.push(corner);
    }
    return contacts.length ? Math.min(...contacts) : null;
}
