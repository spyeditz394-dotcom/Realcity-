# REALCITY — Part 10 stability and graphics foundation

This branch continues the existing REALCITY Vite/Three.js game. The Part 10 foundation focuses on startup reliability, reduced geometry duplication, mobile-friendly graphics defaults, and lighter collision checks.

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
- New and pre-v7 local settings start on BALANCED graphics to avoid forcing ULTRA on mobile. Users can still choose LOW, BALANCED, HIGH, or ULTRA.
- The original recovery reference remains available at https://open-world-city-prototype.vercel.app/.

The Vercel preview build is the first validation gate. Actual gameplay controls, visual quality, collision edge cases, and performance on a physical Android device still require hands-on testing.
