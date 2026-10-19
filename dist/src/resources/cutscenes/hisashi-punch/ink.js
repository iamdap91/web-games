function silhouetteEdge(pixels, width, height, x, y) {
    if (x === 0 || y === 0 || x === width - 1 || y === height - 1)
        return true;
    return (pixels[((y - 1) * width + x) * 4 + 3] === 0 ||
        pixels[((y + 1) * width + x) * 4 + 3] === 0 ||
        pixels[(y * width + x - 1) * 4 + 3] === 0 ||
        pixels[(y * width + x + 1) * 4 + 3] === 0);
}
/** 원본 알파와 픽셀 위치를 유지하며 로딩한 그림의 RGB만 먹선으로 바꾼다. */
export function createInkImage(image) {
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    if (width === 0 || height === 0)
        throw new Error('먹선으로 바꿀 원본 그림을 먼저 불러와야 합니다.');
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context)
        throw new Error('먹선 그림을 만들 수 없습니다.');
    context.drawImage(image, 0, 0);
    const imageData = context.getImageData(0, 0, width, height);
    const pixels = imageData.data;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = (y * width + x) * 4;
            if (pixels[index + 3] === 0)
                continue;
            const luminance = (pixels[index] ?? 0) * 0.2126 +
                (pixels[index + 1] ?? 0) * 0.7152 +
                (pixels[index + 2] ?? 0) * 0.0722;
            // 원본의 얼굴·옷 주름을 남기는 흑백 명암. 이진화로 밝은 면을 지우지 않는다.
            const tone = luminance < 35
                ? 14
                : luminance < 75
                    ? 54
                    : luminance < 125
                        ? 102
                        : luminance < 180
                            ? 158
                            : luminance < 230
                                ? 212
                                : 250;
            const edge = silhouetteEdge(pixels, width, height, x, y);
            const hatch = luminance > 75 && luminance < 180 && (x + y) % 9 === 0;
            const value = edge ? 14 : hatch ? tone - 18 : tone;
            pixels[index] = value;
            pixels[index + 1] = value;
            pixels[index + 2] = value;
        }
    }
    context.putImageData(imageData, 0, 0);
    return canvas;
}
