import * as THREE from 'three';
import { drawPixelResident } from '../village-style-window-village/resident.js';
/** 생활 주민의 작은 원본 픽셀과 발 pivot을 보존해 같은 월드에서 표시한다. */
export class RoomResident {
    canvas = document.createElement('canvas');
    texture;
    mesh;
    shadow = new THREE.Mesh(new THREE.CircleGeometry(0.23, 20), new THREE.MeshBasicMaterial({
        color: 0x38433d,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
    }));
    elapsed = 0;
    pose = -1;
    constructor() {
        this.canvas.width = this.canvas.height = 64;
        this.texture = new THREE.CanvasTexture(this.canvas);
        this.texture.colorSpace = THREE.SRGBColorSpace;
        this.texture.magFilter = this.texture.minFilter = THREE.NearestFilter;
        const geometry = new THREE.PlaneGeometry(1.15, 1.15);
        geometry.translate(0, 0.54, 0);
        this.mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
            map: this.texture,
            transparent: true,
            alphaTest: 0.1,
            side: THREE.DoubleSide,
            roughness: 1,
        }));
        this.mesh.castShadow = true;
        this.shadow.rotation.x = -Math.PI / 2;
    }
    update(point, _motion, delta) {
        this.elapsed += delta;
        this.mesh.position.set(point.x, 0, point.z);
        this.shadow.position.set(point.x, 0.018, point.z);
        const pose = Math.floor(this.elapsed * 5) % 3;
        if (pose === this.pose)
            return;
        this.pose = pose;
        const c = this.canvas.getContext('2d');
        if (!c)
            return;
        c.clearRect(0, 0, 64, 64);
        drawPixelResident(c, {
            x: 28,
            y: 62,
            role: 'host',
            active: true,
            elapsed: this.elapsed,
        });
        this.texture.needsUpdate = true;
    }
    dispose() {
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        this.shadow.geometry.dispose();
        this.shadow.material.dispose();
        this.texture.dispose();
    }
}
