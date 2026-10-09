import * as THREE from 'three';
export const villageColors = {
    grass: 0x98a775,
    earth: 0x8b8066,
    path: 0xc7b48c,
    wood: 0x79573e,
    stone: 0xaaa389,
};
function surfaceStyle(color) {
    if ([villageColors.grass, 0xabb381].includes(color))
        return 1;
    if ([villageColors.earth, villageColors.stone, 0x8a8b70, 0xb1af8b].includes(color))
        return 2;
    if ([villageColors.wood, 0xab8358, 0xba9566].includes(color))
        return 3;
    if ([0x6b7872, 0xa76c4b, 0x64756a].includes(color))
        return 4;
    if ([0x607955, 0x738953, 0x88975f].includes(color))
        return 5;
    if (color === villageColors.path)
        return 6;
    return 0;
}
const detailedPattern = `
      vec2 dotCell = floor(surfaceUv * 16.0);
      float fleck = villageNoise(dotCell);
      float cluster = villageNoise(floor(dotCell / vec2(4.0, 3.0)));
      float ink = 1.0;
      if (villageSurface == 1.0) {
        ink = cluster < 0.25 ? 0.88 : (cluster > 0.82 ? 1.08 : 1.0);
        if (fleck > 0.94) ink *= 0.83;
      } else if (villageSurface == 2.0) {
        float row = floor(surfaceUv.y * 4.0);
        float seam = step(fract(surfaceUv.y * 4.0), 0.10);
        float joint = step(fract(surfaceUv.x * 2.0 + mod(row, 2.0) * 0.5), 0.05);
        ink = 0.96 + floor(cluster * 3.0) * 0.04 - max(seam, joint) * 0.14;
      } else if (villageSurface == 3.0) {
        float grain = villageNoise(vec2(floor(surfaceUv.x * 18.0), floor(surfaceUv.y * 3.0)));
        ink = grain < 0.25 ? 0.78 : (grain > 0.8 ? 1.09 : 1.0);
      } else if (villageSurface == 4.0) {
        vec2 tile = surfaceUv * vec2(4.0, 6.0);
        float row = floor(tile.y);
        float seam = step(fract(tile.y), 0.14);
        float joint = step(fract(tile.x + mod(row, 2.0) * 0.5), 0.10);
        float shine = step(0.80, fract(tile.y));
        ink = 0.96 + floor(cluster * 3.0) * 0.04 - max(seam, joint) * 0.24 + shine * 0.08;
      } else if (villageSurface == 5.0) {
        ink = cluster < 0.3 ? 0.78 : (cluster > 0.75 ? 1.17 : 0.99);
      } else if (villageSurface == 6.0) {
        ink = fleck < 0.055 ? 0.83 : (fleck > 0.975 ? 1.12 : 1.0);
      }
`;
const broadPattern = `
      // 넓게 이어진 색 면을 유지하고 작은 독립 점과 격자 이음새는 만들지 않는다.
      vec2 patchCell = floor(surfaceUv * vec2(2.0, 1.5));
      float patchTone = villageNoise(patchCell);
      float ink = 1.0;
      if (villageSurface == 1.0) {
        ink = patchTone < 0.2 ? 0.93 : (patchTone > 0.85 ? 1.04 : 1.0);
      } else if (villageSurface == 2.0) {
        ink = patchTone < 0.18 ? 0.90 : (patchTone > 0.84 ? 1.06 : 1.0);
      } else if (villageSurface == 3.0) {
        float grain = villageNoise(vec2(floor(surfaceUv.x * 5.0), floor(surfaceUv.y * 1.5)));
        ink = grain < 0.22 ? 0.82 : (grain > 0.88 ? 1.07 : 1.0);
      } else if (villageSurface == 5.0) {
        ink = patchTone < 0.30 ? 0.84 : (patchTone > 0.78 ? 1.09 : 1.0);
      } else if (villageSurface == 6.0) {
        ink = patchTone < 0.12 ? 0.94 : (patchTone > 0.92 ? 1.04 : 1.0);
      }
`;
/** 월드 좌표에서 작은 색 덩어리를 만들어 외부 텍스처 없이 도트 재질을 입힌다. */
export function createPixelMaterial(color, options = {}) {
    const style = surfaceStyle(color);
    const pattern = options.pattern ?? 'detailed';
    const texturePattern = pattern === 'broad' && style !== 4 ? broadPattern : detailedPattern;
    const material = new THREE.MeshLambertMaterial({ color, flatShading: true });
    if (!style)
        return material;
    material.customProgramCacheKey = () => `village-pixel-${style}-${pattern}`;
    material.onBeforeCompile = (shader) => {
        shader.uniforms.villageSurface = { value: style };
        shader.uniforms.villageTextureStrength = options.strength ?? { value: 1 };
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', `
      #include <common>
      varying vec3 villageWorldPosition;
      varying vec3 villageWorldNormal;
    `)
            .replace('#include <begin_vertex>', `
      #include <begin_vertex>
      villageWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
      villageWorldNormal = normalize(mat3(modelMatrix) * normal);
    `);
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', `
      #include <common>
      uniform float villageSurface;
      uniform float villageTextureStrength;
      varying vec3 villageWorldPosition;
      varying vec3 villageWorldNormal;
      float villageNoise(vec2 cell) {
        return fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
      }
    `)
            .replace('#include <color_fragment>', `
      #include <color_fragment>
      vec3 surfaceNormal = abs(normalize(villageWorldNormal));
      vec2 surfaceUv = surfaceNormal.y > max(surfaceNormal.x, surfaceNormal.z)
        ? villageWorldPosition.xz
        : (surfaceNormal.x > surfaceNormal.z ? villageWorldPosition.zy : villageWorldPosition.xy);
      ${texturePattern}
      diffuseColor.rgb *= mix(1.0, ink, clamp(villageTextureStrength, 0.0, 1.0));
    `);
    };
    return material;
}
