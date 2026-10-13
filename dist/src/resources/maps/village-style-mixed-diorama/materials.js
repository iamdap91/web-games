import * as THREE from 'three';
const palettes = {
    plaster: ['#b2a7a1', '#d9c5aa', '#697f85', '#a08c87'],
    roof: ['#345b70', '#78929a', '#284856', '#516e83'],
    bark: ['#855c43', '#ba8e65', '#453d3b', '#987459'],
    moss: ['#365b4a', '#87976a', '#254d4c', '#b4b888'],
    cloth: ['#c88761', '#e4b790', '#845e62', '#d19b7d'],
    brick: ['#697d80', '#9ba49c', '#424f64', '#798386'],
    earth: ['#6f8989', '#a6aaa0', '#425f72', '#8d9895'],
};
function random(seed) {
    return (((Math.sin(seed * 127.1 + 34.2) * 43758.5453) % 1) + 1) % 1;
}
function layer() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const c = canvas.getContext('2d');
    if (!c)
        throw new Error('붓결 소재판을 만들지 못했습니다.');
    return { canvas, c };
}
/** 큰 색면·방향 붓질과 소재별 밀도를 UV에 고정하고 별도 요철판을 함께 소유한다. */
export class MixedDioramaMaterials {
    textures = [];
    materials = [];
    relief = new Map();
    plates = new Map();
    normals = true;
    plate(kind) {
        const cached = this.plates.get(kind);
        if (cached)
            return cached;
        const { canvas, c } = layer();
        const height = layer();
        const p = palettes[kind];
        c.fillStyle = p[0];
        c.fillRect(0, 0, 512, 512);
        height.c.fillStyle = '#808080';
        height.c.fillRect(0, 0, 512, 512);
        // 얼룩 노이즈 이전에 한 면의 명암과 대담한 여러 색면을 만든다.
        for (let i = 0; i < 18; i++) {
            const x = random(i * 3) * 512, y = random(i * 3 + 1) * 512;
            c.beginPath();
            c.moveTo(x - 100, y - 40);
            c.lineTo(x + 110, y - 25);
            c.lineTo(x + 80, y + 80);
            c.lineTo(x - 120, y + 110);
            c.closePath();
            c.globalAlpha = 0.12 + random(i) * 0.24;
            c.fillStyle = p[i % p.length];
            c.fill();
        }
        c.globalAlpha = 1;
        if (kind === 'roof' || kind === 'plaster') {
            c.fillStyle = kind === 'roof' ? '#90a4a7' : '#e0c9aa';
            c.beginPath();
            c.moveTo(0, 140);
            c.lineTo(210, 100);
            c.lineTo(330, 205);
            c.lineTo(512, 170);
            c.lineTo(512, 350);
            c.lineTo(260, 375);
            c.lineTo(0, 300);
            c.closePath();
            c.fill();
            c.globalAlpha = 0.45;
            c.fillStyle = kind === 'roof' ? '#345166' : '#70858b';
            c.beginPath();
            c.moveTo(0, 0);
            c.lineTo(260, 0);
            c.lineTo(220, 120);
            c.lineTo(0, 230);
            c.closePath();
            c.fill();
            c.globalAlpha = 1;
        }
        if (kind === 'brick') {
            for (let row = 0; row < 9; row++)
                for (let col = -1; col < 6; col++) {
                    const x = col * 106 + (row % 2) * 53, y = row * 60;
                    c.fillStyle = p[(row + col + 10) % p.length];
                    c.fillRect(x + 3, y + 3, 100, 52);
                    height.c.fillStyle = '#b8b8b8';
                    height.c.fillRect(x + 4, y + 4, 97, 49);
                    height.c.fillStyle = '#555555';
                    height.c.fillRect(x, y, 106, 3);
                    height.c.fillRect(x, y, 3, 60);
                }
        }
        const count = kind === 'bark'
            ? 320
            : kind === 'cloth'
                ? 680
                : kind === 'moss'
                    ? 6500
                    : 340;
        for (let i = 0; i < count; i++) {
            const x = random(i * 7 + 7) * 512, y = random(i * 7 + 8) * 512;
            const vertical = kind === 'bark' || kind === 'plaster';
            const angle = vertical
                ? Math.PI / 2 + Math.sin(i) * 0.09
                : kind === 'cloth'
                    ? i % 2
                        ? 0
                        : Math.PI / 2
                    : -0.24;
            const length = kind === 'moss'
                ? 2 + random(i) * 6
                : kind === 'bark'
                    ? 32 + random(i) * 130
                    : 12 + random(i) * 62;
            c.beginPath();
            c.moveTo(x, y);
            c.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
            c.strokeStyle = p[i % 4];
            c.globalAlpha = kind === 'moss' ? 0.8 : 0.3;
            c.lineWidth =
                kind === 'moss' ? 1.2 + random(i + 4) * 3 : 1 + random(i + 4) * 5;
            c.stroke();
            height.c.beginPath();
            height.c.moveTo(x, y);
            height.c.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
            height.c.strokeStyle = i % 3 ? '#aaaaaa' : '#454545';
            height.c.lineWidth = kind === 'bark' ? 3 + random(i) * 7 : 1.4;
            height.c.stroke();
            // 마른 붓의 갈라진 끝은 넓은 색면의 방향을 따라간다.
            if (kind !== 'moss' && kind !== 'cloth')
                for (let j = 0; j < 3; j++) {
                    c.beginPath();
                    c.moveTo(x + j * 1.3, y);
                    c.lineTo(x + Math.cos(angle) * length + j * 1.3, y + Math.sin(angle) * length);
                    c.lineWidth = 0.6;
                    c.strokeStyle = p[1];
                    c.stroke();
                }
        }
        c.globalAlpha = 1;
        if (kind === 'plaster' || kind === 'roof') {
            const shade = c.createLinearGradient(0, 0, 0, 512);
            shade.addColorStop(0, kind === 'plaster' ? '#243b5975' : '#c9d4bd25');
            shade.addColorStop(0.28, '#243b5900');
            shade.addColorStop(1, '#25394a35');
            c.fillStyle = shade;
            c.fillRect(0, 0, 512, 512);
        }
        const color = new THREE.CanvasTexture(canvas);
        color.colorSpace = THREE.SRGBColorSpace;
        color.anisotropy = 8;
        const data = height.c.getImageData(0, 0, 512, 512).data;
        const normalData = new Uint8Array(512 * 512 * 4);
        const value = (x, y) => data[(((y + 512) % 512) * 512 + ((x + 512) % 512)) * 4] / 255;
        for (let y = 0; y < 512; y++)
            for (let x = 0; x < 512; x++) {
                const dx = (value(x - 1, y) - value(x + 1, y)) * 2.1, dy = (value(x, y + 1) - value(x, y - 1)) * 2.1;
                const n = new THREE.Vector3(dx, dy, 1).normalize();
                const at = (y * 512 + x) * 4;
                normalData[at] = (n.x * 0.5 + 0.5) * 255;
                normalData[at + 1] = (n.y * 0.5 + 0.5) * 255;
                normalData[at + 2] = (n.z * 0.5 + 0.5) * 255;
                normalData[at + 3] = 255;
            }
        const normal = new THREE.DataTexture(normalData, 512, 512, THREE.RGBAFormat);
        normal.colorSpace = THREE.NoColorSpace;
        // Canvas 색판과 normal 판의 위쪽을 같은 UV 방향으로 맞춘다.
        normal.flipY = true;
        normal.needsUpdate = true;
        normal.magFilter = normal.minFilter = THREE.LinearFilter;
        this.textures.push(color, normal);
        height.canvas.width = height.canvas.height = 1;
        const result = { color, normal };
        this.plates.set(kind, result);
        return result;
    }
    surface(options) {
        const plate = this.plate(options.kind);
        const material = new THREE.MeshStandardMaterial({
            color: options.color ?? 0xffffff,
            map: plate.color,
            normalMap: plate.normal,
            normalScale: new THREE.Vector2(0.72, 0.72),
            roughness: 0.96,
            side: THREE.DoubleSide,
        });
        this.materials.push(material);
        this.relief.set(material, plate.normal);
        return material;
    }
    flat(color) {
        const material = new THREE.MeshStandardMaterial({ color, roughness: 1 });
        this.materials.push(material);
        return material;
    }
    sign(text) {
        const { canvas, c } = layer();
        c.clearRect(0, 0, 512, 512);
        c.fillStyle = '#d6bd96';
        c.fillRect(12, 120, 488, 272);
        c.strokeStyle = '#70574d';
        c.lineWidth = 8;
        c.strokeRect(20, 128, 472, 256);
        c.font = 'bold 145px serif';
        c.textAlign = 'center';
        c.fillStyle = '#455768';
        c.fillText(text, 256, 315);
        const t = new THREE.CanvasTexture(canvas);
        t.colorSpace = THREE.SRGBColorSpace;
        this.textures.push(t);
        const m = new THREE.MeshStandardMaterial({
            map: t,
            alphaTest: 0.1,
            roughness: 1,
            side: THREE.DoubleSide,
        });
        this.materials.push(m);
        return m;
    }
    setNormals(enabled) {
        if (enabled === this.normals)
            return;
        this.normals = enabled;
        for (const [material, normal] of this.relief) {
            material.normalMap = enabled ? normal : null;
            material.needsUpdate = true;
        }
    }
    dispose() {
        this.textures.forEach((t) => t.dispose());
        this.materials.forEach((m) => m.dispose());
        this.plates.clear();
        this.relief.clear();
    }
}
