import manifest from '../../../../resources/manifest.json' with { type: 'json' };
import { resourceUrl } from '../../catalog/resource-url.js';
import { loadSourceFrame, } from '../../characters/ataho-v2-combos/source-frames.js';
export const directions = [
    'south',
    'south-east',
    'east',
    'north-east',
    'north',
    'north-west',
    'west',
    'south-west',
];
export async function loadCutAssets() {
    const sourcePaths = new Set();
    const frames = async (motion, count) => Promise.all(Array.from({ length: count }, async (_, frame) => {
        const sprite = await loadSourceFrame({ motion, frame });
        sourcePaths.add(sprite.localPath);
        return sprite;
    }));
    const hero = {
        idle: {},
        run: {},
        jump: {},
        uppercut: {},
        slam: {},
        punch: {},
    };
    await Promise.all(directions.flatMap((direction) => [
        frames(direction === 'south' ? 'stand' : `stand-${direction}`, 1).then((value) => {
            hero.idle[direction] = value;
        }),
        frames(`running-4-frames-${direction}`, 4).then((value) => {
            hero.run[direction] = value;
        }),
    ]));
    await Promise.all(['south-east', 'east', 'north-east', 'west', 'south-west'].map(async (direction) => {
        hero.uppercut[direction] = await frames(`surprise-uppercut-${direction}`, 7);
    }));
    [hero.jump['south-east'], hero.slam['south-east'], hero.punch['south-east']] =
        await Promise.all([
            frames('jumping-1-south-east', 9),
            frames('presentation-aerial-smash-south-east', 9),
            frames('ataho-one-two-punch-south-east-south-east', 17),
        ]);
    const bearAsset = manifest.assets.find((asset) => asset.id === 'ai/monster-hoarfrost-bear');
    if (!bearAsset || !('animations' in bearAsset))
        throw new Error('곰왕 원본을 찾지 못했습니다.');
    const animations = bearAsset.animations;
    const bearFrames = async (key) => {
        const animation = animations[key];
        if (!animation)
            throw new Error(`곰왕 모션이 없습니다: ${key}`);
        return Promise.all(animation.frames.map(async (f) => {
            const image = new Image();
            image.src = resourceUrl(f.localPath).href;
            await image.decode();
            sourcePaths.add(f.localPath);
            return {
                image,
                anchorX: f.pivot.x,
                anchorY: f.height - f.pivot.y,
                feetY: f.height - f.pivot.y,
            };
        }));
    };
    const [stand, attack, hit, defeat] = await Promise.all(['stand', 'attack1', 'hit1', 'die1'].map(bearFrames));
    const portraitPath = 'public/assets/maplestory/ataho-v2-effects/20261016/cutin/ataho-face-original.png';
    const portrait = new Image();
    portrait.src = resourceUrl(portraitPath).href;
    await portrait.decode();
    sourcePaths.add(portraitPath);
    return {
        hero,
        fistPatch: {
            image: hero.uppercut['south-east'][2].image,
            crop: { x: 57, y: 29, width: 10, height: 12, wristX: 1, wristY: 11 },
        },
        bear: { stand: stand, attack: attack, hit: hit, defeat: defeat },
        portrait,
        sourcePaths: [...sourcePaths],
    };
}
