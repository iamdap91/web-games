import { noise } from './drawing.js';
const smokeDustPhaseCount = 4;
const smokeShadowPhaseCount = 16;
const fullTurn = Math.PI * 2;
export function smokeDustKey(bodyKey, phase) {
    return `${bodyKey}:dust:${Math.floor(phase) % smokeDustPhaseCount}`;
}
export function smokeShadowKey(bodyKey, shade, turn) {
    const phase = ((Math.round((turn / fullTurn) * smokeShadowPhaseCount) %
        smokeShadowPhaseCount) +
        smokeShadowPhaseCount) %
        smokeShadowPhaseCount;
    return `${bodyKey}:shade:${shade}:${phase}`;
}
/** 작은 원본 크기에서 한 번만 합성하며 표시 사본은 리소스 Map이 소유한다. */
async function displayImage(source, paint) {
    const canvas = document.createElement('canvas');
    canvas.width = source.naturalWidth;
    canvas.height = source.naturalHeight;
    try {
        const ctx = canvas.getContext('2d');
        if (!ctx)
            throw new Error('효과 자재의 표시 사본을 만들지 못했습니다.');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(source, 0, 0);
        paint(ctx, canvas.width, canvas.height);
        const image = new Image();
        image.src = canvas.toDataURL('image/png');
        await image.decode();
        return image;
    }
    finally {
        canvas.width = canvas.height = 1;
    }
}
/** 몸체의 실제 알파와 구멍을 그대로 두고 재질만 원본 안에 합성한다. */
export async function smokeDisplayVariants(key, source, shades) {
    const [dark, flat, iso] = await Promise.all([
        displayImage(source.image, (ctx, width, height) => {
            ctx.clearRect(0, 0, width, height);
            ctx.filter = 'brightness(0.56)';
            ctx.drawImage(source.image, 0, 0);
        }),
        displayImage(source.image, (ctx, width, height) => {
            ctx.globalCompositeOperation = 'source-in';
            ctx.fillStyle = '#bbb8ac';
            ctx.fillRect(0, 0, width, height);
        }),
        displayImage(source.image, (ctx, width, height) => {
            ctx.globalCompositeOperation = 'source-in';
            ctx.fillStyle = '#bcc5b7';
            ctx.fillRect(0, 0, width, height);
        }),
    ]);
    const suffix = key.slice('smoke-'.length);
    const darkKey = `smoke-dark-${suffix}`;
    const isoKey = `smoke-iso-${suffix}`;
    const dust = Array.from({ length: smokeDustPhaseCount }, (_, phase) => displayImage(dark, (ctx, width, height) => {
        ctx.globalCompositeOperation = 'source-atop';
        for (let speck = 0; speck < 20; speck++) {
            const seed = Number(suffix) * 67 + phase * 31 + speck;
            const x = noise(seed) * width;
            const y = noise(seed + 109) * height;
            const size = 0.6 + noise(seed + 12) * 1.5;
            ctx.fillStyle = speck % 3 ? '#333541' : '#b7aaa0';
            ctx.fillRect(x, y, size, size * (0.6 + noise(seed + 8)));
        }
    }).then((image) => [
        `technique:${smokeDustKey(darkKey, phase)}`,
        { ...source, image, label: `${source.label} · 알파 안 점묘 ${phase}` },
    ]));
    const shadows = shades.flatMap((shade, shadeIndex) => Array.from({ length: smokeShadowPhaseCount }, (_, phase) => {
        const turn = (phase / smokeShadowPhaseCount) * fullTurn;
        return displayImage(iso, (ctx, width, height) => {
            ctx.globalCompositeOperation = 'source-atop';
            ctx.globalAlpha = 0.88;
            ctx.translate(width * (0.5 + Math.sin(turn) * 0.08), height * (0.5 + Math.cos(turn) * 0.0714));
            ctx.rotate(turn);
            ctx.drawImage(shade, -width * 0.3875, -height * 0.412, width * 0.775, height * 0.824);
        }).then((image) => [
            `technique:${smokeShadowKey(isoKey, shadeIndex, turn)}`,
            {
                ...source,
                image,
                label: `${source.label} · 알파 안 암부 ${shadeIndex}/${phase}`,
            },
        ]);
    }));
    return [
        [`technique:${darkKey}`, { ...source, image: dark }],
        [`technique:smoke-flat-${suffix}`, { ...source, image: flat }],
        [`technique:${isoKey}`, { ...source, image: iso }],
        ...(await Promise.all([...dust, ...shadows])),
    ];
}
const fragmentSeeds = [
    { x: 0.26, y: 0.34 },
    { x: 0.74, y: 0.31 },
    { x: 0.51, y: 0.76 },
];
export const fireFragmentCount = fragmentSeeds.length;
/** 기존 말림 원화의 색과 일부 픽셀만 바꾼 사본으로 냉각·분리를 표현한다. */
async function cooledImage(source, fragment) {
    return displayImage(source, (ctx, width, height) => {
        const image = ctx.getImageData(0, 0, width, height);
        const colors = [
            [53, 46, 59],
            [86, 56, 66],
            [136, 80, 68],
            [182, 111, 75],
        ];
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const offset = (y * width + x) * 4;
                if (image.data[offset + 3] === 0)
                    continue;
                if (fragment !== undefined) {
                    const distances = fragmentSeeds.map((seed, index) => ({
                        index,
                        distance: (x / width - seed.x) ** 2 + (y / height - seed.y) ** 2,
                    }));
                    distances.sort((a, b) => a.distance - b.distance);
                    if (distances[0].index !== fragment ||
                        distances[1].distance - distances[0].distance < 0.018) {
                        image.data[offset + 3] = 0;
                        continue;
                    }
                }
                const light = (image.data[offset] +
                    image.data[offset + 1] +
                    image.data[offset + 2]) /
                    3;
                const color = colors[light > 205 ? 3 : light > 150 ? 2 : light > 95 ? 1 : 0];
                image.data[offset] = color[0];
                image.data[offset + 1] = color[1];
                image.data[offset + 2] = color[2];
            }
        }
        ctx.putImageData(image, 0, 0);
    });
}
export async function fireDisplayVariants(bubble, flame) {
    return Promise.all([
        cooledImage(bubble.image).then((image) => [
            'technique:bubble-cool',
            { ...bubble, image, label: '거품 · 냉각된 말림' },
        ]),
        ...fragmentSeeds.map((_, index) => cooledImage(bubble.image, index).then((image) => [
            `technique:bubble-fragment-${index}`,
            { ...bubble, image, label: `거품 · 냉각 파편 ${index}` },
        ])),
        cooledImage(flame.image).then((image) => [
            'technique:flame-ember',
            { ...flame, image, label: '작은 불꽃 · 냉각 잔불' },
        ]),
    ]);
}
