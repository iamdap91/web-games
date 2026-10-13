export const limitedPalette = ['#17211e', '#f0ebd1'];
export const pixelSize = { width: 384, height: 240 };
export const bayerMatrix = [
    0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5,
];
/** 면의 밝기를 4×4 규칙 디더로 두 색에 배분한다. 끝값은 온전한 실루엣이다. */
export function paletteIndex(brightness, x, y) {
    const value = Math.max(0, Math.min(1, brightness));
    const column = ((Math.floor(x) % 4) + 4) % 4;
    const row = ((Math.floor(y) % 4) + 4) % 4;
    const threshold = (bayerMatrix[row * 4 + column] + 0.5) / 16;
    return value > threshold ? 1 : 0;
}
