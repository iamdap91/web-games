/** 저장된 pivot.y는 이미지 아래에서 잰 지면 오프셋이므로 위쪽 GL 중심에 반영한다. */
export function framePlacement(frame, scale) {
    return {
        width: frame.width * scale,
        height: frame.height * scale,
        x: (frame.width / 2 - frame.pivot.x) * scale,
        y: (frame.height / 2 - frame.pivot.y) * scale,
    };
}
