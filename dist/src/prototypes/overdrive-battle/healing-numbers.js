/** 회복은 피해 연출을 거치지 않고 실제 회복량만 표시한다. */
export class HealingNumbers {
    container;
    labels = [];
    constructor(container) {
        this.container = container;
    }
    add(healing) {
        const node = document.createElement('div');
        node.className = 'damage healing-number';
        node.textContent = `+${healing.amount}`;
        this.container.append(node);
        this.labels.push({ node, healing, age: 0 });
    }
    update(dt, project) {
        for (let i = this.labels.length - 1; i >= 0; i--) {
            const label = this.labels[i];
            label.age += dt;
            if (label.age >= 0.8) {
                label.node.remove();
                this.labels.splice(i, 1);
                continue;
            }
            const point = project(label.healing, 1.4 + label.age * 1.3);
            if (point) {
                label.node.style.left = `${point.x}px`;
                label.node.style.top = `${point.z}px`;
            }
            label.node.style.opacity = String(Math.min(1, (0.8 - label.age) * 4));
        }
    }
    clear() {
        this.labels.forEach((label) => label.node.remove());
        this.labels.length = 0;
    }
}
