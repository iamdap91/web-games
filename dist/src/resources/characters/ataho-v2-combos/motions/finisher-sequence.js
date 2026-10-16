import { collectContactCues, finisherAuthoringTargetX, finisherTargetX, } from '../finisher-actors.js';
import { rushMotion } from './rush.js';
import { dodgeMotion } from './dodge.js';
import { elbowChopMotion } from './elbow-chop.js';
import { flyingKickMotion } from './flying-kick.js';
import { cheolsangoMotion } from './cheolsango.js';
import { generatedAttacks } from './generated-attacks.js';
import { smearAttacks } from './smear-attacks.js';
import { groundKickSteps } from './kick-additions.js';
import { withRequiredElbowDrawing } from './pose-effects.js';
function generated(id) {
    const motion = generatedAttacks.find((item) => item.id === `new-${id}-south-east`);
    if (!motion)
        throw new Error(`필살기의 원본 기술이 없습니다: ${id}`);
    return motion.steps.slice(1, -1);
}
function directionalSteps(kind, direction) {
    const uppercut = kind === 'uppercut';
    const kick = kind === 'high-kick' || kind === 'air-kick';
    const motion = uppercut
        ? 'surprise-uppercut'
        : kick
            ? 'high-kick'
            : 'cross-punch';
    // 서·동 원본을 직접 확인한 손발 끝 좌표다. 남동 그림의 reach를 반전하지 않는다.
    const reach = direction === 'west'
        ? uppercut
            ? -22
            : kick
                ? -20
                : -27
        : uppercut
            ? 20
            : kick
                ? 27
                : 28;
    const height = uppercut ? 54 : kick ? 59 : 32;
    const count = uppercut || kick ? 7 : 6;
    const contactFrame = uppercut ? 3 : kick ? 4 : 5;
    return Array.from({ length: count }, (_, frame) => ({
        motion: `${motion}-${direction}`,
        frame,
        durationMs: 70,
        x: 0,
        anchor: 'feet',
        phase: `${direction === 'west' ? '서쪽' : '동쪽'} ${uppercut ? '어퍼컷' : kick ? '높은 킥' : '정권'}`,
        contact: frame === contactFrame
            ? { kind: kick ? 'kick' : 'punch', reach, height }
            : undefined,
    }));
}
function sourceSteps(kind, direction) {
    if (direction && direction !== 'south-east')
        return directionalSteps(kind, direction);
    switch (kind) {
        case 'jab':
            return rushMotion.steps.slice(5, 9);
        case 'straight':
            return rushMotion.steps.slice(9, 14);
        case 'one-two':
            return rushMotion.steps.slice(5, 14);
        case 'hook':
            return smearAttacks[0].steps.slice(1, -1);
        case 'hammer':
            return smearAttacks[1].steps.slice(1, -1);
        case 'horizontal-elbow':
            return generated('horizontal-elbow');
        case 'elbow-down':
            return elbowChopMotion.steps.slice(3, 13).map(withRequiredElbowDrawing);
        case 'uppercut':
            return dodgeMotion.steps.slice(6, 13);
        case 'high-kick':
            return groundKickSteps;
        case 'air-kick':
            return flyingKickMotion.steps.slice(1, 17);
        case 'shoulder':
            return cheolsangoMotion.steps.slice(1, -1);
    }
}
export function finisherGuard(x, durationMs, phase) {
    return { ...rushMotion.steps[0], x, y: 0, durationMs, phase };
}
/** 실제 접촉마다 몸 위치를 맞추고 원본 손발 좌표·발 앵커는 바꾸지 않는다. */
export function finisherAttack(kind, options = {}) {
    const source = sourceSteps(kind, options.direction);
    const contacts = source.flatMap((step, index) => step.contact ? [{ step, index }] : []);
    if (!contacts.length)
        throw new Error(`필살기의 접촉 자세가 없습니다: ${kind}`);
    // 남동 망치주먹의 접촉 직전은 스미어이므로 그 앞의 실제 준비 그림을 쓴다.
    const windupIndex = contacts[0].index -
        (kind === 'hammer' &&
            (!options.direction || options.direction === 'south-east')
            ? 2
            : 1);
    const roots = contacts.map(({ step }, index) => {
        const reach = step.contact.reach ?? (step.contact.kind === 'sweep' ? 35 : 26);
        const target = index === 0
            ? (options.firstTargetX ?? options.targetX ?? finisherAuthoringTargetX)
            : (options.targetX ?? finisherAuthoringTargetX);
        return target - reach;
    });
    return source.flatMap((step, index) => {
        let nearest = 0;
        for (let hit = 1; hit < contacts.length; hit++) {
            const previous = contacts[hit - 1].index;
            const next = contacts[hit].index;
            if (index > (previous + next) / 2)
                nearest = hit;
        }
        const durationMs = step.contact
            ? Math.max(35, Math.min(60, options.contactMs ?? 45))
            : Math.max(25, Math.round((step.durationMs * (options.pace ?? 0.55)) / 5) * 5);
        const height = options.endY === undefined
            ? (options.y ?? 0)
            : (options.y ?? 0) +
                (options.endY - (options.y ?? 0)) *
                    Math.min(1, index / Math.max(1, contacts[0].index));
        const y = Math.max(-32, Math.min(0, (step.y ?? 0) + height));
        const contact = step.contact && (y !== 0 || step.contact.heightReference === 'body')
            ? {
                ...step.contact,
                height: step.contact.heightReference === 'body'
                    ? step.contact.height
                    : step.contact.height + (step.y ?? 0),
                heightReference: 'body',
            }
            : step.contact;
        const windupHoldMs = options.windupHoldMs ?? 0;
        const charging = !step.contact && index === windupIndex && windupHoldMs > 0;
        const recoveryMs = index === source.length - 1 && !step.contact
            ? Math.max(25, options.recoveryMs ?? durationMs)
            : durationMs;
        const pose = {
            ...step,
            x: roots[nearest],
            y,
            durationMs: recoveryMs,
            emphasis: undefined,
            contact,
        };
        // 같은 좌표의 준비 그림을 앞에 두어 정지 중에는 다음 자세로 보간하지 않는다.
        return charging
            ? [{ ...pose, durationMs: windupHoldMs, emphasis: 'charge' }, pose]
            : [pose];
    });
}
/** 각 기술의 준비·접촉·회수를 모으고 박자 범위와 타격 번호를 한 곳에서 정한다. */
export class FinisherSequence {
    steps = [];
    beats = [];
    hit = 0;
    actors = [];
    get lastHitMs() {
        let timeMs = 0;
        let last = 0;
        for (const step of this.steps) {
            if (step.contact)
                last = timeMs;
            timeMs += step.durationMs;
        }
        return last;
    }
    get x() {
        return this.steps.at(-1)?.x ?? 80;
    }
    append(steps) {
        for (const step of steps)
            this.steps.push({
                ...step,
                phase: step.contact
                    ? `${++this.hit}타 · ${step.phase.replace(/^\d+타 · /, '')}`
                    : step.phase,
            });
        return this;
    }
    attack(kind, options = {}) {
        const steps = finisherAttack(kind, {
            ...options,
            firstTargetX: this.hit === 0 ? 132 : (options.targetX ?? finisherAuthoringTargetX),
        });
        const destination = steps[0].x;
        // 작은 리치 차이는 회수 자세의 보간으로 잇고 큰 위치 전환만 발동작을 넣는다.
        if (Math.abs(destination - this.x) > 12) {
            const durationMs = Math.max(75, Math.min(180, Math.abs(destination - this.x) * 3));
            if ((this.steps.at(-1)?.y ?? 0) < 0 || options.direction)
                this.cross(destination, steps[0].y ?? 0, '다음 타격으로 재진입', durationMs);
            else
                this.move(destination, '다음 타격으로 발 디딤', durationMs);
        }
        return this.append(steps);
    }
    move(toX, phase, durationMs = 150) {
        const fromX = this.x;
        const frames = toX < fromX ? [3, 2, 1, 0] : [0, 1, 2];
        return this.append(frames.map((frame, index) => ({
            motion: 'walking-3-south-east',
            frame,
            x: fromX + ((toX - fromX) * index) / (frames.length - 1),
            y: 0,
            durationMs: Math.max(25, durationMs / frames.length),
            anchor: 'feet',
            phase,
        })));
    }
    hold(phase, durationMs) {
        return this.append([finisherGuard(this.x, durationMs, phase)]);
    }
    poseHold(phase, durationMs) {
        const pose = this.steps.at(-1) ?? finisherGuard(this.x, durationMs, phase);
        return this.append([{ ...pose, contact: undefined, durationMs, phase }]);
    }
    jumpTo(y, phase, durationMs = 120) {
        const fromY = this.steps.at(-1)?.y ?? 0;
        return this.append([2, 3, 4].map((frame, index) => ({
            motion: 'jumping-1-south-east',
            frame,
            x: this.x,
            y: index < 2 ? fromY : Math.max(-32, Math.min(0, y)),
            durationMs: Math.max(25, durationMs / 3),
            anchor: 'feet',
            phase,
        })));
    }
    dash(toX, phase, durationMs = 120) {
        const fromX = this.x;
        const y = this.steps.at(-1)?.y ?? 0;
        const airborne = y < 0;
        return this.append((airborne ? [3, 4, 6] : [0, 1, 2]).map((frame, index) => ({
            motion: airborne
                ? 'jumping-1-south-east'
                : 'running-4-frames-south-east',
            frame,
            x: fromX + ((toX - fromX) * index) / 2,
            y,
            durationMs: Math.max(25, durationMs / 3),
            anchor: 'feet',
            phase,
            movementCurve: { x: 'ease-in' },
        })));
    }
    /** 표적 반대편으로 몸이 실제 횡단한다. 이동 방향의 원본 달리기를 사용한다. */
    cross(toX, y, phase, durationMs = 160) {
        const fromX = this.x;
        const fromY = this.steps.at(-1)?.y ?? 0;
        const direction = toX < fromX ? 'west' : 'east';
        return this.append([0, 1, 2, 3].map((frame, index) => ({
            motion: `running-4-frames-${direction}`,
            frame,
            x: fromX + ((toX - fromX) * index) / 3,
            y: fromY + ((y - fromY) * index) / 3,
            durationMs: durationMs / 4,
            anchor: 'feet',
            phase,
            movementCurve: { x: 'ease-in' },
        })));
    }
    /** 지정된 명중 시점에 맞춰 준비·접촉·퇴장까지 재생하는 공격 분신이다. */
    assist(kind, options) {
        const attack = finisherAttack(kind, {
            ...options,
            targetX: finisherAuthoringTargetX,
            firstTargetX: finisherAuthoringTargetX,
        });
        const direction = options.direction === 'west' ? -1 : 1;
        const root = attack[0].x;
        const y = attack[0].y ?? 0;
        const approachMs = options.approachMs ?? 110;
        const steps = [
            ...[0, 1, 2].map((frame, index) => ({
                motion: `running-4-frames-${direction < 0 ? 'west' : 'east'}`,
                frame,
                x: root - direction * (60 - index * 20),
                y: y - 12 + index * 4,
                durationMs: approachMs / 3,
                anchor: 'feet',
                phase: '分 · 分신 돌입',
            })),
            ...attack.map((step) => ({ ...step, phase: `分 · ${step.phase}` })),
        ];
        const last = attack.at(-1);
        steps.push({
            ...last,
            contact: undefined,
            durationMs: 110,
            x: last.x + direction * 35,
            y: (last.y ?? 0) - 8,
            phase: '分 · 잔상으로 흩어짐',
        });
        const contactIndex = attack.findIndex((step) => step.contact);
        const preparationMs = approachMs +
            attack
                .slice(0, contactIndex)
                .reduce((sum, step) => sum + step.durationMs, 0);
        this.actors.push({
            id: `assist-${this.actors.length + 1}`,
            startMs: options.atMs - preparationMs,
            steps,
            opacity: options.role === 'echo' ? 0.46 : 0.83,
            role: options.role ?? 'clone',
        });
        return this;
    }
    land(phase, durationMs = 210) {
        const y = this.steps.at(-1)?.y ?? 0;
        if (y >= 0)
            return this;
        return this.append([6, 7, 8].map((frame, index) => ({
            motion: 'jumping-1-south-east',
            frame,
            x: this.x,
            y: index === 0 ? y : 0,
            durationMs: Math.max(25, durationMs * (index === 0 ? 0.2 : index === 1 ? 0.5 : 0.3)),
            anchor: 'feet',
            phase,
        })));
    }
    beat(label, emphasis, build) {
        const fromStep = this.steps.length;
        build(this);
        if (this.steps.length > fromStep)
            this.beats.push({
                label,
                emphasis,
                fromStep,
                toStep: this.steps.length - 1,
            });
        return this;
    }
    build(config) {
        // 무대 중앙에 고정 표적을 두어 양쪽 돌입과 분신을 같은 크기로 담는다.
        const stage = (steps) => steps.map((step) => ({
            ...step,
            x: step.x + (finisherTargetX - finisherAuthoringTargetX),
        }));
        const actors = this.actors.map((actor) => ({
            ...actor,
            steps: stage(actor.steps),
        }));
        const totalHits = this.hit +
            actors.reduce((sum, actor) => sum + actor.steps.filter((step) => step.contact).length, 0);
        const motion = {
            ...config,
            title: config.title.replace(/ · \d+타$/, ` · ${totalHits}타`),
            steps: stage(this.steps),
            finisher: { ...config.finisher, beats: [...this.beats], actors },
        };
        const contacts = collectContactCues(motion);
        const rawElbow = 'ataho-firewood-elbow-chop-south-east-south-east';
        const drawnElbow = 'presentation-elbow-keyposes-south-east';
        if (contacts.some((cue) => cue.step.motion === rawElbow))
            throw new Error(`팔꿈치 내려치기에 장전·하강 그림이 필요합니다: ${config.id}`);
        const lastBody = contacts.filter((cue) => cue.actorId === 'body').at(-1);
        const lastTimeMs = contacts.at(-1)?.plannedTimeMs ?? 0;
        // 본체의 끝타와 마지막 동시 협공 모두에서 짧은 내려치기를 제외한다.
        if (lastBody?.step.motion === drawnElbow ||
            contacts.some((cue) => Math.abs(cue.plannedTimeMs - lastTimeMs) < 0.01 &&
                cue.step.motion === drawnElbow))
            throw new Error(`짧은 팔꿈치 내려치기는 마지막 공격에 쓸 수 없습니다: ${config.id}`);
        const numbers = new Map(contacts.map((cue, index) => [
            `${cue.actorId}:${cue.stepIndex}`,
            index + 1,
        ]));
        const numbered = (id, steps) => steps.map((step, index) => ({
            ...step,
            phase: step.contact
                ? `${numbers.get(`${id}:${index}`)}타 · ${step.phase.replace(/^\d+타 · /, '')}`
                : step.phase,
        }));
        return {
            ...motion,
            steps: numbered('body', motion.steps),
            finisher: {
                ...motion.finisher,
                actors: actors.map((actor) => ({
                    ...actor,
                    steps: numbered(actor.id, actor.steps),
                })),
            },
        };
    }
}
