import { drawPixelResident } from '../village-style-window-village/resident.js';
import manifest from '../../../../resources/manifest.json' with { type: 'json' };
import { resourceUrl } from '../../catalog/resource-url.js';
import { AnimationPlayer, } from '../../preview/animation-player.js';
import { createBuilding } from './art.js';
import { facilities, } from './village.js';
const unit = 60;
const groundY = 485;
const floorHeight = 170;
/** 화면 변환·재질·원본 캐릭터·그리기 순서를 소유한다. 게임 진행은 전달된 snapshot만 읽는다. */
export class LitStreetDrawing {
    canvas;
    ready;
    context;
    animation;
    images = new Map();
    art = new Map();
    width = 1000;
    height = 620;
    scale = 1;
    camera = 8;
    originY = 0;
    previousElapsed = 0;
    lastShade = -1;
    shadeVersion = '';
    restored = false;
    disposed = false;
    motion = 'stand-right';
    lightSide = -1;
    lightTime = 0;
    constructor(canvas) {
        this.canvas = canvas;
        const c = canvas.getContext('2d');
        if (!c)
            throw new Error('2D Canvas를 사용할 수 없습니다.');
        this.context = c;
        const asset = manifest.assets.find((a) => a.id === 'ai/tiger-hero');
        if (!asset)
            throw new Error('승인된 아타호 리소스가 없습니다.');
        const motions = new Map(Object.entries(asset.animations).filter(([name]) => ['stand-left', 'stand-right', 'move-left', 'move-right'].includes(name)));
        this.animation = new AnimationPlayer(motions, this.motion);
        this.ready = Promise.all([...motions.values()].flatMap((a) => a.frames).map((f) => this.load(f))).then(() => undefined);
        for (const f of facilities)
            this.art.set(f.id, createBuilding(f.id, false));
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
        this.width = Math.max(1, bounds.width);
        this.height = Math.max(1, bounds.height);
        const dpr = Math.min(2, devicePixelRatio || 1);
        this.canvas.width = Math.round(this.width * dpr);
        this.canvas.height = Math.round(this.height * dpr);
    }
    project(point) {
        return {
            x: this.width / 2 + (point.x - this.camera) * unit * this.scale,
            y: this.originY + (groundY - point.z * floorHeight) * this.scale,
        };
    }
    pointerToWorld(clientX, clientY) {
        const bounds = this.canvas.getBoundingClientRect();
        const x = this.camera +
            (clientX - bounds.left - this.width / 2) / (unit * this.scale);
        const y = (clientY - bounds.top - this.originY) / this.scale;
        return { x, z: x >= 25 && y < groundY - floorHeight / 2 ? 1 : 0 };
    }
    changeLight() {
        this.lightSide *= -1;
        this.lastShade = -1;
    }
    get diagnostics() {
        return {
            layer: [0.12, 0.38, 1, 1.14].map((ratio, i) => ({
                name: ['능선', '뒤집', '상점', '전경'][i],
                ratio,
                offset: -this.camera * unit * this.scale * ratio,
            })),
            camera: {
                x: this.camera,
                scale: this.scale,
                width: this.width,
                height: this.height,
            },
            light: {
                side: this.lightSide,
                time: this.lightTime,
                method: 'albedo × (ambient + normal·light × attenuation)',
                sampleInterval: 0.12,
            },
            normal: {
                source: '벽돌·기와·마루 높이장의 중앙차분',
                reliefPixels: [...this.art.values()].reduce((sum, art) => sum + art.base.reliefSamples + art.facade.reliefSamples, 0),
                unlitSprite: true,
            },
        };
    }
    render(state, overview) {
        if (this.disposed)
            return;
        this.scale = overview
            ? Math.min(this.width / 2350, this.height / 620)
            : this.height / 620;
        const halfView = this.width / (2 * unit * this.scale);
        this.camera = overview
            ? 18.5
            : Math.max(halfView + 0.2, Math.min(37 - halfView, state.position.x));
        this.originY = overview ? this.height * 0.8 - groundY * this.scale : 0;
        const delta = Math.max(0, state.elapsed - this.previousElapsed);
        this.previousElapsed = state.elapsed;
        const motion = `${state.moving ? 'move' : 'stand'}-${state.facing}`;
        if (motion !== this.motion) {
            this.motion = motion;
            this.animation.play(motion);
        }
        this.animation.update(delta);
        this.lightTime = state.elapsed;
        this.shade(state);
        const c = this.context;
        c.setTransform(this.canvas.width / this.width, 0, 0, this.canvas.height / this.height, 0, 0);
        const sky = c.createLinearGradient(0, 0, 0, this.height);
        sky.addColorStop(0, '#172537');
        sky.addColorStop(0.65, '#526569');
        sky.addColorStop(1, '#c29366');
        c.fillStyle = sky;
        c.fillRect(0, 0, this.width, this.height);
        c.imageSmoothingEnabled = false;
        c.save();
        c.translate(this.width / 2, this.originY);
        c.scale(this.scale, this.scale);
        this.backdrop();
        c.save();
        c.translate(-this.camera * unit, 0);
        this.street(state);
        for (const f of facilities)
            this.building(f.id, state, false);
        this.stairs();
        if (state.position.z > 0.02 && state.position.z < 0.98)
            this.rect(state.position.x * unit - 17, groundY - state.position.z * floorHeight + 1, 34, 3, '#eed6a0');
        for (const f of facilities)
            this.building(f.id, state, true);
        this.hero(state);
        this.signs(state);
        c.restore();
        this.foreground();
        c.restore();
    }
    shade(state) {
        if (state.repaired !== this.restored) {
            const previous = this.art.get('dojo');
            previous?.base.dispose();
            previous?.facade.dispose();
            this.art.set('dojo', createBuilding('dojo', state.repaired));
            this.restored = state.repaired;
        }
        const version = `${state.repaired}/${state.fireSeconds > 0}/${state.practiceSeconds > 0}/${this.lightSide}`;
        if (state.elapsed - this.lastShade < 0.12 &&
            this.shadeVersion === version &&
            this.lastShade >= 0)
            return;
        this.shadeVersion = version;
        this.lastShade = state.elapsed;
        for (const [id, art] of this.art) {
            const lampX = art.width / 2 +
                this.lightSide * 65 +
                Math.sin(state.elapsed * 1.2) * (state.practiceSeconds > 0 ? 22 : 5);
            const lights = [{ x: lampX, y: id === 'inn' ? 120 : 165, power: 1.15 }];
            if (id === 'workshop' && state.fireSeconds > 0)
                lights.push({
                    x: 94,
                    y: 257,
                    power: 1.4 + Math.sin(state.elapsed * 15) * 0.16,
                });
            art.base.shade(lights);
            art.facade.shade(lights);
        }
    }
    backdrop() {
        const c = this.context;
        c.save();
        c.translate(-this.camera * unit * 0.12, 0);
        c.fillStyle = '#e6d9b2';
        c.beginPath();
        c.arc(495, 79, 26, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#28454f';
        c.beginPath();
        c.moveTo(-1600, 405);
        for (let x = -1600; x <= 3000; x += 90)
            c.lineTo(x, 265 - Math.sin(x / 300) * 60 - Math.cos(x / 180) * 28);
        c.lineTo(3000, 480);
        c.lineTo(-1600, 480);
        c.fill();
        c.fillStyle = '#39565c';
        c.beginPath();
        c.moveTo(-1600, 455);
        for (let x = -1600; x <= 3000; x += 80)
            c.lineTo(x, 340 - Math.sin(x / 230) * 50);
        c.lineTo(3000, 485);
        c.lineTo(-1600, 485);
        c.fill();
        c.restore();
        c.save();
        c.translate(-this.camera * unit * 0.38, 0);
        for (let i = -10; i < 24; i++) {
            const x = i * 148, h = 65 + ((i * i) % 4) * 13;
            this.rect(x, 408 - h, 92, h, '#3d5355');
            this.poly([
                [x - 8, 408 - h],
                [x + 40, 375 - h],
                [x + 100, 408 - h],
            ], '#34474c');
            this.rect(x + 18, 426 - h, 13, 20, i % 3 ? '#857b57' : '#566666');
        }
        c.restore();
    }
    street(state) {
        this.rect(-100, groundY - 6, 2440, 140, '#5b6259');
        this.rect(-100, groundY + 8, 2440, 6, '#878575');
        for (let x = -60; x < 2280; x += 56) {
            this.rect(x, groundY + 28, 47, 7, '#77766a');
            this.rect(x + 22, groundY + 50, 32, 5, '#676e63');
        }
        this.rect(-100, groundY + 83, 2440, 24, '#334d4b');
        this.rect(-100, groundY + 85, 2440, 3, '#57756d');
        for (let i = 0; i < 18; i++)
            this.rect(i * 135 + Math.sin(state.elapsed * 0.65 + i) * 8, groundY + 98, 43, 1, '#a0a58b');
        this.rect(26 * unit - 8, groundY - floorHeight + 3, 8 * unit + 20, 14, '#7d7961');
        for (let x = 26 * unit; x <= 34 * unit; x += 70) {
            this.rect(x, groundY - floorHeight + 15, 9, floorHeight - 20, '#5c5d4c');
            this.rect(x, groundY - floorHeight - 25, 5, 29, '#938467');
        }
        this.rect(26 * unit, groundY - floorHeight - 24, 8 * unit, 4, '#b59b6c');
    }
    stairs() {
        const c = this.context;
        for (let i = 0; i < 12; i++) {
            const x = 23 * unit + i * 15, y = groundY - i * (floorHeight / 12);
            this.rect(x, y, 17, 8, '#b6a181');
            this.rect(x, y + 8, 17, groundY - y, '#5e6557');
        }
        c.strokeStyle = '#c2a778';
        c.lineWidth = 4;
        c.beginPath();
        c.moveTo(23 * unit - 4, groundY - 33);
        c.lineTo(26 * unit + 4, groundY - floorHeight - 33);
        c.stroke();
        for (let i = 0; i <= 4; i++)
            this.rect(23 * unit + i * 45, groundY - i * 42.5 - 32, 4, 32, '#907c5c');
        this.text('↑ 2층 찻방', 23 * unit - 2, groundY + 43, 13, '#eee0b7');
    }
    building(id, state, facade) {
        const f = facilities.find((f) => f.id === id);
        const art = this.art.get(id);
        if (!f || !art)
            return;
        const x = f.x * unit - art.width / 2, y = groundY - art.height;
        const c = this.context;
        if (!facade) {
            c.drawImage(art.base.canvas, x, y);
            this.resident(id, x, y, art, state);
            if (id === 'workshop' && state.fireSeconds > 0) {
                const flicker = Math.sin(state.elapsed * 15) * 4;
                this.poly([
                    [x + 79, y + 284],
                    [x + 83, y + 255 + flicker],
                    [x + 94, y + 266],
                    [x + 102, y + 243 - flicker],
                    [x + 115, y + 283],
                ], '#ee9748');
                this.poly([
                    [x + 86, y + 284],
                    [x + 97, y + 260],
                    [x + 107, y + 284],
                ], '#ffda8e');
                c.globalAlpha = 0.18;
                for (let i = 0; i < 3; i++) {
                    const t = (state.elapsed * 15 + i * 28) % 90;
                    this.circle(x + 68 + Math.sin(t * 0.06) * 5, y + 8 - t, 9 + t * 0.13, '#cbc6b0');
                }
                c.globalAlpha = 1;
            }
            const lampX = x +
                art.width / 2 +
                this.lightSide * 65 +
                Math.sin(state.elapsed * 1.2) * (state.practiceSeconds > 0 ? 22 : 5);
            const lampY = y + (id === 'inn' ? 120 : 165);
            this.rect(lampX - 1, lampY - 30, 2, 26, '#998368');
            this.rect(lampX - 7, lampY - 5, 14, 19, '#e7b75d');
            this.rect(lampX - 9, lampY - 7, 18, 4, '#6c5540');
            this.rect(lampX - 9, lampY + 13, 18, 4, '#6c5540');
            return;
        }
        const near = state.nearby === id;
        c.globalAlpha = state.inside === id ? 0.04 : near ? 0.36 : 0.94;
        c.drawImage(art.facade.canvas, x, y);
        c.globalAlpha = 1;
        if (state.inside !== id) {
            this.rect(f.x * unit - 25, groundY - f.z * floorHeight - 97, 50, 90, '#392e29');
            this.rect(f.x * unit - 20, groundY - f.z * floorHeight - 92, 40, 85, '#86745a');
            this.rect(f.x * unit + 5, groundY - f.z * floorHeight - 30, 3, 3, '#dfc684');
        }
    }
    resident(id, x, y, art, state) {
        const px = x + (id === 'workshop' ? 270 : id === 'dojo' ? 319 : 288);
        const py = y + art.floorY;
        const active = id === 'workshop'
            ? state.fireSeconds > 0
            : id === 'dojo'
                ? state.practiceSeconds > 0
                : state.tea;
        drawPixelResident(this.context, {
            x: px,
            y: py,
            role: id === 'workshop' ? 'smith' : id === 'dojo' ? 'trainer' : 'host',
            active,
            elapsed: state.elapsed,
            scale: 1.4,
        });
        const c = this.context;
        if (id === 'workshop' && state.worked) {
            this.rect(x + 225, y + 247, 10, 6, '#c9a06a');
            this.rect(x + 237, y + 247, 10, 6, '#ad8b58');
        }
        if (id === 'inn' && state.tea) {
            this.rect(x + 207, y + 180, 13, 12, '#d7c19a');
            c.globalAlpha = 0.5;
            this.rect(x + 211 + Math.sin(state.elapsed) * 2, y + 164, 2, 13, '#ede3be');
            c.globalAlpha = 1;
        }
    }
    hero(state) {
        const { frame } = this.animation.currentFrame;
        const image = this.images.get(frame.localPath);
        if (!image)
            return;
        const x = state.position.x * unit, y = groundY - state.position.z * floorHeight;
        const c = this.context;
        c.fillStyle = '#27302c70';
        c.beginPath();
        c.ellipse(x, y - 1, 19, 4, 0, 0, Math.PI * 2);
        c.fill();
        const scale = 1.4;
        c.imageSmoothingEnabled = false;
        c.drawImage(image, Math.round(x - frame.pivot.x * scale), Math.round(y - (frame.height - frame.pivot.y) * scale), frame.width * scale, frame.height * scale);
        if (state.nearby)
            this.text(state.inside ? 'SPACE · 함께하기' : 'SPACE · 들어가기', x, y - 101, 12, '#fff0c8');
    }
    signs(state) {
        for (const f of facilities) {
            const art = this.art.get(f.id);
            if (!art)
                continue;
            const label = f.id === 'workshop'
                ? '구리빛 공방'
                : f.id === 'dojo'
                    ? state.repaired
                        ? '달맞이 도장 · 복구'
                        : '달맞이 도장'
                    : '등불 여관';
            const y = groundY -
                art.height +
                (f.id === 'inn' ? 95 : f.id === 'dojo' ? 126 : 148);
            const x = f.x * unit;
            this.rect(x - 65, y - 12, 130, 25, '#3b4036');
            this.text(label, x, y + 4, 13, '#f1dcab');
            if (state.inside === f.id)
                this.text(f.id === 'inn' ? '2층 · 차와 쉼' : '실내 · 작업과 생활', x, y - 26, 12, '#ded0ad');
        }
        this.text('거리 입구', 2 * unit, groundY + 42, 13, '#e0d0ad');
        this.text('한 단 한 단 · 위층으로', 26 * unit + 44, groundY - floorHeight - 41, 11, '#d8c593');
    }
    foreground() {
        const c = this.context;
        c.save();
        c.translate(-this.camera * unit * 1.14, 0);
        for (const x of [-120, 930, 2270]) {
            this.rect(x, 440, 9, 170, '#293d3b');
            this.poly([
                [x - 20, 609],
                [x + 15, 509],
                [x + 32, 610],
            ], '#2b4841');
            this.circle(x + 1, 559, 20, '#345147');
            this.circle(x - 21, 581, 16, '#3b5a4b');
        }
        c.restore();
    }
    rect(x, y, width, height, color) {
        this.context.fillStyle = color;
        this.context.fillRect(x, y, width, height);
    }
    circle(x, y, radius, color) {
        this.context.fillStyle = color;
        this.context.beginPath();
        this.context.arc(x, y, radius, 0, Math.PI * 2);
        this.context.fill();
    }
    poly(points, color) {
        const c = this.context;
        c.fillStyle = color;
        c.beginPath();
        points.forEach((p, i) => (i ? c.lineTo(...p) : c.moveTo(...p)));
        c.closePath();
        c.fill();
    }
    text(label, x, y, size, color) {
        const c = this.context;
        c.font = `600 ${size}px "Apple SD Gothic Neo", sans-serif`;
        c.textAlign = 'center';
        c.fillStyle = color;
        c.fillText(label, x, y);
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.images.clear();
        for (const art of this.art.values()) {
            art.base.dispose();
            art.facade.dispose();
        }
        this.art.clear();
        this.canvas.width = this.canvas.height = 1;
    }
}
