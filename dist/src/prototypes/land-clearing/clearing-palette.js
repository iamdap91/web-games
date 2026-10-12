import { mapStyles, recolorMapMaterial, } from '../../rendering/map-art-direction.js';
// 마을 성장 상태와 독립된 숲의 공통 미술 기준을 사용한다.
export const clearingAtmosphere = mapStyles.clearing;
export function recolorClearingMaterial(kind, original) {
    return recolorMapMaterial(mapStyles.clearing, kind, original);
}
