import { drawBattle, drawBattleActors, drawAtaho, drawBear, drawPortrait, } from './battle.js';
import { ellipse, label, line, palette, smooth, stage } from './drawing.js';
import { height, width, } from './types.js';
import { drawHarmonyPlate } from './harmony-plate.js';
export const editingSamples = [
    {
        id: 'editing-harmony',
        name: '하모니',
        category: 'editing',
        previewMs: 2500,
        description: '어퍼컷 접촉의 인물과 배경을 같은 안료와 붓자국으로 다시 칠한 종결 판으로 전환합니다.',
        distinction: '원본 위 세피아 필터가 아니라 색면과 경계선을 재구성한 디지털 원리 견본입니다. 전용 수작업 하모니 원화는 아닙니다.',
    },
    {
        id: 'editing-still',
        name: '멈춘 그림',
        category: 'editing',
        previewMs: 2150,
        description: '어퍼컷의 접촉 자세를 멈춰 보여준 뒤 같은 동작을 이어갑니다.',
        distinction: '회화 질감이나 새로운 그림 없이 한 자세의 유지 시간만 바꿉니다.',
    },
    {
        id: 'editing-triple',
        name: '반복 쇼트',
        category: 'editing',
        previewMs: 2400,
        description: '같은 접촉을 와이드·근접·타점의 세 컷으로 다시 보여줍니다.',
        distinction: '세 번 때리는 동작이 아니라 같은 사건을 반복하는 편집입니다.',
    },
    {
        id: 'editing-split',
        name: '화면 분할',
        category: 'editing',
        previewMs: 1450,
        description: '떨어진 두 인물의 준비를 동시에 보여준 뒤 하나의 장면으로 합칩니다.',
        distinction: '인서트 한 장보다 두 시간선의 동시 진행에 초점을 둡니다.',
    },
    {
        id: 'editing-orbit',
        name: '마와리코미',
        category: 'editing',
        previewMs: 2200,
        description: '카메라가 두 인물 주위를 돌며 앞뒤 기둥과 인물 레이어의 가림 순서가 바뀝니다.',
        distinction: '원화 방향은 보존하고 공간 좌표를 투영하는 2.5D 회전 구도입니다.',
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
        description: '아타호 어퍼컷의 장전·접촉 컷과 거대 글자를 강한 박자로 연결합니다.',
        distinction: '원근·타이밍·문자 구성을 한 장면의 정점에 모으는 견본입니다.',
    },
    {
        id: 'editing-shadow-play',
        name: '그림자극 소녀 · 원리 응용',
        category: 'editing',
        previewMs: 2300,
        description: '왕관을 쓴 큰 곰왕과 작은 아타호의 한 방으로 왕관의 주인이 바뀌는 짧은 막간극입니다.',
        distinction: '왕관이라는 상징과 질문→행동→반전의 막간극 원리를 응용합니다. 원작의 소녀·대사·장면을 재현하지 않습니다.',
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
function actionScene(ctx, timeMs, frame) {
    drawBattle(ctx, frame, { timeMs });
}
function newScene(ctx, frame) {
    stage(ctx, 0);
    ctx.fillStyle = '#7c9eae44';
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(-90, 35);
    ctx.scale(1.15, 1.15);
    drawBattleActors(ctx, frame, { timeMs: 2850 });
    ctx.restore();
}
function painting(ctx, frame) {
    drawHarmonyPlate(ctx, frame);
}
function orbit(ctx, frame) {
    stage(ctx, 0);
    const angle = 0.1 +
        (frame.enhanced
            ? smooth((frame.timeMs - 400) / 3200) * (frame.reducedMotion ? 0.15 : 1.2)
            : 0);
    const project = (p) => {
        const depth = 8 + p.z * Math.cos(angle) + p.x * Math.sin(angle);
        return {
            x: 480 + ((p.x * Math.cos(angle) - p.z * Math.sin(angle)) * 540) / depth,
            y: 210 + ((2 - p.y) * 540) / depth,
            depth,
        };
    };
    for (let i = -4; i <= 4; i++) {
        line(ctx, [project({ x: i, y: 0, z: -4 }), project({ x: i, y: 0, z: 4 })], '#c7e0e466', 1);
        line(ctx, [project({ x: -4, y: 0, z: i }), project({ x: 4, y: 0, z: i })], '#c7e0e466', 1);
    }
    const columns = [
        { x: -3, z: -2 },
        { x: 3, z: 2 },
        { x: 3, z: -2 },
        { x: -3, z: 2 },
    ];
    const objects = columns.map((p) => ({
        depth: project({ ...p, y: 0 }).depth,
        draw: () => {
            const base = project({ ...p, y: 0 }), top = project({ ...p, y: 3 });
            line(ctx, [base, top], '#375b70', 200 / base.depth);
            ellipse(ctx, top.x, top.y, 100 / base.depth, 30 / base.depth, '#c0d9df');
        },
    }));
    for (const [x, z, who] of [
        [-0.9, 0, 'ataho'],
        [1.15, 0.25, 'bear'],
    ]) {
        const p = project({ x, y: 0, z });
        objects.push({
            depth: p.depth,
            draw: () => {
                if (who === 'ataho')
                    drawAtaho(ctx, frame, {
                        x: p.x,
                        ground: p.y,
                        scale: (3.4 * 8) / p.depth,
                    });
                else
                    drawBear(ctx, frame, {
                        x: p.x,
                        ground: p.y,
                        scale: (2.6 * 8) / p.depth,
                    });
            },
        });
    }
    for (const object of objects.sort((a, b) => b.depth - a.depth))
        object.draw();
}
function shadows(ctx, frame) {
    ctx.fillStyle = '#241d35';
    ctx.fillRect(0, 0, width, height);
    ellipse(ctx, 480, 265, 400, 248, '#b8d1d9');
    const t = frame.timeMs;
    drawBear(ctx, frame, t < 2200
        ? { silhouette: true }
        : { silhouette: true, state: 'defeat', timeMs: 1800 + t - 2200 });
    drawAtaho(ctx, frame, { silhouette: true });
    const flight = smooth((t - 1800) / 1050);
    const crownX = t < 1800 ? 650 : 650 - flight * 115;
    const crownY = t < 1800 ? 115 : 115 - Math.sin(flight * Math.PI) * 105 + flight * 135;
    ctx.save();
    ctx.translate(crownX, crownY);
    ctx.fillStyle = '#241d35';
    ctx.beginPath();
    ctx.moveTo(-43, 13);
    ctx.lineTo(-47, -28);
    ctx.lineTo(-20, -9);
    ctx.lineTo(0, -40);
    ctx.lineTo(20, -9);
    ctx.lineTo(47, -28);
    ctx.lineTo(43, 13);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#241d35';
    ctx.font = '700 25px serif';
    ctx.textAlign = 'center';
    ctx.fillText(t < 2200 ? '큰 왕관이 왕을 만들까?' : '왕관보다 한 방.', 480, 478);
    for (const x of [0, 875]) {
        ctx.fillStyle = '#34273f';
        ctx.fillRect(x, 0, 85, 540);
        for (let i = 0; i < 5; i++)
            line(ctx, [
                { x: x + 10 + i * 15, y: 0 },
                { x: x + 8 + i * 15, y: 540 },
            ], '#59405c', 6);
    }
}
export function drawEditing(ctx, id, frame) {
    ctx.save();
    try {
        const t = frame.timeMs, e = frame.enhanced;
        if (id === 'editing-orbit') {
            orbit(ctx, frame);
            return;
        }
        if (id === 'editing-shadow-play') {
            if (e)
                shadows(ctx, frame);
            else
                drawBattle(ctx, frame);
            return;
        }
        if (id === 'editing-harmony') {
            actionScene(ctx, e ? Math.min(t, 1830) : t, frame);
            if (e && t > 2050) {
                ctx.save();
                ctx.globalAlpha = smooth((t - 2050) / 500);
                painting(ctx, frame);
                ctx.restore();
            }
            return;
        }
        if (id === 'editing-still') {
            const clock = e && t > 1800 ? (t < 3050 ? 1800 : t - 1250) : t;
            actionScene(ctx, clock, frame);
            return;
        }
        if (id === 'editing-triple') {
            const shot = e ? Math.min(2, Math.floor(Math.max(0, t - 500) / 1000)) : 0;
            const clock = e && t >= 500 && t < 3500
                ? 1500 + ((t - 500) % 1000) * 0.65
                : t < 500
                    ? t
                    : 2200 + (t - 3500);
            ctx.save();
            const zoom = e
                ? frame.reducedMotion
                    ? 1 + shot * 0.08
                    : 1 + shot * 0.38
                : 1;
            ctx.translate(584, 246);
            ctx.scale(zoom, zoom);
            ctx.translate(-584, -246);
            actionScene(ctx, e ? clock : t, frame);
            ctx.restore();
            if (e)
                label(ctx, `같은 어퍼컷 · ${shot + 1}/3`, 40, 500);
            return;
        }
        if (id === 'editing-split') {
            if (!e || t >= 1700) {
                drawBattle(ctx, frame);
                return;
            }
            stage(ctx);
            for (const who of ['ataho', 'bear']) {
                ctx.save();
                ctx.beginPath();
                ctx.rect(who === 'ataho' ? 0 : 480, 0, 480, 540);
                ctx.clip();
                if (who === 'ataho')
                    drawAtaho(ctx, frame, { x: 300, ground: 455, scale: 4.2 });
                else
                    drawBear(ctx, frame, { x: 715, ground: 455, scale: 3 });
                ctx.restore();
            }
            line(ctx, [
                { x: 480, y: 0 },
                { x: 480, y: 540 },
            ], palette.paper, 4);
            return;
        }
        if (id === 'editing-text-cuts') {
            drawBattle(ctx, frame);
            if (e && t > 850 && t < 3100) {
                const cut = Math.floor((t - 850) / 750);
                ctx.fillStyle = cut === 1 ? '#9e292f' : '#10131c';
                ctx.fillRect(0, 0, width, height);
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
            drawBattle(ctx, frame);
            if (!e)
                return;
            const eyes = t < 1900 || t > 3100;
            drawPortrait(ctx, frame, {
                x: 0,
                y: 90,
                width: 960,
                height: 360,
                crop: eyes ? 'eyes' : 'mouth',
            });
            ctx.fillStyle = palette.ink;
            ctx.fillRect(0, 0, 960, 90);
            ctx.fillRect(0, 450, 960, 90);
            return;
        }
        if (id === 'editing-imaishi') {
            if (!e) {
                drawBattle(ctx, frame);
                return;
            }
            const pose = t < 1050 ? 1100 : t < 1600 ? 1480 : 1830;
            ctx.save();
            const zoom = t < 1600 ? 1 : frame.reducedMotion ? 1.1 : 1.6;
            ctx.translate(584, 246);
            ctx.scale(zoom, zoom);
            ctx.translate(-584, -246);
            actionScene(ctx, pose, frame);
            ctx.restore();
            if (t >= 1600) {
                for (let i = 0; i < 20; i++) {
                    const a = (i * Math.PI) / 10;
                    line(ctx, [
                        { x: 584 + Math.cos(a) * 160, y: 246 + Math.sin(a) * 160 },
                        { x: 584 + Math.cos(a) * 900, y: 246 + Math.sin(a) * 900 },
                    ], i % 2 ? palette.gold : palette.paper, 3);
                }
                ctx.fillStyle = palette.red;
                ctx.font = '900 150px sans-serif';
                ctx.fillText('돌파', 35, 170);
            }
            return;
        }
        if (id === 'editing-overlap' ||
            id === 'editing-wipe-iris' ||
            id === 'editing-white-out') {
            const p = smooth((t - 1500) / 1300);
            if (id === 'editing-overlap') {
                actionScene(ctx, 1800, frame);
                if (e) {
                    ctx.save();
                    ctx.globalAlpha = p;
                    newScene(ctx, frame);
                    ctx.restore();
                }
                else if (t > 2200)
                    newScene(ctx, frame);
            }
            else if (id === 'editing-wipe-iris') {
                actionScene(ctx, 1800, frame);
                if (!e) {
                    if (t > 2200)
                        newScene(ctx, frame);
                    return;
                }
                ctx.save();
                ctx.beginPath();
                ctx.rect(0, 0, width * p, height);
                ctx.clip();
                newScene(ctx, frame);
                ctx.restore();
                if (t > 2900) {
                    const r = 650 * (1 - smooth((t - 2900) / 1100));
                    ctx.fillStyle = palette.ink;
                    ctx.beginPath();
                    ctx.rect(0, 0, width, height);
                    ctx.arc(584, 246, r, 0, Math.PI * 2, true);
                    ctx.fill('evenodd');
                }
            }
            else {
                if (t < 2200)
                    actionScene(ctx, 1800, frame);
                else
                    newScene(ctx, frame);
                if (e) {
                    const a = t < 2200
                        ? smooth((t - 1200) / 1000)
                        : 1 - smooth((t - 2200) / 1450);
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
