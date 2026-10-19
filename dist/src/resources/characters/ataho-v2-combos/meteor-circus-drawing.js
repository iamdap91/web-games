import { frameKey } from './source-frames.js';
import { stageHeight, stageWidth } from './pose-drawing.js';
import { sampleCircusCamera, projectCircusPoint, } from './meteor-circus-camera.js';
import { circusTiming, circusScenePhases, sampleCircusShot, sampleCircusTarget, } from './meteor-circus-flight.js';
import { circusTargetFrames, } from './meteor-circus-target.js';
export function isMeteorCircus(motion) {
    return motion.id === 'finisher-pegasus-meteor-circus';
}
function clamp(value, minimum = 0, maximum = 1) {
    return Math.max(minimum, Math.min(maximum, value));
}
function onScreen(point, margin = 80) {
    return (point.visible &&
        point.x > -margin &&
        point.x < stageWidth + margin &&
        point.y > -margin &&
        point.y < stageHeight + margin);
}
/** 원근 격자·기둥은 고정된 공간이다. 카메라와의 관계로만 화면에서 움직인다. */
function drawHall(ctx, camera, layers) {
    const sky = ctx.createLinearGradient(0, 0, 0, stageHeight);
    sky.addColorStop(0, '#111b28');
    sky.addColorStop(0.65, '#344449');
    sky.addColorStop(1, '#191f29');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, stageWidth, stageHeight);
    ctx.lineWidth = 1;
    const hallEndZ = 3200;
    for (let x = -910; x <= 910; x += 70) {
        for (let z = -100; z < hallEndZ; z += 100) {
            const a = projectCircusPoint({ x, y: -12, z }, camera);
            const b = projectCircusPoint({ x, y: -12, z: z + 100 }, camera);
            if (!a.visible || !b.visible)
                continue;
            ctx.strokeStyle = `rgba(166,158,130,${clamp(65 / Math.max(80, a.depth), 0.025, 0.17)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
        }
    }
    for (let z = 0; z < hallEndZ; z += 100) {
        const a = projectCircusPoint({ x: -910, y: -12, z }, camera);
        const b = projectCircusPoint({ x: 910, y: -12, z }, camera);
        if (!a.visible || !b.visible)
            continue;
        ctx.strokeStyle = `rgba(166,158,130,${clamp(55 / Math.max(80, a.depth), 0.025, 0.14)})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
    }
    for (const x of [-750, 750]) {
        for (let z = 100; z < hallEndZ; z += 220) {
            const corners = [
                { x: x - 11, y: -12, z },
                { x: x + 11, y: -12, z },
                { x: x + 11, y: 255, z },
                { x: x - 11, y: 255, z },
            ].map((point) => projectCircusPoint(point, camera));
            if (corners.some((point) => !point.visible))
                continue;
            const depth = corners[0].depth;
            layers.push({
                depth,
                draw: () => {
                    ctx.globalAlpha = clamp(400 / depth, 0.16, 0.9);
                    ctx.fillStyle = '#504b48';
                    ctx.strokeStyle = '#a3926c';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    corners.forEach((p, index) => index ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                },
            });
        }
    }
}
function spriteLayer(ctx, frames, key, point, camera, layers, settings) {
    const frame = frames.get(key);
    const projected = projectCircusPoint(point, camera);
    if (!frame || !onScreen(projected, 250))
        return;
    const scale = projected.scale * settings.worldScale;
    layers.push({
        depth: projected.depth,
        draw: () => {
            ctx.save();
            ctx.globalAlpha = settings.opacity ?? 1;
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(frame.image, projected.x - frame.anchorX * scale, projected.y - (settings.feet ? frame.feetY : frame.anchorY) * scale, frame.image.width * scale, frame.image.height * scale);
            ctx.restore();
        },
    });
}
function targetFrame(timeMs, latestHitMs) {
    const animation = timeMs >= circusTiming.lastHitMs
        ? 'die1'
        : latestHitMs >= 0 && timeMs - latestHitMs < 110
            ? 'hit1'
            : 'move';
    const frames = circusTargetFrames.filter((frame) => frame.animation === animation);
    const durationMs = frames.reduce((total, frame) => total + frame.durationSeconds * 1000, 0);
    let remaining = animation === 'move'
        ? timeMs % durationMs
        : animation === 'die1'
            ? Math.min(durationMs - 1, timeMs - circusTiming.lastHitMs)
            : timeMs - latestHitMs;
    for (const frame of frames) {
        if (remaining < frame.durationSeconds * 1000)
            return frame.key;
        remaining -= frame.durationSeconds * 1000;
    }
    return frames.at(-1).key;
}
/** 꼬리와 선두는 실제 비행의 지난 위치다. 렌즈를 넘긴 구간은 끊어 화면을 가로질러 잇지 않는다. */
function projectileLayers(ctx, shot, timeMs, camera, layers) {
    if (timeMs < shot.launchMs || timeMs > shot.arriveMs + 150)
        return false;
    const drawingTime = Math.min(timeMs, shot.arriveMs);
    const residual = timeMs >= shot.arriveMs;
    const residueOpacity = residual
        ? (1 - (timeMs - shot.arriveMs) / 150) ** 2
        : 1;
    // 재선회에서 긴 꼬리가 그물처럼 겹치지 않도록 탄두 바로 뒤만 남긴다.
    const turning = timeMs >= circusTiming.evasionMs && timeMs < circusTiming.firstHitMs;
    const tailMs = (turning ? 155 : 300) + (shot.index % 5) * 16;
    const segments = 22;
    const points = Array.from({ length: segments + 1 }, (_, index) => projectCircusPoint(sampleCircusShot(shot, Math.max(shot.launchMs, drawingTime - tailMs * (1 - index / segments))), camera));
    for (let index = 1; index < points.length; index++) {
        const a = points[index - 1];
        const b = points[index];
        if (!a.visible || !b.visible || (!onScreen(a, 120) && !onScreen(b, 120)))
            continue;
        if (Math.hypot(a.x - b.x, a.y - b.y) > stageWidth * 0.7)
            continue;
        const age = index / segments;
        const depth = (a.depth + b.depth) * 0.5;
        const width = clamp(1.9 * (a.scale + b.scale) * 0.5, 0.45, 20) * (0.45 + age * 0.55);
        layers.push({
            depth,
            draw: () => {
                ctx.globalAlpha =
                    residueOpacity *
                        (0.08 + age ** 1.7 * 0.72) *
                        clamp(1100 / depth, 0.25, 1);
                ctx.lineCap = 'round';
                ctx.strokeStyle = shot.index % 4 === 0 ? '#e5e0c7' : '#92c8d9';
                ctx.lineWidth = width;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.stroke();
                if (age > 0.7) {
                    ctx.globalAlpha *= 0.68;
                    ctx.strokeStyle = '#f4f5e3';
                    ctx.lineWidth = Math.max(0.4, width * 0.24);
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
            },
        });
    }
    const tip = points.at(-1);
    if (residual || !onScreen(tip, 40))
        return false;
    const previous = points.at(-2);
    const angle = previous.visible
        ? Math.atan2(tip.y - previous.y, tip.x - previous.x)
        : 0;
    layers.push({
        depth: tip.depth - 0.1,
        draw: () => {
            const radius = clamp(tip.scale * 2.1, 1.3, 17);
            ctx.save();
            ctx.translate(tip.x, tip.y);
            ctx.rotate(angle);
            ctx.fillStyle = '#97e3ff';
            ctx.globalAlpha = 0.22;
            ctx.beginPath();
            ctx.ellipse(0, 0, radius * 2.5, radius * 1.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#fff8db';
            ctx.beginPath();
            ctx.ellipse(0, 0, radius * 1.5, radius * 0.64, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-radius * 0.3, -radius * 0.25, radius, radius * 0.5);
            ctx.restore();
        },
    });
    return tip.depth < 130;
}
function impactLayers(ctx, shots, timeMs, camera, layers) {
    let active = 0;
    for (const shot of shots) {
        const age = timeMs - shot.arriveMs;
        if (age < 0 || age > 230)
            continue;
        const point = projectCircusPoint(sampleCircusShot(shot, shot.arriveMs), camera);
        if (!onScreen(point))
            continue;
        active++;
        layers.push({
            depth: point.depth - 2,
            draw: () => {
                const progress = age / 230;
                const radius = (8 + progress * (shot.index === 31 ? 62 : 30)) * point.scale;
                ctx.globalAlpha = (1 - progress) ** 2 * 0.8;
                ctx.strokeStyle = '#a6e9f2';
                ctx.lineWidth = 2 * point.scale;
                ctx.beginPath();
                ctx.ellipse(point.x, point.y, radius, radius * 0.67, shot.index * 0.7, 0, Math.PI * 2);
                ctx.stroke();
                ctx.strokeStyle = '#ffeab0';
                ctx.lineWidth = 1.5 * point.scale;
                for (let ray = 0; ray < 5; ray++) {
                    const angle = ray * Math.PI * 0.4 + shot.index * 1.7;
                    ctx.beginPath();
                    ctx.moveTo(point.x + Math.cos(angle) * radius * 0.4, point.y + Math.sin(angle) * radius * 0.4);
                    ctx.lineTo(point.x + Math.cos(angle) * radius, point.y + Math.sin(angle) * radius);
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
            },
        });
    }
    return active;
}
/** 이 시안은 별도의 추격 구도를 소유하며 기본 유성권의 좌우 무대를 다시 그리지 않는다. */
export function drawMeteorCircus(ctx, snapshot, frames, options) {
    if (!isMeteorCircus(snapshot.motion) || !options.showMovement)
        return undefined;
    const shots = snapshot.motion.ki.shots.flatMap((shot) => shot.circusFlight ? [shot.circusFlight] : []);
    const time = snapshot.elapsedMs;
    const camera = sampleCircusCamera(time);
    const target = sampleCircusTarget(time);
    const layers = [];
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, stageWidth, stageHeight);
    ctx.clip();
    drawHall(ctx, camera, layers);
    spriteLayer(ctx, frames, frameKey(snapshot.step), { x: 0, y: 0, z: 0 }, camera, layers, { worldScale: 1, feet: true });
    const latest = shots.filter((shot) => shot.arriveMs <= time).at(-1)?.arriveMs ?? -1;
    const shadow = projectCircusPoint({ x: target.x, y: -11, z: target.z }, camera);
    if (onScreen(shadow)) {
        ctx.fillStyle = '#0a101440';
        ctx.beginPath();
        ctx.ellipse(shadow.x, shadow.y, clamp(shadow.scale * 26, 4, 50), clamp(shadow.scale * 5, 1, 10), camera.roll, 0, Math.PI * 2);
        ctx.fill();
    }
    spriteLayer(ctx, frames, targetFrame(time, latest), target, camera, layers, {
        worldScale: 1.4,
        feet: false,
    });
    let foreground = 0;
    for (const shot of shots)
        if (projectileLayers(ctx, shot, time, camera, layers))
            foreground++;
    const impacts = impactLayers(ctx, shots, time, camera, layers);
    // 도입에서 광탄이 실제 주먹 위치에서 떨어지는 짧은 원인광만 보탠다.
    for (const shot of shots) {
        const age = time - shot.launchMs;
        if (age < 0 || age > 45 || time >= circusTiming.cutMs)
            continue;
        const point = projectCircusPoint(sampleCircusShot(shot, shot.launchMs), camera);
        if (!onScreen(point))
            continue;
        layers.push({
            depth: point.depth - 1,
            draw: () => {
                ctx.globalAlpha = (1 - age / 45) * 0.8;
                ctx.fillStyle = '#ffeac1';
                ctx.beginPath();
                ctx.arc(point.x, point.y, point.scale * (5 + age * 0.16), 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            },
        });
    }
    layers.sort((a, b) => b.depth - a.depth).forEach((layer) => layer.draw());
    ctx.fillStyle = '#09111bc9';
    ctx.fillRect(0, 0, stageWidth, 23);
    ctx.fillRect(0, stageHeight - 20, stageWidth, 20);
    const phase = circusScenePhases.find((phase) => time >= phase.startMs && time < phase.endMs)?.label ?? '종결';
    const hits = shots.filter((shot) => shot.arriveMs <= time).length;
    ctx.fillStyle = '#d5ebef';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`유성권 · ${phase}`, 20, 17);
    ctx.textAlign = 'right';
    ctx.fillText(`${hits} / ${shots.length}`, stageWidth - 20, 17);
    ctx.textAlign = 'left';
    if (time > circusTiming.lastHitMs + 430) {
        ctx.globalAlpha = clamp((time - circusTiming.lastHitMs - 430) / 180);
        ctx.fillStyle = '#e6f0e5';
        ctx.font = 'bold 28px serif';
        ctx.fillText('星', stageWidth - 64, stageHeight - 45);
        ctx.globalAlpha = 1;
    }
    ctx.restore();
    return {
        phase,
        hits,
        impacts,
        target,
        camera: camera.position,
        foreground,
        projectiles: shots.filter((shot) => time >= shot.launchMs && time < shot.arriveMs).length,
    };
}
