function unit(value) {
    return Math.max(0, Math.min(1, value));
}
function smooth(value) {
    const t = unit(value);
    return t * t * (3 - 2 * t);
}
function pointKey(point) {
    return `${point.x},${point.y}`;
}
function perimeterSample(points, count) {
    const segments = points.map((point, index) => {
        const next = points[(index + 1) % points.length];
        return Math.hypot(next.x - point.x, next.y - point.y);
    });
    const total = segments.reduce((sum, length) => sum + length, 0);
    const result = [];
    let segment = 0;
    let travelled = 0;
    for (let index = 0; index < count; index++) {
        const distance = (index * total) / count;
        while (segment < segments.length - 1 &&
            travelled + segments[segment] < distance) {
            travelled += segments[segment];
            segment++;
        }
        const a = points[segment];
        const b = points[(segment + 1) % points.length];
        const t = segments[segment]
            ? (distance - travelled) / segments[segment]
            : 0;
        result.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
    return result;
}
function polygonArea(points) {
    return (points.reduce((sum, point, index) => {
        const next = points[(index + 1) % points.length];
        return sum + point.x * next.y - next.x * point.y;
    }, 0) / 2);
}
/** 흩어진 잔불은 모핑 몸으로 묶지 않고 가장 큰 연결된 형상의 바깥선만 보존한다. */
function largestComponent(alpha, size) {
    const visited = new Set();
    let largest = new Set();
    for (let index = 0; index < size * size; index++) {
        if (visited.has(index) || alpha[index * 4 + 3] < 48)
            continue;
        const component = new Set([index]);
        const queue = [index];
        visited.add(index);
        for (let cursor = 0; cursor < queue.length; cursor++) {
            const current = queue[cursor];
            const x = current % size;
            const y = Math.floor(current / size);
            for (const [dx, dy] of [
                [-1, 0],
                [1, 0],
                [0, -1],
                [0, 1],
            ]) {
                const nx = x + dx;
                const ny = y + dy;
                const next = ny * size + nx;
                if (nx < 0 ||
                    nx >= size ||
                    ny < 0 ||
                    ny >= size ||
                    visited.has(next) ||
                    alpha[next * 4 + 3] < 48)
                    continue;
                visited.add(next);
                component.add(next);
                queue.push(next);
            }
        }
        if (component.size > largest.size)
            largest = component;
    }
    return largest;
}
function outerContour(component, size) {
    const edges = new Map();
    const add = (from, to) => {
        const key = pointKey(from);
        const group = edges.get(key) ?? [];
        group.push({ from, to });
        edges.set(key, group);
    };
    for (const index of component) {
        const x = index % size;
        const y = Math.floor(index / size);
        if (!component.has(index - size))
            add({ x, y }, { x: x + 1, y });
        if (x === size - 1 || !component.has(index + 1))
            add({ x: x + 1, y }, { x: x + 1, y: y + 1 });
        if (!component.has(index + size))
            add({ x: x + 1, y: y + 1 }, { x, y: y + 1 });
        if (x === 0 || !component.has(index - 1))
            add({ x, y: y + 1 }, { x, y });
    }
    let largest = [];
    while (edges.size) {
        const group = edges.values().next().value;
        const first = group?.[0];
        if (!first)
            break;
        const loop = [];
        let point = first.from;
        for (let count = 0; count <= size * size * 4; count++) {
            const key = pointKey(point);
            const nextGroup = edges.get(key);
            const next = nextGroup?.pop();
            if (!next)
                break;
            if (!nextGroup?.length)
                edges.delete(key);
            loop.push(point);
            point = next.to;
            if (pointKey(point) === pointKey(first.from))
                break;
        }
        if (Math.abs(polygonArea(loop)) > Math.abs(polygonArea(largest)))
            largest = loop;
    }
    if (polygonArea(largest) < 0)
        largest.reverse();
    return largest;
}
/** 알파 읽기는 로딩 때 한 번만 수행하고 재생과 GIF는 준비된 윤곽을 공유한다. */
export function prepareMetamorphosis(source) {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx)
        throw new Error('호랑이 형상의 윤곽을 준비할 수 없습니다.');
    const bounds = source.bounds;
    ctx.drawImage(source.image, bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top, 0, 0, size, size);
    const pixels = ctx.getImageData(0, 0, size, size).data;
    const contour = outerContour(largestComponent(pixels, size), size);
    if (contour.length < 20)
        throw new Error('호랑이 형상의 연결된 외곽이 부족합니다.');
    const height = 294;
    const width = (height * (bounds.right - bounds.left)) / (bounds.bottom - bounds.top);
    let first = 0;
    contour.forEach((point, index) => {
        if (point.y < contour[first].y ||
            (point.y === contour[first].y &&
                Math.abs(point.x - size / 2) < Math.abs(contour[first].x - size / 2)))
            first = index;
    });
    const ordered = [...contour.slice(first), ...contour.slice(0, first)];
    return {
        outline: perimeterSample(ordered, 180).map((point) => ({
            x: (point.x / size - 0.5) * width,
            y: (point.y / size - 0.5) * height,
        })),
        width,
        height,
    };
}
function closePath(ctx, points) {
    ctx.beginPath();
    points.forEach((point, index) => {
        if (index)
            ctx.lineTo(point.x, point.y);
        else
            ctx.moveTo(point.x, point.y);
    });
    ctx.closePath();
}
export function drawMetamorphosis(ctx, source, shape, options) {
    const paperProgress = smooth((options.timeMs - 520) / 620);
    const morph = smooth((options.timeMs - 1000) / 1530);
    const first = shape.outline[0];
    const startAngle = Math.atan2(first.y, first.x);
    const paper = perimeterSample([
        { x: 0, y: -23 },
        { x: 12, y: -23 },
        { x: 12, y: 23 },
        { x: -12, y: 23 },
        { x: -12, y: -23 },
    ], shape.outline.length);
    const points = shape.outline.map((target, index) => {
        const angle = startAngle + (index / shape.outline.length) * Math.PI * 2;
        const wave = options.reducedMotion
            ? 0
            : Math.sin(angle * 5 + options.timeMs / 310) *
                5 *
                Math.sin(paperProgress * Math.PI);
        const radius = 52 + Math.sin(angle * 3 + 0.6) * 7 + wave;
        const blob = {
            x: Math.cos(angle) * radius * 1.1,
            y: Math.sin(angle) * radius * 0.88,
        };
        const origin = {
            x: paper[index].x + (blob.x - paper[index].x) * paperProgress,
            y: paper[index].y + (blob.y - paper[index].y) * paperProgress,
        };
        // 양 앞발과 귀 사이의 틈이 자라도록 외곽의 각 점에 서로 다른 진행을 준다.
        const local = smooth(morph + Math.sin(angle * 2.7) * 0.14 * Math.sin(morph * Math.PI));
        return {
            x: origin.x + (target.x - origin.x) * local,
            y: origin.y + (target.y - origin.y) * local,
        };
    });
    ctx.save();
    ctx.translate(651, 284);
    ctx.globalAlpha *= 1 - smooth((options.timeMs - 3660) / 340);
    closePath(ctx, points);
    ctx.fillStyle = paperProgress < 0.12 ? '#e6d6ac' : '#16212a';
    ctx.fill();
    ctx.strokeStyle = '#b6a375';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.save();
    ctx.clip();
    if (paperProgress < 0.55) {
        ctx.fillStyle = '#8b3b32';
        ctx.fillRect(-4, -12, 8, 23);
    }
    // 외곽 변형이 읽힌 뒤에만 고정 위치의 승인 원화 내부를 되찾는다.
    ctx.globalAlpha *= smooth((morph - 0.64) / 0.36);
    const bounds = source.bounds;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(source.image, bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top, -shape.width / 2, -shape.height / 2, shape.width, shape.height);
    ctx.restore();
    ctx.restore();
    return {
        progress: morph,
        phase: options.timeMs < 1000
            ? '부적에서 먹덩어리로'
            : options.timeMs < 2530
                ? '귀와 양 앞발의 분리'
                : '호랑이 형상 정착',
    };
}
