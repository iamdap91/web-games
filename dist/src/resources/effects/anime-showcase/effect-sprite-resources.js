import spriteRecord from '../../../../resources/anime-effect-sprites.json' with { type: 'json' };
import { resourceUrl } from '../../catalog/resource-url.js';
async function imageAt(localPath) {
    const image = new Image();
    image.src = resourceUrl(localPath).href;
    await image.decode();
    return image;
}
/** 원본 알파를 유지한 표시 사본이며 본 화면의 합성 상태는 건드리지 않는다. */
async function smokeVariant(source, kind) {
    const canvas = document.createElement('canvas');
    canvas.width = source.naturalWidth;
    canvas.height = source.naturalHeight;
    try {
        const ctx = canvas.getContext('2d');
        if (!ctx)
            throw new Error('연기 자재의 표시 사본을 만들지 못했습니다.');
        if (kind === 'dark')
            ctx.filter = 'brightness(0.56)';
        ctx.drawImage(source, 0, 0);
        if (kind !== 'dark') {
            ctx.globalCompositeOperation = 'source-in';
            ctx.fillStyle = kind === 'flat' ? '#bbb8ac' : '#bcc5b7';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        const image = new Image();
        image.src = canvas.toDataURL('image/png');
        await image.decode();
        return image;
    }
    finally {
        canvas.width = canvas.height = 1;
    }
}
/** 제작 기록에 남긴 무손실 분리 원본과 기법별 표시 사본만 준비한다. */
export async function loadEffectSpriteResources() {
    const sources = await Promise.all(spriteRecord.sprites.flatMap((sprite) => sprite.frames.map(async (source) => {
        const image = await imageAt(source.localPath);
        if (image.naturalWidth !== source.width ||
            image.naturalHeight !== source.height)
            throw new Error(`효과 자재의 크기가 기록과 다릅니다: ${source.key}`);
        const frame = {
            image,
            localPath: source.localPath,
            label: source.key,
            anchorX: source.anchorX,
            anchorY: source.anchorY,
            feetY: source.height,
            kind: 'generated',
        };
        const entries = [
            [`technique:${source.key}`, frame],
        ];
        if (source.key.startsWith('smoke-')) {
            for (const kind of ['dark', 'flat', 'iso']) {
                entries.push([
                    `technique:smoke-${kind}-${source.key.slice(6)}`,
                    { ...frame, image: await smokeVariant(image, kind) },
                ]);
            }
        }
        return entries;
    })));
    return new Map(sources.flat());
}
