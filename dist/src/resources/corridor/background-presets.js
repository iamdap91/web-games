export const backgrounds = {
    corridor: {
        id: 'map/261010100',
        title: '불이 남아 있는 복도',
        intro: '아무도 없는 연구소. 차가운 벽과 오래된 조명만 남아 있어요.',
        label: '제뉴미스트 연구소 · 2층 복도',
        note: '흰색 바탕을 제거하고 벽면을 합성한 예시예요.',
        width: 2223,
        height: 404,
        saturation: 48,
        brightness: 74,
        chill: 38,
        vignette: 42,
    },
    subway: {
        id: 'map/103000200',
        title: '마지막 열차가 떠난 뒤',
        intro: '젖은 콘크리트, 녹슨 신호등. 터널에는 한 갈래 길만 남았어요.',
        label: '커닝시티 지하철 · 단층 통로',
        note: '상층 발판과 사다리를 없애고 문·신호등·선로를 단층으로 재배치했어요.',
        width: 2400,
        height: 430,
        saturation: 40,
        brightness: 78,
        chill: 46,
        vignette: 40,
    },
    laboratory: {
        id: 'map/261020400',
        title: '아직 멈추지 않은 연구소',
        intro: '닫힌 철문 뒤로 오래된 배관과 희미한 제어판만 남아 있어요.',
        label: '알카드노 연구소 C-2 · 단층 통로',
        note: '상자 발판을 없애고 모든 문을 같은 바닥 높이에 배치했어요.',
        width: 2400,
        height: 430,
        saturation: 46,
        brightness: 80,
        chill: 52,
        vignette: 38,
    },
};
export function selectBackground(value) {
    return value === 'subway' || value === 'laboratory' ? value : 'corridor';
}
