import * as THREE from 'three';
/** 직접 작성한 픽셀 무늬를 저해상도 캔버스에 그려 건축의 UV에 붙인다. */
export function pixelArt(kind, options = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = kind === 'leaves' ? 96 : 128;
    canvas.height = kind === 'facade' ? 96 : 128;
    const c = canvas.getContext('2d');
    if (!c)
        throw new Error('픽셀 그림 캔버스를 만들지 못했습니다.');
    let seed = 813;
    const random = () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
    };
    const box = (x, y, w, h, color) => {
        c.fillStyle = color;
        c.fillRect(x, y, w, h);
    };
    if (kind === 'stone' || kind === 'ground') {
        box(0, 0, 128, 128, kind === 'ground' ? '#949c77' : '#656c53');
        const tile = kind === 'stone' ? 16 : 12;
        const colors = kind === 'stone'
            ? ['#8d8a69', '#a79e78', '#777a5d', '#b3a581', '#98906f']
            : ['#a7a982', '#a1a67f', '#afb089', '#9da17a', '#aaa981'];
        for (let y = 0; y < 128; y += tile)
            for (let x = -tile; x < 128; x += tile * 2) {
                const xx = x + ((y / tile) % 2 ? tile : 0);
                const color = colors[Math.floor(random() * colors.length)] ?? colors[0] ?? '#999';
                box(xx + 1, y + 1, tile * 2 - 2, tile - 2, color);
                box(xx + 2, y + 1, tile * 2 - 4, 1, kind === 'ground' ? '#b1b28b' : '#c9bf96');
                box(xx + 2, y + tile - 3, tile * 2 - 4, 1, kind === 'ground' ? '#929c75' : '#626a52');
                for (let i = 0; i < 5; i++)
                    box(xx + Math.floor(random() * tile * 2), y + 3 + Math.floor(random() * (tile - 5)), 1 + Math.floor(random() * 3), 1, kind === 'ground' ? '#a2a77d' : '#747c58');
            }
    }
    if (kind === 'grass') {
        box(0, 0, 128, 128, '#526346');
        for (let i = 0; i < 700; i++) {
            box(Math.floor(random() * 128), Math.floor(random() * 128), 1 + Math.floor(random() * 4), 1 + Math.floor(random() * 3), ['#70805a', '#3e5741', '#88905d', '#5b6d47'][Math.floor(random() * 4)] ?? '#607050');
        }
    }
    if (kind === 'roof') {
        box(0, 0, 128, 128, '#293f42');
        for (let y = 0; y < 128; y += 12)
            for (let x = 0; x < 128; x += 8) {
                box(x + 1, y + 1, 6, 10, ['#657b70', '#4b6561', '#8b9781'][Math.floor(random() * 3)] ??
                    '#73836d');
                box(x + 1, y + 1, 2, 10, '#98a487');
                box(x + 6, y + 2, 1, 9, '#253d42');
                box(x, y + 10, 8, 2, '#21383c');
                if (options.damaged && random() < 0.23)
                    box(x, y, 8, 12, '#514e3c');
            }
    }
    if (kind === 'facade') {
        box(0, 0, 128, 96, '#c2b38a');
        for (let i = 0; i < 260; i++)
            box(Math.floor(random() * 128), Math.floor(random() * 96), 2, 1, ['#b0a27b', '#e0cda5', '#aba079'][Math.floor(random() * 3)] ?? '#ccc');
        box(0, 65, 128, 31, '#746d50');
        for (let y = 67; y < 96; y += 9)
            for (let x = -8; x < 128; x += 20) {
                box(x + ((y / 9) % 2 ? 8 : 0), y, 18, 7, '#b3a781');
                box(x + 1, y, 16, 1, '#d3c29c');
            }
        [3, 40, 83, 121].forEach((x) => {
            box(x, 3, 4, 65, '#5c4a35');
            box(x + 1, 3, 1, 65, '#9c8152');
        });
        box(0, 6, 128, 5, '#574b35');
        box(0, 55, 128, 5, '#67543b');
        for (const x of [15, 91]) {
            box(x - 3, 24, 22, 29, '#846a42');
            box(x, 25, 16, 26, options.damaged ? '#293438' : '#dec68c');
            box(x + 7, 25, 2, 26, '#5c593e');
            box(x, 36, 16, 2, '#5c593e');
            box(x - 5, 22, 3, 32, '#967140');
            box(x + 18, 22, 3, 32, '#967140');
        }
        box(48, 28, 31, 67, '#4c4333');
        box(50, 30, 27, 65, '#765333');
        for (let x = 51; x < 77; x += 5)
            box(x, 31, 2, 62, '#a18455');
        box(48, 92, 31, 4, '#cdb990');
        box(73, 65, 2, 3, '#ebd294');
        if (options.damaged) {
            box(9, 12, 15, 5, '#837454');
            box(29, 39, 2, 21, '#5f624d');
            box(31, 56, 5, 2, '#5f624d');
            box(48, 76, 31, 5, '#584a34');
        }
    }
    if (kind === 'leaves') {
        const colors = ['#243d35', '#355248', '#45694b', '#6c8250', '#9aa169'];
        for (let layer = 0; layer < 4; layer++)
            for (let i = 0; i < 115; i++) {
                const angle = random() * Math.PI * 2, radius = Math.sqrt(random());
                const x = 48 + Math.cos(angle) * radius * (39 - layer * 3);
                const y = 59 + Math.sin(angle) * radius * (48 - layer * 7) - layer * 4;
                box(Math.floor(x / 2) * 2, Math.floor(y / 2) * 2, 5 + Math.floor(random() * 8), 3 + Math.floor(random() * 7), colors[layer] ?? '#456');
            }
        for (let i = 0; i < 90; i++) {
            const x = Math.floor(random() * 70 + 14), y = Math.floor(random() * 72 + 8);
            if (c.getImageData(x, y, 1, 1).data[3])
                box(x, y, 3, 2, random() > 0.5 ? '#adc078' : '#314e3e');
        }
    }
    if (kind === 'sign') {
        box(2, 27, 124, 69, '#382e24');
        box(5, 30, 118, 62, '#755339');
        box(9, 34, 110, 54, options.damaged ? '#6d5a3e' : '#a77645');
        box(11, 35, 108, 2, '#d6b378');
        c.font = 'bold 25px serif';
        c.textAlign = 'center';
        c.fillStyle = '#ead7a4';
        c.fillText(options.title ?? '虎 道 場', 64, 72);
        if (options.damaged) {
            box(45, 29, 3, 56, '#352f25');
            box(49, 62, 24, 3, '#352f25');
        }
    }
    if (kind === 'window') {
        box(38, 20, 52, 82, '#b0a275');
        box(41, 23, 46, 76, '#f3cd73');
        box(42, 26, 43, 3, '#fff0b0');
        box(61, 23, 5, 76, '#80654a');
        box(41, 48, 46, 4, '#80654a');
        box(41, 74, 46, 4, '#80654a');
    }
    if (kind === 'flame') {
        c.fillStyle = '#e57336';
        c.beginPath();
        c.moveTo(28, 105);
        c.lineTo(16, 64);
        c.lineTo(45, 75);
        c.lineTo(57, 7);
        c.lineTo(82, 49);
        c.lineTo(99, 39);
        c.lineTo(109, 86);
        c.lineTo(88, 115);
        c.closePath();
        c.fill();
        c.fillStyle = '#ffc96c';
        c.beginPath();
        c.moveTo(37, 107);
        c.lineTo(45, 66);
        c.lineTo(65, 50);
        c.lineTo(80, 93);
        c.lineTo(90, 79);
        c.lineTo(88, 110);
        c.closePath();
        c.fill();
        box(52, 91, 18, 24, '#fff1ae');
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter =
        kind === 'leaves' || kind === 'sign' || kind === 'flame'
            ? THREE.NearestFilter
            : THREE.NearestMipmapLinearFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}
