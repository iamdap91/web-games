import * as THREE from 'three';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
/** 선택된 시설의 보이는 외곽만 배경과 같은 픽셀 격자로 합성한다. */
export class FacilityHighlightPass extends OutlinePass {
    drawingSize = new THREE.Vector2(1, 1);
    pixelSize = 1;
    constructor(scene, camera) {
        super(new THREE.Vector2(1, 1), scene, camera);
        this.enabled = false;
        this.downSampleRatio = 1;
        this.edgeStrength = 1;
        this.edgeThickness = 1;
        this.edgeGlow = 0;
        this.pulsePeriod = 0;
        this.visibleEdgeColor.setHex(0xfff3d7);
        this.hiddenEdgeColor.setHex(0x000000);
        // 선을 부드럽게 확대하지 않아 기존 배경 도트의 경계를 유지한다.
        for (const target of [
            this.renderTargetMaskBuffer,
            this.renderTargetDepthBuffer,
            this.renderTargetMaskDownSampleBuffer,
            this.renderTargetBlurBuffer1,
            this.renderTargetBlurBuffer2,
            this.renderTargetEdgeBuffer1,
            this.renderTargetEdgeBuffer2,
        ]) {
            target.texture.minFilter = THREE.NearestFilter;
            target.texture.magFilter = THREE.NearestFilter;
        }
    }
    setPixelSize(size) {
        this.pixelSize = size;
        this.setSize(this.drawingSize.x, this.drawingSize.y);
    }
    setSize(width, height) {
        this.drawingSize.set(width, height);
        super.setSize(Math.max(1, Math.floor(width / this.pixelSize)), Math.max(1, Math.floor(height / this.pixelSize)));
    }
}
