export const yeonmukRules = {
    id: -1,
    maxHealth: 120,
    attackDamage: 20,
    guardMultiplier: 0.5,
    actionDuration: 0.65,
    contactTime: 0.36,
};
export const yeonmukSpec = {
    id: yeonmukRules.id,
    kind: 'yeonmuk',
    name: '연묵',
    maxHealth: yeonmukRules.maxHealth,
    damage: yeonmukRules.attackDamage,
    radius: 0.28,
    home: { x: -4.6, z: -0.8 },
};
/** 이번 적 차례의 단 한 번 피격만 보호한다. 방어와는 강한 효과 하나만 적용한다. */
export class ProtectionTalisman {
    targetId = null;
    get protectedId() {
        return this.targetId;
    }
    protect(targetId) {
        this.targetId = targetId;
    }
    resolve(targetId, damage, guardMultiplier) {
        const protectedHit = this.targetId === targetId && damage > 0;
        if (protectedHit)
            this.targetId = null;
        return Math.ceil(damage *
            (protectedHit
                ? Math.min(guardMultiplier, yeonmukRules.guardMultiplier)
                : guardMultiplier));
    }
    expire() {
        this.targetId = null;
    }
}
