import manifest from '../../../../resources/manifest.json' with { type: 'json' };
import { resourceUrl } from '../../catalog/resource-url.js';
import { approachPoints, rootTrails, villageHouses, villagePlaces, } from './village.js';
const boardWidth = 1040;
const boardHeight = 640;
const worldX = 46;
const worldZ = 28;
function random(seed) {
    return (((Math.sin(seed * 127.1 + 311.7) * 43758.5453) % 1) + 1) % 1;
}
function board(p) {
    return { x: 520 + p.x * worldX, y: 380 + p.z * worldZ };
}
function ellipse(c, x, y, rx, ry, color) {
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    c.fillStyle = color;
    c.fill();
}
function stroke(c, points, width, color) {
    c.beginPath();
    points.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
    c.lineWidth = width;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.strokeStyle = color;
    c.stroke();
}
function createLayer(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context)
        throw new Error('콜라주 그림 Canvas를 만들 수 없습니다.');
    return { canvas, context };
}
/** 껍질, 이끼, 버섯을 각각 다른 밀도와 결의 원본 소재판으로 직접 만든다. */
class CollageMaterials {
    bark = createLayer(1040, 640);
    moss = createLayer(280, 280);
    cap = createLayer(280, 240);
    paper = createLayer(160, 160);
    constructor() {
        const bark = this.bark.context;
        bark.fillStyle = '#725239';
        bark.fillRect(0, 0, 1040, 640);
        for (let i = 0; i < 60000; i += 1) {
            const x = random(i * 5) * 1040;
            const y = random(i * 5 + 1) * 640;
            bark.fillStyle = i % 4 === 0 ? '#ba97695a' : '#241d1853';
            bark.fillRect(x, y, 0.4 + random(i + 7) * 3, 0.4 + random(i + 8) * 2);
        }
        for (let i = 0; i < 280; i += 1) {
            const x = random(i + 291) * 1060 - 10;
            const y = random(i + 131) * 640;
            bark.beginPath();
            bark.moveTo(x, y - 50);
            bark.bezierCurveTo(x + 22, y - 12, x - 16, y + 35, x + 8, y + 100);
            bark.strokeStyle = i % 3 === 0 ? '#d4ae7d80' : '#251c19b0';
            bark.lineWidth = 0.5 + random(i + 10) * 2.5;
            bark.stroke();
        }
        const moss = this.moss.context;
        moss.fillStyle = '#344331';
        moss.fillRect(0, 0, 280, 280);
        for (let i = 0; i < 22000; i += 1) {
            const x = random(i * 7) * 280;
            const y = random(i * 7 + 2) * 280;
            ellipse(moss, x, y, 0.5 + random(i * 2) * 1.7, 0.4 + random(i * 2 + 1), ['#85996895', '#c6cc8585', '#506246', '#233a30'][i % 4]);
        }
        const cap = this.cap.context;
        const gradient = cap.createLinearGradient(0, 0, 260, 240);
        gradient.addColorStop(0, '#d8a77c');
        gradient.addColorStop(0.4, '#9e503c');
        gradient.addColorStop(1, '#422e2b');
        cap.fillStyle = gradient;
        cap.fillRect(0, 0, 280, 240);
        for (let i = 0; i < 13000; i += 1) {
            cap.fillStyle = i % 3 ? '#693c3230' : '#ffdfac45';
            cap.fillRect(random(i * 4) * 280, random(i * 4 + 1) * 240, 1, 0.7);
        }
        for (let i = 0; i < 55; i += 1) {
            const x = random(i * 11) * 280;
            const y = random(i * 11 + 2) * 240;
            ellipse(cap, x, y, 1 + random(i + 41) * 6, 0.5 + random(i + 12) * 4, '#e6c79991');
        }
        const paper = this.paper.context;
        paper.fillStyle = '#d1c19b';
        paper.fillRect(0, 0, 160, 160);
        for (let i = 0; i < 5000; i += 1) {
            paper.fillStyle = '#675a3635';
            paper.fillRect(random(i * 3) * 160, random(i * 3 + 1) * 160, 0.8, 0.5);
        }
    }
    pattern(c, name) {
        const pattern = c.createPattern(this[name].canvas, 'repeat');
        // 버섯의 색 그라데이션은 한 지붕 안에 들어가도록 소재판 원점을 맞춘다.
        if (name === 'cap')
            pattern?.setTransform(new DOMMatrix().translate(-140, -170));
        return pattern ?? '#796649';
    }
    dispose() {
        for (const layer of [this.bark, this.moss, this.cap, this.paper]) {
            layer.canvas.width = 1;
            layer.canvas.height = 1;
        }
    }
}
export class CollageVillageDrawing {
    canvas;
    ready;
    context;
    terrain = createLayer(boardWidth, boardHeight);
    materials = new CollageMaterials();
    images = new Map();
    motions;
    width = 1040;
    height = 640;
    camera = { x: 0, z: -0.4 };
    scale = 1;
    disposed = false;
    constructor(canvas) {
        this.canvas = canvas;
        const context = canvas.getContext('2d');
        if (!context)
            throw new Error('2D Canvas를 사용할 수 없습니다.');
        this.context = context;
        const actor = manifest.assets.find((a) => a.id === 'ai/tiger-hero');
        if (!actor)
            throw new Error('승인된 아타호 리소스가 없습니다.');
        this.motions = new Map(Object.entries(actor.animations).filter(([key]) => [
            'stand',
            'stand-left',
            'stand-right',
            'stand-back',
            'move',
            'move-left',
            'move-right',
            'move-back',
        ].includes(key)));
        this.ready = Promise.all([...this.motions.values()]
            .flatMap((motion) => motion.frames)
            .map((frame) => this.load(frame))).then(() => undefined);
        this.drawTerrain();
    }
    resize() {
        const bounds = this.canvas.getBoundingClientRect();
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        this.width = Math.max(1, bounds.width);
        this.height = Math.max(1, bounds.height);
        this.canvas.width = Math.round(this.width * dpr);
        this.canvas.height = Math.round(this.height * dpr);
    }
    project(p) {
        return {
            x: this.width / 2 + (p.x - this.camera.x) * worldX * this.scale,
            y: this.height * 0.6 + (p.z - this.camera.z) * worldZ * this.scale,
        };
    }
    pointerToWorld(clientX, clientY) {
        const bounds = this.canvas.getBoundingClientRect();
        return {
            x: (clientX - bounds.left - this.width / 2) / worldX / this.scale +
                this.camera.x,
            z: (clientY - bounds.top - this.height * 0.6) / worldZ / this.scale +
                this.camera.z,
        };
    }
    render(snapshot, overview) {
        if (this.disposed)
            return;
        const c = this.context;
        const dpr = this.canvas.width / this.width;
        this.scale = overview
            ? Math.min(this.width / boardWidth, this.height / boardHeight) * 1.05
            : Math.min(1.5, Math.max(0.96, this.width / 620));
        this.camera = overview
            ? { x: 0, z: -0.4 }
            : { x: snapshot.position.x * 0.9, z: snapshot.position.z - 0.8 };
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        const sky = c.createLinearGradient(0, 0, 0, this.height);
        sky.addColorStop(0, '#101f27');
        sky.addColorStop(0.55, '#223630');
        sky.addColorStop(1, '#121d1e');
        c.fillStyle = sky;
        c.fillRect(0, 0, this.width, this.height);
        this.drawDistantForest(snapshot.elapsed);
        c.translate(this.width / 2 - 520 * this.scale - this.camera.x * worldX * this.scale, this.height * 0.6 -
            380 * this.scale -
            this.camera.z * worldZ * this.scale);
        c.scale(this.scale, this.scale);
        c.drawImage(this.terrain.canvas, 0, 0);
        this.drawTrail(snapshot);
        const layers = villageHouses.map((house) => ({
            z: house.z,
            draw: () => this.drawHouse(house, snapshot),
        }));
        layers.push({
            z: villagePlaces.hearth.z,
            draw: () => this.drawHearth(snapshot),
        });
        layers.push({
            z: villagePlaces.refuge.z,
            draw: () => this.drawRefuge(snapshot),
        });
        layers.push({
            z: snapshot.position.z,
            draw: () => this.drawActor(snapshot),
        });
        layers.push({
            z: -2.55,
            draw: () => this.drawMossCurtain(snapshot.elapsed),
        });
        layers.sort((a, b) => a.z - b.z).forEach((layer) => layer.draw());
        this.drawFireflies(snapshot.elapsed);
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        const shade = c.createRadialGradient(this.width / 2, this.height * 0.45, this.width * 0.25, this.width / 2, this.height / 2, this.width * 0.75);
        shade.addColorStop(0, '#00000000');
        shade.addColorStop(1, '#04111380');
        c.fillStyle = shade;
        c.fillRect(0, 0, this.width, this.height);
    }
    dispose() {
        this.disposed = true;
        this.images.clear();
        this.materials.dispose();
        this.terrain.canvas.width = 1;
        this.terrain.canvas.height = 1;
    }
    load(frame) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => {
                if (!this.disposed)
                    this.images.set(frame.localPath, image);
                resolve();
            };
            image.onerror = () => reject(new Error(`아타호 로딩 실패: ${frame.localPath}`));
            image.src = resourceUrl(frame.localPath).href;
        });
    }
    drawTerrain() {
        const c = this.terrain.context;
        // 큰 껍질 윤곽은 독립된 오려낸 모양이고 결 그림은 그 내부에만 놓인다.
        c.save();
        c.beginPath();
        c.moveTo(360, 292);
        c.bezierCurveTo(320, 155, 402, 44, 504, 13);
        c.bezierCurveTo(480, 67, 615, 31, 609, 2);
        c.bezierCurveTo(717, 97, 686, 215, 703, 291);
        c.bezierCurveTo(625, 340, 416, 363, 360, 292);
        c.fillStyle = this.materials.pattern(c, 'bark');
        c.fill();
        c.clip();
        const trunkShade = c.createLinearGradient(345, 0, 710, 0);
        trunkShade.addColorStop(0, '#102623b0');
        trunkShade.addColorStop(0.2, '#fff0b226');
        trunkShade.addColorStop(0.54, '#10252310');
        trunkShade.addColorStop(1, '#142723b0');
        c.fillStyle = trunkShade;
        c.fillRect(300, 0, 450, 350);
        for (let i = 0; i < 42; i += 1) {
            const x = 340 + i * 8.2;
            c.beginPath();
            c.moveTo(x, 0);
            c.bezierCurveTo(x - 35, 120, x + 30, 210, x - 18, 350);
            c.lineWidth = 1.5 + random(i) * 3;
            c.strokeStyle = i % 3 ? '#221d1c99' : '#c19a7385';
            c.stroke();
        }
        for (let i = 0; i < 9; i += 1) {
            c.beginPath();
            c.ellipse(540, 194, 9 + i * 2.7, 14 + i * 5, 0.13, 0, Math.PI * 2);
            c.lineWidth = i % 3 ? 0.8 : 2;
            c.strokeStyle = i % 2 ? '#201d1990' : '#d2b58b70';
            c.stroke();
        }
        c.restore();
        for (const trail of [...rootTrails].reverse()) {
            const points = trail.points.map(board);
            // 아래로 늘어진 어두운 두께와 윗면은 같은 뿌리 중심선을 공유한다.
            stroke(c, points.map((p) => ({ x: p.x, y: p.y + 36 })), trail.radius * 66, '#1c201d');
            stroke(c, points.map((p) => ({ x: p.x, y: p.y + 19 })), trail.radius * 62, '#382b21');
            c.save();
            const mask = new Path2D();
            points.forEach((p, i) => i ? mask.lineTo(p.x, p.y) : mask.moveTo(p.x, p.y));
            c.strokeStyle = this.materials.pattern(c, 'bark');
            c.lineWidth = trail.radius * 61;
            c.lineCap = 'round';
            c.lineJoin = 'round';
            c.stroke(mask);
            stroke(c, points.map((p) => ({ x: p.x - 7, y: p.y - 10 })), 2, '#c2a67c90');
            stroke(c, points.map((p) => ({ x: p.x + 3, y: p.y + 9 })), 2, '#2f271fa0');
            c.restore();
        }
        for (let i = 0; i < 22; i += 1) {
            const t = i / 21;
            const x = 170 + t * 697;
            const y = 433 - Math.sin(t * Math.PI) * 77;
            this.drawMoss(c, x, y + 20, 15 + random(i) * 15, i + 20);
        }
        for (let i = 0; i < 15; i += 1) {
            const x = 272 + random(i + 371) * 425;
            const y = 219 + random(i + 102) * 67;
            this.drawMoss(c, x, y, 12 + random(i) * 25, i + 90);
        }
        for (const p of [
            { x: 192, y: 452, size: 56 },
            { x: 794, y: 446, size: 68 },
            { x: 315, y: 325, size: 38 },
            { x: 710, y: 315, size: 41 },
        ])
            this.drawFern(c, p.x, p.y, p.size);
        this.drawFungus(c, 445, 166, 30, 1);
        this.drawFungus(c, 610, 122, 34, -1);
        for (let i = 0; i < 5; i += 1) {
            const x = 415 + i * 32;
            c.save();
            c.translate(x, 317 + Math.sin(i) * 7);
            c.rotate(-0.12 + i * 0.015);
            c.fillStyle = this.materials.pattern(c, 'paper');
            c.fillRect(-12, -3, 24, 6);
            c.strokeStyle = '#524831';
            c.strokeRect(-12, -3, 24, 6);
            c.restore();
        }
    }
    drawMoss(c, x, y, size, seed) {
        c.save();
        c.beginPath();
        for (let i = 0; i < 28; i += 1) {
            const a = (i / 28) * Math.PI * 2;
            const r = size * (0.62 + random(i + seed) * 0.4);
            const px = x + Math.cos(a) * r;
            const py = y + Math.sin(a) * r * 0.6;
            if (i === 0)
                c.moveTo(px, py);
            else
                c.lineTo(px, py);
        }
        c.closePath();
        c.fillStyle = this.materials.pattern(c, 'moss');
        c.fill();
        c.strokeStyle = '#a0b47845';
        c.lineWidth = 0.7;
        c.stroke();
        c.restore();
    }
    drawFern(c, x, y, size) {
        for (let branch = 0; branch < 5; branch += 1) {
            const dx = (branch - 2) * size * 0.43;
            const dy = -size * (0.5 + (2 - Math.abs(branch - 2)) * 0.18);
            stroke(c, [
                { x, y },
                { x: x + dx * 0.45, y: y + dy * 0.7 },
                { x: x + dx, y: y + dy },
            ], 1.1, '#759077');
            for (let j = 1; j < 10; j += 1) {
                const t = j / 10;
                const px = x + dx * t;
                const py = y + dy * Math.sin((t * Math.PI) / 2);
                for (const sign of [-1, 1]) {
                    c.beginPath();
                    c.moveTo(px, py);
                    c.quadraticCurveTo(px + sign * size * 0.17 * (1 - t), py - 9, px + sign * size * 0.24 * (1 - t), py - 12);
                    c.quadraticCurveTo(px + sign * 7, py - 2, px, py + 3);
                    c.fillStyle = branch % 2 ? '#637b56' : '#435f4e';
                    c.fill();
                    stroke(c, [
                        { x: px, y: py },
                        { x: px + sign * size * 0.2 * (1 - t), y: py - 10 },
                    ], 0.5, '#b0af76a0');
                }
            }
        }
    }
    drawFungus(c, x, y, size, sign) {
        for (let i = 0; i < 3; i += 1) {
            c.beginPath();
            c.moveTo(x, y + i * 13);
            c.bezierCurveTo(x + sign * size, y - 18 + i * 13, x + sign * size * 1.7, y + 8 + i * 13, x, y + 13 + i * 13);
            c.fillStyle = '#c5a17d';
            c.fill();
            c.lineWidth = 2;
            c.strokeStyle = '#5d4435';
            c.stroke();
        }
    }
    drawHouse(house, snapshot) {
        const c = this.context;
        const p = board(house);
        const isDojo = house.id === 'dojo';
        c.save();
        c.translate(p.x, p.y);
        c.scale(house.size, house.size);
        ellipse(c, 0, 4, 50, 13, '#142a24aa');
        const stem = c.createLinearGradient(-24, 0, 28, 0);
        stem.addColorStop(0, '#6e6650');
        stem.addColorStop(0.4, '#d5c496');
        stem.addColorStop(1, '#978468');
        c.beginPath();
        c.moveTo(-28, 0);
        c.bezierCurveTo(-19, -32, -19, -58, -24, -79);
        c.lineTo(27, -80);
        c.bezierCurveTo(23, -51, 17, -30, 27, 0);
        c.closePath();
        c.fillStyle = stem;
        c.fill();
        for (let i = 0; i < 13; i += 1)
            stroke(c, [
                { x: -24 + i * 4, y: -67 },
                { x: -17 + i * 2.8, y: -26 },
                { x: -23 + i * 3.7, y: -3 },
            ], 0.5, '#5e51383b');
        c.beginPath();
        c.moveTo(-71, -67);
        c.bezierCurveTo(-60, -113, -24, -139, 2, -138);
        c.bezierCurveTo(35, -139, 61, -104, 73, -69);
        c.bezierCurveTo(22, -49, -23, -49, -71, -67);
        c.fillStyle = this.materials.pattern(c, 'cap');
        c.fill();
        c.lineWidth = 1.4;
        c.strokeStyle = '#2b2823';
        c.stroke();
        ellipse(c, 1, -65, 69, 9, '#ba9d7a');
        for (let i = 0; i < 21; i += 1) {
            const x = -64 + i * 6.4;
            stroke(c, [
                { x: 0, y: -62 },
                { x, y: -65 + Math.abs(x) * 0.03 },
            ], 0.65, '#55433790');
        }
        if (isDojo && !snapshot.restored) {
            c.beginPath();
            c.moveTo(18, -137);
            c.lineTo(6, -108);
            c.lineTo(28, -92);
            c.lineTo(11, -65);
            c.lineWidth = 4.5;
            c.strokeStyle = '#242c2a';
            c.stroke();
        }
        if (isDojo && snapshot.restored) {
            c.save();
            c.translate(16, -100);
            c.rotate(0.18);
            c.beginPath();
            c.ellipse(0, 0, 12, 29, 0, 0, Math.PI * 2);
            c.fillStyle = this.materials.pattern(c, 'moss');
            c.fill();
            stroke(c, [
                { x: 0, y: -25 },
                { x: 0, y: 25 },
            ], 1, '#c4be94');
            for (let j = -2; j < 3; j += 1)
                stroke(c, [
                    { x: -12, y: j * 9 - 4 },
                    { x: 12, y: j * 9 + 4 },
                ], 1.5, '#d3c5a0');
            c.restore();
        }
        c.beginPath();
        c.moveTo(-11, 0);
        c.lineTo(-11, -27);
        c.bezierCurveTo(-11, -45, 14, -45, 14, -27);
        c.lineTo(14, 0);
        c.fillStyle = isDojo && snapshot.restored ? '#805938' : '#2e342a';
        c.fill();
        if (isDojo && !snapshot.restored)
            for (const y of [-12, -26])
                stroke(c, [
                    { x: -18, y: y + 5 },
                    { x: 21, y },
                ], 6, '#63533d');
        for (const x of [-21, 23]) {
            ellipse(c, x, -43, 6, 8, '#433f32');
            ellipse(c, x, -43, 4, 6, snapshot.restored || !isDojo ? '#d2b774' : '#665d49');
        }
        // 표지판은 건물 로컬 좌표에 놓아 카메라 변화에도 줄과 함께 붙어 있다.
        c.save();
        c.translate(-42, -25);
        c.rotate(-0.13);
        c.fillStyle = this.materials.pattern(c, 'paper');
        c.fillRect(-17, -7, 34, 14);
        c.strokeStyle = '#686047';
        c.strokeRect(-17, -7, 34, 14);
        c.font = '9px serif';
        c.textAlign = 'center';
        c.fillStyle = '#4a4b34';
        c.fillText(isDojo ? '도장' : house.id === 'home' ? '둥지' : '찻잎', 0, 3);
        c.restore();
        if (isDojo && snapshot.restored) {
            stroke(c, [
                { x: -52, y: -55 },
                { x: 57, y: -55 },
            ], 1, '#aaa880');
            for (let i = 0; i < 5; i += 1) {
                const x = -45 + i * 23;
                const y = -46 + Math.sin(snapshot.elapsed * 1.3 + i) * 2;
                stroke(c, [
                    { x, y: -54 },
                    { x, y },
                ], 0.8, '#918b68');
                ellipse(c, x, y, 3.5, 5, '#b0d4b4');
                ellipse(c, x, y, 1.5, 3, '#e4e9b9');
            }
        }
        c.restore();
    }
    drawHearth(snapshot) {
        const c = this.context;
        const p = board(villagePlaces.hearth);
        c.save();
        c.translate(p.x, p.y);
        ellipse(c, 0, 2, 29, 10, '#21302b99');
        const shell = c.createLinearGradient(-27, -35, 26, 0);
        shell.addColorStop(0, '#c7a982');
        shell.addColorStop(0.4, '#6a4f33');
        shell.addColorStop(1, '#443d2b');
        ellipse(c, 0, -11, 24, 24, shell);
        for (let i = -4; i <= 4; i += 1)
            stroke(c, [
                { x: i * 4.3, y: -32 },
                { x: i * 5, y: 5 },
            ], 0.8, '#38281caa');
        ellipse(c, 0, -3, 11, 12, '#172c23');
        const lit = snapshot.fireSeconds > 0;
        if (lit) {
            const glow = c.createRadialGradient(0, -5, 1, 0, -5, 65);
            glow.addColorStop(0, '#e6a95355');
            glow.addColorStop(1, '#e6a95300');
            c.fillStyle = glow;
            c.fillRect(-65, -70, 130, 130);
            for (let i = 0; i < 3; i += 1) {
                c.beginPath();
                c.moveTo(-9 + i * 5, 4);
                c.quadraticCurveTo(-8 + i * 5, -17 - Math.sin(snapshot.elapsed * 5 + i) * 5, 2 + i * 4, 4);
                c.fillStyle = i % 2 ? '#f4cb79' : '#bc663a';
                c.fill();
            }
            for (let i = 0; i < 5; i += 1) {
                const t = (snapshot.elapsed * 0.2 + i / 5) % 1;
                ellipse(c, Math.sin(t * 5 + i) * 8, -30 - t * 50, 2 + t * 6, 1 + t * 4, `rgba(199,206,173,${(1 - t) * 0.25})`);
            }
        }
        const wobble = lit ? Math.sin(snapshot.elapsed * 6) * 1.3 : 0;
        ellipse(c, 0, -39 + wobble, 11, 9, '#7c8976');
        ellipse(c, 0, -46 + wobble, 8, 2, '#b6b798');
        stroke(c, [
            { x: 8, y: -40 + wobble },
            { x: 15, y: -43 + wobble },
        ], 3, '#9da48b');
        c.restore();
    }
    drawRefuge(snapshot) {
        const c = this.context;
        const p = board(villagePlaces.refuge);
        c.save();
        c.translate(p.x + 15, p.y - 9);
        c.beginPath();
        c.moveTo(-36, 0);
        c.bezierCurveTo(-65, -37, -19, -86, 4, -74);
        c.bezierCurveTo(47, -91, 65, -34, 43, 0);
        c.bezierCurveTo(27, 16, -22, 14, -36, 0);
        c.fillStyle = this.materials.pattern(c, 'bark');
        c.fill();
        ellipse(c, 4, -22, 35, 41, '#20332b');
        c.lineWidth = 4;
        c.strokeStyle = '#ad9873';
        c.stroke();
        c.fillStyle = this.materials.pattern(c, 'paper');
        c.fillRect(-12, -6, 38, 5);
        stroke(c, [
            { x: -16, y: -53 },
            { x: 36, y: -55 },
        ], 1, '#b6b999');
        for (let i = 0; i < 4; i += 1) {
            stroke(c, [
                { x: -12 + i * 14, y: -54 },
                { x: -12 + i * 14, y: -44 + Math.sin(snapshot.elapsed + i) * 2 },
            ], 1, '#a6baaf');
            ellipse(c, -12 + i * 14, -42 + Math.sin(snapshot.elapsed + i) * 2, 2, 5, '#c8dace');
        }
        if (snapshot.discovered) {
            const glow = c.createRadialGradient(4, -23, 1, 4, -23, 60);
            glow.addColorStop(0, '#8dcec428');
            glow.addColorStop(1, '#8dcec400');
            c.fillStyle = glow;
            c.fillRect(-60, -80, 130, 100);
        }
        c.restore();
    }
    drawActor(snapshot) {
        const dir = snapshot.direction;
        const suffix = Math.abs(dir.x) > Math.abs(dir.z)
            ? dir.x < 0
                ? '-left'
                : '-right'
            : dir.z < 0
                ? '-back'
                : '';
        const animation = this.motions.get(`${snapshot.moving ? 'move' : 'stand'}${suffix}`);
        if (!animation?.frames.length)
            return;
        const frame = animation.frames[snapshot.moving
            ? Math.floor(snapshot.steps * 3.4) % animation.frames.length
            : 0];
        if (!frame)
            return;
        const image = this.images.get(frame.localPath);
        if (!image)
            return;
        const c = this.context;
        const p = board(snapshot.position);
        ellipse(c, p.x, p.y + 1, 13, 4, '#193529aa');
        const scale = 0.91;
        c.imageSmoothingEnabled = false;
        c.drawImage(image, p.x - frame.pivot.x * scale, p.y - frame.pivot.y * scale, frame.width * scale, frame.height * scale);
        c.imageSmoothingEnabled = true;
        if (snapshot.nearby) {
            ellipse(c, p.x, p.y - frame.height * scale - 10, 8, 7, '#e1d9b9');
            c.font = '9px serif';
            c.textAlign = 'center';
            c.fillStyle = '#455041';
            c.fillText('···', p.x, p.y - frame.height * scale - 8);
        }
    }
    drawTrail(snapshot) {
        const c = this.context;
        if (snapshot.target) {
            const p = board(snapshot.target);
            c.beginPath();
            c.ellipse(p.x, p.y, 9, 5, 0, 0, Math.PI * 2);
            c.strokeStyle = '#d5d4a1';
            c.lineWidth = 1.5;
            c.stroke();
        }
        if (!snapshot.discovered)
            return;
        const trail = rootTrails[1];
        if (!trail)
            return;
        for (let i = 0; i < trail.points.length - 1; i += 1) {
            const a = trail.points[i];
            const b = trail.points[i + 1];
            if (!a || !b)
                continue;
            for (let j = 0; j < 6; j += 1) {
                const p = board({
                    x: a.x + ((b.x - a.x) * j) / 6,
                    z: a.z + ((b.z - a.z) * j) / 6,
                });
                ellipse(c, p.x, p.y, 1.5, 1, '#91c3bba0');
            }
        }
    }
    drawMossCurtain(time) {
        const c = this.context;
        for (let i = 0; i < 27; i += 1) {
            const x = 373 + i * 4.3;
            const length = 24 + random(i + 943) * 48;
            const sway = Math.sin(time * 0.5 + i) * 2;
            stroke(c, [
                { x, y: 260 },
                { x: x + sway, y: 269 + length * 0.5 },
                { x: x - 3 + sway, y: 260 + length },
            ], 1.2, '#657c51');
            for (let j = 0; j < length; j += 5)
                ellipse(c, x + sway + Math.sin(j) * 3, 264 + j + random(i + 871) * 5, 1.5 + random(i * 7 + j) * 2.6, 1 + random(i * 4 + j + 73) * 1.8, j % 2 ? '#6f8754' : '#435e42');
        }
    }
    drawDistantForest(time) {
        const c = this.context;
        for (let i = 0; i < 17; i += 1) {
            const x = (i / 16) * this.width + Math.sin(i) * 23 - this.camera.x * 5;
            const width = 12 + random(i + 82) * 40;
            c.beginPath();
            c.moveTo(x, this.height);
            c.bezierCurveTo(x - 30, this.height * 0.6, x + 36, this.height * 0.3, x + 8, -25);
            c.lineTo(x + width, -25);
            c.bezierCurveTo(x + width + 21, this.height * 0.6, x + width - 12, this.height * 0.8, x + width + 10, this.height);
            c.fillStyle = i % 2 ? '#2b42362b' : '#0d282b44';
            c.fill();
        }
        for (let i = 0; i < 14; i += 1) {
            const x = random(i * 5 + 310) * this.width;
            const y = random(i * 5 + 312) * this.height;
            ellipse(c, x + Math.sin(time * 0.2 + i) * 12, y, 1, 1, '#a4c9b149');
        }
    }
    drawFireflies(time) {
        const c = this.context;
        for (let i = 0; i < 18; i += 1) {
            const x = 240 + random(i * 5 + 202) * 560 + Math.sin(time * 0.25 + i) * 8;
            const y = 220 + random(i * 5 + 203) * 215 + Math.cos(time * 0.3 + i) * 9;
            ellipse(c, x, y, 2, 2, `rgba(193,222,175,${0.15 + (Math.sin(time + i) + 1) * 0.2})`);
        }
    }
}
export const screenPositions = Object.freeze({
    entrance: Object.freeze({ ...villagePlaces.entrance }),
    hearth: Object.freeze({ ...approachPoints.hearth }),
    dojo: Object.freeze({ ...approachPoints.dojo }),
    refuge: Object.freeze({ ...approachPoints.refuge }),
});
