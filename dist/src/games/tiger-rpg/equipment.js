export const equipmentIds = [
    'spirit',
    'focus',
    'ward',
    'ironwall',
    'tiger-tag',
];
export const equipmentSlots = ['charm', 'bracer'];
export const equipmentDefinitions = {
    'tiger-tag': {
        name: '호랑이 나무패',
        slot: 'charm',
        craftCost: { wood: 6, stone: 3 },
        refineCost: { wood: 5, stone: 4 },
        requiresOverdrive: true,
        iconPath: '/src/games/tiger-rpg/tiger-tag-icon.svg',
        descriptions: {
            1: '오버드라이브 직접 이동속도 +25%.',
            2: '오버드라이브 직접 이동속도 +40%.',
        },
    },
    spirit: {
        name: '기세 부적',
        slot: 'charm',
        craftCost: { wood: 4, stone: 2 },
        refineCost: { wood: 4, stone: 3 },
        requiresOverdrive: true,
        iconPath: '/public/assets/maplestory/equipment-icons-ai/icons/spirit.png',
        descriptions: {
            1: '오버드라이브 충전량 +40%.',
            2: '오버드라이브 충전량 +50%.',
        },
    },
    focus: {
        name: '집중 부적',
        slot: 'charm',
        craftCost: { wood: 3, stone: 2 },
        refineCost: { wood: 4, stone: 3 },
        requiresOverdrive: false,
        iconPath: '/public/assets/maplestory/equipment-icons-ai/icons/focus.png',
        descriptions: {
            1: '전투 기본공격의 기력 회복 2 → 3.',
            2: '전투 기본공격의 기력 회복 2 → 4.',
        },
    },
    ward: {
        name: '호신 아대',
        slot: 'bracer',
        craftCost: { wood: 2, stone: 4 },
        refineCost: { wood: 3, stone: 5 },
        requiresOverdrive: false,
        iconPath: '/public/assets/maplestory/equipment-icons-ai/icons/ward.png',
        descriptions: {
            1: '방어한 적 턴에 받는 피해 65% 감소.',
            2: '방어한 적 턴에 받는 피해 75% 감소.',
        },
    },
    ironwall: {
        name: '철벽 아대',
        slot: 'bracer',
        craftCost: { wood: 2, stone: 5 },
        refineCost: { wood: 3, stone: 5 },
        requiresOverdrive: false,
        iconPath: '/public/assets/maplestory/equipment-icons-ai/icons/ironwall.png',
        descriptions: {
            1: '전투에서 받는 피해 -1 · 최종 피해 최소 1.',
            2: '전투에서 받는 피해 -2 · 최종 피해 최소 1.',
        },
    },
};
export const defaultEquipmentEffects = {
    overdriveChargeMultiplier: 1,
    overdriveMovementMultiplier: 1,
    basicAttackStaminaRecoveryBonus: 0,
    guardDamageMultiplier: 0.5,
    damageReduction: 0,
};
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function isEquipmentId(value) {
    return equipmentIds.some((id) => id === value);
}
export function isEquipmentSlot(value) {
    return equipmentSlots.some((slot) => slot === value);
}
/** 장비 필드만 정리해 정상 자원·시설·원정 완료 기록은 보존한다. */
export function parseEquipment(value, legacyCharms) {
    if (value === undefined)
        return migrateCharms(legacyCharms);
    const owned = {};
    const equipped = {
        charm: null,
        bracer: null,
    };
    if (!isRecord(value))
        return { owned, equipped };
    if (isRecord(value.owned)) {
        for (const id of equipmentIds) {
            const grade = value.owned[id];
            if (grade === 1 || grade === 2)
                owned[id] = grade;
        }
    }
    if (isRecord(value.equipped)) {
        for (const slot of equipmentSlots) {
            const id = value.equipped[slot];
            if (isEquipmentId(id) &&
                owned[id] !== undefined &&
                equipmentDefinitions[id].slot === slot)
                equipped[slot] = id;
        }
    }
    return { owned, equipped };
}
/** 기존 단일 슬롯의 실제 장착만 옮기며 다른 보유품을 자동으로 채우지 않는다. */
function migrateCharms(value) {
    const owned = {};
    const equipped = {
        charm: null,
        bracer: null,
    };
    if (!isRecord(value) || !Array.isArray(value.owned))
        return { owned, equipped };
    if (value.owned.includes('ward'))
        owned.ward = 1;
    if (value.owned.includes('spirit'))
        owned.spirit = 2;
    const id = value.equipped;
    if ((id === 'ward' || id === 'spirit') && owned[id] !== undefined)
        equipped[equipmentDefinitions[id].slot] = id;
    return { owned, equipped };
}
export function equipmentLoadout(state) {
    const clean = parseEquipment(state);
    const item = (slot) => {
        const id = clean.equipped[slot];
        const grade = id === null ? undefined : clean.owned[id];
        return id !== null && grade !== undefined ? { id, grade } : null;
    };
    return { charm: item('charm'), bracer: item('bracer') };
}
export function copyEquipmentLoadout(loadout) {
    return {
        charm: loadout.charm ? { ...loadout.charm } : null,
        bracer: loadout.bracer ? { ...loadout.bracer } : null,
    };
}
export function equipmentEffects(loadout) {
    const effects = { ...defaultEquipmentEffects };
    for (const slot of equipmentSlots) {
        const item = loadout[slot];
        if (!item)
            continue;
        switch (item.id) {
            case 'tiger-tag':
                effects.overdriveMovementMultiplier = item.grade === 2 ? 1.4 : 1.25;
                break;
            case 'spirit':
                effects.overdriveChargeMultiplier = item.grade === 2 ? 1.5 : 1.4;
                break;
            case 'focus':
                effects.basicAttackStaminaRecoveryBonus = item.grade;
                break;
            case 'ward':
                effects.guardDamageMultiplier = item.grade === 2 ? 0.25 : 0.35;
                break;
            case 'ironwall':
                effects.damageReduction = item.grade;
                break;
        }
    }
    return effects;
}
export function equipmentName(item) {
    return `${equipmentDefinitions[item.id].name} · ${item.grade === 2 ? '정제 ★★' : '일반 ★'}`;
}
export function equipmentDescription(id, grade) {
    return equipmentDefinitions[id].descriptions[grade];
}
function materialReason(materials, cost) {
    return materials.wood < cost.wood || materials.stone < cost.stone
        ? `목재 ${cost.wood}개와 돌 ${cost.stone}개가 필요합니다.`
        : null;
}
export function equipmentCraftReason(id, state) {
    if (state.equipment.owned[id] !== undefined)
        return '이미 제작해 보유한 장비입니다.';
    if (state.facilities.smithy < 1)
        return '대장간 Lv.1부터 제작할 수 있어요.';
    const definition = equipmentDefinitions[id];
    if (id === 'tiger-tag' && state.tigerTagUnlocked !== true)
        return '버섯숲 원정을 처음 완료하면 제작할 수 있어요.';
    if (definition.requiresOverdrive &&
        (state.facilities.dojo < 2 || !state.overdriveUnlocked))
        return '도장 Lv.2에서 오버드라이브를 해금하면 제작할 수 있어요.';
    return materialReason(state.materials, definition.craftCost);
}
export function equipmentRefineReason(id, state) {
    const grade = state.equipment.owned[id];
    if (grade === undefined)
        return '먼저 일반 장비를 제작해 주세요.';
    if (grade === 2)
        return '이미 정제 ★★ 등급입니다.';
    if (state.facilities.smithy < 2)
        return '대장간 Lv.2부터 강화할 수 있어요.';
    return materialReason(state.materials, equipmentDefinitions[id].refineCost);
}
