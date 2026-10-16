import { comboMotions } from './motions.js';
import { movementPrimitives } from './motions/movement-primitives.js';
import { standaloneAttacks } from './motions/standalone-attacks.js';
import { cinematicFinishers } from './motions/cinematic-finishers.js';
import { classicFinishers } from './motions/classic-finishers.js';
import { kiMotions } from './motions/ki-motions.js';
import { motionOptionId } from './motion-options.js';
const attackIds = new Set([
    'rush',
    'flying-kick',
    'slide-sweep',
    'cheolsango',
    'ground-spin',
    'elbow-chop',
    'quick-jab',
    'double-jab',
    'charged-uppercut',
    'new-horizontal-elbow',
    'new-smear-hook',
    'new-smear-hammerfist',
]);
const deferredIds = new Set([
    'new-double-palm',
    'new-front-push-kick',
    'new-visible-low-sweep',
]);
// 제작 당시 번호 대신 화면에 남길 동작의 역할과 고정된 ID로 분류한다.
export const motionSections = [
    {
        id: 'attack',
        label: '공격',
        motions: [
            ...comboMotions.filter((motion) => attackIds.has(motionOptionId(motion))),
            ...standaloneAttacks,
        ],
    },
    {
        id: 'ki',
        label: '기공',
        motions: kiMotions,
    },
    {
        id: 'finisher',
        label: '필살기',
        motions: [...cinematicFinishers, ...classicFinishers],
    },
    { id: 'movement', label: '이동·회피', motions: movementPrimitives },
    {
        id: 'support',
        label: '보조',
        motions: comboMotions.filter((motion) => motion.id === 'drink-guard'),
    },
    {
        id: 'deferred',
        label: '보류',
        motions: comboMotions
            .filter((motion) => deferredIds.has(motionOptionId(motion)))
            .map((motion) => ({
            ...motion,
            priority: 'experimental',
            review: `공격 모션으로 부적합하다는 사용자 판단으로 보류했다. 필살기 조합에서는 사용하지 않는다. 기존 원본·방향·연출은 비교를 위해 보존한다. ${motion.review}`,
        })),
    },
];
export const activeMotions = motionSections.flatMap((section) => section.motions);
