import { drawPaper, drawSeal } from './attack-drawing.js';
function clamp(value) {
    return Math.max(0, Math.min(1, value));
}
function interpolate(start, end, progress) {
    return {
        x: start.x + (end.x - start.x) * progress,
        y: start.y + (end.y - start.y) * progress,
    };
}
function drawVolley(context, scene) {
    const firstContact = scene.contacts[0];
    if (firstContact === undefined)
        return;
    const sign = scene.facing === 'south-east' ? 1 : -1;
    const fanStart = firstContact - 0.36;
    for (const [index, contact] of scene.contacts.slice(0, 3).entries()) {
        const branch = index - 1;
        const release = contact - 0.27;
        const arrival = contact - 0.04;
        const start = {
            x: scene.palm.x + branch * 5,
            y: scene.palm.y + branch * 3,
        };
        const hit = {
            x: scene.target.x + branch * sign * 7,
            y: scene.target.y - 61 + branch * 11,
        };
        if (scene.elapsed >= fanStart && scene.elapsed < release) {
            drawPaper(context, start, branch * sign * 0.3);
        }
        else if (scene.elapsed >= release && scene.elapsed < arrival) {
            const progress = (scene.elapsed - release) / (arrival - release);
            const position = interpolate(start, hit, progress);
            const bend = Math.sin(progress * Math.PI);
            drawPaper(context, {
                x: position.x + branch * sign * bend * 13,
                y: position.y - bend * (12 - branch * 15),
            }, branch * sign * (1 - progress) * 0.35 +
                Math.sin(progress * Math.PI * 2) * 0.12);
        }
        else if (scene.elapsed >= arrival && scene.elapsed < contact + 0.04) {
            drawPaper(context, hit, 0, 1 - clamp((scene.elapsed - contact) / 0.04));
        }
        const hitTime = scene.elapsed - contact;
        if (hitTime < 0 || hitTime >= 0.16)
            continue;
        context.save();
        context.translate(hit.x, hit.y);
        context.scale(0.64, 0.64);
        drawSeal(context, { x: 0, y: 61 }, hitTime / 0.16);
        context.restore();
    }
}
function drawGroundPapers(context, scene, contact) {
    const sign = scene.facing === 'south-east' ? 1 : -1;
    for (let index = 0; index < 3; index += 1) {
        const release = contact - 0.38 + index * 0.025;
        if (scene.elapsed < release || scene.elapsed >= contact + 0.16)
            continue;
        const progress = clamp((scene.elapsed - release) / 0.23);
        const destination = {
            x: scene.target.x + (index - 1) * 17,
            y: scene.target.y + (index % 2 === 0 ? -3 : 6),
        };
        const position = interpolate(scene.palm, destination, progress);
        const floorY = scene.home.y + (destination.y - scene.home.y) * progress - 3;
        const fall = clamp(progress / 0.4);
        context.save();
        context.translate(Math.round(position.x), Math.round(scene.palm.y + (floorY - scene.palm.y) * fall));
        context.scale(0.65, 0.65 * (1 - fall * 0.62));
        drawPaper(context, { x: 0, y: 0 }, sign * (index - 1) * 0.3 * (1 - progress), 1 - clamp((scene.elapsed - contact) / 0.16));
        context.restore();
    }
}
function drawRisingGlyph(context, target, progress) {
    const reach = 68 + Math.sin(progress * Math.PI) * 13;
    context.save();
    context.translate(target.x, target.y - 3);
    context.globalAlpha = 1 - progress;
    context.lineCap = 'butt';
    context.lineJoin = 'miter';
    context.beginPath();
    context.moveTo(-8, 0);
    context.lineTo(-5, -14);
    context.lineTo(1, -27);
    context.lineTo(-2, -reach);
    context.moveTo(-19, -33);
    context.lineTo(19, -41);
    context.moveTo(-16, -reach + 12);
    context.lineTo(2, -reach + 7);
    context.lineTo(15, -reach + 19);
    context.moveTo(2, -18);
    context.lineTo(18, -22);
    context.lineTo(13, -9);
    context.strokeStyle = '#163d48';
    context.lineWidth = 7;
    context.stroke();
    context.strokeStyle = '#76d6c4';
    context.lineWidth = 2;
    context.stroke();
    for (let index = 0; index < 6; index += 1) {
        const side = index % 2 ? 1 : -1;
        context.fillStyle = index % 3 ? '#6cb9b5' : '#e4bd65';
        context.fillRect(Math.round(side * (8 + index * 2 + progress * 13)), Math.round(-12 - index * 8 - progress * (21 + index * 3)), 3, 4);
    }
    context.restore();
}
function drawEruption(context, scene) {
    const contact = scene.contacts[0];
    if (contact === undefined)
        return;
    drawGroundPapers(context, scene, contact);
    const stampTime = scene.elapsed - (contact - 0.1);
    if (stampTime >= 0 && stampTime < 0.1) {
        context.save();
        context.translate(scene.target.x, scene.target.y);
        context.globalAlpha = 0.35 + (stampTime / 0.1) * 0.55;
        context.strokeStyle = '#6cb9b5';
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(-19, -4);
        context.lineTo(17, 4);
        context.moveTo(10, -6);
        context.lineTo(-8, 7);
        context.stroke();
        context.restore();
    }
    const hitTime = scene.elapsed - contact;
    if (hitTime < 0 || hitTime >= 0.22)
        return;
    // 명중 순간 바닥과 몸 중심을 잇고, 이후에만 획과 먹 조각을 위로 흩뜨린다.
    drawRisingGlyph(context, scene.target, hitTime / 0.22);
}
/** 짧고 끊어진 가장자리로 종이 위의 마른 먹획을 표현한다. */
function drawInkShape(context) {
    context.fillStyle = '#4d6269';
    context.beginPath();
    context.moveTo(0, -2);
    context.lineTo(-7, -8);
    context.lineTo(-16, -6);
    context.lineTo(-28, -10);
    context.lineTo(-40, -5);
    context.lineTo(-34, -2);
    context.lineTo(-44, 1);
    context.lineTo(-33, 3);
    context.lineTo(-38, 7);
    context.lineTo(-21, 6);
    context.lineTo(-13, 9);
    context.lineTo(-4, 4);
    context.closePath();
    context.fill();
    context.fillStyle = '#142e39';
    context.fillRect(-31, -5, 24, 9);
    context.fillRect(-35, -1, 30, 4);
    context.fillRect(-20, 2, 14, 4);
    context.fillStyle = '#68a79b';
    context.fillRect(-29, -4, 11, 1);
    context.fillRect(-15, -3, 7, 1);
    context.fillRect(-24, 4, 9, 1);
    context.fillStyle = '#163d48';
    context.fillRect(-47, -5, 3, 2);
    context.fillRect(-44, 6, 3, 2);
    context.fillRect(-36, -10, 2, 2);
}
function drawInk(context, scene) {
    const contact = scene.contacts[0];
    if (contact === undefined)
        return;
    const release = contact - 0.22;
    if (scene.elapsed < release || scene.elapsed >= contact + 0.2)
        return;
    const hit = { x: scene.target.x, y: scene.target.y - 61 };
    const angle = Math.atan2(hit.y - scene.palm.y, hit.x - scene.palm.x);
    const progress = clamp((scene.elapsed - release) / (contact - release));
    const tip = interpolate(scene.palm, hit, progress);
    const hitTime = scene.elapsed - contact;
    context.save();
    context.translate(Math.round(tip.x), Math.round(tip.y));
    context.rotate(angle);
    if (hitTime < 0) {
        drawInkShape(context);
    }
    else {
        if (hitTime < 0.07) {
            context.globalAlpha = 1 - hitTime / 0.07;
            drawInkShape(context);
        }
        const breakProgress = hitTime / 0.2;
        context.globalAlpha = 1 - breakProgress;
        for (let index = 0; index < 8; index += 1) {
            const side = index % 2 ? 1 : -1;
            context.fillStyle = index % 3 ? '#163d48' : '#68a79b';
            context.fillRect(Math.round(2 + breakProgress * (11 + index * 3)), Math.round(side * (2 + index * 2 + breakProgress * 15)), index % 2 ? 4 : 2, index % 3 ? 3 : 2);
        }
    }
    context.restore();
}
export function drawYeonmukAdditionalEffects(context, scene) {
    if (scene.kind === 'volley')
        drawVolley(context, scene);
    else if (scene.kind === 'eruption')
        drawEruption(context, scene);
    else
        drawInk(context, scene);
}
