import { battleLayout, drawAtaho, drawBattle, drawBear } from './battle.js';
import { clamp, ellipse, gameStage, smooth, stage } from './drawing.js';
import { height, width, } from './types.js';
export const perspectivePunchTiming = {
    loadMs: 850,
    recoverMs: 1960,
    recoilPeakMs: 2020,
    idleMs: 2550,
    settledMs: 2800,
};
export const headFirstFallTiming = {
    turnMs: 2380,
    terminalMs: 2780,
    contactMs: 3020,
    settledMs: 3860,
};
function pose(frame, key) {
    const source = frame.assets.motionResources.get(key);
    if (!source)
        throw new Error(`기법의 원화가 없습니다: ${key}`);
    return source;
}
/** 전용 원화의 비율과 접촉 기준점을 그대로 쓰며 몸 그림을 회전·관절 변형하지 않는다. */
function drawPose(context, source, anchor, scale) {
    context.save();
    context.imageSmoothingEnabled = false;
    context.drawImage(source.image, Math.round(anchor.x - source.anchorX * scale), Math.round(anchor.y - source.feetY * scale), source.image.naturalWidth * scale, source.image.naturalHeight * scale);
    context.restore();
}
/** 보유 장전·전경 주먹·회수 세 원화를 한 컷씩 연결하는 검토용 원근 정권이다. */
export function drawPerspectivePunch(context, frame) {
    if (!frame.enhanced) {
        drawBattle(context, frame, { action: 'straight' });
        return;
    }
    const time = frame.timeMs;
    const ground = battleLayout.attacker.ground;
    const feet = { x: 630, y: ground };
    const scale = 4;
    const strike = pose(frame, 'perspective-punch:strike');
    // 같은 보유 원화의 실제 주먹 표면(11,33)을 포즈 비교에서 확인한 기준으로 재사용한다.
    const contact = {
        x: feet.x + (11 - strike.anchorX) * scale,
        y: feet.y + (33 - strike.feetY) * scale,
    };
    stage(context, frame);
    const age = Math.max(0, time - battleLayout.contactMs);
    const departure = 1 -
        (1 -
            clamp(age / (perspectivePunchTiming.recoilPeakMs - battleLayout.contactMs))) **
            3;
    const settleStartMs = perspectivePunchTiming.recoilPeakMs + 60;
    const settle = smooth((time - settleStartMs) / (perspectivePunchTiming.settledMs - settleStartMs));
    const motion = frame.reducedMotion ? 0.24 : 1;
    // 렌즈를 향하는 주먹의 화면 타점에 곰왕 오른쪽 가슴(112,84)을 맞춘다.
    drawBear(context, frame, {
        x: contact.x - (112 - 80) * battleLayout.target.scale,
        ground: contact.y + (135 - 84) * battleLayout.target.scale,
        state: time < battleLayout.contactMs || time >= perspectivePunchTiming.settledMs
            ? 'stand'
            : 'hit',
        // 왼쪽 곰왕을 주먹에서 멀어지게 밀고, 출발점으로 복귀하지 않은 채 늦게 가라앉힌다.
        recoil: {
            displacementX: -(86 * departure - 14 * settle) * motion,
            lift: Math.sin(clamp(age / 650) * Math.PI) * 24 * motion,
        },
    });
    ellipse(context, feet.x, ground + 5, 47, 9, '#14293b38');
    const source = time < perspectivePunchTiming.loadMs ||
        time >= perspectivePunchTiming.idleMs
        ? frame.assets.directional.idle['south-east']
        : time < battleLayout.contactMs
            ? pose(frame, 'perspective-punch:load')
            : time < perspectivePunchTiming.recoverMs
                ? strike
                : pose(frame, 'perspective-punch:recover');
    drawPose(context, source, feet, scale);
}
/** 배경의 투영과 원화에 같은 넓은 구도를 주며 화면 밖을 빈 캔버스로 드러내지 않는다. */
function frameFall(context, frame) {
    const { turnMs, contactMs, settledMs } = headFirstFallTiming;
    const wide = smooth((frame.timeMs - battleLayout.contactMs) /
        (turnMs - battleLayout.contactMs)) *
        (1 - smooth((frame.timeMs - contactMs) / (settledMs - contactMs)));
    const zoom = 1 - wide * (frame.reducedMotion ? 0.04 : 0.28);
    const offsetY = wide * (frame.reducedMotion ? 4 : 60);
    gameStage(context, frame, {
        camera: {
            position: { x: 0, y: 5, z: 13 },
            target: { x: 0, y: 3.15, z: 0 },
            focal: 750 * zoom,
        },
        principalY: height / 2 + offsetY,
        timeMs: 0,
    });
    context.translate(width / 2, height / 2 + offsetY);
    context.scale(zoom, zoom);
    context.translate(-width / 2, -height / 2);
}
/** 두 원화의 머리 기준·비율을 지키고 큰 낙차와 마지막 하강을 같은 구도 안에 넣는다. */
export function drawHeadFirstFall(context, frame, options = {}) {
    const time = frame.timeMs;
    if (!frame.enhanced || time < battleLayout.contactMs) {
        drawBattle(context, frame);
        return;
    }
    const { turnMs, contactMs } = headFirstFallTiming;
    const target = battleLayout.target;
    const travel = smooth((time - battleLayout.contactMs) / (contactMs - battleLayout.contactMs));
    const bodyX = target.x + travel * (frame.reducedMotion ? 15 : 42);
    const fallHeight = frame.reducedMotion ? 40 : 240;
    // 지면 효과는 낙하 중인 몸이나 높이를 따라가지 않고 최종 머리 접촉점에 고정한다.
    const impactPoint = {
        x: target.x + (frame.reducedMotion ? 15 : 42) - 22.5 * target.scale,
        y: target.ground,
    };
    context.save();
    try {
        frameFall(context, frame);
        options.impactEffects?.(context, { point: impactPoint, layer: 'back' });
        drawAtaho(context, frame, { action: 'uppercut' });
        const rising = time < turnMs;
        const descent = clamp((time - turnMs) / (contactMs - turnMs));
        const lift = rising
            ? smooth((time - battleLayout.contactMs) / (turnMs - battleLayout.contactMs)) * fallHeight
            : fallHeight * (1 - descent ** (frame.reducedMotion ? 2 : 3));
        ellipse(context, bodyX + 8, target.ground + 3, 72 - clamp(lift / fallHeight) * 32, 12 - clamp(lift / fallHeight) * 6, '#14293b38');
        if (rising) {
            drawBear(context, frame, {
                x: bodyX,
                ground: target.ground - lift,
                state: 'hit',
                recoil: { displacementX: 0, lift: 0 },
            });
            options.impactEffects?.(context, { point: impactPoint, layer: 'front' });
            return;
        }
        // 두 원화의 알파 중심은 머리 앵커보다 오른쪽 22.5px라 기립 자세의 몸 중심과 맞춘다.
        const headX = bodyX - 22.5 * target.scale;
        drawPose(context, pose(frame, time >= contactMs ? 'bear-fall:head-impact' : 'bear-fall:head-first'), { x: headX, y: target.ground - lift }, target.scale);
        if (options.impactEffects) {
            options.impactEffects(context, { point: impactPoint, layer: 'front' });
            return;
        }
    }
    finally {
        context.restore();
    }
}
