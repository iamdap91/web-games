import { areaSkillRadius } from './battle-skills.js';
import { planDisplacements, } from './battle-displacement.js';
export const elementRules = {
    freezeTurns: 3,
    shardRadius: 2.2,
    shardDamage: 12,
    windDistance: 2.2,
    strikeDistance: 1.6,
    collisionDamage: 10,
    emberTurns: 3,
    spreadTurns: 2,
    emberDamage: 6,
    spreadRadius: 1.6,
    spreadLimit: 2,
    fieldTurns: 3,
    fieldDamage: 8,
    fieldLimit: 3,
    spreadFieldRadius: 0.65,
};
function pointOf(point) {
    return { x: point.x, z: point.z };
}
function distance(a, b) {
    return Math.hypot(a.x - b.x, a.z - b.z);
}
function clampField(point, radius, space) {
    return {
        x: Math.max(-space.width / 2 + radius, Math.min(space.width / 2 - radius, point.x)),
        z: Math.max(-space.depth / 2 + radius, Math.min(space.depth / 2 - radius, point.z)),
    };
}
function windPoint(from, direction, space, radius, gather) {
    const length = Math.hypot(direction.x, direction.z);
    if (!length)
        return pointOf(from);
    const amount = gather
        ? Math.min(elementRules.windDistance, length)
        : elementRules.windDistance;
    return clampField({
        x: from.x + (direction.x / length) * amount,
        z: from.z + (direction.z / length) * amount,
    }, radius, space);
}
function planWindFields(state, moves, spread) {
    const fields = state.fields.map((field) => ({
        fieldId: field.id,
        center: pointOf(moves.find((move) => move.fieldId === field.id)?.to ?? field.center),
        radius: field.radius,
        remainingTurns: field.remainingTurns,
        canSpread: field.id === spread?.sourceId ? false : field.canSpread,
    }));
    if (spread) {
        if (fields.length >= elementRules.fieldLimit)
            fields.shift();
        fields.push({
            fieldId: null,
            center: pointOf(spread.center),
            radius: spread.radius,
            remainingTurns: elementRules.spreadTurns,
            canSpread: false,
        });
    }
    const merged = [];
    for (const field of fields) {
        const index = merged.findIndex((other) => distance(other.center, field.center) < other.radius + field.radius);
        if (index < 0)
            merged.push(field);
        else {
            const other = merged[index];
            merged[index] = {
                ...other,
                remainingTurns: Math.max(other.remainingTurns, field.remainingTurns),
                canSpread: other.canSpread || field.canSpread,
            };
        }
    }
    return merged;
}
/** 상태는 바꾸지 않고 실행에서도 사용하는 같은 이동·대상 판정을 제공한다. */
export function previewElementAction(context, state, request) {
    const living = context.enemies.filter((enemy) => enemy.health > 0);
    const target = (request.action === 'attack' ? context.enemies : living).find((enemy) => enemy.id === context.targetId);
    const radius = request.action === 'attack' ? null : areaSkillRadius(request.action);
    const requestedCenter = radius === null
        ? target
            ? pointOf(target)
            : null
        : (request.areaCenter ?? null);
    if (!requestedCenter ||
        !Number.isFinite(requestedCenter.x) ||
        !Number.isFinite(requestedCenter.z))
        return null;
    const center = request.action === 'fire-field'
        ? clampField(requestedCenter, radius, context.space)
        : requestedCenter;
    if (!Number.isFinite(center.x) || !Number.isFinite(center.z))
        return null;
    const targets = radius === null
        ? target
            ? [target]
            : []
        : living.filter((enemy) => distance(enemy, center) <= radius);
    const gather = request.action === 'wind-gather';
    const wind = gather || request.action === 'wind-push';
    const moving = wind || request.action === 'attack';
    const moves = moving
        ? planDisplacements(context.enemies, context.player, targets.map((enemy) => {
            const direction = gather
                ? { x: center.x - enemy.x, z: center.z - enemy.z }
                : { x: enemy.x - context.player.x, z: enemy.z - context.player.z };
            return {
                enemyId: enemy.id,
                direction,
                distance: request.action === 'attack'
                    ? elementRules.strikeDistance
                    : gather
                        ? Math.min(elementRules.windDistance, Math.hypot(direction.x, direction.z))
                        : elementRules.windDistance,
            };
        }), context.space)
        : [];
    const shardTargetIds = request.action === 'attack' &&
        target &&
        state.frozen.some((entry) => entry.enemyId === target.id)
        ? living
            .filter((enemy) => enemy.id !== target.id &&
            distance(enemy, target) <= elementRules.shardRadius)
            .map((enemy) => enemy.id)
        : [];
    const collisionPairs = [];
    if (request.action === 'attack')
        for (const move of moves) {
            if (move.blockedBy?.kind === 'enemy')
                collisionPairs.push([move.enemyId, move.blockedBy.enemyId]);
        }
    const after = living.map((enemy) => ({
        ...enemy,
        ...(moves.find((move) => move.enemyId === enemy.id)?.to ?? {}),
    }));
    const spreadSourceIds = [];
    const spreadTargetIds = [];
    if (wind)
        for (const source of state.embers) {
            if (!source.canSpread ||
                !targets.some((enemy) => enemy.id === source.enemyId))
                continue;
            const sourcePoint = after.find((enemy) => enemy.id === source.enemyId);
            if (!sourcePoint)
                continue;
            const nearby = after
                .filter((enemy) => enemy.id !== source.enemyId &&
                !state.embers.some((ember) => ember.enemyId === enemy.id) &&
                !spreadTargetIds.includes(enemy.id) &&
                distance(enemy, sourcePoint) <= elementRules.spreadRadius)
                .sort((a, b) => distance(a, sourcePoint) - distance(b, sourcePoint) || a.id - b.id);
            const additions = nearby.slice(0, elementRules.spreadLimit - spreadTargetIds.length);
            if (additions.length > 0) {
                spreadSourceIds.push(source.enemyId);
                spreadTargetIds.push(...additions.map((enemy) => enemy.id));
            }
        }
    const fieldMoves = [];
    if (wind)
        for (const field of state.fields) {
            if (distance(field.center, center) >
                (gather ? radius : elementRules.spreadRadius) + field.radius)
                continue;
            const direction = gather
                ? { x: center.x - field.center.x, z: center.z - field.center.z }
                : { x: center.x - context.player.x, z: center.z - context.player.z };
            fieldMoves.push({
                fieldId: field.id,
                from: pointOf(field.center),
                to: windPoint(field.center, direction, context.space, field.radius, gather),
            });
        }
    let spreadField = null;
    for (const move of fieldMoves) {
        const field = state.fields.find((entry) => entry.id === move.fieldId);
        if (!field.canSpread)
            continue;
        const direction = {
            x: move.to.x - move.from.x,
            z: move.to.z - move.from.z,
        };
        const length = Math.hypot(direction.x, direction.z);
        if (!length)
            continue;
        const radius = elementRules.spreadFieldRadius;
        const offset = field.radius + radius + 0.1;
        const candidate = clampField({
            x: move.to.x + (direction.x / length) * offset,
            z: move.to.z + (direction.z / length) * offset,
        }, radius, context.space);
        if (state.fields.every((other) => distance(candidate, fieldMoves.find((item) => item.fieldId === other.id)?.to ??
            other.center) >=
            radius + other.radius)) {
            spreadField = { center: candidate, radius, sourceId: field.id };
            break;
        }
    }
    return {
        action: request.action,
        movementRequiresSurvival: request.action === 'attack',
        targetIds: targets.map((enemy) => enemy.id),
        center: pointOf(center),
        radius,
        moves,
        shardTargetIds,
        collisionPairs,
        spreadSourceIds,
        spreadTargetIds,
        fieldMoves,
        fieldResults: wind ? planWindFields(state, fieldMoves, spreadField) : [],
        spreadField,
    };
}
/** 일반 턴의 상태·수명과 한 번만 발생하는 조합을 소유한다. */
export class ElementInteractions {
    frozen = new Map();
    embers = new Map();
    fields = [];
    nextFieldId = 1;
    events = [];
    get snapshot() {
        return {
            frozen: [...this.frozen].map(([enemyId, remainingTurns]) => ({
                enemyId,
                remainingTurns,
            })),
            embers: [...this.embers].map(([enemyId, state]) => ({
                enemyId,
                ...state,
            })),
            fields: this.fields.map((field) => ({
                ...field,
                center: pointOf(field.center),
            })),
        };
    }
    isFrozen(enemyId) {
        return this.frozen.has(enemyId);
    }
    preview(context, request) {
        return previewElementAction(context, this.snapshot, request);
    }
    applySkill(context, skill, areaCenter) {
        const preview = this.preview(context, { action: skill, areaCenter });
        if (!preview)
            return { moves: [], damage: [] };
        if (skill === 'ice' || skill === 'ember') {
            for (const enemyId of preview.targetIds) {
                if (skill === 'ice')
                    this.frozen.set(enemyId, elementRules.freezeTurns);
                else
                    this.embers.set(enemyId, {
                        remainingTurns: elementRules.emberTurns,
                        canSpread: true,
                    });
            }
            this.emit(skill === 'ice' ? 'freeze' : 'ignite', preview.center, preview.targetIds);
        }
        else if (skill === 'fire-field') {
            this.placeField(clampField(preview.center, areaSkillRadius(skill), context.space), areaSkillRadius(skill), elementRules.fieldTurns, true);
        }
        else {
            this.recordMoves(preview.moves);
            for (const enemyId of preview.spreadSourceIds)
                this.embers.get(enemyId).canSpread = false;
            for (const enemyId of preview.spreadTargetIds)
                this.embers.set(enemyId, {
                    remainingTurns: elementRules.spreadTurns,
                    canSpread: false,
                });
            if (preview.spreadTargetIds.length)
                this.emit('spread', preview.center, preview.spreadTargetIds);
            for (const move of preview.fieldMoves)
                this.events.push({
                    kind: 'displace',
                    point: pointOf(move.to),
                    enemyIds: [],
                    from: move.from,
                    to: move.to,
                    fieldId: move.fieldId,
                });
            this.fields = preview.fieldResults.map((field) => {
                const id = field.fieldId ?? this.nextFieldId++;
                if (field.fieldId === null)
                    this.events.push({
                        kind: 'field',
                        point: pointOf(field.center),
                        enemyIds: [],
                        fieldId: id,
                    });
                return {
                    id,
                    center: pointOf(field.center),
                    radius: field.radius,
                    remainingTurns: field.remainingTurns,
                    canSpread: field.canSpread,
                };
            });
        }
        return { moves: preview.moves, damage: [] };
    }
    strike(context) {
        const preview = this.preview(context, { action: 'attack' });
        if (!preview)
            return { moves: [], damage: [] };
        const damage = [];
        const targetId = preview.targetIds[0];
        if (targetId !== undefined && this.frozen.delete(targetId)) {
            this.emit('shatter', preview.center, [
                targetId,
                ...preview.shardTargetIds,
            ]);
            damage.push(...preview.shardTargetIds.map((enemyId) => ({
                enemyId,
                damage: elementRules.shardDamage,
                cause: 'ice-shards',
            })));
        }
        this.recordMoves(preview.moves);
        const damaged = new Set();
        const pairs = new Set();
        for (const pair of preview.collisionPairs) {
            const key = [...pair].sort((a, b) => a - b).join(':');
            if (pairs.has(key))
                continue;
            pairs.add(key);
            this.emit('collision', preview.moves.find((move) => move.enemyId === pair[0]).to, pair);
            for (const enemyId of pair)
                if (!damaged.has(enemyId)) {
                    damaged.add(enemyId);
                    damage.push({
                        enemyId,
                        damage: elementRules.collisionDamage,
                        cause: 'collision',
                    });
                }
        }
        return { moves: preview.moves, damage };
    }
    settleFire(enemies) {
        const damage = [];
        for (const enemy of enemies) {
            if (enemy.health <= 0)
                continue;
            const burning = this.embers.has(enemy.id);
            const inField = this.fields.some((field) => distance(enemy, field.center) <= field.radius);
            const amount = inField
                ? elementRules.fieldDamage
                : burning
                    ? elementRules.emberDamage
                    : 0;
            if (amount === 0)
                continue;
            damage.push({ enemyId: enemy.id, damage: amount, cause: 'fire' });
            this.emit('tick', enemy, [enemy.id]);
        }
        return damage;
    }
    finishTurn(enemies) {
        for (const [enemyId, turns] of this.frozen) {
            if (turns > 1)
                this.frozen.set(enemyId, turns - 1);
            else {
                this.frozen.delete(enemyId);
                this.emit('expire', enemies.find((enemy) => enemy.id === enemyId) ?? { x: 0, z: 0 }, [enemyId]);
            }
        }
        for (const [enemyId, state] of this.embers) {
            if (state.remainingTurns > 1)
                state.remainingTurns--;
            else {
                this.embers.delete(enemyId);
                this.emit('expire', enemies.find((enemy) => enemy.id === enemyId) ?? { x: 0, z: 0 }, [enemyId]);
            }
        }
        for (const field of this.fields)
            if (field.remainingTurns === 1)
                this.events.push({
                    kind: 'expire',
                    point: pointOf(field.center),
                    enemyIds: [],
                    fieldId: field.id,
                });
        this.fields = this.fields
            .filter((field) => field.remainingTurns > 1)
            .map((field) => ({ ...field, remainingTurns: field.remainingTurns - 1 }));
    }
    pruneDead(enemies) {
        for (const enemy of enemies) {
            if (enemy.health > 0)
                continue;
            const frozen = this.frozen.delete(enemy.id);
            const burning = this.embers.delete(enemy.id);
            if (frozen || burning)
                this.emit('death', enemy, [enemy.id]);
        }
    }
    takeEvents() {
        const events = this.events;
        this.events = [];
        return events;
    }
    emit(kind, point, enemyIds) {
        this.events.push({ kind, point: pointOf(point), enemyIds: [...enemyIds] });
    }
    recordMoves(moves) {
        for (const move of moves)
            if (distance(move.from, move.to) > 0)
                this.events.push({
                    kind: 'displace',
                    point: pointOf(move.to),
                    enemyIds: [move.enemyId],
                    from: move.from,
                    to: move.to,
                });
    }
    placeField(center, radius, remainingTurns, canSpread) {
        this.fields = this.fields.filter((field) => distance(field.center, center) >= field.radius + radius);
        if (this.fields.length >= elementRules.fieldLimit)
            this.fields.shift();
        const field = {
            id: this.nextFieldId++,
            center: pointOf(center),
            radius,
            remainingTurns,
            canSpread,
        };
        this.fields.push(field);
        this.events.push({
            kind: 'field',
            point: pointOf(center),
            enemyIds: [],
            fieldId: field.id,
        });
    }
}
