import { ELEMENTS, } from './encounters.js';
import { PARTY_MEMBERS, PARTY_ORDER } from './party.js';
export const ACTIONS = {
    attack: {
        name: '일반 공격',
        damage: 20,
        balanceDamage: 1,
        kiCost: -1,
        physical: true,
    },
    element: {
        name: '속성 부적',
        damage: 30,
        balanceDamage: 1,
        kiCost: 2,
        physical: false,
    },
    heavy: {
        name: '강타',
        damage: 15,
        balanceDamage: 2,
        kiCost: 3,
        physical: true,
    },
    ward: {
        name: '호신 결계',
        damage: 0,
        balanceDamage: 0,
        kiCost: 3,
        physical: false,
    },
    finish: {
        name: '붕괴 추격',
        damage: 30,
        balanceDamage: 1,
        kiCost: 2,
        physical: true,
    },
    guard: {
        name: '방어',
        damage: 0,
        balanceDamage: 0,
        kiCost: 0,
        physical: false,
    },
};
const RECOVERY_INTENT = {
    id: 'recover',
    name: '자세 회복',
    damage: 0,
    prepared: false,
    armored: false,
    description: '공격을 포기하고 균형을 회복한다. 체력 공략의 기회.',
};
const MAX_KI = 6;
export class TurnBattle {
    encounter;
    turn = 1;
    party = [];
    activeActorId = null;
    targets = [];
    nextSingleTargetIndex = 0;
    warded = false;
    physicalCounterTriggered = false;
    bossHp = 0;
    balance = 0;
    broken = false;
    phase = 'command';
    patternIndex = 0;
    damageDealt = 0;
    damageTaken = 0;
    breaks = 0;
    counters = 0;
    actionCounts = this.emptyActionCounts();
    constructor(encounter, scenario = 'full') {
        this.encounter = encounter;
        this.reset(scenario);
    }
    get snapshot() {
        const party = this.party.map((member) => {
            const definition = PARTY_MEMBERS[member.id];
            return Object.freeze({
                ...member,
                name: definition.name,
                role: definition.role,
                maxHp: definition.maxHp,
                maxKi: MAX_KI,
                actions: Object.freeze([...definition.actions]),
            });
        });
        return Object.freeze({
            turn: this.turn,
            party: Object.freeze(party),
            activeActorId: this.activeActorId,
            targetIds: Object.freeze(this.intent.damage > 0 ? [...this.targets] : []),
            counterActorId: this.counterCandidate?.id ?? null,
            warded: this.warded,
            bossHp: this.bossHp,
            maxBossHp: this.encounter.maxBossHp,
            balance: this.balance,
            maxBalance: this.encounter.maxBalance,
            broken: this.broken,
            phase: this.phase,
            intent: Object.freeze({ ...this.intent }),
            stats: Object.freeze({
                damageDealt: this.damageDealt,
                damageTaken: this.damageTaken,
                breaks: this.breaks,
                counters: this.counters,
                actions: Object.freeze({ ...this.actionCounts }),
            }),
        });
    }
    reset(scenario = 'full') {
        const initial = this.encounter.scenarios[scenario];
        this.turn = 1;
        this.party = PARTY_ORDER.map((id) => ({
            id,
            hp: Math.max(0, Math.min(PARTY_MEMBERS[id].maxHp, initial.partyHp?.[id] ?? PARTY_MEMBERS[id].maxHp)),
            ki: Math.max(0, Math.min(MAX_KI, initial.initialKi)),
            guarding: false,
            acted: false,
        }));
        this.bossHp = initial.bossHp;
        this.balance = initial.balance;
        this.patternIndex = initial.patternIndex;
        this.nextSingleTargetIndex = 0;
        this.broken = false;
        this.warded = false;
        this.physicalCounterTriggered = false;
        this.damageDealt = 0;
        this.damageTaken = 0;
        this.breaks = 0;
        this.counters = 0;
        this.actionCounts = this.emptyActionCounts();
        this.beginRound();
        return this.snapshot;
    }
    actionDefinition(action) {
        const actor = PARTY_MEMBERS[this.activeActorId ?? 'ataho'];
        const base = ACTIONS[action];
        if (action === 'attack')
            return Object.freeze({ ...base, ...actor.attack });
        if (action !== 'element')
            return base;
        const element = actor.id === 'biwol'
            ? 'wind'
            : this.encounter.weakness === 'ice'
                ? 'ice'
                : 'fire';
        return Object.freeze({
            ...base,
            element,
            damage: element === this.encounter.weakness ? 45 : 30,
            name: actor.id === 'biwol' ? '바람 베기' : `${ELEMENTS[element].name} 부적`,
        });
    }
    preview(action) {
        const actor = this.activeActor;
        const ki = actor?.ki ?? 0;
        const definition = this.actionDefinition(action);
        const intent = this.rawIntent;
        const preparedBonus = intent.prepared && definition.balanceDamage > 0 ? 1 : 0;
        const balanceDamage = this.broken
            ? 0
            : Math.min(this.balance, definition.balanceDamage + preparedBonus);
        const willBreak = !this.broken && balanceDamage > 0 && balanceDamage >= this.balance;
        const baseDamage = action === 'finish' && (this.broken || willBreak)
            ? 55
            : definition.damage;
        const damage = Math.min(this.bossHp, intent.armored && definition.physical
            ? Math.ceil(baseDamage / 2)
            : baseDamage);
        const willKill = damage >= this.bossHp;
        const penalty = this.physicalCounterTriggered || definition.physical
            ? (intent.physicalCounterDamage ?? 0)
            : 0;
        const reduced = actor?.guarding || action === 'guard' || this.warded || action === 'ward';
        const incoming = intent.damage + penalty;
        const incomingDamage = !actor || !this.targets.includes(actor.id) || willKill || willBreak
            ? 0
            : reduced
                ? Math.ceil(incoming / 2)
                : incoming;
        const reason = this.phase !== 'command' || !actor
            ? '지금은 행동을 선택할 수 없습니다.'
            : !PARTY_MEMBERS[actor.id].actions.includes(action)
                ? '이 동료는 사용할 수 없는 행동입니다.'
                : action === 'ward' && intent.damage === 0
                    ? '이번에는 적이 공격하지 않습니다.'
                    : action === 'ward' && this.warded
                        ? '이미 호신 결계가 펼쳐져 있습니다.'
                        : ki < definition.kiCost
                            ? `기력이 ${definition.kiCost - ki} 부족합니다.`
                            : '';
        return Object.freeze({
            damage,
            balanceDamage,
            kiAfter: Math.max(0, Math.min(MAX_KI, ki - definition.kiCost)),
            canUse: reason === '',
            willBreak,
            willKill,
            incomingDamage,
            reason,
        });
    }
    startAction(action) {
        const preview = this.preview(action);
        const actor = this.activeActor;
        if (!preview.canUse || !actor)
            return null;
        const definition = this.actionDefinition(action);
        actor.acted = true;
        actor.guarding = action === 'guard';
        if (action === 'ward')
            this.warded = true;
        if (definition.physical && this.rawIntent.physicalCounterDamage)
            this.physicalCounterTriggered = true;
        this.actionCounts[action] += 1;
        actor.ki = preview.kiAfter;
        this.bossHp -= preview.damage;
        this.damageDealt += preview.damage;
        const broke = this.damageBalance(preview.balanceDamage);
        const killed = this.bossHp === 0;
        this.phase = killed ? 'victory' : 'acting';
        if (killed)
            this.activeActorId = null;
        return Object.freeze({
            actorId: actor.id,
            action,
            element: definition.element,
            damage: preview.damage,
            balanceDamage: preview.balanceDamage,
            broke,
            killed,
            guarding: actor.guarding,
        });
    }
    completeAction() {
        if (this.phase !== 'acting')
            return this.snapshot;
        const next = this.party.find((member) => member.hp > 0 && !member.acted);
        this.activeActorId = next?.id ?? null;
        this.phase = next ? 'command' : 'enemy';
        return this.snapshot;
    }
    resolveEnemy({ counter }) {
        if (this.phase !== 'enemy')
            return null;
        const intent = Object.freeze({ ...this.intent });
        const recovered = intent.damage === 0;
        const warded = this.warded;
        const hits = recovered
            ? []
            : this.party
                .filter((member) => member.hp > 0 && this.targets.includes(member.id))
                .map((member) => {
                const damage = Math.min(member.hp, this.damageFor(member, intent.damage));
                member.hp -= damage;
                return Object.freeze({
                    actorId: member.id,
                    damage,
                    guarded: member.guarding,
                    knockedOut: member.hp === 0,
                });
            });
        const damage = hits.reduce((sum, hit) => sum + hit.damage, 0);
        this.damageTaken += damage;
        const counterActorId = counter && !recovered
            ? (this.party.find((member) => member.hp > 0 &&
                member.guarding &&
                hits.some((hit) => hit.actorId === member.id && hit.damage > 0))?.id ?? null)
            : null;
        const countered = counterActorId !== null;
        const broke = countered && this.damageBalance(1);
        if (countered)
            this.counters += 1;
        if (intent.id === 'recover') {
            this.broken = false;
            this.balance = this.encounter.maxBalance;
        }
        this.patternIndex = (this.patternIndex + 1) % this.encounter.pattern.length;
        this.warded = false;
        this.physicalCounterTriggered = false;
        const outcome = this.party.every((member) => member.hp === 0)
            ? 'defeat'
            : 'continue';
        if (outcome === 'defeat') {
            this.phase = 'defeat';
            this.activeActorId = null;
        }
        else {
            this.turn += 1;
            this.beginRound();
        }
        return Object.freeze({
            intent,
            hits: Object.freeze(hits),
            counterActorId,
            damage,
            guarded: hits.some((hit) => hit.guarded),
            warded,
            countered,
            broke,
            recovered,
            outcome,
        });
    }
    get activeActor() {
        return this.party.find((member) => member.id === this.activeActorId);
    }
    get rawIntent() {
        return this.broken
            ? RECOVERY_INTENT
            : (this.encounter.pattern[this.patternIndex] ?? RECOVERY_INTENT);
    }
    get intent() {
        const intent = this.rawIntent;
        return this.physicalCounterTriggered && intent.physicalCounterDamage
            ? { ...intent, damage: intent.damage + intent.physicalCounterDamage }
            : intent;
    }
    get counterCandidate() {
        const damage = this.intent.damage;
        if (damage <= 0)
            return undefined;
        return this.party.find((member) => this.targets.includes(member.id) &&
            member.guarding &&
            member.hp > this.damageFor(member, damage));
    }
    damageFor(member, damage) {
        return member.guarding || this.warded ? Math.ceil(damage / 2) : damage;
    }
    beginRound() {
        for (const member of this.party) {
            member.guarding = false;
            member.acted = false;
        }
        const living = this.party.filter((member) => member.hp > 0);
        this.activeActorId = living[0]?.id ?? null;
        this.phase = living.length > 0 ? 'command' : 'defeat';
        const intent = this.rawIntent;
        const areaAttack = intent.prepared || intent.id === 'combo' || intent.id === 'slash';
        this.targets = [];
        if (intent.damage <= 0)
            return;
        if (areaAttack) {
            this.targets = living.map((member) => member.id);
            return;
        }
        // 광역 공격과 휴식 횟수에 상관없이 단일 공격 대상은 생존자를 순환한다.
        for (let offset = 0; offset < this.party.length; offset++) {
            const index = (this.nextSingleTargetIndex + offset) % this.party.length;
            const member = this.party[index];
            if (member.hp <= 0)
                continue;
            this.targets = [member.id];
            this.nextSingleTargetIndex = (index + 1) % this.party.length;
            return;
        }
    }
    damageBalance(amount) {
        if (this.broken || amount <= 0)
            return false;
        this.balance = Math.max(0, this.balance - amount);
        if (this.balance > 0)
            return false;
        this.broken = true;
        this.breaks += 1;
        return true;
    }
    emptyActionCounts() {
        return { attack: 0, element: 0, heavy: 0, ward: 0, finish: 0, guard: 0 };
    }
}
