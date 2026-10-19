import { regionalJourneys } from './regional-journeys.js';
function roundedDistance(point, area, radius) {
    const hx = (area.maxX - area.minX) / 2, hz = (area.maxZ - area.minZ) / 2;
    const r = Math.min(radius, hx * 0.88, hz * 0.88);
    const x = Math.abs(point.x - (area.minX + area.maxX) / 2) - hx + r;
    const z = Math.abs(point.z - (area.minZ + area.maxZ) / 2) - hz + r;
    return (Math.hypot(Math.max(x, 0), Math.max(z, 0)) + Math.min(Math.max(x, z), 0) - r);
}
function pathDistance(point, path) {
    const first = path.points[0];
    if (!first)
        return Infinity;
    const radius = path.width / 2;
    let result = Math.hypot(point.x - first.x, point.z - first.z) - radius;
    for (let index = 1; index < path.points.length; index++) {
        const from = path.points[index - 1], to = path.points[index];
        const dx = to.x - from.x, dz = to.z - from.z, lengthSquared = dx * dx + dz * dz;
        const t = lengthSquared > 0
            ? Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.z - from.z) * dz) /
                lengthSquared))
            : 0;
        result = Math.min(result, Math.hypot(point.x - from.x - dx * t, point.z - from.z - dz * t) - radius);
    }
    return result;
}
function smoothUnion(a, b, width) {
    const h = Math.max(width - Math.abs(a - b), 0) / width;
    return Math.min(a, b) - h * h * width * 0.25;
}
export function smoothRange(from, to, value) {
    const x = Math.max(0, Math.min(1, (value - from) / (to - from)));
    return x * x * (3 - 2 * x);
}
function area(minX, maxX, minZ, maxZ) {
    return { minX, maxX, minZ, maxZ };
}
/** 지면 윤곽·보행·물가·발 높이에 공통으로 쓰는 변경 없는 거리장이다. */
export class TrailGround {
    definition;
    region;
    variant;
    bounds;
    waters;
    bridges;
    constructor(options) {
        this.definition = options.definition;
        this.region = options.region;
        this.variant = options.variant;
        if (options.surface) {
            this.waters = options.surface.waters;
            this.bridges = options.surface.bridges;
        }
        else if (this.variant === 'seamless') {
            const surface = regionalJourneys[this.region].surface;
            this.waters = surface.waters;
            this.bridges = surface.bridges;
        }
        else if (this.variant !== 'alternate') {
            const waters = {
                boar: [area(-5.0, -1.7, -15, 15)],
                bear: [area(-5.3, -1.2, -15, 15)],
                armadillo: [area(5.8, 9.4, -6.0, 12), area(-1.1, 6.0, 2.7, 3.9)],
                mantis: [area(-4.6, -1.5, -5.5, 5.7)],
            };
            const bridges = {
                boar: [area(-5.2, -1.5, -2.2, 1.8)],
                bear: [area(-5.5, -1.0, -6.8, -3.1)],
                armadillo: [],
                mantis: [area(-4.8, -1.3, -2.4, 1.3)],
            };
            this.waters = waters[this.region];
            this.bridges = bridges[this.region];
        }
        else {
            const waters = {
                boar: [area(-8.1, 8.4, -4.7, 3.3), area(-16.2, -12.7, -5.0, 3.0)],
                bear: [],
                armadillo: [area(-10.8, -4.6, -5.2, -4.8)],
                mantis: [area(-0.1, 11.8, -4.8, 4.7)],
            };
            const bridges = {
                boar: [area(-1.8, 1.8, -4.7, 3.3)],
                bear: [],
                armadillo: [],
                mantis: [area(3.2, 6.9, -4.8, 4.7)],
            };
            this.waters = waters[this.region];
            this.bridges = bridges[this.region];
        }
        const pathAreas = (this.definition.paths ?? []).flatMap((path) => path.points.map((point) => ({
            minX: point.x - path.width / 2,
            maxX: point.x + path.width / 2,
            minZ: point.z - path.width / 2,
            maxZ: point.z + path.width / 2,
        })));
        const areas = [...this.definition.areas, ...this.waters, ...pathAreas];
        this.bounds = options.bounds ?? {
            minX: Math.min(...areas.map((area) => area.minX)),
            maxX: Math.max(...areas.map((area) => area.maxX)),
            minZ: Math.min(...areas.map((area) => area.minZ)),
            maxZ: Math.max(...areas.map((area) => area.maxZ)),
        };
    }
    distance(point) {
        // 큰 굽이를 둥글게 잇고 좌우가 같지 않은 작은 굴곡을 더한다.
        const warped = {
            x: point.x +
                Math.sin(point.z * 0.63) * 0.2 +
                Math.sin(point.z * 1.71 + point.x * 0.23) * 0.07,
            z: point.z +
                Math.sin(point.x * 0.49 + 0.7) * 0.19 +
                Math.sin(point.x * 1.38) * 0.06,
        };
        let result = 1e6;
        for (const rect of this.definition.areas)
            result = smoothUnion(result, roundedDistance(warped, rect, 1.25), 0.85);
        for (const path of this.definition.paths ?? [])
            result = smoothUnion(result, pathDistance(warped, path), 0.85);
        return result;
    }
    isWalkable(point) {
        return this.distance(point) < -0.16;
    }
    isBridge(point) {
        return this.bridges.some((rect) => point.x >= rect.minX &&
            point.x <= rect.maxX &&
            point.z >= rect.minZ &&
            point.z <= rect.maxZ);
    }
    waterDistance(point) {
        const warped = {
            x: point.x +
                Math.sin(point.z * 0.57) * 0.46 +
                Math.sin(point.z * 1.21 + 0.7) * 0.12,
            z: point.z +
                Math.sin(point.x * 0.46 + 1.2) * 0.42 +
                Math.sin(point.x * 1.13) * 0.1,
        };
        let distance = 1e6;
        for (const rect of this.waters)
            distance = smoothUnion(distance, roundedDistance(warped, rect, 3.2), 0.65);
        // 실제 다리가 있는 구간 외에는 물이 길을 가로막지 않게 한다.
        if (!this.isBridge(point))
            distance = Math.max(distance, -this.distance(point) + 0.22);
        return distance;
    }
    terrainHeight(point) {
        const d = this.distance(point);
        const undulation = Math.sin(point.x * 0.38 + Math.cos(point.z * 0.3)) * 0.11 +
            Math.cos(point.z * 0.51 - point.x * 0.13) * 0.08;
        const slope = smoothRange(-0.45, 3.6, d);
        const dry = 0.012 +
            Math.sin(point.x * 0.7 + point.z * 0.33) * 0.009 +
            slope * (0.14 + undulation);
        const water = this.waterDistance(point);
        if (water < 0)
            return -0.23 - smoothRange(0, 1.3, -water) * 0.2;
        return (dry * smoothRange(0, 0.8, water) -
            0.075 * (1 - smoothRange(0, 0.8, water)));
    }
    heightAt(point) {
        if (this.isBridge(point) && this.waterDistance(point) < 0.65)
            return 0.055;
        return this.terrainHeight(point);
    }
}
