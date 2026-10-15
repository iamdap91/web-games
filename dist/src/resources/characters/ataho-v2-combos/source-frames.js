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
    const unique = new Map(motions.flatMap((motion) => [
        ...motion.steps,
        ...(motion.effects ?? []).flatMap((effect) => effect.kind === 'pose'
            ? effect.replacements.map((item) => item.replacement)
            : []),
        ...(motion.supplementedSteps ?? []),
        ...(motion.presentations?.flatMap((presentation) => presentation.steps) ?? []),
    ].map((step) => [frameKey(step), step])));
    const loaded = await Promise.all([...unique].map(async ([key, step]) => {
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
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        if (image.naturalWidth !== frame.width ||
            image.naturalHeight !== frame.height) {
            image.src = canvas.toDataURL('image/png');
            await image.decode();
        }
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
