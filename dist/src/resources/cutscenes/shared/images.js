import { resourceUrl } from '../../catalog/resource-url.js';
export function record(value) {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
        throw new Error('컷씬 애셋 기록의 형식이 올바르지 않습니다.');
    return value;
}
export async function loadImage(value) {
    const item = record(value);
    if (typeof item.localPath !== 'string')
        throw new Error('컷씬 그림의 로컬 경로가 없습니다.');
    const image = new Image();
    image.src = resourceUrl(item.localPath).href;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx)
        throw new Error('컷씬 그림을 읽을 수 없습니다.');
    ctx.drawImage(image, 0, 0);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let left = canvas.width;
    let top = canvas.height;
    let right = 0;
    let bottom = 0;
    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            if ((data[(y * canvas.width + x) * 4 + 3] ?? 0) < 24)
                continue;
            left = Math.min(left, x);
            top = Math.min(top, y);
            right = Math.max(right, x + 1);
            bottom = Math.max(bottom, y + 1);
        }
    }
    if (right === 0)
        throw new Error(`비어 있는 컷씬 그림: ${item.localPath}`);
    return {
        image,
        bounds: { left, top, right, bottom },
        durationMs: typeof item.durationMs === 'number' ? item.durationMs : 80,
    };
}
