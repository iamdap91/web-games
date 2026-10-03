export const world = { width: 2400, height: 430, ground: 340 } as const;
export const viewport = { width: 1000, height: world.height } as const;
export const playerBody = { halfWidth: 16, height: 62, footInset: 4 } as const;
export const playerBounds = { minimum: 24, maximum: world.width - 24 } as const;
