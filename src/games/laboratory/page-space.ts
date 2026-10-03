import type { AnimationFrame } from '../../resources/preview/animation-player.js';
import { getContext, type GameAssets } from './assets.js';
import { smooth } from './event-rules.js';
import { passage, type GameSnapshot } from './game.js';
import { drawRoom } from './renderer.js';
import { drawPlayer } from './player-renderer.js';
import { cameraPosition } from './spatial-rules.js';

// 배경과 캐릭터를 서로 다른 DOM 평면에 두어 배경만 페이지 콘텐츠로 변한다.
export class PageSpace {
  private readonly root = document.createElement('div');
  private readonly sheet = document.createElement('div');
  private readonly picture = document.createElement('canvas');
  private readonly actor = document.createElement('canvas');
  private readonly scrollTrack = document.createElement('div');
  private readonly thumb = document.createElement('div');
  private readonly floor = document.createElement('div');
  private readonly label = document.createElement('div');
  private density = 1;

  constructor(
    scene: HTMLCanvasElement,
    private readonly assets: GameAssets,
  ) {
    this.root.className = 'page-space';
    this.root.hidden = true;
    this.root.setAttribute('aria-hidden', 'true');
    this.sheet.className = 'page-sheet';
    this.picture.width = 2400;
    this.picture.height = 430;
    this.sheet.append(this.picture);
    for (let i = 0; i < 4; i++) {
      const handle = document.createElement('i');
      handle.className = `image-handle corner-${i}`;
      this.sheet.append(handle);
    }
    this.actor.className = 'page-actor';
    this.scrollTrack.className = 'page-scroll-track';
    this.thumb.className = 'page-scroll-thumb';
    this.scrollTrack.append(this.thumb);
    this.floor.className = 'page-floor';
    this.floor.textContent = '←';
    this.label.className = 'page-image-label';
    this.label.textContent = 'C-2.png';
    this.root.append(
      this.floor,
      this.sheet,
      this.label,
      this.actor,
      this.scrollTrack,
    );
    scene.parentElement?.append(this.root);
  }

  resize(width: number, density: number): void {
    this.root.style.transform = `scale(${width / 1000})`;
    this.density = (width * density) / 1000;
    this.actor.width = Math.round(1000 * this.density);
    this.actor.height = Math.round(430 * this.density);
  }

  render(state: GameSnapshot, frame: AnimationFrame): void {
    const { page, player } = state;
    const active =
      (state.scenario === 'page-scroll' || state.scenario === 'image-zoom') &&
      page.elapsed !== null &&
      state.progress !== 8 &&
      state.phase !== 'complete';
    this.root.hidden = !active;
    if (!active) return;
    const time = page.elapsed ?? 0;
    const scroll = state.scenario === 'page-scroll';
    const camera = cameraPosition(player.x);
    const returnAmount = page.departure;
    const collapse = scroll ? smooth((time - 0.55) / 1.35) : page.reveal;
    const growth = scroll ? 1 : 1 + page.expansion * 6;
    // 관측창을 중심으로 확대하며 플레이어의 크기는 유지한다.
    const largeX = scroll ? -camera : -camera - (1115 - camera) * (growth - 1);
    const largeY = scroll ? -500 * smooth(time / 1.5) : 225 - 225 * growth;
    const smallY = scroll ? 26 : 211;
    const smallX = scroll ? 95 : 140;
    const size = growth + (0.3 - growth) * collapse;
    const targetX = largeX + (smallX - largeX) * collapse;
    const targetY = largeY + (smallY - largeY) * collapse;
    const scale = 1 + (size - 1) * returnAmount;
    const x = -camera + (targetX + camera) * returnAmount;
    const y = targetY * returnAmount;
    this.sheet.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    this.sheet.classList.toggle('is-image', !scroll && collapse > 0.9);
    this.root.style.setProperty(
      '--page-reveal',
      String(collapse * returnAmount),
    );
    this.scrollTrack.hidden = !scroll;
    this.scrollTrack.style.opacity = String(returnAmount * smooth(time / 0.3));
    this.thumb.style.transform = `translateY(${collapse * 272}px)`;
    this.floor.style.opacity = String(collapse * returnAmount);
    this.label.hidden = scroll;
    this.label.style.opacity = String(collapse * returnAmount);
    const transition = state.transitionElapsed;
    this.root.style.opacity =
      transition === null
        ? '1'
        : String(
            transition < passage.fadeOut
              ? 1 - transition / passage.fadeOut
              : Math.min(1, (transition - passage.fadeOut) / passage.fadeIn),
          );
    const picture = getContext(this.picture);
    picture.clearRect(0, 0, 2400, 430);
    drawRoom(picture, this.assets, state, frame, false, false);
    const ctx = getContext(this.actor);
    ctx.setTransform(this.density, 0, 0, this.density, 0, 0);
    ctx.clearRect(0, 0, 1000, 430);
    // 바닥이 먼저 올라간 뒤 몸은 포물선을 그리며 페이지의 여백에 착지한다.
    const drop = scroll
      ? -150 * Math.sin(Math.PI * Math.min(1, time / 1.9)) * returnAmount
      : 0;
    ctx.save();
    ctx.translate(-camera, drop);
    drawPlayer(ctx, this.assets, player, frame, false);
    ctx.restore();
    if (scroll && time > 1.9 && time < 2.25) {
      const dust = (time - 1.9) / 0.35;
      ctx.strokeStyle = `rgb(175 191 177 / ${1 - dust})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(
        player.x - camera,
        342,
        20 + dust * 60,
        3 + dust * 5,
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    }
  }

  destroy(): void {
    this.root.remove();
  }
}
