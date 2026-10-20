import { clamp, ease, fistSmear, lerp, line, smearBackground, speedLines, } from './drawing.js';
import { gameDust, gameImpact } from '../../cutscenes/game-effects.js';
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
function sceneFor(context, frame, camera, time) {
    frame.surfaces.stage.background(context, 'arena', camera, time, {
        focus: camera.target,
    });
    return new WorldScene(context, camera);
}
function blurredArena(context, frame, camera, amount, direction = 'horizontal') {
    smearBackground(context, frame.surfaces, (background) => {
        frame.surfaces.stage.background(background, 'arena', camera, frame.time, {
            focus: camera.target,
        });
    }, amount, direction === 'vertical');
    return new WorldScene(context, camera);
}
/** 주먹이 접촉하는 한 코마에만 쓰고 몸통 실루엣에는 손대지 않는다. */
function contactFist(context, point, phase, angle, size = 180, source) {
    if (!point || phase <= 0 || phase >= 1)
        return;
    fistSmear(context, point.x, point.y, phase, angle, size, source);
}
function delayedHit(context, frame, position, time, index, start) {
    const p = (time - start - index * 0.038) / 0.24;
    if (p < 0 || p > 1)
        return;
    if (!position)
        return;
    gameImpact(context, frame.assets.effects, {
        x: position.x,
        y: position.y,
        progress: p,
        size: 170 + index * 22,
        angle: -0.3 + index * 0.08,
    });
}
function alreadyCutFinishPose(assets, time) {
    const recovering = time < 1.76;
    const action = recovering ? 'punch' : 'release';
    const sequence = assets.hero[action]['south-east'];
    const index = recovering
        ? 3 + Math.min(3, Math.floor(progress(time, 1.475, 0.285) * 4 + 1e-8))
        : time < 2.7
            ? 0
            : Math.min(5, 1 + Math.floor((time - 2.7) / 0.1 + 1e-8));
    const sprite = sequence[index];
    const reference = assets.hero.punch['south-east'][2];
    const height = (source) => (source.bounds?.bottom ?? source.image.naturalHeight) -
        (source.bounds?.top ?? 0);
    return {
        action,
        phase: (index + 0.5) / sequence.length,
        // 팔을 들어 실루엣 높이가 달라져도 원본 픽셀 배율과 발 위치를 유지한다.
        height: (2.65 * height(sprite)) / height(reference),
    };
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
        : sceneFor(context, frame, camera, stageTime);
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
    if (time < 1.475) {
        scene.hero(frame.assets, position, shutter ? 'punch' : 'idle', shutter ? 2.5 / 17 : time * 0.7, {
            height: 2.65,
            facing: shutter ? strikeFacing(camera, position) : Math.PI / 2,
        });
    }
    else {
        const pose = alreadyCutFinishPose(frame.assets, time);
        scene.hero(frame.assets, position, pose.action, pose.phase, {
            height: pose.height,
            facing: strikeFacing(camera, position),
        });
    }
    scene.render();
    frame.surfaces.stage.foreground(context, 'arena', camera, time, {
        focus: camera.target,
    });
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
            delayedHit(context, frame, hitPoint, time, i, 2.7);
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
const aerialComboEnd = 2.25;
const aerialFinish = {
    dropStart: 2.5,
    contact: 2.9,
    contactPose: 2.86,
    recoverStart: 3.02,
};
const aerialPunches = {
    jab: {
        frame: 2,
        hand: { x: 80, y: 46 },
        prepare: [0, 1],
        recover: [3, 4, 5, 6],
    },
    straight: {
        frame: 12,
        hand: { x: 72, y: 48 },
        prepare: [9, 10, 11],
        recover: [13, 14, 15, 16],
    },
};
const aerialBeats = [
    {
        start: 0.65,
        contact: 0.85,
        end: 1.15,
        kind: 'jab',
        push: 0.5,
        lift: 0.65,
        camera: { angle: -1.05, height: 1.2, distance: 9.4, roll: -0.045 },
    },
    {
        start: 1.15,
        contact: 1.32,
        end: 1.57,
        kind: 'straight',
        push: 0.6,
        lift: 0.75,
        camera: { angle: -0.25, height: 3.6, distance: 9.6, roll: 0.06 },
    },
    {
        start: 1.57,
        contact: 1.71,
        end: 1.93,
        kind: 'jab',
        push: 0.65,
        lift: 0.9,
        camera: { angle: 0.5, height: -2.1, distance: 9, roll: -0.06 },
    },
    {
        start: 1.93,
        contact: 2.05,
        end: aerialComboEnd,
        kind: 'straight',
        push: 0.75,
        lift: 1,
        camera: { angle: 1.2, height: 0.7, distance: 8.6, roll: 0.04 },
    },
];
function aerialPush(time) {
    return aerialBeats.reduce((distance, beat) => distance + beat.push * ease(progress(time, beat.contact + 0.045, 0.14)), 0);
}
function sampleAerialCombo(assets, time) {
    const index = aerialBeats.findIndex((beat) => time < beat.end - 1e-8);
    const cutIndex = index < 0 ? aerialBeats.length - 1 : index;
    const beat = aerialBeats[cutIndex];
    const punch = aerialPunches[beat.kind];
    const holdStart = beat.contact - 0.02;
    const holdEnd = beat.contact + 0.045;
    const sequence = time < holdStart ? punch.prepare : punch.recover;
    const poseProgress = time < holdStart
        ? progress(time, beat.start, holdStart - beat.start)
        : progress(time, holdEnd, beat.end - holdEnd);
    const poseFrame = time >= holdStart && time < holdEnd
        ? punch.frame
        : sequence[Math.min(sequence.length - 1, Math.floor(poseProgress * sequence.length + 1e-8))];
    const source = assets.hero.punch['south-east'][punch.frame];
    const reference = assets.hero.punch['south-east'][2];
    const bodyHeight = (sprite) => (sprite.bounds?.bottom ?? sprite.image.naturalHeight) -
        (sprite.bounds?.top ?? 0);
    const pixelScale = 2.7 / bodyHeight(reference);
    const right = {
        x: Math.cos(beat.camera.angle),
        z: -Math.sin(beat.camera.angle),
    };
    const contactDistance = (punch.hand.x - source.anchorX) * pixelScale + 0.85;
    const distance = contactDistance +
        0.9 * (1 - ease(progress(time, beat.start, holdStart - beat.start)));
    const push = aerialPush(time);
    // 피격자가 밀린 곳을 늦게 따라잡아, 매 타격 뒤 원위치로 돌아가지 않는다.
    const pursuit = aerialPush(time - 0.065);
    return {
        index: cutIndex,
        beat,
        punch,
        source,
        phase: (poseFrame + 0.5) / 17,
        height: bodyHeight(assets.hero.punch['south-east'][poseFrame]) * pixelScale,
        contactHeight: bodyHeight(source) * pixelScale,
        hero: {
            x: 0.7 + pursuit - right.x * distance,
            y: 8.3 + beat.lift + pursuit * 0.15,
            z: -0.2 - right.z * distance,
        },
        bear: { x: 0.7 + push, y: 8.7 + push * 0.15, z: -0.2 },
        contactPosition: {
            x: 0.7 + push - right.x * contactDistance,
            y: 8.3 + beat.lift + push * 0.15,
            z: -0.2 - right.z * contactDistance,
        },
        reaction: time < beat.contact ? 0.99 : progress(time, beat.contact + 0.045, 0.14),
    };
}
function aerialComboCamera(combo) {
    const target = {
        x: (combo.hero.x + combo.bear.x) / 2,
        y: (combo.hero.y + combo.bear.y) / 2 + 1.9,
        z: (combo.hero.z + combo.bear.z) / 2,
    };
    return orbit(combo.beat.camera.angle, combo.beat.camera.distance, target.y + combo.beat.camera.height, target, combo.beat.camera.roll, 900 + combo.index * 20);
}
function aerialCamera(time, altitude, combo, last) {
    if (time < 0.65)
        return orbit(-0.65, 13.7, 4.1 + altitude * 0.6, {
            x: 0,
            y: 2 + altitude * 0.82,
            z: 0,
        });
    if (time < aerialComboEnd)
        return aerialComboCamera(combo);
    const start = aerialComboCamera(last);
    const end = orbit(0.62, 8.2, 1.25, { x: 0.7, y: 2.2, z: 0 }, 0, 900);
    const settle = ease(progress(time, aerialComboEnd, 0.55));
    // 높이는 배우의 실제 하강을 따라가 마지막 접근 중 화면 밖으로 먼저 내려가지 않는다.
    const descent = clamp((last.hero.y - altitude) / (last.hero.y - 1.85));
    return {
        position: {
            ...mixPoint(start.position, end.position, settle),
            y: lerp(start.position.y, end.position.y, descent),
        },
        target: {
            ...mixPoint(start.target, end.target, settle),
            y: lerp(start.target.y, end.target.y, descent),
        },
        roll: lerp(start.roll ?? 0, 0, settle),
        focal: lerp(start.focal ?? 960, 900, settle),
    };
}
/** 내려찍기 원본 5번의 망치 접촉을 2.9초 지면 충돌에 맞춘다. */
function aerialSlamPhase(time) {
    if (time < aerialFinish.dropStart)
        return lerp(2.1 / 9, 3.5 / 9, progress(time, aerialComboEnd, aerialFinish.dropStart - aerialComboEnd));
    if (time < aerialFinish.contactPose)
        return lerp(3.5 / 9, 4.8 / 9, progress(time, aerialFinish.dropStart, aerialFinish.contactPose - aerialFinish.dropStart));
    if (time < aerialFinish.recoverStart)
        return 5.5 / 9;
    return lerp(6.1 / 9, 8.8 / 9, progress(time, aerialFinish.recoverStart, 0.28));
}
function drawAerialPursuit(context, frame) {
    const time = frame.time;
    const launch = progress(time, 0.28, 0.37);
    const inCombo = time >= aerialBeats[0].start && time < aerialComboEnd;
    const combo = sampleAerialCombo(frame.assets, Math.min(time, aerialComboEnd));
    const lastCombo = sampleAerialCombo(frame.assets, aerialComboEnd);
    const staging = progress(time, aerialComboEnd, aerialFinish.contact - aerialComboEnd);
    // 마지막 추격 위치에서 팔을 장전한 뒤 같은 접촉 시각까지의0.40초에 낙차를 모은다.
    const slam = progress(time, aerialFinish.dropStart, aerialFinish.contact - aerialFinish.dropStart);
    const altitude = time < 0.65
        ? ease(launch) * 8.3
        : time < aerialComboEnd
            ? 8.3
            : time < aerialFinish.contact
                ? lerp(lastCombo.hero.y, 1.85, slam * slam)
                : time < 3
                    ? 1.85
                    : lerp(1.85, 0, ease(progress(time, 3, 0.28)));
    const camera = aerialCamera(time, altitude, combo, lastCombo);
    const smear = time >= aerialFinish.dropStart && time < aerialFinish.contact
        ? slam * 0.75
        : 0;
    const scene = smear > 0.001
        ? blurredArena(context, frame, camera, smear, 'vertical')
        : sceneFor(context, frame, camera, Math.min(time, aerialFinish.contact));
    const bearAltitude = time < 0.65
        ? ease(progress(time, 0.29, 0.36)) * 8.7
        : time < aerialComboEnd
            ? combo.bear.y
            : lastCombo.bear.y * (1 - slam * slam);
    const bearPosition = inCombo
        ? combo.bear
        : {
            x: time < 0.65
                ? lerp(0.65, 0.7, launch)
                : lerp(lastCombo.bear.x, 1.25, ease(staging)),
            y: bearAltitude,
            z: -0.2,
        };
    const heroPosition = time < 0.65
        ? {
            x: lerp(-2.2, -0.9, ease(progress(time, 0, 0.28))),
            y: altitude,
            z: 0.4,
        }
        : time < aerialComboEnd
            ? combo.hero
            : {
                x: lerp(lastCombo.hero.x, -0.25, ease(staging)),
                y: altitude,
                z: lerp(lastCombo.hero.z, 0.5, ease(staging)),
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
        : time < aerialComboEnd
            ? 'punch'
            : time < 3.3
                ? 'slam'
                : 'idle';
    const heroPhase = time < 0.65
        ? uppercutPhase
        : time < aerialComboEnd
            ? combo.phase
            : aerialSlamPhase(time);
    scene.bear(frame.assets, bearPosition, time < 0.28 ? 'stand' : time < 3.06 ? 'hit' : 'defeat', time >= 3.06
        ? progress(time, 3.06, 0.62)
        : inCombo
            ? combo.reaction
            : time >= aerialFinish.contact
                ? progress(time, aerialFinish.contact, 0.16)
                : progress(time, 0.28, 0.37), { height: 4.2, rotation: camera.roll });
    scene.hero(frame.assets, heroPosition, heroAction, heroPhase, {
        height: inCombo ? combo.height : 2.7,
        facing: strikeFacing(camera, heroPosition),
        rotation: camera.roll,
    });
    scene.render();
    frame.surfaces.stage.foreground(context, 'arena', camera, time, {
        focus: camera.target,
    });
    if (inCombo) {
        contactFist(context, spritePoint(scene, heroPosition, combo.source, {
            height: combo.contactHeight,
            pixel: combo.punch.hand,
            rotation: camera.roll,
        }), progress(time, combo.beat.contact - 0.04, 0.07), camera.roll ?? 0, 44);
        const hit = spritePoint(scene, combo.contactPosition, combo.source, {
            height: combo.contactHeight,
            pixel: combo.punch.hand,
            rotation: camera.roll,
        });
        if (hit && time >= combo.beat.contact)
            gameImpact(context, frame.assets.effects, {
                ...hit,
                progress: (time - combo.beat.contact) / 0.18,
                size: 156 + combo.index * 16,
                angle: camera.roll,
            });
    }
    else if (time >= 0.28 && time < 0.47) {
        const hit = spritePoint(scene, heroPosition, frame.assets.hero.uppercut['south-east'][2], { height: 2.7, pixel: { x: 62, y: 34 }, rotation: camera.roll });
        if (hit)
            gameImpact(context, frame.assets.effects, {
                ...hit,
                progress: progress(time, 0.28, 0.19),
                size: 270,
                angle: -1.15,
            });
    }
    else if (time >= aerialFinish.contact && time < 3.45) {
        const hit = spritePoint(scene, { x: -0.25, y: 1.85, z: 0.5 }, frame.assets.hero.slam['south-east'][5], {
            height: 2.7,
            pixel: { x: 64, y: 69 },
            rotation: camera.roll,
        });
        if (hit)
            gameImpact(context, frame.assets.effects, {
                ...hit,
                progress: progress(time, aerialFinish.contact, 0.32),
                size: 460,
                angle: 1.2,
            });
    }
    if (time >= 3.28) {
        const ground = scene.project({ x: -0.25, y: 0, z: 0.5 });
        if (ground)
            gameDust(context, frame.assets.effects, {
                ...ground,
                progress: (time - 3.28) / 0.5,
                size: 330,
            });
    }
    if (smear > 0.001)
        speedLines(context, time, slam * 0.85, true);
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
        : sceneFor(context, frame, camera, worldTime);
    const { hero, counter } = counterActors(scene, frame.assets, time, camera);
    scene.render();
    frame.surfaces.stage.foreground(context, 'arena', camera, time, {
        focus: camera.target,
    });
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
            gameImpact(context, frame.assets.effects, {
                ...hit,
                progress: progress(time, counterCut.contact, 0.3),
                size: 380,
                angle: camera.roll,
            });
    }
}
export const arenaCuts = [
    {
        id: 'already-cut',
        title: '이미 때렸다',
        kind: '3D',
        duration: 3.9,
        description: '게임의 숲 전투 공터를 가속해 한 바퀴 돌고, 세 코마와 여섯 잔상으로 관통한다. 주먹을 거둔 정적 뒤 지연 타격과 함께 팔을 풀고, 어깨를 편 잔심을 남긴다.',
        beats: [
            { time: 0, label: '가속 360°' },
            { time: 1.35, label: '1코마 × 3 · 잔상' },
            { time: 2.1, label: '등 뒤 정적' },
            { time: 2.7, label: '팔 풀기 · 8겹 지연 타격' },
            { time: 3.1, label: '어깨를 편 잔심' },
            { time: 3.54, label: '쓰러짐 완료 · 정지' },
        ],
        draw: drawAlreadyCut,
    },
    {
        id: 'aerial-pursuit',
        title: '공중 추격 연타',
        kind: '3D',
        duration: 4.2,
        description: '어퍼컷으로 띄운 뒤 잽과 정권을 번갈아 네 번 추격한다. 0.50→0.42→0.36→0.32초로 박자를 좁히고, 마지막 추격 위치에서 장전한 뒤0.40초 급강하로 내려찍는다. 네 구도에서 두 배우를 계속 보여준다.',
        beats: [
            { time: 0.28, label: '어퍼컷 접촉' },
            ...aerialBeats.map((beat, index) => ({
                time: beat.contact,
                label: `공중 ${index + 1}타 · ${beat.kind === 'jab' ? '잽' : '정권'}`,
            })),
            { time: aerialComboEnd, label: '마지막 추격 · 내려찍기 장전' },
            { time: aerialFinish.dropStart, label: '0.40초 급강하 시작' },
            { time: aerialFinish.contact, label: '원본 5번 · 지면 접촉' },
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
