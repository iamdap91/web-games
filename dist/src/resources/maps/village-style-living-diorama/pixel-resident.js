import * as THREE from 'three';
/** 32×48 직접 작성 픽셀. 외부 정면 시안의 모션을 임의로 만들어 쓰지 않는다. */
export function residentPixels(role, pose) {
    const pixels = new Uint8Array(32 * 48 * 4);
    const rect = (x, y, w, h, color) => {
        for (let row = y; row < y + h; row++)
            for (let col = x; col < x + w; col++) {
                if (row < 0 || row >= 48 || col < 0 || col >= 32)
                    continue;
                const at = ((47 - row) * 32 + col) * 4;
                pixels[at] = color >> 16;
                pixels[at + 1] = (color >> 8) & 255;
                pixels[at + 2] = color & 255;
                pixels[at + 3] = 255;
            }
    };
    const outline = 0x333a3d, skin = 0xd6aa80, skinLight = 0xeac39e;
    const coat = role === 'artisan' ? 0x798981 : role === 'trainee' ? 0x648d89 : 0x76889a;
    rect(10, 33, 5, 11, outline);
    rect(17, 33, 5, 11, outline);
    rect(9, 42, 7, 3, outline);
    rect(17, 42, 7, 3, outline);
    rect(9, 19, 14, 17, outline);
    rect(10, 20, 12, 15, coat);
    rect(12, 20, 4, 14, role === 'trainee' ? 0xb8c2aa : 0xb89a79);
    rect(10, 31, 12, 2, 0x494945);
    rect(12, 31, 3, 2, 0xdbbb89);
    rect(11, 7, 10, 12, outline);
    rect(12, 8, 8, 10, skin);
    rect(12, 10, 2, 5, skinLight);
    rect(14, 12, 1, 2, outline);
    rect(18, 12, 1, 2, outline);
    rect(16, 16, 3, 1, 0x956b54);
    if (role === 'trainee') {
        rect(11, 6, 10, 4, 0x454247);
        rect(9, 8, 14, 2, 0xb7c4af);
        rect(22, 9, 4, 2, 0x90a9a0);
    }
    else {
        rect(10, 4, 12, 4, role === 'artisan' ? 0x6d6153 : 0xbdb09d);
        rect(8, 8, 16, 2, role === 'artisan' ? 0x6d6153 : 0xd4c8b0);
    }
    const active = pose >= 0, lift = active ? ([0, 2, 4, 2][pose % 4] ?? 0) : 0;
    rect(6, 21, 4, 10, outline);
    rect(7, 22, 2, 8, coat);
    rect(7, 30, 3, 3, skin);
    rect(22, 21 - lift, 4, 10, outline);
    rect(23, 22 - lift, 2, 7, coat);
    rect(23, 29 - lift, 3, 3, skinLight);
    if (role === 'artisan') {
        rect(25, 23 - lift, 1, 9, 0xd5be8c);
        rect(25, 31 - lift, 2, 3, 0x4f7787);
        rect(5, 30, 7, 3, 0xb9a481);
        rect(6, 30, 2, 1, 0x9a6250);
        rect(9, 30, 2, 1, 0x6c8c88);
    }
    if (role === 'trainee' && active) {
        rect(23, 22 - lift, 5, 3, skinLight);
        rect(17, 41 - lift, 5, 3, outline);
    }
    if (role === 'merchant') {
        rect(6, 30 - lift, 20, 6, 0xc9bea1);
        rect(7, 31 - lift, 18, 1, 0x918776);
        rect(10, 34 - lift, 3, 1, 0x948d96);
    }
    return pixels;
}
export class PixelResident {
    body = new THREE.Group();
    frames;
    material;
    pose = -1;
    shadowMaterial = new THREE.MeshBasicMaterial({
        color: 0x3b4742,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
    });
    constructor(role, position) {
        this.frames = [-1, 0, 1, 2, 3].map((pose) => {
            const texture = new THREE.DataTexture(residentPixels(role, pose), 32, 48, THREE.RGBAFormat);
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.magFilter = texture.minFilter = THREE.NearestFilter;
            texture.needsUpdate = true;
            return texture;
        });
        this.material = new THREE.MeshBasicMaterial({
            map: this.frames[0],
            alphaTest: 0.5,
            side: THREE.DoubleSide,
        });
        const geometry = new THREE.PlaneGeometry(32 / 24, 48 / 24);
        geometry.translate(0, 1, 0);
        const mesh = new THREE.Mesh(geometry, this.material);
        mesh.rotation.y = Math.atan2(13, 29);
        mesh.scale.y = Math.hypot(Math.hypot(13, 29), 22.9) / Math.hypot(13, 29);
        this.body.position.set(position.x, position.y + 0.025, position.z);
        this.body.add(mesh);
        const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.28, 18), this.shadowMaterial);
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = -0.015;
        this.body.add(shadow);
    }
    update(options) {
        this.pose = options.working ? Math.floor(options.elapsed * 6) % 4 : -1;
        this.material.map = this.frames[this.pose + 1] ?? null;
        this.body.visible = options.visible ?? true;
    }
    get frame() {
        return this.pose;
    }
    dispose() {
        this.frames.forEach((frame) => frame.dispose());
        this.material.dispose();
        this.shadowMaterial.dispose();
    }
}
