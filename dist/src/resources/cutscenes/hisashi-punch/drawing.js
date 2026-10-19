import { stage } from '../shared/drawing.js';
import { ease, unit, sceneWidth, sceneHeight } from '../shared/playback.js';
import { samplePunch, timing, approachDistance, } from './timeline.js';
import { drawSpeedField } from './speed-field.js';
import { placement, sourceGeometry } from './contact.js';
import { drawImpact } from './impact.js';
const layout = {
    contact: placement.contact,
    actorScale: sourceGeometry.actor.scale,
    targetScale: sourceGeometry.target.scale,
};
function grain(index) {
    const value = Math.sin(index * 127.1 + 311.7) * 43758.5453;
    return value - Math.floor(value);
}
function actor(ctx, frame, feet, ink) {
    const source = frame.source;
    const scale = layout.actorScale;
    ctx.drawImage(ink ? frame.ink : source.image, Math.round(feet.x - source.anchorX * scale), Math.round(feet.y - source.feetY * scale), source.image.naturalWidth * scale, source.image.naturalHeight * scale);
}
function target(ctx, frame, origin, ink) {
    const scale = layout.targetScale;
    const image = frame.source.image;
    ctx.drawImage(ink ? frame.ink : image, Math.round(origin.x - frame.anchor.x * scale), Math.round(origin.y - frame.anchor.y * scale), image.naturalWidth * scale, image.naturalHeight * scale);
}
function smooth(value) {
    const p = unit(value);
    return p * p * (3 - 2 * p);
}
function camera(time, sample, reduced) {
    const middle = {
        focus: { x: layout.contact.x - 130, y: layout.contact.y - 20 },
        zoom: reduced ? 1.2 : 1.35,
    };
    if (sample.ink && time >= timing.closeUpMs) {
        // 장전부터 흑백을 유지하고, 명중을 보여준 뒤에만 카메라가 따라간다.
        const close = reduced ? 0 : smooth((time - timing.closeUpMs) / 150);
        const focus = {
            x: layout.contact.x + sample.targetX * 0.35,
            y: layout.contact.y - 25 + sample.pressure * 12,
        };
        const zoom = 2.15 - sample.pressure * 0.08;
        return {
            focus: {
                x: middle.focus.x + (focus.x - middle.focus.x) * close,
                y: middle.focus.y + (focus.y - middle.focus.y) * close,
            },
            zoom: middle.zoom + (zoom - middle.zoom) * close,
            kick: 0,
        };
    }
    if (time >= timing.releaseMs) {
        const p = ease((time - timing.releaseMs) / 220);
        return {
            focus: {
                x: layout.contact.x + (480 - layout.contact.x) * p,
                y: 274 - p * 4,
            },
            zoom: reduced ? 1 : 1.1 - p * 0.1,
            kick: reduced ? 0 : (1 - unit((time - timing.releaseMs) / 120)) * 13,
        };
    }
    const frame = smooth((time - 260) / (timing.chamberMs - 260));
    const impactKick = !reduced && sample.impactProgress !== null
        ? 8 * (1 - sample.impactProgress) ** 2
        : 0;
    return {
        focus: {
            x: 480 + (middle.focus.x - 480) * frame,
            y: 270 + (middle.focus.y - 270) * frame,
        },
        zoom: 1 + (middle.zoom - 1) * frame,
        kick: impactKick,
    };
}
function project(point, view) {
    return {
        x: 480 + (point.x - view.focus.x) * view.zoom - view.kick,
        y: 270 + (point.y - view.focus.y) * view.zoom + view.kick * 0.22,
    };
}
function paper(ctx) {
    ctx.fillStyle = '#f5f3ec';
    ctx.fillRect(0, 0, sceneWidth, sceneHeight);
    ctx.fillStyle = '#1516190b';
    for (let i = 0; i < 400; i++)
        ctx.fillRect(Math.floor(grain(i + 900) * sceneWidth), Math.floor(grain(i + 1600) * sceneHeight), 1, 1);
}
function shadow(ctx, point, width, opacity = 1) {
    ctx.save();
    ctx.globalAlpha *= opacity;
    ctx.fillStyle = '#05060999';
    ctx.beginPath();
    ctx.ellipse(point.x, point.y + 3, width, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}
function dust(ctx, age, origin, strength) {
    if (age < 0 || age > 650)
        return;
    const p = age / 650;
    ctx.save();
    ctx.globalAlpha *= (1 - p) * strength;
    ctx.fillStyle = '#d8c6a0';
    for (let i = 0; i < 23; i++) {
        const x = origin.x + (grain(i + 510) - 0.65) * (40 + p * 210);
        const y = origin.y - Math.sin(p * Math.PI) * (7 + grain(i + 620) * 33);
        ctx.fillRect(Math.round(x), Math.round(y), 2 + (i % 4), 2);
    }
    ctx.restore();
}
function drawBodies(ctx, time, assets, sample) {
    const origin = placement.actorFeet;
    const feet = { x: origin.x + sample.actorX, y: origin.y + sample.actorY };
    const center = placement.targetOrigin;
    const targetPoint = {
        x: center.x + sample.targetX,
        y: center.y + sample.targetY,
    };
    if (!sample.ink) {
        shadow(ctx, feet, 47);
        shadow(ctx, { x: targetPoint.x, y: center.y + 85 }, 53, 1 - sample.flight);
    }
    if (sample.flight < 1) {
        const age = sample.contactElapsedMs;
        const frame = sample.hitCount === 0
            ? assets.targetIdle
            : age < 100
                ? assets.targetHit
                : age < 240
                    ? assets.targetFall[1]
                    : assets.targetFall[2];
        target(ctx, frame, targetPoint, sample.ink);
    }
    actor(ctx, assets.punches.get(sample.pose), feet, sample.ink);
    if (!sample.ink) {
        dust(ctx, time - timing.advanceMs, { x: origin.x - approachDistance, y: origin.y }, 0.45);
        dust(ctx, time - timing.releaseMs, { x: origin.x + 66, y: origin.y }, 0.55);
    }
}
export function drawScene(ctx, snapshot, assets, options) {
    const time = snapshot.elapsedMs;
    const sample = samplePunch(time);
    const view = camera(time, sample, options.reducedMotion);
    const fistPoint = {
        x: layout.contact.x + sample.actorX,
        y: layout.contact.y + sample.actorY,
    };
    const contact = project(fistPoint, view);
    ctx.save();
    ctx.clearRect(0, 0, sceneWidth, sceneHeight);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#12151b';
    ctx.fillRect(0, 0, sceneWidth, sceneHeight);
    if (sample.ink)
        paper(ctx);
    const rushing = unit((time - timing.advanceMs) / (timing.contactMs - timing.advanceMs)) *
        (1 - unit((time - timing.contactMs) / 80));
    const releasing = time >= timing.releaseMs ? 1 - unit((time - timing.releaseMs) / 210) : 0;
    if (sample.ink) {
        const preparing = time < timing.advanceMs;
        const charge = unit((time - timing.loadMs) / (timing.advanceMs - timing.loadMs));
        drawSpeedField(ctx, {
            timeMs: preparing
                ? time * 0.12
                : sample.hitCount > 0
                    ? timing.contactMs + sample.contactElapsedMs
                    : time,
            strength: preparing
                ? 0.16 + charge * 0.12
                : time < timing.contactMs
                    ? 0.85
                    : 0.48 + sample.pressure * 0.52,
            monochrome: true,
            focus: contact,
            reducedMotion: options.reducedMotion,
        });
    }
    ctx.save();
    ctx.translate(480 - view.kick, 270 + view.kick * 0.22);
    ctx.scale(view.zoom, view.zoom);
    ctx.translate(-view.focus.x, -view.focus.y);
    if (!sample.ink) {
        stage(ctx, time);
        const shade = ctx.createLinearGradient(0, 30, 0, 470);
        shade.addColorStop(0, '#080a12b0');
        shade.addColorStop(1, '#080a1200');
        ctx.fillStyle = shade;
        ctx.fillRect(0, 0, sceneWidth, sceneHeight);
    }
    if (!sample.ink)
        drawSpeedField(ctx, {
            timeMs: time,
            strength: Math.max(rushing, releasing),
            monochrome: false,
            focus: {
                x: layout.contact.x + sample.actorX,
                y: layout.contact.y + sample.actorY,
            },
            reducedMotion: options.reducedMotion,
        });
    if (sample.impactProgress !== null)
        drawImpact(ctx, {
            point: fistPoint,
            progress: sample.impactProgress,
            reducedMotion: options.reducedMotion,
        });
    drawBodies(ctx, time, assets, sample);
    ctx.restore();
    ctx.fillStyle = '#090b10';
    ctx.fillRect(0, 0, sceneWidth, 26);
    ctx.fillRect(0, sceneHeight - 26, sceneWidth, 26);
    ctx.restore();
    ctx.canvas.dataset.hitCount = String(sample.hitCount);
    ctx.canvas.dataset.impactProgress =
        sample.impactProgress === null
            ? 'inactive'
            : sample.impactProgress.toFixed(3);
    ctx.canvas.dataset.cameraKick = view.kick.toFixed(2);
    ctx.canvas.dataset.contactElapsedMs = sample.contactElapsedMs.toFixed(2);
    ctx.canvas.dataset.contactTimeScale = sample.contactTimeScale.toFixed(2);
    ctx.canvas.dataset.ink = String(sample.ink);
    ctx.canvas.dataset.punchPose = sample.pose;
    ctx.canvas.dataset.contactPoint = `${layout.contact.x.toFixed(2)},${layout.contact.y.toFixed(2)}`;
    ctx.canvas.dataset.pressure = sample.pressure.toFixed(3);
    ctx.canvas.dataset.targetOffset = `${sample.targetX.toFixed(2)},${sample.targetY.toFixed(2)}`;
    ctx.canvas.dataset.sourceFrame = String(assets.punches.get(sample.pose).source.localPath.split('/').pop());
    ctx.canvas.dataset.actorOffset = `${sample.actorX.toFixed(1)},${sample.actorY.toFixed(1)}`;
}
