import { drawBear, drawHero } from './cast.js';
import { clamp, ease, gameBackground, line, smearBackground, } from './drawing.js';
import { gameDust, gameImpact } from '../../cutscenes/game-effects.js';
export const synergyLayout = {
    ground: 585,
    heroScale: 4.2,
    bearScale: 3,
    bearX: 780,
    bearContactOffset: 90,
};
export const segment = (time, start, duration) => clamp((time - start) / duration);
function spriteHeight(sprite) {
    return ((sprite.bounds?.bottom ?? sprite.image.naturalHeight) -
        (sprite.bounds?.top ?? 0));
}
/** 기존 남동 원화의 픽셀 배율과 발 앵커를 고정해 자세별 여백으로 몸 크기가 변하지 않게 한다. */
export function synergyHero(context, assets, pose) {
    const sequence = assets.hero[pose.action]['south-east'];
    const index = Math.max(0, Math.min(sequence.length - 1, pose.index));
    drawHero(context, assets, {
        ...pose,
        y: pose.y ?? synergyLayout.ground,
        height: spriteHeight(sequence[index]) * synergyLayout.heroScale,
        phase: (index + 0.5) / sequence.length,
        filter: pose.filter ?? context.filter,
    });
}
export function synergyBear(context, frame, options = {}) {
    const state = options.state ?? 'stand';
    const sequence = frame.assets.bear[state];
    drawBear(context, frame.assets, {
        x: options.x ?? synergyLayout.bearX,
        y: options.y ?? synergyLayout.ground,
        state,
        phase: options.index === undefined
            ? frame.time * 0.7
            : (options.index + 0.5) / sequence.length,
        height: sequence[0].image.naturalHeight * synergyLayout.bearScale,
        filter: options.filter ?? context.filter,
        rotation: options.rotation,
    });
}
export function strikePoint(assets, options = {}) {
    const handFrame = options.handFrame ?? 12;
    const sprite = assets.hero.punch['south-east'][handFrame];
    return {
        x: (options.targetX ?? synergyLayout.bearX) -
            synergyLayout.bearContactOffset,
        y: synergyLayout.ground +
            ((handFrame === 2 ? 46 : 48) - sprite.feetY) * synergyLayout.heroScale,
    };
}
export function strikeRootX(assets, options = {}) {
    const handFrame = options.handFrame ?? 12;
    const sprite = assets.hero.punch['south-east'][handFrame];
    return (strikePoint(assets, options).x -
        ((handFrame === 2 ? 80 : 72) - sprite.anchorX) * synergyLayout.heroScale);
}
export function synergyBackdrop(context, frame, options = {}) {
    smearBackground(context, frame.surfaces, (background) => gameBackground(background, frame, options.time ?? frame.time), options.blur ?? 0);
}
export function synergyShadow(context, point, radius, alpha = 1) {
    context.save();
    context.globalAlpha *= alpha * 0.24;
    context.fillStyle = '#071717';
    context.beginPath();
    context.ellipse(point.x, point.y + 3, radius, 12, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
}
/** 접촉 위치와 시각을 받아 기존 압축핵을 한 번만 재생한다. */
export function synergyImpact(context, frame, options) {
    gameImpact(context, frame.assets.effects, {
        ...options.point,
        size: options.size ?? 250,
        progress: (frame.time - options.contact) / (options.duration ?? 0.19),
    });
}
export function synergyDust(context, frame, options) {
    gameDust(context, frame.assets.effects, {
        x: options.x,
        y: synergyLayout.ground,
        size: options.size ?? 240,
        progress: (frame.time - options.contact) / (options.duration ?? 0.25),
    });
}
/** 충격 코마는 배경과 배우의 명암을 함께 바꾸고 접점만 밝게 남긴다. */
export function synergyShock(context, options) {
    const age = options.time - options.contact;
    const duration = options.style === 'shock' ? 2 / 24 : 1 / 24;
    if (age < 0 || age >= duration)
        return false;
    const second = age >= 1 / 24;
    context.save();
    context.fillStyle = second ? '#ff2960' : '#0b0a12';
    context.fillRect(-160, -120, 1600, 960);
    context.filter = second ? 'brightness(0)' : 'brightness(0) invert(1)';
    options.drawActors(context);
    context.filter = 'none';
    for (let index = 0; index < 15; index++) {
        const angle = (index / 15) * Math.PI * 2;
        const outer = index % 2 ? 160 : 260;
        line(context, [
            [
                options.point.x + Math.cos(angle) * 24,
                options.point.y + Math.sin(angle) * 24,
            ],
            [
                options.point.x + Math.cos(angle) * outer,
                options.point.y + Math.sin(angle) * outer * 0.7,
            ],
        ], second ? '#fff5cd' : '#b5edf1', index % 3 ? 3 : 6);
    }
    context.fillStyle = '#fffce8';
    context.beginPath();
    context.ellipse(options.point.x, options.point.y, 12, 30, -0.3, 0, Math.PI * 2);
    context.fill();
    context.restore();
    return true;
}
export function directionalKick(age, strength, duration = 0.14) {
    return age >= 0 && age < duration
        ? -strength * (1 - ease(age / duration))
        : 0;
}
