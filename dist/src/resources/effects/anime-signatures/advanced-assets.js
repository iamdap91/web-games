import biwol from '../../../../resources/companion-basic-attacks/biwol-additions.json' with { type: 'json' };
import yeonmuk from '../../../../resources/companion-basic-attacks/yeonmuk-additions.json' with { type: 'json' };
import { originalFrame } from '../../characters/ataho-v2-combos/source-frames.js';
import { resourceUrl } from '../../catalog/resource-url.js';
import { loadImage, record, } from '../../cutscenes/shared/images.js';
import { prepareMetamorphosis } from './advanced-metamorphosis.js';
const facings = ['south-east', 'north-west'];
async function loadBodyFrame(value) {
    return { sprite: await loadImage(value), pivot: value.pivot };
}
async function companionFrames(study) {
    return new Map(await Promise.all(facings.map(async (facing) => [
        facing,
        await Promise.all(study.directions[facing].frames.map(loadBodyFrame)),
    ])));
}
async function loadPunches() {
    const response = await fetch(resourceUrl('resources/presentation-study-punch.json'));
    if (response.status === 404)
        return new Map();
    if (!response.ok)
        throw new Error('전경 정권 제작 기록을 불러오지 못했습니다.');
    const data = record(await response.json());
    const directions = record(data.directions);
    const results = await Promise.all(facings.map(async (facing) => {
        const frames = record(directions[facing]).frames;
        if (!Array.isArray(frames) ||
            frames.length !== 3 ||
            frames.some((value) => record(value).selectedForPreview === false))
            return null;
        const loaded = await Promise.all(frames.map((value) => {
            const entry = record(value);
            if (typeof entry.localPath !== 'string' ||
                !entry.localPath.startsWith('public/assets/maplestory/'))
                throw new Error('전경 정권 그림은 로컬 리소스 경로여야 합니다.');
            return loadImage(entry);
        }));
        return [facing, loaded];
    }));
    return new Map(results.filter((item) => item !== null));
}
/** 원본 방향·피벗을 유지한 몸과 새 키포즈를 화면 단위로 준비한다. */
export async function loadAdvancedAssets() {
    const [spirit, punch, biwolFrames, yeonmukFrames, normalPunch] = await Promise.all([
        loadImage({
            localPath: 'public/assets/maplestory/ataho-cutscene/20261017/tiger-awakening/tiger-spirit-body.png',
        }),
        loadPunches(),
        companionFrames(biwol.motions.lunge),
        companionFrames(yeonmuk.motions.volley),
        Promise.all(facings.map(async (facing) => {
            // 북서 정권 모션은 없으므로 다른 방향을 뒤집는 대신 기본 자세를 기준으로 남긴다.
            const count = facing === 'south-east' ? 6 : 1;
            const motion = facing === 'south-east'
                ? 'cross-punch-south-east'
                : 'stand-north-west';
            return [
                facing,
                await Promise.all(Array.from({ length: count }, (_, frame) => loadBodyFrame(originalFrame({ motion, frame }).frame))),
            ];
        })),
    ]);
    return {
        spirit,
        morphology: prepareMetamorphosis(spirit),
        punch,
        normalPunch: new Map(normalPunch),
        companions: new Map([
            ['biwol', biwolFrames],
            ['yeonmuk', yeonmukFrames],
        ]),
    };
}
