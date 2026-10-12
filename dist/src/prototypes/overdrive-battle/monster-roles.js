import { isMonsterId, monsterDefinition, } from './monster-catalog.js';
import { YetiBoss, yetiBossRules } from './yeti-boss.js';
import { armoredBoarRules } from './armored-boar.js';
import { MushroomHealer } from './mushroom-healer.js';
/** 이번 신규 편성의 적별 준비·차단·회복 상태만 소유한다. 기존 보스·멧돼지·정령은 그대로 둔다. */
export class MonsterRoles {
    states = new Map();
    constructor(enemies) {
        for (const enemy of enemies) {
            if (!isMonsterId(enemy.kind))
                continue;
            const definition = monsterDefinition(enemy.kind);
            this.states.set(enemy.id, {
                definition,
                charger: definition.role === 'charger' ? new YetiBoss(enemy.id) : null,
                healer: definition.role === 'support' ? new MushroomHealer(enemy.id) : null,
            });
        }
    }
    takeTurn(enemyId, allies) {
        const state = this.states.get(enemyId);
        if (state?.charger)
            return state.charger.nextAction() === 'prepare'
                ? { kind: 'prepare', duration: yetiBossRules.preparationDuration }
                : { kind: 'attack' };
        if (state?.healer) {
            const turn = state.healer.beginTurn(allies);
            // 다친 동료가 없거나 혼자 남은 지원형도 공격하며 전투를 진행한다.
            if (turn.kind === 'heal')
                return turn;
            if (turn.kind === 'prepare')
                return { kind: 'prepare', duration: turn.duration };
            return { kind: 'attack' };
        }
        return { kind: 'attack' };
    }
    interrupt(enemyId) {
        const state = this.states.get(enemyId);
        return state?.charger?.interrupt() ?? state?.healer?.interrupt() ?? false;
    }
    resolveDamage(enemyId, damage) {
        const state = this.states.get(enemyId);
        if (state?.charger)
            return state.charger.receiveDamage(damage);
        if (state?.definition.role === 'armored' && damage > 0)
            return Math.max(1, Math.ceil(damage * armoredBoarRules.armorMultiplier));
        return damage;
    }
    resolveOverdriveDamage(enemyId, damage) {
        const state = this.states.get(enemyId);
        // 강타 차단으로 생긴 노출은 사용·소비하지 않는다. 갑옷형의 기본 스펙은 유지한다.
        return state?.charger ? damage : this.resolveDamage(enemyId, damage);
    }
    prepared(enemyId) {
        const state = this.states.get(enemyId);
        return state?.charger?.snapshot.ready ?? false;
    }
    update(dt) {
        for (const state of this.states.values())
            state.healer?.update(dt);
    }
    get snapshot() {
        return [...this.states].map(([enemyId, state]) => ({
            enemyId,
            role: state.definition.role,
            ready: state.charger?.snapshot.ready ?? state.healer?.snapshot.ready ?? false,
            exposed: state.charger?.snapshot.exposed ?? false,
            healingTargetId: state.healer?.snapshot.targetId ?? null,
        }));
    }
}
