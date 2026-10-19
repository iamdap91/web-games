import { TrailGround } from '../regional-trails/trail-ground.js';
/** 마을의 열린 마당과 건물·주민 경계를 보행 경로 찾기가 함께 사용한다. */
export class SettlementGround extends TrailGround {
    village;
    constructor(village) {
        const points = [
            ...village.definition.areas.flatMap((a) => [
                { x: a.minX, z: a.minZ },
                { x: a.maxX, z: a.maxZ },
            ]),
            ...(village.definition.paths ?? []).flatMap((p) => p.points),
            ...village.buildings.flatMap((b) => [
                { x: b.x - b.width / 2, z: b.z - b.depth / 2 },
                { x: b.x + b.width / 2, z: b.z + b.depth / 2 },
            ]),
        ];
        super({
            definition: village.definition,
            region: village.region,
            variant: 'seamless',
            surface: { waters: [], bridges: [] },
            bounds: {
                minX: Math.min(...points.map((p) => p.x)) - 3.5,
                maxX: Math.max(...points.map((p) => p.x)) + 3.5,
                minZ: Math.min(...points.map((p) => p.z)) - 3.5,
                maxZ: Math.max(...points.map((p) => p.z)) + 3.5,
            },
        });
        this.village = village;
    }
    isWalkable(point) {
        const b = this.bounds;
        const x = Math.abs(point.x - (b.minX + b.maxX) / 2) - (b.maxX - b.minX) / 2 + 3;
        const z = Math.abs(point.z - (b.minZ + b.maxZ) / 2) - (b.maxZ - b.minZ) / 2 + 3;
        if (Math.hypot(Math.max(x, 0), Math.max(z, 0)) + Math.min(Math.max(x, z), 0) >
            2.5)
            return false;
        for (const building of this.village.buildings) {
            const front = building.z + building.depth / 2;
            if (Math.abs(point.x - building.x) < 1.1 &&
                point.z >= front &&
                point.z < front + 0.95)
                return false;
            if (Math.hypot(point.x - building.x - building.width / 2 - 0.3, point.z - front + 0.25) < 0.78)
                return false;
            if (Math.hypot(Math.max(0, Math.abs(point.x - building.x) - building.width / 2), Math.max(0, Math.abs(point.z - building.z) - building.depth / 2)) < 0.4)
                return false;
        }
        return [
            ...(this.village.solids ?? []),
            ...this.village.residents.map((p) => ({ ...p, radius: 0.28 })),
        ].every((p) => Math.hypot(point.x - p.x, point.z - p.z) > p.radius + 0.32);
    }
    terrainHeight(point) {
        return 0.015 + Math.sin(point.x * 0.3) * Math.cos(point.z * 0.4) * 0.012;
    }
}
