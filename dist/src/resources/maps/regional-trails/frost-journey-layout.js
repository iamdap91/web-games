const stream = { minX: -22, maxX: 19, minZ: 12.2, maxZ: 15.8 };
const lake = { minX: 9.5, maxX: 22.2, minZ: -27, maxZ: -13.5 };
const bridge = { minX: -7.4, maxX: -2.6, minZ: 11.8, maxZ: 16.2 };
/** 풍경의 높이는 모형으로 만들고, 보행은 같은 눈길 위에서 이어진다. */
export const frostJourneyPlaces = {
    entrance: { x: -6, z: 28 },
    pinewoods: { x: -6, z: 26.5 },
    bridge: { center: { x: -5, z: 14 }, area: bridge },
    fork: { x: -3, z: 7 },
    cabin: { model: { x: -15.4, z: 2 }, visit: { x: -11, z: 2 } },
    cairn: { model: { x: 12.6, z: 3 }, visit: { x: 9, z: 3 } },
    returnPass: { x: -2, z: 0 },
    merge: { x: 0, z: -6 },
    ridge: { x: -11, z: -13 },
    valley: { x: 8, z: -13 },
    lookout: { x: 4, z: -22 },
    battlePass: { model: { x: 0, z: -31.5 }, visit: { x: 0, z: -30.5 } },
    stream,
    lake,
};
export const frostJourneySurface = { waters: [stream, lake], bridges: [bridge] };
export const frostJourneyDefinition = {
    name: '백서리 능선 이어걷기',
    description: '눈솔숲과 계류석교를 지나 산장과 돌탑을 돌아보고, 능선이나 낮은 골짜기를 골라 빙호 너머 곰전장 입구로 향하는 설산길.',
    start: frostJourneyPlaces.entrance,
    areas: [
        { minX: -8.7, maxX: -3.3, minZ: 25, maxZ: 31 },
        { minX: -5.4, maxX: -0.6, minZ: 4.5, maxZ: 9.2 },
        { minX: -13.5, maxX: -8.8, minZ: -0.5, maxZ: 4.6 },
        { minX: 6.5, maxX: 11.4, minZ: 0.5, maxZ: 5.5 },
        { minX: -13.4, maxX: -8.7, minZ: -15.4, maxZ: -10.6 },
        { minX: 5.7, maxX: 10.3, minZ: -15.3, maxZ: -10.7 },
        { minX: 1.7, maxX: 6.4, minZ: -24.2, maxZ: -19.7 },
        { minX: -2.6, maxX: 2.6, minZ: -32.8, maxZ: -28.1 },
    ],
    paths: [
        {
            width: 3.8,
            points: [
                { x: -6, z: 28 },
                { x: -9, z: 23 },
                { x: -6.5, z: 18 },
                { x: -5, z: 16.8 },
                { x: -5, z: 11.2 },
                { x: -3, z: 7 },
            ],
        },
        {
            width: 3.6,
            points: [
                { x: -3, z: 7 },
                { x: -10, z: 7 },
                { x: -11, z: 2 },
                { x: -9, z: -5 },
                { x: 0, z: -6 },
            ],
        },
        {
            width: 3.6,
            points: [
                { x: -3, z: 7 },
                { x: 4, z: 8 },
                { x: 9, z: 3 },
                { x: 12, z: -3 },
                { x: 0, z: -6 },
            ],
        },
        {
            width: 3.4,
            points: [
                { x: 0, z: -6 },
                { x: -2, z: 0 },
                { x: -3, z: 7 },
            ],
        },
        {
            width: 3.6,
            points: [
                { x: 0, z: -6 },
                { x: -7, z: -9 },
                { x: -11, z: -13 },
                { x: -8, z: -20 },
                { x: 4, z: -22 },
            ],
        },
        {
            width: 3.8,
            points: [
                { x: 0, z: -6 },
                { x: 7, z: -8 },
                { x: 8, z: -13 },
                { x: 5, z: -18 },
                { x: 4, z: -22 },
            ],
        },
        {
            width: 3.8,
            points: [
                { x: 4, z: -22 },
                { x: 2, z: -25 },
                { x: 0, z: -30.5 },
            ],
        },
    ],
    landmarks: [
        {
            id: 'pinewoods',
            name: '남쪽 눈솔숲',
            position: frostJourneyPlaces.pinewoods,
            description: '눈을 얹은 소나무가 바람을 막아 주는 안전한 입구. 숲의 굽이를 따라가면 낮은 계류석교가 나타난다.',
            kind: 'view',
        },
        {
            id: 'stone-bridge',
            name: '서리 계류석교',
            position: frostJourneyPlaces.bridge.center,
            description: '눈 덮인 돌 난간 아래로 얼음빛 계류가 흐른다. 다리 건너 산장과 돌탑으로 길이 갈라진다.',
            kind: 'view',
        },
        {
            id: 'cabin',
            name: '바람막이 산장',
            position: frostJourneyPlaces.cabin.visit,
            description: '눈을 이고 선 통나무 산장. 처마 아래 장작과 작은 창이 남아 있고, 뒤쪽 눈길은 두 갈래의 합류점으로 이어진다.',
            kind: 'view',
        },
        {
            id: 'cairn',
            name: '눈덮인 돌탑',
            position: frostJourneyPlaces.cairn.visit,
            description: '소나무가 성긴 동쪽 길에서 작은 돌탑이 길을 알린다. 돌탑을 돌아가도 산장길과 같은 능선 아래에서 만난다.',
            kind: 'view',
        },
        {
            id: 'return-pass',
            name: '솔숲 귀환샛길',
            position: frostJourneyPlaces.returnPass,
            description: '산장과 돌탑 사이를 곧장 잇는 좁은 눈길. 돌아갈 때는 긴 우회로 대신 이 샛길로 계류석교에 닿을 수 있다.',
            kind: 'view',
        },
        {
            id: 'ridge',
            name: '바람부는 능선',
            position: frostJourneyPlaces.ridge,
            description: '켜켜이 선 눈바위와 낡은 바람막이 사이로 능선이 열린다. 바위 뒤를 따라가면 빙호 전망에서 골짜기길과 다시 만난다.',
            kind: 'view',
        },
        {
            id: 'valley',
            name: '낮은 눈골짜기',
            position: frostJourneyPlaces.valley,
            description: '낮은 눈더미와 드러난 뿌리가 이어지는 조용한 골짜기. 높은 바위 능선을 돌아가지 않고 빙호 쪽으로 내려간다.',
            kind: 'view',
        },
        {
            id: 'lake',
            name: '푸른 빙호전망',
            position: frostJourneyPlaces.lookout,
            description: '짧은 난간 너머 푸른 빙호가 펼쳐진다. 능선과 골짜기의 두 길은 여기서 합쳐져 북쪽 곰전장 입구로 향한다.',
            kind: 'view',
        },
        {
            id: 'battle',
            name: '백서리 곰전장 입구',
            position: frostJourneyPlaces.battlePass.visit,
            description: '갈라진 석주 사이 눈 위에 큰 발자국이 남아 있다. 빙호를 지나 이어 온 길 끝에서 곰의 전장을 바라본다.',
            kind: 'battle',
        },
    ],
    ground: 'snow',
    sky: 0xd0dfe2,
    shade: 0x829eaa,
    sun: 0xffedcf,
    camera: { x: 0, y: 50, z: 66, targetX: 0, targetZ: -1, span: 46 },
};
export function frostJourneyZone(point) {
    if (point.z >= 18)
        return { id: 'pinewoods', name: '남쪽 눈솔숲' };
    if (point.z >= 10)
        return { id: 'stream', name: '얼어붙은 계류' };
    if (point.z > -6.5)
        return { id: 'shelters', name: '산장과 돌탑 갈림길' };
    if (point.z > -19)
        return point.x < -2
            ? { id: 'ridge', name: '바람부는 눈바위 능선' }
            : { id: 'valley', name: '낮은 눈골짜기' };
    if (point.z > -27)
        return { id: 'lake', name: '푸른 빙호 전망' };
    return { id: 'pass', name: '북쪽 곰전장 입구' };
}
