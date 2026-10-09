import * as THREE from 'three';
function starGeometry() {
    const shape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
        const angle = Math.PI / 2 + (i * Math.PI) / 5;
        const radius = i % 2 === 0 ? 0.19 : 0.085;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0)
            shape.moveTo(x, y);
        else
            shape.lineTo(x, y);
    }
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
}
/** 행동 불가 표식의 회전만 소유하고, 상태의 유지·해제는 전투 스냅샷을 따른다. */
export class StaggerStars {
    group = new THREE.Group();
    geometry = starGeometry();
    outline = new THREE.MeshBasicMaterial({
        color: 0x182841,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
        fog: false,
        side: THREE.DoubleSide,
    });
    fill = this.outline.clone();
    stars = [];
    elapsed = 0;
    constructor() {
        this.fill.color.setHex(0xffe275);
        for (let i = 0; i < 3; i++) {
            const star = new THREE.Group();
            const edge = new THREE.Mesh(this.geometry, this.outline);
            const face = new THREE.Mesh(this.geometry, this.fill);
            edge.scale.setScalar(1.28);
            edge.layers.set(1);
            face.layers.set(1);
            edge.renderOrder = 5;
            face.renderOrder = 6;
            star.add(edge, face);
            this.group.add(star);
            this.stars.push(star);
        }
        this.group.visible = false;
    }
    render(options) {
        if (!options.active) {
            this.reset();
            return;
        }
        this.group.visible = true;
        this.elapsed += options.dt;
        this.group.position.set(options.head.x, options.head.y + 0.35, 0);
        // 스프라이트와 같은 투영 보정으로 별 모양이 세로로 눌리지 않게 한다.
        this.group.scale.y = 1 / options.screenUpY;
        const time = options.reducedMotion ? 0 : this.elapsed;
        const arrival = options.reducedMotion
            ? 1
            : 1 + Math.sin(Math.min(1, time / 0.22) * Math.PI) * 0.2;
        this.stars.forEach((star, index) => {
            const angle = time * 3.6 + (index * Math.PI * 2) / this.stars.length;
            const depth = Math.sin(angle);
            star.position.set(Math.cos(angle) * 0.57, depth * 0.1, 0);
            star.scale.setScalar((0.95 + depth * 0.12) * arrival);
            star.rotation.z = Math.sin(angle + time) * 0.2;
        });
    }
    reset() {
        this.elapsed = 0;
        this.group.visible = false;
    }
    dispose() {
        this.group.removeFromParent();
        this.geometry.dispose();
        this.outline.dispose();
        this.fill.dispose();
    }
}
