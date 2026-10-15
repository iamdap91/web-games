import { rushMotion } from './rush.js';
import { dodgeMotion } from './dodge.js';
import { groundSpinMotion } from './ground-spin.js';
import { elbowChopMotion } from './elbow-chop.js';
import { slideMotion } from './slide.js';
// 단발의 시작·종료 가드를 떼고 공격과 회수만 잇는다. 지상 타격 중에는 발을 고정한다.
function groundPhrase(motion, options) {
    let hit = options.firstHit;
    return motion.steps.slice(options.from, options.to).map((step) => ({
        ...step,
        x: options.x,
        y: 0,
        anchor: 'feet',
        durationMs: Math.max(25, Math.round((step.durationMs * options.pace) / 5) * 5),
        phase: step.contact
            ? `${hit++}타 · ${step.phase}`
            : `${options.label} · ${step.phase}`,
    }));
}
export function guard(x, durationMs = 110) {
    return { ...rushMotion.steps[0], x, durationMs, phase: '가드 준비' };
}
export function recover(x) {
    return [
        { ...rushMotion.steps[14], x, durationMs: 50, phase: '손 회수' },
        { ...rushMotion.steps[15], x, durationMs: 70, phase: '가드 올리기' },
        { ...guard(x, 160), phase: '연속 공격 완료' },
    ];
}
export function oneTwo(x, firstHit = 1) {
    return groundPhrase(rushMotion, {
        from: 5,
        to: 14,
        x,
        pace: 0.8,
        firstHit,
        label: '원투',
    });
}
export function uppercut(x, firstHit = 3) {
    return groundPhrase(dodgeMotion, {
        from: 6,
        to: 13,
        x,
        pace: 0.8,
        firstHit,
        label: '어퍼컷',
    }).map((step) => (step.contact ? { ...step, durationMs: 90 } : step));
}
export function spin(x, firstHit = 1) {
    return groundPhrase(groundSpinMotion, {
        from: 1,
        to: 9,
        x,
        pace: 0.75,
        firstHit,
        label: '회전',
    });
}
export function elbow(x, firstHit = 3) {
    const phrase = groundPhrase(elbowChopMotion, {
        from: 3,
        to: 12,
        x,
        pace: 0.55,
        firstHit,
        label: '내려치기',
    });
    // 하강은 짧게, 내려친 자세는 길게 두어 피니시의 박자를 만든다.
    return phrase.map((step) => ({
        ...step,
        durationMs: step.frame === 3
            ? 90
            : step.frame === 4
                ? 30
                : step.frame === 5
                    ? 75
                    : step.durationMs,
        contact: step.frame === 5 ? { kind: 'elbow', height: 32, reach: 18 } : undefined,
        phase: step.frame === 5
            ? `${firstHit}타 · 내려치기 멈춤`
            : `내려치기 · ${step.phase.replace(/^.*? · /, '')}`,
    }));
}
export function sweep(x, firstHit = 3) {
    return [
        {
            motion: 'leg-sweep-south-east',
            frame: 0,
            durationMs: 55,
            x,
            y: 0,
            anchor: 'feet',
            phase: '하단 · 무게 낮추기',
        },
        {
            motion: 'leg-sweep-south-east',
            frame: 1,
            durationMs: 45,
            x,
            y: 0,
            anchor: 'feet',
            phase: '하단 · 다리 접기',
        },
        ...groundPhrase(slideMotion, {
            from: 8,
            to: 14,
            x,
            pace: 0.8,
            firstHit,
            label: '하단',
        }),
    ];
}
