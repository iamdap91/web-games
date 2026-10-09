import { overdriveIntro } from './overdrive-intro.js';
function noise(index) {
    const value = Math.sin(index * 127.1 + 311.7) * 43758.5453;
    return value - Math.floor(value);
}
function fragment(points, index) {
    const x = Math.min(...points.map((point) => point.x));
    const y = Math.min(...points.map((point) => point.y));
    return {
        points,
        center: {
            x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
            y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
        },
        bounds: {
            x,
            y,
            width: Math.max(...points.map((point) => point.x)) - x,
            height: Math.max(...points.map((point) => point.y)) - y,
        },
        spin: (noise(index + 3) - 0.5) * 3.8,
        tilt: (noise(index + 27) - 0.5) * 4.8,
    };
}
/** 모서리까지 이어지는 방사형 균열을 만들어 틈 없는 유리판을 나눈다. */
function fracture(width, height, center, options) {
    const corners = [
        { x: 0, y: 0 },
        { x: width, y: 0 },
        { x: width, y: height },
        { x: 0, y: height },
    ];
    const angles = [
        ...corners.map((point) => Math.atan2(point.y - center.y, point.x - center.x)),
        ...Array.from({ length: options.rays }, (_, i) => -Math.PI + ((i + 0.2 + noise(i) * 0.4) / options.rays) * Math.PI * 2),
    ].sort((a, b) => a - b);
    const rays = angles.map((angle, i) => {
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        const distance = Math.min(dx > 0 ? (width - center.x) / dx : -center.x / dx, dy > 0 ? (height - center.y) / dy : -center.y / dy);
        return options.rings.map((ring) => {
            const radius = ring === 1 ? 1 : ring * (0.82 + noise(i + 9) * 0.36);
            return {
                x: center.x + dx * distance * radius,
                y: center.y + dy * distance * radius,
            };
        });
    });
    const pieces = [];
    rays.forEach((ray, i) => {
        const next = rays[(i + 1) % rays.length];
        ray.forEach((point, ring) => {
            const points = ring === 0
                ? [center, point, next[ring]]
                : [ray[ring - 1], point, next[ring], next[ring - 1]];
            pieces.push(fragment(points, pieces.length));
        });
    });
    return pieces;
}
function outline(context, points) {
    context.beginPath();
    points.forEach((point, index) => {
        if (index === 0)
            context.moveTo(point.x, point.y);
        else
            context.lineTo(point.x, point.y);
    });
    context.closePath();
}
/** 전장 잔상·명령창 파편·균열의 생성과 정리를 하나의 연출이 소유한다. */
export class GlassShatter {
    container;
    reducedMotion;
    canvas = document.createElement('canvas');
    snapshot = document.createElement('canvas');
    context;
    hudFragments = [];
    fragments = [];
    width = 1;
    height = 1;
    dpr = 1;
    center = { x: 0, y: 0 };
    burst = false;
    constructor(container, reducedMotion) {
        this.container = container;
        this.reducedMotion = reducedMotion;
        this.canvas.className = 'glass-pane';
        this.canvas.hidden = true;
        this.context = this.canvas.getContext('2d');
        this.container.append(this.canvas);
    }
    get active() {
        return !this.canvas.hidden;
    }
    start(source, panels, impact) {
        this.clear();
        const bounds = source.getBoundingClientRect();
        this.width = bounds.width;
        this.height = bounds.height;
        this.dpr = Math.min(devicePixelRatio || 1, 2);
        this.canvas.width = Math.round(this.width * this.dpr);
        this.canvas.height = Math.round(this.height * this.dpr);
        this.snapshot.width = source.width;
        this.snapshot.height = source.height;
        // WebGL 렌더링 직후 복사해 각 파편에 실제 전장의 잔상을 남긴다.
        this.snapshot.getContext('2d')?.drawImage(source, 0, 0);
        this.center = {
            x: Math.max(8, Math.min(this.width - 8, impact.x)),
            y: Math.max(8, Math.min(this.height - 8, impact.y)),
        };
        this.fragments = fracture(this.width, this.height, this.center, {
            rays: 10,
            rings: [0.24, 0.58, 1],
        });
        for (const panel of panels)
            this.breakPanel(panel, bounds);
        this.canvas.hidden = false;
    }
    breakPanel(panel, sourceBounds) {
        const bounds = panel.getBoundingClientRect();
        if (bounds.width <= 0 || bounds.height <= 0)
            return;
        const origin = {
            x: bounds.left - sourceBounds.left,
            y: bounds.top - sourceBounds.top,
        };
        const pieces = fracture(bounds.width, bounds.height, { x: bounds.width * 0.56, y: bounds.height * 0.43 }, { rays: 4, rings: [1] });
        for (const shape of pieces) {
            const node = panel.cloneNode(true);
            if (!(node instanceof HTMLElement))
                continue;
            node.removeAttribute('id');
            node
                .querySelectorAll('[id]')
                .forEach((item) => item.removeAttribute('id'));
            node.inert = true;
            node.classList.add('shard');
            Object.assign(node.style, {
                left: `${origin.x}px`,
                top: `${origin.y}px`,
                right: 'auto',
                bottom: 'auto',
                width: `${bounds.width}px`,
                height: `${bounds.height}px`,
                visibility: 'visible',
                transformOrigin: `${shape.center.x}px ${shape.center.y}px`,
                clipPath: `polygon(${shape.points.map((point) => `${point.x}px ${point.y}px`).join(',')})`,
            });
            const edges = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            edges.setAttribute('class', 'glass-edge');
            edges.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
            const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            polygon.setAttribute('points', shape.points.map((point) => `${point.x},${point.y}`).join(' '));
            edges.append(polygon);
            node.append(edges);
            this.container.append(node);
            this.hudFragments.push({ node, shape, origin });
        }
    }
    render(phaseTime) {
        const context = this.context;
        if (!context || this.canvas.hidden)
            return false;
        const { impactAt, burstAt, duration } = overdriveIntro;
        const progress = Math.max(0, Math.min(1, (phaseTime - impactAt) / (duration - impactAt)));
        const crackEnd = (burstAt - impactAt) / (duration - impactAt);
        const flight = Math.max(0, (progress - crackEnd) / (1 - crackEnd));
        const travel = this.reducedMotion ? 0 : 1 - Math.pow(1 - flight, 2.4);
        const fade = Math.max(0, 1 - flight);
        const justBurst = progress >= crackEnd && !this.burst;
        if (justBurst)
            this.burst = true;
        context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        context.clearRect(0, 0, this.width, this.height);
        if (progress < crackEnd) {
            context.save();
            context.beginPath();
            context.arc(this.center.x, this.center.y, Math.hypot(this.width, this.height) * Math.min(1, progress / crackEnd), 0, Math.PI * 2);
            context.clip();
            context.fillStyle = 'rgba(28, 23, 19, 0.12)';
            context.fillRect(0, 0, this.width, this.height);
            for (const shape of this.fragments) {
                outline(context, shape.points);
                context.strokeStyle = 'rgba(12, 31, 37, 0.55)';
                context.lineWidth = 3;
                context.stroke();
                context.strokeStyle = 'rgba(255, 239, 207, 0.96)';
                context.lineWidth = 1.3;
                context.stroke();
            }
            context.restore();
        }
        else {
            this.fragments.forEach((shape) => this.drawFragment(context, shape, { travel, fade }));
            if (!this.reducedMotion)
                this.drawSplinters(context, travel, fade);
            const flash = this.reducedMotion
                ? 0
                : Math.max(0, 1 - flight / 0.075) * 0.12;
            context.fillStyle = `rgba(238, 253, 255, ${flash})`;
            context.fillRect(0, 0, this.width, this.height);
        }
        if (!this.reducedMotion)
            this.drawImpact(context, phaseTime - impactAt);
        this.hudFragments.forEach(({ node, shape, origin }) => {
            const x = (origin.x + shape.center.x - this.center.x) * travel * 0.85;
            const y = (origin.y + shape.center.y - this.center.y) * travel * 0.65 +
                travel * travel * this.height * 0.3;
            node.style.transform = `perspective(650px) translate3d(${x}px, ${y}px, ${travel * 160}px) rotateZ(${shape.spin * travel}rad) rotateY(${shape.tilt * travel}rad) rotateX(${shape.spin * travel * 0.6}rad)`;
            node.style.opacity = String(Math.min(1, fade * 1.65));
            node.style.setProperty('--edge-opacity', String(Math.min(1, progress / crackEnd)));
            node.style.setProperty('--glint-opacity', String((0.12 + Math.abs(Math.sin(shape.tilt * travel * 2)) * 0.6) * fade));
        });
        return justBurst;
    }
    drawImpact(context, age) {
        const strength = Math.max(0, 1 - age / 0.24);
        if (strength <= 0)
            return;
        const radius = 24 + age * 350;
        context.save();
        context.translate(this.center.x, this.center.y);
        const flare = context.createRadialGradient(0, 0, 0, 0, 0, radius);
        flare.addColorStop(0, `rgba(255, 244, 213, ${strength * 0.9})`);
        flare.addColorStop(0.24, `rgba(255, 196, 89, ${strength * 0.55})`);
        flare.addColorStop(1, 'rgba(255, 175, 67, 0)');
        context.fillStyle = flare;
        context.fillRect(-radius, -radius, radius * 2, radius * 2);
        context.strokeStyle = `rgba(255, 222, 157, ${strength})`;
        context.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4 + 0.13;
            context.beginPath();
            context.moveTo(Math.cos(angle) * radius * 0.35, Math.sin(angle) * radius * 0.35);
            context.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
            context.stroke();
        }
        context.restore();
    }
    drawFragment(context, shape, effect) {
        const { travel, fade } = effect;
        const { x, y, width, height } = shape.bounds;
        context.save();
        const dx = shape.center.x - this.center.x;
        const dy = shape.center.y - this.center.y;
        context.translate(shape.center.x + dx * travel * 1.25, shape.center.y +
            dy * travel * 0.95 +
            travel * travel * this.height * 0.35);
        context.rotate(shape.spin * travel * 0.5);
        context.scale(Math.cos(shape.tilt * travel) * (1 + travel * 0.5), 1 + travel * 0.2);
        context.translate(-shape.center.x, -shape.center.y);
        outline(context, shape.points);
        context.save();
        context.clip();
        context.globalAlpha = fade * 0.86;
        const scaleX = this.snapshot.width / this.width;
        const scaleY = this.snapshot.height / this.height;
        context.drawImage(this.snapshot, x * scaleX, y * scaleY, width * scaleX, height * scaleY, x, y, width, height);
        const sheen = context.createLinearGradient(x, y, x + width, y + height);
        const reflection = Math.abs(Math.sin(shape.tilt * travel * 2 + shape.spin));
        sheen.addColorStop(0, `rgba(159, 222, 244, ${0.08 + reflection * 0.14})`);
        sheen.addColorStop(0.46, 'rgba(210, 248, 255, 0.015)');
        sheen.addColorStop(0.49, `rgba(250, 255, 255, ${0.2 + reflection * 0.48})`);
        sheen.addColorStop(0.52, 'rgba(210, 248, 255, 0.025)');
        sheen.addColorStop(1, 'rgba(155, 214, 237, 0.1)');
        context.fillStyle = sheen;
        context.fillRect(x, y, width, height);
        context.restore();
        context.globalAlpha = fade;
        context.strokeStyle = '#dcf7ff';
        context.lineWidth = 1.15;
        context.stroke();
        context.restore();
    }
    drawSplinters(context, travel, fade) {
        context.fillStyle = `rgba(235, 253, 255, ${fade * 0.9})`;
        for (let i = 0; i < 34; i++) {
            const angle = noise(i + 70) * Math.PI * 2;
            const speed = 180 + noise(i + 3) * 650;
            context.save();
            context.translate(this.center.x + Math.cos(angle) * speed * travel, this.center.y +
                Math.sin(angle) * speed * travel +
                260 * travel * travel);
            context.rotate(angle + travel * 6);
            outline(context, [
                { x: -2, y: 0 },
                { x: 1, y: -8 - noise(i) * 13 },
                { x: 3, y: 4 },
            ]);
            context.fill();
            context.restore();
        }
    }
    clear() {
        this.hudFragments.forEach(({ node }) => node.remove());
        this.hudFragments.length = 0;
        this.fragments = [];
        this.canvas.hidden = true;
        this.snapshot.width = this.snapshot.height = 1;
        this.burst = false;
    }
    dispose() {
        this.clear();
        this.canvas.remove();
    }
}
