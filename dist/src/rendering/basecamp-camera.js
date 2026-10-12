import { basecampBoundary } from '../resources/maps/basecamp/basecamp-layout.js';
import { dojoLayout, } from '../resources/facilities/dojo/dojo-layout.js';
/** 게임 카메라의 추적 위치를 소유한다. 세로 시야를 유지하며 숲 바깥으로의 이동을 제한한다. */
export class BasecampCamera {
    verticalSpan;
    groundScale;
    cos = Math.cos(dojoLayout.cameraYaw);
    sin = Math.sin(dojoLayout.cameraYaw);
    bounds;
    position = null;
    constructor(verticalSpan, groundScale) {
        this.verticalSpan = verticalSpan;
        this.groundScale = groundScale;
        const points = basecampBoundary.map((point) => this.project(point));
        // 보행 끝에서도 산자락과 숲이 보일 만큼만 여유를 둔다.
        this.bounds = {
            left: Math.min(...points.map((point) => point.x)) - 4,
            right: Math.max(...points.map((point) => point.x)) + 4,
            top: Math.min(...points.map((point) => point.z)) - 5,
            bottom: Math.max(...points.map((point) => point.z)) + 5,
        };
    }
    project(point) {
        return {
            x: point.x * this.cos - point.z * this.sin,
            z: (point.x * this.sin + point.z * this.cos) * this.groundScale,
        };
    }
    follow(target, options) {
        const projected = this.project(target);
        const halfHeight = this.verticalSpan / 2;
        const halfWidth = halfHeight * options.aspect;
        const clamp = (value, min, max) => min > max ? (min + max) / 2 : Math.max(min, Math.min(max, value));
        const next = {
            x: clamp(projected.x, this.bounds.left + halfWidth, this.bounds.right - halfWidth),
            z: clamp(projected.z, this.bounds.top + halfHeight, this.bounds.bottom - halfHeight),
        };
        if (!this.position || options.snap)
            this.position = next;
        else {
            const weight = 1 - Math.exp(-10 * Math.max(0, options.delta));
            this.position = {
                x: this.position.x + (next.x - this.position.x) * weight,
                z: this.position.z + (next.z - this.position.z) * weight,
            };
        }
        const depth = this.position.z / this.groundScale;
        return {
            x: this.position.x * this.cos + depth * this.sin,
            z: -this.position.x * this.sin + depth * this.cos,
        };
    }
}
