import { actor, ellipse, label, line, mix, noise, palette, polygon, ring, smooth, stage, star, windowed, } from './drawing.js';
import { opticalScene, orb } from './camera-scene.js';
import { height, width } from './types.js';
function halo(ctx, x, y, radius, color) {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, '#aacddd00');
    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}
function transmitted(ctx, frame) {
    stage(ctx);
    actor(ctx, 360, 430, 1.05, { arm: 0.8 });
    polygon(ctx, [
        { x: 570, y: 190 },
        { x: 635, y: 236 },
        { x: 570, y: 315 },
        { x: 505, y: 236 },
    ], '#244b61');
    const power = windowed(frame.timeMs, 900, 3300, 450);
    const color = frame.enhanced ? '#fffbd9' : '#78acbc';
    ctx.save();
    if (frame.enhanced) {
        ctx.globalAlpha = (frame.reducedMotion ? 0.45 : 0.8) * power;
        ctx.filter = 'blur(4px)';
        line(ctx, [
            { x: 570, y: 201 },
            { x: 570, y: 292 },
        ], '#b0eafa', 18);
        line(ctx, [
            { x: 532, y: 235 },
            { x: 607, y: 235 },
        ], '#b0eafa', 18);
    }
    ctx.restore();
    line(ctx, [
        { x: 570, y: 201 },
        { x: 570, y: 292 },
    ], color, frame.enhanced ? 6 : 3);
    line(ctx, [
        { x: 532, y: 235 },
        { x: 607, y: 235 },
    ], color, frame.enhanced ? 6 : 3);
    label(ctx, frame.enhanced
        ? '그림 안의 선택한 선만 빛을 통과시켜 강조'
        : '같은 문양의 보통 채색');
}
function para(ctx, frame) {
    opticalScene(ctx);
    if (frame.enhanced) {
        const sheet = ctx.createLinearGradient(0, 0, width, 0);
        sheet.addColorStop(0, '#604d9f94');
        sheet.addColorStop(0.48, '#88618800');
        sheet.addColorStop(1, '#f2ac5e80');
        ctx.fillStyle = sheet;
        ctx.fillRect(0, 0, width, height);
    }
    label(ctx, '색 시트의 농담 · 위치와 원화의 윤곽은 유지');
}
function wavyGlass(ctx, frame) {
    if (!frame.enhanced)
        opticalScene(ctx);
    else {
        // 정적인 같은 장면을 띠별로 잘라 다시 그린다. 매 프레임 Canvas 표면을 만들지 않는다.
        for (let y = 0; y < height; y += 18) {
            const offset = Math.sin(y * 0.034 - frame.timeMs / 570) *
                (frame.reducedMotion ? 2 : 13);
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, y, width, 18);
            ctx.clip();
            ctx.translate(offset, 0);
            opticalScene(ctx);
            ctx.restore();
        }
    }
    label(ctx, '수평 띠마다 다른 굴곡 · 흐림이 아닌 윤곽의 변위');
}
function diffusion(ctx, frame) {
    opticalScene(ctx);
    if (frame.enhanced) {
        ctx.save();
        ctx.globalAlpha = frame.reducedMotion ? 0.22 : 0.38;
        ctx.filter = 'blur(7px) brightness(1.4)';
        opticalScene(ctx);
        ctx.restore();
    }
    label(ctx, '선명한 원본 + 흐린 밝은 노출 · 어두운 윤곽은 남음');
}
function blur(ctx, frame) {
    ctx.save();
    ctx.filter = frame.enhanced
        ? `blur(${frame.reducedMotion ? 2 : 5}px)`
        : 'none';
    opticalScene(ctx);
    ctx.restore();
    label(ctx, '장면 자체를 흐림 · 선명한 원본을 위에 남기지 않음');
}
function flare(ctx, frame, anamorphic) {
    opticalScene(ctx);
    const source = { x: 746, y: 134 };
    star(ctx, source.x, source.y, 19, palette.paper);
    if (frame.enhanced) {
        ctx.save();
        ctx.globalAlpha = frame.reducedMotion ? 0.45 : 0.7;
        if (anamorphic) {
            halo(ctx, source.x, source.y, 58, '#7dcfe160');
            for (let i = 0; i < 5; i++) {
                const length = 160 + i * 55;
                const y = source.y + (i - 2) * 3;
                line(ctx, [
                    { x: source.x - length, y },
                    { x: source.x + length, y },
                ], i === 2 ? '#f1f9ed' : '#8bceec35', i === 2 ? 2 : 5);
            }
        }
        else {
            const center = { x: width / 2, y: height / 2 };
            for (let i = 0; i < 7; i++) {
                const p = i / 5;
                const x = mix(source.x, center.x * 2 - source.x, p);
                const y = mix(source.y, center.y * 2 - source.y, p);
                const radius = 12 + noise(i) * 35;
                ring(ctx, x, y, radius, radius, ['#e5a88b60', '#81d1cc45', '#a79ee650'][i % 3], 6);
            }
        }
        ctx.restore();
    }
    label(ctx, anamorphic
        ? '광원에서 가로로 뻗는 긴 빛띠'
        : '광원과 화면 중심을 잇는 축 위의 고스트');
}
function crossLight(ctx, frame) {
    opticalScene(ctx);
    const amount = windowed(frame.timeMs, 1300, 2300, 250);
    ring(ctx, 600, 246, 20, 20, palette.blue, 4);
    if (frame.enhanced) {
        const size = 24 + amount * (frame.reducedMotion ? 30 : 85);
        ctx.save();
        ctx.globalAlpha = amount;
        star(ctx, 600, 246, size, '#f7f3d5', 4);
        ellipse(ctx, 600, 246, 7, 7, '#96d4e6');
        ctx.restore();
    }
    label(ctx, '한 광점의 짧은 네 방향 강조 · 긴 수평 플레어와 구별');
}
function rackFocus(ctx, frame) {
    const focus = smooth((frame.timeMs - 1200) / 1500);
    const blur = frame.reducedMotion ? 1 : 5;
    ctx.save();
    ctx.filter = frame.enhanced ? `blur(${blur * (1 - focus)}px)` : 'none';
    opticalScene(ctx);
    actor(ctx, 690, 420, 0.9, { color: palette.blue, facing: -1 });
    ctx.restore();
    ctx.save();
    ctx.filter = frame.enhanced ? `blur(${blur * focus}px)` : 'none';
    ctx.fillStyle = '#211d2a';
    ctx.fillRect(190, 105, 35, 340);
    ctx.fillStyle = palette.gold;
    ctx.fillRect(178, 245, 59, 82);
    line(ctx, [
        { x: 207, y: 256 },
        { x: 207, y: 313 },
    ], '#84414b', 7);
    ctx.restore();
    label(ctx, focus < 0.5
        ? '전경의 부적에 초점'
        : '뒤쪽 인물로 초점 이동 · 구도와 위치는 고정');
}
function multiBokeh(ctx, frame) {
    stage(ctx);
    ctx.save();
    ctx.filter = frame.enhanced
        ? `blur(${frame.reducedMotion ? 2 : 7}px)`
        : 'none';
    for (let i = 0; i < 11; i++) {
        const x = 80 + i * 81;
        ellipse(ctx, x, 205 + Math.sin(i * 1.8) * 42, frame.enhanced ? 19 : 7, frame.enhanced ? 19 : 7, '#e4be7790');
    }
    ctx.restore();
    actor(ctx, 505, 430, 1.1);
    ctx.save();
    ctx.filter = frame.enhanced
        ? `blur(${frame.reducedMotion ? 3 : 13}px)`
        : 'none';
    for (const x of [90, 850]) {
        ctx.fillStyle = '#111c28';
        ctx.fillRect(x, 100, 48, 440);
        ellipse(ctx, x + 20, 170, 76, 120, '#2b4750');
    }
    ctx.restore();
    label(ctx, '전경 큰 흐림 / 중경 선명 / 원경 작은 빛망울 · 초점 고정');
}
function foggy(ctx, frame) {
    opticalScene(ctx);
    if (frame.enhanced) {
        ctx.fillStyle = '#dce4d736';
        ctx.fillRect(0, 0, width, height);
        halo(ctx, 145, 175, 230, '#ede6c362');
        halo(ctx, 815, 175, 240, '#ede6c36b');
        const veil = ctx.createLinearGradient(0, 0, 0, height);
        veil.addColorStop(0, '#dfe4df35');
        veil.addColorStop(1, '#dfe4df05');
        ctx.fillStyle = veil;
        ctx.fillRect(0, 0, width, height);
    }
    label(ctx, '포그 필터의 젖빛 막 · 전체 대비를 낮추는 정적인 촬영 처리');
}
function doubleShadow(ctx, frame) {
    stage(ctx);
    const pose = { lean: Math.sin(frame.timeMs / 800) * 16, arm: 0.6 };
    if (frame.enhanced) {
        for (let i = 2; i > 0; i--) {
            ctx.save();
            ctx.globalAlpha = i === 2 ? 0.24 : 0.4;
            actor(ctx, 445 - i * 36, 421 - i * 5, 1.1, { ...pose, silhouette: true });
            ctx.restore();
        }
    }
    actor(ctx, 445, 421, 1.1, pose);
    label(ctx, '실제 몸 뒤에 두 개의 그림자 노출 · 별도 인물이나 타격이 아님');
}
function glow(ctx, frame) {
    opticalScene(ctx);
    if (frame.enhanced) {
        halo(ctx, 590, 255, 115, '#75cfea88');
        ctx.save();
        ctx.filter = 'blur(14px)';
        ellipse(ctx, 590, 255, 41, 41, '#78c8e388');
        ctx.restore();
    }
    orb(ctx);
    label(ctx, '광원의 외피만 퍼짐 · 몸과 배경의 검은 윤곽은 선명');
}
function incidentLight(ctx, frame) {
    stage(ctx);
    if (frame.enhanced) {
        ctx.save();
        ctx.globalAlpha = frame.reducedMotion ? 0.32 : 0.55;
        for (let i = 0; i < 4; i++) {
            const x = 90 + i * 58;
            polygon(ctx, [
                { x, y: -20 },
                { x: x + 20, y: -20 },
                { x: x + 350, y: 445 },
                { x: x + 260, y: 445 },
            ], '#efdb9e50');
        }
        ellipse(ctx, 535, 429, 210, 21, '#ecd7a340');
        for (let i = 0; i < 25; i++) {
            const y = 100 + ((noise(i) * 330 + frame.timeMs * 0.018) % 330);
            const x = 210 + i * 9 + y * 0.48;
            ellipse(ctx, x, y, 1.5, 1.5, '#f7eccba0');
        }
        ctx.restore();
    }
    actor(ctx, 470, 430, 1.1);
    ctx.fillStyle = '#182131';
    ctx.fillRect(84, 0, 20, 210);
    ctx.fillRect(84, 64, 205, 20);
    label(ctx, '화면 밖 창에서 들어오는 사선 빛 · 공간과 바닥을 밝힘');
}
/** 광원·합성·피사계 표현은 각각 다른 그리기 범위를 사용한다. */
export function drawCameraOptics(ctx, id, frame) {
    switch (id) {
        case 'camera-transmitted-light':
            transmitted(ctx, frame);
            break;
        case 'camera-para':
            para(ctx, frame);
            break;
        case 'camera-wavy-glass':
            wavyGlass(ctx, frame);
            break;
        case 'camera-diffusion':
            diffusion(ctx, frame);
            break;
        case 'camera-blur':
            blur(ctx, frame);
            break;
        case 'camera-lens-flare':
            flare(ctx, frame, false);
            break;
        case 'camera-anamorphic':
            flare(ctx, frame, true);
            break;
        case 'camera-cross-light':
            crossLight(ctx, frame);
            break;
        case 'camera-rack-focus':
            rackFocus(ctx, frame);
            break;
        case 'camera-multi-bokeh':
            multiBokeh(ctx, frame);
            break;
        case 'camera-foggy':
            foggy(ctx, frame);
            break;
        case 'camera-double-shadow':
            doubleShadow(ctx, frame);
            break;
        case 'camera-glow':
            glow(ctx, frame);
            break;
        case 'camera-incident-light':
            incidentLight(ctx, frame);
            break;
        default:
            return false;
    }
    return true;
}
