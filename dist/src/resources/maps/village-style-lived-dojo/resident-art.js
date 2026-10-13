import * as THREE from 'three';
/** 원본 주인공과 함께 읽히도록 발 기준의 저밀도 픽셀 수련생을 직접 그린다. */
export function residentFrames() {
    return [0, 1, 2, 3].map((pose) => {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 48;
        const c = canvas.getContext('2d');
        if (!c)
            throw new Error('수련생 그림을 만들지 못했습니다.');
        const rect = (x, y, w, h, color) => {
            c.fillStyle = color;
            c.fillRect(x, y, w, h);
        };
        const outline = '#394746';
        const lean = pose === 2 ? 2 : 0;
        rect(10 + lean, 4, 12, 4, outline);
        rect(8 + lean, 8, 16, 12, outline);
        rect(10 + lean, 9, 12, 10, '#c8a580');
        rect(10 + lean, 8, 12, 4, '#555047');
        rect(12 + lean, 14, 2, 2, outline);
        rect(19 + lean, 14, 2, 2, outline);
        rect(14 + lean, 18, 5, 2, '#9d7559');
        rect(9, 20, 15, 17, outline);
        rect(11, 21, 11, 13, '#789084');
        rect(12, 21, 3, 12, '#aebba3');
        rect(14, 23, 2, 11, '#4f6c65');
        rect(10, 33, 13, 3, '#c4ad79');
        rect(10, 36, 5, 9, '#4f6463');
        rect(18, 36, 5, 9, '#4f6463');
        rect(8, 44, 8, 4, outline);
        rect(18, 44, 8, 4, outline);
        const raised = pose === 1 || pose === 2;
        rect(raised ? 3 : 5, raised ? 18 : 23, 6, raised ? 7 : 12, outline);
        rect(raised ? 4 : 6, raised ? 19 : 24, 4, raised ? 5 : 8, '#789084');
        rect(raised ? 2 : 6, raised ? 16 : 32, 5, 4, '#c8a580');
        rect(23, pose === 3 ? 22 : 25, 5, 10, outline);
        rect(23, pose === 3 ? 23 : 26, 3, 6, '#789084');
        rect(pose === 3 ? 20 : 24, pose === 3 ? 21 : 33, 5, 4, '#c8a580');
        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.generateMipmaps = false;
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
    });
}
