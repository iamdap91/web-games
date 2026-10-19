import { sampleAttack } from '../../characters/companion-basic-attacks/attack-motion.js';
import { attackDefinition } from '../../characters/companion-basic-attacks/attack-definitions.js';
export const splitJoinMs = 1700;
export const splitFirstContactMs = 2200;
export const punchContactMs = 1500;
/** 긴 준비 컷 뒤부터 원본의 몸·투사체·접촉을 같은 속도로 재개한다. */
export function splitActionSeconds(timeMs) {
    if (timeMs <= 1200)
        return (Math.max(0, timeMs) / 1200) * 0.14;
    if (timeMs < 1790)
        return 0.14;
    return 0.14 + (timeMs - 1790) / 1000;
}
export function sampleSplitAttack(timeMs, facing) {
    const volleySeconds = splitActionSeconds(timeMs);
    const lungeSeconds = Math.max(0, volleySeconds - 0.05);
    return {
        volleySeconds,
        lungeSeconds,
        volley: sampleAttack('yeonmuk', volleySeconds, facing, 'volley'),
        lunge: sampleAttack('biwol', lungeSeconds, facing, 'lunge'),
        lastContact: attackDefinition('yeonmuk', 'volley')
            .contacts.filter((contact) => contact <= volleySeconds)
            .at(-1),
    };
}
export function samplePunchCut(timeMs) {
    const pose = timeMs < 400
        ? -1
        : timeMs < 1500
            ? 0
            : timeMs < 2050
                ? 1
                : timeMs < 2650
                    ? 2
                    : -1;
    const normalIndex = timeMs < 400
        ? 0
        : timeMs < 650
            ? 1
            : timeMs < 950
                ? 2
                : timeMs < 1200
                    ? 3
                    : timeMs < 1500
                        ? 4
                        : timeMs < 2050
                            ? 5
                            : timeMs < 2650
                                ? 4
                                : 0;
    return {
        pose,
        normalIndex,
        phase: timeMs < 400
            ? '기본 자세'
            : timeMs < 1500
                ? '깊은 장전'
                : timeMs < 2050
                    ? '전경 주먹과 접촉'
                    : timeMs < 2650
                        ? '회수 자세'
                        : '기본 자세로 복귀',
    };
}
