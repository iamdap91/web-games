import manifest from '../../../../resources/manifest.json' with { type: 'json' };
export const yeonmukAssetId = 'ai/yeonmuk';
export const yeonmukPortraitPath = 'public/assets/maplestory/fox-talismanist-ai/runtime/yeonmuk-front-01.png';
function stand(direction, pivotY) {
    return {
        frames: [
            {
                width: 64,
                height: 64,
                pivot: { x: 32, y: pivotY },
                durationSeconds: 0.2,
                localPath: `public/assets/maplestory/fox-talismanist-ai/runtime/rotations/${direction}.png`,
            },
        ],
    };
}
// 리소스 커밋 0be6333의 대기 자세. 통합 manifest가 도착하기 전에도 격리 전투를 확인한다.
const handedOffStands = new Map([
    ['stand', stand('south', 1)],
    ['stand-right', stand('east', 1)],
    ['stand-back', stand('north', 2)],
    ['stand-left', stand('west', 2)],
    ['stand-front-right', stand('south-east', 1)],
    ['stand-front-left', stand('south-west', 1)],
    ['stand-back-right', stand('north-east', 2)],
    ['stand-back-left', stand('north-west', 3)],
]);
// 리소스 e5b3186의 실제 프레임 크기·pivot·시간. 공격과 피격의 단발 재생은 전투 화면이 소유한다.
function battleAnimation(motion, frames) {
    return {
        frames: frames.map(([durationSeconds, pivotY], index) => ({
            width: 64,
            height: 64,
            pivot: { x: 32, y: pivotY },
            durationSeconds,
            localPath: `public/assets/maplestory/fox-talismanist-ai/runtime/${motion}/${String(index).padStart(2, '0')}.png`,
        })),
    };
}
const handedOffBattleMotions = new Map([
    [
        'battle-ready',
        battleAnimation('battle-ready', [
            [0.25, 2],
            [0.25, 2],
            [0.25, 2],
            [0.25, 2],
            [0.25, 2],
        ]),
    ],
    [
        'talisman-cast',
        battleAnimation('talisman-cast', [
            [0.1, 2],
            [0.12, 2],
            [0.14, 2],
            [0.08, 2],
            [0.07, 2],
            [0.06, 2],
            [0.04, 2],
            [0.04, 2],
        ]),
    ],
    [
        'hit1',
        battleAnimation('hit1', [
            [0.065, 2],
            [0.045, 2],
            [0.04, 2],
            [0.04, 2],
            [0.04, 2],
        ]),
    ],
    [
        'die1',
        battleAnimation('die1', [
            [0.08, 2],
            [0.08, 2],
            [0.08, 2],
            [0.08, 4],
            [0.08, 3],
            [0.08, 3],
            [0.08, 2],
            [0.08, 2],
            [0.16, 2],
        ]),
    ],
]);
export function yeonmukBattleAnimations() {
    const motions = new Map([...handedOffStands, ...handedOffBattleMotions]);
    const asset = manifest.assets.find((asset) => asset.id === yeonmukAssetId);
    // 일부 리소스만 통합된 경우에도 전투 모션을 유지하고, 통합된 등록값을 우선한다.
    if (asset) {
        for (const [key, animation] of Object.entries(asset.animations)) {
            if (motions.has(key))
                motions.set(key, animation);
        }
    }
    return motions;
}
