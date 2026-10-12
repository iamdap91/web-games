import * as THREE from 'three';
/** 바닥의 월드 XZ 윤곽을 위를 향하는 면으로 만든다. 반환 자원은 호출자가 정리한다. */
export function groundGeometry(points) {
    const shape = new THREE.Shape();
    points.forEach((point, index) => {
        if (index === 0)
            shape.moveTo(point.x, -point.z);
        else
            shape.lineTo(point.x, -point.z);
    });
    shape.closePath();
    return new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2);
}
