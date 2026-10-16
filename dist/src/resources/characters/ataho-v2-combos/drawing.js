import { finisherContactPhase } from './finisher-actors.js';
import { frameKey } from './source-frames.js';
import { drawMotionEffects } from './effects-drawing.js';
import { drawPoseWithParts } from './parts-drawing.js';
import { sampleSandbag } from './sandbag.js';
import { drawSandbag } from './sandbag-drawing.js';
import { drawImpacts, sampleImpacts } from './impact-effects.js';
import { hasInkEffects, sampleInkEffects } from './ink-effects.js';
import { drawInkEffects } from './ink-drawing.js';
import { sampleCameraRecoil } from './camera-effects.js';
import { sampleCameraStaging, } from './camera-staging.js';
import { composeCameraView } from './camera-framing.js';
import { groundShadow, sampleGroundEffects } from './ground-effects.js';
import { drawGroundEffects } from './ground-drawing.js';
import { sampleEmphasis } from './emphasis-effects.js';
import { drawSpeedLines, sampleSpeedLines } from './speed-lines.js';
import { drawKiBackdrop, drawKiForeground, drawKiOverlay, } from './ki-drawing.js';
import { collectSandbagContacts } from './sandbag.js';
import { drawFinisherBackdrop, drawFinisherPaths, drawFinisherActors, drawFinisherEchoes, drawFinisherOverlay, drawFinisherStrikes, sampleFinisher, } from './finisher-presentation.js';
import { drawPose, posePosition, poseWithDrawing, stageWidth, stageHeight, groundY, } from './pose-drawing.js';
export { stageWidth, stageHeight } from './pose-drawing.js';
function drawDojo(ctx, view) {
    const left = Math.floor(Math.min(-12, view.visibleBounds.left)) - 2;
    const top = Math.floor(Math.min(-12, view.visibleBounds.top)) - 2;
    const right = Math.ceil(Math.max(stageWidth + 12, view.visibleBounds.right)) + 2;
    const bottom = Math.ceil(Math.max(stageHeight + 12, view.visibleBounds.bottom)) + 2;
    ctx.fillStyle = '#efdfbf';
    // 축소 구도의 역변환 범위까지 채워도 기둥·창문·바닥의 월드 위치는 유지한다.
    ctx.fillRect(left, top, right - left, bottom - top);
    ctx.fillStyle = '#e6cfa7';
    ctx.fillRect(left, 42, right - left, groundY - 42);
    ctx.fillStyle = '#7c5844';
    for (const x of [42, 435, 830])
        ctx.fillRect(x, top, 13, groundY - top);
    ctx.fillRect(left, 25, right - left, 14);
    ctx.fillStyle = '#f7eacb';
    ctx.fillRect(96, 68, 295, 131);
    ctx.fillRect(487, 68, 295, 131);
    ctx.strokeStyle = '#d5b98b';
    ctx.lineWidth = 3;
    for (const x of [170, 245, 320, 560, 635, 710]) {
        ctx.beginPath();
        ctx.moveTo(x, 68);
        ctx.lineTo(x, 199);
        ctx.stroke();
    }
    ctx.fillStyle = '#b88961';
    ctx.fillRect(left, groundY, right - left, bottom - groundY);
    ctx.strokeStyle = '#946e50';
    ctx.lineWidth = 2;
    for (const y of [groundY + 2, 352, 383]) {
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(right, y);
        ctx.stroke();
    }
}
export function drawCombo(ctx, snapshot, frames, options) {
    const finisher = sampleFinisher(snapshot, options);
    const kiOptions = snapshot.motion.ki
        ? { ...options, contacts: collectSandbagContacts(snapshot.motion, options) }
        : options;
    const inkEnabled = options.showMovement &&
        !!options.showInkEffects &&
        hasInkEffects(snapshot.motion);
    const impacts = options.showMovement &&
        ((!inkEnabled && options.showContacts) || options.showCameraRecoil)
        ? sampleImpacts(snapshot, options)
        : [];
    const ink = inkEnabled ? sampleInkEffects(snapshot, frames, options) : [];
    const camera = options.showMovement && options.showSandbag && options.showCameraRecoil
        ? sampleCameraRecoil(snapshot, impacts, options)
        : { x: 0, y: 0 };
    const staging = sampleCameraStaging(snapshot, {
        ...options,
        mode: options.showMovement ? (options.cameraMode ?? 'none') : 'none',
    });
    const view = composeCameraView(snapshot, frames, {
        ...options,
        staging,
        recoil: camera,
    });
    const ground = options.showMovement && options.showGroundEffects
        ? sampleGroundEffects(snapshot, frames, options)
        : [];
    const emphasis = sampleEmphasis(snapshot, {
        ...options,
        mode: options.showMovement ? (options.emphasisMode ?? 'none') : 'none',
    });
    const backgroundDim = Math.max(emphasis.backgroundDim, finisher?.backgroundDim ?? 0);
    const speedLines = options.showMovement && options.showSpeedLines
        ? sampleSpeedLines(snapshot, options)
        : [];
    const state = {
        impactCount: inkEnabled
            ? ink.filter((sample) => sample.phase === 'impact').length
            : options.showContacts
                ? impacts.length
                : 0,
        inkCount: ink.length,
        groundCount: ground.length,
        cameraX: view.translateX,
        cameraY: view.translateY,
        cameraZoom: view.zoom,
        backgroundDim,
        palette: emphasis.palette,
        emphasisPhase: emphasis.phase,
        speedLineCount: speedLines.length,
        finisherBeat: finisher?.beat.label ?? '',
        finisherHits: finisher?.hitCount ?? 0,
    };
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, stageWidth, stageHeight);
    ctx.clip();
    ctx.translate(view.translateX, view.translateY);
    ctx.scale(view.zoom, view.zoom);
    drawDojo(ctx, view);
    if (backgroundDim > 0) {
        ctx.save();
        ctx.globalAlpha = backgroundDim;
        ctx.fillStyle = '#242331';
        const bounds = view.visibleBounds;
        ctx.fillRect(bounds.left - 2, bounds.top - 2, bounds.right - bounds.left + 4, bounds.bottom - bounds.top + 4);
        ctx.restore();
    }
    if (finisher)
        drawFinisherBackdrop(ctx, snapshot, finisher, options);
    drawKiBackdrop(ctx, snapshot, frames, kiOptions);
    const pose = options.showMovement
        ? poseWithDrawing(snapshot, options.enabledEffects)
        : snapshot;
    const replacement = pose !== snapshot;
    const originalSource = frames.get(frameKey(pose.step));
    const source = originalSource && emphasis.palette && originalSource.emphasisImage
        ? { ...originalSource, image: originalSource.emphasisImage }
        : originalSource;
    if (source) {
        const position = posePosition(pose, source, options);
        const bounds = source.bounds;
        drawSpeedLines(ctx, speedLines, {
            exclusion: {
                left: position.left + (bounds?.left ?? 0) * options.scale - 8,
                top: position.top + (bounds?.top ?? 0) * options.scale - 8,
                right: position.left +
                    (bounds?.right ?? source.image.naturalWidth) * options.scale +
                    8,
                bottom: position.top +
                    (bounds?.bottom ?? source.image.naturalHeight) * options.scale +
                    8,
            },
        });
    }
    if (options.showMovement && options.showSandbag) {
        const target = sampleSandbag(snapshot, {
            scale: options.scale,
            enabledEffects: options.enabledEffects,
        });
        if (target) {
            ctx.save();
            ctx.globalAlpha = finisher?.actorOpacity ?? 1;
            drawSandbag(ctx, target);
            ctx.restore();
        }
    }
    if (!source) {
        ctx.restore();
        return state;
    }
    const scale = options.scale;
    const moving = options.showMovement;
    const { x } = posePosition(pose, source, options);
    ctx.save();
    ctx.globalAlpha = snapshot.opacity;
    const airborne = moving ? Math.max(0, -snapshot.y) : 0;
    const shadow = moving && options.showGroundEffects
        ? groundShadow(snapshot)
        : { opacity: 1, widthScale: 1, heightScale: 1 };
    ctx.save();
    ctx.globalAlpha *= shadow.opacity;
    ctx.fillStyle = '#59413230';
    ctx.beginPath();
    ctx.ellipse(x, groundY + 3, Math.max(16, 34 - airborne * 0.4) * shadow.widthScale, 7 * shadow.heightScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawGroundEffects(ctx, ground, options);
    if (finisher)
        drawFinisherPaths(ctx, snapshot, finisher, frames, options);
    if (finisher)
        drawFinisherEchoes(ctx, snapshot, finisher, frames, options);
    if (snapshot.motion.finisher && options.showMovement)
        drawFinisherActors(ctx, snapshot, frames, {
            ...options,
            palette: emphasis.palette,
        });
    const motionEffectOptions = { ...options, suppressTrails: inkEnabled };
    drawMotionEffects(ctx, snapshot, frames, {
        ...motionEffectOptions,
        layer: 'back',
    });
    drawInkEffects(ctx, ink, frames, { layer: 'back' });
    ctx.save();
    ctx.globalAlpha *= finisher?.actorOpacity ?? 1;
    if (replacement)
        drawPose(ctx, pose, source, options);
    else
        drawPoseWithParts(ctx, snapshot, source, options);
    ctx.restore();
    drawMotionEffects(ctx, snapshot, frames, {
        ...motionEffectOptions,
        layer: 'front',
    });
    drawInkEffects(ctx, ink, frames, { layer: 'front' });
    if (options.showMovement && options.showContacts && !inkEnabled)
        drawImpacts(ctx, impacts.filter((impact) => !impact.contact.actorId.startsWith('ki:')), {
            scale,
            directional: !!options.directionalImpacts,
        });
    if (finisher && options.showContacts)
        drawFinisherStrikes(ctx, snapshot, finisher, options);
    drawKiForeground(ctx, snapshot, frames, kiOptions);
    drawKiOverlay(ctx, snapshot, frames, kiOptions);
    ctx.restore();
    ctx.restore();
    if (finisher)
        drawFinisherOverlay(ctx, snapshot, finisher);
    ctx.fillStyle = finisher || backgroundDim > 0.4 ? '#f6e8c9' : '#614630';
    ctx.font = '15px sans-serif';
    ctx.fillText(snapshot.waiting
        ? '한 동작 완료'
        : ((options.showMovement
            ? finisherContactPhase(snapshot.motion, snapshot.elapsedMs)
            : undefined) ?? snapshot.step.phase), 28, 391);
    return state;
}
