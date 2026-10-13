import manifest from '../../../../resources/manifest.json' with { type: 'json' };
import { resourceUrl } from '../../catalog/resource-url.js';
import { cutawayEdges, cutawayNodes, } from './village.js';
const unit = 24;
const colors = {
    ink: '#363f42',
    wood: '#80684f',
    edge: '#d4b487',
    cream: '#edddba',
    teal: '#496967',
    dark: '#303e45',
    green: '#899278',
    rust: '#a56250',
};
/** 실내 뒤벽·가구·주민·앞 복도를 따로 그려 잘린 외벽의 두께를 보인다. */
export class CutawayDrawing {
    canvas;
    ready;
    context;
    images = new Map();
    motions;
    width = 960;
    height = 420;
    scale = 1;
    camera = { x: 0, z: 4.5 };
    disposed = false;
    constructor(canvas) {
        this.canvas = canvas;
        const c = canvas.getContext('2d');
        if (!c)
            throw new Error('Canvas를 사용할 수 없습니다.');
        this.context = c;
        const hero = manifest.assets.find((a) => a.id === 'ai/tiger-hero');
        if (!hero)
            throw new Error('승인된 아타호 그림이 없습니다.');
        this.motions = new Map(Object.entries(hero.animations).filter(([name]) => [
            'stand',
            'stand-left',
            'stand-right',
            'move-left',
            'move-right',
        ].includes(name)));
        const frames = [...this.motions.values()].flatMap((motion) => motion.frames);
        this.ready = Promise.all(frames.map((frame) => this.load(frame))).then(() => undefined);
    }
    resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.height = 420;
        this.width = Math.max(280, Math.round((420 * rect.width) / Math.max(1, rect.height)));
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.context.imageSmoothingEnabled = false;
    }
    project(point) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: ((this.width / 2 + (point.x - this.camera.x) * unit * this.scale) *
                rect.width) /
                this.width,
            y: ((this.height / 2 - (point.z - this.camera.z) * unit * this.scale) *
                rect.height) /
                this.height,
        };
    }
    pointerToWorld(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (((clientX - rect.left) * this.width) / rect.width - this.width / 2) /
                unit /
                this.scale +
                this.camera.x,
            z: -(((clientY - rect.top) * this.height) / rect.height -
                this.height / 2) /
                unit /
                this.scale +
                this.camera.z,
        };
    }
    render(state, options) {
        if (this.disposed)
            return;
        const { overview, facade } = options;
        this.scale = overview
            ? Math.min(this.width / 860, this.height / 420) * 0.98
            : 1.18;
        this.camera = overview
            ? { x: 0, z: 6.3 }
            : {
                x: Math.max(-7, Math.min(7, state.position.x)),
                z: Math.max(2.1, Math.min(6.3, state.position.z + 2.1)),
            };
        const c = this.context;
        c.setTransform(1, 0, 0, 1, 0, 0);
        const sky = c.createLinearGradient(0, 0, 0, this.height);
        sky.addColorStop(0, '#273e50');
        sky.addColorStop(1, '#657571');
        c.fillStyle = sky;
        c.fillRect(0, 0, this.width, this.height);
        this.drawDistantTown();
        c.translate(this.width / 2 - this.camera.x * unit * this.scale, this.height / 2 + this.camera.z * unit * this.scale);
        c.scale(this.scale, this.scale);
        this.drawFoundation();
        this.drawHouse(-13, 10, 2, colors.rust);
        this.drawHouse(3, 10, 3, colors.teal);
        this.drawRoom(-13, 0, 10, 'workshop', state);
        this.drawRoom(-13, 4, 10, 'library', state);
        this.drawRoom(3, 0, 10, 'kitchen', state);
        this.drawRoom(3, 4, 10, 'dojo', state);
        this.drawRoom(3, 8, 10, 'bedroom', state);
        this.drawBridge(state.elapsed);
        this.drawStairs();
        this.drawHero(state);
        this.drawRailings();
        if (facade)
            this.drawFacade(state);
        if (state.target) {
            const p = this.point(state.target);
            c.strokeStyle = '#e8d4a2';
            c.lineWidth = 1;
            c.strokeRect(Math.round(p.x) - 5, Math.round(p.y) - 3, 10, 6);
        }
        c.setTransform(1, 0, 0, 1, 0, 0);
        if (overview) {
            c.fillStyle = '#20323ed9';
            c.fillRect(12, 12, 196, 37);
            c.fillStyle = '#f0dcaa';
            c.font = '11px system-ui';
            c.textAlign = 'left';
            c.fillText('CUTAWAY · 집의 하루를 들여다보기', 22, 28);
            c.fillStyle = '#b6c5bc';
            c.font = '9px system-ui';
            c.fillText('1층 공방 → 2층 도장 → 3층 다락', 22, 41);
        }
    }
    dispose() {
        this.disposed = true;
        this.images.clear();
    }
    load(frame) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => {
                if (!this.disposed)
                    this.images.set(frame.localPath, image);
                resolve();
            };
            image.onerror = () => reject(new Error(`아타호 그림 로딩 실패: ${frame.localPath}`));
            image.src = resourceUrl(frame.localPath).href;
        });
    }
    point(p) {
        return { x: p.x * unit, y: -p.z * unit };
    }
    box(x, z, width, height, color) {
        this.context.fillStyle = color;
        this.context.fillRect(Math.round(x * unit), Math.round(-z * unit), Math.round(width * unit), Math.round(height * unit));
    }
    line(a, b, color, width = 2) {
        const c = this.context, pa = this.point(a), pb = this.point(b);
        c.strokeStyle = color;
        c.lineWidth = width;
        c.beginPath();
        c.moveTo(pa.x, pa.y);
        c.lineTo(pb.x, pb.y);
        c.stroke();
    }
    label(text, x, z, color = colors.cream, size = 10) {
        const c = this.context;
        c.fillStyle = color;
        c.textAlign = 'center';
        c.font = `${size}px system-ui`;
        c.fillText(text, x * unit, -z * unit);
    }
    drawDistantTown() {
        const c = this.context;
        c.fillStyle = '#77918a';
        c.globalAlpha = 0.15;
        for (let i = 0; i < 18; i++) {
            const x = (i / 18) * this.width, h = 26 + ((i * 17) % 50);
            c.fillRect(x, this.height * 0.7 - h, this.width / 19, h);
            c.beginPath();
            c.moveTo(x - 3, this.height * 0.7 - h);
            c.lineTo(x + this.width / 38, this.height * 0.7 - h - 16);
            c.lineTo(x + this.width / 19 + 3, this.height * 0.7 - h);
            c.fill();
        }
        c.globalAlpha = 1;
    }
    drawFoundation() {
        this.box(-17, -0.15, 34, 1.25, '#3f4a46');
        for (let i = 0; i < 42; i++) {
            this.box(-17 + (i % 21) * 1.65, -0.35 - Math.floor(i / 21) * 0.42, 1.55, 0.35, i % 3 ? '#607066' : '#768074');
        }
        this.box(-17, 0, 34, 0.16, '#b6ae8c');
        this.box(-16.7, 0.03, 33.4, 0.06, '#e2d3ad');
        this.label('마을 입구', -14.6, -1.15, '#c7d0b3', 9);
        for (const x of [-15.7, 15.6]) {
            this.box(x, 1.7, 0.15, 1.7, colors.wood);
            this.box(x - 0.14, 1.8, 0.44, 0.55, '#dfb272');
            this.box(x - 0.07, 1.67, 0.3, 0.3, '#ffe2a2');
        }
    }
    drawHouse(x, width, floors, roofColor) {
        const c = this.context, top = floors * 4;
        this.box(x + 0.38, top + 0.3, width, top + 0.8, '#263b3bb0');
        this.box(x - 0.15, top + 0.05, width + 0.3, top + 0.18, colors.wood);
        this.box(x, top, width, top, '#bbae88');
        for (const side of [x - 0.15, x + width - 0.1]) {
            this.box(side, top + 0.12, 0.26, top + 0.25, '#cbaa78');
            this.box(side + 0.09, top, 0.06, top, '#f1d4a2');
        }
        const a = this.point({ x: x - 0.55, z: top + 0.2 });
        const b = this.point({ x: x + width / 2, z: top + 2.05 });
        const d = this.point({ x: x + width + 0.55, z: top + 0.2 });
        c.fillStyle = colors.ink;
        c.beginPath();
        c.moveTo(a.x, a.y);
        c.lineTo(b.x, b.y);
        c.lineTo(d.x, d.y);
        c.fill();
        c.fillStyle = roofColor;
        c.beginPath();
        c.moveTo(a.x + 5, a.y - 3);
        c.lineTo(b.x, b.y + 4);
        c.lineTo(d.x - 5, d.y - 3);
        c.fill();
        for (let row = 0; row < 6; row++) {
            const inset = row * 0.55;
            this.line({ x: x + inset, z: top + 0.32 + row * 0.25 }, { x: x + width - inset, z: top + 0.32 + row * 0.25 }, '#deb58b80', 1);
        }
        this.box(x + 1.2, top + 2.1, 0.66, 1.2, colors.wood);
        this.box(x + 1.1, top + 2.25, 0.87, 0.21, '#d5c3a0');
        for (let floor = 0; floor < floors; floor++) {
            this.box(x, floor * 4 + 0.12, width, 0.27, '#584b40');
            this.box(x, floor * 4 + 0.12, width, 0.08, '#e7c99c');
        }
    }
    drawRoom(x, floor, width, kind, state) {
        const c = this.context;
        const dojo = kind === 'dojo';
        const wall = dojo && !state.restored
            ? '#7c7a68'
            : kind === 'workshop'
                ? '#a18d6e'
                : kind === 'bedroom'
                    ? '#6f8580'
                    : '#c8b88c';
        this.box(x + 0.28, floor + 3.65, width - 0.56, 3.48, wall);
        this.box(x + 0.28, floor + 0.7, width - 0.56, 0.5, '#857259');
        for (let i = 0; i < 20; i++)
            this.box(x + 0.3 + i * 0.46, floor + 0.6, 0.03, 0.42, '#b09771');
        this.box(x + 0.26, floor + 3.65, 0.13, 3.45, '#d2b586');
        this.box(x + width - 0.4, floor + 3.65, 0.13, 3.45, '#736450');
        this.window(x + 1.35, floor + 2.7, kind === 'bedroom' ? '#c9b18b' : '#718e91');
        this.window(x + width - 2.8, floor + 2.7, '#708990');
        this.box(x + width / 2 - 1.55, floor + 3.65, 3.1, 0.52, colors.dark);
        const names = {
            workshop: '장작 공방',
            library: '책과 재료의 방',
            kitchen: '마을 부엌',
            dojo: state.restored ? '수련 도장' : '비어 있는 도장',
            bedroom: '다락 숙소 · 쉼터',
        };
        this.label(names[kind] ?? '', x + width / 2, floor + 3.29, '#e8d6a8', 10);
        this.lamp(x + width / 2, floor + 2.9, dojo && !state.restored);
        if (kind === 'workshop') {
            this.hearth(-10, state);
            this.table(-7.5, 0.65, 2.4);
            for (let i = 0; i < 4; i++)
                this.box(-7.3 + i * 0.4, 1.65, 0.22, 0.5, ['#a76552', '#648278', '#cba777'][i % 3]);
            this.person(-6.3, 0.6, '#cb9b71', '#607b74', state.elapsed, state.fireSeconds > 0 ? 'work' : 'idle');
            for (const px of [-12.3, -11.8, -11.3])
                this.box(px, 0.52, 0.34, 0.22, '#614e3c');
        }
        else if (kind === 'library') {
            this.bookcase(-10.5, 4.6);
            this.table(-7.2, 4.5, 2.8);
            this.box(-7, 5.32, 0.8, 0.15, '#e9ddad');
            this.person(-4.5, 4.5, '#d9b78c', '#a26554', state.elapsed * 0.65, 'read');
            this.plant(-11.8, 4.4, 1);
        }
        else if (kind === 'kitchen') {
            this.table(7.5, 0.6, 3.5);
            for (const px of [8.1, 9.3, 10]) {
                this.box(px, 1.64, 0.45, 0.13, '#e6d8ad');
                this.box(px + 0.08, 1.9, 0.21, 0.25, '#a37056');
            }
            this.box(4.1, 2.1, 1.5, 1.55, '#b2a285');
            this.box(4.25, 1.91, 1.22, 0.05, '#e3d4a5');
            this.person(6.7, 0.6, '#bf8f71', '#d0b384', state.elapsed, 'work');
        }
        else if (kind === 'dojo') {
            if (state.restored) {
                this.box(5.3, 4.53, 5.7, 0.3, '#b1b697');
                for (let i = 0; i < 5; i++)
                    this.box(5.4 + i * 1.15, 4.53, 0.04, 0.3, '#607a67');
                this.box(4.4, 6.5, 0.62, 1.6, '#a4654f');
                this.line({ x: 4.55, z: 6.1 }, { x: 4.75, z: 5 }, '#e6c88c', 3);
                this.person(9.5, 4.58, '#d1a37c', '#647f8a', state.elapsed, 'practice');
                this.plant(11.75, 4.48, 0.8);
            }
            else {
                for (let i = 0; i < 3; i++) {
                    this.box(9.2 + i * 0.6, 4.9 + (i % 2) * 0.45, 0.65, 0.65, '#897052');
                    this.box(9.23 + i * 0.6, 4.8 + (i % 2) * 0.45, 0.55, 0.08, '#b29b71');
                }
                this.line({ x: 4.3, z: 4.45 }, { x: 5.8, z: 5.1 }, '#50493f', 3);
                this.label('복구하면 수련을 시작해요', 7.9, 5.85, '#d4c7a1', 9);
            }
        }
        else {
            this.box(8.5, 8.7, 3, 0.23, colors.wood);
            this.box(8.65, 9.1, 2.85, 0.47, '#cead91');
            this.box(8.8, 9.35, 0.72, 0.25, '#e8d8b9');
            this.box(9.7, 9.38, 1.65, 0.49, '#9a6b58');
            this.table(3.7, 8.52, 1.7);
            this.box(4.2, 9.4, 0.25, 0.22, '#e0c698');
            this.plant(6.8, 8.4, 1.2);
            this.person(7.5, 8.5, '#b88969', '#998061', state.elapsed * 0.5, 'read');
            if (state.restSeconds > 0) {
                c.globalAlpha = 0.55;
                for (let i = 0; i < 3; i++)
                    this.line({
                        x: 4.3 + i * 0.13,
                        z: 9.8 + Math.sin(state.elapsed * 2 + i) * 0.1,
                    }, {
                        x: 4.3 + i * 0.13,
                        z: 10.1 + Math.sin(state.elapsed * 2 + i) * 0.15,
                    }, '#f0e3bc', 1);
                c.globalAlpha = 1;
            }
        }
        // 가구 뒤의 판자와 앞 복도의 색을 달리하여 보행 가능한 띠를 읽도록 한다.
        this.box(x + 0.2, floor + 0.18, width - 0.4, 0.16, '#dac197');
    }
    window(x, z, color) {
        this.box(x - 0.1, z + 0.1, 1.8, 1.5, '#6f6655');
        this.box(x, z, 1.6, 1.3, color);
        this.box(x + 0.73, z, 0.1, 1.3, '#ceba94');
        this.box(x, z - 0.61, 1.6, 0.1, '#ceba94');
        this.box(x - 0.18, z - 1.3, 1.95, 0.12, '#e2c99e');
    }
    lamp(x, z, dim) {
        this.line({ x, z: z + 0.75 }, { x, z }, colors.wood, 1);
        this.box(x - 0.26, z, 0.52, 0.34, dim ? '#918367' : '#eac791');
        this.box(x - 0.18, z - 0.27, 0.36, 0.08, dim ? '#b1a484' : '#ffe6b5');
    }
    table(x, z, width) {
        this.box(x, z + 0.8, width, 0.16, '#c8a276');
        this.box(x + 0.13, z + 0.64, 0.14, 0.64, colors.wood);
        this.box(x + width - 0.28, z + 0.64, 0.14, 0.64, colors.wood);
    }
    bookcase(x, z) {
        this.box(x, z + 2.45, 1.9, 2.45, '#776650');
        for (let row = 0; row < 3; row++) {
            this.box(x + 0.13, z + 0.78 + row * 0.72, 1.64, 0.09, '#c6ab7c');
            for (let i = 0; i < 6; i++)
                this.box(x + 0.17 + i * 0.26, z + 0.65 + row * 0.72, 0.2, 0.49, ['#9c6c57', '#718781', '#c7ad73'][i % 3]);
        }
    }
    plant(x, z, height) {
        this.box(x - 0.25, z + 0.35, 0.5, 0.35, '#9c7961');
        this.line({ x, z: z + 0.35 }, { x, z: z + height + 0.3 }, '#405e52', 2);
        for (let i = 0; i < 5; i++)
            this.box(x - 0.23 + (i % 2) * 0.23, z + 0.5 + i * 0.17, 0.29, 0.17, i % 2 ? '#b4b388' : '#7a9773');
    }
    hearth(x, state) {
        this.box(x - 0.5, 1.85, 1, 1.35, '#5e6560');
        this.box(x - 0.56, 1.94, 1.12, 0.17, '#cfba93');
        this.box(x - 0.24, 3.02, 0.48, 1.16, '#858671');
        this.box(x - 0.3, 1.17, 0.6, 0.52, '#493e35');
        const pulse = Math.round(Math.sin(state.elapsed * 9) * 3);
        const p = this.point({ x, z: 0.75 });
        this.context.fillStyle = state.fireSeconds > 0 ? '#ffb76d' : '#ba7850';
        this.context.fillRect(p.x - 4, p.y - 7 - pulse, 8, 7 + pulse);
        this.context.fillStyle = '#f4dda0';
        this.context.fillRect(p.x - 2, p.y - 4, 4, 4);
        if (state.fireSeconds > 0) {
            for (let i = 0; i < 4; i++) {
                const phase = (state.elapsed * 1.5 + i * 0.21) % 1;
                this.context.globalAlpha = 0.7 * (1 - phase);
                this.box(x - 0.05 + Math.sin(i + phase * 3) * 0.2, 1.3 + phase * 0.55, 0.05, 0.05, '#ffe5a0');
            }
            this.context.globalAlpha = 1;
        }
    }
    person(x, z, skin, shirt, time, mode) {
        const arm = mode === 'work' || mode === 'practice'
            ? Math.sin(time * (mode === 'practice' ? 2.3 : 4.7)) * 0.28
            : 0;
        this.box(x - 0.21, z + 0.62, 0.42, 0.55, shirt);
        this.box(x - 0.15, z + 1.03, 0.3, 0.39, skin);
        this.box(x - 0.18, z + 1.1, 0.36, 0.14, '#5e4a3d');
        this.box(x - 0.2, z + 0.2, 0.13, 0.2, colors.dark);
        this.box(x + 0.05, z + 0.2, 0.13, 0.2, colors.dark);
        this.line({ x: x + 0.18, z: z + 0.6 }, { x: x + 0.42, z: z + 0.4 + arm }, skin, 3);
        if (mode === 'read')
            this.box(x + 0.21, z + 0.55, 0.45, 0.16, '#ead7aa');
    }
    drawBridge(time) {
        this.box(-3, 4.13, 6, 0.32, '#806c53');
        this.box(-3, 4.13, 6, 0.1, '#d7bd91');
        this.line({ x: -3, z: 6.65 }, { x: 3, z: 6.65 }, '#5c5848', 1);
        for (let i = 0; i < 4; i++) {
            const x = -1.8 + i * 1.1, sway = Math.sin(time * 1.5 + i) * 0.06;
            this.box(x + sway, 6.55, 0.65, 0.85, ['#b9c3b3', '#ae7e67', '#a9bbaf', '#d1bb8e'][i]);
            this.box(x + sway + 0.12, 6.7, 0.35, 0.19, '#ccb98f');
        }
        this.label('이어진 2층 복도', 0, 4.42, '#d2c8a8', 8);
    }
    drawStairs() {
        for (const [a, b] of cutawayEdges) {
            const start = cutawayNodes[a], end = cutawayNodes[b];
            if (start.z === end.z)
                continue;
            const count = 20;
            this.line({ x: start.x, z: start.z + 0.05 }, { x: end.x, z: end.z + 0.05 }, '#544f43', 7);
            for (let i = 0; i < count; i++) {
                const x = start.x + ((end.x - start.x) * i) / count;
                const z = start.z + ((end.z - start.z) * i) / count;
                this.box(x - 0.12, z + 0.12, 0.42, 0.13, '#d0b58b');
            }
            this.line({ x: start.x, z: start.z + 1.05 }, { x: end.x, z: end.z + 1.05 }, '#bca37b', 2);
            for (const t of [0, 0.25, 0.5, 0.75, 1]) {
                const x = start.x + (end.x - start.x) * t, z = start.z + (end.z - start.z) * t;
                this.line({ x, z }, { x, z: z + 1.05 }, '#8c7858', 1);
            }
        }
    }
    drawRailings() {
        for (const [start, end, z] of [
            [-3, 1, 4],
            [1, 3, 4],
            [13, 14, 0],
        ]) {
            this.line({ x: start, z: z + 0.55 }, { x: end, z: z + 0.55 }, '#cfba91', 1);
            for (let x = start; x <= end; x += 0.6)
                this.line({ x, z }, { x, z: z + 0.55 }, '#776a51', 1);
        }
    }
    drawFacade(state) {
        const c = this.context;
        c.globalAlpha = 0.91;
        for (const [x, floors, color] of [
            [-13, 2, '#b8a889'],
            [3, 3, '#a29c7e'],
        ]) {
            this.box(x + 0.18, floors * 4 - 0.2, 9.65, floors * 4 - 0.4, color);
            for (let i = 0; i < floors; i++) {
                this.window(x + 1.4, i * 4 + 2.7, '#4b6468');
                this.window(x + 7.05, i * 4 + 2.7, state.restored ? '#d6bc8a' : '#4b6468');
                this.box(x + 4.3, i * 4 + 2.2, 1.45, 2.1, '#655c4b');
            }
        }
        c.globalAlpha = 1;
        this.drawHero(state);
    }
    drawHero(state) {
        const name = state.moving
            ? state.direction.x < 0
                ? 'move-left'
                : 'move-right'
            : 'stand';
        const frames = this.motions.get(name)?.frames;
        const frame = frames?.[state.moving ? Math.floor(state.steps * 3) % frames.length : 0];
        if (!frame)
            return;
        const image = this.images.get(frame.localPath);
        if (!image)
            return;
        const p = this.point(state.position), scale = 0.73;
        this.context.fillStyle = '#403d3570';
        this.context.fillRect(p.x - 8, p.y, 17, 2);
        this.context.drawImage(image, Math.round(p.x - frame.pivot.x * scale), Math.round(p.y - (frame.height - frame.pivot.y) * scale), frame.width * scale, frame.height * scale);
        if (state.nearby) {
            this.context.fillStyle = '#eee0b4';
            this.context.fillRect(p.x - 7, p.y - 57, 14, 9);
            this.context.fillRect(p.x - 1, p.y - 49, 2, 3);
            this.label('···', state.position.x, state.position.z + 2.09, colors.dark, 9);
        }
    }
}
