import * as THREE from 'three';
import { clearing } from './clearing-rules.js';
export const clearingCameraPose = {
    height: 21,
    depth: 25,
    targetZ: -1,
};
export const clearingScreenUpY = clearingCameraPose.depth /
    Math.hypot(clearingCameraPose.height, clearingCameraPose.depth);
/** 시야가 공터보다 좁을 때만 가로로 따라가며 가장자리 숲 너머까지 이탈하지 않는다. */
export function clearingCameraX({ playerX, halfWidth, }) {
    const limit = Math.max(0, clearing.width / 2 + 2.3 - halfWidth);
    return THREE.MathUtils.clamp(playerX, -limit, limit);
}
/** CSS 표시 크기로 투영한다. 화면 밖 좌표를 가장자리 안으로 끌어오지 않는다. */
export function projectClearingPoint({ point, camera, width, height, }) {
    const projected = point.clone().project(camera);
    return {
        x: ((projected.x + 1) * width) / 2,
        y: ((1 - projected.y) * height) / 2,
        visible: width > 0 &&
            height > 0 &&
            Math.abs(projected.x) <= 1 &&
            Math.abs(projected.y) <= 1 &&
            Math.abs(projected.z) <= 1,
    };
}
