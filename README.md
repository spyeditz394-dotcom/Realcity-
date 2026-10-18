# REALCITY — Part 4.5 source recovery

Recovered from the public source download endpoint of the existing playable REALCITY deployment on 2026-10-18. The original game entry point is preserved at `src/main.ts`; the original Vite package versions and project configuration were recovered from the deployment file metadata. The original playable deployment remains available at https://open-world-city-prototype.vercel.app/ as a recovery reference.

## Run

```sh
npm install
npm run build
npm run dev
```

Stack: Three.js, Vite, TypeScript entry point, and Rapier3D-compatible static overlap queries. Player/vehicle movement uses custom kinematic integration, not full rigid-body dynamics. See the original production report at https://open-world-city-prototype.vercel.app/realcity-part-4-report.txt.
