import type { Direction } from './game.js';

function stickPosition(
  offset: number,
  travel: number,
): { offset: number; direction: Direction } {
  if (travel <= 0) return { offset: 0, direction: 0 };
  const clamped = Math.max(-travel, Math.min(travel, offset));
  return {
    offset: clamped,
    direction: Math.abs(clamped) <= travel * 0.25 ? 0 : clamped < 0 ? -1 : 1,
  };
}

export class VirtualStick {
  private readonly events = new AbortController();
  private pointerId: number | null = null;
  private currentDirection: Direction = 0;

  constructor(
    private readonly options: {
      root: HTMLElement;
      knob: HTMLElement;
      onStart: (pointerId: number) => void;
      onDirection: (direction: Direction) => void;
    },
  ) {
    const { root } = options;
    const { signal } = this.events;
    root.setAttribute('aria-disabled', 'false');
    root.addEventListener(
      'pointerdown',
      (event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        if (this.pointerId !== null) return;
        options.onStart(event.pointerId);
        this.pointerId = event.pointerId;
        root.setPointerCapture(event.pointerId);
        root.classList.add('pressed');
        this.move(event.clientX);
      },
      { signal },
    );
    root.addEventListener(
      'pointermove',
      (event) => {
        if (event.pointerId === this.pointerId) this.move(event.clientX);
      },
      { signal },
    );
    const release = (event: PointerEvent): void => {
      if (event.pointerId === this.pointerId) this.reset();
    };
    root.addEventListener('pointerup', release, { signal });
    root.addEventListener('pointercancel', release, { signal });
    root.addEventListener('lostpointercapture', release, { signal });
    root.addEventListener('contextmenu', (event) => event.preventDefault(), {
      signal,
    });
  }

  get direction(): Direction {
    return this.currentDirection;
  }

  reset(): void {
    const pointerId = this.pointerId;
    this.pointerId = null;
    const { root } = this.options;
    if (pointerId !== null && root.hasPointerCapture(pointerId))
      root.releasePointerCapture(pointerId);
    root.classList.remove('pressed');
    this.show(0, 0);
  }

  destroy(): void {
    this.events.abort();
    this.reset();
    this.options.root.setAttribute('aria-disabled', 'true');
  }

  private move(clientX: number): void {
    const { root, knob } = this.options;
    const bounds = root.getBoundingClientRect();
    // CSS 픽셀로 계산해 회전·고해상도 화면에서도 손가락과 손잡이를 맞춘다.
    const travel = (bounds.width - knob.getBoundingClientRect().width) / 2;
    const position = stickPosition(
      clientX - bounds.left - bounds.width / 2,
      travel,
    );
    this.show(position.offset, position.direction);
  }

  private show(offset: number, direction: Direction): void {
    this.options.knob.style.setProperty('--stick-offset', `${offset}px`);
    if (this.currentDirection === direction) return;
    this.currentDirection = direction;
    this.options.onDirection(direction);
  }
}
