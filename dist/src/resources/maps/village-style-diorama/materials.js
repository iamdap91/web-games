import * as THREE from 'three';
/** 사진 대신 자체 질감의 결·얼룩을 그려 프리렌더 모형에 사용한다. */
export class DioramaMaterials {
    textures = [];
    materials = [];
    seed = 197;
    random() {
        this.seed = (this.seed * 16807) % 2147483647;
        return this.seed / 2147483647;
    }
    texture(kind) {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            throw new Error('질감 화면을 만들지 못했습니다.');
        const colors = {
            stone: '#b6b1a1',
            wood: '#9d7450',
            plaster: '#e6d8bc',
            cloth: '#b9996e',
            earth: '#ac9676',
        };
        ctx.fillStyle = colors[kind];
        ctx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 4200; i++) {
            const x = this.random() * 256, y = this.random() * 256;
            ctx.fillStyle =
                kind === 'earth'
                    ? this.random() > 0.5
                        ? '#fff9e308'
                        : '#483c3008'
                    : this.random() > 0.5
                        ? '#fff9e315'
                        : '#483c3015';
            ctx.fillRect(x, y, kind === 'wood' ? 1 : 2 + this.random() * 5, kind === 'wood' ? 3 + this.random() * 18 : 2 + this.random() * 4);
        }
        if (kind === 'wood') {
            ctx.strokeStyle = '#51382640';
            for (let i = 0; i < 20; i++) {
                const x = this.random() * 256;
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.bezierCurveTo(x + 12, 80, x - 10, 180, x + 4, 256);
                ctx.stroke();
            }
        }
        if (kind === 'cloth') {
            for (let i = 0; i < 256; i += 3) {
                ctx.fillStyle = '#faf0d515';
                ctx.fillRect(i, 0, 1, 256);
                ctx.fillRect(0, i, 256, 1);
            }
            ctx.fillStyle = '#67492b50';
            ctx.fillRect(0, 0, 256, 5);
            ctx.fillRect(0, 251, 256, 5);
        }
        if (kind === 'plaster') {
            const shade = ctx.createLinearGradient(0, 160, 0, 256);
            shade.addColorStop(0, '#63734c00');
            shade.addColorStop(1, '#63734c35');
            ctx.fillStyle = shade;
            ctx.fillRect(0, 0, 256, 256);
            ctx.strokeStyle = '#74685038';
            for (let i = 0; i < 6; i++) {
                const x = this.random() * 256, y = this.random() * 230;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + 3, y + 10);
                ctx.lineTo(x - 2, y + 18);
                ctx.stroke();
            }
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.anisotropy = 4;
        if (kind === 'earth')
            texture.repeat.set(3, 3);
        this.textures.push(texture);
        return texture;
    }
    surface(color, kind) {
        const texture = kind ? this.texture(kind) : null;
        const material = new THREE.MeshStandardMaterial({
            color,
            roughness: 0.95,
            map: texture,
            bumpMap: texture,
            bumpScale: kind === 'stone' ? 0.08 : 0.03,
        });
        this.materials.push(material);
        return material;
    }
    sign(text) {
        const c = document.createElement('canvas');
        c.width = 128;
        c.height = 64;
        const ctx = c.getContext('2d');
        if (!ctx)
            throw new Error('간판을 만들지 못했습니다.');
        ctx.fillStyle = '#7b5738';
        ctx.fillRect(0, 0, 128, 64);
        ctx.fillStyle = '#dcc599';
        ctx.fillRect(4, 4, 120, 56);
        ctx.fillStyle = '#514433';
        ctx.font = 'bold 26px serif';
        ctx.textAlign = 'center';
        ctx.fillText(text, 64, 43);
        const texture = new THREE.CanvasTexture(c);
        texture.colorSpace = THREE.SRGBColorSpace;
        this.textures.push(texture);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            alphaTest: 0.5,
        });
        this.materials.push(material);
        return material;
    }
    dispose() {
        this.textures.forEach((t) => t.dispose());
        this.materials.forEach((m) => m.dispose());
    }
}
