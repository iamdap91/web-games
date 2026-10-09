import { clearing } from './clearing-rules.js';
function attackPose(facing, phase) {
    const { time, windupEnd, recovery, extension } = phase;
    if (facing === 'back') {
        // 회전 순서를 유지하되 다리가 뻗는 세 번째 포즈에서 판정과 함께 멈춘다.
        const frameIndex = time < windupEnd
            ? 0
            : time < clearing.impactTime
                ? 1
                : recovery < 0.32
                    ? 2
                    : recovery < 0.68
                        ? 3
                        : 0;
        return { motion: 'turn-kick', frameIndex };
    }
    if (facing === 'front') {
        if (time < clearing.impactTime || recovery >= 0.8)
            return { motion: 'battle-ready', frameIndex: 0 };
        return { motion: 'sweep-kick', frameIndex: recovery < 0.4 ? 0 : 1 };
    }
    return extension > 0.45
        ? { motion: 'tiger-fist', frameIndex: 4 }
        : { motion: 'battle-ready', frameIndex: 0 };
}
/** 준비·전진·접촉·복귀를 실제 타격 시각에 맞춘다. */
export function workMotion(progress, facing) {
    const time = Math.max(0, Math.min(progress, 1)) * clearing.swingDuration;
    const windupEnd = clearing.impactTime * 0.6;
    const striking = time >= windupEnd && time <= clearing.impactTime;
    const recovery = Math.max(0, (time - clearing.impactTime) /
        (clearing.swingDuration - clearing.impactTime));
    const extension = time < windupEnd
        ? 0
        : striking
            ? Math.pow((time - windupEnd) / (clearing.impactTime - windupEnd), 2)
            : Math.max(0, 1 - recovery * 1.8);
    return {
        pose: attackPose(facing, { time, windupEnd, recovery, extension }),
        mirror: facing === 'left',
        extension,
        coil: time < windupEnd ? Math.sin((time / windupEnd) * Math.PI) : 0,
    };
}
