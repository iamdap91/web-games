import * as THREE from 'three';
/** 연속된 길을 하나의 면으로 만든다. 생성한 geometry는 호출자가 소유한다. */
export function groundPathGeometry(points, halfWidth) {
    const curve = new THREE.CatmullRomCurve3(points.map(({ x, z }) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
    const steps = Math.max(8, Math.ceil(curve.getLength() / 0.65));
    const vertices = [], indices = [];
    for (let i = 0; i <= steps; i++) {
        const t = i / steps, point = curve.getPoint(t), tangent = curve.getTangent(t);
        const width = halfWidth * (1 + Math.sin(t * Math.PI * 6) * 0.06);
        vertices.push(point.x - tangent.z * width, 0, point.z + tangent.x * width, point.x + tangent.z * width, 0, point.z - tangent.x * width);
        if (i < steps) {
            const a = i * 2;
            indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
        }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
}
