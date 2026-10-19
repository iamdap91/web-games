import { resourceUrl } from '../../catalog/resource-url.js';
const assetDirectory = 'public/assets/maplestory/ataho-v2-combat-vfx/20261017';
// PixelLab에서 확인한 고정 셀과 실제 압축핵·지면 원점을 보존한다.
const sheets = {
    'shoulder-crush': {
        file: 'shoulder-crush/refined/ataho-shoulder-crush.png',
        width: 64,
        height: 40,
        anchorX: 16,
        anchorY: 20,
    },
    'ground-impact': {
        file: 'ground-impact/refined/ataho-low-ground-impact.png',
        width: 80,
        height: 32,
        anchorX: 40,
        anchorY: 26,
    },
};
const columns = 3;
const rows = 2;
const frameCount = columns * rows;
/** 선택한 동작에 필요한 두 종류의 접촉 그림만 기존 로더에서 공유한다. */
export function combatEffectSheets(motion) {
    if (motion.id === 'cheolsango' || motion.id === 'finisher-drunken-tiger')
        return ['shoulder-crush'];
    if (motion.id === 'aerial-smash' ||
        motion.id === 'martial-stomp' ||
        motion.id === 'finisher-demon')
        return ['ground-impact'];
    return [];
}
/** 원본 PNG의 알파와 픽셀을 그대로 읽고 그림은 화면의 로더가 소유한다. */
export async function loadCombatEffectSpriteFrame(sheet) {
    const definition = sheets[sheet];
    const localPath = `${assetDirectory}/${definition.file}`;
    const image = new Image();
    image.src = resourceUrl(localPath).href;
    await image.decode();
    if (image.naturalWidth !== definition.width * columns ||
        image.naturalHeight !== definition.height * rows)
        throw new Error(`접촉 효과 시트의 크기가 다릅니다: ${sheet}`);
    return {
        image,
        localPath,
        label: `PixelLab 접촉 효과 · ${sheet}`,
        kind: 'generated',
        anchorX: 0,
        anchorY: 0,
        feetY: 0,
    };
}
/** 접촉부터의 절대 시각으로 한 번 재생하며 빈 마지막 셀도 원래 순서로 사용한다. */
export function drawCombatEffectSprite(ctx, frames, options) {
    const source = frames.get(`combat-vfx:${options.sheet}`);
    if (!source ||
        options.durationMs <= 0 ||
        options.ageMs < 0 ||
        options.ageMs >= options.durationMs)
        return false;
    const definition = sheets[options.sheet];
    const index = Math.floor((options.ageMs / options.durationMs) * frameCount);
    const scale = options.scale * (options.size ?? 1);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(options.x, options.y);
    ctx.scale(scale * (options.directionX ?? 1), scale);
    ctx.drawImage(source.image, (index % columns) * definition.width, Math.floor(index / columns) * definition.height, definition.width, definition.height, -definition.anchorX, -definition.anchorY, definition.width, definition.height);
    ctx.restore();
    return true;
}
