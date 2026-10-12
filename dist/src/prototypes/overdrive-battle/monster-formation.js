import { isMonsterId, monsterDefinition, } from './monster-catalog.js';
const positions = [
    { x: 0.3, z: 1.7 },
    { x: 2.7, z: -0.3 },
    { x: 0.6, z: -2.4 },
    { x: 4.6, z: 1.7 },
];
/** 독립 전투의 배치만 만든다. 원정의 적 목록·저장·난이도는 변경하지 않는다. */
export function monsterFormation(ids) {
    if (!Array.isArray(ids) ||
        ids.length < 1 ||
        ids.length > positions.length ||
        !ids.every(isMonsterId))
        throw new Error('몬스터 편성은 등록된 몬스터 1~4종이어야 합니다.');
    return ids.map((id, index) => {
        const definition = monsterDefinition(id);
        return {
            id: index + 1,
            name: definition.name,
            kind: id,
            maxHealth: definition.hp,
            damage: definition.damage,
            radius: definition.radius,
            home: { ...positions[index] },
        };
    });
}
