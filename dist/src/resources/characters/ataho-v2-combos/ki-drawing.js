import { kiHitPoint, sampleKi } from './ki-sampling.js';
import { line } from './ki-shapes.js';
import { drawBeam, drawBeamCharge, drawBeamImpact, drawOrbCharge, drawOrbImpact, drawOrbProjectile, } from './ki-projectile-drawing.js';
import { drawCrescent, drawCrescentCharge, drawEruption, drawEruptionCharge, drawOrbitHeld, drawOrbitShot, drawSpatialImpact, } from './ki-spatial-drawing.js';
import { drawTigerCharge, drawTigerImpact, drawTigerManifest, drawTigerWave, } from './ki-tiger-drawing.js';
import { groundY, startX } from './pose-drawing.js';
function beginWorld(ctx, options) {
    ctx.save();
    ctx.translate(startX, groundY);
    ctx.scale(options.scale, options.scale);
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'bevel';
    ctx.imageSmoothingEnabled = false;
}
/** 준비의 모양과 설치 탄을 몸 뒤에 두고 얼굴·손의 자세를 보존한다. */
export function drawKiBackdrop(ctx, snapshot, frames, options) {
    const definition = snapshot.motion.ki;
    if (!definition || !options.showMovement)
        return;
    const sample = sampleKi(definition, snapshot.elapsedMs);
    if (sample.phase === 'done')
        return;
    beginWorld(ctx, options);
    switch (definition.style) {
        case 'tiger-manifest':
        case 'tiger-wave':
            drawTigerCharge(ctx, definition, sample, frames);
            break;
        case 'crescent':
            drawCrescentCharge(ctx, definition, sample, frames);
            break;
        case 'eruption':
            drawEruptionCharge(ctx, definition, sample, frames);
            break;
    }
    if (definition.style === 'orbit') {
        drawOrbitHeld(ctx, definition, sample, frames);
        for (const shot of sample.shots)
            if (shot.point.x < definition.origin.x + 18)
                drawOrbitShot(ctx, shot, sample, frames);
    }
    ctx.restore();
}
/** 형상·비행·판정이 절대 시각을 공유하며 장식 이동으로 명중을 늘리지 않는다. */
export function drawKiForeground(ctx, snapshot, frames, options) {
    const definition = snapshot.motion.ki;
    if (!definition || !options.showMovement)
        return;
    const sample = sampleKi(definition, snapshot.elapsedMs);
    if (sample.phase === 'done')
        return;
    beginWorld(ctx, options);
    // 손 안의 핵은 몸 앞에 있어야 장전 그림에 가려지지 않는다.
    if (definition.style === 'orb')
        drawOrbCharge(ctx, definition, sample, frames);
    if (definition.style === 'beam')
        drawBeamCharge(ctx, definition, sample, frames);
    if (definition.style === 'tiger-manifest')
        drawTigerManifest(ctx, definition, sample, frames);
    if (definition.style === 'tiger-wave')
        drawTigerWave(ctx, definition, sample, frames);
    if (definition.style === 'beam')
        drawBeam(ctx, definition, sample, frames);
    if (definition.style === 'eruption')
        drawEruption(ctx, definition, sample, frames);
    for (const shot of sample.shots) {
        if (definition.style === 'orb')
            drawOrbProjectile(ctx, shot, sample, definition.accent, frames);
        if (definition.style === 'crescent')
            drawCrescent(ctx, shot, sample, frames);
        if (definition.style === 'orbit' &&
            shot.point.x >= definition.origin.x + 18)
            drawOrbitShot(ctx, shot, sample, frames);
    }
    if (definition.style === 'orb')
        for (const hit of sample.hits)
            drawOrbImpact(ctx, hit.point, hit.ageMs, hit.hit.strength, definition.accent, frames);
    if (definition.style === 'crescent' || definition.style === 'orbit')
        for (const hit of sample.hits)
            drawSpatialImpact(ctx, definition, hit.point, hit.ageMs, hit.hit.strength, frames);
    ctx.restore();
}
/** 접촉 설정은 기공 실체와 분리하며 실제 명중 위치에 물성별 충격을 그린다. */
export function drawKiOverlay(ctx, snapshot, frames, options) {
    const definition = snapshot.motion.ki;
    if (!definition || !options.showMovement || options.showContacts === false)
        return;
    beginWorld(ctx, options);
    for (const hit of definition.hits) {
        const contact = options.contacts?.find((item) => item.actorId === `ki:${hit.id}`);
        if (options.showSandbag && !contact?.connected)
            continue;
        const atMs = options.showSandbag && contact ? contact.timeMs : hit.atMs;
        const ageMs = snapshot.elapsedMs - atMs;
        if (ageMs < 0 || ageMs > 280)
            continue;
        const point = options.showSandbag && contact
            ? {
                x: (contact.x - startX) / options.scale,
                y: (contact.y - groundY) / options.scale,
            }
            : kiHitPoint(definition, hit);
        switch (definition.style) {
            case 'tiger-manifest':
            case 'tiger-wave':
                drawTigerImpact(ctx, point, ageMs, hit.strength, frames);
                break;
            case 'beam':
                drawBeamImpact(ctx, point, ageMs, hit.strength, definition.accent, frames);
                break;
            case 'crescent':
            case 'eruption':
            case 'orbit':
            case 'orb':
                if (ageMs < 95) {
                    ctx.save();
                    ctx.globalAlpha = (1 - ageMs / 95) * 0.8;
                    const reach = 4 + ageMs * 0.13;
                    for (const direction of [-1, 1])
                        line(ctx, [
                            { x: point.x - reach, y: point.y - direction * reach },
                            { x: point.x + reach, y: point.y + direction * reach },
                        ], definition.accent, 1.2);
                    ctx.restore();
                }
                break;
        }
    }
    ctx.restore();
}
