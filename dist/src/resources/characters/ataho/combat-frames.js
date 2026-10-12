// 아래 후리기는 몸을 낮추고 지면을 쓸어낸 뒤 같은 정면 자세로 일어난다.
export const sweepKickFrames = {
    ready: 0,
    windup: [0, 1, 2, 3],
    contact: 4,
    recovery: [5, 6, 7, 8],
    settled: 8,
};
// 단일 스트레이트는 접촉 포즈를 고정한 뒤 역순으로 같은 가드에 돌아온다.
export const straightPunchFrames = {
    windup: [0, 1, 2, 3],
    contact: 4,
    recovery: [5, 6, 7],
};
// 호격권도 현재 가드에서 준비하고, 묵직한 접촉 뒤 팔을 거둔다.
export const tigerFistFrames = {
    windup: [0, 1, 2, 3],
    contact: 4,
    recovery: [5],
};
// 발차기의 시작·끝은 현재 가드이며, 접촉 전에 다리를 뻗는 포즈를 노출하지 않는다.
export const pushKickFrames = {
    windup: [0, 1, 2, 3],
    contact: 4,
    recovery: [5, 6, 7, 8],
};
// 기존 회전 타격 양쪽에 현재 가드로 이어지는 준비·착지 포즈를 붙인다.
export const turnKickFrames = {
    windup: [0, 1, 2, 3, 4, 5],
    contact: 6,
    recovery: [7, 8, 9, 10, 11],
};
export const guardFrames = {
    entry: [0, 1, 2, 3],
    held: 4,
    recovery: [5, 6, 7, 8],
};
export const hurtFrames = {
    contact: 4,
    recovery: [5, 6, 7, 8],
};
export const workReadyFrames = [0, 1, 2, 3, 4];
export const drinkFrames = {
    windup: [0, 1, 2, 3, 4, 5, 6],
    contact: 7,
    recovery: [8, 9, 10, 11, 12, 13, 14, 15, 16],
};
// 하단 채집도 같은 아래 후리기 순서로 준비·접촉·회수를 재생한다.
export const gatherDownFrames = sweepKickFrames;
