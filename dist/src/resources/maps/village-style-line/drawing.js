import { resourceUrl } from '../../catalog/resource-url.js';
import manifest from '../../../../resources/manifest.json' with { type: 'json' };
import { lineBuildings, linePlaces, lineStream, lineTrees, } from './village.js';
const paper = '#fffdf1', ink = '#33352e';
const worldWidth = 960, worldHeight = 680;
const localPoint = (p) => ({
    x: 480 + p.x * 24,
    y: 380 + p.z * 17,
});
/** 윤곽은 임의 노이즈 대신, 손으로 정한 비대칭 곡선과 끊어진 보조선으로 만든다. */
class LineBrush {
    c;
    constructor(c) {
        this.c = c;
    }
    path(points, fill, close = true, width = 3) {
        const first = points[0];
        if (!first)
            return;
        this.c.beginPath();
        this.c.moveTo(first.x, first.y);
        for (const p of points.slice(1))
            this.c.lineTo(p.x, p.y);
        if (close)
            this.c.closePath();
        if (fill) {
            this.c.fillStyle = fill;
            this.c.fill();
        }
        this.c.lineWidth = width;
        this.c.strokeStyle = ink;
        this.c.lineCap = 'round';
        this.c.lineJoin = 'round';
        this.c.stroke();
    }
    line(points, width = 3) {
        this.path(points, null, false, width);
    }
    ellipse(x, y, rx, ry, fill = paper, width = 3) {
        this.c.beginPath();
        this.c.ellipse(x, y, rx, ry, -0.025, 0, Math.PI * 2);
        this.c.fillStyle = fill;
        this.c.fill();
        this.c.strokeStyle = ink;
        this.c.lineWidth = width;
        this.c.stroke();
    }
    round(x, y, w, h, fill = paper, radius = 8, width = 3) {
        this.c.beginPath();
        this.c.roundRect(x, y, w, h, radius);
        this.c.fillStyle = fill;
        this.c.fill();
        this.c.lineWidth = width;
        this.c.strokeStyle = ink;
        this.c.stroke();
    }
    curve(start, controlA, controlB, end, width = 3, color = ink) {
        this.c.beginPath();
        this.c.moveTo(start.x, start.y);
        this.c.bezierCurveTo(controlA.x, controlA.y, controlB.x, controlB.y, end.x, end.y);
        this.c.lineWidth = width;
        this.c.lineCap = 'round';
        this.c.strokeStyle = color;
        this.c.stroke();
    }
    text(text, x, y, size = 15, color = ink) {
        this.c.fillStyle = color;
        this.c.font = `700 ${size}px system-ui, sans-serif`;
        this.c.textAlign = 'center';
        this.c.fillText(text, x, y);
    }
}
export class LineDrawing {
    canvas;
    ready;
    brush;
    images = new Map();
    motions;
    terrains = [
        document.createElement('canvas'),
        document.createElement('canvas'),
    ];
    camera = { x: 0, z: -1 };
    width = 960;
    height = 680;
    scale = 1;
    pixelRatio = 1;
    disposed = false;
    constructor(canvas) {
        this.canvas = canvas;
        const context = canvas.getContext('2d');
        if (!context)
            throw new Error('선화 Canvas를 사용할 수 없습니다.');
        this.brush = new LineBrush(context);
        const hero = manifest.assets.find((a) => a.id === 'ai/tiger-hero');
        if (!hero)
            throw new Error('승인된 아타호가 없습니다.');
        this.motions = new Map(Object.entries(hero.animations).filter(([key]) => [
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
            .flatMap((m) => m.frames)
            .map((frame) => this.load(frame))).then(() => undefined);
        for (const [index, terrain] of this.terrains.entries()) {
            terrain.width = worldWidth;
            terrain.height = worldHeight;
            const c = terrain.getContext('2d');
            if (!c)
                throw new Error('바닥 그림을 만들 수 없습니다.');
            this.drawTerrain(new LineBrush(c), index === 1);
        }
    }
    resize() {
        const bounds = this.canvas.getBoundingClientRect();
        this.width = Math.max(1, bounds.width);
        this.height = Math.max(1, bounds.height);
        this.pixelRatio = Math.min(2, window.devicePixelRatio || 1);
        this.canvas.width = Math.round(this.width * this.pixelRatio);
        this.canvas.height = Math.round(this.height * this.pixelRatio);
    }
    project(point) {
        return {
            x: this.width / 2 + (point.x - this.camera.x) * 24 * this.scale,
            y: this.height / 2 + (point.z - this.camera.z) * 17 * this.scale,
        };
    }
    pointerToWorld(clientX, clientY) {
        const bounds = this.canvas.getBoundingClientRect();
        return {
            x: (clientX - bounds.left - this.width / 2) / (24 * this.scale) +
                this.camera.x,
            z: (clientY - bounds.top - this.height / 2) / (17 * this.scale) +
                this.camera.z,
        };
    }
    get diagnostics() {
        return {
            cssWidth: this.width,
            cssHeight: this.height,
            backingWidth: this.canvas.width,
            backingHeight: this.canvas.height,
            pixelRatio: this.pixelRatio,
            scale: this.scale,
            imageCount: this.images.size,
            terrainCaches: this.terrains.length,
            disposed: this.disposed,
        };
    }
    render(state, overview) {
        if (this.disposed)
            return;
        this.scale = overview
            ? Math.min(this.width / 870, this.height / 630) * 0.98
            : 1.42;
        this.camera = overview
            ? { x: 0, z: -1 }
            : { x: state.position.x * 0.87, z: state.position.z * 0.86 - 1.3 };
        const p = this.brush, c = p.c;
        c.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
        c.clearRect(0, 0, this.width, this.height);
        c.fillStyle = '#f2eddb';
        c.fillRect(0, 0, this.width, this.height);
        c.save();
        c.translate(this.width / 2 - (480 + this.camera.x * 24) * this.scale, this.height / 2 - (380 + this.camera.z * 17) * this.scale);
        c.scale(this.scale, this.scale);
        const white = this.terrains[0], colored = this.terrains[1];
        if (white)
            c.drawImage(white, 0, 0);
        if (colored && state.paintProgress > 0) {
            c.save();
            const origin = localPoint(linePlaces.dojo);
            c.beginPath();
            c.arc(origin.x, origin.y, state.paintProgress * 940, 0, Math.PI * 2);
            c.clip();
            c.drawImage(colored, 0, 0);
            c.restore();
        }
        this.drawGround(state);
        const layers = [];
        for (const b of lineBuildings)
            layers.push({ z: b.z, draw: () => this.drawHouse(b, state) });
        for (const t of lineTrees)
            layers.push({
                z: t.z,
                draw: () => this.drawTree(t.x, t.z, t.size, state),
            });
        layers.push({ z: linePlaces.hearth.z, draw: () => this.drawHearth(state) }, { z: -5, draw: () => this.drawRefuge(state) }, { z: 0.8, draw: () => this.drawLaundry(state) }, { z: state.position.z, draw: () => this.drawHero(state) });
        layers.sort((a, b) => a.z - b.z).forEach((layer) => layer.draw());
        if (state.paintProgress > 0 && state.paintProgress < 1) {
            const origin = localPoint(linePlaces.dojo);
            c.beginPath();
            c.arc(origin.x, origin.y, state.paintProgress * 940, 0, Math.PI * 2);
            c.strokeStyle = '#eab751';
            c.lineWidth = 7;
            c.globalAlpha = 0.35;
            c.stroke();
            c.globalAlpha = 1;
        }
        c.restore();
        p.round(12, 12, overview ? 180 : 158, 45, '#fffdf1', 14, 2);
        p.text('색돌이 마을', overview ? 102 : 91, 31, 15);
        p.text(state.restored ? '색이 돌아온 골목' : '선화 속 흰 골목', overview ? 102 : 91, 47, 11, '#737264');
    }
    dispose() {
        this.disposed = true;
        this.images.clear();
        this.terrains.forEach((c) => {
            c.width = 0;
            c.height = 0;
        });
        this.terrains.length = 0;
    }
    load(frame) {
        if (this.images.has(frame.localPath))
            return Promise.resolve();
        const image = new Image();
        this.images.set(frame.localPath, image);
        return new Promise((resolve, reject) => {
            image.onload = () => resolve();
            image.onerror = () => reject(new Error(`아타호 프레임을 읽지 못했어요: ${frame.localPath}`));
            image.src = resourceUrl(frame.localPath).href;
        });
    }
    color(point, state, value) {
        const distance = Math.hypot((point.x - linePlaces.dojo.x) * 24, (point.z - linePlaces.dojo.z) * 17);
        return state.paintProgress * 940 > distance + 15 ? value : paper;
    }
    drawTerrain(p, colored) {
        const c = p.c;
        c.fillStyle = '#f2eddb';
        c.fillRect(0, 0, worldWidth, worldHeight);
        c.beginPath();
        c.moveTo(91, 223);
        c.bezierCurveTo(78, 131, 252, 104, 410, 132);
        c.bezierCurveTo(541, 80, 781, 104, 858, 202);
        c.bezierCurveTo(929, 295, 871, 462, 870, 578);
        c.bezierCurveTo(857, 635, 695, 641, 550, 625);
        c.bezierCurveTo(423, 657, 198, 643, 99, 585);
        c.bezierCurveTo(67, 505, 87, 336, 91, 223);
        c.closePath();
        c.fillStyle = colored ? '#dbe6c7' : paper;
        c.fill();
        c.lineWidth = 3.5;
        c.strokeStyle = ink;
        c.stroke();
        // 골목은 유기적인 큰 색면으로 읽힌다. 정사각 타일이나 배경 노이즈를 넣지 않는다.
        p.curve(localPoint({ x: 0, z: 13 }), localPoint({ x: -1, z: 8 }), localPoint({ x: -4, z: 7 }), localPoint({ x: -5.3, z: 4.2 }), 80, paper);
        p.curve(localPoint({ x: -5.3, z: 4.2 }), localPoint({ x: -1, z: 4 }), localPoint({ x: 0, z: 1 }), localPoint({ x: -1, z: -5 }), 85, paper);
        p.curve(localPoint({ x: -1, z: -5 }), localPoint({ x: 3, z: -4 }), localPoint({ x: 5, z: 1 }), localPoint({ x: 8.5, z: 5 }), 70, paper);
        p.curve(localPoint({ x: 11, z: 5 }), localPoint({ x: 13, z: 2 }), localPoint({ x: 10, z: -2 }), localPoint({ x: 11, z: -10 }), 66, paper);
        p.curve(localPoint({ x: 11, z: -10 }), localPoint({ x: 7, z: -11.2 }), localPoint({ x: 5, z: -9.8 }), localPoint({ x: 4, z: -5 }), 55, paper);
        p.ellipse(456, 367, 88, 47, paper, 2.5);
        const left = [], right = [];
        for (let z = -13.5; z <= 13.5; z += 0.5) {
            left.push(localPoint({ x: lineStream(z) - 1.02, z }));
            right.push(localPoint({ x: lineStream(z) + 1.02, z }));
        }
        p.path([...left, ...right.reverse()], colored ? '#a4dce1' : paper, true, 3);
        for (let i = 0; i < 8; i++) {
            const z = -12 + i * 3.2, s = localPoint({ x: lineStream(z), z });
            p.curve({ x: s.x - 9, y: s.y }, { x: s.x - 4, y: s.y + 4 }, { x: s.x + 2, y: s.y - 5 }, { x: s.x + 9, y: s.y }, 1.6, colored ? '#6c9eb6' : '#bbb9a8');
        }
        for (const z of [5, -10]) {
            const s = localPoint({ x: lineStream(z), z });
            p.round(s.x - 48, s.y - 17, 96, 34, colored ? '#efd399' : paper, 6);
            for (let x = -34; x <= 34; x += 17)
                p.line([
                    { x: s.x + x, y: s.y - 15 },
                    { x: s.x + x + 2, y: s.y + 15 },
                ], 1.6);
            p.curve({ x: s.x - 49, y: s.y - 26 }, { x: s.x - 21, y: s.y - 31 }, { x: s.x + 26, y: s.y - 31 }, { x: s.x + 49, y: s.y - 25 }, 3.5);
            for (const x of [-46, 0, 46])
                p.line([
                    { x: s.x + x, y: s.y - 25 },
                    { x: s.x + x, y: s.y - 12 },
                ], 3);
        }
        for (const [x, z] of [
            [-12, 3],
            [-3, 10],
            [3.8, 9],
            [5, -2],
            [12, 8],
            [11, -12],
            [-3, -12],
            [-14, -1],
        ]) {
            if (x === undefined || z === undefined)
                continue;
            const s = localPoint({ x, z });
            p.line([
                { x: s.x - 6, y: s.y },
                { x: s.x - 9, y: s.y - 7 },
            ], 1.6);
            p.line([
                { x: s.x, y: s.y },
                { x: s.x - 1, y: s.y - 10 },
            ], 1.6);
            p.line([
                { x: s.x + 5, y: s.y },
                { x: s.x + 8, y: s.y - 6 },
            ], 1.6);
            if (colored) {
                p.ellipse(s.x - 1, s.y - 12, 3, 3, '#eaa397', 1.5);
                p.ellipse(s.x + 8, s.y - 7, 3, 3, '#f0c45f', 1.5);
            }
        }
        p.curve({ x: 417, y: 574 }, { x: 426, y: 570 }, { x: 436, y: 572 }, { x: 445, y: 569 }, 2, '#aca997');
        p.curve({ x: 512, y: 346 }, { x: 519, y: 350 }, { x: 530, y: 350 }, { x: 537, y: 346 }, 2, '#aca997');
        p.round(442, 590, 80, 24, paper, 9, 2);
        p.text('입구', 482, 607, 12);
    }
    drawGround(state) {
        const p = this.brush;
        if (state.fireSeconds > 0) {
            const s = localPoint(linePlaces.hearth);
            p.c.save();
            p.c.globalAlpha = 0.4 + Math.sin(state.elapsed * 8) * 0.03;
            p.ellipse(s.x + 2, s.y + 7, 68, 24, '#f7cb82', 0);
            p.c.restore();
        }
        if (state.target) {
            const s = localPoint(state.target);
            p.ellipse(s.x, s.y, 8, 5, '#e8bd59', 2);
        }
        if (state.paintProgress > 0.5) {
            p.curve({ x: 408, y: 342 }, { x: 453, y: 324 }, { x: 480, y: 345 }, { x: 472, y: 375 }, 3, '#e7b38f');
            p.ellipse(437, 363, 15, 10, '#f0d16d', 2);
            p.ellipse(480, 346, 10, 8, '#b5d1c8', 2);
            p.text('한 바퀴!', 449, 387, 12, '#9a7962');
        }
    }
    drawHouse(b, state) {
        const p = this.brush, s = localPoint(b), w = b.width * 24, h = b.id === 'dojo' ? 64 : 54;
        const wall = this.color(b, state, b.id === 'dojo' ? '#f2d99e' : b.id === 'workshop' ? '#ecc1a5' : '#c6d8dc');
        const roof = this.color(b, state, b.id === 'dojo' ? '#dc968e' : b.id === 'workshop' ? '#acd0be' : '#edd392');
        p.ellipse(s.x + 8, s.y + 5, w * 0.56, 10, '#e6e3d4', 0);
        p.path([
            { x: s.x - w / 2, y: s.y - h },
            { x: s.x + w / 2 + 2, y: s.y - h + 3 },
            { x: s.x + w / 2 - 2, y: s.y },
            { x: s.x - w / 2 + 3, y: s.y + 1 },
        ], wall, true, 3.6);
        p.path([
            { x: s.x - w / 2 - 12, y: s.y - h - 1 },
            { x: s.x - w / 2 + 4, y: s.y - h - 19 },
            { x: s.x - 13, y: s.y - h - 52 },
            { x: s.x + w / 2 + 10, y: s.y - h - 18 },
            { x: s.x + w / 2 + 16, y: s.y - h + 4 },
            { x: s.x + 5, y: s.y - h - 3 },
        ], roof, true, 4.1);
        p.curve({ x: s.x - w / 2 - 8, y: s.y - h - 2 }, { x: s.x - 30, y: s.y - h - 5 }, { x: s.x + 33, y: s.y - h + 1 }, { x: s.x + w / 2 + 10, y: s.y - h + 2 }, 2);
        p.curve({ x: s.x - 11, y: s.y - h - 45 }, { x: s.x + 12, y: s.y - h - 32 }, { x: s.x + 32, y: s.y - h - 27 }, { x: s.x + 46, y: s.y - h - 20 }, 1.6);
        p.round(s.x - 19, s.y - 42, 38, 43, this.color(b, state, '#bf997c'), 15, 3);
        p.line([
            { x: s.x, y: s.y - 34 },
            { x: s.x + 1, y: s.y - 1 },
        ], 2);
        p.ellipse(s.x - 6, s.y - 18, 1.5, 1.5, ink, 0);
        p.ellipse(s.x + 6, s.y - 18, 1.5, 1.5, ink, 0);
        for (const x of [-w * 0.31, w * 0.31]) {
            p.round(s.x + x - 15, s.y - 43, 30, 26, this.color(b, state, '#bddde0'), 10, 2.6);
            p.line([
                { x: s.x + x, y: s.y - 42 },
                { x: s.x + x + 1, y: s.y - 18 },
            ], 2);
            p.line([
                { x: s.x + x - 14, y: s.y - 30 },
                { x: s.x + x + 14, y: s.y - 29 },
            ], 2);
        }
        p.round(s.x - 27, s.y - h + 7, 54, 19, paper, 7, 2.2);
        p.text(b.id === 'dojo' ? '도장' : b.id === 'workshop' ? '화덕공방' : '골목집', s.x, s.y - h + 21, 11);
        if (b.id === 'dojo' && state.paintProgress < 0.04) {
            p.line([
                { x: s.x - 17, y: s.y - 35 },
                { x: s.x + 16, y: s.y - 8 },
            ], 5);
            p.line([
                { x: s.x + 16, y: s.y - 35 },
                { x: s.x - 17, y: s.y - 8 },
            ], 5);
            p.line([
                { x: s.x + 27, y: s.y - h - 34 },
                { x: s.x + 20, y: s.y - h - 29 },
                { x: s.x + 33, y: s.y - h - 25 },
            ], 2);
        }
        if (state.paintProgress > 0.2) {
            for (const x of [-w / 2 + 8, w / 2 - 8])
                this.flower(s.x + x, s.y + 4, this.color(b, state, '#e8a48f'));
            if (b.id === 'dojo') {
                p.curve({ x: s.x - 49, y: s.y - 64 }, { x: s.x - 27, y: s.y - 36 }, { x: s.x + 28, y: s.y - 33 }, { x: s.x + 52, y: s.y - 62 }, 2.5);
                for (let i = 0; i < 5; i++) {
                    const x = s.x - 41 + i * 21, y = s.y - 51 + Math.sin((i / 4) * Math.PI) * 11;
                    p.path([
                        { x, y },
                        { x: x + 10, y: y + 1 },
                        { x: x + 6, y: y + 13 },
                    ], i % 2 ? '#9fc5b8' : '#e9b65f', true, 2);
                }
                p.round(s.x + w / 2 + 14, s.y - 32, 15, 29, '#d6b58a', 6, 2.5);
                p.line([
                    { x: s.x + w / 2 + 2, y: s.y - 21 },
                    { x: s.x + w / 2 + 42, y: s.y - 18 },
                ], 4);
                p.ellipse(s.x + w / 2 + 22, s.y - 38, 10, 10, '#eddab6', 2.5);
            }
        }
        if (b.id === 'workshop') {
            p.round(s.x + 33, s.y - h - 55, 18, 30, wall, 5, 3);
            p.ellipse(s.x + 42, s.y - h - 55, 12, 5, paper, 2.5);
            p.round(s.x - 54, s.y - 13, 72, 13, this.color(b, state, '#e7c191'), 5, 2.5);
            for (const x of [-43, -23, -4]) {
                p.line([
                    { x: s.x + x, y: s.y - 14 },
                    { x: s.x + x - 2, y: s.y - 27 },
                ], 3);
                p.round(s.x + x - 8, s.y - 28, 17, 7, paper, 3, 2);
            }
            if (state.fireSeconds > 0) {
                p.c.save();
                p.c.globalAlpha = 0.55;
                p.round(s.x + w / 2 - 30, s.y - 36, 27, 31, '#f7c482', 6, 0);
                p.c.restore();
            }
        }
        p.line([
            { x: s.x - w / 2 + 5, y: s.y + 3 },
            { x: s.x - w / 2 + 34, y: s.y + 4 },
        ], 1.8);
        p.line([
            { x: s.x + w / 2 - 25, y: s.y + 4 },
            { x: s.x + w / 2 - 5, y: s.y + 4 },
        ], 1.8);
    }
    flower(x, y, color) {
        const p = this.brush;
        p.round(x - 10, y - 12, 20, 13, '#ead7af', 5, 2.2);
        p.line([
            { x, y: y - 13 },
            { x: x + 1, y: y - 26 },
        ], 2);
        for (let i = 0; i < 5; i++) {
            const a = (i * Math.PI * 2) / 5;
            p.ellipse(x + Math.cos(a) * 5, y - 27 + Math.sin(a) * 5, 4, 4, color, 1.8);
        }
        p.ellipse(x, y - 27, 3, 3, '#efcd78', 1.3);
    }
    drawTree(x, z, size, state) {
        const p = this.brush, s = localPoint({ x, z });
        p.c.save();
        p.c.translate(s.x, s.y);
        p.c.scale(size, size);
        p.ellipse(5, 4, 25, 7, '#e4e1d1', 0);
        p.path([
            { x: -7, y: -49 },
            { x: 6, y: -49 },
            { x: 8, y: -4 },
            { x: 13, y: 1 },
            { x: -12, y: 1 },
            { x: -6, y: -8 },
        ], this.color({ x, z }, state, '#ddbb8e'), true, 3.5);
        // 꽃과 구름 사이의 형태. 얼굴 있는 나무가 어느 골목으로 돌아왔는지 기억할 표식이다.
        p.c.beginPath();
        p.c.moveTo(-28, -39);
        p.c.bezierCurveTo(-47, -48, -42, -73, -25, -74);
        p.c.bezierCurveTo(-36, -95, -12, -108, 1, -91);
        p.c.bezierCurveTo(19, -112, 43, -96, 30, -79);
        p.c.bezierCurveTo(55, -76, 51, -46, 32, -44);
        p.c.bezierCurveTo(25, -27, 8, -25, -2, -35);
        p.c.bezierCurveTo(-15, -24, -33, -25, -28, -39);
        p.c.closePath();
        p.c.fillStyle = this.color({ x, z }, state, z < 0 ? '#b1ceb0' : '#c5dba4');
        p.c.fill();
        p.c.lineWidth = 3.7;
        p.c.strokeStyle = ink;
        p.c.stroke();
        p.ellipse(-11, -62, 2.3, 3, ink, 0);
        p.ellipse(10, -61, 2.3, 3, ink, 0);
        p.curve({ x: -4, y: -50 }, { x: -1, y: -46 }, { x: 3, y: -46 }, { x: 6, y: -50 }, 2);
        p.line([
            { x: -1, y: -24 },
            { x: 0, y: -10 },
        ], 1.8);
        p.c.restore();
    }
    drawHearth(state) {
        const p = this.brush, s = localPoint(linePlaces.hearth), active = state.fireSeconds > 0;
        p.ellipse(s.x, s.y + 3, 31, 9, '#e9e5d7', 0);
        p.round(s.x - 22, s.y - 39, 44, 43, this.color(linePlaces.hearth, state, '#e7bc9c'), 16, 3.5);
        p.round(s.x - 13, s.y - 20, 26, 24, '#f1ece0', 12, 2.7);
        const height = (active ? 33 : 13) + Math.sin(state.elapsed * 8) * 2;
        p.path([
            { x: s.x - 10, y: s.y },
            { x: s.x - 6, y: s.y - height * 0.55 },
            { x: s.x - 1, y: s.y - height },
            { x: s.x + 3, y: s.y - height * 0.4 },
            { x: s.x + 9, y: s.y - 13 },
            { x: s.x + 11, y: s.y },
        ], active ? '#eda46c' : paper, true, 2.2);
        if (active)
            p.path([
                { x: s.x - 4, y: s.y },
                { x: s.x, y: s.y - height * 0.6 },
                { x: s.x + 5, y: s.y },
            ], '#f9d67b', true, 1.5);
        p.round(s.x - 14, s.y - 47, 28, 12, this.color(linePlaces.hearth, state, '#eac5a6'), 4, 2.5);
        for (let i = 0; i < 3; i++) {
            const phase = (state.elapsed * (active ? 22 : 9) + i * 18) % 57;
            p.c.globalAlpha = (1 - phase / 60) * 0.6;
            p.curve({ x: s.x + Math.sin(i) * 8, y: s.y - 51 - phase }, { x: s.x - 12, y: s.y - 60 - phase }, { x: s.x + 17, y: s.y - 67 - phase }, { x: s.x + 8, y: s.y - 76 - phase }, 2.2, '#918f82');
        }
        p.c.globalAlpha = 1;
        p.round(s.x + 33, s.y - 8, 27, 7, '#e8d8b8', 4, 2.2);
        p.round(s.x + 37, s.y - 16, 27, 7, '#e8d8b8', 4, 2.2);
        p.round(s.x - 30, s.y + 11, 60, 21, paper, 8, 2);
        p.text('화덕', s.x, s.y + 26, 12);
    }
    drawRefuge(state) {
        const p = this.brush, s = localPoint(linePlaces.refuge);
        p.ellipse(s.x, s.y + 8, 56, 29, this.color(linePlaces.refuge, state, '#dbdfaf'), 3);
        p.ellipse(s.x - 1, s.y + 7, 45, 22, paper, 1.5);
        p.round(s.x - 31, s.y - 11, 61, 11, this.color(linePlaces.refuge, state, '#eac697'), 5, 2.8);
        p.round(s.x - 31, s.y - 24, 61, 10, this.color(linePlaces.refuge, state, '#eac697'), 5, 2.8);
        for (const x of [-24, 24])
            p.line([
                { x: s.x + x, y: s.y - 15 },
                { x: s.x + x, y: s.y + 5 },
            ], 3.5);
        p.text('동그란 정원', s.x, s.y + 26, 11);
        if (state.paintProgress > 0.65) {
            this.flower(s.x - 50, s.y + 6, '#e9abbd');
            this.flower(s.x + 48, s.y + 8, '#ecc96a');
            p.ellipse(s.x + 21, s.y - 25, 6, 6, '#c9d8df', 2);
            p.curve({ x: s.x + 26, y: s.y - 25 }, { x: s.x + 34, y: s.y - 27 }, { x: s.x + 34, y: s.y - 18 }, { x: s.x + 26, y: s.y - 20 }, 2);
        }
    }
    drawLaundry(state) {
        const p = this.brush, a = localPoint({ x: -10.5, z: 0.8 }), b = localPoint({ x: -6.6, z: 0.8 });
        for (const s of [a, b])
            p.line([
                { x: s.x, y: s.y - 38 },
                { x: s.x - 1, y: s.y + 2 },
            ], 3);
        p.curve({ x: a.x, y: a.y - 36 }, { x: a.x + 25, y: a.y - 28 }, { x: b.x - 30, y: b.y - 30 }, { x: b.x, y: b.y - 36 }, 2);
        if (state.paintProgress > 0.32)
            for (let i = 0; i < 3; i++) {
                const x = a.x + 14 + i * 25, y = a.y - 33 + Math.sin(state.elapsed * 1.6 + i) * 2;
                p.path([
                    { x, y },
                    { x: x + 16, y: y + 2 },
                    { x: x + 18, y: y + 24 },
                    { x: x + 1, y: y + 23 },
                ], ['#efbb9f', '#d4c4d8', '#b4d1ca'][i] ?? paper, true, 2.3);
            }
    }
    drawHero(state) {
        const p = this.brush, s = localPoint(state.position), d = state.direction;
        const suffix = Math.abs(d.x) > Math.abs(d.z)
            ? d.x < 0
                ? '-left'
                : '-right'
            : d.z < 0
                ? '-back'
                : '';
        const motion = this.motions.get(`${state.moving ? 'move' : 'stand'}${suffix}`), frames = motion?.frames;
        const frame = frames?.[state.moving ? Math.floor(state.steps * 3) % frames.length : 0];
        if (!frame)
            return;
        const image = this.images.get(frame.localPath);
        if (!image)
            return;
        p.ellipse(s.x, s.y + 1, 13, 4, '#d5d2c4', 0);
        // 승인된 RGBA와 크기 비율은 그대로, 메타데이터의 바닥 기준 피벗을 쓴다.
        p.c.imageSmoothingEnabled = false;
        const size = 0.85;
        p.c.drawImage(image, s.x - frame.pivot.x * size, s.y - (frame.height - frame.pivot.y) * size, frame.width * size, frame.height * size);
        p.c.imageSmoothingEnabled = true;
        if (state.nearby) {
            p.round(s.x - 12, s.y - 76, 24, 17, paper, 7, 2);
            p.text('···', s.x, s.y - 64, 14);
        }
    }
}
