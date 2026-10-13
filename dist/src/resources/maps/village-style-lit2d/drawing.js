import * as THREE from 'three';
import manifest from '../../../../resources/manifest.json' with { type: 'json' };
import { resourceUrl } from '../../catalog/resource-url.js';
import { createVillageArt, mapPoint, mapSize } from './art.js';
import { framePlacement } from './frame-placement.js';
const vertexShader = `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
// 색·normal·mask는 같은 UV로 읽으며 normal에는 sRGB 변환을 적용하지 않는다.
const fragmentShader = `
  uniform sampler2D colorMap;uniform sampler2D normalMap;uniform sampler2D maskMap;
  uniform vec3 lantern;uniform vec3 hearth;uniform float fire;uniform float normalOn;uniform float debugNormals;
  varying vec2 vUv;
  vec3 diffusePoint(vec3 normal,vec3 point,vec3 source,vec3 color,float power){
    vec3 offset=source-point;float distance=length(offset.xy);
    float falloff=1.0/(1.0+distance*distance/10500.0);
    float diffuse=max(0.0,dot(normal,normalize(offset)));
    return color*diffuse*falloff*power;
  }
  void main(){
    vec2 uv=(floor(vUv*vec2(640.0,400.0))+0.5)/vec2(640.0,400.0);
    vec3 color=texture2D(colorMap,uv).rgb;
    vec3 normal=normalize(texture2D(normalMap,uv).rgb*2.0-1.0);
    normal=normalize(mix(vec3(0.0,0.0,1.0),normal,normalOn));
    vec3 point=vec3(uv*vec2(640.0,400.0),0.0);
    vec3 moon=vec3(-0.42,0.62,0.65);
    vec3 illumination=vec3(0.28,0.34,0.43)+vec3(0.33,0.43,0.52)*max(0.0,dot(normal,moon));
    illumination+=diffusePoint(normal,point,lantern,vec3(1.0,0.72,0.34),1.05);
    illumination+=diffusePoint(normal,point,hearth,vec3(1.0,0.46,0.17),0.38+fire*0.65);
    float emission=texture2D(maskMap,uv).r;
    vec3 result=color*illumination+color*emission*0.55;
    result=mix(result,normal*.5+.5,debugNormals);
    gl_FragColor=vec4(result,1.0);
    #include <colorspace_fragment>
  }
`;
const positions = [
    { x: 320, y: 205 },
    { x: 145, y: 270 },
    { x: 505, y: 267 },
];
export class LitDrawing {
    canvas;
    ready;
    renderer;
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-320, 320, 200, -200, 0.1, 100);
    geometry = new THREE.PlaneGeometry(640, 400);
    actorGeometry = new THREE.PlaneGeometry(1, 1);
    material;
    actorMaterial = new THREE.MeshBasicMaterial({
        transparent: true,
        alphaTest: 0.01,
        depthTest: false,
        toneMapped: false,
    });
    actor = new THREE.Mesh(this.actorGeometry, this.actorMaterial);
    motions;
    textures = new Map();
    maps = [];
    restored = false;
    disposed = false;
    width = 1;
    height = 1;
    viewHeight = 400;
    cameraCenter = { x: 320, y: 200 };
    lantern = { x: 320, y: 205, z: 62 };
    frames = 0;
    lastFramePath = '';
    constructor(canvas) {
        this.canvas = canvas;
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: false,
            alpha: false,
        });
        this.renderer.setClearColor('#152730');
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.camera.position.z = 20;
        this.material = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
                colorMap: { value: null },
                normalMap: { value: null },
                maskMap: { value: null },
                lantern: { value: new THREE.Vector3(320, 205, 62) },
                hearth: { value: new THREE.Vector3(180, 400 - 271, 38) },
                fire: { value: 0 },
                normalOn: { value: 1 },
                debugNormals: { value: 0 },
            },
            depthTest: false,
            depthWrite: false,
        });
        const map = new THREE.Mesh(this.geometry, this.material);
        map.position.set(320, 200, 0);
        this.scene.add(map);
        this.actor.renderOrder = 2;
        this.actor.position.z = 1;
        this.scene.add(this.actor);
        this.rebuild(false);
        const hero = manifest.assets.find((a) => a.id === 'ai/tiger-hero');
        if (!hero)
            throw new Error('승인된 아타호를 찾을 수 없어요.');
        this.motions = new Map(Object.entries(hero.animations).filter(([name]) => [
            'stand',
            'stand-left',
            'stand-right',
            'stand-back',
            'move',
            'move-left',
            'move-right',
            'move-back',
        ].includes(name)));
        const frames = [
            ...new Map([...this.motions.values()]
                .flatMap((m) => m.frames)
                .map((frame) => [frame.localPath, frame])).values(),
        ];
        this.ready = Promise.all(frames.map((frame) => this.load(frame))).then(() => undefined);
    }
    resize() {
        const bounds = this.canvas.getBoundingClientRect();
        this.width = Math.max(1, bounds.width);
        this.height = Math.max(1, bounds.height);
        this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
        this.renderer.setSize(this.width, this.height, false);
    }
    rebuild(restored) {
        this.maps.forEach((map) => map.dispose());
        const art = createVillageArt(restored);
        this.maps = [
            new THREE.CanvasTexture(art.albedo),
            new THREE.CanvasTexture(art.normal),
            new THREE.CanvasTexture(art.mask),
        ];
        for (const [i, map] of this.maps.entries()) {
            map.magFilter = THREE.NearestFilter;
            map.minFilter = THREE.NearestFilter;
            map.generateMipmaps = false;
            map.colorSpace = i === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        }
        this.material.uniforms.colorMap.value = this.maps[0];
        this.material.uniforms.normalMap.value = this.maps[1];
        this.material.uniforms.maskMap.value = this.maps[2];
        this.restored = restored;
    }
    load(frame) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => {
                if (!this.disposed) {
                    const texture = new THREE.Texture(image);
                    texture.colorSpace = THREE.SRGBColorSpace;
                    texture.magFilter = THREE.NearestFilter;
                    texture.minFilter = THREE.NearestFilter;
                    texture.generateMipmaps = false;
                    texture.needsUpdate = true;
                    this.textures.set(frame.localPath, texture);
                }
                resolve();
            };
            image.onerror = () => reject(new Error(`아타호 프레임을 불러오지 못했어요: ${frame.localPath}`));
            image.src = resourceUrl(frame.localPath).href;
        });
    }
    render(snapshot, overview) {
        if (this.disposed)
            return;
        if (this.restored !== snapshot.restored)
            this.rebuild(snapshot.restored);
        this.viewHeight = overview
            ? Math.max(400, (640 * this.height) / this.width) * 1.03
            : 240;
        const foot = mapPoint(snapshot.position);
        this.cameraCenter = overview
            ? { x: 320, y: 200 }
            : { x: foot.x, y: Math.max(142, Math.min(270, foot.y - 40)) };
        const halfWidth = (this.viewHeight * this.width) / this.height / 2;
        this.camera.left = -halfWidth;
        this.camera.right = halfWidth;
        this.camera.top = this.viewHeight / 2;
        this.camera.bottom = -this.viewHeight / 2;
        this.camera.position.x = this.cameraCenter.x;
        this.camera.position.y = 400 - this.cameraCenter.y;
        this.camera.updateProjectionMatrix();
        const preset = positions[snapshot.lightPosition] ?? positions[0];
        this.lantern = snapshot.lightMoving
            ? {
                x: 320 + Math.sin(snapshot.elapsed * 0.43) * 185,
                y: 205 + Math.cos(snapshot.elapsed * 0.43) * 53,
                z: 62,
            }
            : { ...preset, z: 62 };
        this.material.uniforms.lantern.value.set(this.lantern.x, 400 - this.lantern.y, this.lantern.z);
        this.material.uniforms.fire.value =
            snapshot.fireSeconds > 0 ? 1 + Math.sin(snapshot.elapsed * 13) * 0.09 : 0;
        this.material.uniforms.normalOn.value = Number(snapshot.normalEnabled);
        this.updateHero(snapshot, foot);
        this.renderer.render(this.scene, this.camera);
        this.frames++;
    }
    updateHero(snapshot, foot) {
        const direction = snapshot.direction;
        const suffix = Math.abs(direction.x) > Math.abs(direction.z)
            ? direction.x < 0
                ? '-left'
                : '-right'
            : direction.z < 0
                ? '-back'
                : '';
        const motion = this.motions.get(`${snapshot.moving ? 'move' : 'stand'}${suffix}`);
        const frame = motion?.frames[snapshot.moving
            ? Math.floor(snapshot.steps * 3) % motion.frames.length
            : 0];
        if (!frame)
            return;
        const texture = this.textures.get(frame.localPath);
        if (!texture)
            return;
        if (this.lastFramePath !== frame.localPath) {
            this.actorMaterial.map = texture;
            this.actorMaterial.needsUpdate = true;
            this.lastFramePath = frame.localPath;
        }
        const placement = framePlacement(frame, 0.55);
        this.actor.scale.set(placement.width, placement.height, 1);
        this.actor.position.set(foot.x + placement.x, 400 - foot.y + placement.y, 1);
    }
    project(point) {
        const p = mapPoint(point);
        return {
            x: ((p.x - this.cameraCenter.x) * this.height) / this.viewHeight +
                this.width / 2,
            y: ((p.y - this.cameraCenter.y) * this.height) / this.viewHeight +
                this.height / 2,
        };
    }
    pointer(clientX, clientY) {
        const bounds = this.canvas.getBoundingClientRect();
        const px = ((clientX - bounds.left - this.width / 2) * this.viewHeight) /
            this.height +
            this.cameraCenter.x, py = ((clientY - bounds.top - this.height / 2) * this.viewHeight) /
            this.height +
            this.cameraCenter.y;
        return { x: (px - 320) / 20, z: (py - 235) / 12 };
    }
    get diagnostics() {
        return {
            albedoSize: { ...mapSize },
            normalSize: { ...mapSize },
            maskSize: { ...mapSize },
            normalColorSpace: this.maps[1]?.colorSpace,
            light: { ...this.lantern },
            renderedFrames: this.frames,
            textureCount: this.textures.size,
            pixelRatio: this.renderer.getPixelRatio(),
            drawCalls: this.renderer.info.render.calls,
        };
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.maps.forEach((map) => map.dispose());
        this.textures.forEach((texture) => texture.dispose());
        this.textures.clear();
        this.material.dispose();
        this.actorMaterial.dispose();
        this.geometry.dispose();
        this.actorGeometry.dispose();
        this.renderer.dispose();
        this.renderer.forceContextLoss();
    }
}
