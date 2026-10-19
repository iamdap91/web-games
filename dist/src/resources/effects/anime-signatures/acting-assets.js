import talismanStudy from '../../../../resources/companion-basic-attacks/yeonmuk.json' with { type: 'json' };
import { resourceUrl } from '../../catalog/resource-url.js';
import { loadImage, record } from '../../cutscenes/shared/images.js';
import { MotionFrameLoader } from '../../characters/ataho-v2-combos/frame-loader.js';
import { drinkMotion } from '../../characters/ataho-v2-combos/motions/drink.js';
import { flyingKickMotion } from '../../characters/ataho-v2-combos/motions/flying-kick.js';
import { HeatHazeSurface } from './acting-heat.js';
const facings = ['south-east', 'north-west'];
async function loadPosePairs(id, entries) {
    const found = entries.find((entry) => record(entry).id === id);
    if (!found)
        return new Map();
    const directions = record(record(found).directions);
    const pairs = await Promise.all(facings.map(async (facing) => {
        const frames = record(directions[facing]).frames;
        if (!Array.isArray(frames) ||
            frames.length !== 2 ||
            frames.some((entry) => record(entry).selectedForPreview === false))
            return null;
        const images = await Promise.all(frames.map(async (entry) => {
            const frame = record(entry);
            if (typeof frame.localPath !== 'string' ||
                !frame.localPath.startsWith('public/assets/maplestory/'))
                throw new Error('연기 원화는 로컬 리소스 경로여야 합니다.');
            const sprite = await loadImage(frame);
            const anchor = frame.groundAnchor == null ? null : record(frame.groundAnchor);
            if (anchor &&
                (typeof anchor.x !== 'number' ||
                    typeof anchor.y !== 'number' ||
                    !Number.isFinite(anchor.x) ||
                    !Number.isFinite(anchor.y)))
                throw new Error('연기 원화의 지지점이 올바르지 않습니다.');
            return {
                sprite,
                pivot: {
                    x: anchor ? Number(anchor.x) : sprite.image.naturalWidth / 2,
                    y: sprite.image.naturalHeight -
                        (anchor ? Number(anchor.y) : sprite.bounds.bottom),
                },
            };
        }));
        return [facing, images];
    }));
    return new Map(pairs.filter((pair) => pair !== null));
}
/** 새 원화와 기존 동작을 준비하고 열굴절 표면의 수명을 화면에 넘긴다. */
export async function loadActingAssets() {
    const response = await fetch(resourceUrl('resources/acting-study-poses.json'));
    if (!response.ok)
        throw new Error('연기 A/B 제작 기록을 불러오지 못했습니다.');
    const document = record(await response.json());
    const entries = Array.isArray(document.entries)
        ? document.entries
        : [];
    const landing = new MotionFrameLoader();
    const drink = new MotionFrameLoader();
    const [reaction, balance, talisman] = await Promise.all([
        loadPosePairs('reaction-acting', entries),
        loadPosePairs('drunken-balance', entries),
        Promise.all(facings.map(async (facing) => [
            facing,
            await Promise.all(talismanStudy.directions[facing].frames.map(async (frame) => ({
                sprite: await loadImage(frame),
                pivot: frame.pivot,
            }))),
        ])),
        landing.load(flyingKickMotion),
        drink.load(drinkMotion),
    ]);
    return {
        reaction,
        balance,
        talisman: new Map(talisman),
        landing: { motion: flyingKickMotion, frames: landing.frames },
        drink: { motion: drinkMotion, frames: drink.frames },
        heat: new HeatHazeSurface(),
    };
}
