import { loadImage, record } from '../shared/images.js';
import manifest from '../../../../resources/manifest.json' with { type: 'json' };
import { resourceUrl } from '../../catalog/resource-url.js';
import { frameKey, } from '../../characters/ataho-v2-combos/source-frames.js';
import { MotionFrameLoader } from '../../characters/ataho-v2-combos/frame-loader.js';
import { rushMotion } from './choreography.js';
import { finaleMotions } from './finale-attacks.js';
import { KiLighting } from '../../characters/ataho-v2-combos/ki-lighting.js';
import { BackgroundShockwave } from '../../characters/ataho-v2-combos/shockwave-presentation.js';
async function loadOriginal(name) {
    const asset = manifest.assets.find((item) => item.id === 'ai/ataho-v2');
    if (!asset)
        throw new Error('기존 아타호 원본이 없습니다.');
    const animations = asset.animations;
    const animation = animations[name];
    if (!animation)
        throw new Error(`아타호 원본 동작이 없습니다: ${name}`);
    return Promise.all(animation.frames.map(loadImage));
}
function silhouette(image, color) {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx)
        throw new Error('암중 분신의 실루엣을 만들 수 없습니다.');
    ctx.drawImage(image, 0, 0);
    // 원본 알파를 유지한 채 RGB만 바꾸므로 그림 밖에 검은 사각형이 생기지 않는다.
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
    return canvas;
}
function createFinaleFrames(combatFrames) {
    const frames = new Map();
    const keys = new Set(finaleMotions.flatMap((motion) => motion.steps.map(frameKey)));
    for (const key of keys) {
        const source = combatFrames.get(key);
        if (!source)
            throw new Error(`지상 포위 공격 자세가 없습니다: ${key}`);
        frames.set(key, {
            source,
            black: silhouette(source.image, '#060609'),
        });
    }
    return frames;
}
export async function loadSceneAssets() {
    const response = await fetch(resourceUrl('resources/ataho-cutscene-generation.json'));
    if (!response.ok)
        throw new Error('컷씬 제작 기록을 불러오지 못했습니다.');
    const data = await response.json();
    const runtime = record(record(data).runtime);
    const frames = new MotionFrameLoader();
    const [portrait, strike, ending, tiger, realm, idle] = await Promise.all([
        loadImage(runtime.portrait),
        loadImage(runtime.strike),
        loadImage(runtime.ending),
        loadImage(runtime.tiger),
        loadImage(runtime.realm),
        loadOriginal('fight-stance-idle-8-frames-south-east'),
        frames.load(rushMotion),
        Promise.all(finaleMotions.map((motion) => frames.load(motion))),
    ]);
    return {
        portrait,
        strike,
        ending,
        tiger,
        realm,
        idle,
        finaleFrames: createFinaleFrames(frames.frames),
        combatFrames: frames.frames,
        comboSurfaces: {
            lighting: new KiLighting(),
            shockwave: new BackgroundShockwave(),
        },
    };
}
