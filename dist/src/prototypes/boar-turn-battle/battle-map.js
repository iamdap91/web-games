import * as THREE from 'three';
import { battleStage } from './battle-stage.js';
import { MapKit } from './map-kit.js';
import { buildMountainPass, buildFrostForest } from './map-woodland.js';
import { buildEmberCanyon, buildBambooGrove } from './map-canyon-bamboo.js';
import { alternateBattleMapDefinitions, buildAlternateBattleMap, } from './map-alternate.js';
export const battleMapDefinitions = {
    boar: {
        name: '솔바람 산길',
        description: '낡은 석조 길목과 뿌리, 층이 드러난 암벽 사이의 흙 공터.',
    },
    bear: {
        name: '백서리 고개',
        description: '눈 덮인 설송과 푸른 빙폭, 서리가 얇게 깔린 숲의 분지.',
    },
    armadillo: {
        name: '잿불협곡',
        description: '부서진 현무암과 탄화한 목재, 가장자리의 잿불 틈.',
    },
    mantis: {
        name: '바람대숲',
        description: '겹겹의 대나무와 오래된 돌등, 바람에 흩어지는 잎.',
    },
};
export function battleMapDefinition(encounter, variant) {
    return (variant === 'alternate'
        ? alternateBattleMapDefinitions
        : battleMapDefinitions)[encounter];
}
const styles = {
    boar: {
        sky: 0x9da99a,
        shade: 0x606c56,
        sun: 0xffe5b5,
        sunPower: 2.15,
        ground: 'earth',
        edge: '#15251c',
    },
    bear: {
        sky: 0xb5cbd4,
        shade: 0x657f96,
        sun: 0xe9f1ed,
        sunPower: 2,
        ground: 'snow',
        edge: '#182a39',
    },
    armadillo: {
        sky: 0x715a50,
        shade: 0x493c40,
        sun: 0xffd3ad,
        sunPower: 1.9,
        ground: 'ash',
        edge: '#241d22',
    },
    mantis: {
        sky: 0x829985,
        shade: 0x3e6659,
        sun: 0xf3e6be,
        sunPower: 2,
        ground: 'grass',
        edge: '#162c23',
    },
};
function context(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx)
        throw new Error('전투 무대의 그림을 보관하지 못했습니다.');
    return ctx;
}
/** 입체 무대는 한 번 굽고, 전투에는 같은 좌표의 배경·앞경과 작은 움직임을 전달한다. */
export class BattleMap {
    encounter;
    variant;
    background = document.createElement('canvas');
    foreground = document.createElement('canvas');
    prepared = false;
    disposed = false;
    constructor(encounter, variant = 'original') {
        this.encounter = encounter;
        this.variant = variant;
    }
    prepare() {
        if (this.prepared || this.disposed)
            return;
        const style = styles[this.encounter], kit = new MapKit(), scene = new THREE.Scene();
        const renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: false,
            preserveDrawingBuffer: true,
            powerPreference: 'low-power',
        });
        const sun = new THREE.DirectionalLight(style.sun, style.sunPower);
        try {
            const scale = Math.min(devicePixelRatio || 1, 1.5), width = Math.round(battleStage.width * scale), height = Math.round(battleStage.height * scale);
            renderer.setSize(width, height, false);
            renderer.outputColorSpace = THREE.SRGBColorSpace;
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFShadowMap;
            const camera = new THREE.OrthographicCamera(-11, 11, 6.875, -6.875, 0.1, 130);
            camera.position.set(0, 19.8, 26);
            camera.lookAt(0, 1.8, 0);
            sun.position.set(-13, 25, 14);
            sun.castShadow = true;
            sun.shadow.mapSize.set(2048, 2048);
            Object.assign(sun.shadow.camera, {
                left: -22,
                right: 22,
                top: 22,
                bottom: -22,
                near: 1,
                far: 90,
            });
            sun.shadow.normalBias = 0.045;
            sun.layers.enableAll();
            const sky = new THREE.HemisphereLight(style.sky, style.shade, 1.8);
            sky.layers.enableAll();
            scene.background = new THREE.Color(style.sky);
            scene.fog = new THREE.Fog(style.sky, 43, 85);
            const floor = new THREE.PlaneGeometry(44, 44);
            const uv = floor.getAttribute('uv');
            for (let i = 0; i < uv.count; i++)
                uv.setXY(i, uv.getX(i) * 7, uv.getY(i) * 7);
            const ground = kit.mesh(floor, style.ground, { x: 0, y: -0.025, z: 6 });
            ground.rotation.x = -Math.PI / 2;
            if (this.variant === 'alternate')
                buildAlternateBattleMap(kit, this.encounter);
            else
                switch (this.encounter) {
                    case 'boar':
                        buildMountainPass(kit);
                        break;
                    case 'bear':
                        buildFrostForest(kit);
                        break;
                    case 'armadillo':
                        buildEmberCanyon(kit);
                        break;
                    case 'mantis':
                        buildBambooGrove(kit);
                        break;
                }
            kit.root.traverse((object) => object.layers.set(0));
            kit.foreground.traverse((object) => object.layers.set(1));
            scene.add(kit.root, kit.foreground, sun, sky);
            this.background.width = this.foreground.width = width;
            this.background.height = this.foreground.height = height;
            // 앞경도 함께 그림자를 만든 뒤 색상만 두 장으로 나눈다.
            camera.layers.enableAll();
            renderer.render(scene, camera);
            renderer.shadowMap.autoUpdate = false;
            camera.layers.set(0);
            renderer.render(scene, camera);
            context(this.background).drawImage(renderer.domElement, 0, 0);
            scene.background = null;
            renderer.setClearColor(0x000000, 0);
            camera.layers.set(1);
            renderer.render(scene, camera);
            context(this.foreground).drawImage(renderer.domElement, 0, 0);
            this.prepared = true;
        }
        finally {
            kit.dispose();
            sun.shadow.dispose();
            renderer.dispose();
            renderer.forceContextLoss();
        }
    }
    drawBackground(ctx, time) {
        if (!this.prepared || this.disposed)
            return;
        ctx.drawImage(this.background, 0, 0, battleStage.width, battleStage.height);
        this.drawAtmosphere(ctx, time);
    }
    drawAtmosphere(ctx, time) {
        // 작은 환경 표시만 박자를 주며 공격과 입력의 시간은 바꾸지 않는다.
        const clock = Math.floor(time * 12) / 12;
        ctx.save();
        if (this.encounter === 'bear') {
            ctx.fillStyle = '#e7f0ed';
            for (let i = 0; i < 28; i++) {
                const y = (i * 67 + clock * (12 + (i % 4))) % battleStage.height;
                const x = (i * 173 + Math.sin(clock * 0.6 + i) * 13 + 1100) % 1100;
                ctx.globalAlpha = 0.22 + (i % 3) * 0.12;
                ctx.fillRect(x, y, i % 4 === 0 ? 3 : 2, 2);
            }
        }
        else if (this.encounter === 'armadillo') {
            ctx.fillStyle = '#f5b770';
            for (let i = 0; i < 19; i++) {
                const x = (i * 167 + Math.sin(clock * 0.8 + i) * 12) % 1100, y = 270 - ((i * 31 + clock * 22) % 230);
                ctx.globalAlpha = 0.2 + (Math.sin(clock * 1.7 + i) + 1) * 0.2;
                ctx.fillRect(x, y, 2, i % 3 === 0 ? 4 : 2);
            }
        }
        else {
            const bamboo = this.encounter === 'mantis';
            ctx.fillStyle = bamboo ? '#9eb786' : '#c8c398';
            for (let i = 0; i < (bamboo ? 13 : 7); i++) {
                const x = ((i * 173 + clock * (bamboo ? 17 : 7)) % 1250) - 70, y = 142 + ((i * 31) % 110) + Math.sin(clock * 1.1 + i) * 8;
                ctx.save();
                ctx.globalAlpha = 0.42;
                ctx.translate(x, y);
                ctx.rotate(Math.sin(clock * 0.8 + i) * 0.6);
                ctx.beginPath();
                ctx.ellipse(0, 0, bamboo ? 6 : 3, 1.5, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
        ctx.restore();
    }
    drawForeground(ctx) {
        if (!this.prepared || this.disposed)
            return;
        ctx.drawImage(this.foreground, 0, 0, battleStage.width, battleStage.height);
        const shade = ctx.createLinearGradient(0, 380, 0, battleStage.height), edge = styles[this.encounter].edge;
        shade.addColorStop(0, `${edge}00`);
        shade.addColorStop(1, `${edge}b3`);
        ctx.fillStyle = shade;
        ctx.fillRect(0, 380, battleStage.width, battleStage.height - 380);
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.background.width =
            this.background.height =
                this.foreground.width =
                    this.foreground.height =
                        1;
    }
}
