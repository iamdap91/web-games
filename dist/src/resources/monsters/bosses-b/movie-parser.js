function record(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function readFrame(value) {
    if (!record(value) ||
        typeof value.width !== 'number' ||
        value.width <= 0 ||
        typeof value.height !== 'number' ||
        value.height <= 0 ||
        typeof value.localPath !== 'string' ||
        !record(value.pivot) ||
        typeof value.pivot.x !== 'number' ||
        typeof value.pivot.y !== 'number' ||
        typeof value.durationSeconds !== 'number' ||
        value.durationSeconds <= 0)
        throw new Error('모션 프레임의 크기·발 기준·시간이 올바르지 않습니다.');
    return {
        width: value.width,
        height: value.height,
        localPath: value.localPath,
        pivot: { x: value.pivot.x, y: value.pivot.y },
        durationSeconds: value.durationSeconds,
    };
}
export function readMovies(value) {
    if (!record(value) || !Array.isArray(value.assets))
        throw new Error('리소스 목록을 읽을 수 없습니다.');
    const movies = [];
    const required = ['stand', 'move', 'attack1', 'hit1', 'die1'];
    for (const entry of value.assets) {
        if (!record(entry) ||
            typeof entry.id !== 'string' ||
            typeof entry.name !== 'string' ||
            !record(entry.animations))
            throw new Error('리소스 정보가 올바르지 않습니다.');
        // 정지 원본을 대기 모션처럼 표시하지 않고, 실제 다섯 동작이 조립된 개체만 재생한다.
        if (!required.every((key) => record(entry.animations) && record(entry.animations[key])))
            continue;
        const animations = new Map();
        for (const [key, animation] of Object.entries(entry.animations)) {
            if (!record(animation) ||
                !Array.isArray(animation.frames) ||
                !animation.frames.length)
                throw new Error(`${entry.name}의 ${key} 프레임이 없습니다.`);
            animations.set(key, {
                frames: animation.frames.map(readFrame),
                loop: animation.loop === true,
                label: typeof animation.label === 'string' ? animation.label : key,
                group: typeof animation.group === 'string' ? animation.group : '기본5모션',
                notes: typeof animation.notes === 'string' ? animation.notes : '',
            });
        }
        movies.push({ id: entry.id, name: entry.name, animations });
    }
    return movies;
}
