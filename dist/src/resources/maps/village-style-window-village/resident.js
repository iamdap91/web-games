/** 발 pivot과 원본 픽셀 크기를 가진 작은 직접 그린 주민. 움직임도 정수 픽셀 자세로 고른다. */
export function drawPixelResident(context, options) {
    const { x, y, role, active, elapsed, scale = 1 } = options;
    const pose = active ? Math.floor(elapsed * 5) % 3 : 0;
    const coat = role === 'smith' ? '#718b87' : role === 'trainer' ? '#8d9b7b' : '#84999b';
    const c = context;
    c.save();
    c.translate(Math.round(x), Math.round(y));
    c.scale(scale, scale);
    const rect = (xx, yy, w, h, color) => {
        c.fillStyle = color;
        c.fillRect(xx, yy, w, h);
    };
    rect(-12, -2, 24, 3, '#263b3766');
    rect(-8, -9, 7, 9, '#303c38');
    rect(2, -9, 7, 9, '#303c38');
    rect(-10, -29, 20, 21, '#344840');
    rect(-8, -27, 16, 16, coat);
    rect(-8, -11, 16, 3, '#596955');
    rect(-6, -34, 12, 8, '#c99e79');
    rect(-9, -43, 18, 12, '#35433b');
    rect(-8, -38, 16, 10, '#d7ae85');
    rect(-8, -43, 16, 6, '#3c473f');
    rect(-10, -40, 3, 6, '#3c473f');
    rect(7, -39, 3, 5, '#3c473f');
    rect(3, -35, 2, 2, '#4a4134');
    rect(-6, -36, 2, 2, '#4a4134');
    rect(-13, -26, 5, 13, '#455d51');
    rect(-12, -15, 5, 5, '#c99e79');
    const armY = -25 - pose * 3;
    rect(8, armY, 8 + pose * 2, 5, coat);
    rect(13 + pose * 2, armY, 5, 5, '#d7ae85');
    if (active && role === 'smith') {
        rect(18 + pose * 2, armY - 10, 3, 12, '#907958');
        rect(14 + pose * 2, armY - 12, 12, 5, '#b2b8a4');
    }
    if (role === 'host') {
        rect(15 + pose * 2, armY - 3, 8, 5, '#ddd0aa');
        rect(16 + pose * 2, armY - 4, 6, 2, '#7b654b');
    }
    c.restore();
}
