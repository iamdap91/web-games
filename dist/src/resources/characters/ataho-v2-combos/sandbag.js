import { contactPoint } from './contact-geometry.js';
import { comboDuration } from './player.js';
import { collectContactCues, sampleActorPose } from './finisher-actors.js';
import { groundY, startX, motionWithDrawingContacts } from './pose-drawing.js';
import { kiHitPoint } from './ki-sampling.js';
// 접촉 자세를 유지하는 꼬리까지 명중 창을 늘리지 않는다.
const contactWindowMs = 36;
function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
}
function contactStrength(step) {
    const kind = step.contact?.kind;
    if (kind === 'shoulder')
        return 1;
    if (kind === 'kick' || kind === 'palm')
        return 0.95;
    if (kind === 'elbow')
        return 0.9;
    if (kind === 'sweep')
        return 0.8;
    // 접촉 종류가 같은 주먹이라도 잽에 강타 정지를 붙이지 않는다.
    return /uppercut|hammer|어퍼|망치/.test(`${step.motion} ${step.phase}`)
        ? 0.9
        : 0.55;
}
function contactReaction(step) {
    const source = `${step.motion} ${step.phase}`;
    if (/uppercut|어퍼/.test(source))
        return 'rising';
    // 가로 팔꿈치는 수평으로 두고 원래 내려치기·망치주먹만 하강으로 구분한다.
    if (/firewood-elbow-chop|elbow-chop|hammer|내려치|망치/.test(source))
        return 'falling';
    return 'horizontal';
}
function plannedContacts(motion, options) {
    if (motion.ki) {
        const cues = collectContactCues(motion);
        return motion.ki.hits.map((hit, index) => {
            const point = kiHitPoint(motion.ki, hit);
            return {
                actorId: `ki:${hit.id}`,
                stepIndex: cues[index].stepIndex,
                plannedTimeMs: hit.atMs,
                timeMs: hit.atMs,
                durationMs: hit.durationMs,
                kind: 'punch',
                x: startX + point.x * options.scale,
                y: groundY + point.y * options.scale,
                directionX: 1,
                directionY: hit.reaction === 'rising' ? -1 : hit.reaction === 'falling' ? 1 : 0,
                reaction: hit.reaction,
                strength: hit.strength,
                connected: false,
            };
        });
    }
    const contacts = [];
    for (const cue of collectContactCues(motion)) {
        const { actorId, stepIndex, step, plannedTimeMs, durationMs } = cue;
        const contact = step.contact;
        if (contact) {
            const reach = contact.reach ?? (contact.kind === 'sweep' ? 35 : 26);
            const pose = sampleActorPose(motion, actorId, plannedTimeMs);
            const point = contactPoint({ ...pose, step }, options);
            const reaction = contactReaction(step);
            contacts.push({
                actorId,
                stepIndex,
                plannedTimeMs,
                timeMs: plannedTimeMs,
                durationMs,
                kind: contact.kind,
                ...point,
                directionX: reach < 0 ? -1 : 1,
                directionY: reaction === 'rising' ? -1 : reaction === 'falling' ? 1 : 0,
                reaction,
                strength: contactStrength(step),
                connected: false,
            });
        }
    }
    return contacts;
}
function sandbagGeometry(first, options) {
    const width = 28 * options.scale;
    const top = Math.max(58, Math.min(groundY - 68 * options.scale, first.y - 20 * options.scale));
    return {
        anchorX: first.x + first.directionX * width * 0.5,
        anchorY: 42,
        top,
        width,
        height: groundY + 4 - top,
        cornerRadius: 4 * options.scale,
    };
}
/** 반동 계산을 그리기·접촉·카메라의 고정 범위에서 공유한다. */
export function sampleSandbagReaction(contacts, timeMs, durationMs, options) {
    let rotation = 0;
    let horizontalCompression = 0;
    let verticalCompression = 0;
    let offsetY = 0;
    let flash = 0;
    for (const contact of contacts) {
        if (!contact.connected)
            continue;
        const age = timeMs - contact.timeMs;
        const settleMs = Math.min(620, durationMs - contact.timeMs);
        if (age < 0 || age >= settleMs)
            continue;
        // 타임라인 끝에서 원위치로 정착해 반복 대기 구간에서도 멈춘 반동이 남지 않는다.
        const envelope = Math.exp(-age / 280) * (1 - age / settleMs) ** 2;
        const recoil = contact.strength * Math.sin(age / 92) * envelope;
        rotation -=
            contact.directionX *
                (contact.reaction === 'horizontal' ? 0.18 : 0.055) *
                recoil;
        offsetY += contact.directionY * 8 * options.scale * recoil;
        const pressMs = Math.min(150, settleMs);
        if (age < pressMs) {
            const compression = contact.strength *
                0.12 *
                Math.sin((age / pressMs) * Math.PI) *
                (1 - age / pressMs);
            if (contact.reaction === 'horizontal')
                horizontalCompression += compression;
            else
                verticalCompression += compression;
        }
        flash = Math.max(flash, clamp(1 - age / 44, 0, 1));
    }
    return {
        rotation: clamp(rotation, -0.19, 0.19),
        compression: clamp(horizontalCompression + verticalCompression, 0, 0.14),
        offsetY: clamp(offsetY, -10 * options.scale, 10 * options.scale),
        scaleX: clamp(1 - horizontalCompression + verticalCompression * 0.5, 0.82, 1.12),
        scaleY: clamp(1 + horizontalCompression * 0.3 - verticalCompression, 0.82, 1.08),
        flash,
    };
}
/** 몸통의 동일한 아핀 변환을 Canvas 그리기와 교차 판정 양쪽에 전달한다. */
export function sandbagBodyTransform(state) {
    const cosine = Math.cos(state.rotation);
    const sine = Math.sin(state.rotation);
    const hangingDistance = state.top - state.anchorY + state.offsetY;
    return {
        a: cosine * state.scaleX,
        b: sine * state.scaleX,
        c: -sine * state.scaleY,
        d: cosine * state.scaleY,
        e: state.anchorX - sine * hangingDistance,
        f: state.anchorY + cosine * hangingDistance,
    };
}
function touchesBag(point, geometry, reaction, options) {
    const transform = sandbagBodyTransform({ ...geometry, ...reaction });
    const dx = point.x - transform.e;
    const dy = point.y - transform.f;
    const determinant = transform.a * transform.d - transform.b * transform.c;
    // 그리기와 같은 역변환으로 검사하며, 앞선 반동을 따라가 명중 위치를 옮기지 않는다.
    const x = (transform.d * dx - transform.c * dy) / determinant;
    const y = (-transform.b * dx + transform.a * dy) / determinant;
    const tolerance = options.scale + (point.radius ?? 0);
    if (Math.abs(x) > geometry.width * 0.5 + tolerance ||
        y < -tolerance ||
        y > geometry.height + tolerance)
        return false;
    const radius = geometry.cornerRadius;
    const cornerX = Math.max(0, Math.abs(x) - (geometry.width * 0.5 - radius));
    const cornerY = Math.max(radius - y, y - (geometry.height - radius), 0);
    return cornerX ** 2 + cornerY ** 2 <= (radius + tolerance) ** 2;
}
function firstIntersection(motion, contact, contacts, geometry, options) {
    if (motion.ki && contact.actorId.startsWith('ki:')) {
        const definition = motion.ki;
        const hit = definition.hits.find((item) => `ki:${item.id}` === contact.actorId);
        const end = contact.plannedTimeMs + Math.min(contactWindowMs, hit.durationMs);
        for (let timeMs = contact.plannedTimeMs; timeMs <= end; timeMs++) {
            const point = kiHitPoint(definition, hit, timeMs);
            const worldPoint = {
                x: startX + point.x * options.scale,
                y: groundY + point.y * options.scale,
                radius: hit.radius * options.scale,
            };
            if (touchesBag(worldPoint, geometry, sampleSandbagReaction(contacts, timeMs, comboDuration(motion), options), options))
                return {
                    ...contact,
                    x: worldPoint.x,
                    y: worldPoint.y,
                    timeMs,
                    connected: true,
                };
        }
        return contact;
    }
    const step = sampleActorPose(motion, contact.actorId, contact.plannedTimeMs).step;
    const durationMs = comboDuration(motion);
    const pointAt = (timeMs) => {
        const pose = sampleActorPose(motion, contact.actorId, timeMs);
        return contactPoint({ ...pose, step }, options);
    };
    const intersects = (timeMs) => touchesBag(pointAt(timeMs), geometry, sampleSandbagReaction(contacts, timeMs, durationMs, options), options);
    const start = contact.plannedTimeMs;
    const end = start + Math.max(0, Math.min(contactWindowMs, contact.durationMs - 0.001));
    let previous = start;
    if (intersects(start))
        return { ...contact, connected: true };
    // 좁은 접촉 창만 훑고 최초 진입 경계를 좁혀 재생 속도와 RAF 간격에서 독립시킨다.
    while (previous < end) {
        const next = Math.min(previous + 1, end);
        if (intersects(next)) {
            let low = previous;
            let high = next;
            for (let iteration = 0; iteration < 10; iteration++) {
                const middle = (low + high) * 0.5;
                if (intersects(middle))
                    high = middle;
                else
                    low = middle;
            }
            return { ...contact, ...pointAt(high), timeMs: high, connected: true };
        }
        previous = next;
    }
    return contact;
}
function collectContacts(motion, options) {
    const planned = plannedContacts(motion, options);
    const first = planned[0];
    if (!first)
        return [];
    const geometry = sandbagGeometry(first, options);
    const contacts = [];
    for (const contact of planned) {
        contacts.push(firstIntersection(motion, contact, contacts, geometry, options));
    }
    return contacts;
}
function motionForContacts(motion, options) {
    return options.enabledEffects
        ? motionWithDrawingContacts(motion, options.enabledEffects)
        : motion;
}
/** 접촉 시각과 고정된 몸통의 교차를 구해 재생과 그리기에서 같은 명중을 사용한다. */
export function collectSandbagContacts(motion, options) {
    return collectContacts(motionForContacts(motion, options), options);
}
/** 마지막 강타의 제안값이며, 빗나감과 짧은 잽에는 재생 정지를 추가하지 않는다. */
export function contactHitStopMs(contact, options) {
    if (!contact.connected || !options.finalContact || contact.strength < 0.8)
        return 0;
    if (contact.kind === 'shoulder')
        return 40;
    if (contact.kind === 'kick')
        return 34;
    if (contact.kind === 'palm')
        return 32;
    if (contact.kind === 'elbow')
        return 28;
    return 24;
}
/** 실행 이력을 보관하지 않아 정지·탐색·반복 재생에서 같은 위치와 반응을 돌려준다. */
export function sampleSandbag(snapshot, options) {
    const motion = motionForContacts(snapshot.motion, options);
    const contacts = collectContacts(motion, options);
    const first = plannedContacts(motion, options)[0];
    if (!first)
        return undefined;
    return {
        ...sandbagGeometry(first, options),
        ...sampleSandbagReaction(contacts, snapshot.elapsedMs, comboDuration(motion), options),
        scale: options.scale,
        opacity: snapshot.opacity,
        contacts,
    };
}
