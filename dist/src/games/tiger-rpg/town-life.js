import { clearing } from '../../prototypes/land-clearing/clearing-rules.js';
import { townLifeLayout, townLifeInteractionDistance, } from '../../resources/props/town-life/town-life-layout.js';
export const townRepairIds = ['path'];
export function parseTownRepairs(value) {
    const record = typeof value === 'object' && value !== null ? value : {};
    return {
        path: 'path' in record && record.path === true,
    };
}
export function isTownRepairId(value) {
    return value === 'path';
}
export const townLifeTiming = {
    clear: { contact: 0.3, duration: 0.65 },
    chop: { contact: 0.45, duration: 0.9 },
    stoke: { contact: 1.02, duration: 1.65 },
    sit: 0.45,
    meal: 2.85,
    leave: 0.45,
    warmth: 45,
};
/** 생활 행동·일반 공격의 시간과 접촉을 소유한다. 영구 저장은 완료 이벤트를 받은 GameProgress가 담당한다. */
export class TownLife {
    repairs;
    action = null;
    splitWood = false;
    warmth = 0;
    mealRemaining = 1;
    constructor(repairs) {
        this.repairs = parseTownRepairs(repairs);
    }
    get snapshot() {
        return {
            repairs: { ...this.repairs },
            action: this.action
                ? { ...this.action, origin: { ...this.action.origin } }
                : null,
            splitWood: this.splitWood,
            warmth: this.warmth,
            mealRemaining: this.mealRemaining,
        };
    }
    nearby(point, kitchenLevel) {
        let nearest = null;
        let distance = townLifeLayout.interactionRadius;
        for (const id of ['path', 'chop', 'fire', 'table']) {
            if ((id === 'path' && this.repairs.path) ||
                ((id === 'fire' || id === 'table' || id === 'chop') && kitchenLevel < 1))
                continue;
            const next = townLifeInteractionDistance(id, point);
            if (next < distance) {
                nearest = id;
                distance = next;
            }
        }
        return nearest;
    }
    label(target) {
        if (this.action)
            return this.canLeave ? 'Space · 일어나기' : '잠시 기다려 주세요';
        if (target === 'path')
            return 'Space · 돌무더기 치우기';
        if (target === 'chop')
            return this.splitWood
                ? '쪼갠 장작을 화덕에 넣어 보세요'
                : 'Space · 장작 패기';
        if (target === 'fire')
            return this.splitWood ? 'Space · 장작 넣기' : '먼저 옆에서 장작을 패세요';
        return 'Space · 앉아서 먹기';
    }
    start(target, point, kitchenLevel) {
        if (this.action || this.nearby(point, kitchenLevel) !== target)
            return false;
        if ((target === 'chop' && this.splitWood) ||
            (target === 'fire' && !this.splitWood))
            return false;
        const kind = target === 'path'
            ? 'clear'
            : target === 'fire'
                ? 'stoke'
                : target === 'table'
                    ? 'meal'
                    : 'chop';
        this.action = {
            kind,
            elapsed: 0,
            origin: { x: point.x, z: point.z },
            leaving: null,
        };
        if (kind === 'meal')
            this.mealRemaining = 1;
        return true;
    }
    attack(point, facing) {
        if (this.action)
            return false;
        this.action = {
            kind: 'attack',
            elapsed: 0,
            origin: { x: point.x, z: point.z },
            facing,
            leaving: null,
        };
        return true;
    }
    get canLeave() {
        return (!!this.action &&
            this.action.leaving === null &&
            this.action.kind === 'meal' &&
            this.action.elapsed >= townLifeTiming.meal);
    }
    leave() {
        if (!this.canLeave || !this.action)
            return false;
        this.action = { ...this.action, leaving: 0 };
        return true;
    }
    update(delta) {
        if (!Number.isFinite(delta) || delta <= 0)
            return [];
        this.warmth = Math.max(0, this.warmth - delta);
        const action = this.action;
        if (!action)
            return [];
        if (action.leaving !== null) {
            const leaving = action.leaving + delta;
            this.action =
                leaving >= townLifeTiming.leave ? null : { ...action, leaving };
            return [];
        }
        const elapsed = action.elapsed + delta;
        const events = [];
        if (action.kind === 'attack') {
            this.action =
                elapsed >= clearing.swingDuration ? null : { ...action, elapsed };
        }
        else if (action.kind === 'meal') {
            for (const bite of [1.15, 1.85, 2.55]) {
                if (action.elapsed < bite && elapsed >= bite) {
                    this.mealRemaining = Math.max(0, this.mealRemaining - 1 / 3);
                    events.push({ kind: 'bite' });
                }
            }
            this.action = {
                ...action,
                elapsed: Math.min(elapsed, townLifeTiming.meal),
            };
        }
        else {
            const timing = townLifeTiming[action.kind];
            if (action.elapsed < timing.contact && elapsed >= timing.contact) {
                if (action.kind === 'clear') {
                    const id = 'path';
                    this.repairs = { ...this.repairs, [id]: true };
                    events.push({ kind: 'repair', id });
                }
                else if (action.kind === 'chop') {
                    this.splitWood = true;
                    events.push({ kind: 'split' });
                }
                else {
                    this.splitWood = false;
                    this.warmth = townLifeTiming.warmth;
                    events.push({ kind: 'fire' });
                }
            }
            this.action = elapsed >= timing.duration ? null : { ...action, elapsed };
        }
        return events;
    }
}
