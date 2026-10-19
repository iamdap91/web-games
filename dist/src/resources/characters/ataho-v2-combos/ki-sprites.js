import { resourceUrl } from '../../catalog/resource-url.js';
const columns = 4;
const cellSize = 64;
const assetDirectory = 'public/assets/maplestory/ataho-v2-ki/20261016/sprites';
export function kiSpriteSheet(style) {
    if (style === 'meteor')
        return undefined;
    return style === 'tiger-manifest' || style === 'tiger-wave' ? 'tiger' : style;
}
/** 생성 원본은 그대로 보관하고 선택한 기공의 표시용 사본만 읽는다. */
export async function loadKiSpriteFrame(name) {
    const localPath = name === 'orbit-residue'
        ? 'public/assets/maplestory/ataho-v2-ki/20261018/kozuma-orbit/pixellab-residue/residue-atlas.png'
        : `${assetDirectory}/${name}-atlas-original.png`;
    const original = new Image();
    original.src = resourceUrl(localPath).href;
    await original.decode();
    // 전용 잔여 시트는 PixelLab의 원본 색·알파를 그대로 사용한다.
    if (name === 'orbit-residue')
        return {
            image: original,
            localPath,
            label: '부유기탄 점성 잔여 · PixelLab',
            kind: 'generated',
            anchorX: 0,
            anchorY: 0,
            feetY: 0,
        };
    const canvas = document.createElement('canvas');
    canvas.width = cellSize * columns;
    canvas.height = cellSize * columns;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context)
        throw new Error('기공 스프라이트를 읽을 수 없습니다.');
    context.imageSmoothingEnabled = false;
    context.drawImage(original, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    // 옅은 생성 잔여점은 표시 사본에서만 거두어 픽셀 실루엣의 빈 공간을 지킨다.
    for (let index = 3; index < pixels.data.length; index += 4) {
        if ((pixels.data[index] ?? 0) < 48)
            pixels.data[index] = 0;
    }
    context.putImageData(pixels, 0, 0);
    const image = new Image();
    image.src = canvas.toDataURL('image/png');
    await image.decode();
    return {
        image,
        localPath,
        label: `기공 전용 그림 · ${name}`,
        kind: 'generated',
        anchorX: 0,
        anchorY: 0,
        feetY: 0,
    };
}
/** 탐색·속도 변경·반복에서 같은 시각은 같은 그림을 가리킨다. */
export function kiSpriteFrame(ageMs, sequence) {
    const index = Math.max(0, Math.floor(ageMs / sequence.frameMs));
    return (sequence.start +
        (sequence.loop
            ? index % sequence.count
            : Math.min(index, sequence.count - 1)));
}
/** 같은 셀 좌표를 유지해 프레임마다 투명 여백이 달라도 중심이 흔들리지 않는다. */
export function drawKiSprite(ctx, frames, options) {
    const source = frames.get(`ki-vfx:${options.sheet}`);
    if (!source || options.width <= 0 || options.height <= 0)
        return false;
    const index = Math.min(15, Math.max(0, Math.floor(options.frame)));
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha *= options.alpha ?? 1;
    ctx.drawImage(source.image, (index % columns) * cellSize, Math.floor(index / columns) * cellSize, cellSize, cellSize, options.point.x - options.width * (options.anchorX ?? 0.5), options.point.y - options.height * (options.anchorY ?? 0.5), options.width, options.height);
    ctx.restore();
    return true;
}
