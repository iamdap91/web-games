import * as THREE from 'three';
/** 화면에 그릴 때만 격자에 맞추고, 추적 상태에는 반올림 오차를 되돌리지 않는다. */
export function alignCameraToPixelGrid(camera, size) {
    const width = Math.max(1, Math.floor(size.width));
    const height = Math.max(1, Math.floor(size.height));
    camera.updateMatrixWorld();
    const origin = new THREE.Vector3().project(camera);
    const pixelX = (origin.x + 1) * width * 0.5;
    const pixelY = (origin.y + 1) * height * 0.5;
    const x = Math.round(pixelX);
    const y = Math.round(pixelY);
    const dx = ((pixelX - x) * (camera.right - camera.left)) / (camera.zoom * width);
    const dy = ((pixelY - y) * (camera.top - camera.bottom)) / (camera.zoom * height);
    const basis = camera.matrixWorld.elements;
    camera.position.x += basis[0] * dx + basis[4] * dy;
    camera.position.y += basis[1] * dx + basis[5] * dy;
    camera.position.z += basis[2] * dx + basis[6] * dy;
    camera.updateMatrixWorld();
    return { x, y };
}
