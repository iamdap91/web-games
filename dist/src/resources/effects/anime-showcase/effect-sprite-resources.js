import spriteRecord from '../../../../resources/anime-effect-sprites.json' with { type: 'json' };
import kutsunaRecord from '../../../../resources/kutsuna-lightning-sprite.json' with { type: 'json' };
import { resourceUrl } from '../../catalog/resource-url.js';
import { fireDisplayVariants, smokeDisplayVariants, } from './effect-material-variants.js';
async function imageAt(localPath) {
    const image = new Image();
    image.src = resourceUrl(localPath).href;
    await image.decode();
    return image;
}
/** 제작 기록에 남긴 무손실 분리 원본과 기법별 표시 사본만 준비한다. */
export async function loadEffectSpriteResources() {
    const spriteEntries = Promise.all(spriteRecord.sprites.flatMap((sprite) => sprite.frames.map(async (source) => {
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
        return [`technique:${source.key}`, frame];
    })));
    const [sources, kutsunaSources] = await Promise.all([
        spriteEntries,
        Promise.all(kutsunaRecord.frames.map(async (source) => {
            const image = await imageAt(source.localPath);
            if (image.naturalWidth !== source.width ||
                image.naturalHeight !== source.height)
                throw new Error(`효과 자재의 크기가 기록과 다릅니다: ${source.key}`);
            return [
                `technique:${source.key}`,
                {
                    image,
                    localPath: source.localPath,
                    label: `쿠츠나 번개 · ${source.label}`,
                    anchorX: source.anchorX,
                    anchorY: source.anchorY,
                    feetY: source.height,
                    kind: 'generated',
                },
            ];
        })),
    ]);
    const frames = new Map([...sources, ...kutsunaSources]);
    const required = (key) => {
        const source = frames.get(`technique:${key}`);
        if (!source)
            throw new Error(`효과 원본이 없습니다: ${key}`);
        return source;
    };
    const shades = Array.from({ length: 4 }, (_, index) => required(`shade-${index}`).image);
    const variants = await Promise.all([
        ...sources.flatMap(([key, source]) => key.startsWith('technique:smoke-')
            ? [smokeDisplayVariants(key.slice('technique:'.length), source, shades)]
            : []),
        fireDisplayVariants(required('bubble-2'), required('flame-2')),
    ]);
    for (const entries of variants)
        for (const [key, source] of entries)
            frames.set(key, source);
    return frames;
}
