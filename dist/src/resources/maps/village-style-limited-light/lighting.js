import { heightNormal, surfaceDiffuse } from './normal.js';
const bevel = (x, y, texture) => {
    const row = Math.floor(y / 6);
    const column = ((Math.floor(x + (row % 2) * 5) % 10) + 10) % 10;
    const height = ((Math.floor(y) % 6) + 6) % 6;
    return texture === 'brick'
        ? column > 0 && column < 9 && height > 0 && height < 5
            ? 2
            : 0
        : Math.sin((column / 9) * Math.PI) * 2 + (height > 0 ? 1 : 0);
};
/** 원본 lit2d의 높이장 법선과 Lambert 내적을 두 색 래스터 앞에서 계산한다. */
export function litBrightness(base, x, y, surface, lights) {
    if (base <= 0)
        return 0;
    const bump = heightNormal(bevel(x - 1, y, surface.texture), bevel(x + 1, y, surface.texture), bevel(x, y - 1, surface.texture), bevel(x, y + 1, surface.texture));
    const normal = {
        x: surface.normal.x + bump.x * 0.5,
        y: surface.normal.y + bump.y * 0.5,
        z: surface.normal.z * bump.z,
    };
    let value = base * 0.35;
    for (const light of lights) {
        const dx = light.x - x, dy = y - light.y;
        const attenuation = Math.max(0, 1 - Math.hypot(dx, dy) / 120);
        value +=
            surfaceDiffuse(normal, { x: dx, y: dy, z: 24 }) *
                attenuation *
                light.strength *
                base;
    }
    return Math.max(0, Math.min(1, value));
}
