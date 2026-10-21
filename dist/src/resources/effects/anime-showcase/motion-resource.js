import punchRecord from '../../../../resources/presentation-study-punch.json' with { type: 'json' };
import { resourceUrl } from '../../catalog/resource-url.js';
import { record } from '../../cutscenes/shared/images.js';
import { loadSourceFrame, } from '../../characters/ataho-v2-combos/source-frames.js';
import { clamp, ellipse, stage } from './drawing.js';
import { battleLayout, drawBear } from './battle.js';
export const perspectivePunchSources = punchRecord.directions['south-east'].frames;
async function recordedPose(value) {
    const image = new Image();
    image.src = resourceUrl(value.localPath).href;
    await image.decode();
    return [
        value.key,
        {
            image,
            localPath: value.localPath,
            label: value.key,
            kind: 'generated',
            anchorX: value.anchorX,
            anchorY: value.feetY,
            feetY: value.feetY,
        },
    ];
}
async function fallPoses() {
    const response = await fetch(resourceUrl('resources/anime-showcase-poses.json'));
    if (!response.ok)
        throw new Error('기법 견본의 새 자세 기록을 읽지 못했습니다.');
    const data = record(await response.json());
    if (!Array.isArray(data.poses))
        throw new Error('기법 견본의 자세 목록이 없습니다.');
    return Promise.all(data.poses.map((value) => {
        const pose = record(value);
        if (typeof pose.key !== 'string' ||
            typeof pose.localPath !== 'string' ||
            !pose.localPath.startsWith('public/assets/maplestory/') ||
            typeof pose.anchorX !== 'number' ||
            !Number.isFinite(pose.anchorX) ||
            typeof pose.feetY !== 'number' ||
            !Number.isFinite(pose.feetY))
            throw new Error('기법 견본의 자세 경로·기준점이 올바르지 않습니다.');
        return recordedPose({
            key: pose.key,
            localPath: pose.localPath,
            anchorX: pose.anchorX,
            feetY: pose.feetY,
        });
    }));
}
/** 보유 원화는 표시 사본으로만 읽고 새 자세 기록도 같은 화면의 읽기 전용 자산에 모은다. */
export async function loadMotionResources() {
    const [jump, extension, compression, punches, falls] = await Promise.all([
        Promise.all(Array.from({ length: 9 }, (_, frame) => loadSourceFrame({ motion: 'jumping-1-south-east', frame }))),
        loadSourceFrame({
            motion: 'presentation-anatomical-jump-south-east',
            frame: 2,
        }),
        loadSourceFrame({
            motion: 'presentation-landing-drawing-south-east',
            frame: 0,
        }),
        Promise.all(perspectivePunchSources.map((source) => recordedPose({
            key: `perspective-punch:${source.pose}`,
            localPath: source.localPath,
            anchorX: source.width / 2,
            feetY: source.alphaBounds.bottom,
        }))),
        fallPoses(),
    ]);
    return new Map([
        ...jump.map((source, index) => [`squash:jump-${index}`, source]),
        ['squash:extension', extension],
        ['squash:compression', compression],
        ...punches,
        ...falls,
    ]);
}
/** 같은 도약의 궤도·착지 시각을 두고 관절이 펴지고 접힌 실제 원화만 비교한다. */
export function drawAnatomicalSquash(context, frame) {
    const time = Math.max(0, frame.timeMs);
    const airborne = time >= 1160 && time < 1800;
    const flight = clamp((time - 1160) / 640);
    // 같은 높이에서 상승을 읽히게 하고, 마지막 낙하 구간을 짧게 해 접지를 또렷하게 한다.
    const apex = 0.62;
    const arc = flight < apex ? flight / apex - 1 : (flight - apex) / (1 - apex);
    const height = airborne
        ? (1 - arc * arc) * (frame.reducedMotion ? 25 : 125)
        : 0;
    const jumpIndex = time < 650
        ? 0
        : time < 1050
            ? 2
            : time < 1160
                ? 3
                : time < 1560
                    ? 4
                    : time < 1740
                        ? 5
                        : time < 1800
                            ? 6
                            : time < 2000
                                ? 7
                                : 8;
    const deformation = frame.enhanced
        ? time >= 1050 && time < 1160
            ? 'squash:extension'
            : time >= 1800 && time < 1920
                ? 'squash:compression'
                : undefined
        : undefined;
    const source = frame.assets.motionResources.get(deformation ?? `squash:jump-${jumpIndex}`);
    if (!source)
        return;
    stage(context, frame, 0);
    drawBear(context, frame, { state: 'stand' });
    const x = 410;
    const ground = battleLayout.attacker.ground;
    ellipse(context, x, ground + 8, 58 * (1 - height / 300), 10 * (1 - height / 300), '#14293b32');
    context.save();
    context.imageSmoothingEnabled = false;
    const scale = battleLayout.attacker.scale;
    context.drawImage(source.image, Math.round(x - source.anchorX * scale), Math.round(ground - height - source.feetY * scale), source.image.naturalWidth * scale, source.image.naturalHeight * scale);
    context.restore();
}
