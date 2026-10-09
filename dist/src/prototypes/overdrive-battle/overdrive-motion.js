export function driveAdvance(action) {
    // 타격점까지 전진한 뒤 발을 고정한다. 다음 공격은 이 위치에서 이어진다.
    return Math.pow(Math.min(1, action.elapsed / action.contactTime), 3);
}
export function drivePose(action, facing) {
    const contact = action.contactTime;
    const time = action.elapsed;
    const windup = Math.min(0.999, time / contact);
    const recovery = Math.max(0, (time - contact) / (action.duration - contact));
    const striking = time >= contact && recovery < 0.58;
    const beat = ((action.driveBeat ?? 1) - 1) % 4;
    const mirror = facing === 'left';
    if (action.driveFinisher === 'sweep' || facing === 'back')
        return {
            animation: 'turn-kick',
            frame: time < contact ? (windup < 0.55 ? 0 : 1) : striking ? 2 : 3,
            mirror,
        };
    if (action.driveFinisher === 'push' || beat === 2)
        return {
            animation: 'battle-kick',
            frame: striking ? 1 : 0,
            mirror,
        };
    if (facing === 'front')
        return { animation: 'attack1', frame: striking ? 1 : 0, mirror: false };
    if (action.driveFinisher === 'pierce')
        return {
            animation: 'tiger-fist',
            frame: time < contact ? Math.min(3, Math.floor(windup * 4)) : striking ? 4 : 5,
            mirror,
        };
    return {
        animation: 'tiger-fist',
        frame: time < contact ? (beat === 0 ? 0 : 3) : striking ? 4 : 5,
        mirror,
    };
}
