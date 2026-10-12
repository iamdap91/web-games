/** 그림과 판정이 같은 법선·각도를 사용하는 약점 진입 판정. */
export function entersWeakFace(options) {
    const x = options.contact.x - options.center.x;
    const z = options.contact.z - options.center.z;
    const distance = Math.hypot(x, z);
    const speed = Math.hypot(options.heading.x, options.heading.z);
    if (distance === 0 || speed === 0)
        return false;
    return ((x * options.normal.x + z * options.normal.z) / distance >=
        Math.cos(options.halfAngle) - 1e-8 &&
        -(options.heading.x * x + options.heading.z * z) / (speed * distance) >=
            options.approachCosine - 1e-8);
}
