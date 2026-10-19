import { attackDefinition } from '../../characters/companion-basic-attacks/attack-definitions.js';
import { sampleAttack } from '../../characters/companion-basic-attacks/attack-motion.js';
const spellContact = attackDefinition('yeonmuk', 'basic').contacts[0];
const lungeDefinition = attackDefinition('biwol', 'lunge');
const spellReleaseSeconds = 0.27;
const spellAttachSeconds = 0.43;
const spellReadEndSeconds = 0.62;
export const talismanInsertTiming = {
    startMs: 400,
    releaseMs: 1350,
    attachMs: 1510,
    contactMs: 1560,
    insertEndMs: 2360,
    lungeStartMs: 2360,
    lungeContactMs: 2360 + lungeDefinition.contacts[0] * 1000,
    lungeReturnMs: 2360 + (lungeDefinition.travel?.returnEnd ?? 1.04) * 1000,
};
/** 접촉 뒤 문양을 읽는 동안에도 몸·종이·문양·표적에 같은 원본 시각을 준다. */
function spellSeconds(timeMs) {
    const timing = talismanInsertTiming;
    if (timeMs < timing.startMs)
        return 0;
    if (timeMs < timing.releaseMs)
        return (((timeMs - timing.startMs) / (timing.releaseMs - timing.startMs)) *
            spellReleaseSeconds);
    if (timeMs < timing.attachMs)
        return spellReleaseSeconds + (timeMs - timing.releaseMs) / 1000;
    if (timeMs < timing.contactMs)
        return spellAttachSeconds + (timeMs - timing.attachMs) / 1000;
    if (timeMs < timing.insertEndMs)
        return (spellContact +
            ((timeMs - timing.contactMs) / (timing.insertEndMs - timing.contactMs)) *
                (spellReadEndSeconds - spellContact));
    return spellReadEndSeconds + (timeMs - timing.insertEndMs) / 1000;
}
/** 편집판과 기준판이 하나의 장면 시각에서 독립적으로 같은 사건을 그린다. */
export function sampleTalismanInsert(timeMs, facing) {
    const timing = talismanInsertTiming;
    const spellElapsed = spellSeconds(Math.max(0, timeMs));
    const lungeElapsed = Math.max(0, (timeMs - timing.lungeStartMs) / 1000);
    return {
        spellElapsed,
        lungeElapsed,
        spell: sampleAttack('yeonmuk', spellElapsed, facing),
        lunge: sampleAttack('biwol', lungeElapsed, facing, 'lunge'),
        spellStarted: timeMs >= timing.startMs,
        lungeStarted: timeMs >= timing.lungeStartMs,
        closeUp: timeMs >= timing.contactMs && timeMs < timing.insertEndMs,
        phase: timeMs < timing.startMs
            ? '연묵과 비월의 대기'
            : timeMs < timing.releaseMs
                ? '연묵이 부적을 준비'
                : timeMs < timing.attachMs
                    ? '부적 비행'
                    : timeMs < timing.contactMs
                        ? '표적에 부착'
                        : timeMs < timing.insertEndMs
                            ? '문양을 확인하는 인서트'
                            : timeMs < timing.lungeContactMs
                                ? '비월이 파고듦'
                                : timeMs < timing.lungeReturnMs
                                    ? '단검 접촉과 회수'
                                    : '원위치에 정착',
    };
}
