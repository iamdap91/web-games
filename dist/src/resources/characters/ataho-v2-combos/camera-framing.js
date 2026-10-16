import { motionActors } from './finisher-actors.js';
import { comboDuration, sampleComboMotion, } from './player.js';
import { groundY, posePosition, poseWithDrawing, stageHeight, stageWidth, } from './pose-drawing.js';
import { sampleSandbag, sampleSandbagReaction, sandbagBodyTransform, } from './sandbag.js';
import { frameKey } from './source-frames.js';
// 머리·발의 여백10px와 기존 강타 반동의 최대6px를 화면 좌표로 확보한다.
const safeMargin = 16;
const maximumZoom = 1.08;
function union(a, b) {
    if (!a)
        return b;
    return {
        left: Math.min(a.left, b.left),
        top: Math.min(a.top, b.top),
        right: Math.max(a.right, b.right),
        bottom: Math.max(a.bottom, b.bottom),
    };
}
function expanded(bounds, margin) {
    return {
        left: bounds.left - margin,
        top: bounds.top - margin,
        right: bounds.right + margin,
        bottom: bounds.bottom + margin,
    };
}
function poseBounds(original, frames, options) {
    const pose = poseWithDrawing(original, options.enabledEffects);
    const source = frames.get(frameKey(pose.step));
    if (!source)
        return undefined;
    // 이전 GIF 렌더러가 bounds 없이 만든 SourceFrame도 캔버스 전체로 보호한다.
    const bounds = source.bounds ?? {
        left: 0,
        top: 0,
        right: source.image.naturalWidth || source.image.width,
        bottom: source.image.naturalHeight || source.image.height,
    };
    const position = posePosition(pose, source, {
        scale: options.scale,
        showMovement: true,
    });
    return union({
        left: position.left + bounds.left * options.scale,
        top: position.top + bounds.top * options.scale,
        right: position.left + bounds.right * options.scale,
        bottom: position.top + bounds.bottom * options.scale,
    }, {
        left: position.x - 36,
        top: groundY - 4,
        right: position.x + 36,
        bottom: groundY + 14,
    });
}
function motionBounds(snapshot, frames, options) {
    let bounds;
    for (const actor of motionActors(snapshot.motion)) {
        let timeMs = 0;
        const motion = {
            ...snapshot.motion,
            steps: actor.steps,
            finisher: undefined,
        };
        for (const [index, step] of actor.steps.entries()) {
            const start = {
                ...sampleComboMotion(motion, timeMs),
                step,
                stepIndex: index,
                stepElapsedMs: 0,
                x: step.x,
                y: step.y ?? 0,
            };
            const next = actor.steps[index + 1] ?? step;
            // 보간은 각 축에서 단조이므로 현재 그림의 양 끝 위치를 모두 담으면 충분하다.
            // 끝 시각에 다음 그림으로 바뀌기 전의 현재 그림도 포함한다.
            const end = {
                ...start,
                elapsedMs: timeMs + step.durationMs,
                stepElapsedMs: step.durationMs,
                x: next.x,
                y: next.y ?? 0,
            };
            for (const pose of [start, end]) {
                const current = poseBounds(pose, frames, options);
                if (current)
                    bounds = union(bounds, current);
            }
            timeMs += step.durationMs;
        }
    }
    return bounds;
}
function bagBounds(state) {
    const transform = sandbagBodyTransform(state);
    const halfWidth = (state.width + state.scale) * 0.5;
    const halfStroke = state.scale * 0.5;
    let bounds;
    for (const x of [-halfWidth, halfWidth]) {
        for (const y of [-halfStroke, state.height + halfStroke]) {
            const worldX = transform.a * x + transform.c * y + transform.e;
            const worldY = transform.b * x + transform.d * y + transform.f;
            bounds = union(bounds, {
                left: worldX,
                top: worldY,
                right: worldX,
                bottom: worldY,
            });
        }
    }
    // 줄은 지지점과 몸통 상단 사이에 있으며, 지지봉과 바닥 그림자도 함께 담는다.
    const shadowX = transform.c * state.height + transform.e;
    return union(bounds, {
        left: Math.min(state.anchorX - state.width * 0.65 - 2, shadowX - state.width * 0.65),
        top: state.anchorY - 6,
        right: Math.max(state.anchorX + state.width * 0.65 + 2, shadowX + state.width * 0.65),
        bottom: groundY + 12,
    });
}
function sandbagMotionBounds(snapshot, options) {
    if (!options.showSandbag)
        return undefined;
    const target = sampleSandbag({
        ...sampleComboMotion(snapshot.motion, 0),
        paused: true,
        waiting: false,
        opacity: 1,
    }, options);
    if (!target)
        return undefined;
    const durationMs = comboDuration(snapshot.motion);
    const times = new Set([0, durationMs]);
    for (let timeMs = 16; timeMs < durationMs; timeMs += 16)
        times.add(timeMs);
    for (const contact of target.contacts) {
        for (const offset of [-1, 0, 1, 150, 620])
            times.add(Math.max(0, Math.min(durationMs, contact.timeMs + offset)));
    }
    let bounds;
    for (const timeMs of times) {
        const reaction = sampleSandbagReaction(target.contacts, timeMs, durationMs, options);
        bounds = union(bounds, bagBounds({ ...target, ...reaction }));
    }
    // 16ms 사이의 작은 극값에도 여백을 남기며 현재 반동으로 범위를 바꾸지 않는다.
    return bounds ? expanded(bounds, 2) : undefined;
}
function view(zoom, translateX, translateY) {
    return {
        zoom,
        translateX,
        translateY,
        visibleBounds: {
            left: -translateX / zoom,
            top: -translateY / zoom,
            right: (stageWidth - translateX) / zoom,
            bottom: (stageHeight - translateY) / zoom,
        },
    };
}
function fitTranslation(desired, bounds, viewport, zoom) {
    const minimum = safeMargin - bounds.start * zoom;
    const maximum = viewport - safeMargin - bounds.end * zoom;
    return Math.max(minimum, Math.min(desired, maximum));
}
function fitTrackingOffset(desired, bounds, viewport) {
    // 구형 자료의 투명 여백이 이미 화면 밖이어도 추적 진입 때 기본 위치를 옮기지 않는다.
    const minimum = Math.min(0, safeMargin - bounds.start);
    const maximum = Math.max(0, viewport - safeMargin - bounds.end);
    return Math.max(minimum, Math.min(desired, maximum));
}
/** 동작 전체의 고정 범위를 사용해 자세·반동에 따라 구도를 다시 잡지 않는다. */
export function composeCameraView(snapshot, frames, options) {
    const { staging, recoil } = options;
    const offsetX = staging.offsetX ?? 0;
    const offsetY = staging.offsetY ?? 0;
    const unitZoom = Math.abs(staging.zoom - 1) < 0.000001;
    if (!staging.active ||
        (unitZoom && Math.abs(offsetX) + Math.abs(offsetY) < 0.000001))
        return view(1, recoil.x, recoil.y);
    let bounds = motionBounds(snapshot, frames, options);
    const bag = sandbagMotionBounds(snapshot, options);
    if (bag)
        bounds = union(bounds, bag);
    if (!bounds)
        return view(1, recoil.x, recoil.y);
    if (unitZoom)
        return view(1, fitTrackingOffset(offsetX, { start: bounds.left, end: bounds.right }, stageWidth) + recoil.x, fitTrackingOffset(offsetY, { start: bounds.top, end: bounds.bottom }, stageHeight) + recoil.y);
    const maximumFit = Math.min(maximumZoom, (stageWidth - safeMargin * 2) / Math.max(1, bounds.right - bounds.left), (stageHeight - safeMargin * 2) / Math.max(1, bounds.bottom - bounds.top));
    // 경계 정보가 없는 예전 렌더 자료에서도 확대 요청을 축소로 뒤집지 않는다.
    if (staging.zoom > 1 && maximumFit <= 1)
        return view(1, recoil.x, recoil.y);
    const zoom = Math.min(staging.zoom, maximumFit);
    const translateX = fitTranslation(staging.focusX * (1 - zoom) + offsetX, { start: bounds.left, end: bounds.right }, stageWidth, zoom);
    const translateY = fitTranslation(staging.focusY * (1 - zoom) + offsetY, { start: bounds.top, end: bounds.bottom }, stageHeight, zoom);
    return view(zoom, translateX + recoil.x, translateY + recoil.y);
}
