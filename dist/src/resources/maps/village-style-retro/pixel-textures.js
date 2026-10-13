import * as THREE from 'three';
const palettes = {
    plaster: ['#b2a082', '#a4937b', '#887c69', '#c2b093'],
    wood: ['#705444', '#60483a', '#8c6950', '#a78059'],
    stone: ['#aaa08a', '#99927f', '#b8ad95', '#807b6c'],
    roof: ['#584b42', '#433b35', '#75604e', '#8a6e53'],
    water: ['#617e7b', '#6d8780', '#8eaa95', '#4c6b69'],
    awning: ['#af7058', '#c49573', '#8a574b', '#d5b791'],
    sign: ['#503b2d', '#805b3c', '#ddbd7a', '#b18d59'],
};
function grain(x, y) {
    return (x * 71 + y * 131 + x * y * 17) % 13;
}
/** 외부 그림 없이 정수 픽셀로 작은 표면 재질을 직접 그린다. */
export function pixelTexture(kind) {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (!ctx)
        throw new Error('픽셀 재질을 그리지 못했어요.');
    const palette = palettes[kind];
    for (let y = 0; y < 32; y++)
        for (let x = 0; x < 32; x++) {
            let color;
            const n = grain(x, y);
            if (kind === 'stone') {
                const row = Math.floor(y / 8), offset = (row % 2) * 8;
                color =
                    y % 8 === 0 || (x + offset) % 16 === 0
                        ? palette[3]
                        : palette[Math.floor((x + offset) / 16 + row) % 3];
                if (n === 0 && y % 8 > 2 && (x + offset) % 16 > 3)
                    color = palette[2];
            }
            else if (kind === 'wood') {
                color = x % 8 === 0 ? palette[1] : n < 2 ? palette[2] : palette[0];
                if ((x % 8 === 5 || x % 8 === 6) && y % 13 > 4)
                    color = palette[1];
                if (y % 16 === 1 && x % 8 === 3)
                    color = palette[3];
            }
            else if (kind === 'roof') {
                color = y % 8 < 2 ? palette[1] : palette[0];
                if ((x + (Math.floor(y / 8) % 2) * 4) % 8 === 0)
                    color = palette[2];
                if (n === 0 && y % 8 === 3)
                    color = palette[3];
            }
            else if (kind === 'awning') {
                color = palette[Math.floor(x / 8) % 2];
                if (y === 30 || x % 8 === 7)
                    color = palette[2];
            }
            else if (kind === 'water') {
                color = palette[n === 0 ? 2 : n < 3 ? 1 : 0];
                if ((x + y * 3) % 29 < 5 && y % 7 === 0)
                    color = palette[2];
            }
            else if (kind === 'sign') {
                color = x < 2 || x > 29 || y < 2 || y > 29 ? palette[1] : palette[0];
                if (((x >= 8 && x <= 11) || (x >= 20 && x <= 23)) && y >= 7 && y <= 24)
                    color = palette[2];
                if (y >= 13 && y <= 16 && x >= 5 && x <= 26)
                    color = palette[2];
                if (y >= 22 && y <= 24 && x >= 8 && x <= 24)
                    color = palette[2];
            }
            else {
                color = palette[n === 0 ? 1 : n === 1 ? 3 : 0];
                if (y > 21 && y < 24 && x < 12)
                    color = palette[2];
            }
            ctx.fillStyle = color;
            ctx.fillRect(x, y, 1, 1);
        }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestMipmapLinearFilter;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    return texture;
}
