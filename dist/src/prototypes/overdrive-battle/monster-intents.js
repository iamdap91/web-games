import { monsterRoleNames } from './monster-catalog.js';
import { armoredBoarRules } from './armored-boar.js';
/** 실제 역할 상태를 이름표에 표현하며 새 행동 판정을 만들지 않는다. */
export function monsterIntentLabel(monster, state) {
    // 적 차례에 준비를 소모하기 전에도 맹호각 적중 직후부터 차단을 안내한다.
    if (state.blockedEnemyId === monster.enemyId ||
        state.enemies.some((enemy) => enemy.id === monster.enemyId && enemy.staggered))
        return '행동 차단';
    const attacking = state.action?.kind === 'enemy' && state.action.actorId === monster.enemyId;
    if (monster.role === 'charger') {
        if (attacking)
            return '강타!';
        if (monster.ready)
            return '다음: 강타 · 방어/맹호각';
        return monster.exposed ? '빈틈! 다음 타격 2배' : '다음: 힘 모으기';
    }
    if (monster.role === 'support') {
        if (monster.healingTargetId !== null) {
            const target = state.enemies.find((ally) => ally.id === monster.healingTargetId);
            return `${target?.name ?? '동료'} 회복!`;
        }
        return monster.ready
            ? '다음: 동료 회복 · 맹호각'
            : '다친 동료 회복 · 없으면 공격';
    }
    if (monster.role === 'armored')
        return `갑옷 · 피해 −${Math.round((1 - armoredBoarRules.armorMultiplier) * 100)}%`;
    return `${monsterRoleNames[monster.role]} · 공격`;
}
