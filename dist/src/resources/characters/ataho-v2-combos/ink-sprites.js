import { resourceUrl } from '../../catalog/resource-url.js';
import { inkPivots } from './ink-types.js';
const sheetNames = ['arc', 'stroke', 'impact'];
const columns = 4;
const cellSize = 96;
const assetDirectory = 'public/assets/maplestory/ataho-v2-ink/20261016/sprites';
// 생성 원본에서 확인한 접촉점과 중심선이다. 셀을 자르지 않고 배치만 보정한다.
const impactOrigins = [
    [0.294, 0.552],
    [0.261, 0.552],
    [0.207, 0.554],
    [0.192, 0.545],
    [0.192, 0.557],
    [0.188, 0.567],
    [0.182, 0.557],
    [0.175, 0.557],
    [0.192, 0.557],
    [0.188, 0.554],
    [0.182, 0.557],
    [0.178, 0.554],
    [0.201, 0.516],
    [0.194, 0.516],
    [0.198, 0.503],
    [0.207, 0.516],
];
const strokeCenterY = [
    0.593, 0.591, 0.59, 0.591, 0.576, 0.579, 0.58, 0.578, 0.556, 0.557, 0.559,
    0.563, 0.527, 0.529, 0.53, 0.53,
];
/** 원본 알파를 보존하고 표시용 사본만 캐릭터의 논리 픽셀 밀도로 읽는다. */
export async function loadInkSpriteFrames() {
    const sheets = await Promise.all(sheetNames.map(async (name) => {
        const localPath = `${assetDirectory}/${name}-atlas-original.png`;
        const original = new Image();
        original.src = resourceUrl(localPath).href;
        await original.decode();
        const canvas = document.createElement('canvas');
        canvas.width = columns * cellSize;
        canvas.height = columns * cellSize;
        const context = canvas.getContext('2d');
        if (!context)
            throw new Error('수묵 효과 그림을 읽을 수 없습니다.');
        context.imageSmoothingEnabled = false;
        context.drawImage(original, 0, 0, canvas.width, canvas.height);
        const image = new Image();
        image.src = canvas.toDataURL('image/png');
        await image.decode();
        const frame = {
            image,
            localPath,
            label: `수묵 공격 효과 · ${name}`,
            kind: 'generated',
            anchorX: 0,
            anchorY: 0,
            feetY: 0,
        };
        return [`ink-vfx:${name}`, frame];
    }));
    return new Map(sheets);
}
export function drawInkSprite(ctx, source, options) {
    const frame = Math.max(0, Math.min(15, Math.floor(options.frame)));
    const pivot = inkPivots[options.sheet];
    const origin = options.sheet === 'impact'
        ? impactOrigins[frame]
        : options.sheet === 'stroke'
            ? [pivot.x, strokeCenterY[frame]]
            : [pivot.x, pivot.y];
    ctx.drawImage(source.image, (frame % columns) * cellSize, Math.floor(frame / columns) * cellSize, cellSize, cellSize, (-0.5 + pivot.x - origin[0]) * options.width, (-0.5 + pivot.y - origin[1]) * options.height, options.width, options.height);
}
