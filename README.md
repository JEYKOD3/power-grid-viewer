# Power Grid Viewer

A mini "city" power-grid viewer inspired by distribution-network tools like CYME, built at a small scale for demo purposes. An Angular single-page app talks to an ASP.NET Core minimal API to manage power-grid elements and visualize how electricity propagates across a city on an interactive map.

> The user interface is in French (e.g. _Réseau électrique_, _Carte_, _Ajouter_).

## Features

- **Interactive grid map** (`/map`) — a hand-built SVG of a radial distribution network (generator → transformers → breakers → city zones). Click any element to switch it **En service / Hors service** and watch energization propagate live: powered zones turn green, de-energized ones turn red.
- **Energization engine** — a pure, testable BFS that starts from in-service generators and only flows through in-service elements, so an out-of-service transformer or breaker blocks everything downstream.
- **N-1 contingency analysis (criticality)** — a one-click _Criticité (N-1)_ mode on the map that automatically simulates losing each asset and ranks every piece of equipment by the impact of its failure (zones, customers, and MW lost). See [N-1 contingency analysis](#n-1-contingency-analysis-criticality) below.
- **Element list** (`/elements`) — tabular view of all grid elements with filtering by type.
- **Element detail** (`/elements/:id`) — properties of a single element.
- **Add element** (`/add`) — reactive form to create a new element.
- **Backup generator demo** — `G-Secours` starts out of service feeding an isolated zone; turning it on re-energizes that island.

## Tech stack

| Layer    | Technology                                                                 |
| -------- | ------------------------------------------------------------------------- |
| Frontend | Angular 21 (standalone components, signals, zoneless change detection)     |
| Backend  | ASP.NET Core minimal API (.NET 10, C#)                                     |
| Tests    | Vitest (frontend), xUnit + `WebApplicationFactory` (API)                   |
| Tooling  | Prettier, GitHub Actions CI                                                |

## Project structure

```
power-grid-viewer/
├─ .github/workflows/ci.yml          # CI: frontend (format/test/build) + API (build/test)
├─ README.md
└─ PowerGridApi/                      # ASP.NET Core minimal API
   ├─ Program.cs                      # Endpoints + seeded topology (elements/connections/zones)
   ├─ Properties/launchSettings.json  # API runs on http://localhost:5050
   ├─ PowerGridApi.Tests/             # xUnit integration tests
   │  └─ ApiEndpointsTests.cs
   └─ power-grid-viewer/              # Angular SPA
      └─ src/app/
         ├─ app.routes.ts            # /map (default), /elements, /elements/:id, /add
         ├─ models/                  # grid-element, connection, zone, topology
         ├─ services/grid.ts         # HTTP client (apiBase http://localhost:5050/api)
         └─ components/
            ├─ grid-map/             # SVG map + energization.ts (BFS + N-1 contingency) + tests
            ├─ element-list/
            ├─ element-detail/
            └─ add-element/
```

## Data model

- **GridElement** — `{ id, name, type, tensionKv, status, x, y }`. `type` is one of `Générateur`, `Transformateur`, `Disjoncteur`, `Charge`; `status` is `En service` or `Hors service`; `x`/`y` are map coordinates.
- **Connection** — `{ id, fromId, toId }`, a directed link along which power flows.
- **Zone** — `{ id, name, category, x, y, sourceElementId, loadMw, customers }`, a city zone powered by `sourceElementId`. `loadMw` (demand in MW) and `customers` (number of served customers) feed the contingency analysis.
- **Topology** — `{ elements, connections, zones }`, returned in one call for the map.

A zone is powered when its source element is energized; energization is computed client-side by `computeEnergized()` (BFS from in-service generators through in-service elements).

## API endpoints

| Method | Route                       | Description                                          |
| ------ | --------------------------- | ---------------------------------------------------- |
| GET    | `/api/topology`             | Full network: `{ elements, connections, zones }`     |
| GET    | `/api/elements`             | List all elements                                    |
| GET    | `/api/elements/{id}`        | Single element (404 if missing)                      |
| POST   | `/api/elements`             | Create an element (server assigns the id)            |
| PUT    | `/api/elements/{id}/status` | Update an element's status, body `{ "status": ... }` |
| POST   | `/api/connections`          | Wire two elements, body `{ "fromId": .., "toId": .. }` |

CORS is open (any origin/method/header) for local development.

## N-1 contingency analysis (criticality)

A simplified take on the reliability/contingency studies that tools like CYME perform: it answers _"which single piece of equipment hurts the most if it fails?"_

### What it is

For the **current operating state** of the grid, the app applies the classic **N-1 rule** — remove one element at a time — and measures the consequence of each failure. Every in-service asset is scored by how much it would take down if it tripped:

- **Zones lost** — number of city zones that go dark.
- **Customers lost** — sum of `customers` across those zones.
- **Load lost (MW)** — sum of `loadMw` across those zones.

This surfaces single points of failure (typically the central generator and the main transformers) and lets you compare the relative criticality of every asset at a glance.

### How to use it

1. Open the **Carte** view and click the **Criticité (N-1)** toggle.
2. The map **heat-colors** each element from amber (low impact) to deep red (high impact); hover any element for a tooltip with its exact `customers / MW / zones` lost.
3. A **ranked table** lists the assets worst-first (the top row — your most critical asset — is highlighted).
4. Switch back to **Réseau**, flip a breaker or generator, then return to **Criticité** — the scores **recompute live** for the new operating state (e.g. opening an upstream breaker reduces the criticality of everything already de-energized downstream).

### How it works

The logic lives in a pure, unit-tested function, `computeContingencies(elements, connections, zones)` (in `grid-map/energization.ts`):

1. Compute the **baseline** energized set with `computeEnergized()` (BFS from in-service generators through in-service elements) and record which zones are currently powered.
2. For **each in-service element**, clone the network with that element forced to `Hors service`, recompute energization, and diff against the baseline to find the zones that lost power.
3. Aggregate `zonesLost`, `customersLost`, and `loadLostMw` per element.

The map component exposes this as Angular signals/computeds, so the heat-map and ranking update automatically whenever the topology or any status changes. Out-of-service elements are skipped (they have no incremental impact). Results are sorted by customers lost, then by MW lost.

## Getting started

### Prerequisites

- [.NET SDK 10.0](https://dotnet.microsoft.com/)
- [Node.js 22+](https://nodejs.org/) and npm

### 1. Run the API (terminal 1)

```bash
cd PowerGridApi
dotnet run        # or: dotnet watch run
```

The API listens on `http://localhost:5050`.

### 2. Run the frontend (terminal 2)

```bash
cd PowerGridApi/power-grid-viewer
npm install
npm start         # ng serve
```

Open `http://localhost:4200/` and you'll land on the **Carte** (map) view.

> If the map is empty, make sure the API is running on port 5050 (the frontend's `apiBase` points there).

## Testing

**Frontend** (from `PowerGridApi/power-grid-viewer`):

```bash
npm test                 # unit tests (Vitest)
npm run build            # production build
npm run format:check     # Prettier formatting check
```

**API** (from `PowerGridApi`):

```bash
dotnet test PowerGridApi.Tests/PowerGridApi.Tests.csproj
```

> Tip: avoid running `dotnet test`/`dotnet build` against the project while `dotnet watch run` is serving it — it can mark the running project "stale" (`ENC1008`) and keep the old in-memory data until restarted.

## Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request:

- **Frontend** job: `npm ci`, `npm run format:check`, `npm test`, `npm run build`.
- **API** job: `dotnet restore`, `dotnet build` (Release), `dotnet test`.
