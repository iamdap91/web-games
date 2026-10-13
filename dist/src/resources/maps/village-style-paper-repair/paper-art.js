import * as THREE from 'three';
const ink = '#574738', cream = '#fbefd6';
/** 재료 이미지 없이 종이 섬유·잉크선·색종이 면을 직접 그린다. */
export function paperTexture(width, height, draw) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const c = canvas.getContext('2d');
    if (!c)
        throw new Error('종이 그림을 그릴 수 없습니다.');
    draw(c, width, height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    return texture;
}
export function fibers(c, width, height) {
    for (let i = 0; i < 220; i++) {
        const x = (i * 73.63) % width, y = (i * 57.17) % height;
        c.strokeStyle = i % 3 ? '#6a473511' : '#fff8df55';
        c.lineWidth = 0.9;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + 4 + (i % 9), y + (i % 3) - 1);
        c.stroke();
    }
}
function rounded(c, x, y, width, height, fill) {
    c.fillStyle = fill;
    c.strokeStyle = ink;
    c.lineWidth = 4;
    c.beginPath();
    c.roundRect(x, y, width, height, 5);
    c.fill();
    c.stroke();
}
export function facadeArt(color, kind, damaged) {
    return paperTexture(384, 420, (c, w, h) => {
        c.fillStyle = cream;
        c.fillRect(0, 0, w, h);
        c.fillStyle = damaged ? '#dfcba5' : color;
        c.fillRect(14, 95, w - 28, h - 105);
        c.beginPath();
        c.moveTo(14, 96);
        c.lineTo(w / 2, 9);
        c.lineTo(w - 14, 96);
        c.closePath();
        c.fill();
        fibers(c, w, h);
        c.strokeStyle = ink;
        c.lineWidth = 4;
        c.strokeRect(18, 99, w - 36, h - 115);
        c.beginPath();
        c.moveTo(20, 92);
        c.lineTo(w / 2, 13);
        c.lineTo(w - 20, 92);
        c.stroke();
        c.lineWidth = 6;
        c.beginPath();
        c.moveTo(19, 120);
        c.lineTo(w - 19, 120);
        c.moveTo(w / 2, 103);
        c.lineTo(w / 2, 164);
        c.stroke();
        rounded(c, 151, 247, 82, 156, '#745b44');
        c.strokeStyle = '#f2d7a0';
        c.lineWidth = 3;
        for (let i = 0; i < 4; i++) {
            c.beginPath();
            c.moveTo(167 + i * 16, 254);
            c.lineTo(167 + i * 16, 401);
            c.stroke();
        }
        c.fillStyle = '#dbaf57';
        c.beginPath();
        c.arc(218, 330, 5, 0, Math.PI * 2);
        c.fill();
        for (const x of [44, 268]) {
            rounded(c, x, 186, 74, 82, '#5d7976');
            c.strokeStyle = '#f8efd0';
            c.lineWidth = 5;
            c.beginPath();
            c.moveTo(x + 37, 190);
            c.lineTo(x + 37, 265);
            c.moveTo(x + 4, 226);
            c.lineTo(x + 70, 226);
            c.stroke();
            c.fillStyle = '#ebcf9a';
            c.fillRect(x - 4, 269, 82, 9);
        }
        c.lineWidth = 2;
        c.strokeStyle = '#75513c55';
        for (let i = 0; i < 7; i++) {
            const y = 295 + i * 15;
            c.beginPath();
            c.moveTo(32, y);
            c.lineTo(113, y + 3);
            c.moveTo(268, y + 2);
            c.lineTo(348, y);
            c.stroke();
        }
        if (kind === 'books') {
            for (let i = 0; i < 7; i++) {
                c.fillStyle = ['#c16450', '#456a80', '#ccac50'][i % 3] ?? color;
                c.fillRect(39 + i * 11, 330 - (i % 3) * 7, 8, 44 + (i % 3) * 7);
            }
        }
        if (kind === 'sew') {
            c.strokeStyle = '#f9e6b6';
            c.setLineDash([6, 5]);
            c.strokeRect(41, 320, 72, 54);
            c.setLineDash([]);
        }
        if (damaged) {
            c.fillStyle = cream;
            c.beginPath();
            c.moveTo(247, 98);
            c.lineTo(226, 134);
            c.lineTo(263, 148);
            c.lineTo(251, 193);
            c.lineTo(294, 214);
            c.lineTo(288, 95);
            c.closePath();
            c.fill();
            c.save();
            c.translate(194, 322);
            c.rotate(-0.16);
            rounded(c, -58, -18, 115, 27, '#aa8761');
            c.restore();
        }
    });
}
export function roofArt(color, damaged) {
    return paperTexture(256, 256, (c, w, h) => {
        c.fillStyle = cream;
        c.fillRect(0, 0, w, h);
        c.fillStyle = damaged ? '#b6a083' : color;
        c.fillRect(9, 9, w - 18, h - 18);
        fibers(c, w, h);
        c.strokeStyle = ink;
        c.lineWidth = 3;
        c.strokeRect(13, 13, w - 26, h - 26);
        c.strokeStyle = '#fff2d366';
        c.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
            c.beginPath();
            c.moveTo(26, 33 + i * 36);
            c.lineTo(w - 25, 35 + i * 36);
            c.stroke();
        }
        c.setLineDash([4, 6]);
        c.strokeStyle = ink;
        c.beginPath();
        c.moveTo(32, 18);
        c.lineTo(32, h - 17);
        c.stroke();
        c.setLineDash([]);
        if (damaged) {
            c.fillStyle = '#e8d6b2';
            c.fillRect(117, 29, 79, 97);
            c.strokeStyle = '#715b44';
            c.strokeRect(122, 34, 69, 87);
        }
    });
}
export function signArt(text) {
    return paperTexture(320, 96, (c, w, h) => {
        c.fillStyle = '#fff4d6';
        c.fillRect(0, 0, w, h);
        fibers(c, w, h);
        c.strokeStyle = ink;
        c.lineWidth = 5;
        c.strokeRect(7, 7, w - 14, h - 14);
        c.font = 'bold 39px serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillStyle = ink;
        c.fillText(text, w / 2, h / 2 + 2);
    });
}
export function treeArt(color, flowers) {
    return paperTexture(256, 384, (c) => {
        c.lineJoin = 'round';
        c.lineCap = 'round';
        c.strokeStyle = cream;
        c.lineWidth = 19;
        c.beginPath();
        c.moveTo(129, 374);
        c.lineTo(126, 138);
        c.moveTo(127, 280);
        c.lineTo(55, 206);
        c.moveTo(127, 245);
        c.lineTo(203, 162);
        c.stroke();
        c.strokeStyle = ink;
        c.lineWidth = 11;
        c.stroke();
        for (let i = 0; i < 8; i++) {
            const x = 50 + ((i * 53) % 163), y = 70 + ((i * 67) % 188);
            c.fillStyle = color;
            c.strokeStyle = cream;
            c.lineWidth = 12;
            c.beginPath();
            c.ellipse(x, y, 38 + (i % 3) * 5, 29, i % 2 ? -0.5 : 0.7, 0, Math.PI * 2);
            c.fill();
            c.stroke();
            c.strokeStyle = ink;
            c.lineWidth = 3;
            c.stroke();
            c.beginPath();
            c.moveTo(x - 21, y + 6);
            c.lineTo(x + 21, y - 6);
            c.stroke();
            if (flowers && i % 2) {
                c.fillStyle = '#cf806a';
                c.beginPath();
                c.arc(x, y, 13, 0, Math.PI * 2);
                c.fill();
                c.fillStyle = '#f2d66e';
                c.beginPath();
                c.arc(x, y, 5, 0, Math.PI * 2);
                c.fill();
            }
        }
    });
}
