import { createCircusFlightShots, circusTiming, sampleCircusTarget, } from '../meteor-circus-flight.js';
const guardMotion = 'fight-stance-idle-8-frames-south-east';
const punchMotion = 'ataho-one-two-punch-south-east-south-east';
function createMeteorFinisher(options) {
    const circus = options.flight === 'circus';
    const steps = [];
    const shots = [];
    const hits = [];
    const beats = [];
    let elapsedMs = 0;
    function pose(motion, frame, durationMs, phase, emphasis) {
        steps.push({
            motion,
            frame,
            durationMs,
            phase,
            emphasis,
            x: 0,
            y: 0,
            anchor: 'feet',
        });
        elapsedMs += durationMs;
    }
    function beat(label, emphasis, fromStep) {
        beats.push({ label, emphasis, fromStep, toStep: steps.length - 1 });
    }
    function meteor(index) {
        const id = `meteor-${index + 1}`;
        const launchMs = elapsedMs;
        const arriveMs = launchMs + 340 - (index % 4) * 8;
        const from = {
            x: index % 2 === 0 ? 27 : 23,
            y: index % 2 === 0 ? -37 : -33,
        };
        // 첫 탄으로 정한 표적 중심에 후속 탄은 좁은 세로 띠로 도착한다.
        const to = {
            x: index === 0 ? 150 : 164 + ((index % 3) - 1) * 2,
            y: -38 + ((index % 5) - 2) * 4,
        };
        shots.push({
            id,
            launchMs,
            arriveMs,
            from,
            to,
            // 출발·도착은 고정하고 중간 비행만 넓게 교차시켜 유성우의 층을 만든다.
            curveY: (((index * 5) % 9) - 4) * 6.5,
            radius: 1.65,
        });
        hits.push({
            id,
            shotId: id,
            atMs: arriveMs,
            durationMs: index === 31 ? 160 : 105,
            point: to,
            radius: 6,
            strength: index === 31 ? 0.52 : 0.2,
            reaction: 'horizontal',
        });
    }
    function oneTwo(cycle, accelerated) {
        const durations = accelerated
            ? [9, 8, 13, 6, 9, 8, 13, 6]
            : [12, 12, 18, 8, 12, 12, 18, 8];
        const frames = [0, 1, 2, 3, 4, 11, 12, 13];
        for (const [index, frame] of frames.entries()) {
            const number = cycle * 2 + (frame < 4 ? 1 : 2);
            if (frame === 2)
                meteor(cycle * 2);
            if (frame === 12)
                meteor(cycle * 2 + 1);
            pose(punchMotion, frame, durations[index], `유성권 ${number}탄 · ${frame === 2 || frame === 12 ? '주먹에서 광탄 분리' : '양주먹 연속 회전'}`);
        }
    }
    pose(guardMotion, 0, 150, '성좌 · 발을 고정하고 호흡 모으기');
    pose(punchMotion, 0, 220, '성좌 · 양주먹에 별빛 모으기');
    pose(punchMotion, 11, 260, '성좌 · 권기 응축', 'charge');
    pose(punchMotion, 1, 70, '성좌 · 첫 주먹 방출 직전');
    beat('성좌 · 별빛을 양주먹에', 'intro', 0);
    const releaseMs = elapsedMs;
    const rushFrom = steps.length;
    for (let cycle = 0; cycle < 12; cycle++)
        oneTwo(cycle, false);
    beat('유성 · 초고속 양주먹', 'rush', rushFrom);
    const climaxFrom = steps.length;
    for (let cycle = 12; cycle < 16; cycle++)
        oneTwo(cycle, true);
    pose(punchMotion, 13, 100, '폭우 · 마지막 광탄을 보내고 팔 회수');
    pose(punchMotion, 15, 100, '폭우 · 멀리 도달하는 유성의 꼬리');
    if (circus) {
        const flightShots = createCircusFlightShots(shots.map((shot) => shot.launchMs));
        for (const [index, flight] of flightShots.entries()) {
            const target = sampleCircusTarget(flight.arriveMs);
            const point = { x: target.x, y: -target.y };
            shots[index] = {
                ...shots[index],
                arriveMs: flight.arriveMs,
                to: point,
                curveY: undefined,
                circusFlight: flight,
            };
            hits[index] = { ...hits[index], atMs: flight.arriveMs, point };
        }
    }
    const lastHitMs = Math.max(...hits.map((hit) => hit.atMs));
    pose(guardMotion, 0, (circus ? circusTiming.endMs - 480 : lastHitMs + 140) - elapsedMs, '폭우 · 마지막 원거리 명중');
    beat('폭우 · 더 촘촘해지는 유성', 'climax', climaxFrom);
    const finishFrom = steps.length;
    pose(guardMotion, 0, 200, '정 · 별빛 소멸과 가드');
    pose(guardMotion, 1, 140, '정 · 흔들리지 않는 발');
    pose(guardMotion, 0, 140, '정 · 호흡 정착');
    beat('정 · 별빛이 사라진 자리', 'finish', finishFrom);
    return {
        id: circus ? 'finisher-pegasus-meteor-circus' : 'finisher-pegasus-meteor',
        title: circus
            ? '페가수스 유성권 · 이타노 서커스 추격 · 32타'
            : '페가수스 유성권 · 32타',
        variant: {
            groupId: 'finisher-pegasus-meteor',
            groupTitle: '페가수스 유성권 · 32타',
            label: circus ? '이타노 서커스 · 추격' : '기본',
        },
        summary: circus
            ? '덤불박쥐가 앞뒤로 세 차례 왕복하고 탄무리를 두 바퀴 돌아 피한다. 선회할 때 카메라도 뒤옆으로 따라 돌고, 끝까지 도주하는 박쥐를 광탄이 가속해 여러 방향에서 따라잡는다.'
            : '성좌처럼 모은 별빛을 양주먹의 초고속 연타로 풀어, 제자리에서 서른두 광탄을 먼 대상까지 보낸다.',
        priority: 'review',
        review: (circus
            ? '기존 덤불박쥐의 비행·피격·쓰러짐 그림을 재사용한 추격 안무 시안이다. 광탄과 표적을 공간 좌표에서 샘플하고 추격 카메라로 투영한다. 경로는 정해진 장면 안무이며 본게임의 실시간 유도나 회피 판정이 아니다. '
            : '') +
            '페가수스 유성권에서 영감을 얻은 원거리 권격 시안이다. 기존 남동 원투 그림을 제자리에서 빠르게 잇고, 후반 여덟 발의 간격을 더 좁힌다. 몸의 접촉은 없고 서른두 광탄의 실제 비행과 도착이 같은 KiShot·KiHit 시각을 공유한다. 성좌와 가는 광탄은 Canvas에서 그리며 원작의 전용 자세·정확한 타수·프레임을 재현했다고 주장하지 않는다.',
        missingPose: '전용 성좌 준비 자세와 초고속 양주먹 그림은 없어 기존 원투를 사용한다. 새 그림·좌우 반전·몸 비율 변형은 추가하지 않는다.',
        steps,
        finisher: {
            theme: 'meteor',
            subtitle: circus
                ? '발사 · 세 차례 왕복 회피 · 두 바퀴 선회 · 재추격'
                : '성좌의 응축 · 초고속 양주먹 · 32개의 원거리 유성',
            accent: '#87dfff',
            endGlyph: '星',
            beats,
        },
        ki: {
            style: 'meteor',
            accent: '#87dfff',
            chargeStartMs: 150,
            releaseMs,
            endMs: elapsedMs,
            origin: { x: 25, y: -35 },
            target: { x: 164, y: -38 },
            shots,
            hits: hits.sort((a, b) => a.atMs - b.atMs),
        },
    };
}
export const meteorFinishers = [
    createMeteorFinisher({ flight: 'base' }),
    createMeteorFinisher({ flight: 'circus' }),
];
