import { actor, burst, clamp, ellipse, face, label, line, noise, palette, polygon, smooth, stage, } from './drawing.js';
import { height, width, } from './types.js';
export const editingSamples = [
    {
        id: 'editing-harmony',
        name: '하모니',
        category: 'editing',
        previewMs: 2500,
        description: '셀처럼 움직이던 장면이 종이·붓결을 가진 한 장의 종결화로 정착합니다.',
        distinction: '멈춤만 주는 정지화와 달리 배경·인물의 질감과 색면을 함께 설계합니다.',
    },
    {
        id: 'editing-still',
        name: '멈춘 그림',
        category: 'editing',
        previewMs: 2150,
        description: '공중의 결정 자세를 멈춰 보여준 뒤 움직임을 이어갑니다.',
        distinction: '회화 질감이나 새로운 그림 없이 한 자세의 유지 시간만 바꿉니다.',
    },
    {
        id: 'editing-triple',
        name: '반복 쇼트',
        category: 'editing',
        previewMs: 2940,
        description: '같은 접촉을 와이드·근접·타점의 세 컷으로 다시 보여줍니다.',
        distinction: '세 번 때리는 동작이 아니라 같은 사건을 반복하는 편집입니다.',
    },
    {
        id: 'editing-split',
        name: '화면 분할',
        category: 'editing',
        previewMs: 2250,
        description: '떨어진 두 인물의 준비를 동시에 보여준 뒤 하나의 장면으로 합칩니다.',
        distinction: '인서트 한 장보다 두 시간선의 동시 진행에 초점을 둡니다.',
    },
    {
        id: 'editing-orbit',
        name: '마와리코미',
        category: 'editing',
        previewMs: 2200,
        description: '카메라가 인물 주위를 돌며 앞뒤 기둥과 관절의 시점이 함께 바뀝니다.',
        distinction: '평면 그림 회전 대신 공간 좌표를 투영해 시점과 가림 순서가 바뀝니다.',
    },
    {
        id: 'editing-text-cuts',
        name: '신보 문자 컷',
        category: 'editing',
        previewMs: 2100,
        description: '장면 사이에 검정·빨강 바탕의 짧은 문자 컷을 끼웁니다.',
        distinction: '대사를 계속 띄우는 자막보다 화면 자체를 글자의 박자로 바꿉니다.',
    },
    {
        id: 'editing-extreme',
        name: '신보 눈·입 클로즈업',
        category: 'editing',
        previewMs: 2500,
        description: '눈과 입의 극단적인 근접 컷이 서로 다른 유지 시간으로 교차합니다.',
        distinction: '얼굴 전체를 확대하는 컷인과 달리 얼굴의 일부만 보여줍니다.',
    },
    {
        id: 'editing-imaishi',
        name: '이마이시 연출',
        category: 'editing',
        previewMs: 2200,
        description: '과장된 전경 주먹·뚝 끊기는 자세·거대 글자를 강한 박자로 연결합니다.',
        distinction: '원근·타이밍·문자 구성을 한 장면의 정점에 모으는 견본입니다.',
    },
    {
        id: 'editing-shadow-play',
        name: '그림자극 소녀',
        category: 'editing',
        previewMs: 2300,
        description: '밝은 무대 안의 검은 인물과 상징 소품이 막간극처럼 움직입니다.',
        distinction: '충격용 실루엣과 달리 단순한 행위와 상징으로 작은 이야기를 만듭니다.',
    },
    {
        id: 'editing-overlap',
        name: '오버랩',
        category: 'editing',
        previewMs: 1850,
        description: '앞 장소가 남아 있는 동안 다음 장소와 인물이 겹쳐 들어옵니다.',
        distinction: '인물 소실 효과가 아니라 두 장면 전체의 겹침 전환입니다.',
    },
    {
        id: 'editing-wipe-iris',
        name: '와이프·아이리스',
        category: 'editing',
        previewMs: 2300,
        description: '새 장면이 옆으로 쓸고 들어온 뒤 원형 창이 인물을 남기며 닫힙니다.',
        distinction: '밝기만 바꾸지 않고 다음 화면을 드러내는 경계의 형태를 바꿉니다.',
    },
    {
        id: 'editing-white-out',
        name: '화이트 아웃',
        category: 'editing',
        previewMs: 2200,
        description: '장면이 흰 빛에 잠겼다가 다음 장소가 천천히 돌아옵니다.',
        distinction: '짧은 타격 섬광보다 긴 노출 변화로 장면 사이의 시간을 만듭니다.',
    },
];
function actionScene(ctx, time) {
    stage(ctx, 0);
    const move = smooth((time - 500) / 600) * (1 - smooth((time - 2000) / 600));
    const punch = smooth((time - 950) / 170) * (1 - smooth((time - 1450) / 300));
    actor(ctx, 260 + move * 280, 420, 1.3, { lean: punch * 17, arm: punch });
    const hit = clamp((time - 1120) / 800);
    actor(ctx, 718, 420, 1.3, {
        facing: -1,
        color: palette.blue,
        lean: time < 1120 ? 0 : -Math.sin(hit * Math.PI) * 26,
    });
    if (time > 1120 && time < 1800)
        burst(ctx, 694, 251, (time - 1120) / 680);
}
function newScene(ctx) {
    stage(ctx, 0);
    ctx.fillStyle = '#61787b99';
    ctx.fillRect(0, 0, width, height);
    ellipse(ctx, 210, 140, 73, 73, palette.paper);
    actor(ctx, 480, 420, 1.5, { color: palette.blue, arm: 0.1 });
    for (let i = 0; i < 9; i++)
        line(ctx, [
            { x: 80 + i * 110, y: 0 },
            { x: 100 + i * 100, y: 540 },
        ], '#c9e0df38', 3);
}
function painting(ctx) {
    const back = ctx.createLinearGradient(0, 0, 960, 540);
    back.addColorStop(0, '#a86e5c');
    back.addColorStop(0.5, '#e7c383');
    back.addColorStop(1, '#5c415d');
    ctx.fillStyle = back;
    ctx.fillRect(0, 0, 960, 540);
    for (let i = 0; i < 170; i++) {
        const x = noise(i) * 960, y = noise(i + 170) * 540;
        line(ctx, [
            { x, y },
            { x: x + 20 + noise(i + 390) * 100, y: y + 6 },
        ], i % 3 ? '#52394923' : '#fff2c838', 1 + noise(i + 50) * 4);
    }
    polygon(ctx, [
        { x: 0, y: 450 },
        { x: 230, y: 230 },
        { x: 405, y: 418 },
        { x: 710, y: 168 },
        { x: 960, y: 420 },
        { x: 960, y: 540 },
        { x: 0, y: 540 },
    ], '#4a3b4f55');
    actor(ctx, 490, 460, 2.05, { lean: 15, arm: 1, color: '#563c43' });
    actor(ctx, 486, 456, 2.05, { lean: 15, arm: 1, color: '#dab274' });
    for (let i = 0; i < 17; i++)
        line(ctx, [
            { x: 440 + i * 4, y: 227 },
            { x: 420 + i * 4, y: 258 },
        ], '#4c364c77', 1.3);
    ctx.strokeStyle = '#f4ddb1';
    ctx.lineWidth = 8;
    ctx.strokeRect(20, 20, 920, 500);
}
function orbit(ctx, time, enhanced, reduced) {
    const turn = enhanced
        ? smooth((time - 400) / 3200) * (reduced ? 0.18 : 2.8)
        : 0;
    const cameraAngle = 0.12 + turn;
    const project = (p) => {
        const depth = 8 + p.z * Math.cos(cameraAngle) + p.x * Math.sin(cameraAngle);
        return {
            x: 480 +
                ((p.x * Math.cos(cameraAngle) - p.z * Math.sin(cameraAngle)) * 550) /
                    depth,
            y: 220 + ((2 - p.y) * 550) / depth,
            depth,
        };
    };
    ctx.fillStyle = '#1d293a';
    ctx.fillRect(0, 0, width, height);
    for (let i = -5; i <= 5; i++) {
        line(ctx, [project({ x: i, y: 0, z: -5 }), project({ x: i, y: 0, z: 5 })], '#75858c55', 1);
        line(ctx, [project({ x: -5, y: 0, z: i }), project({ x: 5, y: 0, z: i })], '#75858c55', 1);
    }
    const columns = [
        { x: -2.5, z: -1.6 },
        { x: 2.3, z: 1.9 },
        { x: 2.4, z: -2.2 },
        { x: -2.2, z: 2.1 },
    ];
    const objects = [
        ...columns.map((p) => ({
            depth: project({ ...p, y: 0 }).depth,
            draw: () => {
                const base = project({ ...p, y: 0 }), top = project({ ...p, y: 3 });
                line(ctx, [base, top], '#40556a', 250 / base.depth);
                ellipse(ctx, top.x, top.y, 130 / base.depth, 35 / base.depth, palette.blue);
            },
        })),
        {
            depth: 8,
            draw: () => {
                const joints = [
                    { x: -0.4, y: 0, z: 0 },
                    { x: -0.25, y: 1.1, z: 0 },
                    { x: 0, y: 1.6, z: 0 },
                    { x: 0.4, y: 0, z: 0.15 },
                    { x: 0.25, y: 1, z: 0.05 },
                ];
                line(ctx, [
                    project(joints[0]),
                    project(joints[1]),
                    project(joints[2]),
                    project(joints[4]),
                    project(joints[3]),
                ], palette.gold, 17);
                line(ctx, [project({ x: 0, y: 1.5, z: 0 }), project({ x: 0, y: 2.6, z: 0 })], palette.gold, 38);
                for (const s of [-1, 1])
                    line(ctx, [
                        project({ x: s * 0.3, y: 2.5, z: 0 }),
                        project({ x: s * 0.6, y: 2, z: 0.25 }),
                        project({ x: s * 0.7, y: 1.7, z: 0.4 }),
                    ], palette.gold, 13);
                const h = project({ x: 0, y: 3.1, z: 0 });
                ellipse(ctx, h.x, h.y, 24, 29, palette.gold);
                const nose = project({ x: 0.08, y: 3.1, z: -0.26 });
                if (nose.depth < h.depth)
                    ellipse(ctx, nose.x, nose.y, 4, 5, palette.ink);
            },
        },
    ].sort((a, b) => b.depth - a.depth);
    for (const object of objects)
        object.draw();
}
function shadows(ctx, t) {
    ctx.fillStyle = '#301b39';
    ctx.fillRect(0, 0, width, height);
    ellipse(ctx, 480, 260, 390, 240, '#e2bdd3');
    for (const x of [0, 870]) {
        ctx.fillStyle = '#42223f';
        ctx.fillRect(x, 0, 90, 540);
        for (let i = 0; i < 6; i++)
            line(ctx, [
                { x: x + 10 + i * 13, y: 0 },
                { x: x + 5 + i * 13, y: 540 },
            ], '#713d5d', 6);
    }
    const step = smooth((t - 700) / 1500);
    actor(ctx, 270 + step * 130, 440, 1.25, { silhouette: true, arm: 0.4 });
    actor(ctx, 680 - step * 75, 440, 1.1, {
        silhouette: true,
        facing: -1,
        arm: 0.5,
    });
    ctx.save();
    ctx.translate(520, 260);
    ctx.rotate(Math.sin(t / 1600) * 0.2);
    polygon(ctx, [
        { x: 0, y: -35 },
        { x: 44, y: 0 },
        { x: 0, y: 36 },
        { x: -44, y: 0 },
    ], palette.ink);
    line(ctx, [
        { x: 0, y: 36 },
        { x: 0, y: 90 },
    ], palette.ink, 5);
    ctx.restore();
    label(ctx, '그림자 사이로 건네는 작은 약속', 318, 510);
}
export function drawEditing(ctx, id, frame) {
    ctx.save();
    try {
        const t = frame.timeMs, e = frame.enhanced;
        if (id === 'editing-orbit') {
            orbit(ctx, t, e, frame.reducedMotion);
            return;
        }
        if (id === 'editing-shadow-play') {
            if (e)
                shadows(ctx, t);
            else {
                stage(ctx, 0);
                actor(ctx, 350, 440, 1.25, { arm: 0.4 });
                actor(ctx, 650, 440, 1.1, {
                    facing: -1,
                    arm: 0.5,
                    color: palette.blue,
                });
            }
            return;
        }
        if (id === 'editing-harmony') {
            actionScene(ctx, Math.min(t, 1450));
            if (e) {
                ctx.save();
                ctx.globalAlpha = smooth((t - 1550) / 450);
                painting(ctx);
                ctx.restore();
            }
            else if (t > 1450)
                actionScene(ctx, t);
            return;
        }
        if (id === 'editing-still') {
            stage(ctx, 0);
            let clock = t;
            if (e && t > 1450)
                clock = t < 3100 ? 1450 : t - 1650;
            const p = clamp((clock - 500) / 2300);
            actor(ctx, 180 + p * 580, 425 - Math.sin(p * Math.PI) * 220, 1.4, {
                kick: Math.sin(p * Math.PI),
                arm: 0.5,
            });
            return;
        }
        if (id === 'editing-triple') {
            const shot = e ? Math.min(2, Math.floor(Math.max(0, t - 500) / 1000)) : 0;
            const clock = e && t >= 500 && t < 3500
                ? 900 + ((t - 500) % 1000) * 0.5
                : t < 500
                    ? t
                    : 1400 + (t - 3500);
            ctx.save();
            const scale = e
                ? frame.reducedMotion
                    ? 1 + shot * 0.08
                    : 1 + shot * 0.45
                : 1;
            ctx.translate(640, 290);
            ctx.scale(scale, scale);
            ctx.translate(-640, -290);
            actionScene(ctx, e ? Math.max(0, clock) : t);
            ctx.restore();
            if (e)
                label(ctx, `같은 한 동작 · ${shot + 1}/3`, 40, 500);
            return;
        }
        if (id === 'editing-split') {
            stage(ctx, 0);
            const joined = smooth((t - 2800) / 500);
            if (!e || joined >= 1) {
                actor(ctx, 350, 430, 1.4, { arm: smooth((t - 500) / 1800) });
                actor(ctx, 640, 430, 1.4, {
                    facing: -1,
                    color: palette.blue,
                    arm: smooth((t - 1000) / 1800),
                });
                return;
            }
            for (const s of [-1, 1]) {
                ctx.save();
                ctx.beginPath();
                ctx.rect(s < 0 ? 0 : 480, 0, 480, 540);
                ctx.clip();
                ctx.translate(s < 0 ? -10 : 480, 0);
                stage(ctx, 0);
                actor(ctx, 260, 450, 1.8, {
                    facing: -s,
                    color: s < 0 ? palette.gold : palette.blue,
                    arm: smooth((t - (s < 0 ? 500 : 1000)) / 1800),
                });
                ctx.restore();
            }
            line(ctx, [
                { x: 480, y: 0 },
                { x: 480, y: 540 },
            ], palette.paper, 4 * (1 - joined));
            return;
        }
        if (id === 'editing-text-cuts') {
            actionScene(ctx, t);
            if (e && t > 900 && t < 3150) {
                const cut = Math.floor((t - 900) / 750);
                ctx.fillStyle = cut === 1 ? '#9e292f' : '#10131c';
                ctx.fillRect(0, 0, 960, 540);
                ctx.fillStyle = palette.paper;
                ctx.textAlign = 'center';
                ctx.font = `900 ${cut === 1 ? 146 : 94}px serif`;
                ctx.fillText(['視線', '一瞬', '決意'][cut], 480, 315);
                ctx.font = '24px sans-serif';
                ctx.fillText(['시선', '한순간', '결심'][cut], 480, 383);
            }
            return;
        }
        if (id === 'editing-extreme') {
            stage(ctx, 0);
            if (!e) {
                face(ctx, 480, 280, 1.3);
                return;
            }
            const eye = t < 1900 || t > 3100;
            const scale = eye ? 4.6 : 5.6;
            ctx.save();
            ctx.translate(480, 270);
            ctx.scale(scale, scale);
            ctx.translate(-480, -(eye ? 270 : 335));
            face(ctx, 480, 280, 1);
            ctx.restore();
            ctx.fillStyle = palette.ink;
            ctx.fillRect(0, 0, 960, 90);
            ctx.fillRect(0, 450, 960, 90);
            return;
        }
        if (id === 'editing-imaishi') {
            if (!e) {
                actionScene(ctx, t);
                return;
            }
            const pose = t < 950 ? 0 : t < 1550 ? 1 : 2;
            stage(ctx, 0);
            ctx.save();
            if (!frame.reducedMotion) {
                ctx.translate(480, 270);
                ctx.rotate(pose === 1 ? -0.055 : 0.025);
                ctx.translate(-480, -270);
            }
            actor(ctx, pose < 2 ? 420 : 470, 450, pose < 2 ? 1.65 : 1.25, {
                crouch: pose === 0 ? 0.7 : 0,
                arm: pose === 0 ? 0 : 1,
                lean: pose === 2 ? 24 : 0,
            });
            if (pose === 2) {
                for (let i = 0; i < 20; i++) {
                    const a = (i * Math.PI) / 10;
                    line(ctx, [
                        { x: 480 + Math.cos(a) * 190, y: 270 + Math.sin(a) * 190 },
                        { x: 480 + Math.cos(a) * 650, y: 270 + Math.sin(a) * 650 },
                    ], i % 2 ? palette.gold : palette.paper, 3);
                }
                ellipse(ctx, 620, 300, 120, 95, palette.gold);
                for (let i = 0; i < 4; i++)
                    line(ctx, [
                        { x: 570 + i * 27, y: 240 },
                        { x: 575 + i * 27, y: 280 },
                    ], palette.ink, 5);
                ctx.fillStyle = palette.red;
                ctx.font = '900 150px sans-serif';
                ctx.save();
                ctx.translate(35, 175);
                ctx.rotate(-0.12);
                ctx.fillText('돌파', 0, 0);
                ctx.restore();
            }
            ctx.restore();
            return;
        }
        if (id === 'editing-overlap' ||
            id === 'editing-wipe-iris' ||
            id === 'editing-white-out') {
            const p = smooth((t - 1100) / 1600);
            if (id === 'editing-overlap') {
                actionScene(ctx, 900);
                if (e) {
                    ctx.save();
                    ctx.globalAlpha = p;
                    newScene(ctx);
                    ctx.restore();
                }
                else if (t > 1900)
                    newScene(ctx);
            }
            else if (id === 'editing-wipe-iris') {
                actionScene(ctx, 900);
                if (!e) {
                    if (t > 1900)
                        newScene(ctx);
                    return;
                }
                ctx.save();
                ctx.beginPath();
                ctx.rect(0, 0, width * p, height);
                ctx.clip();
                newScene(ctx);
                ctx.restore();
                if (t > 2850) {
                    const r = 650 * (1 - smooth((t - 2850) / 1150));
                    ctx.fillStyle = palette.ink;
                    ctx.beginPath();
                    ctx.rect(0, 0, width, height);
                    ctx.arc(480, 295, r, 0, Math.PI * 2, true);
                    ctx.fill('evenodd');
                }
            }
            else {
                if (t < 2200)
                    actionScene(ctx, 900);
                else
                    newScene(ctx);
                if (e) {
                    const a = t < 2200 ? smooth((t - 950) / 1250) : 1 - smooth((t - 2200) / 1450);
                    ctx.fillStyle = `rgba(255,248,231,${a})`;
                    ctx.fillRect(0, 0, width, height);
                }
            }
            return;
        }
        throw new Error(`화면 구성 견본이 없습니다: ${id}`);
    }
    finally {
        ctx.restore();
    }
}
