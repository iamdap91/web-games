import manifest from '../../../../resources/manifest.json' with { type: 'json' };
import { resourceUrl } from '../../catalog/resource-url.js';
import { AnimationPlayer, } from '../../preview/animation-player.js';
import { facilities, } from './village.js';
const streetY = 430;
const footY = (z) => z < 0 ? streetY + z * 162 : streetY - z * 26;
/** 전후경은 서로 다른 카메라 계수, 캐릭터는 원본 프레임과 pivot을 사용한다. */
export class SideDrawing {
    canvas;
    ready;
    context;
    images = new Map();
    animation;
    width = 1000;
    height = 560;
    camera = 8.5;
    scale = 1;
    originY = 0;
    previousElapsed = 0;
    motion = 'stand-right';
    disposed = false;
    constructor(canvas) {
        this.canvas = canvas;
        const context = canvas.getContext('2d');
        if (!context)
            throw new Error('2D Canvas를 사용할 수 없습니다.');
        this.context = context;
        const asset = manifest.assets.find((a) => a.id === 'ai/tiger-hero');
        if (!asset)
            throw new Error('승인된 아타호 리소스가 없습니다.');
        const motions = new Map(Object.entries(asset.animations).filter(([name]) => ['stand-left', 'stand-right', 'move-left', 'move-right'].includes(name)));
        this.animation = new AnimationPlayer(motions, this.motion);
        this.ready = Promise.all([...motions.values()]
            .flatMap((a) => a.frames)
            .map((frame) => this.load(frame))).then(() => undefined);
    }
    load(frame) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => {
                if (!this.disposed)
                    this.images.set(frame.localPath, image);
                resolve();
            };
            image.onerror = () => reject(new Error(`아타호 프레임 로딩 실패: ${frame.localPath}`));
            image.src = resourceUrl(frame.localPath).href;
        });
    }
    resize() {
        const bounds = this.canvas.getBoundingClientRect();
        this.width = bounds.width;
        this.height = bounds.height;
        const dpr = Math.min(2, devicePixelRatio || 1);
        this.canvas.width = Math.round(this.width * dpr);
        this.canvas.height = Math.round(this.height * dpr);
    }
    project(point) {
        return {
            x: this.width / 2 + (point.x - this.camera) * 60 * this.scale,
            y: this.originY + footY(point.z) * this.scale,
        };
    }
    get diagnostics() {
        return {
            cameraX: this.camera,
            layers: [
                {
                    name: 'ridge',
                    ratio: 0.12,
                    offset: -this.camera * 60 * 0.12 * this.scale,
                },
                {
                    name: 'backHouses',
                    ratio: 0.38,
                    offset: -this.camera * 60 * 0.38 * this.scale,
                },
                { name: 'street', ratio: 1, offset: -this.camera * 60 * this.scale },
                {
                    name: 'foreground',
                    ratio: 1.15,
                    offset: -this.camera * 60 * 1.15 * this.scale,
                },
            ],
        };
    }
    pointerToWorld(clientX, clientY) {
        const bounds = this.canvas.getBoundingClientRect();
        const x = this.camera +
            (clientX - bounds.left - this.width / 2) / (60 * this.scale);
        const y = clientY - bounds.top;
        let z = 0;
        if (x >= 12 &&
            x <= 28 &&
            y < this.project({ x, z: -1 }).y + 55 * this.scale)
            z = -1;
        else if (x >= 12 &&
            x <= 36 &&
            y < this.project({ x, z: 1 }).y + 9 * this.scale)
            z = 1;
        return { x, z };
    }
    render(snapshot, overview) {
        if (this.disposed)
            return;
        this.scale = overview
            ? Math.min(this.width / 2440, this.height / 560)
            : this.height / 560;
        const halfView = this.width / (120 * this.scale);
        this.camera = overview
            ? 19
            : Math.max(Math.min(8.5, halfView - 0.5), Math.min(Math.max(29.5, 38.5 - halfView), snapshot.position.x));
        this.originY = overview
            ? this.height * 0.63 - streetY * this.scale
            : this.height - 560 * this.scale;
        const c = this.context;
        c.setTransform(this.canvas.width / Math.max(1, this.width), 0, 0, this.canvas.height / Math.max(1, this.height), 0, 0);
        const sky = c.createLinearGradient(0, 0, 0, this.height);
        sky.addColorStop(0, '#1a3b48');
        sky.addColorStop(0.65, '#718380');
        sky.addColorStop(1, '#d4a26b');
        c.fillStyle = sky;
        c.fillRect(0, 0, this.width, this.height);
        c.save();
        c.translate(this.width / 2, this.originY);
        c.scale(this.scale, this.scale);
        this.drawBackdrop(snapshot.elapsed);
        c.save();
        c.translate(-this.camera * 60, 0);
        this.drawBackStreet(snapshot);
        if (snapshot.position.z > 0.4)
            this.drawHero(snapshot);
        this.drawBuildings(snapshot);
        this.drawStreet(snapshot);
        if (snapshot.position.z <= 0.4)
            this.drawHero(snapshot);
        this.drawStreetFurniture(snapshot);
        c.restore();
        this.drawForeground();
        c.restore();
        c.font = '11px system-ui';
        c.fillStyle = '#d9e4d1';
        c.fillText(overview
            ? '전체 거리 · 세 갈래의 길을 클릭해 보세요'
            : '옆길 · 계단에서 ↑ 지붕 / ↓ 뒷골목', 15, 24);
    }
    rect(x, y, w, h, color) {
        this.context.fillStyle = color;
        this.context.fillRect(x, y, w, h);
    }
    poly(points, color) {
        const c = this.context;
        c.fillStyle = color;
        c.beginPath();
        points.forEach(([x, y], i) => (i === 0 ? c.moveTo(x, y) : c.lineTo(x, y)));
        c.closePath();
        c.fill();
    }
    text(text, x, y, size = 12, color = '#ecd7af') {
        const c = this.context;
        c.font = `${size}px system-ui`;
        c.textAlign = 'center';
        c.fillStyle = color;
        c.fillText(text, x, y);
        c.textAlign = 'left';
    }
    drawBackdrop(time) {
        const c = this.context;
        const sunX = 500 - this.camera * 60 * 0.12;
        c.fillStyle = '#dbc58c';
        c.beginPath();
        c.arc(sunX, 94, 35, 0, Math.PI * 2);
        c.fill();
        for (let i = -4; i < 10; i++) {
            const x = i * 310 - this.camera * 60 * 0.12;
            this.poly([
                [x, 275],
                [x + 140, 110 + (i % 3) * 30],
                [x + 320, 275],
            ], '#34565e');
        }
        for (let i = -4; i < 15; i++) {
            const x = i * 220 - this.camera * 60 * 0.38;
            const top = 230 + (Math.abs(i) % 3) * 23;
            this.rect(x, top, 180, 160, '#3e6060');
            this.poly([
                [x - 10, top],
                [x + 90, top - 40],
                [x + 192, top],
            ], '#2c4c53');
            for (let j = 0; j < 4; j++)
                this.rect(x + 18 + j * 41, top + 28, 14, 35, j % 3 === 0 ? '#c3a476' : '#6c8380');
        }
        for (let i = 0; i < 14; i++) {
            const x = ((i * 233 + time * 9) % 2500) - 1200 - this.camera * 60 * 0.15;
            this.poly([
                [x, 155 + (i % 3) * 18],
                [x + 6, 152 + (i % 3) * 18],
                [x + 12, 155 + (i % 3) * 18],
                [x + 6, 160 + (i % 3) * 18],
            ], '#cead69');
        }
    }
    drawBackStreet(snapshot) {
        this.rect(720, 391, 1440, 25, '#a18460');
        this.rect(720, 413, 1440, 12, '#433c33');
        for (let x = 730; x < 2150; x += 31)
            this.rect(x, 397, 20, 2, '#c1a77c');
        // 건물 사이 열리는 쉼터는 뒤 보행층에서만 닿는다.
        this.rect(1870, 354, 275, 12, '#324f4e');
        for (const x of [1890, 2118])
            this.rect(x, 365, 8, 39, '#4b665d');
        this.rect(1928, 393, 150, 7, '#d3a878');
        this.rect(1940, 400, 8, 12, '#74583c');
        this.rect(2058, 400, 8, 12, '#74583c');
        for (let i = 0; i < 6; i++) {
            const x = 1907 + i * 39;
            const y = 372 + Math.sin(i + snapshot.elapsed) * 2;
            this.poly([
                [x, y - 8],
                [x + 7, y],
                [x, y + 10],
                [x - 7, y],
            ], '#d8a264');
            this.rect(x - 1, y - 18, 2, 9, '#1c4344');
        }
        this.text('뒷골목 쉼터', 1980, 339, 14);
        this.rect(2140, 368, 24, 35, '#647967');
        this.poly([
            [2140, 370],
            [2135, 343],
            [2160, 329],
            [2170, 355],
        ], '#6a9477');
    }
    drawBuildings(snapshot) {
        this.house({
            x: 150,
            w: 360,
            h: 144,
            wall: '#b57250',
            roof: '#523f3c',
            name: '차 향 찻집',
            kind: 'tea',
        }, snapshot);
        this.house({
            x: 725,
            w: 350,
            h: 180,
            wall: '#7d9990',
            roof: '#2c4249',
            name: '바람 세탁소',
            kind: 'laundry',
        }, snapshot);
        this.house({
            x: 1075,
            w: 425,
            h: 145,
            wall: snapshot.restored ? '#c3ab75' : '#847a65',
            roof: '#39494a',
            name: '오래된 도장',
            kind: 'dojo',
        }, snapshot);
        this.house({
            x: 1500,
            w: 270,
            h: 199,
            wall: '#9d795d',
            roof: '#3b4a4c',
            name: '옆길 창고',
            kind: 'warehouse',
        }, snapshot);
        for (const x of [680, 1650]) {
            this.rect(x, 278, 11, 148, '#2c4145');
            for (let i = 0; i < 11; i++)
                this.rect(x - 20, 426 - i * 14, 54, 6, '#bdad83');
            this.text('↑ 지붕 / ↓ 골목', x + 10, 456, 11, '#b6c3a5');
        }
        this.rect(720, 268, 960, 8, '#b6a078');
        this.rect(720, 276, 960, 9, '#354b4d');
        for (let x = 735; x < 1680; x += 40)
            this.rect(x, 269, 1, 7, '#645f4d');
        for (const x of [770, 1680]) {
            this.rect(x, 210, 5, 58, '#30494c');
            this.poly([
                [x + 5, 212],
                [x + 51, 223],
                [x + 5, 239],
            ], '#d2a264');
        }
        this.text(snapshot.rooftopFound ? '지붕의 풍경 ✓' : '작은 지붕길', 1260, 210, 14, '#e2ca97');
    }
    house(b, snapshot) {
        const c = this.context;
        const y = streetY - b.h;
        this.rect(b.x, y, b.w, b.h, b.wall);
        this.rect(b.x, y, b.w, 8, '#e4bb8a');
        this.poly([
            [b.x - 16, y],
            [b.x + 25, y - 35],
            [b.x + b.w - 12, y - 35],
            [b.x + b.w + 15, y],
        ], b.roof);
        for (let x = b.x + 12; x < b.x + b.w; x += 28)
            this.rect(x, y - 23, 17, 2, '#778484');
        this.rect(b.x, y + b.h - 17, b.w, 17, '#415355');
        for (let row = 0; row < 4; row++)
            for (let col = 0; col < 9; col++)
                this.rect(b.x + col * 43 + (row % 2) * 13, y + 10 + row * 25, 28, 2, '#ffffff13');
        const center = b.kind === 'dojo' ? facilities[1].x * 60 : b.x + b.w / 2;
        this.rect(center - 28, streetY - 71, 56, 71, '#273e42');
        this.rect(center - 23, streetY - 66, 46, 63, '#526866');
        this.rect(center - 19, streetY - 60, 38, 22, b.kind === 'dojo' && !snapshot.restored ? '#6b746a' : '#e3b66b');
        this.rect(center + 15, streetY - 28, 3, 5, '#eccb83');
        for (const x of [b.x + 47, b.x + b.w - 97]) {
            this.rect(x, streetY - 96, 51, 53, '#304c50');
            this.rect(x + 5, streetY - 91, 41, 43, '#c9ab71');
            this.rect(x + 24, streetY - 91, 3, 43, '#465657');
            this.rect(x + 5, streetY - 70, 41, 3, '#465657');
            this.rect(x - 5, streetY - 99, 61, 5, '#d6b888');
        }
        this.rect(center - 72, streetY - 112, 144, 29, b.kind === 'dojo' && !snapshot.restored ? '#55605b' : '#294b4c');
        this.text(b.name, center, streetY - 92, 15, b.kind === 'dojo' && !snapshot.restored ? '#9b9a82' : '#efc88e');
        if (b.kind === 'tea') {
            this.poly([
                [b.x + 12, streetY - 116],
                [b.x + 126, streetY - 116],
                [b.x + 140, streetY - 99],
                [b.x, streetY - 99],
            ], '#d4a664');
            this.rect(b.x + 48, streetY - 46, 27, 46, '#304849');
            if (snapshot.fireSeconds > 0) {
                this.poly([
                    [b.x + 53, streetY - 15],
                    [b.x + 60, streetY - 40 - Math.sin(snapshot.elapsed * 12) * 4],
                    [b.x + 70, streetY - 15],
                ], '#f3c477');
                for (let i = 0; i < 4; i++) {
                    c.fillStyle = '#d3d8bf66';
                    c.beginPath();
                    c.arc(b.x + 65 + Math.sin(snapshot.elapsed + i) * 8, y - 40 - ((snapshot.elapsed * 18 + i * 17) % 70), 7 + i * 2, 0, Math.PI * 2);
                    c.fill();
                }
            }
        }
        if (b.kind === 'laundry') {
            this.rect(b.x + 70, y - 57, b.w - 100, 2, '#28474b');
            for (let i = 0; i < 4; i++)
                this.poly([
                    [b.x + 80 + i * 54, y - 55],
                    [b.x + 108 + i * 54, y - 55],
                    [
                        b.x + 108 + i * 54 + Math.sin(snapshot.elapsed * 1.5 + i) * 5,
                        y - 21,
                    ],
                    [b.x + 80 + i * 54, y - 24],
                ], i % 2 ? '#d0af80' : '#8ba79a');
        }
        if (b.kind === 'dojo' && !snapshot.restored) {
            this.poly([
                [center - 13, y - 32],
                [center + 55, y - 31],
                [center + 32, y - 4],
            ], '#879d94');
            this.rect(b.x + 49, streetY - 75, 51, 5, '#6a6350');
            this.rect(b.x + b.w - 98, streetY - 85, 51, 5, '#6a6350');
        }
    }
    drawStreet(snapshot) {
        this.rect(-100, 430, 2500, 18, '#cab17f');
        this.rect(-100, 448, 2500, 38, '#686e61');
        this.rect(-100, 486, 2500, 600, '#354b50');
        for (let x = -80; x < 2400; x += 48) {
            this.rect(x, 434, 31, 3, '#e5c994');
            this.rect(x + 12, 453, 34, 2, '#909075');
        }
        for (let x = 0; x < 2350; x += 110) {
            this.rect(x, 504, 42, 3, '#647a71');
            this.rect(x + 54, 522, 44, 2, '#48676a');
        }
        for (const facility of facilities) {
            if (facility.z !== 0)
                continue;
            const x = facility.x * 60;
            this.rect(x - 21, 445, 42, 3, snapshot.visited.includes(facility.id) ? '#dbbb79' : '#809489');
        }
    }
    drawHero(snapshot) {
        const motion = `${snapshot.moving ? 'move' : 'stand'}-${snapshot.facing}`;
        if (motion !== this.motion) {
            this.motion = motion;
            this.animation.play(motion);
        }
        this.animation.update(Math.max(0, snapshot.elapsed - this.previousElapsed));
        this.previousElapsed = snapshot.elapsed;
        const frame = this.animation.currentFrame.frame;
        const image = this.images.get(frame.localPath);
        if (!image)
            return;
        const c = this.context;
        const x = snapshot.position.x * 60;
        const y = footY(snapshot.position.z);
        c.fillStyle = '#172e3a66';
        c.beginPath();
        c.ellipse(x, y, 17, 4, 0, 0, Math.PI * 2);
        c.fill();
        c.imageSmoothingEnabled = false;
        c.drawImage(image, x - frame.pivot.x, y - frame.height + frame.pivot.y, frame.width, frame.height);
        c.imageSmoothingEnabled = true;
    }
    drawStreetFurniture(snapshot) {
        for (const x of [570, 1800, 2200]) {
            this.rect(x, 290, 6, 157, '#284247');
            this.rect(x - 17, 290, 36, 4, '#284247');
            this.rect(x - 12, 298, 26, 33, '#beaf7c');
            this.rect(x - 8, 302, 18, 25, '#e8c781');
        }
        this.text('옆길', 30, 389, 16);
        this.text('천천히 걷는 거리', 30, 407, 10);
        if (snapshot.nearby) {
            const x = snapshot.position.x * 60;
            const y = footY(snapshot.position.z) - 84;
            this.rect(x - 38, y - 17, 76, 25, '#193d44');
            this.text('Space · 살펴보기', x, y, 10);
        }
    }
    drawForeground() {
        for (const x of [15, 650, 1840, 2260]) {
            const sx = x - this.camera * 60 * 1.15;
            this.rect(sx, 235, 15, 325, '#16363c');
            this.poly([
                [sx - 13, 250],
                [sx - 5, 199],
                [sx + 28, 199],
                [sx + 41, 250],
            ], '#21474a');
            this.rect(sx - 5, 209, 30, 29, '#47645b');
        }
        for (let i = 0; i < 18; i++) {
            const x = i * 150 - this.camera * 60 * 1.15;
            this.poly([
                [x, 560],
                [x + 16, 523],
                [x + 35, 548],
                [x + 56, 516],
                [x + 85, 546],
                [x + 112, 532],
                [x + 140, 560],
            ], '#20474a');
        }
    }
    dispose() {
        this.disposed = true;
        this.images.clear();
    }
}
