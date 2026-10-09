import * as THREE from 'three';
// 마을 Lv.1~2 사이의 차분한 숲색을 유지하며 회관의 성장 상태를 참조하지 않는다.
export const clearingAtmosphere = {
    background: 0xabb6aa,
    sky: 0xd8e1e9,
    shade: 0x62717b,
    skyStrength: 1.65,
    sunlight: 0xf6ead8,
    sunStrength: 1.72,
};
const palette = {
    grass: { reference: 0x98a775, target: 0x959f84 },
    leaves: { reference: 0x738953, target: 0x7b8c73 },
    earth: { reference: 0x8b8066, target: 0x918778 },
    path: { reference: 0xc7b48c, target: 0xb9ad94 },
    stone: { reference: 0xaaa389, target: 0xa5abaa },
};
function hsl(color) {
    return color.getHSL({ h: 0, s: 0, l: 0 }, THREE.SRGBColorSpace);
}
/** 원래 무늬를 가진 재질의 색만 바꿔 큰 명암 덩어리와 밝은 보상색을 보존한다. */
export function recolorClearingMaterial(kind, original) {
    const family = palette[kind];
    if (!family)
        return original;
    const color = new THREE.Color(original);
    const source = hsl(color);
    // 꽃잎도 grass 재질로 만들어지므로 녹색 식생만 보정한다.
    if (kind === 'grass' && (source.h < 60 / 360 || source.h > 160 / 360))
        return original;
    const reference = hsl(new THREE.Color(family.reference));
    const target = hsl(new THREE.Color(family.target));
    color.setHSL(target.h + (source.h - reference.h) * 0.2, THREE.MathUtils.clamp(target.s + (source.s - reference.s) * 0.25, 0, 1), THREE.MathUtils.clamp(target.l + (source.l - reference.l) * 0.9, 0, 1), THREE.SRGBColorSpace);
    return color.getHex();
}
