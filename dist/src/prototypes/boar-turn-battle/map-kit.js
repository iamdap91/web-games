import * as THREE from 'three';
const palette = {
    earth: ['#a08b67', '#b29a72', '#857451'],
    grass: ['#6c7c51', '#84905f', '#536b49'],
    stone: ['#999a8a', '#b1b2a0', '#777e74'],
    bark: ['#685c43', '#847454', '#494c38'],
    moss: ['#5d724c', '#85905d', '#445b42'],
    wood: ['#8c7554', '#b29a6e', '#675c43'],
    cloth: ['#78948b', '#a0ada0', '#526d64'],
    snow: ['#c7dbdf', '#e4e8df', '#a7c2cf'],
    ice: ['#83b2c5', '#c0dbe0', '#6692ae'],
    basalt: ['#4c4745', '#6c6055', '#343c3d'],
    lava: ['#e77734', '#edaf59', '#ac4a24'],
    ash: ['#71645a', '#8c7865', '#56514b'],
    bamboo: ['#648266', '#90a17b', '#3e6453'],
    leaf: ['#496d50', '#73916a', '#345749'],
    rope: ['#aa9c73', '#c0b28d', '#877e60'],
};
/** 지역 모형·표면과 해당 지형의 렌더 자원을 소유한다. */
export class MapKit {
    root = new THREE.Group();
    foreground = new THREE.Group();
    surfaces = new Map();
    textures = [];
    canvases = [];
    material(kind) {
        const cached = this.surfaces.get(kind);
        if (cached)
            return cached;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 128;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            throw new Error('무대 소재를 그릴 수 없습니다.');
        const tones = palette[kind];
        ctx.fillStyle = tones[0];
        ctx.fillRect(0, 0, 128, 128);
        let seed = kind.length * 301 + 17;
        const random = () => {
            seed = (seed * 16807) % 2147483647;
            return seed / 2147483647;
        };
        const grain = kind === 'snow' ? 120 : kind === 'earth' || kind === 'ash' ? 260 : 480;
        for (let i = 0; i < grain; i++) {
            ctx.globalAlpha = 0.12 + random() * 0.17;
            ctx.fillStyle = tones[random() > 0.5 ? 1 : 2];
            const x = Math.floor(random() * 64) * 2, y = Math.floor(random() * 64) * 2;
            ctx.fillRect(x, y, 2 + Math.floor(random() * 4) * 2, kind === 'bark' || kind === 'wood'
                ? 8 + random() * 24
                : 2 + random() * 5);
        }
        ctx.globalAlpha = 0.45;
        ctx.strokeStyle = tones[2];
        ctx.lineWidth = 1;
        if (['stone', 'basalt'].includes(kind)) {
            for (let row = 0; row < 5; row++)
                for (let col = -1; col < 4; col++) {
                    const x = col * 43 + (row % 2) * 20, y = row * 27;
                    ctx.strokeRect(x, y, 42, 26);
                }
        }
        else if (['bark', 'wood', 'bamboo', 'rope'].includes(kind)) {
            for (let i = 0; i < 13; i++) {
                const x = i * 11 + random() * 4;
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.bezierCurveTo(x + 5, 35, x - 4, 80, x + 2, 128);
                ctx.stroke();
            }
        }
        else if (kind === 'ice') {
            ctx.strokeStyle = tones[1];
            for (let i = 0; i < 6; i++) {
                ctx.beginPath();
                ctx.moveTo(i * 31 - 35, 0);
                ctx.lineTo(i * 31 + 35, 128);
                ctx.stroke();
            }
        }
        ctx.globalAlpha = 1;
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        const material = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: kind === 'ice' ? 0.36 : 0.98,
            bumpMap: texture,
            bumpScale: kind === 'snow' ? 0.02 : 0.055,
            flatShading: true,
        });
        if (kind === 'lava') {
            material.emissive.setHex(0xd65822);
            material.emissiveIntensity = 0.8;
        }
        this.surfaces.set(kind, material);
        this.textures.push(texture);
        this.canvases.push(canvas);
        return material;
    }
    mesh(geometry, kind, position, parent = this.root) {
        const mesh = new THREE.Mesh(geometry, this.material(kind));
        mesh.position.set(position.x, position.y, position.z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    }
    box(position, size, kind, parent = this.root) {
        return this.mesh(new THREE.BoxGeometry(size.x, size.y, size.z), kind, position, parent);
    }
    rock(position, scale, kind = 'stone') {
        const mesh = this.mesh(new THREE.IcosahedronGeometry(1, 1), kind, position);
        mesh.scale.set(scale.x, scale.y, scale.z);
        return mesh;
    }
    pine(position, height, options = {}) {
        this.mesh(new THREE.CylinderGeometry(height * 0.025, height * 0.055, height * 0.8, 7), 'bark', { ...position, y: height * 0.4 });
        for (let i = 0; i < 3; i++) {
            const radius = height * (0.27 - i * 0.045), y = height * (0.5 + i * 0.18);
            const crown = this.mesh(new THREE.ConeGeometry(radius, height * 0.48, 7), options.snow ? 'snow' : 'moss', { ...position, y });
            crown.rotation.y = i * 0.37;
            crown.scale.z = 0.82;
            if (options.snow) {
                const skirt = this.mesh(new THREE.ConeGeometry(radius * 1.03, height * 0.16, 7), 'bamboo', { ...position, y: y - height * 0.18 });
                skirt.rotation.y = i * 0.37;
                skirt.scale.z = 0.82;
            }
        }
    }
    rootBranch(points, radius) {
        this.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p.x, p.y, p.z))), 12, radius, 7, false), 'bark', { x: 0, y: 0, z: 0 });
    }
    dispose() {
        const geometry = new Set(), materials = new Set();
        for (const root of [this.root, this.foreground])
            root.traverse((object) => {
                if (object instanceof THREE.Mesh) {
                    geometry.add(object.geometry);
                    for (const material of Array.isArray(object.material)
                        ? object.material
                        : [object.material])
                        materials.add(material);
                }
            });
        geometry.forEach((item) => item.dispose());
        materials.forEach((item) => item.dispose());
        this.textures.forEach((item) => item.dispose());
        this.canvases.forEach((canvas) => {
            canvas.width = canvas.height = 1;
        });
        this.surfaces.clear();
        this.root.clear();
        this.foreground.clear();
    }
}
