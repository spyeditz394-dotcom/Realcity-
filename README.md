# REALCITY — Part 12 architecture & material realism

This branch continues the existing REALCITY Vite/Three.js game. Part 12 builds on the Part 11 stability foundation with procedural facade panel seams, subtle plaster grain and weathering, and low-amplitude bump relief for building surfaces. Part 11 also adds a procedural day/night sky gradient, quality-tier exposure and fog, and directional shadows that follow the active player or vehicle.

## Run

```sh
npm install
npm run build
npm run dev
```

## Runtime architecture

- Three.js renders the city, protagonist, pedestrians, vehicles, lighting, and HUD.
- Static building collisions use lightweight footprint overlap tests against the procedural building bounds.
- Player and vehicle movement remain custom kinematic integration; this project does not use full rigid-body dynamics.
- Repeated box dimensions share cached `BoxGeometry` instances.
- Day/night use locally generated sky gradients, avoiding external texture dependencies.
- Building facades use a generated panel/plaster texture with floor joints, vertical seams, faint weathering, and subtle bump mapping; this is generated locally and adds no network asset dependency.
- Quality presets adjust exposure and fog as well as resolution, anisotropy, and shadow quality.
- Directional shadows follow the player or driven vehicle instead of staying centered at the world origin.
- New and pre-v7 local settings start on BALANCED graphics to avoid forcing ULTRA on mobile. Users can still choose LOW, BALANCED, HIGH, or ULTRA.
- The original recovery reference remains available at https://open-world-city-prototype.vercel.app/.

The Vercel preview build is the first validation gate. Actual gameplay controls, visual quality, collision edge cases, and performance on a physical Android device still require hands-on testing.
