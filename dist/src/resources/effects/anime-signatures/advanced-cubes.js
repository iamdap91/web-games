function unit(value) {
    return Math.max(0, Math.min(1, value));
}
function polygon(ctx, points, color) {
    ctx.beginPath();
    points.forEach((point, index) => {
        if (index)
            ctx.lineTo(point.x, point.y);
        else
            ctx.moveTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
}
function rotate(point, angles) {
    const a = {
        x: point.x,
        y: point.y * Math.cos(angles.x) - point.z * Math.sin(angles.x),
        z: point.y * Math.sin(angles.x) + point.z * Math.cos(angles.x),
    };
    const b = {
        x: a.x * Math.cos(angles.y) + a.z * Math.sin(angles.y),
        y: a.y,
        z: -a.x * Math.sin(angles.y) + a.z * Math.cos(angles.y),
    };
    return {
        x: b.x * Math.cos(angles.z) - b.y * Math.sin(angles.z),
        y: b.x * Math.sin(angles.z) + b.y * Math.cos(angles.z),
        z: b.z,
    };
}
function drawCube(ctx, center, size, angles) {
    const vertices = Array.from({ length: 8 }, (_, index) => rotate({
        x: ((index & 1 ? 1 : -1) * size) / 2,
        y: ((index & 2 ? 1 : -1) * size) / 2,
        z: ((index & 4 ? 1 : -1) * size) / 2,
    }, angles));
    const faces = [
        [0, 1, 3, 2],
        [4, 6, 7, 5],
        [0, 4, 5, 1],
        [2, 3, 7, 6],
        [0, 2, 6, 4],
        [1, 5, 7, 3],
    ]
        .map((indices) => ({
        indices,
        depth: indices.reduce((sum, index) => sum + vertices[index].z, 0) / 4,
    }))
        .sort((a, b) => b.depth - a.depth);
    for (const face of faces) {
        const a = vertices[face.indices[0]];
        const b = vertices[face.indices[1]];
        const c = vertices[face.indices[2]];
        const ab = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
        const ac = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
        const normal = {
            x: ab.y * ac.z - ab.z * ac.y,
            y: ab.z * ac.x - ab.x * ac.z,
            z: ab.x * ac.y - ab.y * ac.x,
        };
        const length = Math.hypot(normal.x, normal.y, normal.z);
        const light = 0.5 +
            ((normal.x * -0.4 + normal.y * -0.7 + normal.z * -0.58) / length) * 0.45;
        const shade = Math.round(55 + unit(light) * 175);
        polygon(ctx, face.indices.map((index) => {
            const vertex = vertices[index];
            const perspective = 650 / (650 + vertex.z);
            return {
                x: center.x + vertex.x * perspective,
                y: center.y + vertex.y * perspective,
            };
        }), `rgb(${shade - 8} ${shade} ${shade - 5})`);
        ctx.strokeStyle = '#394342';
        ctx.lineWidth = Math.max(0.6, size / 35);
        ctx.stroke();
    }
}
function slab(ctx, cracking) {
    const top = [
        { x: 461, y: 397 },
        { x: 691, y: 364 },
        { x: 819, y: 411 },
        { x: 569, y: 454 },
    ];
    polygon(ctx, [
        { x: 569, y: 454 },
        { x: 819, y: 411 },
        { x: 819, y: 444 },
        { x: 569, y: 487 },
    ], '#57625e');
    polygon(ctx, [
        { x: 461, y: 397 },
        { x: 569, y: 454 },
        { x: 569, y: 487 },
        { x: 461, y: 430 },
    ], '#6c7770');
    polygon(ctx, top, '#a7ada0');
    ctx.strokeStyle = '#424f4b';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (cracking <= 0)
        return;
    ctx.save();
    ctx.globalAlpha *= cracking;
    ctx.strokeStyle = '#303b38';
    ctx.lineWidth = 3;
    for (const points of [
        [
            { x: 584, y: 380 },
            { x: 603, y: 406 },
            { x: 585, y: 427 },
            { x: 621, y: 444 },
        ],
        [
            { x: 665, y: 369 },
            { x: 661, y: 399 },
            { x: 697, y: 418 },
            { x: 695, y: 432 },
        ],
        [
            { x: 514, y: 421 },
            { x: 603, y: 406 },
            { x: 661, y: 399 },
            { x: 742, y: 383 },
        ],
    ]) {
        ctx.beginPath();
        points.forEach((point, index) => {
            if (index)
                ctx.lineTo(point.x, point.y);
            else
                ctx.moveTo(point.x, point.y);
        });
        ctx.stroke();
    }
    ctx.restore();
}
/** 석재 덩어리가 갈라지는 표시만 맡으며 추가 충돌·피해 사건을 만들지 않는다. */
export function drawCubeDebris(ctx, options) {
    const age = (options.timeMs - 1030) / 1000;
    if (age <= 0) {
        slab(ctx, unit((options.timeMs - 760) / 240));
        return 0;
    }
    const motion = options.reducedMotion ? 0.35 : 1;
    const fade = 1 - unit((options.timeMs - 3600) / 400);
    let count = 0;
    ctx.save();
    ctx.globalAlpha *= fade;
    for (let index = 0; index < 12; index++) {
        const column = index % 4;
        const row = Math.floor(index / 4);
        const launch = 155 + ((index * 41) % 140);
        const vx = (column - 1.5) * (62 + row * 11);
        const ground = 426 + row * 12;
        const flight = Math.min(age, launch / 145);
        const center = {
            x: 517 + column * 64 + row * 23 + vx * flight * motion,
            y: ground + (-launch * flight + 145 * flight * flight) * motion,
        };
        const size = 38 + (index % 3) * 5;
        const angles = {
            x: 0.42 + flight * (index % 2 ? -2 : 1.6) * motion,
            y: 0.6 + flight * (1.2 + (index % 3)) * motion,
            z: (column - 1.5) * flight * 0.6 * motion,
        };
        if (!options.enhanced) {
            polygon(ctx, [
                { x: center.x - size / 2, y: center.y - size / 3 },
                { x: center.x + size / 2, y: center.y - size / 4 },
                { x: center.x + size / 3, y: center.y + size / 3 },
                { x: center.x - size / 3, y: center.y + size / 2 },
            ], '#929c8d');
            count++;
            continue;
        }
        const splitAge = age - (0.92 + index * 0.027);
        if (splitAge < 0) {
            drawCube(ctx, center, size, angles);
            count++;
            continue;
        }
        // 작은 여덟 부피를 부모 안쪽에서 시작해 기존 이동을 물려받은 채 흩어 보낸다.
        for (let fragment = 0; fragment < 8; fragment++) {
            const offset = rotate({
                x: ((fragment & 1 ? 1 : -1) * size) / 4,
                y: ((fragment & 2 ? 1 : -1) * size) / 4,
                z: ((fragment & 4 ? 1 : -1) * size) / 4,
            }, angles);
            const spread = Math.min(splitAge, 0.65);
            const x = center.x +
                offset.x +
                (fragment & 1 ? 1 : -1) * spread * (22 + (index % 3) * 6) * motion;
            const y = Math.min(ground + 12, center.y +
                offset.y +
                (fragment & 2 ? 1 : -1) * spread * 35 * motion +
                spread * spread * 65 * motion);
            drawCube(ctx, { x, y }, size * 0.47, {
                x: angles.x + spread * (fragment % 2 ? 2 : -2) * motion,
                y: angles.y + spread * ((fragment % 3) - 1) * 2 * motion,
                z: angles.z + spread * (fragment & 4 ? 1 : -1) * motion,
            });
            count++;
        }
    }
    ctx.restore();
    return count;
}
