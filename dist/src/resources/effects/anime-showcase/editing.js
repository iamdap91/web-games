import { battleImpact, drawBattle, drawBattleActors, drawAtaho, drawBear, drawPortrait, sampleAtahoSprite, } from './battle.js';
import { ellipse, label, line, palette, smooth, stage } from './drawing.js';
import { height, width, } from './types.js';
import { drawHarmonyPlate } from './harmony-plate.js';
import { drawEditingOrbit } from './editing-orbit.js';
export const editingSamples = [
    {
        id: 'editing-harmony',
        name: '하모니',
        category: 'editing',
        previewMs: 2500,
        beats: [
            { timeMs: 1750, label: '접촉 직전' },
            { timeMs: 2200, label: '회화 판 전환' },
            { timeMs: 3000, label: '종결 판 유지' },
        ],
        description: '어퍼컷 접촉의 인물과 배경을 같은 안료와 붓자국으로 다시 칠한 정지 종결 판으로 전환합니다.',
        distinction: '원본 위 세피아 필터가 아니라 색면과 경계선을 재구성한 디지털 원리 견본입니다. 전용 수작업 하모니 원화는 아닙니다.',
    },
    {
        id: 'editing-still',
        name: '멈춘 그림',
        category: 'editing',
        previewMs: 2150,
        beats: [
            { timeMs: 1750, label: '접촉 직전' },
            { timeMs: 2350, label: '접촉 그림 정지' },
            { timeMs: 3300, label: '동작 재개' },
        ],
        description: '어퍼컷의 접촉 자세를 멈춰 보여준 뒤 같은 동작을 이어갑니다.',
        distinction: '회화 질감이나 새로운 그림 없이 한 자세의 유지 시간만 바꿉니다.',
    },
    {
        id: 'editing-triple',
        name: '반복 쇼트',
        category: 'editing',
        previewMs: 3180,
        beats: [
            { timeMs: 1950, label: '와이드 1회' },
            { timeMs: 2550, label: '근접 2회' },
            { timeMs: 3150, label: '타점 3회' },
            { timeMs: 3450, label: '와이드 회수' },
        ],
        description: '같은 정권 접촉을 와이드·근접·타점의 세 컷으로 다시 보여줍니다.',
        distinction: '세 번 때리는 동작이 아니라 같은 사건을 반복하는 편집입니다.',
    },
    {
        id: 'editing-split',
        name: '화면 분할',
        category: 'editing',
        previewMs: 1450,
        beats: [
            { timeMs: 850, label: '두 인물 준비' },
            { timeMs: 1500, label: '패널 안 긴장' },
            { timeMs: 1850, label: '한 장면으로 합류' },
        ],
        description: '떨어진 두 인물의 준비를 동시에 보여준 뒤 하나의 장면으로 합칩니다.',
        distinction: '인서트 한 장보다 두 시간선의 동시 진행에 초점을 둡니다.',
    },
    {
        id: 'editing-orbit',
        name: '마와리코미 · 공간 회전 (인물 다각도 미재현)',
        category: 'editing',
        previewMs: 3400,
        beats: [
            { timeMs: 400, label: '왼쪽 아타호' },
            { timeMs: 2100, label: '중간 시점' },
            { timeMs: 3600, label: '반대편 공간 구도' },
        ],
        description: '같은 공간의 바닥·기둥·배경을 투영하며 아타호가 왼쪽에서 오른쪽으로 넘어가는 구도까지 회전합니다.',
        distinction: '공간 회전 견본입니다. 인물은 방향 고정 원본이므로 옆·뒷면이 드러나는 완전한 마와리코미는 미재현입니다.',
    },
    {
        id: 'editing-text-cuts',
        name: '신보 문자 컷',
        category: 'editing',
        previewMs: 1320,
        beats: [
            { timeMs: 920, label: '시선 문자 컷' },
            { timeMs: 1350, label: '일순 문자 컷' },
            { timeMs: 1710, label: '결의 문자 컷' },
            { timeMs: 1900, label: '타격 장면' },
        ],
        description: '장면 사이에 검정·빨강 바탕의 짧은 문자 컷을 끼웁니다.',
        distinction: '대사를 계속 띄우는 자막보다 화면 자체를 글자의 박자로 바꿉니다.',
    },
    {
        id: 'editing-extreme',
        name: '신보 눈·입 클로즈업',
        category: 'editing',
        previewMs: 2500,
        beats: [
            { timeMs: 350, label: '와이드' },
            { timeMs: 1100, label: '눈' },
            { timeMs: 1700, label: '입' },
            { timeMs: 2500, label: '눈의 긴장' },
            { timeMs: 3500, label: '와이드 복귀' },
        ],
        description: '눈과 입의 극단적인 근접 컷이 서로 다른 유지 시간으로 교차합니다.',
        distinction: '얼굴 전체를 확대하는 컷인과 달리 얼굴의 일부만 보여줍니다.',
    },
    {
        id: 'editing-imaishi',
        name: '이마이시 연출',
        category: 'editing',
        previewMs: 2200,
        beats: [
            { timeMs: 1350, label: '끊어지는 장전' },
            { timeMs: 1830, label: '돌파' },
            { timeMs: 2200, label: '타격 유지' },
        ],
        description: '아타호 어퍼컷의 장전·접촉 컷과 거대 글자를 강한 박자로 연결합니다.',
        distinction: '원근·타이밍·문자 구성을 한 장면의 정점에 모으는 견본입니다.',
    },
    {
        id: 'editing-shadow-play',
        name: '그림자극 소녀 · 원리 응용',
        category: 'editing',
        previewMs: 2300,
        beats: [
            { timeMs: 1600, label: '큰 왕관' },
            { timeMs: 2400, label: '한 방' },
            { timeMs: 3300, label: '왕관의 주인' },
        ],
        description: '왕관을 쓴 큰 곰왕과 작은 아타호의 한 방으로 왕관의 주인이 바뀌는 짧은 막간극입니다.',
        distinction: '왕관이라는 상징과 질문→행동→반전의 막간극 원리를 응용합니다. 원작의 소녀·대사·장면을 재현하지 않습니다.',
    },
    {
        id: 'editing-overlap',
        name: '오버랩',
        category: 'editing',
        previewMs: 1850,
        beats: [
            { timeMs: 1450, label: '앞 장면' },
            { timeMs: 2150, label: '두 장면의 겹침' },
            { timeMs: 3000, label: '다음 장면' },
        ],
        description: '앞 장소가 남아 있는 동안 다음 장소와 인물이 겹쳐 들어옵니다.',
        distinction: '인물 소실 효과가 아니라 두 장면 전체의 겹침 전환입니다.',
    },
    {
        id: 'editing-wipe-iris',
        name: '와이프·아이리스',
        category: 'editing',
        previewMs: 2300,
        beats: [
            { timeMs: 1450, label: '앞 장면' },
            { timeMs: 2200, label: '쓸고 들어오는 경계' },
            { timeMs: 2850, label: '다음 장면' },
            { timeMs: 3650, label: '인물을 남기는 원' },
        ],
        description: '새 장면이 옆으로 쓸고 들어온 뒤 원형 창이 인물을 남기며 닫힙니다.',
        distinction: '밝기만 바꾸지 않고 다음 화면을 드러내는 경계의 형태를 바꿉니다.',
    },
    {
        id: 'editing-white-out',
        name: '화이트 아웃',
        category: 'editing',
        previewMs: 2200,
        beats: [
            { timeMs: 1100, label: '앞 장면' },
            { timeMs: 2200, label: '흰 빛의 정점' },
            { timeMs: 3300, label: '다음 장소 드러남' },
        ],
        description: '장면이 흰 빛에 잠겼다가 다음 장소가 천천히 돌아옵니다.',
        distinction: '짧은 타격 섬광보다 긴 노출 변화로 장면 사이의 시간을 만듭니다.',
    },
];
function actionScene(ctx, timeMs, frame) {
    drawBattle(ctx, frame, { timeMs });
}
function newScene(ctx, frame) {
    // 이전 설원과 구별되는 석주 안뜰을 만들어 두 장면 전체의 전환을 읽히게 한다.
    const sky = ctx.createLinearGradient(0, 0, 0, 430);
    sky.addColorStop(0, '#29344b');
    sky.addColorStop(1, '#c58f8b');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);
    ellipse(ctx, 790, 145, 63, 63, '#edcfaa');
    ctx.fillStyle = '#3d3b52';
    ctx.fillRect(0, 310, width, 125);
    ctx.fillStyle = '#978e8a';
    ctx.fillRect(0, 395, width, 145);
    for (const x of [90, 240, 720, 870]) {
        ctx.fillStyle = '#b6aaa1';
        ctx.fillRect(x - 17, 100, 34, 308);
        ctx.fillStyle = '#6c6977';
        ctx.fillRect(x + 7, 100, 10, 308);
        ctx.fillStyle = '#dac7b5';
        ctx.fillRect(x - 25, 90, 50, 15);
        ctx.fillRect(x - 25, 401, 50, 14);
    }
    ctx.save();
    ctx.translate(-90, -38);
    ctx.scale(1.15, 1.15);
    drawBattleActors(ctx, frame, { timeMs: 2850 });
    ctx.restore();
}
function newSceneFocus(frame) {
    const sprite = sampleAtahoSprite(frame, { timeMs: 2850 });
    return {
        x: -90 + (sprite.left + sprite.width * (46 / 96)) * 1.15,
        y: -38 + (sprite.top + sprite.height * (33 / 96)) * 1.15,
    };
}
function painting(ctx, frame) {
    drawHarmonyPlate(ctx, frame);
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
    const sprite = sampleAtahoSprite(frame, { timeMs: Math.max(t, 2850) });
    const owner = {
        x: sprite.left + sprite.width * (46 / 96),
        y: sprite.top + sprite.height * (20 / 96) - 13,
    };
    const crownX = 650 + (owner.x - 650) * flight;
    const crownY = 115 + (owner.y - 115) * flight - Math.sin(flight * Math.PI) * 70;
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
            drawEditingOrbit(ctx, frame);
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
            const repeating = e && t >= 1500 && t < 3300;
            const shot = repeating ? Math.floor((t - 1500) / 600) : 0;
            const clock = repeating
                ? 1500 + ((t - 1500) % 600) * (400 / 600)
                : t < 1500
                    ? t
                    : 1900 + (t - 3300);
            ctx.save();
            const impact = battleImpact(frame);
            const zoom = e
                ? frame.reducedMotion
                    ? 1 + shot * 0.08
                    : 1 + shot * 0.55
                : 1;
            ctx.translate(impact.x, impact.y);
            ctx.scale(zoom, zoom);
            ctx.translate(-impact.x, -impact.y);
            actionScene(ctx, e ? clock : t, frame);
            ctx.restore();
            if (repeating)
                label(ctx, `같은 정권 · ${shot + 1}/3`, 40, 500);
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
                    drawAtaho(ctx, frame, { x: 300, ground: 470, scale: 4.8 });
                else
                    drawBear(ctx, frame, { x: 715, ground: 470, scale: 3.3 });
                ctx.restore();
            }
            line(ctx, [
                { x: 480, y: 0 },
                { x: 480, y: 540 },
            ], palette.paper, 8);
            return;
        }
        if (id === 'editing-text-cuts') {
            drawBattle(ctx, frame);
            const cuts = [
                { start: 850, end: 1017, text: '視線', color: '#10131c' },
                { start: 1280, end: 1447, text: '一瞬', color: '#9e292f' },
                { start: 1660, end: 1785, text: '決意', color: '#10131c' },
            ];
            const cut = e
                ? cuts.find((shot) => t >= shot.start && t < shot.end)
                : undefined;
            if (cut) {
                ctx.fillStyle = cut.color;
                ctx.fillRect(0, 0, width, height);
                ctx.fillStyle = palette.paper;
                ctx.textAlign = 'center';
                ctx.font = '900 215px serif';
                ctx.fillText(cut.text, 480, 343);
            }
            return;
        }
        if (id === 'editing-extreme') {
            drawBattle(ctx, frame);
            if (!e || t < 600 || t >= 3300)
                return;
            // 넓은 구도로 시작하고 짧은 입 컷을 끼운 뒤 눈을 오래 붙잡아 긴장을 쌓는다.
            const eyes = t < 1550 || t >= 1950;
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
            // 긴 장전·2코마의 빠른 이동·접촉 유지를 나눈 뒤 회수로 잇는다.
            const pose = t < 1050
                ? t
                : t < 1520
                    ? 1100 + Math.floor((t - 1050) / 125) * 80
                    : t < 1700
                        ? 1480
                        : t < 1783
                            ? 1640
                            : t < 2140
                                ? 1830
                                : 1830 + (t - 2140) * 1.1;
            const impactHold = t >= 1783 && t < 2450;
            ctx.save();
            const zoom = impactHold ? (frame.reducedMotion ? 1.1 : 1.7) : 1;
            ctx.translate(584, 246);
            ctx.scale(zoom, zoom);
            ctx.translate(-584, -246);
            actionScene(ctx, pose, frame);
            ctx.restore();
            if (impactHold) {
                ctx.save();
                ctx.globalAlpha *= 0.82;
                for (let i = 0; i < 20; i++) {
                    const a = (i * Math.PI) / 10;
                    line(ctx, [
                        { x: 584 + Math.cos(a) * 260, y: 246 + Math.sin(a) * 230 },
                        { x: 584 + Math.cos(a) * 900, y: 246 + Math.sin(a) * 900 },
                    ], i % 2 ? palette.gold : palette.paper, 6);
                }
                ctx.restore();
                ctx.save();
                const settle = smooth((t - 1783) / 125);
                ctx.translate(35, 170);
                ctx.scale(1 + (1 - settle) * 0.18, 1 + (1 - settle) * 0.18);
                ctx.fillStyle = palette.red;
                ctx.strokeStyle = palette.ink;
                ctx.lineWidth = 9;
                ctx.lineJoin = 'round';
                ctx.font = '900 175px sans-serif';
                ctx.strokeText('돌파', 0, 0);
                ctx.fillText('돌파', 0, 0);
                ctx.restore();
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
                    const focus = newSceneFocus(frame);
                    ctx.arc(focus.x, focus.y, r, 0, Math.PI * 2, true);
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
