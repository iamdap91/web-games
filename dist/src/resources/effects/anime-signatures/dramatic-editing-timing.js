import { attackDefinition } from '../../characters/companion-basic-attacks/attack-definitions.js';
import { sampleAttack } from '../../characters/companion-basic-attacks/attack-motion.js';
import { unit } from '../../cutscenes/shared/playback.js';
const lunge = attackDefinition('biwol', 'lunge');
const contactSeconds = lunge.contacts[0];
const repeatBeginSeconds = contactSeconds - 0.08;
const repeatEndSeconds = contactSeconds + 0.16;
const firstReplayMs = 1200;
const shotDurationMs = 900;
const secondReplayMs = firstReplayMs + shotDurationMs;
const followThroughMs = secondReplayMs + shotDurationMs;
/** 두 번의 되감기는 편집상의 같은 일격이다. 전투 이벤트나 명중 수를 만들지 않는다. */
export function sampleRepeatedStrike(timeMs, enhanced) {
    const time = Math.max(0, timeMs);
    const shot = !enhanced || time < firstReplayMs ? 0 : time < secondReplayMs ? 1 : 2;
    let elapsed = Math.max(0, (time - 400) / 1000);
    if (enhanced && time >= firstReplayMs && time < followThroughMs) {
        const start = shot === 1 ? firstReplayMs : secondReplayMs;
        elapsed =
            repeatBeginSeconds +
                ((time - start) / shotDurationMs) *
                    (repeatEndSeconds - repeatBeginSeconds);
    }
    else if (enhanced && time >= followThroughMs) {
        elapsed = repeatEndSeconds + (time - followThroughMs) / 1000;
    }
    return {
        elapsed,
        shot,
        finished: elapsed >= lunge.duration,
        attack: sampleAttack('biwol', elapsed, 'south-east', 'lunge'),
    };
}
/** 같은 고정 배치에서 전경과 뒤쪽의 선명도만 넘긴다. */
export function sampleFocusShift(timeMs) {
    const progress = unit((timeMs - 1100) / 1400);
    return progress * progress * (3 - 2 * progress);
}
