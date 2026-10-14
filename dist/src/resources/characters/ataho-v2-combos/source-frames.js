import manifest from '../../../../resources/manifest.json' with { type: 'json' };
import { resourceUrl } from '../../catalog/resource-url.js';
import { supplementFrames } from './supplements.js';
const asset = manifest.assets.find((item) => item.id === 'ai/ataho-v2');
if (!asset)
    throw new Error('아타호 v2 원본이 없습니다.');
const animations = asset.animations;
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
export async function loadComboFrames(motions) {
    const unique = new Map(motions.flatMap((motion) => [...motion.steps, ...(motion.supplementedSteps ?? [])].map((step) => [frameKey(step), step])));
    const loaded = await Promise.all([...unique].map(async ([key, step]) => {
        const { frame, label, kind } = originalFrame(step);
        const image = new Image();
        image.src = resourceUrl(frame.localPath).href;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context)
            throw new Error('원본 발 기준을 읽을 수 없습니다.');
        context.drawImage(image, 0, 0);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        let feetY = 0;
        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                if ((pixels[(y * canvas.width + x) * 4 + 3] ?? 0) > 24)
                    feetY = y + 1;
            }
        }
        return [
            key,
            {
                image,
                localPath: frame.localPath,
                label,
                anchorX: frame.pivot.x,
                anchorY: frame.height - frame.pivot.y,
                feetY,
                kind,
            },
        ];
    }));
    return new Map(loaded);
}
