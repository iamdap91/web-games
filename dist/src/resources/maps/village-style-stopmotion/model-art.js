import * as THREE from 'three';
function random(seed) {
    let value = seed;
    return () => {
        value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
        return value / 4294967296;
    };
}
export function paintTexture(color, edge = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const c = canvas.getContext('2d');
    if (!c)
        throw new Error('손칠 화면을 만들 수 없어요.');
    const rand = random([...color].reduce((sum, letter) => sum + letter.charCodeAt(0), 0) +
        (edge ? 43 : 0));
    c.fillStyle = edge ? '#b79b6e' : color;
    c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 180; i++) {
        c.fillStyle = i % 3 ? '#fff2be18' : '#35271922';
        const x = rand() * 256, y = rand() * 256;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + 12 + rand() * 42, y - 3);
        c.lineTo(x + 15 + rand() * 48, y + 8 + rand() * 13);
        c.lineTo(x - 4, y + 9);
        c.fill();
    }
    if (edge) {
        for (let x = 0; x < 256; x += 11) {
            c.strokeStyle = '#6f5434';
            c.lineWidth = 3;
            c.beginPath();
            c.moveTo(x, 256);
            c.bezierCurveTo(x + 4, 150, x - 3, 70, x + 3, 0);
            c.stroke();
            c.strokeStyle = '#efd4a3';
            c.lineWidth = 2;
            c.beginPath();
            c.moveTo(x + 5, 256);
            c.lineTo(x + 7, 0);
            c.stroke();
        }
        c.fillStyle = '#d7b983';
        c.fillRect(0, 0, 256, 12);
        c.fillRect(0, 245, 256, 11);
    }
    else {
        // 굵은 붓 결 아래 원래 판지가 드러나는 벗겨진 모서리.
        c.strokeStyle = '#ad885b';
        c.lineWidth = 7;
        for (let i = 0; i < 15; i++) {
            const x = rand() * 256;
            c.beginPath();
            c.moveTo(x, 0);
            c.lineTo(x + 5, 6 + rand() * 17);
            c.stroke();
        }
        c.strokeStyle = '#f1d6a0';
        c.lineWidth = 1;
        for (let i = 0; i < 170; i++) {
            const x = rand() * 256, y = rand() * 256;
            c.beginPath();
            c.moveTo(x, y);
            c.lineTo(x + 2 + rand() * 16, y + rand() * 2);
            c.stroke();
        }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}
export function cardTexture(kind, label = '') {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const c = canvas.getContext('2d');
    if (!c)
        throw new Error('모형 조각을 만들 수 없어요.');
    const polygon = (points, fill) => {
        c.fillStyle = fill;
        c.beginPath();
        points.forEach(([x, y], i) => {
            if (i)
                c.lineTo(x, y);
            else
                c.moveTo(x, y);
        });
        c.closePath();
        c.fill();
    };
    if (kind === 'sign') {
        polygon([
            [5, 15],
            [246, 4],
            [250, 108],
            [11, 121],
        ], '#bf9c67');
        polygon([
            [13, 24],
            [237, 15],
            [241, 102],
            [19, 113],
        ], '#e9d9a8');
        c.strokeStyle = '#756148';
        c.lineWidth = 3;
        c.strokeRect(25, 29, 207, 69);
        c.fillStyle = '#4e5143';
        c.font = 'bold 32px serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(label, 130, 66);
    }
    else if (kind === 'door') {
        polygon([
            [30, 5],
            [222, 15],
            [234, 126],
            [24, 126],
        ], '#695245');
        polygon([
            [43, 20],
            [209, 26],
            [216, 126],
            [42, 126],
        ], '#9b684b');
        c.strokeStyle = '#e2bc88';
        c.lineWidth = 4;
        for (let x = 55; x < 210; x += 25) {
            c.beginPath();
            c.moveTo(x, 25);
            c.lineTo(x + 2, 122);
            c.stroke();
        }
        c.fillStyle = '#eee0b4';
        c.fillRect(171, 75, 13, 10);
    }
    else if (kind === 'window') {
        polygon([
            [7, 4],
            [247, 11],
            [252, 122],
            [12, 126],
        ], '#cfb88b');
        polygon([
            [22, 20],
            [234, 24],
            [234, 108],
            [26, 112],
        ], '#4c6865');
        c.fillStyle = '#273a36';
        c.fillRect(34, 29, 85, 69);
        c.fillRect(134, 32, 88, 66);
        c.fillStyle = '#b2bd98';
        c.fillRect(34, 34, 82, 18);
        c.fillRect(139, 35, 78, 18);
        c.strokeStyle = '#ac744e';
        c.lineWidth = 9;
        c.beginPath();
        c.moveTo(126, 20);
        c.lineTo(130, 114);
        c.stroke();
    }
    else if (kind === 'plant') {
        polygon([
            [118, 128],
            [125, 45],
            [136, 128],
        ], '#755239');
        for (const [x, y, r, col] of [
            [80, 57, 37, '#777f49'],
            [132, 35, 38, '#829752'],
            [173, 65, 38, '#68794a'],
            [121, 77, 46, '#9a9b58'],
        ]) {
            c.fillStyle = '#e1ce9f';
            c.beginPath();
            c.arc(x, y, r + 4, 0, Math.PI * 2);
            c.fill();
            c.fillStyle = col;
            c.beginPath();
            c.arc(x, y, r, 0, Math.PI * 2);
            c.fill();
            c.fillStyle = '#d7cb8877';
            c.fillRect(x - r / 2, y - 5, r, 6);
        }
    }
    else if (kind === 'smoke') {
        polygon([
            [60, 114],
            [38, 91],
            [60, 70],
            [80, 75],
            [70, 46],
            [95, 25],
            [117, 38],
            [128, 9],
            [158, 16],
            [165, 42],
            [194, 52],
            [204, 82],
            [175, 112],
        ], '#d5c7a5');
        c.strokeStyle = '#89795d';
        c.lineWidth = 4;
        c.beginPath();
        c.arc(125, 61, 30, 0, Math.PI * 1.5);
        c.stroke();
    }
    else {
        polygon([
            [68, 121],
            [44, 85],
            [84, 55],
            [98, 4],
            [125, 59],
            [159, 31],
            [152, 70],
            [211, 88],
            [190, 125],
        ], '#bf522f');
        polygon([
            [80, 122],
            [82, 88],
            [112, 50],
            [129, 91],
            [154, 64],
            [175, 119],
        ], '#e6a737');
        polygon([
            [100, 125],
            [112, 89],
            [131, 118],
            [149, 95],
            [158, 125],
        ], '#f5d671');
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}
