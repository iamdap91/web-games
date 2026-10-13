import * as THREE from 'three';
import { normalPixels } from './normal.js';
export const palette = {
    grass: '#72816d',
    earth: '#bcaa88',
    plaster: '#d2baa0',
    roof: '#566f72',
    dark: '#3e5355',
    wood: '#7d6754',
    brick: '#aa7e66',
};
/** 회화형 큰 색면을 먼저 놓고 실제 면 방향에 낮은 밀도의 마른 붓을 얹는다. */
export function surfaceArt(kind, options = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const c = canvas.getContext('2d');
    if (!c)
        throw new Error('표면 그림을 만들지 못했습니다.');
    const heights = new Float32Array(128 * 128);
    let seed = 813 +
        [...(options.title ?? '')].reduce((n, char) => n + char.charCodeAt(0) * 11, 0);
    const random = () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
    };
    const rect = (x, y, w, h, color) => {
        c.fillStyle = color;
        c.fillRect(x, y, w, h);
    };
    const heightRect = (x, y, w, h, value) => {
        for (let yy = Math.max(0, Math.floor(y)); yy < Math.min(128, y + h); yy++)
            for (let xx = Math.max(0, Math.floor(x)); xx < Math.min(128, x + w); xx++)
                heights[yy * 128 + xx] = value;
    };
    const brushes = (count, colors, direction) => {
        for (let i = 0; i < count; i++) {
            const x = random() * 128, y = random() * 128, length = 9 + random() * 27;
            c.globalAlpha = 0.1 + random() * 0.1;
            rect(Math.floor(x), Math.floor(y), direction === 'horizontal' ? length : 1 + random() * 3, direction === 'horizontal' ? 1 + random() * 3 : length, colors[i % colors.length] ?? '#aaa');
            if (i % 3 === 0)
                rect(x + 2, y + 3, direction === 'horizontal' ? length * 0.6 : 1, direction === 'horizontal' ? 1 : length * 0.8, colors[0] ?? '#aaa');
        }
        c.globalAlpha = 1;
    };
    if (kind === 'stone' || kind === 'brick') {
        rect(0, 0, 128, 128, kind === 'brick' ? '#7b6556' : '#778477');
        const colors = kind === 'brick'
            ? ['#a98069', '#b08b72', '#aa7f67', '#bc987e']
            : ['#99a38f', '#a5ac96', '#919d8c', '#a7aa95'];
        // 벽돌 무늬는 세계 폭 4단위에 맞춘 같은 밀도로 붙인다.
        for (let y = 0; y < 128; y += 16)
            for (let x = -32; x < 128; x += 32) {
                const xx = x + ((y / 16) % 2) * 16;
                rect(xx + 1, y + 1, 30, 14, colors[Math.floor(random() * 4)] ?? colors[0]);
                heightRect(xx + 1, y + 1, 30, 14, 2.8);
                heightRect(xx + 3, y + 3, 26, 10, 4.4);
                if (random() > 0.6)
                    rect(xx + 4, y + 2, 19, 1, '#d0c1a2');
            }
        brushes(16, ['#b8ac95', '#756f61'], 'horizontal');
    }
    if (kind === 'ground' || kind === 'grass') {
        rect(0, 0, 128, 128, kind === 'grass' ? palette.grass : palette.earth);
        // 큰 흙색 위에 짧은 마른 붓을 얹어 길의 흐름을 남긴다.
        brushes(kind === 'grass' ? 28 : 14, kind === 'grass' ? ['#8e9c7c', '#556d60'] : ['#ddd0b1', '#a29278'], 'horizontal');
        for (let i = 0; i < 15; i++)
            rect(random() * 128, random() * 128, 1.5, 1, kind === 'grass' ? '#819174' : '#b7a285');
    }
    if (kind === 'roof') {
        rect(0, 0, 128, 128, palette.roof);
        for (let y = 0; y < 128; y += 16)
            for (let x = 0; x < 128; x += 12) {
                const v = options.damaged && random() < 0.18;
                rect(x + 1, y + 1, 10, 14, v
                    ? '#6b736c'
                    : ['#617979', '#657c7b', '#5c7577'][Math.floor(random() * 3)]);
                heightRect(x + 1, y + 1, 10, 14, 2.6);
                heightRect(x + 4, y + 1, 4, 13, 4.6);
                c.globalAlpha = 0.28;
                rect(x + 2, y + 1, 1, 13, '#82928a');
                c.globalAlpha = 1;
            }
        brushes(44, ['#b6b6a1', '#47696b'], 'horizontal');
        c.globalAlpha = 0.15;
        rect(0, 20, 128, 21, '#a9b2a3');
        rect(24, 57, 104, 16, '#aeb3a0');
        c.globalAlpha = 1;
        // 큰 처마 명암은 기와 작은 선보다 먼저 읽힌다.
        c.globalAlpha = 0.28;
        rect(0, 114, 128, 14, '#30484d');
        c.globalAlpha = 1;
    }
    if (kind === 'facade') {
        rect(0, 0, 128, 128, palette.plaster);
        rect(100, 22, 28, 71, '#a9a18d');
        rect(0, 0, 128, 28, '#9eaa99');
        c.globalAlpha = 0.35;
        rect(0, 26, 128, 10, '#697d78');
        c.globalAlpha = 1;
        brushes(38, ['#efdbc0', '#b49982', '#c6ab94'], 'vertical');
        rect(0, 91, 128, 37, '#8d9685');
        brushes(23, ['#bdbaa2', '#718073'], 'horizontal');
        rect(0, 12, 128, 10, '#506060');
        for (const x of [2, 38, 88, 123]) {
            rect(x, 20, 3, 74, palette.wood);
            rect(x + 1, 22, 1, 65, '#b19678');
        }
        for (const x of [13, 98]) {
            rect(x - 2, 40, 22, 34, '#7b6e5d');
            rect(x, 42, 18, 29, options.damaged ? '#697879' : '#d9c699');
            rect(x + 8, 42, 2, 30, '#756959');
            rect(x, 55, 18, 2, '#756959');
        }
        rect(47, 38, 35, 90, '#596b69');
        rect(50, 41, 29, 87, '#8e765c');
        for (let x = 52; x < 79; x += 6)
            rect(x, 43, 1, 82, '#bc9e78');
        if (options.damaged) {
            rect(45, 94, 39, 5, '#6b6758');
            rect(26, 65, 2, 19, '#7a8172');
        }
    }
    if (kind === 'leaves') {
        for (let layer = 0; layer < 4; layer++)
            for (let i = 0; i < 95; i++) {
                const angle = random() * Math.PI * 2, r = Math.sqrt(random());
                const x = 64 + Math.cos(angle) * r * (56 - layer * 5), y = 65 + Math.sin(angle) * r * (54 - layer * 7) - layer * 3;
                rect(Math.floor(x / 2) * 2, Math.floor(y / 2) * 2, 8 + random() * 12, 4 + random() * 9, ['#405d56', '#5d7968', '#7e9376', '#a5ae87'][layer]);
            }
        c.globalAlpha = 0.35;
        brushes(55, ['#bfbd91', '#728e7b'], 'horizontal');
        c.globalAlpha = 1;
    }
    if (kind === 'sign') {
        rect(2, 30, 124, 68, '#5d594a');
        rect(5, 34, 118, 60, '#ac8e6b');
        brushes(35, ['#d8c4a1', '#6e6656'], 'horizontal');
        c.font = 'bold 23px serif';
        c.textAlign = 'center';
        c.fillStyle = '#efe0ba';
        c.fillText(options.title ?? '虎 道 場', 64, 72);
    }
    if (kind === 'flame') {
        c.fillStyle = '#e69755';
        c.beginPath();
        c.moveTo(23, 112);
        c.lineTo(35, 67);
        c.lineTo(51, 83);
        c.lineTo(64, 14);
        c.lineTo(81, 76);
        c.lineTo(99, 52);
        c.lineTo(109, 113);
        c.closePath();
        c.fill();
        c.fillStyle = '#f4d18b';
        c.beginPath();
        c.moveTo(42, 112);
        c.lineTo(62, 66);
        c.lineTo(83, 115);
        c.closePath();
        c.fill();
    }
    if (kind === 'window') {
        rect(35, 18, 58, 88, '#ad9878');
        rect(40, 23, 48, 78, '#e6c78c');
        rect(62, 23, 3, 78, '#7d6d57');
    }
    const color = new THREE.CanvasTexture(canvas);
    color.colorSpace = THREE.SRGBColorSpace;
    color.magFilter = THREE.NearestFilter;
    color.minFilter = THREE.NearestMipmapLinearFilter;
    if (!['brick', 'roof', 'stone'].includes(kind))
        return { color };
    // 이미지 위쪽과 GL의 UV 위쪽을 맞춰 색과 normal의 flipY를 통일한다.
    const normal = new THREE.DataTexture(normalPixels(heights, 128, 128), 128, 128, THREE.RGBAFormat);
    normal.colorSpace = THREE.NoColorSpace;
    normal.flipY = color.flipY;
    normal.magFilter = THREE.NearestFilter;
    normal.minFilter = THREE.NearestMipmapLinearFilter;
    normal.generateMipmaps = true;
    normal.needsUpdate = true;
    return { color, normal };
}
