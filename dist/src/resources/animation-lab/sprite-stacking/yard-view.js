import { terrainHeight } from './cart-yard.js';
const sceneWidth = 960;
const sceneHeight = 530;
export function project(point, height = 0) {
    return {
        x: 480 + point.x - point.y * 0.62,
        y: 286 + point.y * 0.58 + point.x * 0.12 - height,
    };
}
export function unproject(point) {
    const sx = point.x - 480;
    const sy = point.y - 286;
    const y = (sy - sx * 0.12) / (0.58 + 0.62 * 0.12);
    return { x: sx + y * 0.62, y };
}
export function createSliceImages(asset) {
    return asset.layers.map((layer) => {
        const canvas = document.createElement('canvas');
        canvas.width = asset.width;
        canvas.height = asset.depth;
        const context = canvas.getContext('2d');
        if (!context)
            throw new Error('단면 캔버스를 만들 수 없습니다.');
        layer.forEach((color, index) => {
            if (color === 0)
                return;
            context.fillStyle = asset.palette[color] ?? '#ff00ff';
            context.fillRect(index % asset.width, Math.floor(index / asset.width), 1, 1);
        });
        return canvas;
    });
}
function polygon(context, points, color) {
    context.fillStyle = color;
    context.beginPath();
    points.forEach((point, index) => index === 0
        ? context.moveTo(point.x, point.y)
        : context.lineTo(point.x, point.y));
    context.closePath();
    context.fill();
}
function groundRect(context, x, y, width, depth, color, height = 0) {
    polygon(context, [
        project({ x, y }, height),
        project({ x: x + width, y }, height),
        project({ x: x + width, y: y + depth }, height),
        project({ x, y: y + depth }, height),
    ], color);
}
function box(context, x, y, width, depth, height, top) {
    polygon(context, [
        project({ x, y: y + depth }),
        project({ x: x + width, y: y + depth }),
        project({ x: x + width, y: y + depth }, height),
        project({ x, y: y + depth }, height),
    ], '#74503a');
    polygon(context, [
        project({ x: x + width, y }),
        project({ x: x + width, y: y + depth }),
        project({ x: x + width, y: y + depth }, height),
        project({ x: x + width, y }, height),
    ], '#503c31');
    groundRect(context, x, y, width, depth, top, height);
}
function label(context, text, x, y) {
    const p = project({ x, y });
    context.font = 'bold 12px sans-serif';
    context.textAlign = 'center';
    context.fillStyle = '#1d3528';
    context.fillRect(p.x - 52, p.y - 12, 104, 25);
    context.fillStyle = '#d8ddba';
    context.fillText(text, p.x, p.y + 5);
}
/** Canvas 표시만 책임진다. 층마다 독립된 수평 픽셀 이미지를 투영한다. */
export class YardView {
    asset;
    images;
    flatImage;
    emptyFlatImage;
    ground;
    constructor(asset) {
        this.asset = asset;
        this.images = createSliceImages(asset);
        this.flatImage = document.createElement('canvas');
        this.flatImage.width = asset.width;
        this.flatImage.height = asset.depth;
        const flatContext = this.flatImage.getContext('2d');
        if (!flatContext)
            throw new Error('평면 캔버스를 만들 수 없습니다.');
        this.images.forEach((image) => flatContext.drawImage(image, 0, 0));
        this.emptyFlatImage = document.createElement('canvas');
        this.emptyFlatImage.width = asset.width;
        this.emptyFlatImage.height = asset.depth;
        const emptyContext = this.emptyFlatImage.getContext('2d');
        if (!emptyContext)
            throw new Error('빈 수레 캔버스를 만들 수 없습니다.');
        this.images
            .slice(0, 16)
            .forEach((image) => emptyContext.drawImage(image, 0, 0));
        this.ground = document.createElement('canvas');
        this.ground.width = sceneWidth;
        this.ground.height = sceneHeight;
        const context = this.ground.getContext('2d');
        if (!context)
            throw new Error('마당 캔버스를 만들 수 없습니다.');
        this.drawGround(context);
    }
    draw(context, cart, options) {
        context.imageSmoothingEnabled = false;
        context.drawImage(this.ground, 0, 0);
        const shadow = project(cart);
        context.fillStyle = '#172b2560';
        context.beginPath();
        context.ellipse(shadow.x, shadow.y + 4, 39, 18, 0.12, 0, Math.PI * 2);
        context.fill();
        const angle = cart.heading + options.headingOffset;
        const cosine = Math.cos(angle);
        const sine = Math.sin(angle);
        const pitch = options.flat ? 0 : cart.pitch;
        const roll = options.flat ? 0 : cart.roll;
        const scale = 1.9;
        const basisX = {
            x: cosine * Math.cos(pitch) * scale,
            y: sine * Math.cos(pitch) * scale,
            z: Math.sin(pitch) * scale,
        };
        const basisY = {
            x: -sine * Math.cos(roll) * scale,
            y: cosine * Math.cos(roll) * scale,
            z: Math.sin(roll) * scale,
        };
        const a = basisX.x - basisX.y * 0.62;
        const b = basisX.y * 0.58 + basisX.x * 0.12 - basisX.z;
        const c = basisY.x - basisY.y * 0.62;
        const d = basisY.y * 0.58 + basisY.x * 0.12 - basisY.z;
        const layers = options.flat
            ? [cart.loaded ? this.flatImage : this.emptyFlatImage]
            : this.images;
        layers.forEach((image, z) => {
            if (!cart.loaded && z > 15)
                return;
            // 경사에 따라 각 층의 중심도 이동해서 수레 전체가 입체를 유지하며 기운다.
            const elevation = z * (scale + options.spacing * 2);
            const center = project({
                x: cart.x -
                    cosine * Math.sin(pitch) * elevation +
                    sine * Math.sin(roll) * elevation,
                y: cart.y -
                    sine * Math.sin(pitch) * elevation -
                    cosine * Math.sin(roll) * elevation,
            }, cart.height + elevation * Math.cos(pitch) * Math.cos(roll));
            // 수평 이미지를 한 픽셀 두께만큼 내려 그려 기본 간격의 얇은 틈을 채운다.
            const thickness = options.flat ? [0] : [1.3, 0.65, 0];
            for (const offset of thickness) {
                context.save();
                context.transform(a, b, c, d, center.x, center.y + offset);
                context.drawImage(image, -this.asset.width / 2, -this.asset.depth / 2);
                context.restore();
            }
        });
        if (options.flat) {
            const point = project(cart, cart.height + 22);
            context.font = 'bold 11px sans-serif';
            context.textAlign = 'center';
            context.fillStyle = '#f7e4aa';
            context.fillText('한 장 · 높이 없음', point.x, point.y - 12);
        }
    }
    drawGround(context) {
        context.fillStyle = '#425846';
        context.fillRect(0, 0, sceneWidth, sceneHeight);
        groundRect(context, -355, -200, 710, 400, '#728567');
        groundRect(context, -345, -190, 690, 380, '#829373');
        groundRect(context, -325, -52, 650, 104, '#b4a17d');
        for (let i = 0; i < 450; i++) {
            const x = ((i * 73) % 680) - 340;
            const y = ((i * 97) % 360) - 180;
            const p = project({ x, y });
            context.fillStyle =
                Math.abs(y) < 48
                    ? '#8b815d60'
                    : i % 3 === 0
                        ? '#d3ce9160'
                        : '#405e4360';
            context.fillRect(p.x, p.y, 2 + (i % 3), 2);
        }
        // 나무 경사로의 단면을 수레가 사용하는 지면 높이 함수로 그린다.
        for (let x = -78; x < 78; x += 6) {
            polygon(context, [
                project({ x, y: -48 }, terrainHeight(x, 0)),
                project({ x: x + 6, y: -48 }, terrainHeight(x + 6, 0)),
                project({ x: x + 6, y: 48 }, terrainHeight(x + 6, 0)),
                project({ x, y: 48 }, terrainHeight(x, 0)),
            ], x % 12 === 0 ? '#96704f' : '#b28b60');
        }
        for (const y of [-50, 50]) {
            for (let x = -78; x < 78; x += 13)
                box(context, x, y, 3, 3, terrainHeight(x, 0) + 8, '#d9b77c');
        }
        box(context, -290, -132, 95, 52, 65, '#ad8a63');
        groundRect(context, -300, -140, 116, 70, '#425f57', 72);
        box(context, 230, -130, 76, 56, 75, '#bb9870');
        groundRect(context, 218, -138, 100, 72, '#5c6f68', 82);
        for (const [x, y] of [
            [-290, 100],
            [-285, 128],
            [-250, 125],
            [255, 112],
            [289, 110],
        ])
            box(context, x ?? 0, y ?? 0, 22, 18, 27, '#c69b62');
        for (const [x = 0, y = 0] of [
            [-155, -135],
            [120, -150],
            [315, 150],
            [-330, 160],
            [165, 140],
        ]) {
            const p = project({ x, y });
            context.fillStyle = '#624a35';
            context.fillRect(p.x - 4, p.y - 42, 8, 44);
            context.fillStyle = '#355b46';
            context.beginPath();
            context.ellipse(p.x, p.y - 61, 27, 31, 0, 0, Math.PI * 2);
            context.fill();
            context.fillStyle = '#507650';
            context.beginPath();
            context.ellipse(p.x - 7, p.y - 69, 21, 24, 0, 0, Math.PI * 2);
            context.fill();
        }
        groundRect(context, -265, -36, 66, 72, '#e9d28c30');
        groundRect(context, 230, -36, 72, 72, '#b6d9b140');
        label(context, '출발 · 다시 싣기', -227, 69);
        label(context, '도착 · 짐 내리기', 265, 69);
        label(context, '나무 경사로', 0, -76);
    }
}
