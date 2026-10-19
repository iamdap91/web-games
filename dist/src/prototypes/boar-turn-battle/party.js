export const PARTY_ORDER = ['ataho', 'yeonmuk', 'biwol'];
export const PARTY_MEMBERS = {
    ataho: {
        id: 'ataho',
        name: '아타호',
        maxHp: 120,
        role: '균형 압박',
        actions: ['attack', 'heavy', 'guard'],
        attack: { name: '권격', damage: 20, physical: true },
    },
    yeonmuk: {
        id: 'yeonmuk',
        name: '연묵',
        maxHp: 90,
        role: '속성·파티 보호',
        actions: ['attack', 'element', 'ward', 'guard'],
        attack: { name: '묵탄', damage: 16, physical: false },
    },
    biwol: {
        id: 'biwol',
        name: '비월',
        maxHp: 100,
        role: '붕괴 마무리',
        actions: ['attack', 'element', 'finish', 'guard'],
        attack: { name: '검격', damage: 22, physical: true },
    },
};
