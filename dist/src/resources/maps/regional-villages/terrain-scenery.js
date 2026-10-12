import * as THREE from 'three';
import { setResourceOutline } from '../../environment/environment-resources.js';
import { createPixelMaterial } from '../../../rendering/pixel-material.js';
import { villagePathDistance, villageShoreDistance } from './ground.js';
/** 지형을 한 장의 면으로 그려 부드러운 길과 해안 경계에서 겹침을 피한다. */
export class VillageTerrainScenery {
    root = new THREE.Group();
    geometry;
    bankGeometry;
    groundMaterial;
    bankMaterial;
    constructor(map) {
        const shape = new THREE.Shape(map.boundary.map((p) => new THREE.Vector2(p.x, -p.z)));
        const initial = new THREE.ShapeGeometry(shape).toNonIndexed();
        initial.rotateX(-Math.PI / 2);
        const source = initial.getAttribute('position');
        const vertices = [], colors = [];
        const grass = new THREE.Color(map.style.ground.grass), path = new THREE.Color(map.style.ground.path), earth = new THREE.Color(map.style.ground.earth);
        const color = new THREE.Color();
        const add = (p) => {
            const position = { x: p.x, z: p.z };
            const blend = THREE.MathUtils.smoothstep(villagePathDistance(map, position), -0.18, 0.25);
            color.copy(grass).lerp(path, blend);
            if (map.id === 'harbor')
                color.lerp(earth, Math.max(0, 1 - villageShoreDistance(map, position) / 1.4) * 0.3);
            const patch = 1 + Math.sin(p.x * 0.55 + p.z * 0.17) * Math.sin(p.z * 0.43) * 0.022;
            vertices.push(p.x, 0, p.z);
            colors.push(color.r * patch, color.g * patch, color.b * patch);
        };
        const split = (a, b, c) => {
            const edges = [
                a.distanceToSquared(b),
                b.distanceToSquared(c),
                c.distanceToSquared(a),
            ];
            const longest = Math.max(...edges);
            if (longest < 0.22) {
                add(a);
                add(b);
                add(c);
                return;
            }
            const i = edges.indexOf(longest);
            if (i === 0) {
                const mid = a.clone().add(b).multiplyScalar(0.5);
                split(a, mid, c);
                split(mid, b, c);
            }
            else if (i === 1) {
                const mid = b.clone().add(c).multiplyScalar(0.5);
                split(a, b, mid);
                split(a, mid, c);
            }
            else {
                const mid = c.clone().add(a).multiplyScalar(0.5);
                split(a, b, mid);
                split(mid, b, c);
            }
        };
        for (let i = 0; i < source.count; i += 3)
            split(new THREE.Vector3().fromBufferAttribute(source, i), new THREE.Vector3().fromBufferAttribute(source, i + 1), new THREE.Vector3().fromBufferAttribute(source, i + 2));
        initial.dispose();
        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        this.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        this.geometry.computeVertexNormals();
        this.groundMaterial = createPixelMaterial(0x98a775, {
            pattern: 'broad',
            strength: { value: 0.15 },
        });
        this.groundMaterial.color.setHex(0xffffff);
        this.groundMaterial.vertexColors = true;
        const ground = new THREE.Mesh(this.geometry, this.groundMaterial);
        ground.receiveShadow = true;
        setResourceOutline(ground, 'ground');
        this.root.add(ground);
        const bank = [];
        const offset = map.id === 'onsen' ? 0.8 : 0.45;
        // 인접한 둔덕 면이 같은 바깥 꼭짓점을 공유해 모서리에 틈이 생기지 않는다.
        const outer = map.boundary.map((point, i) => {
            const previous = map.boundary[(i + map.boundary.length - 1) % map.boundary.length], next = map.boundary[(i + 1) % map.boundary.length];
            const a = new THREE.Vector2(point.z - previous.z, previous.x - point.x).normalize();
            const b = new THREE.Vector2(next.z - point.z, point.x - next.x).normalize();
            const normal = a.clone().add(b).normalize();
            const length = offset / Math.max(0.65, normal.dot(a));
            return { x: point.x + normal.x * length, z: point.z + normal.y * length };
        });
        for (let i = 0; i < map.boundary.length; i++) {
            const a = map.boundary[i], b = map.boundary[(i + 1) % map.boundary.length], aa = outer[i], bb = outer[(i + 1) % outer.length];
            bank.push(a.x, -0.005, a.z, b.x, -0.005, b.z, aa.x, -0.37, aa.z, b.x, -0.005, b.z, bb.x, -0.37, bb.z, aa.x, -0.37, aa.z);
        }
        this.bankGeometry = new THREE.BufferGeometry();
        this.bankGeometry.setAttribute('position', new THREE.Float32BufferAttribute(bank, 3));
        this.bankGeometry.computeVertexNormals();
        this.bankMaterial = new THREE.MeshLambertMaterial({
            color: map.id === 'onsen' ? map.style.ground.grass : map.style.ground.earth,
            side: THREE.DoubleSide,
            flatShading: true,
        });
        const bankMesh = new THREE.Mesh(this.bankGeometry, this.bankMaterial);
        setResourceOutline(bankMesh, 'ground');
        this.root.add(bankMesh);
    }
    dispose() {
        this.geometry.dispose();
        this.bankGeometry.dispose();
        this.groundMaterial.dispose();
        this.bankMaterial.dispose();
        this.root.clear();
    }
}
