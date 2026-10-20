import { drawBear } from './battle.js';
import { ellipse, gameStage, label, mix, smooth } from './drawing.js';
import { width } from './types.js';
const directions = [
    'south',
    'south-east',
    'east',
    'north-east',
    'north',
    'north-west',
    'west',
    'south-west',
];
const focalLength = 560;
const horizonY = 185;
const cameraRadius = 8;
const cameraHeight = 3.8;
function directionAt(angle) {
    return directions[((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8];
}
function attackDirection(frame, direction) {
    const source = frame.assets.directional.uppercut[direction];
    if (source)
        return source;
    const wanted = directions.indexOf(direction);
    const available = directions.filter((key) => frame.assets.directional.uppercut[key]);
    const nearest = available.reduce((best, key) => {
        const difference = Math.abs(directions.indexOf(key) - wanted);
        const distance = Math.min(difference, 8 - difference);
        const previous = Math.abs(directions.indexOf(best) - wanted);
        return distance < Math.min(previous, 8 - previous) ? key : best;
    }, available[0]);
    return frame.assets.directional.uppercut[nearest];
}
/** 기립은 여덟 실제 방향, 공격은 보유한 다섯 방향 중 가장 가까운 원본을 사용한다. */
function ataho(ctx, frame, angle, position) {
    const cameraX = cameraRadius * Math.sin(angle);
    const cameraZ = -cameraRadius * Math.cos(angle);
    // 기존 투영의 좌우축을 게임 월드의 x 반대축으로 대응한다.
    const view = Math.atan2(cameraX - 0.9, cameraZ);
    const direction = directionAt(-Math.PI / 2 - view);
    const time = frame.timeMs;
    const attacking = time >= 1000 && time < 2800;
    let sprite;
    if (attacking) {
        const sequence = attackDirection(frame, direction);
        const index = time < 1800
            ? Math.min(2, Math.floor(((time - 1000) / 800) * 3))
            : time < 1960
                ? 3
                : Math.min(6, 4 + Math.floor(((time - 1960) / 840) * 3));
        sprite = sequence[index];
    }
    else
        sprite = frame.assets.directional.idle[direction];
    const scale = (3.4 * cameraRadius) / position.depth;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sprite.image, position.x - sprite.anchorX * scale, position.y - sprite.feetY * scale, sprite.image.naturalWidth * scale, sprite.image.naturalHeight * scale);
    ctx.restore();
}
/** 같은 카메라로 인게임 숲 공터와 두 배우를 투영하고 깊이 순서로 합성한다. */
export function drawEditingOrbit(ctx, frame) {
    const progress = frame.enhanced ? smooth((frame.timeMs - 450) / 2900) : 0;
    const shown = frame.enhanced && frame.reducedMotion
        ? frame.timeMs < 2000
            ? 0
            : 1
        : progress;
    const angle = mix(0.1, 2.55, shown);
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const project = (point) => {
        const depth = Math.max(1, cameraRadius + point.x * sine + point.z * cosine);
        const scale = focalLength / depth;
        return {
            x: width / 2 + (point.x * cosine - point.z * sine) * scale,
            y: horizonY + (cameraHeight - point.y) * scale,
            scale,
            depth,
        };
    };
    const options = {
        camera: {
            position: {
                x: cameraRadius * sine,
                y: cameraHeight,
                z: -cameraRadius * cosine,
            },
            target: { x: 0, y: cameraHeight, z: 0 },
            focal: focalLength,
        },
        principalY: horizonY,
        focus: { x: 0, y: 0, z: 0 },
    };
    gameStage(ctx, frame, options);
    const objects = [];
    for (const [x, z, who] of [
        [-0.9, 0, 'ataho'],
        [1.15, 0.25, 'bear'],
    ]) {
        const base = project({ x, y: 0, z });
        ellipse(ctx, base.x, base.y + 4, base.scale * (who === 'ataho' ? 0.7 : 1.2), base.scale * 0.13, '#213b4c50');
        objects.push({
            depth: base.depth,
            draw: () => {
                if (who === 'ataho')
                    ataho(ctx, frame, angle, base);
                else
                    drawBear(ctx, frame, {
                        x: base.x,
                        ground: base.y,
                        scale: (2.6 * cameraRadius) / base.depth,
                    });
            },
        });
    }
    for (const object of objects.sort((a, b) => b.depth - a.depth))
        object.draw();
    gameStage(ctx, frame, { ...options, layer: 'foreground' });
    label(ctx, '게임 공터의 공간 회전 · 아타호 기립 8방향 / 공격 5방향 원본');
    label(ctx, '곰왕은 기존 한 시점의 판 · 없는 후면은 생성하거나 왜곡하지 않음', 40, 518);
}
