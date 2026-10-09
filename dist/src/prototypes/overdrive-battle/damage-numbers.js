/** 피해 숫자의 생성·시간·화면 배치·제거를 소유한다. */
export class DamageNumbers {
    container;
    damages = [];
    constructor(container) {
        this.container = container;
    }
    add(impact) {
        if (impact.barrage && !impact.barrage.final)
            return;
        const node = document.createElement('div');
        node.className = `damage${impact.heavy ? ' heavy' : ''}${impact.targetId === 0 ? ' player-hit' : ''}${impact.barrage ? ' ultimate-damage' : ''}`;
        node.classList.toggle('critical', impact.critical === true);
        node.textContent = String(impact.barrage?.totalDamage ?? impact.damage);
        if (impact.critical) {
            const label = document.createElement('small');
            label.textContent = 'CRITICAL';
            node.prepend(label);
        }
        if (impact.barrage) {
            const small = document.createElement('small');
            small.textContent = `${impact.barrage.hit} HITS · TOTAL`;
            node.prepend(small);
        }
        if (impact.guarded) {
            const small = document.createElement('small');
            small.textContent = '방어';
            node.prepend(small);
        }
        this.container.append(node);
        this.damages.push({ node, impact, age: 0 });
    }
    update(dt, project) {
        for (let i = this.damages.length - 1; i >= 0; i--) {
            const label = this.damages[i];
            label.age += dt;
            if (label.age > 0.8) {
                label.node.remove();
                this.damages.splice(i, 1);
                continue;
            }
            const point = project(label.impact, 1.4 + label.age * 1.6);
            if (point) {
                label.node.style.left = `${point.x}px`;
                label.node.style.top = `${point.z}px`;
            }
            label.node.style.opacity = String(Math.min(1, (0.8 - label.age) * 4));
        }
    }
    clear() {
        this.damages.forEach((label) => label.node.remove());
        this.damages.length = 0;
    }
}
