import { monsterFormation } from './monster-formation.js';
import { MonsterRoles } from './monster-roles.js';
import { isMonsterId, monsterDefinition } from './monster-catalog.js';
import { monsterAttackPlan, } from './monster-motions.js';
import { battleSkills, skillOrder, elementSkillOrder, isElementSkill, skillTargets, drinkMotion, } from './battle-skills.js';
import { DrunkenFist, drunkenRules, } from './drunken-fist.js';
import { Combatant, } from './combatant.js';
import { Overdrive, overdriveRules, driveFinishers, } from './overdrive.js';
import { overdriveIntro } from './overdrive-intro.js';
import { Rage } from './rage.js';
import { turnAttackAdvance, turnAttackTimings } from './turn-attack.js';
import { driveAdvance } from './overdrive-motion.js';
import { OverdriveReturn, driveReturnTiming, } from './overdrive-return.js';
import { TigerBarrage, tigerBarrageRules, } from './tiger-barrage.js';
import { ElementInteractions, } from './element-interactions.js';
import { ProtectionTalisman, yeonmukRules, yeonmukSpec } from './yeonmuk.js';
import { defaultEquipmentEffects, } from '../../games/tiger-rpg/equipment.js';
import { YetiBoss, yetiBossRules } from './yeti-boss.js';
import { ArmoredBoar, armoredBoarRules, } from './armored-boar.js';
import { MushroomHealer, } from './mushroom-healer.js';
/** 실제 방어 피해 배율에서 안내에 사용할 감소율을 계산한다. */
export function guardReductionPercent(damageMultiplier) {
    return Math.round((1 - damageMultiplier) * 100);
}
export const battleRules = {
    maxHealth: 180,
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
    maxHealth: battleRules.maxHealth,
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
const encounterEnemies = {
    prototype: enemySpecs,
    'first-expedition': firstExpeditionEnemies,
    'trail-1': firstExpeditionEnemies,
    'drive-pack': [
        {
            ...enemySpecs[0],
            kind: 'wolf',
            name: '숲늑대 A',
            maxHealth: 150,
            damage: 11,
            home: { x: 0.1, z: 2.7 },
        },
        {
            ...enemySpecs[2],
            kind: 'wolf',
            name: '숲늑대 B',
            maxHealth: 150,
            damage: 11,
            home: { x: 3.6, z: -2.6 },
        },
        {
            ...enemySpecs[0],
            id: 4,
            kind: 'wolf',
            name: '숲늑대 C',
            maxHealth: 150,
            damage: 11,
            home: { x: 3.3, z: 1.5 },
        },
    ],
    'drive-boss': [
        {
            ...enemySpecs[1],
            kind: 'boar',
            name: '갑옷 멧돼지',
            maxHealth: armoredBoarRules.maxHealth,
            damage: armoredBoarRules.damage,
        },
    ],
    'trail-boss': [
        {
            ...enemySpecs[1],
            maxHealth: yetiBossRules.maxHealth,
            damage: yetiBossRules.damage,
        },
    ],
    'mushroom-grove': [
        {
            ...enemySpecs[0],
            name: '버섯숲 슬라임 A',
            maxHealth: 120,
            damage: 11,
            home: { x: 0.3, z: 1.7 },
        },
        {
            ...enemySpecs[2],
            name: '버섯숲 슬라임 B',
            maxHealth: 120,
            damage: 11,
            home: { x: 2.7, z: 0.2 },
        },
        {
            id: 4,
            kind: 'mushroom',
            name: '버섯 정령',
            maxHealth: 96,
            damage: 0,
            radius: 0.5,
            home: { x: 2.1, z: -2.7 },
        },
    ],
    'mushroom-pack': [
        {
            ...enemySpecs[0],
            name: '숲 슬라임 A',
            maxHealth: 150,
            damage: 11,
            home: { x: 0.3, z: 1.7 },
        },
        {
            ...enemySpecs[2],
            name: '숲 슬라임 B',
            maxHealth: 150,
            damage: 11,
            home: { x: 2.7, z: 0.2 },
        },
        {
            id: 4,
            kind: 'mushroom',
            name: '버섯 정령',
            maxHealth: 144,
            damage: 0,
            radius: 0.5,
            home: { x: 2.1, z: -2.7 },
        },
    ],
};
export const forestEnemyAttackTimings = {
    arrivalProgress: 0.3,
    returnProgress: 0.72,
};
function forestEnemyAdvance(action) {
    const progress = action.elapsed / action.duration;
    const { arrivalProgress, returnProgress } = forestEnemyAttackTimings;
    if (progress < arrivalProgress)
        return Math.pow(Math.max(0, progress / arrivalProgress), 2);
    if (progress < returnProgress)
        return 1;
    return Math.max(0, 1 - (progress - returnProgress) / (1 - returnProgress));
}
export function actionPosition(action) {
    if (action.monsterMotion) {
        const { mode, arrivalTime, returnTime } = action.monsterMotion;
        if (mode === 'ranged')
            return { ...action.origin };
        const advance = action.elapsed < arrivalTime
            ? Math.pow(Math.min(1, action.elapsed / arrivalTime), 0.65)
            : action.elapsed < returnTime
                ? 1
                : Math.max(0, 1 -
                    (action.elapsed - returnTime) / (action.duration - returnTime));
        return {
            x: action.origin.x + (action.destination.x - action.origin.x) * advance,
            z: action.origin.z + (action.destination.z - action.origin.z) * advance,
        };
    }
    const advance = action.kind === 'talisman' || action.kind === 'ward'
        ? 0
        : action.enemyMotion
            ? forestEnemyAdvance(action)
            : action.driveBeat !== undefined
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
    encounter;
    enemySpecs;
    monsterRoles = new MonsterRoles([]);
    maxHealth;
    initialHealth;
    attackBonus;
    equipmentEffects;
    boss = null;
    boar = null;
    healer = null;
    advanced;
    interactionLab;
    interactions = null;
    overdriveUnlocked;
    initialDrive;
    availableSkills;
    player;
    companion = null;
    companionEntry;
    activeActorId = 0;
    companionGuarding = false;
    protection = new ProtectionTalisman();
    enemyTargets = new Map();
    enemies = [];
    initialEnemyDamage;
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
    kickUsed = false;
    allowKickGuidance;
    blockedEnemyId = null;
    hitStop = 0;
    impacts = [];
    healings = [];
    message = '';
    constructor(random = Math.random, entry) {
        this.random = random;
        this.encounter = entry?.encounter ?? 'prototype';
        this.interactionLab = entry?.interactionLab === true;
        if (entry?.monsterFormation &&
            (this.encounter !== 'prototype' || this.interactionLab))
            throw new Error('신규 몬스터 편성은 독립 전투 실험장에서만 사용합니다.');
        this.enemySpecs = entry?.monsterFormation
            ? monsterFormation(entry.monsterFormation)
            : encounterEnemies[this.encounter];
        const initialEnemyDamage = new Map();
        for (const hit of entry?.initialEnemyDamage ?? []) {
            const spec = this.enemySpecs.find((enemy) => enemy.id === hit.enemyId);
            // 환경 공격만으로 전투를 건너뛰지 않는다. 재도전도 같은 입장 피해를 복원한다.
            if (!spec ||
                initialEnemyDamage.has(hit.enemyId) ||
                !Number.isSafeInteger(hit.damage) ||
                hit.damage < 0 ||
                hit.damage >= spec.maxHealth)
                throw new Error('입장 적 피해가 유효하지 않습니다.');
            initialEnemyDamage.set(hit.enemyId, hit.damage);
        }
        this.initialEnemyDamage = initialEnemyDamage;
        this.allowKickGuidance = entry?.kickGuidance ?? true;
        this.advanced = this.encounter === 'prototype' || this.interactionLab;
        const isolatedPrototype = this.advanced && !this.interactionLab && !entry?.monsterFormation;
        const suppliedEffects = isolatedPrototype
            ? defaultEquipmentEffects
            : (entry?.equipmentEffects ?? defaultEquipmentEffects);
        const equipmentEffects = {
            ...suppliedEffects,
            basicAttackStaminaRecoveryBonus: suppliedEffects.basicAttackStaminaRecoveryBonus ?? 0,
            damageReduction: suppliedEffects.damageReduction ?? 0,
            overdriveMovementMultiplier: suppliedEffects.overdriveMovementMultiplier ?? 1,
        };
        if (!Number.isFinite(equipmentEffects.overdriveChargeMultiplier) ||
            equipmentEffects.overdriveChargeMultiplier < 1 ||
            !Number.isFinite(equipmentEffects.guardDamageMultiplier) ||
            equipmentEffects.guardDamageMultiplier <= 0 ||
            equipmentEffects.guardDamageMultiplier > 1 ||
            !Number.isSafeInteger(equipmentEffects.basicAttackStaminaRecoveryBonus) ||
            equipmentEffects.basicAttackStaminaRecoveryBonus < 0 ||
            !Number.isSafeInteger(equipmentEffects.damageReduction) ||
            equipmentEffects.damageReduction < 0 ||
            !Number.isFinite(equipmentEffects.overdriveMovementMultiplier) ||
            equipmentEffects.overdriveMovementMultiplier < 1)
            throw new Error('입장 장착 효과가 유효하지 않습니다.');
        // 호출자가 장비를 바꿔도 진행 중 전투와 재도전은 같은 입장 효과를 사용한다.
        this.equipmentEffects = { ...equipmentEffects };
        this.overdriveUnlocked = this.advanced || entry?.overdriveUnlocked === true;
        const initialDrive = this.advanced
            ? overdriveRules.capacity
            : this.overdriveUnlocked
                ? (entry?.initialOverdrive ?? 0)
                : 0;
        if (!Number.isFinite(initialDrive) ||
            initialDrive < 0 ||
            initialDrive > overdriveRules.capacity)
            throw new Error('입장 오버드라이브 게이지가 유효하지 않습니다.');
        this.initialDrive = initialDrive;
        this.maxHealth = isolatedPrototype
            ? battleRules.maxHealth
            : (entry?.playerMaxHp ?? battleRules.maxHealth);
        if (!Number.isSafeInteger(this.maxHealth) || this.maxHealth <= 0)
            throw new Error('입장 최대 체력이 유효하지 않습니다.');
        this.initialHealth = isolatedPrototype
            ? this.maxHealth
            : (entry?.playerHp ?? this.maxHealth);
        const attackBonus = isolatedPrototype ? 0 : (entry?.attackBonus ?? 0);
        if (!Number.isFinite(attackBonus))
            throw new Error('공격 보너스가 유효하지 않습니다.');
        this.attackBonus = Math.max(0, Math.floor(attackBonus));
        this.availableSkills = this.interactionLab
            ? [...skillOrder, ...elementSkillOrder]
            : this.advanced
                ? [...skillOrder]
                : entry?.unlockedSkills.includes('kick')
                    ? ['kick']
                    : [];
        const companion = entry?.companion;
        if (companion &&
            (companion.id !== 'yeonmuk' ||
                !Number.isSafeInteger(companion.maxHp) ||
                companion.maxHp <= 0 ||
                !Number.isSafeInteger(companion.hp) ||
                companion.hp < 0 ||
                companion.hp > companion.maxHp))
            throw new Error('동행 입장 체력이 유효하지 않습니다.');
        this.companionEntry = companion ? { ...companion } : undefined;
        this.reset();
    }
    reset() {
        this.interactions = this.interactionLab ? new ElementInteractions() : null;
        this.player = new Combatant({
            ...heroSpec,
            maxHealth: this.maxHealth,
            damage: heroSpec.damage + this.attackBonus,
        }, this.initialHealth);
        this.companion = this.companionEntry
            ? new Combatant({ ...yeonmukSpec, maxHealth: this.companionEntry.maxHp }, this.companionEntry.hp)
            : null;
        this.activeActorId = this.player.alive ? 0 : yeonmukRules.id;
        this.companionGuarding = false;
        this.protection.expire();
        this.enemyTargets.clear();
        this.enemies = this.enemySpecs.map((spec) => new Combatant(spec, spec.maxHealth - (this.initialEnemyDamage.get(spec.id) ?? 0)));
        this.monsterRoles = new MonsterRoles(this.enemySpecs);
        this.boss =
            this.encounter === 'trail-boss'
                ? new YetiBoss(this.enemies[0].spec.id)
                : null;
        const boar = this.enemies.find((enemy) => enemy.spec.kind === 'boar');
        this.boar = boar ? new ArmoredBoar(boar.spec.id) : null;
        const healer = this.enemies.find((enemy) => enemy.spec.kind === 'mushroom');
        this.healer = healer ? new MushroomHealer(healer.spec.id) : null;
        this.drive = new Overdrive();
        this.drive.setGaugeForDevelopment(this.initialDrive);
        this.rage = new Rage();
        this.drunken = new DrunkenFist();
        this.phase = 'command';
        this.phaseTime = 0;
        this.round = 1;
        this.energy = battleRules.maxEnergy;
        this.guarding = false;
        this.targetId = this.enemies[0]?.spec.id ?? null;
        this.action = null;
        this.barrage = null;
        this.returnMotion = null;
        this.enemyQueue = [];
        this.enemyDelay = 0;
        this.kickUsed = false;
        this.blockedEnemyId = null;
        this.hitStop = 0;
        this.impacts = [];
        this.healings = [];
        this.message = `${this.activeActorId === 0 ? '아타호' : '연묵'}의 차례. 사용할 행동을 골라보세요.`;
        this.planEnemyTargets();
        this.checkOutcome();
    }
    get snapshot() {
        const action = this.action?.snapshot ?? null;
        return {
            interactions: this.interactions?.snapshot ?? null,
            boss: this.boss?.snapshot ?? null,
            boar: this.boar?.snapshot ?? null,
            healer: this.healer?.snapshot ?? null,
            // 신규 지원형의 시전 표시는 역할의 기존 타이머가 아닌 실제 행동 수명을 따른다.
            monsterStates: this.monsterRoles.snapshot.map((monster) => ({
                ...monster,
                healingTargetId: action?.kind === 'monster-heal' && action.actorId === monster.enemyId
                    ? (action.targetIds[0] ?? null)
                    : null,
            })),
            advanced: this.advanced,
            overdriveUnlocked: this.overdriveUnlocked,
            availableSkills: this.activeActorId === yeonmukRules.id
                ? ['ward']
                : [...this.availableSkills],
            kickGuidance: this.activeActorId === 0 &&
                this.allowKickGuidance &&
                this.encounter === 'first-expedition' &&
                this.availableSkills.includes('kick') &&
                !this.kickUsed,
            blockedEnemyId: this.blockedEnemyId,
            phase: this.phase,
            phaseTime: this.phaseTime,
            round: this.round,
            player: this.player.snapshot,
            companion: this.companion?.snapshot ?? null,
            activeActorId: this.activeActorId,
            companionGuarding: this.companionGuarding,
            protectedId: this.protection.protectedId,
            enemyTargets: this.companion
                ? this.enemies
                    .filter((enemy) => enemy.alive && enemy !== this.healerCombatant)
                    .flatMap((enemy) => {
                    const target = this.enemyTarget(enemy.spec.id);
                    return target
                        ? [{ enemyId: enemy.spec.id, targetId: target.spec.id }]
                        : [];
                })
                : [],
            enemies: this.enemies.map((enemy) => enemy.snapshot),
            energy: this.energy,
            rage: this.rage.gauge,
            drunken: this.drunken.snapshot,
            guarding: this.guarding,
            guardDamageMultiplier: this.equipmentEffects.guardDamageMultiplier,
            basicAttackStaminaRecovery: 2 + this.equipmentEffects.basicAttackStaminaRecoveryBonus,
            targetId: this.targetId,
            overdrive: this.drive.snapshot,
            action,
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
        if (!this.overdriveUnlocked)
            return;
        // 한 번에 가득 차는 양보다 큰 입력은 먼저 제한해 곱셈 overflow도 넘기지 않는다.
        this.drive.charge(Math.min(overdriveRules.capacity, amount * this.equipmentEffects.overdriveChargeMultiplier));
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
        if (this.activeActorId === yeonmukRules.id)
            return this.commandCompanion(command, options);
        if (!this.player.alive)
            return false;
        if ((command === 'ultimate' && !this.advanced) ||
            (command === 'overdrive' && !this.overdriveUnlocked))
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
            const reduction = this.equipmentEffects.guardDamageMultiplier ===
                defaultEquipmentEffects.guardDamageMultiplier
                ? '절반으로'
                : `${guardReductionPercent(this.equipmentEffects.guardDamageMultiplier)}%`;
            this.finishPlayerTurn(`방어! 이번 적 차례의 피해를 ${reduction} 줄입니다.`);
            return true;
        }
        const skill = options.skill ?? 'tiger';
        if (skill === 'ward')
            return false;
        if (command === 'skill') {
            if (!this.availableSkills.includes(skill))
                return false;
            if (this.energy < battleSkills[skill].cost)
                return false;
            if (isElementSkill(skill)) {
                const center = options.areaCenter && clampSkillArea(options.areaCenter);
                const preview = this.previewInteractions({
                    command: 'skill',
                    skill,
                    areaCenter: center ?? undefined,
                });
                if (!preview ||
                    (preview.targetIds.length === 0 &&
                        skill !== 'fire-field' &&
                        preview.fieldMoves.length === 0))
                    return false;
                this.energy -= battleSkills[skill].cost;
                this.chargeDrive(overdriveRules.skillCharge);
                const origin = this.player.snapshot;
                this.action = new BattleAction({
                    kind: 'skill',
                    actorId: 0,
                    targetIds: preview.targetIds,
                    skill,
                    origin: { x: origin.x, z: origin.z },
                    destination: { x: origin.x, z: origin.z },
                    duration: turnAttackTimings.skill.duration,
                    contactTime: turnAttackTimings.skill.contactTime,
                    ...(preview.radius !== null ? { areaCenter: preview.center } : {}),
                });
                this.setPhase('player-action', `${battleSkills[skill].name}!`);
                return true;
            }
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
            if (skill === 'kick')
                this.kickUsed = true;
            this.setPhase('player-action', `${battleSkills[skill].name}!`);
        }
        else {
            this.energy = Math.min(battleRules.maxEnergy, this.energy + 2 + this.equipmentEffects.basicAttackStaminaRecoveryBonus);
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
        if (this.phase === 'enemy-turn') {
            this.healer?.update(dt);
            this.monsterRoles.update(dt);
        }
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
                    this.finishPlayerTurn('적의 차례');
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
                const completed = this.action.snapshot;
                if (completed.enemyMotion === 'boar')
                    this.boar?.finishCharge();
                this.settleDriveAction();
                this.action = null;
                if (this.phase === 'player-action')
                    this.finishPlayerTurn('적의 차례');
                else if (this.phase === 'enemy-turn')
                    this.enemyDelay = completed.kind === 'monster-heal' ? 0 : 0.22;
            }
            return;
        }
        if (this.phase === 'enemy-turn') {
            this.enemyDelay -= dt;
            if (this.enemyDelay > 0)
                return;
            this.blockedEnemyId = null;
            const id = this.enemyQueue.shift();
            if (id === undefined) {
                this.interactions?.finishTurn(this.snapshot.enemies);
                this.round++;
                if (this.advanced)
                    this.rage.beginTurn();
                this.guarding = false;
                this.companionGuarding = false;
                this.protection.expire();
                this.activeActorId = this.player.alive ? 0 : yeonmukRules.id;
                this.planEnemyTargets();
                this.ensureTarget();
                this.setPhase('command', this.activeActorId === yeonmukRules.id
                    ? '연묵의 차례. 사용할 행동을 골라보세요.'
                    : this.drive.ready && !this.drunken.active
                        ? '오버드라이브 준비 완료. 원하는 순간에 발동하세요.'
                        : '아타호의 차례. 다음 수를 골라보세요.');
            }
            else {
                const enemy = this.enemies.find((item) => item.spec.id === id && item.alive);
                if (enemy && this.interactions?.isFrozen(id)) {
                    this.blockedEnemyId = id;
                    this.message = `${enemy.spec.name}은 얼음에 묶여 행동하지 못합니다.`;
                    this.enemyDelay = 0.55;
                }
                else if (enemy?.consumeStagger()) {
                    const monsterInterrupted = this.monsterRoles.interrupt(id);
                    if (isMonsterId(enemy.spec.kind))
                        this.blockedEnemyId = id;
                    const healingInterrupted = this.healer?.snapshot.enemyId === id && this.healer.interrupt();
                    if (healingInterrupted)
                        this.blockedEnemyId = id;
                    const interrupted = this.boss?.snapshot.enemyId === id && this.boss.interrupt();
                    const boarInterrupted = this.boar?.snapshot.enemyId === id;
                    if (boarInterrupted) {
                        this.boar.interrupt();
                        this.blockedEnemyId = id;
                    }
                    if (this.encounter === 'first-expedition') {
                        // 적이 살아서 실제 차례를 건너뛸 때만 차단 결과를 표시한다.
                        this.blockedEnemyId = id;
                        this.message = `맹호각! ${enemy.spec.name}의 행동을 막았다.`;
                    }
                    else {
                        this.message = monsterInterrupted
                            ? `맹호각! ${enemy.spec.name}의 준비가 끊겼습니다.`
                            : boarInterrupted
                                ? '맹호각! 멧돼지가 균형을 잃었습니다. 갑옷의 빈틈을 노리세요!'
                                : healingInterrupted
                                    ? '맹호각! 버섯 정령의 회복 준비가 끊겼습니다.'
                                    : interrupted
                                        ? '맹호각에 예티의 강공격이 끊겼습니다! 다음 타격 피해 2배!'
                                        : `${enemy.spec.name}은 자세를 회복하느라 행동하지 못합니다.`;
                    }
                    this.enemyDelay = this.advanced ? 0.55 : 1;
                }
                else if (enemy) {
                    if (isMonsterId(enemy.spec.kind)) {
                        this.takeMonsterTurn(enemy);
                        return;
                    }
                    if (this.healer?.snapshot.enemyId === id) {
                        const turn = this.healer.beginTurn(this.enemies.map((ally) => ally.snapshot));
                        this.enemyDelay = turn.duration;
                        if (turn.kind === 'prepare')
                            this.message =
                                '버섯 정령이 회복을 준비합니다! 다음 차례에 동료를 회복합니다.';
                        else if (turn.kind === 'heal') {
                            const target = this.enemies.find((ally) => ally.spec.id === turn.targetId);
                            const amount = target.heal(turn.amount);
                            if (amount > 0) {
                                const point = target.snapshot;
                                this.healings.push({
                                    sourceId: id,
                                    targetId: target.spec.id,
                                    amount,
                                    x: point.x,
                                    z: point.z,
                                });
                                this.message = `버섯 정령이 ${target.spec.name}의 체력을 ${amount} 회복했습니다.`;
                            }
                        }
                        else
                            this.message = '버섯 정령이 주위를 살핍니다.';
                        return;
                    }
                    if (this.boss?.snapshot.enemyId === id) {
                        if (this.boss.nextAction() === 'prepare') {
                            this.message =
                                '예티가 힘을 모읍니다! 다음 차례 강공격 · 방어 또는 맹호각';
                            this.enemyDelay = yetiBossRules.preparationDuration;
                            return;
                        }
                        this.startEnemyAttack(enemy);
                        this.message = '예티의 강공격!';
                        return;
                    }
                    if (this.boar?.snapshot.enemyId === id) {
                        if (this.boar.nextAction() === 'prepare') {
                            this.message =
                                '멧돼지가 몸을 낮춥니다! 다음 차례 돌진 · 방어 또는 맹호각';
                            this.enemyDelay = armoredBoarRules.preparationDuration;
                            return;
                        }
                        this.startEnemyAttack(enemy);
                        this.message =
                            '갑옷 멧돼지의 돌진! 돌진 뒤 갑옷의 빈틈이 드러납니다.';
                        return;
                    }
                    this.startEnemyAttack(enemy);
                    this.message = `${enemy.spec.name}의 공격!`;
                }
            }
        }
    }
    takeMonsterTurn(enemy) {
        const turn = this.monsterRoles.takeTurn(enemy.spec.id, this.enemies.map((ally) => ally.snapshot));
        if (turn.kind === 'prepare') {
            this.enemyDelay = turn.duration;
            const role = isMonsterId(enemy.spec.kind)
                ? monsterDefinition(enemy.spec.kind).role
                : null;
            this.message =
                role === 'support'
                    ? `${enemy.spec.name}이 회복을 준비합니다! 다음 차례 동료 회복 · 맹호각으로 차단`
                    : `${enemy.spec.name}이 힘을 모읍니다! 다음 차례 강타 · 방어 또는 맹호각`;
        }
        else if (turn.kind === 'heal') {
            const target = this.enemies.find((ally) => ally.spec.id === turn.targetId && ally.alive);
            if (!target)
                return;
            this.startAction('monster-heal', enemy, [target], {
                healingAmount: turn.amount,
            });
            this.message = `${enemy.spec.name}이 ${target.spec.name}에게 회복을 시전합니다.`;
        }
        else {
            this.startEnemyAttack(enemy);
            this.message = `${enemy.spec.name}의 공격!`;
        }
    }
    clearDefeatedMonster(enemy) {
        if (enemy.alive || !isMonsterId(enemy.spec.kind))
            return;
        this.monsterRoles.interrupt(enemy.spec.id);
        this.healings = this.healings.filter((healing) => healing.sourceId !== enemy.spec.id);
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
            this.finishPlayerTurn('오버드라이브 종료. 이제 적의 차례입니다.');
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
        const power = this.monsterRoles.resolveDamage(target.spec.id, strike.damage);
        const damage = strike.final
            ? power
            : Math.min(power, Math.max(0, point.health - 1));
        const actual = target.hurt(damage);
        this.clearDefeatedMonster(target);
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
    allyById(id) {
        return id === 0
            ? this.player
            : id === yeonmukRules.id
                ? (this.companion ?? undefined)
                : undefined;
    }
    fighterById(id) {
        return (this.allyById(id) ??
            this.enemies.find((fighter) => fighter.spec.id === id));
    }
    get healerCombatant() {
        return this.enemies.find((enemy) => enemy.spec.id === this.healer?.snapshot.enemyId);
    }
    /** 예고된 강공격은 대상을 유지하고, 전투불능 때만 생존자로 바꾼다. */
    enemyTarget(enemyId) {
        const intended = this.allyById(this.enemyTargets.get(enemyId) ?? 0);
        return intended?.alive
            ? intended
            : ([this.player, this.companion].find((ally) => ally?.alive) ??
                undefined);
    }
    planEnemyTargets() {
        if (!this.companion)
            return;
        const living = [this.player, this.companion].filter((ally) => ally.alive);
        if (living.length === 0)
            return;
        let index = this.round - 1;
        for (const enemy of this.enemies) {
            if (!enemy.alive || enemy === this.healerCombatant)
                continue;
            const prepared = (enemy.spec.id === this.boss?.snapshot.enemyId &&
                this.boss.snapshot.ready) ||
                (enemy.spec.id === this.boar?.snapshot.enemyId &&
                    this.boar.snapshot.ready) ||
                this.monsterRoles.prepared(enemy.spec.id);
            const target = prepared
                ? this.enemyTarget(enemy.spec.id)
                : living[index++ % living.length];
            if (target)
                this.enemyTargets.set(enemy.spec.id, target.spec.id);
        }
    }
    startEnemyAttack(enemy) {
        const target = this.enemyTarget(enemy.spec.id);
        if (target)
            this.startAction('enemy', enemy, [target]);
    }
    commandCompanion(command, options) {
        const actor = this.companion;
        if (!actor?.alive)
            return false;
        if (command === 'guard') {
            this.companionGuarding = true;
            this.finishPlayerTurn('연묵이 방어합니다. 이번 적 차례 피해 절반.');
            return true;
        }
        if (command !== 'attack' &&
            !(command === 'skill' && options.skill === 'ward'))
            return false;
        const ward = command === 'skill';
        const target = ward
            ? this.allyById(options.allyTargetId ?? 0)
            : this.enemies.find((enemy) => enemy.spec.id === this.targetId && enemy.alive);
        if (!target?.alive)
            return false;
        const point = actor.snapshot;
        actor.face({
            x: target.snapshot.x - point.x,
            z: target.snapshot.z - point.z,
        });
        this.action = new BattleAction({
            kind: ward ? 'ward' : 'talisman',
            actorId: actor.spec.id,
            targetIds: [target.spec.id],
            origin: { x: point.x, z: point.z },
            destination: { x: point.x, z: point.z },
            duration: yeonmukRules.actionDuration,
            contactTime: yeonmukRules.contactTime,
        });
        this.setPhase('player-action', ward ? '연묵의 호신부!' : '연묵의 부적 날리기!');
        return true;
    }
    finishPlayerTurn(message) {
        if (this.activeActorId === 0) {
            this.drunken.endTurn();
            if (this.companion?.alive && this.enemies.some((enemy) => enemy.alive)) {
                this.activeActorId = yeonmukRules.id;
                this.setPhase('command', '연묵의 차례. 사용할 행동을 골라보세요.');
                this.ensureTarget();
                return;
            }
        }
        this.beginEnemyTurn(message);
    }
    beginEnemyTurn(message) {
        if (this.interactions) {
            this.applyInteractionDamage(this.interactions.settleFire(this.snapshot.enemies));
            this.interactions.pruneDead(this.snapshot.enemies);
            if (this.checkOutcome())
                return;
        }
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
        const chargingBoar = kind === 'enemy' && actor.spec.kind === 'boar';
        const monsterMotion = (kind === 'enemy' || kind === 'monster-heal') &&
            isMonsterId(actor.spec.kind)
            ? monsterAttackPlan(actor.spec.kind)
            : null;
        const approach = Math.max(0, distance - target.spec.radius - (rush ? heroSpec.radius + 0.12 : 0.55));
        let destination = {
            x: origin.x + (dx / distance) * approach,
            z: origin.z + (dz / distance) * approach,
        };
        if (options.areaCenter)
            destination = { ...options.areaCenter };
        if (monsterMotion?.mode === 'ranged')
            destination = { x: origin.x, z: origin.z };
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
            duration: monsterMotion?.duration ??
                turnAttack?.duration ??
                finisher?.duration ??
                (chargingBoar
                    ? armoredBoarRules.chargeDuration
                    : rush
                        ? overdriveRules.rushDuration
                        : 0.8 / battleRules.enemyActionSpeed),
            contactTime: monsterMotion?.contactTime ??
                turnAttack?.contactTime ??
                finisher?.contactTime ??
                (chargingBoar
                    ? armoredBoarRules.contactTime
                    : rush
                        ? overdriveRules.rushContactTime
                        : 0.36 / battleRules.enemyActionSpeed),
            ...(monsterMotion ? { monsterMotion } : {}),
            ...(options.healingAmount !== undefined
                ? { healingAmount: options.healingAmount }
                : {}),
            ...(kind === 'enemy' &&
                (actor.spec.kind === 'wolf' || actor.spec.kind === 'boar')
                ? { enemyMotion: actor.spec.kind }
                : {}),
            ...(options.skill ? { skill: options.skill } : {}),
            ...(options.areaCenter ? { areaCenter: { ...options.areaCenter } } : {}),
            ...(rush ? { driveBeat: this.drive.snapshot.chain + 1 } : {}),
            ...(options.driveFinisher
                ? { driveFinisher: options.driveFinisher }
                : {}),
        });
    }
    applyAction(action) {
        if (action.kind === 'monster-heal') {
            const caster = this.enemies.find((enemy) => enemy.spec.id === action.actorId && enemy.alive);
            const target = this.enemies.find((enemy) => enemy.spec.id === action.targetIds[0] && enemy.alive);
            if (!caster || !target)
                return;
            const amount = target.heal(action.healingAmount ?? 0);
            if (amount <= 0)
                return;
            const point = target.snapshot;
            this.healings.push({
                sourceId: caster.spec.id,
                targetId: target.spec.id,
                amount,
                x: point.x,
                z: point.z,
            });
            this.message = `${caster.spec.name}이 ${target.spec.name}의 체력을 ${amount} 회복했습니다.`;
            return;
        }
        if (action.skill && isElementSkill(action.skill) && this.interactions) {
            const context = this.interactionContext(action.targetIds[0] ?? null);
            this.applyInteractionOutcome(this.interactions.applySkill(context, action.skill, action.areaCenter));
            return;
        }
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
        if (action.kind === 'ward') {
            const target = this.allyById(action.targetIds[0] ?? NaN);
            if (target?.alive) {
                this.protection.protect(target.spec.id);
                this.message = `${target.spec.name}에게 호신부 · 다음 피격 1회 절반`;
            }
            return;
        }
        const actor = this.fighterById(action.actorId);
        if (!actor?.alive)
            return;
        const rush = action.kind === 'rush' || action.kind === 'finisher';
        const heavy = action.kind === 'skill' ||
            action.kind === 'finisher' ||
            (action.kind === 'enemy' &&
                (action.actorId === this.boss?.snapshot.enemyId ||
                    action.actorId === this.boar?.snapshot.enemyId ||
                    (isMonsterId(actor.spec.kind) &&
                        monsterDefinition(actor.spec.kind).role === 'charger')));
        const finisher = action.driveFinisher
            ? driveFinishers[action.driveFinisher]
            : null;
        const damage = finisher
            ? finisher.damage + this.attackBonus
            : action.kind === 'enemy'
                ? actor.spec.damage
                : action.kind === 'talisman'
                    ? actor.spec.damage
                    : action.kind === 'skill'
                        ? battleSkills[action.skill ?? 'tiger'].damage + this.attackBonus
                        : action.kind === 'rush'
                            ? battleRules.rushDamage + this.attackBonus
                            : this.player.spec.damage;
        const hit = this.advanced && actor === this.player && !rush
            ? this.drunken.resolveHit(damage, {
                skill: action.kind === 'skill',
                roll: this.random(),
            })
            : { damage, critical: false };
        let connected = false;
        for (const id of action.targetIds) {
            const target = this.fighterById(id);
            if (!target?.alive)
                continue;
            const point = target.snapshot;
            const ally = this.allyById(id);
            const guarded = !!ally &&
                ((id === 0 ? this.guarding : this.companionGuarding) ||
                    this.protection.protectedId === id);
            const guardMultiplier = id === 0 && this.guarding
                ? this.equipmentEffects.guardDamageMultiplier
                : id === yeonmukRules.id && this.companionGuarding
                    ? yeonmukRules.guardMultiplier
                    : 1;
            const protectedBefore = this.protection.protectedId === id;
            const guardedDamage = ally
                ? this.protection.resolve(id, hit.damage, guardMultiplier)
                : hit.damage;
            // 보호 판정의 실제 소모만 화면에 알린다. 방어와 시간 만료는 발동 이펙트가 아니다.
            const wardTriggered = protectedBefore && this.protection.protectedId !== id;
            // 양수 피격에만 최소 피해를 적용한다. 미발생·회피·무적 피해를 만들지 않는다.
            const receivedDamage = id === 0 && guardedDamage > 0
                ? Math.max(1, guardedDamage - this.equipmentEffects.damageReduction)
                : id === this.boar?.snapshot.enemyId
                    ? rush
                        ? this.boar.receiveOverdriveDamage(guardedDamage)
                        : this.boar.receiveDamage(guardedDamage)
                    : !rush &&
                        id === this.boss?.snapshot.enemyId &&
                        !!this.allyById(actor.spec.id)
                        ? this.boss.receiveDamage(guardedDamage)
                        : guardedDamage;
            const actual = target.hurt(rush
                ? this.monsterRoles.resolveOverdriveDamage(id, receivedDamage)
                : this.monsterRoles.resolveDamage(id, receivedDamage));
            this.clearDefeatedMonster(target);
            if (!target.alive && target.spec.id === this.healer?.snapshot.enemyId) {
                this.healer.interrupt();
                this.healings = [];
            }
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
                ...(wardTriggered
                    ? { partyEffect: 'ward-trigger' }
                    : action.kind === 'talisman'
                        ? { partyEffect: 'talisman-hit' }
                        : {}),
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
        // 죽은 적을 밀어 충돌시키지는 않지만 얼음 파괴는 일반 타격에 의해 성립한다.
        if (action.kind === 'attack' && actor === this.player && this.interactions)
            this.applyInteractionOutcome(this.interactions.strike(this.interactionContext(action.targetIds[0] ?? null)));
        this.interactions?.pruneDead(this.snapshot.enemies);
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
        this.interactions?.pruneDead(this.snapshot.enemies);
        const healerId = this.healer?.snapshot.enemyId;
        if (healerId !== undefined &&
            !this.enemies.some((enemy) => enemy.spec.id === healerId && enemy.alive)) {
            this.healer?.interrupt();
            this.healings = [];
        }
        const partyAlive = this.player.alive || this.companion?.alive === true;
        if (partyAlive && this.enemies.some((enemy) => enemy.alive))
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
        this.healer?.interrupt();
        this.setPhase(partyAlive ? 'victory' : 'defeat', partyAlive
            ? '산길이 다시 조용해졌습니다.'
            : this.encounter.startsWith('trail-') ||
                this.encounter === 'mushroom-grove'
                ? '원정을 마치고 마을로 돌아갑니다.'
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
        // 비정상적으로 큰 유한 배율도 충돌 검사를 무한히 반복하지 않도록 전장 대각선까지만 이동한다.
        const distance = Math.min(battleRules.speed *
            this.equipmentEffects.overdriveMovementMultiplier *
            dt, Math.hypot(battleRules.width, battleRules.depth));
        const steps = Math.ceil(distance / 0.05);
        for (let step = 0; step < steps; step++) {
            const point = this.player.snapshot;
            const nextX = {
                x: point.x + (move.x * distance) / steps,
                z: point.z,
            };
            if (this.canWalk(nextX))
                this.player.moveTo(nextX);
            const nextZ = {
                x: this.player.snapshot.x,
                z: this.player.snapshot.z + (move.z * distance) / steps,
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
        if (this.companion?.alive &&
            Math.hypot(point.x - this.companion.snapshot.x, point.z - this.companion.snapshot.z) <
                heroSpec.radius + this.companion.spec.radius)
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
    interactionContext(targetId = this.targetId) {
        return {
            enemies: this.snapshot.enemies,
            player: this.player.snapshot,
            targetId,
            space: battleRules,
        };
    }
    previewInteractions(options) {
        if (!this.interactions ||
            this.phase !== 'command' ||
            this.activeActorId !== 0)
            return null;
        if (options.command === 'attack')
            return this.interactions.preview(this.interactionContext(), {
                action: 'attack',
            });
        if (!options.skill || !isElementSkill(options.skill))
            return null;
        return this.interactions.preview(this.interactionContext(), {
            action: options.skill,
            areaCenter: options.areaCenter,
        });
    }
    applyInteractionOutcome(outcome) {
        for (const move of outcome.moves) {
            const enemy = this.enemies.find((target) => target.spec.id === move.enemyId);
            enemy?.moveTo(move.to);
            enemy?.stop();
        }
        this.applyInteractionDamage(outcome.damage);
        this.interactions?.pruneDead(this.snapshot.enemies);
    }
    applyInteractionDamage(effects) {
        for (const effect of effects) {
            const enemy = this.enemies.find((target) => target.spec.id === effect.enemyId);
            if (!enemy?.alive)
                continue;
            const point = enemy.snapshot;
            const actual = enemy.hurt(this.monsterRoles.resolveDamage(enemy.spec.id, effect.damage));
            this.clearDefeatedMonster(enemy);
            if (actual <= 0)
                continue;
            this.impacts.push({
                x: point.x,
                z: point.z,
                targetId: enemy.spec.id,
                damage: actual,
                heavy: false,
                defeated: !enemy.alive,
                guarded: false,
                aim: { x: 0, z: 0 },
                interaction: effect.cause,
            });
        }
    }
    takeInteractionEvents() {
        return this.interactions?.takeEvents() ?? [];
    }
    takeImpacts() {
        const events = this.impacts;
        this.impacts = [];
        return events;
    }
    takeHealings() {
        const events = this.healings;
        this.healings = [];
        return events;
    }
}
