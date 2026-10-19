import { kiMotions } from '../../characters/ataho-v2-combos/motions/ki-motions.js';
import { sampleComboMotion } from '../../characters/ataho-v2-combos/player.js';
import { collectSandbagContacts, sampleSandbag, } from '../../characters/ataho-v2-combos/sandbag.js';
import { groundY, startX, } from '../../characters/ataho-v2-combos/pose-drawing.js';
import { ease, unit } from '../shared/playback.js';
import { attackStartMs, impactMs, impactHoldMs } from './timeline.js';
const source = kiMotions.find((motion) => motion.id === 'ki-eruption');
if (!source)
    throw new Error('호왕일격의 지열파 원본이 없습니다.');
export const battleOptions = { scale: 3 };
// 근거리 분출은 도입이며, 샌드백까지 도달하는 중거리 분출만 이번 한 번의 피해로 센다.
export const battleMotion = {
    ...source,
    id: 'cutscene-tiger-eruption',
    ki: { ...source.ki, hits: [source.ki.hits[1]] },
};
export const groundImpactPoint = {
    x: startX + source.ki.origin.x * battleOptions.scale,
    y: groundY + source.ki.origin.y * battleOptions.scale,
};
const sourceImpactMs = source.ki.releaseMs;
const releaseIndex = source.steps.findIndex((step) => step.frame === 2 && step.motion === 'ground-punch-face-retry-south-east');
const sourceReleaseMs = source.steps
    .slice(0, releaseIndex)
    .reduce((sum, step) => sum + step.durationMs, 0);
const previewDamage = 36;
const targetMaxHealth = 100;
/** 지면 강타의 원본 시간과 지열파의 실제 연결 접촉을 소유한다. 본게임과 원본 기공은 바꾸지 않는다. */
export class CutsceneBattle {
    contact = collectSandbagContacts(battleMotion, battleOptions).find((item) => item.connected);
    sample(sceneTimeMs) {
        const releaseMs = impactMs - (sourceImpactMs - sourceReleaseMs);
        const groundAgeMs = sceneTimeMs - impactMs;
        const preparation = ease(unit((sceneTimeMs - attackStartMs) / (releaseMs - attackStartMs)));
        let sourceTimeMs;
        if (sceneTimeMs < releaseMs) {
            sourceTimeMs = 230 + (sourceReleaseMs - 230 - 0.001) * preparation;
        }
        else if (groundAgeMs < 0) {
            sourceTimeMs = sourceReleaseMs + sceneTimeMs - releaseMs;
        }
        else {
            sourceTimeMs = sourceImpactMs + Math.max(0, groundAgeMs - impactHoldMs);
        }
        const pose = sampleComboMotion(battleMotion, sourceTimeMs);
        const contact = this.contact;
        const connected = !!contact && pose.elapsedMs >= contact.timeMs;
        const held = groundAgeMs >= 0 && groundAgeMs < impactHoldMs;
        const phase = sceneTimeMs < releaseMs
            ? '응축'
            : groundAgeMs < 0
                ? '지면 내려찍기'
                : held
                    ? '지면 강타 정지'
                    : sourceTimeMs < 740
                        ? '강타 여운'
                        : sourceTimeMs < 960
                            ? '근거리 작은 분출'
                            : sourceTimeMs < 1200
                                ? '중거리 분출'
                                : '외곽 대분출·여운';
        return {
            pose,
            target: sampleSandbag({ ...pose, paused: true, waiting: false, opacity: 1 }, battleOptions),
            contact,
            connected,
            held,
            phase,
            preparation,
            groundAgeMs,
            releaseProgress: unit((sceneTimeMs - releaseMs) / (impactMs - releaseMs)),
            hitCount: connected ? 1 : 0,
            health: targetMaxHealth - (connected ? previewDamage : 0),
            maxHealth: targetMaxHealth,
            damage: connected ? previewDamage : 0,
            impactAgeMs: connected && contact ? pose.elapsedMs - contact.timeMs : -1,
        };
    }
}
