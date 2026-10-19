import manifest from '../../../../resources/manifest.json' with { type: 'json' };
import { loadSourceFrame, } from '../../characters/ataho-v2-combos/source-frames.js';
import { loadImage } from '../shared/images.js';
import { createInkImage } from './ink.js';
import { sourceGeometry } from './contact.js';
const punchSources = {
    guard: { motion: 'cross-punch-south-east', frame: 0 },
    coil: { motion: 'cross-punch-south-east', frame: 1 },
    load: { motion: 'cross-punch-south-east', frame: 2 },
    open: { motion: 'cross-punch-south-east', frame: 3 },
    chamber: { motion: 'cross-punch-south-east', frame: 4 },
    strike: { motion: 'cross-punch-south-east', frame: 5 },
    recover: { motion: 'cross-punch-south-east', frame: 4 },
};
export async function loadAssets() {
    const yeti = manifest.assets.find((asset) => asset.id === 'ai/yeti');
    if (!yeti)
        throw new Error('예티 원본이 없습니다.');
    const animations = yeti.animations;
    const frames = [
        animations.stand?.frames[0],
        ...[2, 3, 4].map((index) => animations.die1?.frames[index]),
    ];
    if (frames.some((frame) => !frame))
        throw new Error('예티 대기·피격·방출 그림이 없습니다.');
    const [punches, targetFrames] = await Promise.all([
        Promise.all(Object.keys(punchSources).map(async (pose) => {
            const source = await loadSourceFrame(punchSources[pose]);
            return [pose, { source, ink: createInkImage(source.image) }];
        })),
        Promise.all(frames.map((frame) => loadImage(frame))),
    ]);
    // 자세가 누워도 몸통 중심이 튀지 않도록 각 원본의 같은 질량 중심을 잇는다.
    const anchors = sourceGeometry.targetAnchors;
    const targets = targetFrames.map((source, i) => ({
        source,
        ink: createInkImage(source.image),
        anchor: anchors[i],
    }));
    return {
        punches: new Map(punches),
        targetIdle: targets[0],
        targetHit: targets[1],
        targetFall: targets.slice(1),
    };
}
