import manifest from '../../../../resources/manifest.json' with { type: 'json' };
import { resourceUrl } from '../../catalog/resource-url.js';
import { MotionFrameLoader } from '../../characters/ataho-v2-combos/frame-loader.js';
import { groundAdditions } from '../../characters/ataho-v2-combos/motions/ground-additions.js';
import { enhancedFlyingKickMotion } from '../../characters/ataho-v2-combos/motions/inazuma-flying-kick.js';
import { loadSourceFrame, } from '../../characters/ataho-v2-combos/source-frames.js';
import { directions } from '../anime-selected-cuts/assets.js';
import { loadCombatEffectSpriteFrame } from '../../characters/ataho-v2-combos/combat-effect-sprites.js';
import { loadMotionResources } from './motion-resource.js';
import { loadTechniqueEffects } from './technique-effect-resources.js';
async function imageAt(path) {
    const image = new Image();
    image.src = resourceUrl(path).href;
    await image.decode();
    return image;
}
/** 기존 로컬 원본과 요청된 새 자세를 읽고 생성·전투 상태는 이 로더에서 만들지 않는다. */
export async function loadBattleAssets() {
    const uppercut = groundAdditions.find((m) => m.id === 'charged-uppercut');
    if (!uppercut)
        throw new Error('기존 어퍼컷 모션을 찾을 수 없습니다.');
    const straight = {
        id: 'showcase-straight',
        title: '정권 · 1타',
        summary: '기존 동쪽 정권의 장전·신전과 같은 그림의 역순 회수를 잇는다.',
        priority: 'review',
        review: '동쪽 정권 0~5번을 사용하며 접지·손끝 기준은 기존 필살기와 같다.',
        steps: [0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 0].map((frame, index) => ({
            motion: 'cross-punch-east',
            frame,
            durationMs: index === 5 ? 100 : 70,
            x: 0,
            y: 0,
            anchor: 'feet',
            phase: index < 5 ? '정권 장전' : index === 5 ? '정권 접촉' : '정권 회수',
            contact: index === 5 ? { kind: 'punch', reach: 28, height: 32 } : undefined,
        })),
    };
    const bear = manifest.assets.find((a) => a.id === 'ai/monster-hoarfrost-bear');
    if (!bear || !('animations' in bear))
        throw new Error('서리갈기 곰왕 원본을 찾을 수 없습니다.');
    const animations = bear.animations;
    const sprites = async (key) => {
        const animation = animations[key];
        if (!animation)
            throw new Error(`곰왕 모션이 없습니다: ${key}`);
        return Promise.all(animation.frames.map(async (f) => ({
            ...f,
            image: await imageAt(f.localPath),
        })));
    };
    const loader = new MotionFrameLoader();
    const [stand, hit, defeat, portrait, run, runEast] = await Promise.all([
        sprites('stand'),
        sprites('hit1'),
        sprites('die1'),
        imageAt('public/assets/maplestory/ataho-v2-effects/20261016/cutin/ataho-face-original.png'),
        Promise.all([0, 1, 2, 3].map((frame) => loadSourceFrame({ motion: 'running-4-frames-south-east', frame }))),
        Promise.all([0, 1, 2, 3].map((frame) => loadSourceFrame({ motion: 'running-4-frames-east', frame }))),
        loader.load(uppercut),
        loader.load(enhancedFlyingKickMotion),
        loader.load(straight),
    ]);
    const idle = {};
    const directionalUppercut = {};
    const effects = new Map();
    const [motionResources, techniqueEffects] = await Promise.all([
        loadMotionResources(),
        loadTechniqueEffects(),
        ...directions.map(async (direction) => {
            idle[direction] = await loadSourceFrame({
                motion: direction === 'south' ? 'stand' : `stand-${direction}`,
                frame: 0,
            });
        }),
        ...['south-east', 'east', 'north-east', 'west', 'south-west'].map(async (direction) => {
            directionalUppercut[direction] = await Promise.all(Array.from({ length: 7 }, (_, frame) => {
                const motion = `surprise-uppercut-${direction}`;
                return (loader.frames.get(`${motion}:${frame}`) ??
                    loadSourceFrame({ motion, frame }));
            }));
        }),
        ...['shoulder-crush', 'ground-impact'].map(async (sheet) => {
            effects.set(`combat-vfx:${sheet}`, await loadCombatEffectSpriteFrame(sheet));
        }),
    ]);
    for (const [key, source] of techniqueEffects)
        effects.set(key, source);
    return {
        frames: loader.frames,
        uppercut,
        kick: enhancedFlyingKickMotion,
        straight,
        run,
        runEast,
        bear: { stand, hit, defeat },
        portrait,
        directional: { idle, uppercut: directionalUppercut },
        motionResources,
        effects,
    };
}
