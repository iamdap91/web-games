/** 지역 배치 v1에서 서쪽/동쪽 큰 나무의 영구 식별자. 배치 변경 시 보존한다. */
const clearingTreeIds = [7, 11];
export const streamLootIds = [0, 1, 2, 3];
export function createClearingProgress() {
    return {
        version: 1,
        springOpened: false,
        flowerBankReached: false,
        fallenTrees: [],
        claimedLoot: [],
    };
}
export function isClearingTreeId(id) {
    return clearingTreeIds.some((treeId) => treeId === id);
}
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isFallenTree(value) {
    if (!isRecord(value) ||
        typeof value.id !== 'number' ||
        !isClearingTreeId(value.id))
        return false;
    const direction = value.direction;
    return (isRecord(direction) &&
        typeof direction.x === 'number' &&
        typeof direction.z === 'number' &&
        Number.isFinite(direction.x) &&
        Number.isFinite(direction.z) &&
        Math.abs(Math.hypot(direction.x, direction.z) - 1) < 1e-6);
}
/** 전체 저장을 소유한 호출자가 JSON을 검증할 때 사용한다. */
export function isClearingProgress(value) {
    if (!isRecord(value) ||
        value.version !== 1 ||
        typeof value.springOpened !== 'boolean' ||
        typeof value.flowerBankReached !== 'boolean' ||
        !Array.isArray(value.fallenTrees) ||
        !Array.isArray(value.claimedLoot))
        return false;
    const trees = value.fallenTrees;
    const claims = value.claimedLoot;
    return (trees.length <= clearingTreeIds.length &&
        trees.every(isFallenTree) &&
        new Set(trees.map((tree) => tree.id)).size === trees.length &&
        claims.length <= streamLootIds.length &&
        claims.every((id) => streamLootIds.some((lootId) => lootId === id)) &&
        new Set(claims).size === claims.length &&
        (value.springOpened || claims.length === 0));
}
