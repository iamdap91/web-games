import { arenaSky, arenaStage } from './combat-stage.js';
import { burst, clamp, ease, fistSmear, lerp, line, smearBackground, speedLines, } from './drawing.js';
import { WorldScene } from './world.js';
const turn = Math.PI * 2;
const groundHero = { x: -2.8, y: 0, z: 0.4 };
const groundBear = { x: 1.7, y: 0, z: 0 };
const counterCut = {
    start: 2.27,
    contact: 2.46,
    recovery: 2.54,
    land: 2.78,
    defeat: 2.9,
};
const counterStrike = { x: -0.2, y: 0.65, z: 1.2 };
const counterLanding = { x: -0.15, y: 0, z: 1.2 };
const progress = (time, start, duration) => clamp((time - start) / duration);
const mixPoint = (a, b, p) => ({
    x: lerp(a.x, b.x, p),
    y: lerp(a.y, b.y, p),
    z: lerp(a.z, b.z, p),
});
/** 화면에 그린 원본의 발 앵커·실루엣 배율로 손끝과 피격광을 함께 계산한다. */
function spritePoint(scene, position, sprite, options) {
    const anchor = scene.project(position);
    if (!anchor)
        return null;
    const bodyHeight = (sprite.bounds?.bottom ?? sprite.image.naturalHeight) -
        (sprite.bounds?.top ?? 0);
    const scale = (options.height * anchor.scale) / Math.max(1, bodyHeight);
    const x = (options.pixel.x - sprite.anchorX) * scale;
    const y = (options.pixel.y - sprite.feetY) * scale;
    const angle = options.rotation ?? 0;
    return {
        x: anchor.x + x * Math.cos(angle) - y * Math.sin(angle),
        y: anchor.y + x * Math.sin(angle) + y * Math.cos(angle),
    };
}
function bearSprite(assets, state, phase) {
    const sequence = assets.bear[state];
    const p = state === 'stand' ? ((phase % 1) + 1) % 1 : clamp(phase);
    return sequence[Math.min(sequence.length - 1, Math.floor(p * sequence.length))];
}
/** 펀치·내려찍기는 보유한 남동 원본이 화면 오른쪽의 상대를 향하도록 쓴다. */
function strikeFacing(camera, position) {
    return (Math.atan2(camera.position.x - position.x, camera.position.z - position.z) +
        Math.PI / 4);
}
function cameraRight(camera) {
    const x = camera.target.x - camera.position.x;
    const z = camera.target.z - camera.position.z;
    const length = Math.hypot(x, z) || 1;
    return { x: -z / length, y: 0, z: x / length };
}
function orbit(angle, distance, y, target, roll = 0, focal = 920) {
    return {
        position: {
            x: target.x + Math.sin(angle) * distance,
            y,
            z: target.z + Math.cos(angle) * distance,
        },
        target,
        roll,
        focal,
    };
}
function sceneFor(context, camera, time, aerial = false) {
    arenaSky(context, time);
    const scene = new WorldScene(context, camera, time);
    arenaStage(scene, time, aerial);
    return scene;
}
function blurredArena(context, frame, camera, amount, aerial = false) {
    smearBackground(context, frame.surfaces, (background) => {
        sceneFor(background, camera, frame.time, aerial).render();
    }, amount);
    return new WorldScene(context, camera, frame.time);
}
/** 주먹이 접촉하는 한 코마에만 쓰고 몸통 실루엣에는 손대지 않는다. */
function contactFist(context, point, phase, angle, size = 180, source) {
    if (!point || phase <= 0 || phase >= 1)
        return;
    fistSmear(context, point.x, point.y, phase, angle, size, source);
}
function delayedHit(context, position, time, index, start) {
    const p = (time - start - index * 0.038) / 0.24;
    if (p < 0 || p > 1)
        return;
    if (!position)
        return;
    context.save();
    context.globalCompositeOperation = 'lighter';
    burst(context, position.x, position.y, p, 85 + index * 11, index % 2 ? '#92ddff' : '#fff0ba');
    context.restore();
}
function drawAlreadyCut(context, frame) {
    const time = frame.time;
    const rush = progress(time, 1.35, 0.125);
    const orbitProgress = progress(time, 0, 1.35);
    const orbitAngle = -0.35 + turn * orbitProgress * orbitProgress;
    const finish = progress(time, 1.475, 0.625);
    const firstCamera = orbit(orbitAngle, 14.5 - orbitProgress * 1.3, 6.8 - orbitProgress * 2.7, { x: 0.3, y: 1.8, z: 0 });
    const finalCamera = {
        position: { x: 6.4, y: 2.5, z: 6.6 },
        target: { x: 1.8, y: 1.7, z: 0 },
        focal: 780,
    };
    const camera = time < 1.475
        ? firstCamera
        : {
            position: mixPoint(firstCamera.position, finalCamera.position, ease(finish)),
            target: mixPoint(firstCamera.target, finalCamera.target, ease(finish)),
            focal: lerp(920, 780, ease(finish)),
        };
    const shutter = time >= 1.35 && time < 1.475;
    const stageTime = time < 2.1 ? time : time < 2.7 ? 2.1 : Math.min(time, 3.2);
    const scene = shutter
        ? blurredArena(context, frame, camera, 0.9)
        : sceneFor(context, camera, stageTime);
    const exposedRush = Math.min(2, Math.floor(rush * 3)) / 2;
    const position = time < 1.35
        ? groundHero
        : time < 1.475
            ? { x: lerp(-3.4, 4.4, exposedRush), y: 0.15, z: 0.1 }
            : { x: 4.4, y: 0, z: 0.1 };
    if (time >= 1.35 && time < 2.1) {
        const fade = time < 1.475 ? 1 : 1 - progress(time, 1.475, 0.625);
        for (let i = 0; i < 6; i++) {
            const x = -3.4 + (i / 5) * 7.4;
            if (time < 1.475 && x > position.x)
                continue;
            const trailPosition = { x, y: 0.12, z: 0.1 };
            scene.hero(frame.assets, trailPosition, 'punch', 2.5 / 17, {
                height: 2.55,
                facing: strikeFacing(camera, trailPosition),
                alpha: (0.12 + i * 0.045) * fade,
            });
        }
    }
    const bearState = time >= 3.22 ? 'defeat' : time >= 2.7 ? 'hit' : 'stand';
    const bearPhase = time >= 3.22 ? progress(time, 3.22, 0.32) : progress(time, 2.7, 0.4);
    scene.bear(frame.assets, groundBear, bearState, bearPhase, { height: 4.2 });
    scene.hero(frame.assets, position, time < 1.35 ? 'idle' : shutter ? 'punch' : 'idle', shutter ? 2.5 / 17 : time * 0.7, {
        height: 2.65,
        facing: shutter
            ? strikeFacing(camera, position)
            : time < 1.475
                ? Math.PI / 2
                : -Math.PI / 2,
    });
    scene.render();
    if (shutter) {
        const point = scene.project({ x: 0.5, y: 2, z: 0.1 });
        if (point) {
            line(context, [
                [-120, point.y + 35],
                [1400, point.y - 35],
            ], '#fff6cf', 7);
            contactFist(context, spritePoint(scene, position, frame.assets.hero.punch['south-east'][2], {
                height: 2.65,
                pixel: { x: 80, y: 46 },
            }), 0.6, -0.05, 230, frame.assets.fistPatch);
        }
    }
    if (time >= 2.7) {
        const source = bearSprite(frame.assets, bearState, bearPhase);
        for (let i = 0; i < 8; i++) {
            const hitPoint = spritePoint(scene, groundBear, source, {
                height: 4.2,
                pixel: { x: 74 + (i % 2) * 8, y: 105 - i * 10 },
            });
            delayedHit(context, hitPoint, time, i, 2.7);
        }
    }
    if (time >= 2.1 && time < 2.7) {
        const point = scene.project({ x: 1.7, y: 2.1, z: 0 });
        if (point)
            line(context, [
                [point.x - 90, point.y + 10],
                [point.x + 110, point.y - 10],
            ], '#fcf0ba', 2);
    }
}
const aerialAngles = [
    { angle: -1.35, cameraY: 9.8, roll: -0.12 },
    { angle: 0.1, cameraY: 20, roll: 0.16 },
    { angle: 0.5, cameraY: 2.1, roll: -0.16 },
    { angle: 1.4, cameraY: 10.8, roll: 0.09 },
];
function aerialCamera(time, altitude) {
    if (time < 0.65)
        return orbit(-0.65, 13.7, 4.1 + altitude * 0.6, {
            x: 0,
            y: 2 + altitude * 0.82,
            z: 0,
        });
    if (time < 2.25) {
        const index = Math.min(3, Math.floor((time - 0.65) / 0.4));
        const cut = aerialAngles[index];
        return orbit(cut.angle, index === 1 ? 6 : 9, cut.cameraY, { x: 0, y: 9.3, z: 0 }, cut.roll, 910);
    }
    const slam = progress(time, 2.25, 0.55);
    return orbit(0.62, lerp(11, 8.2, ease(slam)), lerp(12.5, 1.25, ease(slam)), { x: 0.7, y: lerp(8.8, 2.2, ease(slam)), z: 0 }, -0.04 * (1 - slam), 900);
}
/** 원투 원본 중 첫 잽의 신전 2번만 한 번 보여 네 컷의 타수를 보존한다. */
function aerialPunchPhase(time) {
    if (time < 0.18)
        return lerp(0, 1.99 / 17, progress(time, 0.08, 0.1));
    if (time < 0.23)
        return 2.5 / 17;
    return lerp(3.1 / 17, 6.8 / 17, progress(time, 0.23, 0.17));
}
/** 내려찍기 원본 5번의 망치 접촉을 2.9초 지면 충돌에 맞춘다. */
function aerialSlamPhase(time) {
    if (time < 2.45)
        return lerp(2.1 / 9, 3.5 / 9, progress(time, 2.25, 0.2));
    if (time < 2.86)
        return lerp(3.5 / 9, 4.8 / 9, progress(time, 2.45, 0.41));
    if (time < 3.02)
        return 5.5 / 9;
    return lerp(6.1 / 9, 8.8 / 9, progress(time, 3.02, 0.28));
}
function drawAerialPursuit(context, frame) {
    const time = frame.time;
    const launch = progress(time, 0.28, 0.37);
    const inCombo = time >= 0.65 && time < 2.25;
    const comboTime = inCombo ? (time - 0.65) % 0.4 : 0;
    const hidden = inCombo && comboTime < 0.08;
    const slam = progress(time, 2.25, 0.65);
    const altitude = time < 0.65
        ? ease(launch) * 8.3
        : time < 2.25
            ? 8.3
            : time < 2.9
                ? lerp(8.3, 1.85, slam * slam)
                : time < 3
                    ? 1.85
                    : lerp(1.85, 0, ease(progress(time, 3, 0.28)));
    const camera = aerialCamera(time, altitude);
    const smear = hidden || (time >= 2.4 && time < 2.9);
    const scene = smear
        ? blurredArena(context, frame, camera, hidden ? 1 : 0.75, true)
        : sceneFor(context, camera, Math.min(time, 2.9), true);
    if (hidden) {
        scene.render();
        return;
    }
    const cutIndex = inCombo ? Math.min(3, Math.floor((time - 0.65) / 0.4)) : 0;
    const punch = inCombo ? progress(comboTime, 0.08, 0.2) : 0;
    const right = cameraRight(camera);
    const reaction = Math.sin(progress(comboTime, 0.18, 0.2) * Math.PI) * 0.18;
    const bearAltitude = time < 0.65
        ? ease(progress(time, 0.29, 0.36)) * 8.7
        : time < 2.25
            ? altitude + 0.4
            : 8.7 * (1 - slam * slam);
    const bearPosition = {
        x: time < 0.65
            ? lerp(0.65, 0.7, launch)
            : inCombo
                ? 0.7 + right.x * reaction
                : lerp(0.7, 1.25, ease(slam)),
        y: bearAltitude,
        z: inCombo ? -0.2 + right.z * reaction : -0.2,
    };
    const lastAngle = aerialAngles[3].angle;
    const lastHero = {
        x: 0.7 - Math.cos(lastAngle) * 2.65,
        z: -0.2 + Math.sin(lastAngle) * 2.65,
    };
    const distance = 2.65 - Math.sin(punch * Math.PI) * 0.45;
    const heroPosition = time < 0.65
        ? {
            x: lerp(-2.2, -0.9, ease(progress(time, 0, 0.28))),
            y: altitude,
            z: 0.4,
        }
        : time < 2.25
            ? {
                // 가려진 전환 뒤 상대의 다른 쪽으로 재접근하되 네 컷 모두 손은 상대를 향한다.
                x: 0.7 - right.x * distance,
                y: altitude + 0.1,
                z: -0.2 - right.z * distance,
            }
            : {
                x: lerp(lastHero.x, -0.25, ease(slam)),
                y: altitude,
                z: lerp(lastHero.z, 0.5, ease(slam)),
            };
    const uppercutPhase = time < 0.28
        ? lerp(0, 1.99 / 7, progress(time, 0.05, 0.23))
        : time < 0.36
            ? 2.5 / 7
            : time < 0.45
                ? 3.5 / 7
                : lerp(4.1 / 7, 5.8 / 7, progress(time, 0.45, 0.2));
    const heroAction = time < 0.65
        ? 'uppercut'
        : time < 2.25
            ? 'punch'
            : time < 3.3
                ? 'slam'
                : 'idle';
    const heroPhase = time < 0.65
        ? uppercutPhase
        : time < 2.25
            ? aerialPunchPhase(comboTime)
            : aerialSlamPhase(time);
    scene.bear(frame.assets, bearPosition, time < 0.28 ? 'stand' : time < 3.06 ? 'hit' : 'defeat', time >= 3.06
        ? progress(time, 3.06, 0.62)
        : inCombo
            ? progress(comboTime, 0.18, 0.22)
            : time >= 2.9
                ? progress(time, 2.9, 0.16)
                : progress(time, 0.28, 0.37), { height: 4.2, rotation: camera.roll });
    scene.hero(frame.assets, heroPosition, heroAction, heroPhase, {
        height: 2.7,
        facing: strikeFacing(camera, heroPosition),
        rotation: camera.roll,
    });
    scene.render();
    if (inCombo) {
        contactFist(context, spritePoint(scene, heroPosition, frame.assets.hero.punch['south-east'][2], {
            height: 2.7,
            pixel: { x: 80, y: 46 },
            rotation: camera.roll,
        }), progress(comboTime, 0.14, 0.065), -Math.PI / 7 + cutIndex * 0.26, 48, frame.assets.fistPatch);
        const hit = spritePoint(scene, heroPosition, frame.assets.hero.punch['south-east'][2], { height: 2.7, pixel: { x: 80, y: 46 }, rotation: camera.roll });
        if (hit && comboTime >= 0.18)
            burst(context, hit.x, hit.y, progress(comboTime, 0.18, 0.22), 82, '#ffeab2');
    }
    else if (time >= 0.28 && time < 0.47) {
        const hit = spritePoint(scene, heroPosition, frame.assets.hero.uppercut['south-east'][2], { height: 2.7, pixel: { x: 62, y: 34 }, rotation: camera.roll });
        if (hit)
            burst(context, hit.x, hit.y, progress(time, 0.28, 0.19), 135, '#fff0b0');
    }
    else if (time >= 2.9 && time < 3.45) {
        const hit = spritePoint(scene, { x: -0.25, y: 1.85, z: 0.5 }, frame.assets.hero.slam['south-east'][5], {
            height: 2.7,
            pixel: { x: 64, y: 69 },
            rotation: camera.roll,
        });
        if (hit)
            burst(context, hit.x, hit.y, progress(time, 2.9, 0.55), 290, '#ffe4a0');
    }
    if (time > 2.3 && time < 2.9)
        speedLines(context, time, 0.85, true);
}
function counterCamera(time) {
    const p = progress(time, 1.15, 1.12);
    if (time < 1.15)
        return orbit(-0.63, 14, 4.2, { x: 0, y: 2.4, z: 0 });
    if (time <= 2.27)
        return orbit(-0.63 + (103 / 180) * Math.PI * p * p, lerp(14, 10, ease(progress(p, 0, 0.38))), lerp(4.2, 6, p), { x: lerp(0, -0.3, p), y: lerp(2.4, 3.6, p), z: 0 }, lerp(0, 0.1, p), lerp(920, 740, ease(progress(p, 0, 0.38))));
    const q = ease(progress(time, 2.27, 0.35));
    const start = orbit(-0.63 + (103 / 180) * Math.PI, 10, 6, { x: -0.3, y: 3.6, z: 0 }, 0.1, 740);
    const end = orbit(0.58, 8.4, 1.3, { x: 0.6, y: 2.2, z: 0 }, -0.03, 920);
    return {
        position: mixPoint(start.position, end.position, q),
        target: mixPoint(start.target, end.target, q),
        roll: lerp(0.1, -0.03, q),
        focal: lerp(740, 920, q),
    };
}
function counterActors(scene, assets, time, camera) {
    // 장면은 0.11초만 진행하고 카메라는 1.12초 동안 계속 움직인다.
    const sceneTime = time < 1.15
        ? time
        : time < 2.27
            ? 1.15 + ((time - 1.15) / 1.12) * 0.11
            : 1.26 + time - 2.27;
    const jump = progress(sceneTime, 0.75, 0.55);
    const counter = progress(time, counterCut.start, counterCut.contact - counterCut.start);
    const landing = progress(time, counterCut.recovery, counterCut.land - counterCut.recovery);
    const highPosition = {
        x: lerp(-2.8, -0.65, ease(jump)),
        y: Math.sin((Math.min(0.83, jump) * Math.PI) / 2) * 4.2,
        z: 0.5,
    };
    const hero = time < counterCut.start
        ? highPosition
        : time < counterCut.contact
            ? mixPoint(highPosition, counterStrike, ease(counter))
            : time < counterCut.recovery
                ? counterStrike
                : mixPoint(counterStrike, counterLanding, ease(landing));
    const recoil = ease(progress(time, counterCut.contact, 0.32));
    scene.bear(assets, { x: 1.7 + recoil * 0.5, y: 0, z: 0 }, time < counterCut.contact
        ? 'attack'
        : time < counterCut.defeat
            ? 'hit'
            : 'defeat', time < counterCut.contact
        ? progress(sceneTime, 0.34, 1.44)
        : time < counterCut.defeat
            ? progress(time, counterCut.contact, counterCut.defeat - counterCut.contact)
            : progress(time, counterCut.defeat, 0.3), { height: 4.2, rotation: camera.roll });
    scene.hero(assets, hero, time < 0.75
        ? 'idle'
        : time < counterCut.start
            ? 'jump'
            : time < counterCut.land
                ? 'punch'
                : 'idle', time < counterCut.start
        ? jump
        : time < counterCut.contact
            ? lerp(0, 1.99 / 17, counter)
            : time < counterCut.recovery
                ? 2.5 / 17
                : lerp(3.1 / 17, 6.8 / 17, landing), {
        height: 2.7,
        facing: time < counterCut.start ? Math.PI / 2 : strikeFacing(camera, hero),
        rotation: camera.roll,
    });
    return { hero, counter };
}
function drawBulletCounter(context, frame) {
    const time = frame.time;
    const camera = counterCamera(time);
    const smear = time > counterCut.start && time < counterCut.contact;
    // 궤도 구간은 배경도 같은 장면 시간으로 천천히 진행한다.
    const worldTime = time < 1.15
        ? time
        : time < 2.27
            ? 1.15 + ((time - 1.15) / 1.12) * 0.11
            : 1.26 + Math.min(time, 2.78) - 2.27;
    const scene = smear
        ? blurredArena(context, frame, camera, 0.88)
        : sceneFor(context, camera, worldTime);
    const { hero, counter } = counterActors(scene, frame.assets, time, camera);
    scene.render();
    if (time > 1.15 && time < 2.27) {
        const center = scene.project({ x: -0.45, y: 4.9, z: 0.5 });
        if (center) {
            context.save();
            context.strokeStyle = '#d5f0ff77';
            context.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
                context.beginPath();
                context.ellipse(center.x, center.y, 90 + i * 38, 20 + i * 10, -0.25, 0, turn);
                context.stroke();
            }
            context.restore();
        }
    }
    if (smear)
        contactFist(context, spritePoint(scene, hero, frame.assets.hero.punch['south-east'][2], {
            height: 2.7,
            pixel: { x: 80, y: 46 },
            rotation: camera.roll,
        }), counter, 0.4, 230, frame.assets.fistPatch);
    if (time >= counterCut.contact && time < 2.9) {
        const hit = spritePoint(scene, counterStrike, frame.assets.hero.punch['south-east'][2], {
            height: 2.7,
            pixel: { x: 80, y: 46 },
            rotation: camera.roll,
        });
        if (hit)
            burst(context, hit.x, hit.y, progress(time, counterCut.contact, 0.44), 215, '#e3f5ff');
    }
}
export const arenaCuts = [
    {
        id: 'already-cut',
        title: '이미 때렸다',
        kind: '3D',
        duration: 3.9,
        description: '원형 투기장을 가속해 한 바퀴 돌고, 신전 원본 세 코마와 여섯 잔상 뒤 0.6초 정적. 여덟 타가 몸 안에서 늦게 터진 뒤 쓰러진다.',
        beats: [
            { time: 0, label: '가속 360°' },
            { time: 1.35, label: '1코마 × 3 · 잔상' },
            { time: 2.1, label: '등 뒤 정적' },
            { time: 2.7, label: '8겹 지연 타격' },
            { time: 3.54, label: '쓰러짐 완료 · 정지' },
        ],
        draw: drawAlreadyCut,
    },
    {
        id: 'aerial-pursuit',
        title: '공중 추격 연타',
        kind: '3D',
        duration: 4.2,
        description: '어퍼컷으로 솟아 왼쪽·위·아래·오른쪽 네 구도를 끊어 친다. 컷 사이 0.08초는 인물을 지우고 배경만 흘린다.',
        beats: [
            { time: 0.28, label: '어퍼컷 접촉' },
            { time: 0.83, label: '공중 1타 · 왼쪽' },
            { time: 1.23, label: '공중 2타 · 위' },
            { time: 1.63, label: '공중 3타 · 아래' },
            { time: 2.03, label: '공중 4타 · 오른쪽' },
            { time: 2.9, label: '원본 5번 · 지면 접촉' },
            { time: 3.45, label: '앙각 정지' },
        ],
        draw: drawAerialPursuit,
    },
    {
        id: 'bullet-counter',
        title: '불릿 타임 반격',
        kind: '3D',
        duration: 3.5,
        description: '곰왕의 실제 공격을 뛰어넘고 장면의 0.11초를 1.12초로 펼친다. 카메라는 103° 궤도와 빠른 접근을 따로 진행한다.',
        beats: [
            { time: 0, label: '곰왕 원본 공격' },
            { time: 0.75, label: '뛰어넘기' },
            { time: 1.15, label: '0.11초 → 1.12초 · 103°' },
            { time: 2.27, label: '반격 · 앙각' },
            { time: 2.46, label: '첫 잽 신전 · 실제 접촉' },
            { time: 3.2, label: '쓰러짐 완료 · 착지 정지' },
        ],
        draw: drawBulletCounter,
    },
];
