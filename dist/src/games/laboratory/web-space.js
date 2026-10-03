import { world, viewport } from './layout.js';
import { getContext } from './assets.js';
import { passage } from './game.js';
import { pipes, pipeShape } from './pipe-cascade.js';
import { smooth } from './event-rules.js';
import { pursuit } from './frame-chase.js';
import { drawPlayer } from './player-renderer.js';
import { cameraPosition, frameEdge, stagePanelViews, returnPanels, panelWidth, stagePanels, } from './spatial-rules.js';
// 입력과 물리는 원래 게임에 두고, 페이지 경계와 3D 평면의 표시만 소유한다.
export class WebSpace {
    scene;
    assets;
    overlayHost;
    isRotated;
    root = document.createElement('div');
    taunt = document.createElement('div');
    escapeLayer = document.createElement('canvas');
    fallLayer = document.createElement('canvas');
    rim = document.createElement('div');
    perspective = document.createElement('div');
    stage = document.createElement('div');
    actor = document.createElement('canvas');
    panels = [];
    density = 1;
    constructor(scene, assets, overlayHost, isRotated) {
        this.scene = scene;
        this.assets = assets;
        this.overlayHost = overlayHost;
        this.isRotated = isRotated;
        this.root.className = 'web-space';
        this.root.setAttribute('aria-hidden', 'true');
        this.root.hidden = true;
        this.taunt.className = 'mirror-taunt';
        this.taunt.hidden = true;
        const tauntText = '이제 어느 방향으로 갈래?';
        this.taunt.setAttribute('aria-label', tauntText);
        for (const [index, letter] of [...tauntText].entries()) {
            const span = document.createElement('span');
            span.textContent = letter;
            span.style.setProperty('--letter-delay', `${index * 0.075}s`);
            span.style.setProperty('--letter-tilt', `${[-4, 3, -2, 5, -3][index % 5]}deg`);
            this.taunt.append(span);
        }
        this.escapeLayer.className = 'escape-layer';
        this.fallLayer.className = 'page-falling-actor';
        this.fallLayer.setAttribute('aria-hidden', 'true');
        this.fallLayer.hidden = true;
        overlayHost.append(this.fallLayer);
        this.rim.className = 'frame-rim';
        this.perspective.className = 'stage-perspective';
        this.stage.className = 'fold-stage';
        this.actor.className = 'stage-actor';
        for (const [index, x] of [...stagePanels, ...returnPanels].entries()) {
            const panel = document.createElement('div');
            panel.className =
                index < stagePanels.length ? 'wall-panel' : 'wall-panel reverse';
            const front = this.makeFront(x);
            front.className = 'wall-front';
            const back = this.makeBack();
            back.className = 'wall-back';
            const edge = document.createElement('div');
            edge.className = 'wall-edge';
            panel.append(front, back, edge);
            this.panels.push(panel);
            this.stage.append(panel);
        }
        this.stage.append(this.actor);
        this.perspective.append(this.stage);
        this.root.append(this.perspective, this.escapeLayer, this.rim, this.taunt);
        this.scene.parentElement?.append(this.root);
    }
    resize(width, density) {
        const surface = this.fallSurface;
        this.fallLayer.width = Math.round(surface.width * density);
        this.fallLayer.height = Math.round(surface.height * density);
        this.root.style.transform = `scale(${width / viewport.width})`;
        // DOM 안의 Canvas도 기본 장면과 같은 실제 픽셀 밀도로 그린다.
        this.density = (density * width) / viewport.width;
        for (const [canvas, w, h] of [
            [this.escapeLayer, viewport.width, viewport.height],
            [this.actor, 280, viewport.height],
        ]) {
            canvas.width = Math.round(w * this.density);
            canvas.height = Math.round(h * this.density);
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
        }
    }
    render(state, frame) {
        const escape = state.scenario === 'frame-escape' &&
            state.anomaly.activeElapsed !== null &&
            (state.phase === 'playing' ||
                state.phase === 'falling' ||
                state.phase === 'transition');
        const folding = state.scenario === 'folding-stage' && state.phase !== 'complete';
        const tauntTime = state.anomaly.mirrorElapsed;
        const taunting = state.scenario === 'mirrored-lab' &&
            tauntTime !== null &&
            tauntTime >= 1.65 &&
            tauntTime < 7.5;
        this.taunt.hidden = !taunting;
        if (taunting) {
            // CSS 모션도 게임 시각에 맞춰 정지·재시작되므로 탭을 떠나도 어긋나지 않는다.
            this.taunt.style.setProperty('--taunt-time', `${tauntTime - 1.65}s`);
            this.taunt.style.opacity = String(smooth((tauntTime - 1.65) / 0.5) * (1 - smooth((tauntTime - 6.5) / 1)));
        }
        this.root.hidden = !escape && !folding && !taunting;
        const elapsed = state.transitionElapsed;
        this.root.style.opacity =
            elapsed === null
                ? '1'
                : String(elapsed < passage.fadeOut
                    ? 1 - elapsed / passage.fadeOut
                    : Math.min(1, (elapsed - passage.fadeOut) / passage.fadeIn));
        this.scene.closest('.stage')?.classList.toggle('frame-broken', escape);
        this.scene.style.clipPath = escape
            ? `inset(0 ${100 - frameEdge(state) / 10}% 0 0)`
            : '';
        const warning = state.chase.phase === 'warning';
        const tremble = warning
            ? 1.5 + (state.chase.elapsed / pursuit.grace) * 2.5
            : 0;
        const shake = Math.sin(state.chase.elapsed * 85) * tremble;
        this.scene.style.transform = escape ? `translateX(${shake / 10}%)` : '';
        this.rim.style.transform = `translateX(${shake}px)`;
        const opacity = state.phase === 'falling'
            ? Math.max(0, Math.min(1, 1 - (state.chase.elapsed - 0.78) / 0.27))
            : 1;
        this.scene.style.opacity = String(opacity);
        this.root.style.opacity = String(Number(this.root.style.opacity) * opacity);
        this.fallLayer.hidden = state.phase !== 'falling';
        if (state.phase === 'falling')
            this.drawFall(state, frame);
        this.escapeLayer.hidden = this.rim.hidden = !escape;
        this.perspective.hidden = !folding;
        if (escape)
            this.drawEscape(state, frame);
        if (folding)
            this.drawStage(state, frame);
    }
    destroy() {
        this.root.remove();
        this.fallLayer.remove();
        this.scene.style.transform =
            this.scene.style.transformOrigin =
                this.scene.style.opacity =
                    '';
        this.scene.style.clipPath = '';
        this.scene.closest('.stage')?.classList.remove('frame-broken');
    }
    context(canvas, width, height) {
        const ctx = getContext(canvas);
        ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
        ctx.clearRect(0, 0, width, height);
        ctx.imageSmoothingEnabled = false;
        return ctx;
    }
    drawEscape(state, frame) {
        const edge = frameEdge(state);
        const camera = cameraPosition(state.player.x);
        this.rim.style.width = `${frameEdge(state)}px`;
        const pulse = Math.max(0, 1 - (state.anomaly.activeElapsed ?? 0) / 0.9);
        const warning = state.chase.phase === 'warning';
        const chasing = state.chase.phase === 'chasing';
        this.rim.style.borderColor = warning || chasing ? '#d5d1a2' : '#8eac9c';
        this.rim.style.boxShadow =
            warning || chasing
                ? '5px 0 16px #d0d69b55, 12px 12px 26px #0006'
                : `${-pulse * 5}px 0 ${pulse * 24}px #b9dac777, 12px 12px 26px #0006`;
        const ctx = this.context(this.escapeLayer, viewport.width, viewport.height);
        // 같은 좌표계로 경계 양쪽을 나누므로 통과 중 크기와 속도가 바뀌지 않는다.
        ctx.save();
        ctx.beginPath();
        ctx.rect(edge, 0, viewport.width - edge, viewport.height);
        ctx.clip();
        const floor = ctx.createLinearGradient(edge, 0, viewport.width, 0);
        // 유예 시간이 끝나갈수록 페이지 위의 발판도 흔들리며 사라진다.
        ctx.globalAlpha = warning
            ? Math.max(0, 1 - state.chase.elapsed / pursuit.grace)
            : 0;
        floor.addColorStop(0, '#849184');
        floor.addColorStop(1, '#84918415');
        ctx.fillStyle = floor;
        ctx.fillRect(edge, world.ground, viewport.width - edge, 2);
        ctx.fillStyle = '#00000030';
        ctx.fillRect(edge, world.ground + 2, viewport.width - edge, 6);
        ctx.restore();
        if (state.phase !== 'falling') {
            ctx.save();
            ctx.translate(-camera, 0);
            drawPlayer(ctx, this.assets, state.player, frame);
            ctx.restore();
        }
        if (pulse > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, edge, viewport.height);
            ctx.clip();
            ctx.globalAlpha = pulse * 0.25;
            drawPlayer(ctx, this.assets, {
                ...state.player,
                x: Math.min(edge - 35, 730),
                y: world.ground,
                flashRemaining: 0,
            }, frame, false);
            ctx.restore();
        }
    }
    get fallSurface() {
        return this.isRotated()
            ? {
                width: this.overlayHost.clientWidth,
                height: this.overlayHost.clientHeight,
            }
            : { width: window.innerWidth, height: window.innerHeight };
    }
    drawFall(state, frame) {
        const caught = state.chase.caught;
        if (!caught)
            return;
        const surface = this.fallSurface;
        const ctx = this.context(this.fallLayer, surface.width, surface.height);
        const bounds = this.root.getBoundingClientRect();
        const host = this.overlayHost.getBoundingClientRect();
        const rotated = this.isRotated();
        // 회전 시 낙하 레이어도 게임과 함께 돌기 때문에 화면 좌표를 로컬 좌표로 되돌린다.
        const left = rotated ? bounds.top - host.top : bounds.left;
        const top = rotated ? host.right - bounds.right : bounds.top;
        const scale = (rotated ? bounds.height : bounds.width) / viewport.width;
        const t = state.chase.elapsed;
        const x = Math.min(990, caught.x - cameraPosition(caught.x) + 90 * t);
        const drop = Math.max(1000, (surface.height - top) / scale + 160);
        const y = caught.y - 28 - 150 * t + drop * t * t;
        ctx.save();
        ctx.translate(left + x * scale, top + y * scale);
        ctx.scale(scale, scale);
        ctx.rotate(t * Math.PI * 5);
        drawPlayer(ctx, this.assets, { ...caught, x: 0, y: 28, flashRemaining: 0 }, frame, false);
        ctx.restore();
    }
    drawStage(state, frame) {
        const camera = cameraPosition(state.player.x);
        const views = stagePanelViews(state);
        this.panels.forEach((panel, index) => {
            const view = views[index];
            panel.hidden = !view.visible;
            panel.style.transformOrigin = view.reverse
                ? 'right center'
                : 'left center';
            panel.style.left = `${view.x - camera}px`;
            const angle = view.angle;
            panel.style.transform = `rotateY(${angle}deg)`;
            panel.style.setProperty('--panel-shade', String(Math.min(0.72, Math.abs(angle) / 180)));
        });
        this.actor.style.left = `${state.player.x - camera - 140}px`;
        const ctx = this.context(this.actor, 280, viewport.height);
        ctx.save();
        ctx.translate(140 - state.player.x, 0);
        drawPlayer(ctx, this.assets, state.player, frame);
        ctx.restore();
    }
    makeFront(x) {
        const canvas = document.createElement('canvas');
        canvas.width = panelWidth;
        canvas.height = world.ground;
        const ctx = getContext(canvas);
        ctx.drawImage(this.assets.normal, x, 0, panelWidth, world.ground, 0, 0, panelWidth, world.ground);
        for (const pipe of pipes)
            ctx.drawImage(this.assets.pipe, pipe.x - x - pipe.width / 2, pipeShape.top, pipe.width, pipeShape.height);
        return canvas;
    }
    makeBack() {
        const canvas = document.createElement('canvas');
        canvas.width = panelWidth;
        canvas.height = world.ground;
        const ctx = getContext(canvas);
        ctx.fillStyle = '#24312f';
        ctx.fillRect(0, 0, panelWidth, world.ground);
        // 뒷면에는 보강재와 배선을 그려 앞면 그림의 단순 반전과 구분한다.
        ctx.globalAlpha = 0.16;
        ctx.drawImage(this.assets.normal, 0, 340, 800, 90, 0, 0, panelWidth, world.ground);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#536052';
        ctx.lineWidth = 12;
        ctx.strokeRect(9, 9, panelWidth - 18, world.ground - 18);
        ctx.beginPath();
        ctx.moveTo(14, 14);
        ctx.lineTo(panelWidth - 14, world.ground - 14);
        ctx.moveTo(panelWidth - 14, 14);
        ctx.lineTo(14, world.ground - 14);
        ctx.stroke();
        ctx.strokeStyle = '#0b1316';
        ctx.lineWidth = 4;
        for (const x of [85, 260, 415]) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.bezierCurveTo(x - 40, 110, x + 110, 180, x + 15, 340);
            ctx.stroke();
        }
        ctx.fillStyle = '#929b7f';
        for (const x of [12, panelWidth - 16])
            for (const y of [14, 165, 320])
                ctx.fillRect(x, y, 4, 4);
        ctx.fillStyle = '#a2ac8655';
        ctx.font = '14px monospace';
        ctx.fillText('C-2 / BACK', 30, 50);
        return canvas;
    }
}
