import { anomalyDetails } from './anomalies.js';
import { pipes, pipeFall } from './pipe-cascade.js';
function formatPipes(elapsed) {
    if (elapsed === null)
        return '대기';
    const fallen = pipes.filter((pipe) => pipeFall(elapsed, pipe.delay) === 1).length;
    const falling = pipes.filter((pipe) => pipe.delay !== null).length;
    return `낙하 ${fallen}/${falling}`;
}
export function formatDiagnostics(state) {
    return [
        `방: ${state.progress}`,
        `현재: ${state.scenario === 'normal' ? '정상' : anomalyDetails[state.scenario].title}`,
        `위치: ${Math.round(state.player.x)}, ${Math.round(state.player.y)}`,
        `플래시점프: ${state.player.flashAvailable ? '가능' : '사용함'}`,
        `연출: ${state.anomaly.activeElapsed === null ? '대기' : state.anomaly.activeElapsed.toFixed(1)}`,
        `배관: ${formatPipes(state.pipeElapsed)}`,
        `공간: ${state.chase.phase} ${state.chase.elapsed.toFixed(2)}초 / 경계 ${Math.round(state.chase.boundary)}`,
        `문틈: ${Math.round(state.anomaly.backstageDoorOpen * 100)}% / 귀로 ${Math.round(state.anomaly.returnDoorOpen * 100)}%`,
        `천장: ${state.anomaly.ceilingSlam === null ? '예고' : state.anomaly.ceilingSlam.toFixed(2)}`,
        `반전: ${state.mirrored ? '상하+좌우' : state.player.inverted ? '상하 반전' : '정방향'}`,
        `침입자: ${state.intruder.phase} / ${state.intruder.attackElapsed?.toFixed(2) ?? '대기'}`,
        `절단: ${state.cut.count}/6 ${state.cut.elapsed?.toFixed(2) ?? '대기'}`,
        `리와인드: ${state.rewind.cycles}회 ${state.rewind.rewinding ? state.rewind.remaining.toFixed(2) + '초' : '조작'}`,
        `선택: ${state.selection.deleted ? '삭제' : (state.selection.elapsed?.toFixed(1) ?? '대기')}`,
        `로딩: ${state.wheel.phase} ${state.wheel.elapsed.toFixed(1)}`,
        `우측 출구: ${state.rightExit.phase} x=${Math.round(state.rightExit.x)} / ${state.rightExit.attempts}회`,
        `좌측 출구: ${state.exit.phase} x=${Math.round(state.exit.x)} / ${state.exit.attempts}회`,
        `상태: ${state.phase}`,
        `전환: ${state.transitionElapsed === null ? '—' : state.transitionElapsed.toFixed(2)}`,
        `번호 노이즈: ${state.failureElapsed === null ? '—' : state.failureElapsed.toFixed(2)}`,
    ].join(' · ');
}
