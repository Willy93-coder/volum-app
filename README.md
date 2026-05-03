# Volum

A web tool to convert 2D floor plans into 3D visualizations.

## What it does

Upload a floor plan image (PNG/JPG), trace the walls by clicking points on the canvas, and see them rendered in 3D in real time.

## Features

- Upload floor plan images (PNG, JPG)
- Trace walls by clicking points on the 2D canvas
- Real-time 3D rendering with Three.js
- Adjustable wall height and thickness
- Orbit controls to navigate the 3D scene
- Undo last wall with Ctrl+Z
- Reset points with right click

## Tech stack

- Vue 3 + TypeScript
- Three.js
- Tailwind CSS + shadcn/vue
- Vitest + Vue Test Utils

## Getting started

```bash
pnpm install
pnpm dev
```

## Run tests

```bash
pnpm test:unit
```

## Usage

1. Upload a floor plan image
2. Click on the canvas to trace walls (each click adds a point)
3. Right click to finish a wall and start a new one
4. Adjust wall height and thickness with the inputs
5. Use Ctrl+Z to undo the last wall
6. Navigate the 3D view by dragging, scrolling and right-clicking
