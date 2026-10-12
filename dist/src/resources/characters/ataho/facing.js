const diagonalComponent = Math.SQRT1_2;
export const facingVectors = {
    front: { x: 0, z: 1 },
    back: { x: 0, z: -1 },
    left: { x: -1, z: 0 },
    right: { x: 1, z: 0 },
    'front-left': { x: -diagonalComponent, z: diagonalComponent },
    'front-right': { x: diagonalComponent, z: diagonalComponent },
    'back-left': { x: -diagonalComponent, z: -diagonalComponent },
    'back-right': { x: diagonalComponent, z: -diagonalComponent },
};
const cardinalThreshold = Math.tan(Math.PI / 8);
/** 45도씩 나눈 화면 방향을 고른다. 키보드와 아날로그 입력에 같은 기준을 쓴다. */
export function facingFor({ x, z }) {
    if (Math.abs(z) <= Math.abs(x) * cardinalThreshold)
        return x < 0 ? 'left' : 'right';
    if (Math.abs(x) <= Math.abs(z) * cardinalThreshold)
        return z < 0 ? 'back' : 'front';
    return z < 0
        ? x < 0
            ? 'back-left'
            : 'back-right'
        : x < 0
            ? 'front-left'
            : 'front-right';
}
/** 대각선 이동 중에도 기존 격투 포즈는 해당 좌우 쪽을 향한다. */
export function cardinalFacing(facing) {
    if (facing === 'front-left' || facing === 'back-left')
        return 'left';
    if (facing === 'front-right' || facing === 'back-right')
        return 'right';
    return facing;
}
