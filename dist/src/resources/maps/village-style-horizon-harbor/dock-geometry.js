import * as THREE from 'three';
import { harborDock, harborSurfaceHeight } from './layout.js';
/** 긴 부두도 발 접지와 클릭 표면이 같은 원통을 따르도록 충분히 세분한다. */
export function createHarborDockGeometry() {
    const width = harborDock.right - harborDock.left;
    const depth = harborDock.front - harborDock.back;
    const center = {
        x: (harborDock.left + harborDock.right) / 2,
        z: (harborDock.front + harborDock.back) / 2,
    };
    const height = harborSurfaceHeight(center);
    return new THREE.BoxGeometry(width, height, depth, 2, 1, Math.ceil(depth / 0.4)).translate(center.x, height / 2, center.z);
}
