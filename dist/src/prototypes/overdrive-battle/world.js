import { battleSkills, skillOrder, skillTargets, drinkMotion, } from './battle-skills.js';
import { DrunkenFist, drunkenRules, } from './drunken-fist.js';
import { Combatant, } from './combatant.js';
import { Overdrive, overdriveRules, driveFinishers, } from './overdrive.js';
import { overdriveIntro } from './overdrive-intro.js';
import { Rage } from './rage.js';
import { turnAttackAdvance, turnAttackTimings } from './turn-attack.js';
import { driveAdvance } from './overdrive-motion.js';
import { OverdriveReturn, driveReturnTiming, } from './overdrive-return.js';
import { TigerBarrage, tigerBarrageRules, } from './tiger-barrage.js';
export const battleRules = {
    width: 13,
    depth: 8,
    speed: 6 * 1.7,
    reach: 1.25,
    maxEnergy: 12,
    skillCost: battleSkills.tiger.cost,
    attackDamage: 24,
    skillDamage: battleSkills.tiger.damage,
    rushDamage: 11,
    breakDuration: overdriveIntro.duration,
    returnDuration: driveReturnTiming.duration,
    enemyActionSpeed: 1.5,
    hitStop: 0.045,
    heavyStop: 0.075,
};
const heroSpec = {
    id: 0,
    name: '아타호',
    kind: 'ataho',
    maxHealth: 180,
    damage: battleRules.attackDamage,
    radius: 0.3,
    home: { x: -3.6, z: 0.8 },
};
const enemySpecs = [
    {
        id: 1,
        name: '슬라임 A',
        kind: 'slime',
        maxHealth: 100,
        damage: 9,
        radius: 0.48,
        home: { x: 0.6, z: 1.5 },
    },
    {
        id: 2,
        name: '산길 예티',
        kind: 'yeti',
        maxHealth: 300,
        damage: 18,
        radius: 0.7,
        home: { x: 3, z: -0.2 },
    },
    {
        id: 3,
        name: '슬라임 B',
        kind: 'slime',
        maxHealth: 100,
        damage: 9,
        radius: 0.48,
        home: { x: 0.5, z: -2 },
    },
];
// 첫 원정은 일반 공격 세 번으로 한 마리를 쓰러뜨리는 짧은 전투다.
const firstExpeditionEnemies = enemySpecs
    .filter((enemy) => enemy.kind === 'slime')
    .map((enemy) => ({ ...enemy, maxHealth: 72, damage: 7 }));
export function actionPosition(action) {
    const advance = action.driveBeat !== undefined
        ? driveAdvance(action)
        : action.kind === 'attack' || action.kind === 'skill'
            ? turnAttackAdvance(action.kind, action.elapsed)
            : action.elapsed < action.contactTime
                ? Math.pow(Math.min(1, action.elapsed / (action.contactTime * 0.9)), 2)
                : Math.max(0, 1 -
                    (action.elapsed - action.contactTime) /
                        (action.duration - action.contactTime));
    return {
        x: action.origin.x + (action.destination.x - action.origin.x) * advance,
        z: action.origin.z + (action.destination.z - action.origin.z) * advance,
    };
}
class BattleAction {
    data;
    elapsed = 0;
    applied = false;
    constructor(data) {
        this.data = data;
    }
    get snapshot() {
        return { ...this.data, elapsed: this.elapsed };
    }
    get done() {
        return this.elapsed >= this.data.duration;
    }
    update(dt) {
        this.elapsed += dt;
        if (this.applied || this.elapsed < this.data.contactTime)
            return false;
        this.applied = true;
        return true;
    }
}
const idleInput = { x: 0, z: 0, attacking: false };
/** 범위 지정과 실행이 같은 전장 경계를 사용한다. */
export function clampSkillArea(point) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.z))
        return null;
    return {
        x: Math.max(-battleRules.width / 2, Math.min(battleRules.width / 2, point.x)),
        z: Math.max(-battleRules.depth / 2, Math.min(battleRules.depth / 2, point.z)),
    };
}
/** 전투 순서를 조율한다. 오버드라이브 중에는 적 행동 경로를 실행하지 않는다. */
export class BattleWorld {
    random;
    advanced;
    availableSkills;
    player;
    enemies = [];
    drive;
    rage;
    drunken;
    phase = 'command';
    phaseTime = 0;
    round = 1;
    energy = battleRules.maxEnergy;
    guarding = false;
    targetId = 1;
    action = null;
    barrage = null;
    returnMotion = null;
    enemyQueue = [];
    enemyDelay = 0;
    hitStop = 0;
    impacts = [];
    message = '';
    constructor(random = Math.random, entry) {
        this.random = random;
        this.advanced = entry?.encounter !== 'first-expedition';
        this.availableSkills = this.advanced
            ? [...skillOrder]
            : entry?.unlockedSkills.includes('kick')
                ? ['kick']
                : [];
        this.reset();
    }
    reset() {
        this.player = new Combatant(heroSpec);
        this.enemies = (this.advanced ? enemySpecs : firstExpeditionEnemies).map((spec) => new Combatant(spec));
        this.drive = new Overdrive();
        if (!this.advanced)
            this.drive.setGaugeForDevelopment(0);
        this.rage = new Rage();
        this.drunken = new DrunkenFist();
        this.phase = 'command';
        this.phaseTime = 0;
        this.round = 1;
        this.energy = battleRules.maxEnergy;
        this.guarding = false;
        this.targetId = 1;
        this.action = null;
        this.barrage = null;
        this.returnMotion = null;
        this.enemyQueue = [];
        this.enemyDelay = 0;
        this.hitStop = 0;
        this.impacts = [];
        this.message = '아타호의 차례. 사용할 행동을 골라보세요.';
    }
    get snapshot() {
        return {
            advanced: this.advanced,
            availableSkills: [...this.availableSkills],
            phase: this.phase,
            phaseTime: this.phaseTime,
            round: this.round,
            player: this.player.snapshot,
            enemies: this.enemies.map((enemy) => enemy.snapshot),
            energy: this.energy,
            rage: this.rage.gauge,
            drunken: this.drunken.snapshot,
            guarding: this.guarding,
            targetId: this.targetId,
            overdrive: this.drive.snapshot,
            action: this.action?.snapshot ?? null,
            barrage: this.barrage?.snapshot ?? null,
            returning: this.returnMotion?.snapshot ?? null,
            message: this.message,
            hitStopped: this.hitStop > 0,
        };
    }
    setGaugeForDevelopment(gauge, amount) {
        if (!this.advanced)
            return;
        const resource = gauge === 'rage' ? this.rage : this.drive;
        resource.setGaugeForDevelopment(amount);
    }
    chargeDrive(amount) {
        if (this.advanced)
            this.drive.charge(amount);
    }
    selectTarget(id) {
        if (this.phase === 'command' &&
            this.enemies.some((enemy) => enemy.spec.id === id && enemy.alive))
            this.targetId = id;
    }
    cycleTarget(direction) {
        const living = this.enemies.filter((enemy) => enemy.alive);
        const index = living.findIndex((enemy) => enemy.spec.id === this.targetId);
        const next = living[(index + direction + living.length) % living.length];
        if (next)
            this.selectTarget(next.spec.id);
    }
    command(command, options = {}) {
        if (this.phase !== 'command')
            return false;
        if (!this.advanced && (command === 'overdrive' || command === 'ultimate'))
            return false;
        if (command === 'overdrive') {
            if (this.drunken.active || !this.drive.activate())
                return false;
            this.setPhase('breaking', '아직, 내 차례다!');
            return true;
        }
        if (command === 'guard') {
            this.guarding = true;
            this.energy = Math.min(battleRules.maxEnergy, this.energy + 4);
            this.chargeDrive(overdriveRules.guardCharge);
            this.beginEnemyTurn('방어! 이번 적 차례의 피해를 절반으로 줄입니다.');
            return true;
        }
        const skill = options.skill ?? 'tiger';
        if (command === 'skill') {
            if (!this.availableSkills.includes(skill))
                return false;
            if (this.energy < battleSkills[skill].cost)
                return false;
            if (skill === 'drink') {
                const point = this.player.snapshot;
                this.action = new BattleAction({
                    kind: 'drink',
                    actorId: 0,
                    targetIds: [],
                    origin: { x: point.x, z: point.z },
                    destination: { x: point.x, z: point.z },
                    ...drinkMotion,
                });
                this.setPhase('player-action', '한 잔~');
                return true;
            }
            if (skill === 'sweep') {
                const center = options.areaCenter && clampSkillArea(options.areaCenter);
                if (!center)
                    return false;
                const ids = new Set(skillTargets(skill, null, this.snapshot.enemies, center).map((target) => target.id));
                const targets = this.enemies.filter((target) => ids.has(target.spec.id));
                if (targets.length === 0)
                    return false;
                this.energy -= battleSkills[skill].cost;
                this.chargeDrive(overdriveRules.skillCharge);
                this.startAction('skill', this.player, targets, {
                    skill,
                    areaCenter: center,
                });
                this.setPhase('player-action', '선풍각!');
                return true;
            }
        }
        const enemy = this.enemies.find((item) => item.spec.id === this.targetId && item.alive);
        if (!enemy)
            return false;
        if (command === 'ultimate')
            return this.unleashBarrage(enemy);
        if (command === 'skill' && skill !== 'drink') {
            this.energy -= battleSkills[skill].cost;
            this.chargeDrive(overdriveRules.skillCharge);
            this.startAction('skill', this.player, [enemy], { skill });
            this.setPhase('player-action', `${battleSkills[skill].name}!`);
        }
        else {
            this.energy = Math.min(battleRules.maxEnergy, this.energy + 2);
            this.chargeDrive(overdriveRules.attackCharge);
            this.startAction('attack', this.player, [enemy]);
            this.setPhase('player-action', '아타호의 공격!');
        }
        return true;
    }
    update(dt, input = idleInput) {
        if (!Number.isFinite(dt) || dt <= 0)
            return;
        dt = Math.min(dt, 0.05);
        this.player.stop();
        if (this.phase === 'command' ||
            this.phase === 'victory' ||
            this.phase === 'defeat')
            return;
        if (this.hitStop > 0) {
            const frozen = Math.min(dt, this.hitStop);
            this.hitStop -= frozen;
            dt -= frozen;
            if (dt <= 0)
                return;
        }
        this.phaseTime += dt;
        if (this.phase === 'breaking') {
            if (this.phaseTime >= battleRules.breakDuration)
                this.setPhase('overdrive', '아타호의 차례 · 마음껏 몰아치세요!');
            return;
        }
        if (this.phase === 'returning') {
            this.updateReturn(dt);
            return;
        }
        if (this.phase === 'ultimate' && this.barrage) {
            for (const strike of this.barrage.update(dt))
                this.applyBarrageStrike(strike);
            // 마지막 타격으로 전멸해도 호랑이와 마무리 자세를 보여준 뒤 승리를 판정한다.
            if (this.barrage.done) {
                const { destination, target } = this.barrage.snapshot;
                this.player.moveTo(destination);
                this.player.stop();
                this.player.face({ x: target.x < destination.x ? -1 : 1, z: 0 });
                this.barrage = null;
                if (!this.checkOutcome())
                    this.beginEnemyTurn('적의 차례');
            }
            return;
        }
        if (this.phase === 'overdrive') {
            this.drive.update(dt);
            // 제한 시간이 끝난 뒤에는 예약된 타격도 적용하지 않는다.
            if (this.drive.expired) {
                this.finishOverdrive();
                return;
            }
            if (!this.action) {
                this.movePlayer(input, dt);
                this.updateRushTarget();
                if (input.attacking)
                    this.startRush();
            }
        }
        if (this.action) {
            if (this.action.update(dt))
                this.applyAction(this.action.snapshot);
            // 마지막 적을 쓰러뜨려도 일반 공격의 회수·복귀를 마친 뒤 승리로 전환한다.
            if ((this.phase !== 'player-action' || this.action.done) &&
                this.checkOutcome())
                return;
            if (this.action.done) {
                this.settleDriveAction();
                this.action = null;
                if (this.phase === 'player-action')
                    this.beginEnemyTurn('적의 차례');
                else if (this.phase === 'enemy-turn')
                    this.enemyDelay = 0.22;
            }
            return;
        }
        if (this.phase === 'enemy-turn') {
            this.enemyDelay -= dt;
            if (this.enemyDelay > 0)
                return;
            const id = this.enemyQueue.shift();
            if (id === undefined) {
                this.round++;
                if (this.advanced)
                    this.rage.beginTurn();
                this.guarding = false;
                this.ensureTarget();
                this.setPhase('command', this.drive.ready && !this.drunken.active
                    ? '오버드라이브 준비 완료. 원하는 순간에 발동하세요.'
                    : '아타호의 차례. 다음 수를 골라보세요.');
            }
            else {
                const enemy = this.enemies.find((item) => item.spec.id === id && item.alive);
                if (enemy?.consumeStagger()) {
                    this.message = `${enemy.spec.name}은 자세를 회복하느라 행동하지 못합니다.`;
                    this.enemyDelay = this.advanced ? 0.55 : 1;
                }
                else if (enemy) {
                    this.startAction('enemy', enemy, [this.player]);
                    this.message = `${enemy.spec.name}의 공격!`;
                }
            }
        }
    }
    setPhase(phase, message) {
        this.phase = phase;
        this.phaseTime = 0;
        this.message = message;
    }
    finishOverdrive() {
        const action = this.action?.snapshot ?? null;
        this.settleDriveAction();
        const point = this.player.snapshot;
        this.returnMotion = new OverdriveReturn({
            origin: { x: point.x, z: point.z },
            destination: heroSpec.home,
            action,
        });
        this.action = null;
        this.hitStop = 0;
        this.player.stop();
        this.setPhase('returning', `${this.drive.snapshot.hits}연타 · ${this.drive.snapshot.damage} 피해`);
    }
    updateReturn(dt) {
        const motion = this.returnMotion;
        if (!motion)
            return;
        motion.update(dt);
        const state = motion.snapshot;
        this.player.moveTo(state.position);
        if (state.moving) {
            this.player.face({
                x: state.origin.x - heroSpec.home.x,
                z: state.origin.z - heroSpec.home.z,
            });
        }
        else
            this.player.stop();
        if (state.progress === 1) {
            const target = this.enemies.find((enemy) => enemy.alive)?.snapshot;
            this.player.face(target
                ? { x: target.x - heroSpec.home.x, z: target.z - heroSpec.home.z }
                : { x: 1, z: 0 });
        }
        if (!motion.done)
            return;
        this.returnMotion = null;
        if (!this.checkOutcome())
            this.beginEnemyTurn('오버드라이브 종료. 이제 적의 차례입니다.');
    }
    settleDriveAction() {
        const action = this.action?.snapshot;
        if (action?.driveBeat === undefined)
            return;
        this.player.moveTo(actionPosition(action));
        this.player.stop();
    }
    unleashBarrage(target) {
        if (!this.rage.consume())
            return false;
        const origin = this.player.snapshot;
        const point = target.snapshot;
        const angle = origin.x <= point.x ? Math.PI : 0;
        const distance = target.spec.radius + heroSpec.radius + 0.25;
        let destination = this.player.snapshot;
        // 돌진 후에도 다른 적과 겹치거나 전장 밖에 서지 않도록 착지 지점을 고른다.
        for (const offset of [
            0,
            Math.PI / 4,
            -Math.PI / 4,
            Math.PI / 2,
            -Math.PI / 2,
            Math.PI,
        ]) {
            const candidate = {
                x: point.x + Math.cos(angle + offset) * distance,
                z: point.z + Math.sin(angle + offset) * distance,
            };
            if (this.canWalk(candidate)) {
                destination = candidate;
                break;
            }
        }
        this.barrage = new TigerBarrage({
            targetId: target.spec.id,
            origin: { x: origin.x, z: origin.z },
            destination,
            target: { x: point.x, z: point.z },
        });
        this.action = null;
        this.hitStop = 0;
        this.targetId = target.spec.id;
        this.player.stop();
        this.player.face({ x: point.x < destination.x ? -1 : 1, z: 0 });
        this.setPhase('ultimate', `${tigerBarrageRules.name}!`);
        return true;
    }
    applyBarrageStrike(strike) {
        const barrage = this.barrage;
        if (!barrage)
            return;
        const state = barrage.snapshot;
        const target = this.enemies.find((enemy) => enemy.spec.id === state.targetId);
        if (!target?.alive)
            return;
        const point = target.snapshot;
        // 약한 적도 난무 도중 사라지지 않게 마지막 일격에 처치한다.
        const damage = strike.final
            ? strike.damage
            : Math.min(strike.damage, Math.max(0, point.health - 1));
        const actual = target.hurt(damage);
        barrage.recordHit(actual);
        const dx = point.x - state.destination.x;
        const dz = point.z - state.destination.z;
        const length = Math.hypot(dx, dz) || 1;
        const aim = { x: dx / length, z: dz / length };
        this.impacts.push({
            x: point.x,
            z: point.z,
            targetId: target.spec.id,
            damage: actual,
            heavy: strike.final,
            defeated: !target.alive,
            guarded: false,
            aim,
            barrage: {
                hit: strike.hit,
                final: strike.final,
                totalDamage: barrage.snapshot.damage,
            },
        });
        this.hitStop = strike.final
            ? tigerBarrageRules.finalStop
            : tigerBarrageRules.hitStop;
        if (strike.final)
            this.knockBack(target, aim, state.destination);
    }
    knockBack(target, aim, hero) {
        for (let step = 0; step < 22; step++) {
            const point = target.snapshot;
            const next = { x: point.x + aim.x * 0.05, z: point.z + aim.z * 0.05 };
            if (Math.abs(next.x) > battleRules.width / 2 - point.radius ||
                Math.abs(next.z) > battleRules.depth / 2 - point.radius ||
                Math.hypot(next.x - hero.x, next.z - hero.z) <
                    point.radius + heroSpec.radius ||
                this.enemies.some((enemy) => enemy !== target &&
                    enemy.alive &&
                    Math.hypot(next.x - enemy.snapshot.x, next.z - enemy.snapshot.z) <
                        point.radius + enemy.spec.radius))
                break;
            target.moveTo(next);
        }
        target.stop();
        target.face({ x: -aim.x, z: -aim.z });
    }
    beginEnemyTurn(message) {
        this.drunken.endTurn();
        this.enemyQueue = this.enemies
            .filter((enemy) => enemy.alive)
            .map((enemy) => enemy.spec.id);
        this.enemyDelay = 0.5;
        this.setPhase('enemy-turn', message);
    }
    startAction(kind, actor, targets, options = {}) {
        const target = targets[0];
        if (!target)
            return;
        const origin = actor.snapshot;
        const point = options.areaCenter ?? target.snapshot;
        const dx = point.x - origin.x;
        const dz = point.z - origin.z;
        const distance = Math.hypot(dx, dz) || 1;
        actor.face({ x: dx, z: dz });
        const rush = kind === 'rush' || kind === 'finisher';
        const finisher = options.driveFinisher
            ? driveFinishers[options.driveFinisher]
            : null;
        const turnAttack = kind === 'attack' || kind === 'skill' ? turnAttackTimings[kind] : null;
        const approach = Math.max(0, distance - target.spec.radius - (rush ? heroSpec.radius + 0.12 : 0.55));
        let destination = {
            x: origin.x + (dx / distance) * approach,
            z: origin.z + (dz / distance) * approach,
        };
        if (options.areaCenter)
            destination = { ...options.areaCenter };
        if (rush) {
            destination = { x: origin.x, z: origin.z };
            const steps = Math.ceil(approach / 0.05);
            for (let step = 1; step <= steps; step++) {
                const next = {
                    x: origin.x + (dx / distance) * approach * (step / steps),
                    z: origin.z + (dz / distance) * approach * (step / steps),
                };
                if (!this.canWalk(next))
                    break;
                destination = next;
            }
        }
        this.action = new BattleAction({
            kind,
            actorId: actor.spec.id,
            targetIds: targets.map((item) => item.spec.id),
            origin: { x: origin.x, z: origin.z },
            destination,
            duration: turnAttack?.duration ??
                finisher?.duration ??
                (rush
                    ? overdriveRules.rushDuration
                    : 0.8 / battleRules.enemyActionSpeed),
            contactTime: turnAttack?.contactTime ??
                finisher?.contactTime ??
                (rush
                    ? overdriveRules.rushContactTime
                    : 0.36 / battleRules.enemyActionSpeed),
            ...(options.skill ? { skill: options.skill } : {}),
            ...(options.areaCenter ? { areaCenter: { ...options.areaCenter } } : {}),
            ...(rush ? { driveBeat: this.drive.snapshot.chain + 1 } : {}),
            ...(options.driveFinisher
                ? { driveFinisher: options.driveFinisher }
                : {}),
        });
    }
    applyAction(action) {
        if (action.kind === 'drink') {
            const before = this.energy;
            this.energy = Math.min(battleRules.maxEnergy, this.energy + drunkenRules.energyRecovery);
            this.drunken.drink();
            this.chargeDrive(overdriveRules.skillCharge);
            this.message = this.drunken.active
                ? `기력 +${this.energy - before} · 취권 ${this.drunken.snapshot.turns}턴!`
                : `기력 +${this.energy - before} · ${this.drunken.snapshot.drinks} / 3잔`;
            return;
        }
        const actor = action.actorId === 0
            ? this.player
            : this.enemies.find((item) => item.spec.id === action.actorId);
        if (!actor?.alive)
            return;
        const rush = action.kind === 'rush' || action.kind === 'finisher';
        const heavy = action.kind === 'skill' || action.kind === 'finisher';
        const finisher = action.driveFinisher
            ? driveFinishers[action.driveFinisher]
            : null;
        const damage = finisher
            ? finisher.damage
            : action.kind === 'enemy'
                ? actor.spec.damage
                : action.kind === 'skill'
                    ? battleSkills[action.skill ?? 'tiger'].damage
                    : action.kind === 'rush'
                        ? battleRules.rushDamage
                        : battleRules.attackDamage;
        const hit = this.advanced && actor === this.player && !rush
            ? this.drunken.resolveHit(damage, {
                skill: action.kind === 'skill',
                roll: this.random(),
            })
            : { damage, critical: false };
        let connected = false;
        for (const id of action.targetIds) {
            const target = id === 0
                ? this.player
                : this.enemies.find((item) => item.spec.id === id);
            if (!target?.alive)
                continue;
            const point = target.snapshot;
            const guarded = id === 0 && this.guarding;
            const actual = target.hurt(guarded ? Math.ceil(hit.damage / 2) : hit.damage);
            if (action.skill === 'kick')
                target.stagger();
            if (this.advanced && id === 0)
                this.rage.takeDamage(actual, heroSpec.maxHealth);
            const dx = point.x - action.origin.x;
            const dz = point.z - action.origin.z;
            const length = Math.hypot(dx, dz) || 1;
            this.impacts.push({
                x: point.x,
                z: point.z,
                targetId: id,
                damage: actual,
                heavy,
                defeated: !target.alive,
                guarded,
                critical: hit.critical,
                ...(action.skill ? { technique: action.skill } : {}),
                ...(action.areaCenter ? { areaCenter: action.areaCenter } : {}),
                aim: { x: dx / length, z: dz / length },
                ...(action.driveBeat !== undefined
                    ? {
                        drive: {
                            beat: action.driveBeat,
                            finisher: action.driveFinisher ?? null,
                            primary: !connected,
                        },
                    }
                    : {}),
            });
            connected = true;
            if (rush)
                this.drive.recordHit(actual);
        }
        // 범위 강타가 여러 적에게 맞아도 다음 강타 주기는 한 타만 진행한다.
        if (rush && connected)
            this.drive.recordAttack();
        this.hitStop = connected
            ? (finisher?.hitStop ??
                (heavy ? battleRules.heavyStop : battleRules.hitStop)) +
                (hit.critical ? 0.035 : 0)
            : 0;
        this.ensureTarget();
    }
    checkOutcome() {
        if (this.player.alive && this.enemies.some((enemy) => enemy.alive))
            return false;
        // 오버드라이브 전멸도 복귀 구간을 거친 뒤 승리로 전환한다.
        if (this.phase === 'overdrive' && this.player.alive) {
            this.finishOverdrive();
            return true;
        }
        this.settleDriveAction();
        this.action = null;
        this.enemyQueue = [];
        this.hitStop = 0;
        this.setPhase(this.player.alive ? 'victory' : 'defeat', this.player.alive
            ? '산길이 다시 조용해졌습니다.'
            : '잠깐 숨을 고르고, 다시 도전해보세요.');
        return true;
    }
    ensureTarget() {
        if (!this.enemies.some((item) => item.spec.id === this.targetId && item.alive))
            this.targetId = this.enemies.find((item) => item.alive)?.spec.id ?? null;
    }
    movePlayer(input, dt) {
        const x = Number.isFinite(input.x) ? input.x : 0;
        const z = Number.isFinite(input.z) ? input.z : 0;
        const length = Math.hypot(x, z);
        if (!length)
            return;
        const move = { x: x / length, z: z / length };
        this.player.face(move);
        const steps = Math.ceil((battleRules.speed * dt) / 0.05);
        for (let step = 0; step < steps; step++) {
            const point = this.player.snapshot;
            const nextX = {
                x: point.x + (move.x * battleRules.speed * dt) / steps,
                z: point.z,
            };
            if (this.canWalk(nextX))
                this.player.moveTo(nextX);
            const nextZ = {
                x: this.player.snapshot.x,
                z: this.player.snapshot.z + (move.z * battleRules.speed * dt) / steps,
            };
            if (this.canWalk(nextZ))
                this.player.moveTo(nextZ);
        }
        this.player.face(move);
    }
    canWalk(point) {
        if (Math.abs(point.x) > battleRules.width / 2 - heroSpec.radius ||
            Math.abs(point.z) > battleRules.depth / 2 - heroSpec.radius)
            return false;
        return this.enemies.every((enemy) => !enemy.alive ||
            Math.hypot(point.x - enemy.snapshot.x, point.z - enemy.snapshot.z) >=
                heroSpec.radius + enemy.spec.radius);
    }
    updateRushTarget() {
        const player = this.player.snapshot;
        let nearest;
        let best = Infinity;
        for (const enemy of this.enemies) {
            if (!enemy.alive)
                continue;
            const distance = Math.hypot(enemy.snapshot.x - player.x, enemy.snapshot.z - player.z) -
                enemy.spec.radius;
            if (distance <= battleRules.reach && distance < best) {
                best = distance;
                nearest = enemy;
            }
        }
        this.targetId = nearest?.spec.id ?? null;
    }
    startRush() {
        const target = this.enemies.find((item) => item.spec.id === this.targetId && item.alive);
        if (!target)
            return;
        const finisher = this.drive.nextFinisher;
        const targets = finisher
            ? [
                target,
                ...this.enemies.filter((enemy) => enemy !== target &&
                    enemy.alive &&
                    Math.hypot(enemy.snapshot.x - target.snapshot.x, enemy.snapshot.z - target.snapshot.z) <= driveFinishers[finisher].radius),
            ]
            : [target];
        this.startAction(finisher ? 'finisher' : 'rush', this.player, targets, finisher ? { driveFinisher: finisher } : {});
    }
    takeImpacts() {
        const events = this.impacts;
        this.impacts = [];
        return events;
    }
}
