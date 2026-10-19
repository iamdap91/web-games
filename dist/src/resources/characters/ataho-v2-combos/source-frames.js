import manifest from '../../../../resources/manifest.json' with { type: 'json' };
import { resourceUrl } from '../../catalog/resource-url.js';
import { supplementFrames, supplementFrameView } from './supplements.js';
const asset = manifest.assets.find((item) => item.id === 'ai/ataho-v2');
if (!asset)
    throw new Error('아타호 v2 원본이 없습니다.');
const animations = asset.animations;
const emphasisPalette = [
    [25, 20, 18],
    [134, 83, 48],
    [255, 233, 184],
];
/** 원본의 알파와 외곽 픽셀을 보존하며 RGB만 세 명도로 바꾼다. */
export function emphasisPixels(pixels) {
    const result = new Uint8ClampedArray(pixels.length);
    for (let index = 0; index < pixels.length; index += 4) {
        const alpha = pixels[index + 3] ?? 0;
        result[index + 3] = alpha;
        if (alpha === 0)
            continue;
        const luminance = (pixels[index] ?? 0) * 0.2126 +
            (pixels[index + 1] ?? 0) * 0.7152 +
            (pixels[index + 2] ?? 0) * 0.0722;
        const color = emphasisPalette[luminance < 72 ? 0 : luminance < 168 ? 1 : 2];
        result[index] = color[0];
        result[index + 1] = color[1];
        result[index + 2] = color[2];
    }
    return result;
}
async function createEmphasisImage(imageData) {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const context = canvas.getContext('2d');
    if (!context)
        throw new Error('제한 팔레트 그림을 만들 수 없습니다.');
    const result = context.createImageData(imageData.width, imageData.height);
    result.data.set(emphasisPixels(imageData.data));
    context.putImageData(result, 0, 0);
    const image = new Image();
    image.src = canvas.toDataURL('image/png');
    await image.decode();
    return image;
}
export function frameKey(step) {
    return `${step.motion}:${step.frame}`;
}
export function originalFrame(step) {
    const animation = supplementFrames[step.motion] ?? animations[step.motion];
    const frame = animation?.frames[step.frame];
    if (!frame)
        throw new Error(`원본 자세를 찾을 수 없습니다: ${frameKey(step)}`);
    return {
        frame,
        label: animation?.label ?? step.motion,
        kind: supplementFrames[step.motion]
            ? 'generated'
            : 'original',
    };
}
export function comboFrameSteps(motion) {
    return [
        ...motion.steps,
        ...(motion.finisher?.actors?.flatMap((actor) => actor.steps) ?? []),
        ...(motion.effects ?? []).flatMap((effect) => effect.kind === 'pose'
            ? effect.replacements.map((item) => item.replacement)
            : []),
        ...(motion.supplementedSteps ?? []),
        ...(motion.presentations?.flatMap((presentation) => presentation.steps) ??
            []),
    ];
}
export async function loadSourceFrame(step) {
    const { frame, label, kind } = originalFrame(step);
    const image = new Image();
    image.src = resourceUrl(frame.localPath).href;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = frame.width;
    canvas.height = frame.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context)
        throw new Error('원본 발 기준을 읽을 수 없습니다.');
    // 큰 생성 원본도 선언한 논리 픽셀 크기로만 재생하며 파일의 원본은 보존한다.
    context.imageSmoothingEnabled = false;
    const view = supplementFrameView(step);
    if (view) {
        const source = view.sourceRect;
        const destination = view.destinationRect;
        context.drawImage(image, source.x, source.y, source.width, source.height, destination.x, destination.y, destination.width, destination.height);
    }
    else {
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
    }
    if (view ||
        image.naturalWidth !== frame.width ||
        image.naturalHeight !== frame.height) {
        image.src = canvas.toDataURL('image/png');
        await image.decode();
    }
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    const emphasisImage = await createEmphasisImage(imageData);
    let feetY = 0;
    let left = canvas.width;
    let top = canvas.height;
    let right = 0;
    let bottom = 0;
    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            if ((pixels[(y * canvas.width + x) * 4 + 3] ?? 0) <= 24)
                continue;
            feetY = y + 1;
            left = Math.min(left, x);
            top = Math.min(top, y);
            right = Math.max(right, x + 1);
            bottom = Math.max(bottom, y + 1);
        }
    }
    return {
        image,
        emphasisImage,
        localPath: frame.localPath,
        label,
        anchorX: frame.pivot.x,
        anchorY: frame.height - frame.pivot.y,
        feetY,
        bounds: right > left && bottom > top
            ? { left, top, right, bottom }
            : { left: 0, top: 0, right: canvas.width, bottom: canvas.height },
        kind,
    };
}
