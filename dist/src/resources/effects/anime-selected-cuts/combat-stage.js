import { sky } from './drawing.js';
/** 공간을 도는 세 컷이 같은 투기장을 공유해 앞뒤 관계를 읽게 한다. */
export function arenaStage(scene, time, aerial = false) {
    const segments = 28;
    for (let i = 0; i < segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        const b = ((i + 1) / segments) * Math.PI * 2;
        const point = (angle, radius, y = 0) => ({
            x: Math.sin(angle) * radius,
            y,
            z: Math.cos(angle) * radius,
        });
        scene.floorQuad([{ x: 0, y: 0, z: 0 }, point(a, 10), point(b, 10)], i % 2 ? '#c9b899' : '#d6c5a5');
        scene.floorQuad([
            point(a, 8.9, 0.025),
            point(a, 9.2, 0.025),
            point(b, 9.2, 0.025),
            point(b, 8.9, 0.025),
        ], '#705745');
        scene.floorQuad([
            point(a, 3.3, 0.035),
            point(a, 3.4, 0.035),
            point(b, 3.4, 0.035),
            point(b, 3.3, 0.035),
        ], '#aa8060');
    }
    for (let i = 0; i < 14; i++) {
        const angle = (i / 14) * Math.PI * 2;
        const base = { x: Math.sin(angle) * 11, y: 0, z: Math.cos(angle) * 11 };
        const height = i % 4 === 1 ? 4.1 : 7.8;
        scene.column(base, height, 0.48);
        scene.box({ ...base, y: 0.22 }, { x: 1.42, y: 0.44, z: 1.42 }, '#82715e');
        if (height > 7)
            scene.box({ ...base, y: height + 0.2 }, { x: 1.45, y: 0.4, z: 1.45 }, '#a98b70');
    }
    for (let i = 0; i < 8; i++) {
        const a = i * 2.7;
        scene.box({ x: Math.cos(a) * (5.6 + i * 0.3), y: 0.18, z: Math.sin(a) * 7.2 }, { x: 0.45, y: 0.36, z: 0.65 }, '#897c6a');
    }
    if (!aerial)
        return;
    for (let i = 0; i < 7; i++) {
        const x = Math.sin(i * 2.1) * 23;
        const z = Math.cos(i * 2.1) * 23;
        const y = 16 + Math.sin(i * 1.7) * 3;
        const drift = Math.sin(time * 0.16 + i) * 0.3;
        scene.quad([
            { x: x - 5, y, z: z + drift },
            { x: x - 3.6, y: y + 1.5, z: z + drift },
            { x: x + 3, y: y + 1.1, z: z + drift },
            { x: x + 6, y: y - 0.2, z: z + drift },
        ], '#e7f0e8');
    }
}
export function arenaSky(context, time) {
    sky(context, time);
    const haze = context.createLinearGradient(0, 0, 0, 720);
    haze.addColorStop(0, '#21334c55');
    haze.addColorStop(0.62, '#e9d7ac00');
    haze.addColorStop(1, '#e3c49766');
    context.fillStyle = haze;
    context.fillRect(0, 0, 1280, 720);
}
