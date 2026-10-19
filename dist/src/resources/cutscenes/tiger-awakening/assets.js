import { resourceUrl } from '../../catalog/resource-url.js';
import { MotionFrameLoader } from '../../characters/ataho-v2-combos/frame-loader.js';
import { record, loadImage } from '../shared/images.js';
import { battleMotion } from './battle.js';
export async function loadAssets() {
    const response = await fetch(resourceUrl('resources/ataho-tiger-awakening-cutscene.json'));
    if (!response.ok)
        throw new Error('호왕일격 제작 기록을 읽을 수 없습니다.');
    const data = await response.json();
    const runtime = record(record(data).runtime);
    const loader = new MotionFrameLoader();
    const [portrait, windup, spirit] = await Promise.all([
        loadImage(runtime.portrait),
        loadImage(runtime.windup),
        loadImage(runtime.spirit),
        loader.load(battleMotion),
    ]);
    return {
        portrait,
        windup,
        spirit,
        battleFrames: loader.frames,
    };
}
