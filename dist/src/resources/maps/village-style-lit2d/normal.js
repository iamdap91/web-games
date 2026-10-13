/** 화면 y가 아래로 향하므로 높이장의 y 기울기를 반전해 GL의 위쪽 축과 맞춘다. */
export function heightNormal(left, right, up, down) {
    const x = (left - right) * 0.45, y = (down - up) * 0.45;
    const length = Math.hypot(x, y, 1);
    return { x: x / length, y: y / length, z: 1 / length };
}
export function encodeNormal(normal) {
    return [
        Math.round((normal.x * 0.5 + 0.5) * 255),
        Math.round((normal.y * 0.5 + 0.5) * 255),
        Math.round((normal.z * 0.5 + 0.5) * 255),
    ];
}
export function surfaceDiffuse(normal, light) {
    const length = Math.hypot(light.x, light.y, light.z);
    return length > 0
        ? Math.max(0, (normal.x * light.x + normal.y * light.y + normal.z * light.z) / length)
        : 0;
}
export function normalPixels(heights, width, height) {
    if (heights.length !== width * height)
        throw new Error('색 그림과 normal 지도의 크기를 맞춰주세요.');
    const result = new Uint8ClampedArray(width * height * 4);
    const get = (x, y) => heights[Math.max(0, Math.min(height - 1, y)) * width +
        Math.max(0, Math.min(width - 1, x))] ?? 0;
    for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) {
            const encoded = encodeNormal(heightNormal(get(x - 1, y), get(x + 1, y), get(x, y - 1), get(x, y + 1)));
            const i = (y * width + x) * 4;
            result[i] = encoded[0];
            result[i + 1] = encoded[1];
            result[i + 2] = encoded[2];
            result[i + 3] = 255;
        }
    return result;
}
