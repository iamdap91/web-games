import * as THREE from 'three';
function texture(width, height, draw) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context)
        throw new Error('마을 그림을 만들 수 없습니다.');
    draw(context);
    const result = new THREE.CanvasTexture(canvas);
    result.colorSpace = THREE.SRGBColorSpace;
    return result;
}
export function grassArt() {
    const result = texture(256, 256, (context) => {
        context.fillStyle = '#84ab6c';
        context.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 280; i++) {
            const x = (i * 83 + 17) % 256, y = (i * 53 + 29) % 256;
            context.fillStyle = i % 3 ? '#93b879' : '#769e64';
            context.beginPath();
            context.moveTo(x, y);
            context.lineTo(x + 4, y - 5);
            context.lineTo(x + 7, y);
            context.fill();
        }
    });
    result.wrapS = result.wrapT = THREE.RepeatWrapping;
    result.repeat.set(14, 20);
    return result;
}
export function wallArt(color) {
    return texture(256, 256, (context) => {
        context.fillStyle = color;
        context.fillRect(0, 0, 256, 256);
        context.fillStyle = '#675c4560';
        context.fillRect(0, 222, 256, 34);
        context.strokeStyle = '#fff8e550';
        context.lineWidth = 2;
        for (let y = 20; y < 222; y += 25) {
            context.beginPath();
            context.moveTo(0, y);
            context.lineTo(256, y);
            context.stroke();
        }
    });
}
export function roofArt(color) {
    return texture(256, 128, (context) => {
        context.fillStyle = color;
        context.fillRect(0, 0, 256, 128);
        context.strokeStyle = '#462b3755';
        context.lineWidth = 3;
        for (let y = 0; y < 128; y += 16) {
            context.beginPath();
            context.moveTo(0, y);
            context.lineTo(256, y);
            context.stroke();
            for (let x = y % 32 ? 0 : -16; x < 256; x += 32) {
                context.beginPath();
                context.moveTo(x, y);
                context.lineTo(x, y + 16);
                context.stroke();
            }
        }
    });
}
export function signArt(text) {
    return texture(384, 96, (context) => {
        context.fillStyle = '#eaddba';
        context.fillRect(3, 3, 378, 90);
        context.strokeStyle = '#806948';
        context.lineWidth = 6;
        context.strokeRect(7, 7, 370, 82);
        context.font = 'bold 36px sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillStyle = '#554733';
        context.fillText(text, 192, 48);
    });
}
export function plantArt(flower) {
    return texture(128, 160, (context) => {
        context.strokeStyle = '#526e3e';
        context.lineWidth = 7;
        for (let i = 0; i < 6; i++) {
            const x = 22 + i * 16, y = 45 + (i % 3) * 24;
            context.beginPath();
            context.moveTo(64, 154);
            context.quadraticCurveTo(x, 108, x, y);
            context.stroke();
            context.fillStyle = flower ? '#f3c95d' : '#7b9e5b';
            for (let j = 0; j < 5; j++) {
                const angle = (j / 5) * Math.PI * 2;
                context.beginPath();
                context.ellipse(x + Math.sin(angle) * 9, y + Math.cos(angle) * 9, 7, 10, angle, 0, Math.PI * 2);
                context.fill();
            }
            if (flower) {
                context.fillStyle = '#97633e';
                context.beginPath();
                context.arc(x, y, 5, 0, Math.PI * 2);
                context.fill();
            }
        }
    });
}
