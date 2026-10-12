import { strikeFrame } from '../../resources/characters/ataho/motion-frame.js';
import { straightPunchFrames, pushKickFrames, turnKickFrames, } from '../../resources/characters/ataho/combat-frames.js';
import { cardinalFacing } from '../../resources/characters/ataho/facing.js';
export function driveAdvance(action) {
    // 타격점까지 전진한 뒤 발을 고정한다. 다음 공격은 이 위치에서 이어진다.
    return Math.pow(Math.min(1, action.elapsed / action.contactTime), 3);
}
export function drivePose(action, facing) {
    facing = cardinalFacing(facing);
    const contact = action.contactTime;
    const time = action.elapsed;
    const windup = Math.min(0.999, time / contact);
    const recovery = Math.max(0, (time - contact) / (action.duration - contact));
    const contactHoldRatio = 0.58;
    const striking = time >= contact && recovery < contactHoldRatio;
    const mirror = facing === 'left';
    if (action.driveFinisher === 'sweep')
        return {
            animation: 'turn-kick',
            frame: strikeFrame(turnKickFrames, {
                time,
                contactAt: contact,
                recoverAt: contact + (action.duration - contact) * contactHoldRatio,
                endAt: action.duration,
            }),
            mirror,
        };
    if (action.driveFinisher === 'push')
        return {
            animation: 'battle-kick',
            frame: strikeFrame(pushKickFrames, {
                time,
                contactAt: contact,
                recoverAt: contact + (action.duration - contact) * contactHoldRatio,
                endAt: action.duration,
            }),
            mirror,
        };
    // 가드에서 한 번 뻗고 같은 가드로 돌아와 빠른 연타도 자세가 끊기지 않는다.
    if (time < contact) {
        const index = Math.min(straightPunchFrames.windup.length - 1, Math.floor(windup * straightPunchFrames.windup.length));
        return {
            animation: 'straight-punch',
            frame: straightPunchFrames.windup[index],
            mirror,
        };
    }
    const index = Math.min(straightPunchFrames.recovery.length - 1, Math.max(0, Math.floor(((recovery - contactHoldRatio) / (1 - contactHoldRatio)) *
        straightPunchFrames.recovery.length)));
    return {
        animation: 'straight-punch',
        frame: striking
            ? straightPunchFrames.contact
            : straightPunchFrames.recovery[index],
        mirror,
    };
}
