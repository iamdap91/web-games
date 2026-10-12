import * as THREE from 'three';
import { mapStyles } from '../../../rendering/map-art-direction.js';
import { villageColors } from '../../../rendering/pixel-material.js';
// 회관만 마을 전체의 분위기를 정한다. 시설의 복구 외형과 인물 색은 별도로 유지한다.
const atmospheres = {
    1: {
        ground: {
            grass: 0x999b8a,
            foliage: 0x81897d,
            earth: 0x918b80,
            path: 0xbbae96,
        },
        sky: 0xc4cfdf,
        shade: 0x626b79,
        skyStrength: 1.7,
        sunlight: 0xf1eee5,
        sunStrength: 1.55,
        background: 0xc4cbd0,
    },
    2: {
        ...mapStyles.village,
        ground: {
            grass: mapStyles.village.ground.grass,
            foliage: mapStyles.village.ground.leaves,
            earth: mapStyles.village.ground.earth,
            path: mapStyles.village.ground.path,
        },
    },
    3: {
        ...mapStyles.village,
        background: 0xd1d8c7,
        ground: {
            grass: 0x9fa98d,
            foliage: 0x829376,
            earth: 0x9c8873,
            path: 0xc5b496,
        },
    },
};
const groundFamilies = [
    {
        tone: 'grass',
        reference: villageColors.grass,
        colors: [
            villageColors.grass,
            0x71835c,
            0x92916c,
            0x8b9c68,
            0x8f9c69,
            0x8a9a66,
            0x92a36d,
            0x9eaa75,
            0x8a9a63,
            0x93a270,
            0x657955,
            0x74845b,
            0x7d8b62,
            0x7a8c60,
            0x7d9159,
            0xb2aa70,
            0x748351,
        ],
    },
    {
        tone: 'foliage',
        reference: 0x738953,
        colors: [0x607955, 0x738953, 0x88975f],
    },
    {
        tone: 'earth',
        reference: villageColors.earth,
        colors: [villageColors.earth, 0xaaa07f, 0x8e8965, 0x8a8d6c, 0xa4a477],
    },
    {
        tone: 'path',
        reference: villageColors.path,
        colors: [villageColors.path, 0xb9ab83, 0xb6a582, 0xb9ad89],
    },
];
// 기와·돌은 조명이 따뜻해져도 풀과 다른 고유색으로 읽히게 한다.
const mineralColors = {
    [0x64756a]: 0x566f79,
    [0x6b7872]: 0x6d7d82,
    [0x879080]: 0x88938c,
    [0x4c6465]: 0x486877,
    [0x627777]: 0x617f8a,
    [villageColors.stone]: 0xaaa9a0,
    [0x9b9780]: 0x9c9a90,
    [0xc1b497]: 0xc1b8a3,
    [0x90957c]: 0x939a96,
};
function hsl(hex) {
    return new THREE.Color(hex).getHSL({ h: 0, s: 0, l: 0 }, THREE.SRGBColorSpace);
}
/** 이 베이스캠프의 재질 원색과 조명 적용을 소유한다. 공유 리소스 기본값은 바꾸지 않는다. */
export class BasecampAtmosphere {
    environment;
    groundMaterials = [];
    constructor(environment) {
        this.environment = environment;
        const materials = new Set();
        for (const root of environment.roots)
            root.traverse((object) => {
                if (!(object instanceof THREE.Mesh))
                    return;
                const entries = Array.isArray(object.material)
                    ? object.material
                    : [object.material];
                for (const material of entries)
                    if (material instanceof THREE.MeshLambertMaterial)
                        materials.add(material);
            });
        for (const material of materials) {
            // 간판 그림·불빛은 원래 색을 유지하고, 장비 금속은 지형 팔레트에 포함하지 않는다.
            if (material.map || material.emissive.getHex() !== 0)
                continue;
            const color = material.color.getHex();
            const family = groundFamilies.find(({ colors }) => colors.includes(color));
            if (family)
                this.groundMaterials.push({
                    material,
                    original: hsl(color),
                    reference: hsl(family.reference),
                    tone: family.tone,
                });
            else if (mineralColors[color] !== undefined)
                material.color.setHex(mineralColors[color]);
        }
        this.setLevel(1);
    }
    setLevel(level) {
        const atmosphere = atmospheres[level];
        for (const { material, original, reference, tone } of this
            .groundMaterials) {
            const target = hsl(atmosphere.ground[tone]);
            // 원색에서 매번 계산해 반복 전환에 따른 누적 탈색을 막고 큰 명암 덩어리를 보존한다.
            material.color.setHSL(target.h + (original.h - reference.h) * 0.3, THREE.MathUtils.clamp(target.s + (original.s - reference.s) * 0.25, 0, 1), THREE.MathUtils.clamp(target.l + (original.l - reference.l) * 0.85, 0, 1), THREE.SRGBColorSpace);
        }
        const { sky, sun, background } = this.environment;
        sky.color.setHex(atmosphere.sky);
        sky.groundColor.setHex(atmosphere.shade);
        sky.intensity = atmosphere.skyStrength;
        sun.color.setHex(atmosphere.sunlight);
        sun.intensity = atmosphere.sunStrength;
        background.setHex(atmosphere.background);
    }
}
