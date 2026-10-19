import { finisherTargetX, collectContactCues, sampleActorPose, visibleActors, } from './finisher-actors.js';
import { collectSandbagContacts } from './sandbag.js';
import { sampleComboMotion } from './player.js';
import { drawPose, posePosition, groundY, startX, stageWidth, stageHeight, } from './pose-drawing.js';
import { frameKey } from './source-frames.js';
import { drawFinisherField, drawFinisherRelease, sampleFinisherSignature, } from './finisher-signatures.js';
function beatTiming(snapshot, beat) {
    let startMs = 0;
    let endMs = 0;
    for (const [index, step] of snapshot.motion.steps.entries()) {
        if (index < beat.fromStep)
            startMs += step.durationMs;
        if (index <= beat.toStep)
            endMs += step.durationMs;
    }
    return { startMs, endMs };
}
/** 실행 이력이 없는 구성표라 탐색·정지·반복 시 동일한 연출을 돌려준다. */
export function sampleFinisher(snapshot, options) {
    const definition = snapshot.motion.finisher;
    if (!definition || !options.showMovement || options.showFinisher === false)
        return undefined;
    const beat = definition.beats.find((item) => snapshot.stepIndex >= item.fromStep && snapshot.stepIndex <= item.toStep);
    if (!beat)
        return undefined;
    const timing = beatTiming(snapshot, beat);
    const progress = Math.max(0, Math.min(1, (snapshot.elapsedMs - timing.startMs) /
        Math.max(1, timing.endMs - timing.startMs)));
    const contacts = collectSandbagContacts(snapshot.motion, options);
    const hitCount = contacts.filter((contact) => (options.showSandbag ? contact.connected : true) &&
        (options.showSandbag ? contact.timeMs : contact.plannedTimeMs) <=
            snapshot.elapsedMs).length;
    const rushing = beat.emphasis === 'rush';
    const demon = definition.theme === 'demon';
    const signature = sampleFinisherSignature(snapshot, contacts, {
        connectedOnly: !!options.showSandbag,
        scale: options.scale,
    });
    const latestAge = Math.min(...contacts
        .filter((contact) => (!options.showSandbag || contact.connected) &&
        (options.showSandbag ? contact.timeMs : contact.plannedTimeMs) <=
            snapshot.elapsedMs)
        .map((contact) => snapshot.elapsedMs -
        (options.showSandbag ? contact.timeMs : contact.plannedTimeMs)));
    const contactPulse = Math.max(0, Math.min(1, 1 - latestAge / 75));
    const finalAccent = signature.releaseAgeMs !== undefined && signature.releaseAgeMs < 70;
    return {
        definition,
        beat,
        progress,
        ...timing,
        hitCount,
        totalHits: contacts.length,
        connectedOnly: !!options.showSandbag,
        backgroundDim: Math.max(demon && rushing ? 0.94 + contactPulse * 0.04 : rushing ? 0.58 : 0.32, signature.charge ? 0.42 + signature.charge * 0.36 : 0, demon && finalAccent ? 0.98 : 0),
        actorOpacity: demon && rushing ? 0.28 + contactPulse * 0.45 : 1,
        contacts,
        signature,
    };
}
/** 필살기 구도를 선택했을 때만 도입·연타·결정타의 거리를 바꾼다. */
export function finisherCameraStaging(snapshot, options) {
    const definition = snapshot.motion.finisher;
    const beat = definition?.beats.find((item) => snapshot.stepIndex >= item.fromStep && snapshot.stepIndex <= item.toStep);
    if (!definition || !beat)
        return { zoom: 1, focusX: startX, focusY: groundY, active: false };
    const { startMs, endMs } = beatTiming(snapshot, beat);
    const progress = Math.max(0, Math.min(1, (snapshot.elapsedMs - startMs) / Math.max(1, endMs - startMs)));
    const eased = progress * progress * (3 - 2 * progress);
    if (definition.theme === 'omnislash' &&
        options.showFinisherConcept &&
        options.showFinisher !== false) {
        // 공격자를 쫓지 않고 여섯 접촉 동안 같은 표적 위치와 배율을 편집 기준으로 둔다.
        const amount = beat.emphasis === 'intro'
            ? eased
            : beat.emphasis === 'finish'
                ? 1 - eased
                : 1;
        return {
            zoom: 1 - 0.09 * amount,
            focusX: startX + finisherTargetX * options.scale,
            focusY: groundY - 38 * options.scale,
            active: amount > 0,
        };
    }
    const signature = sampleFinisherSignature(snapshot, [], {
        connectedOnly: false,
        scale: options.scale,
    });
    const amount = beat.emphasis === 'intro'
        ? 0.035 * eased
        : beat.emphasis === 'rush'
            ? definition.theme === 'omnislash'
                ? -0.09
                : -0.015
            : beat.emphasis === 'climax'
                ? 0.075
                : 0.075 * (1 - eased);
    return {
        zoom: 1 +
            (signature.charge
                ? (definition.theme === 'omnislash' ? -0.04 : 0.025) +
                    signature.charge * 0.045
                : amount),
        focusX: startX +
            (signature.charge
                ? (finisherTargetX + snapshot.x) * 0.5
                : finisherTargetX) *
                options.scale,
        focusY: groundY - 44 * options.scale,
        active: Math.abs(amount) > 0.00001,
    };
}
export function drawFinisherBackdrop(ctx, snapshot, state, options) {
    drawFinisherField(ctx, snapshot, state, options);
}
/** 궤적은 실제 공격자의 지난 위치를 잇는다. 장식선에 별도 타격은 부여하지 않는다. */
export function drawFinisherPaths(ctx, snapshot, state, frames, options) {
    if (state.definition.theme === 'omnislash' ||
        state.definition.theme === 'phoenix' ||
        state.definition.theme === 'galactica' ||
        state.definition.theme === 'drunken-tiger' ||
        state.beat.emphasis === 'intro' ||
        state.beat.emphasis === 'finish')
        return;
    for (const actor of visibleActors(snapshot.motion, snapshot.elapsedMs)) {
        const points = [];
        for (let age = 180; age >= 0; age -= 20) {
            const timeMs = snapshot.elapsedMs - age;
            if (timeMs < actor.startMs)
                continue;
            const pose = sampleActorPose(snapshot.motion, actor.id, timeMs);
            const source = frames.get(frameKey(pose.step));
            if (!source)
                continue;
            const position = posePosition(pose, source, options);
            points.push({ x: position.x, y: position.y - 28 * options.scale });
        }
        const first = points[0];
        const last = points.at(-1);
        if (!first || !last || Math.hypot(last.x - first.x, last.y - first.y) < 24)
            continue;
        ctx.save();
        const gradient = ctx.createLinearGradient(first.x, first.y, last.x, last.y);
        gradient.addColorStop(0, `${state.definition.accent}00`);
        gradient.addColorStop(1, state.definition.accent);
        ctx.strokeStyle = gradient;
        ctx.globalAlpha *= 0.38 * actor.opacity;
        ctx.lineWidth = 5;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        points.forEach((point, index) => index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y));
        ctx.stroke();
        ctx.globalAlpha *= 0.75;
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#fff1d0';
        ctx.stroke();
        ctx.restore();
    }
}
/** 공격 분신은 장식 토글과 무관하게 안무의 일부로 재생한다. */
export function drawFinisherActors(ctx, snapshot, frames, options) {
    for (const actor of visibleActors(snapshot.motion, snapshot.elapsedMs)) {
        if (actor.role === 'body')
            continue;
        const original = frames.get(frameKey(actor.pose.step));
        if (!original)
            continue;
        const source = options.palette && original.emphasisImage
            ? { ...original, image: original.emphasisImage }
            : original;
        ctx.save();
        let reveal = 1;
        if (snapshot.motion.finisher?.theme === 'drunken-tiger' &&
            options.showFinisher !== false) {
            const contact = collectContactCues(snapshot.motion).find((cue) => cue.actorId === actor.id);
            if (contact) {
                const age = snapshot.elapsedMs - contact.plannedTimeMs;
                reveal = Math.max(0, Math.min(1, (age + 160) / 75, (160 - age) / 100));
            }
        }
        ctx.globalAlpha *=
            actor.opacity * reveal * (options.actorOpacity?.(actor.id) ?? 1);
        const position = posePosition(actor.pose, source, options);
        ctx.fillStyle = '#261b2522';
        ctx.beginPath();
        ctx.ellipse(position.x, groundY + 3, 24, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        drawPose(ctx, actor.pose, source, options);
        ctx.restore();
    }
}
export function drawFinisherEchoes(ctx, snapshot, state, frames, options) {
    if ((state.beat.emphasis !== 'rush' && state.beat.emphasis !== 'climax') ||
        state.definition.theme === 'demon' ||
        state.definition.theme === 'omnislash' ||
        state.definition.theme === 'phoenix' ||
        state.definition.theme === 'galactica' ||
        state.definition.theme === 'drunken-tiger')
        return;
    for (let index = 3; index >= 1; index--) {
        const timeMs = snapshot.elapsedMs - index * 38;
        if (timeMs < state.startMs)
            continue;
        const pose = sampleComboMotion(snapshot.motion, timeMs);
        const source = frames.get(frameKey(pose.step));
        if (!source)
            continue;
        ctx.save();
        ctx.globalAlpha *= 0.2 * (1 - index / 4);
        drawPose(ctx, pose, source, options);
        ctx.restore();
    }
}
export function drawFinisherStrikes(ctx, snapshot, state, options) {
    if (state.definition.theme === 'phoenix' ||
        state.definition.theme === 'galactica' ||
        state.definition.theme === 'drunken-tiger')
        return;
    const contacts = options.showContactTraces === false ? [] : state.contacts;
    ctx.save();
    ctx.globalAlpha *= options.contactOpacity ?? 1;
    for (const [index, contact] of contacts.entries()) {
        if (options.showSandbag && !contact.connected)
            continue;
        const timeMs = options.showSandbag ? contact.timeMs : contact.plannedTimeMs;
        const age = snapshot.elapsedMs - timeMs;
        const final = state.signature.finalGroup.includes(contact);
        if (final)
            continue;
        const lifetime = 120;
        if (age < 0 || age >= lifetime)
            continue;
        const amount = 1 - age / lifetime;
        const radius = 9 + age * 0.16;
        ctx.save();
        ctx.translate(contact.x, contact.y);
        ctx.globalAlpha *= amount;
        ctx.strokeStyle = state.definition.accent;
        ctx.lineWidth = 2;
        if (state.definition.theme === 'omnislash') {
            ctx.rotate(index % 2 ? -0.65 : 0.65);
            ctx.beginPath();
            ctx.ellipse(0, 0, radius * 2.5, radius * 0.32, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        else {
            for (const turn of [-0.7, 0.7]) {
                ctx.beginPath();
                ctx.moveTo(-radius * Math.cos(turn), -radius * Math.sin(turn));
                ctx.lineTo(radius * Math.cos(turn), radius * Math.sin(turn));
                ctx.stroke();
            }
        }
        ctx.restore();
    }
    ctx.restore();
    ctx.save();
    ctx.globalAlpha *= options.releaseOpacity ?? 1;
    drawFinisherRelease(ctx, state, options);
    ctx.restore();
}
/** 제목·단계·연타수는 월드 변환 바깥에 고정한다. */
export function drawFinisherOverlay(ctx, snapshot, state, options = {}) {
    ctx.save();
    ctx.globalAlpha = snapshot.opacity;
    ctx.fillStyle = '#141321';
    ctx.fillRect(0, 0, stageWidth, 12);
    ctx.fillRect(0, stageHeight - 12, stageWidth, 12);
    ctx.fillStyle = state.definition.accent;
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(state.signature.charge ? `${state.beat.label} · 응축` : state.beat.label, 28, 40);
    if (state.beat.emphasis === 'intro') {
        ctx.font = 'bold 25px serif';
        ctx.fillText(snapshot.motion.title.replace(/ · .*$/, ''), 28, 78);
        ctx.fillStyle = '#f7e9ce';
        ctx.font = '13px sans-serif';
        ctx.fillText(state.definition.subtitle, 28, 101);
    }
    ctx.textAlign = 'right';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(`${String(state.hitCount).padStart(2, '0')} / ${state.totalHits}`, stageWidth - 30, 45);
    ctx.fillStyle = '#f7e9ce';
    ctx.font = '12px sans-serif';
    ctx.fillText(state.connectedOnly ? '명중' : '타격 구성', stageWidth - 30, 66);
    const beatIndex = state.definition.beats.indexOf(state.beat);
    state.definition.beats.forEach((_, index) => {
        ctx.fillStyle = index <= beatIndex ? state.definition.accent : '#f7e9ce44';
        ctx.fillRect(28 + index * 29, 373, 22, 3);
    });
    if (state.beat.emphasis === 'finish' &&
        !options.suppressEndGlyph &&
        state.definition.endGlyph &&
        state.signature.releaseAgeMs !== undefined) {
        ctx.textAlign = 'center';
        ctx.globalAlpha *= 0.2 * Math.min(1, state.progress * 4);
        ctx.fillStyle = state.definition.accent;
        ctx.font = 'bold 122px serif';
        ctx.fillText(state.definition.endGlyph, 740, 302);
    }
    ctx.restore();
}
