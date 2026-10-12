export function sequenceFrame(frames, progress) {
    return frames[Math.min(frames.length - 1, Math.floor(Math.max(0, progress) * frames.length))];
}
/** 타격 시각까지 준비를 진행하고, 접촉 유지 뒤 회수와 원래 자세로 복귀한다. */
export function strikeFrame(frames, timing) {
    const { time, contactAt, recoverAt, endAt } = timing;
    const windupAt = timing.windupAt ?? 0;
    if (time < contactAt)
        return sequenceFrame(frames.windup, (time - windupAt) / (contactAt - windupAt));
    if (time < recoverAt)
        return frames.contact;
    return sequenceFrame(frames.recovery, (time - recoverAt) / (endAt - recoverAt));
}
