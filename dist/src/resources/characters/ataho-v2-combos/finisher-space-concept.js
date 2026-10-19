import { stageHeight, stageWidth } from './pose-drawing.js';
const fractureLifetimeMs = 520;
function active(frame) {
    return (frame.finisher.definition.theme === 'omnislash' &&
        frame.options.showMovement &&
        !frame.snapshot.waiting &&
        frame.snapshot.elapsedMs < frame.snapshot.durationMs);
}
function clamp(value, minimum = 0, maximum = 1) {
    return Math.max(minimum, Math.min(maximum, value));
}
function noise(seed) {
    const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return value - Math.floor(value);
}
function hitTime(frame, contact) {
    return frame.finisher.connectedOnly ? contact.timeMs : contact.plannedTimeMs;
}
function visibleHit(frame, contact) {
    return !frame.finisher.connectedOnly || contact.connected;
}
/** 소실은 이동 흔적을 더하지 않고 배경의 정보 자체를 끊는다. */
export function drawSpaceConceptBackdrop(ctx, frame) {
    if (!active(frame))
        return;
    const { snapshot, bounds } = frame;
    const progress = clamp(snapshot.stepElapsedMs / snapshot.step.durationMs);
    const opacity = snapshot.step.teleport === 'hidden'
        ? 0.98
        : snapshot.step.teleport === 'vanish'
            ? progress * 0.94
            : snapshot.step.teleport === 'appear'
                ? (1 - progress) * 0.9
                : 0;
    if (opacity <= 0)
        return;
    ctx.save();
    ctx.globalAlpha *= opacity;
    ctx.fillStyle = '#010711';
    ctx.fillRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);
    ctx.restore();
}
function crackCenter(index) {
    // 한 번 생긴 유리는 배우나 카메라를 따라가지 않고 화면의 같은 자리에 남는다.
    const positions = [
        { x: 0.2, y: 0.41 },
        { x: 0.68, y: 0.56 },
        { x: 0.34, y: 0.76 },
        { x: 0.8, y: 0.31 },
        { x: 0.45, y: 0.29 },
    ];
    const position = positions[index % positions.length];
    return { x: position.x * stageWidth, y: position.y * stageHeight };
}
function branch(origin, seed, angle, length) {
    const points = [origin];
    let previous = origin;
    for (let index = 0; index < 5; index++) {
        const heading = angle + (noise(seed + index * 11) - 0.5) * 0.8;
        const distance = (length / 5) * (0.7 + noise(seed + index * 7) * 0.6);
        previous = {
            x: clamp(previous.x + Math.cos(heading) * distance, 24, stageWidth - 24),
            y: clamp(previous.y + Math.sin(heading) * distance, 96, stageHeight - 42),
        };
        points.push(previous);
    }
    return points;
}
function makeCrack(index) {
    const center = crackCenter(index);
    const seed = 17 + index * 53;
    const heading = -2.5 + noise(seed) * 4.4;
    const first = branch(center, seed, heading, 102 + noise(seed + 1) * 62);
    const second = branch(center, seed + 19, heading + Math.PI + 0.35, 65 + noise(seed + 2) * 49);
    return [
        first,
        second,
        branch(first[2], seed + 31, heading + 1.12, 38 + noise(seed + 3) * 33),
        branch(second[3], seed + 47, heading - 1.34, 28 + noise(seed + 4) * 27),
    ];
}
function readability(point) {
    // 몸과 샌드백이 놓이는 중앙은 비워 보이게 하고, 얼굴 위로 굵은 획을 겹치지 않는다.
    const distance = Math.hypot((point.x - stageWidth * 0.51) / 155, (point.y - stageHeight * 0.58) / 133);
    return 0.24 + clamp((distance - 0.5) / 0.85) * 0.76;
}
function drawCrack(ctx, crack, growth, opacity) {
    ctx.save();
    ctx.lineCap = 'butt';
    for (const [pathIndex, points] of crack.entries()) {
        for (let index = 0; index < points.length - 1; index++) {
            const progress = clamp(growth * (points.length - 1) - index);
            if (!progress)
                continue;
            const from = points[index];
            const to = points[index + 1];
            const end = {
                x: from.x + (to.x - from.x) * progress,
                y: from.y + (to.y - from.y) * progress,
            };
            ctx.globalAlpha =
                opacity *
                    readability({ x: (from.x + end.x) / 2, y: (from.y + end.y) / 2 });
            ctx.lineWidth = pathIndex < 2 ? 1.25 : 0.85;
            ctx.strokeStyle = '#d3f0ff';
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
            ctx.globalAlpha *= 0.48;
            ctx.lineWidth = 0.8;
            ctx.strokeStyle = '#172e4a';
            ctx.beginPath();
            ctx.moveTo(from.x + 1.2, from.y + 0.8);
            ctx.lineTo(end.x + 1.2, end.y + 0.8);
            ctx.stroke();
        }
    }
    ctx.restore();
}
function makeShards() {
    const columns = 4;
    const rows = 3;
    const points = Array.from({ length: rows + 1 }, (_, row) => Array.from({ length: columns + 1 }, (_, column) => {
        const seed = row * 31 + column * 7;
        return {
            x: (column / columns) * stageWidth +
                (column === 0 || column === columns
                    ? 0
                    : (noise(seed) - 0.5) * (stageWidth / columns) * 0.9),
            y: (row / rows) * stageHeight +
                (row === 0 || row === rows
                    ? 0
                    : (noise(seed + 13) - 0.5) * (stageHeight / rows) * 0.9),
        };
    }));
    const shards = [];
    const append = (vertices, seed) => {
        shards.push({
            points: vertices,
            seed,
            center: {
                x: vertices.reduce((sum, point) => sum + point.x, 0) / vertices.length,
                y: vertices.reduce((sum, point) => sum + point.y, 0) / vertices.length,
            },
        });
    };
    for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
            const topLeft = points[row][column];
            const topRight = points[row][column + 1];
            const bottomLeft = points[row + 1][column];
            const bottomRight = points[row + 1][column + 1];
            const seed = row * columns + column;
            if (noise(seed + 3) < 0.5) {
                append([topLeft, topRight, bottomLeft], seed * 2);
                append([topRight, bottomRight, bottomLeft], seed * 2 + 1);
            }
            else {
                append([topLeft, topRight, bottomRight], seed * 2);
                append([topLeft, bottomRight, bottomLeft], seed * 2 + 1);
            }
        }
    }
    return shards;
}
const glassShards = makeShards();
function outerEdge(from, to) {
    return ((from.x === 0 && to.x === 0) ||
        (from.x === stageWidth && to.x === stageWidth) ||
        (from.y === 0 && to.y === 0) ||
        (from.y === stageHeight && to.y === stageHeight));
}
function drawShards(ctx, center, ageMs) {
    const progress = clamp(ageMs / fractureLifetimeMs);
    const burst = 1 - (1 - progress) ** 2;
    const opacity = (1 - progress) ** 1.6;
    for (const shard of glassShards) {
        const dx = shard.center.x - center.x;
        const dy = shard.center.y - center.y;
        const angle = Math.atan2(dy, dx) + (noise(shard.seed + 5) - 0.5) * 0.5;
        const travel = (52 + noise(shard.seed + 41) * 140) * burst;
        ctx.save();
        ctx.translate(shard.center.x + Math.cos(angle) * travel, shard.center.y + Math.sin(angle) * travel + progress * progress * 115);
        ctx.rotate((noise(shard.seed + 17) - 0.5) * burst * 1.25);
        ctx.globalAlpha *= opacity * readability(shard.center);
        ctx.fillStyle = '#ccecff';
        ctx.beginPath();
        for (const [index, point] of shard.points.entries()) {
            const x = point.x - shard.center.x;
            const y = point.y - shard.center.y;
            if (index === 0)
                ctx.moveTo(x, y);
            else
                ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.save();
        ctx.globalAlpha *= 0.085;
        ctx.fill();
        ctx.restore();
        ctx.lineWidth = 1.3;
        ctx.strokeStyle = '#d4f2ff';
        for (const [index, from] of shard.points.entries()) {
            const to = shard.points[(index + 1) % shard.points.length];
            // 화면 바깥 테두리는 생략해 유리 파편에도 네모 액자를 만들지 않는다.
            if (outerEdge(from, to))
                continue;
            ctx.beginPath();
            ctx.moveTo(from.x - shard.center.x, from.y - shard.center.y);
            ctx.lineTo(to.x - shard.center.x, to.y - shard.center.y);
            ctx.stroke();
        }
        ctx.restore();
    }
}
/** 카메라 변환 밖에서 다섯 명중을 화면의 상처로 남기고 여섯 번째에 깨뜨린다. */
export function drawSpaceConceptScreenOverlay(ctx, frame) {
    if (!active(frame) || frame.options.showContacts === false)
        return;
    const contacts = frame.finisher.contacts;
    const final = contacts.at(-1);
    if (!final)
        return;
    const finalAge = visibleHit(frame, final)
        ? frame.snapshot.elapsedMs - hitTime(frame, final)
        : -Infinity;
    if (finalAge >= fractureLifetimeMs)
        return;
    const fractureOpacity = finalAge < 0 ? 1 : 1 - clamp(finalAge / 85);
    const endOpacity = clamp((frame.snapshot.durationMs - frame.snapshot.elapsedMs) / 180);
    const inheritedOpacity = ctx.globalAlpha * frame.snapshot.opacity;
    for (const [index, contact] of contacts.slice(0, -1).entries()) {
        if (!visibleHit(frame, contact))
            continue;
        const age = frame.snapshot.elapsedMs - hitTime(frame, contact);
        if (age < 0)
            continue;
        drawCrack(ctx, makeCrack(index), clamp(age / 95), inheritedOpacity * fractureOpacity * endOpacity * 0.8);
    }
    if (finalAge < 0)
        return;
    ctx.save();
    ctx.globalAlpha *= frame.snapshot.opacity * endOpacity;
    drawShards(ctx, {
        x: clamp(final.x, stageWidth * 0.25, stageWidth * 0.75),
        y: clamp(final.y, 110, stageHeight - 90),
    }, finalAge);
    ctx.restore();
}
