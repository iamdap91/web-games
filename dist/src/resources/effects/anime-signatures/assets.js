import { resourceUrl } from '../../catalog/resource-url.js';
import { loadImage, record, } from '../../cutscenes/shared/images.js';
import { MotionFrameLoader } from '../../characters/ataho-v2-combos/frame-loader.js';
import { meteorFinishers } from '../../characters/ataho-v2-combos/motions/meteor-finisher.js';
import { loadAdvancedAssets } from './advanced-assets.js';
import { loadActingAssets } from './acting-assets.js';
import { signatureScenes, } from './contracts.js';
const facings = ['south-east', 'north-west'];
const basePaths = {
    ataho: 'public/assets/maplestory/ataho-v2-ai/20261014/originals/character/Idle/rotations/',
    biwol: 'public/assets/maplestory/companion-basic-attacks-ai/biwol/rotations/',
    yeonmuk: 'public/assets/maplestory/companion-basic-attacks-ai/yeonmuk/originals/rotations/',
};
async function documentAt(path) {
    const response = await fetch(resourceUrl(path));
    if (!response.ok)
        throw new Error(`연출 그림 기록을 불러오지 못했습니다: ${response.status}`);
    const value = await response.json();
    return record(value);
}
function imageRecord(value) {
    const image = record(value);
    if (typeof image.localPath !== 'string' ||
        !image.localPath.startsWith('public/assets/maplestory/'))
        throw new Error('연출 그림은 로컬 리소스 경로여야 합니다.');
    return image;
}
async function poseImages(value) {
    const pose = imageRecord(value);
    return [await loadImage(pose)];
}
/** 화면마다 로드한 그림과 기존 추격 프레임을 소유하고 외부 생성 주소는 사용하지 않는다. */
export async function loadSignatureAssets() {
    const [harmonyDocument, poseDocument] = await Promise.all([
        documentAt('resources/anime-signature-harmony.json'),
        documentAt('resources/anime-signature-poses.json'),
    ]);
    const [portrait, harmony] = await Promise.all([
        loadImage({
            localPath: 'public/assets/maplestory/ataho-v2-effects/20261016/cutin/ataho-face-original.png',
        }),
        loadImage(imageRecord(harmonyDocument.file)),
    ]);
    const idle = new Map();
    await Promise.all(Object.keys(basePaths).map(async (actor) => {
        const directions = await Promise.all(facings.map(async (facing) => [
            facing,
            await loadImage({
                localPath: `${basePaths[actor]}${facing}.png`,
            }),
        ]));
        idle.set(actor, new Map(directions));
    }));
    if (!Array.isArray(poseDocument.entries))
        throw new Error('새 자세 그림 목록이 없습니다.');
    const poses = new Map();
    const unavailable = new Set();
    const poseScenes = signatureScenes.filter((scene) => [
        'gainax',
        'sunrise',
        'yamada-hands',
        'yamada-mask',
        'shaft',
        'seed',
    ].includes(scene.id));
    for (const scene of poseScenes) {
        const raw = poseDocument.entries.find((entry) => record(entry).id === scene.id);
        if (!raw)
            throw new Error(`새 자세 기록이 없습니다: ${scene.title}`);
        const entry = record(raw);
        const directions = record(entry.directions);
        const complete = facings.every((facing) => record(directions[facing]).pose != null);
        if (!complete) {
            if (!['awaiting-upload-approval', 'generating'].includes(String(poseDocument.status)))
                throw new Error(`새 자세 그림이 부족합니다: ${scene.title}`);
            unavailable.add(scene.id);
            continue;
        }
        const loaded = await Promise.all(facings.map(async (facing) => [facing, await poseImages(record(directions[facing]).pose)]));
        poses.set(scene.id, new Map(loaded));
    }
    const motion = meteorFinishers.find((item) => item.id === 'finisher-pegasus-meteor-circus');
    if (!motion)
        throw new Error('기존 유성권 추격 시안이 없습니다.');
    const loader = new MotionFrameLoader();
    const [advanced, acting] = await Promise.all([
        loadAdvancedAssets(),
        loadActingAssets(),
        loader.load(motion),
    ]);
    if (advanced.punch.size !== 2)
        unavailable.add('perspective-punch');
    if (acting.reaction.size !== 2)
        unavailable.add('reaction-acting');
    if (acting.balance.size !== 2)
        unavailable.add('drunken-balance');
    return {
        acting,
        advanced,
        portrait,
        harmony,
        idle,
        poses,
        unavailable,
        circus: { motion, frames: loader.frames },
    };
}
