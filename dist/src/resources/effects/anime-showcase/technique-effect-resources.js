import { resourceUrl } from '../../catalog/resource-url.js';
import { loadKiSpriteFrame } from '../../characters/ataho-v2-combos/ki-sprites.js';
import { loadEffectSpriteResources } from './effect-sprite-resources.js';
/** 기법의 형태·시간 규칙과 별개로, 조합실과 게임에서 쓰는 원본만 읽는다. */
export async function loadTechniqueEffects() {
    const frames = new Map();
    const [spriteFrames] = await Promise.all([
        loadEffectSpriteResources(),
        Promise.all(['beam', 'orb', 'orbit', 'orbit-residue'].map(async (sheet) => {
            frames.set(`ki-vfx:${sheet}`, await loadKiSpriteFrame(sheet));
        })),
    ]);
    for (const [key, source] of spriteFrames)
        frames.set(key, source);
    const localPath = 'public/assets/maplestory/expedition-details/frames/basalt-shards.png';
    const image = new Image();
    image.src = resourceUrl(localPath).href;
    await image.decode();
    frames.set('technique:basalt-shards', {
        image,
        localPath,
        label: '원정 지형의 현무암 파편',
        anchorX: 24,
        anchorY: 22,
        feetY: 44,
        kind: 'generated',
    });
    return frames;
}
// 소품 원본에 서로 떨어진 세 덩어리의 경계. 각 조각의 픽셀은 그대로 잘라 쓴다.
const stoneCrops = [
    { x: 0, y: 9, width: 24, height: 26 },
    { x: 22, y: 0, width: 23, height: 23 },
    { x: 24, y: 23, width: 25, height: 21 },
];
export function drawGameShard(ctx, frame, options) {
    const source = frame.assets.effects.get('technique:basalt-shards');
    if (!source || options.size <= 0)
        return;
    const crop = stoneCrops[((options.index % 3) + 3) % 3];
    const width = options.size * 2;
    const height = (width * crop.height) / crop.width;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (options.silhouette)
        ctx.filter = 'brightness(0)';
    ctx.drawImage(source.image, crop.x, crop.y, crop.width, crop.height, options.point.x - width / 2, options.point.y - height / 2, width, height);
    ctx.restore();
}
/** 입방체의 면 투영을 유지하며 실제 현무암 원본의 면색·픽셀 경계를 얹는다. */
export function drawGameStoneFace(ctx, frame, points) {
    const source = frame.assets.effects.get('technique:basalt-shards');
    const a = points[0];
    const b = points[1];
    const d = points[3];
    if (!source || !a || !b || !d)
        return;
    ctx.save();
    ctx.beginPath();
    points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
    ctx.closePath();
    ctx.clip();
    ctx.transform(b.x - a.x, b.y - a.y, d.x - a.x, d.y - a.y, a.x, a.y);
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha *= 0.45;
    ctx.drawImage(source.image, 22, 0, 23, 23, 0, 0, 1, 1);
    ctx.restore();
}
