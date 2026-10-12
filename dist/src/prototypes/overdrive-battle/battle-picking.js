/** 투영된 실제 스프라이트 모서리로 선택 영역을 구한다. 좌표 단위는 CSS 픽셀이다. */
export function spritePickDistance(cursor, corners) {
    if (!corners.length)
        return Infinity;
    const left = Math.min(...corners.map((point) => point.x));
    const right = Math.max(...corners.map((point) => point.x));
    const top = Math.min(...corners.map((point) => point.z));
    const bottom = Math.max(...corners.map((point) => point.z));
    const margin = 12;
    if (cursor.x < left - margin ||
        cursor.x > right + margin ||
        cursor.z < top - margin ||
        cursor.z > bottom + margin)
        return Infinity;
    return Math.hypot(cursor.x - (left + right) / 2, cursor.z - (top + bottom) / 2);
}
