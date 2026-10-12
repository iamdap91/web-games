import { firstExpeditionReward } from './first-expedition.js';
export const trailRules = {
    walkSpeed: 6.2,
    interactionDistance: 2.4,
    exitInteractionDistance: 1.6,
    inspectSeconds: 0.75,
    openingSeconds: 0.65,
};
export const firstTrailLayout = {
    expedition: 'first',
    title: '마을 앞 산길',
    objective: '길목의 슬라임을 물리치고 마을로 돌아가기',
    spawn: { x: 0, z: -3.5 },
    entrance: { x: 0, z: -5.4 },
    routes: [
        {
            points: [
                { x: 0, z: -6 },
                { x: -0.8, z: 3 },
                { x: 0.5, z: 7 },
            ],
            halfWidth: 2.2,
        },
        {
            points: [
                { x: -0.6, z: 1 },
                { x: -4.5, z: 1 },
                { x: -5, z: 3.5 },
            ],
            halfWidth: 1.3,
        },
    ],
    clearings: [{ x: -5, z: 3.5, radius: 1.8 }],
    obstacles: [],
    encounters: [
        {
            id: 'first-expedition',
            x: -0.8,
            z: 3,
            kind: 'slime',
            label: '길목의 슬라임',
            radius: 0.65,
            required: true,
        },
    ],
    gates: [
        {
            from: { x: -3, z: 3 },
            to: { x: 1.4, z: 3 },
            encounter: 'first-expedition',
        },
    ],
    caches: [
        {
            id: 'woodcutters-mark',
            x: -5,
            z: 3.5,
            label: '옛 벌목꾼의 보따리',
            message: '낡은 도끼 자국 옆에 쓸 만한 목재가 남아 있다.',
            reward: { wood: 1, stone: 0 },
            requires: 'first-expedition',
        },
    ],
};
export const secondTrailLayout = {
    expedition: 'second',
    title: '솔바람 능선',
    objective: '능선을 지키는 예티 물리치기',
    spawn: { x: 0, z: -3.5 },
    entrance: { x: 0, z: -5.4 },
    routes: [
        {
            points: [
                { x: 0, z: -6 },
                { x: 0, z: -1 },
                { x: -5, z: 3 },
                { x: -7, z: 10 },
                { x: -5, z: 14 },
                { x: 0, z: 18 },
                { x: 0, z: 22 },
            ],
            halfWidth: 2,
        },
        {
            points: [
                { x: 0, z: -1 },
                { x: 6, z: 2 },
                { x: 9, z: 8 },
                { x: 6, z: 13 },
                { x: 0, z: 18 },
            ],
            halfWidth: 1.65,
        },
        {
            points: [
                { x: 0, z: 18 },
                { x: -3, z: 15 },
                { x: -3, z: 3 },
                { x: 0, z: -1 },
            ],
            halfWidth: 1.25,
            shortcut: true,
        },
    ],
    clearings: [
        { x: 0, z: -1, radius: 2.8 },
        { x: 6, z: 13, radius: 2.6 },
        { x: 0, z: 18, radius: 3.2 },
    ],
    obstacles: [{ x: 0, z: 9, radius: 2.3, kind: 'rock' }],
    encounters: [
        {
            id: 'trail-1',
            x: -6,
            z: 7,
            kind: 'slime',
            label: '채석길의 슬라임',
            radius: 0.65,
            required: false,
            reward: { wood: 0, stone: 2 },
        },
        {
            id: 'trail-boss',
            x: 0,
            z: 18,
            kind: 'yeti',
            label: '능선을 지키는 예티',
            radius: 1,
            required: true,
        },
    ],
    gates: [],
    caches: [
        {
            id: 'ridge-tools',
            x: 7.2,
            z: 12.5,
            label: '낡은 채석 도구',
            message: '능선 바위 아래에서 채석꾼이 남긴 돌을 찾았다.',
            reward: { wood: 0, stone: 1 },
        },
    ],
    shortcut: {
        x: -2.4,
        z: 17.4,
        label: '옛 운반길',
        kind: 'log',
        requires: 'trail-boss',
    },
};
export const ridgeBoulderRoute = {
    start: { x: 6, z: 13 },
    ends: { south: { x: -1, z: 19.5 }, east: { x: 9, z: 13 } },
    damage: 40,
    enemyId: 2,
};
export const secondExpeditionReward = { wood: 6, stone: 4 };
export const thirdTrailLayout = {
    expedition: 'third',
    title: '호랑바람 고개',
    objective: '숲늑대 무리를 돌파하고 갑옷 멧돼지 물리치기',
    spawn: { x: 0, z: -3.5 },
    entrance: { x: 0, z: -5.4 },
    routes: [
        {
            points: [
                { x: 0, z: -6 },
                { x: 0, z: 2 },
                { x: 0, z: 7 },
            ],
            halfWidth: 2.2,
        },
        {
            points: [
                { x: 0, z: 7 },
                { x: -6, z: 10 },
                { x: -7, z: 15 },
                { x: -3, z: 18 },
            ],
            halfWidth: 1.8,
        },
        {
            points: [
                { x: 0, z: 7 },
                { x: 6, z: 8 },
                { x: 8, z: 13 },
                { x: 4, z: 17 },
                { x: -3, z: 18 },
            ],
            halfWidth: 1.6,
        },
        {
            points: [
                { x: -3, z: 18 },
                { x: -3, z: 5 },
                { x: 0, z: -5.4 },
            ],
            halfWidth: 1.1,
            shortcut: true,
        },
    ],
    clearings: [
        { x: 0, z: 7, radius: 3.5 },
        { x: 8, z: 13, radius: 2.5 },
        { x: -3, z: 18, radius: 3.5 },
    ],
    obstacles: [{ x: 2, z: 12, radius: 1.8, kind: 'tree' }],
    gates: [
        { from: { x: -2.2, z: 2 }, to: { x: 2.2, z: 2 }, encounter: 'drive-pack' },
    ],
    encounters: [
        {
            id: 'drive-pack',
            x: 0,
            z: 2,
            kind: 'wolf',
            label: '숲늑대 무리',
            radius: 0.75,
            required: true,
        },
        {
            id: 'drive-boss',
            x: -3,
            z: 18,
            kind: 'boar',
            label: '갑옷 멧돼지',
            radius: 1.2,
            required: true,
            requires: 'drive-pack',
        },
        {
            id: 'trail-1',
            x: 8,
            z: 13,
            kind: 'slime',
            label: '짐수레 주변의 슬라임',
            radius: 0.65,
            required: false,
            requires: 'drive-pack',
            reward: { wood: 2, stone: 2 },
        },
    ],
    caches: [
        {
            id: 'lost-cart',
            x: 8,
            z: 14.7,
            label: '버려진 짐수레',
            message: '무너진 짐수레에서 쓸 만한 자재를 골랐다.',
            reward: { wood: 2, stone: 1 },
            requires: 'trail-1',
        },
    ],
    shortcut: {
        x: -3,
        z: 16,
        label: '고개 뒤 운반길',
        kind: 'log',
        requires: 'drive-boss',
    },
};
export const fourthTrailLayout = {
    expedition: 'fourth',
    title: '버섯숲',
    objective: '고목 너머의 버섯 정령 무리 물리치기',
    spawn: { x: 0, z: -3.5 },
    entrance: { x: 0, z: -5.4 },
    routes: [
        {
            points: [
                { x: 0, z: -6 },
                { x: 0, z: -1 },
            ],
            halfWidth: 2.1,
        },
        {
            points: [
                { x: 0, z: -1 },
                { x: -6, z: 3 },
                { x: -7, z: 10 },
                { x: -4, z: 15 },
                { x: 1, z: 17 },
            ],
            halfWidth: 1.8,
        },
        {
            points: [
                { x: 1, z: 17 },
                { x: 7, z: 14 },
                { x: 8, z: 8 },
                { x: 6, z: 2 },
                { x: 0, z: -1 },
            ],
            halfWidth: 1.8,
        },
        {
            points: [
                { x: 7.4, z: 12 },
                { x: 3, z: 12 },
                { x: 3, z: 6.3 },
            ],
            halfWidth: 1.3,
        },
        {
            points: [
                { x: 3, z: 6.3 },
                { x: 3, z: 2 },
            ],
            halfWidth: 1.3,
            shortcut: true,
        },
        {
            points: [
                { x: 3, z: 2 },
                { x: 0, z: -1 },
            ],
            halfWidth: 1.3,
        },
    ],
    clearings: [
        { x: 0, z: -1, radius: 2.7 },
        { x: -7, z: 10, radius: 2.5 },
        { x: 6.7, z: 12.5, radius: 2.6 },
        { x: 1, z: 17, radius: 3.3 },
    ],
    obstacles: [{ x: -0.5, z: 8, radius: 2.4, kind: 'tree' }],
    encounters: [
        {
            id: 'mushroom-grove',
            x: 1,
            z: 17,
            kind: 'mushroom',
            label: '슬라임과 버섯 정령',
            radius: 1.55,
            required: true,
        },
    ],
    gates: [],
    caches: [
        {
            id: 'forest-pouch',
            x: -8,
            z: 10,
            label: '고목 옆 작은 자루',
            message: '버섯이 자란 고목 옆에서 옛 채집꾼의 물품을 찾았다.',
            reward: { wood: 1, stone: 2 },
        },
    ],
    shortcut: {
        x: 3,
        z: 4.4,
        label: '덩굴에 가린 샛길',
        kind: 'vine',
        requires: 'mushroom-grove',
    },
};
export const expeditionLayouts = {
    first: firstTrailLayout,
    second: secondTrailLayout,
    third: thirdTrailLayout,
    fourth: fourthTrailLayout,
};
const completionRewards = {
    first: firstExpeditionReward,
    second: secondExpeditionReward,
    third: { wood: 10, stone: 8 },
    fourth: { wood: 8, stone: 6 },
};
const repeatRewards = {
    first: { wood: 3, stone: 2 },
    second: { wood: 4, stone: 5 },
    third: { wood: 7, stone: 6 },
    fourth: { wood: 5, stone: 4 },
};
export function expeditionReward(id, replay) {
    return { ...(replay ? repeatRewards : completionRewards)[id] };
}
export function expeditionStatus(state, id) {
    return id === 'first'
        ? state.expedition
        : id === 'second'
            ? state.secondExpedition
            : id === 'third'
                ? state.thirdExpedition
                : state.fourthExpedition;
}
export function expeditionPurpose(id) {
    return {
        first: '짧은 수련 · 목재 확보',
        second: '예티의 강공격에 대응 · 돌 확보',
        third: '오버드라이브 실전 · 많은 자원 확보',
        fourth: '회복하는 버섯 정령 공략',
    }[id];
}
export function trailDistance(a, b) {
    return Math.hypot(a.x - b.x, a.z - b.z);
}
