# REALCITY — Part 11 visual realism overhaul

This branch continues the existing REALCITY Vite/Three.js game. Part 11 continues the stability foundation with a procedural day/night sky gradient, quality-tier exposure and fog, and directional shadows that follow the active player or vehicle.

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
- Quality presets adjust exposure and fog as well as resolution, anisotropy, and shadow quality.
- Directional shadows follow the player or driven vehicle instead of staying centered at the world origin.
- New and pre-v7 local settings start on BALANCED graphics to avoid forcing ULTRA on mobile. Users can still choose LOW, BALANCED, HIGH, or ULTRA.
- The original recovery reference remains available at https://open-world-city-prototype.vercel.app/.

The Vercel preview build is the first validation gate. Actual gameplay controls, visual quality, collision edge cases, and performance on a physical Android device still require hands-on testing.
