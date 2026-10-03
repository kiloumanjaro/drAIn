# SWMM Simulation API

How the frontend talks to the [drAIn backend](https://github.com/4Chronosx/BACKEND-DrAin),
a FastAPI service wrapping PySWMM.

## Overview

A simulation of the Mandaue network takes around **two minutes**. That is
longer than browsers and platform proxies will hold a request open, so runs
are **queued and polled**: the request that starts one returns immediately
with a job id.

`lib/simulation-api/simulation.ts` hides this. `runSimulation()` starts the
job, polls it, and resolves with the results — callers await it as if it
were a single request.

## Base URL

`process.env.NEXT_PUBLIC_BACKEND_URL`.

## Authentication

None. The caller is a public browser app, so it cannot hold a secret; the
backend protects itself with a bounded queue instead (see below).

## Endpoints

### `POST /simulations`

Queue a run. Returns `202` straight away.

**Request** — all three sections are optional. Sending none of them asks for
the unmodified network, whose results are pre-computed and return almost
immediately. Every field inside them is optional too: one left out keeps the
model's own value. The client sends only the values that are set
(`buildSimulationRequest`), since a zero, an invert elevation of 0 m say, is
taken literally.

```jsonc
{
  "nodes": {
    "I-4": {
      "inv_elev": 16,
      "init_depth": 0,
      "ponding_area": 0,
      "surcharge_depth": 0,
    },
  },
  "links": {
    "C-1": {
      "init_flow": 0,
      "upstrm_offset_depth": 0,
      "downstrm_offset_depth": 0,
      "avg_conduit_loss": 0,
    },
  },
  "rainfall": { "total_precip": 400, "duration_hr": 24 },
}
```

**Response `202`**

```jsonc
{
  "job_id": "8bde9cd8b485431589405858f5f820cf",
  "status": "queued",
  "poll_url": "/simulations/8bde9cd8b485431589405858f5f820cf",
}
```

`status` is always `queued` here: it describes the request being accepted,
not a live reading. A `Location` header carries the same poll URL, and
`Retry-After` suggests how long to wait between polls.

A browser only lets the page read a cross-origin response header the
server lists in `Access-Control-Expose-Headers`. Until the backend exposes
`Retry-After` that way (a fix is landing), `runSimulation` cannot see it
and polls every 3 seconds; it reads the header as soon as it is exposed. A
missing, zero or non-numeric value also falls back to 3 seconds.

**Other responses**

| Status | Meaning                                                                                                          |
| ------ | ---------------------------------------------------------------------------------------------------------------- |
| `422`  | The request is invalid — a negative depth, or a storm longer than the model's 24-hour window. Nothing is queued. |
| `429`  | Too much work is already outstanding. Retry later; `Retry-After` suggests when.                                  |

### `GET /simulations/{job_id}`

Report a job's state, and its results once it succeeds.

```jsonc
{
  "job_id": "8bde9cd8...",
  "status": "queued" | "running" | "succeeded" | "failed",
  "created_at": "2026-09-23T16:13:11Z",
  "started_at": "2026-09-23T16:13:11Z",
  "finished_at": "2026-09-23T16:15:27Z",
  "result": { /* present once succeeded */ },
  "error":  "…"  /* present once failed */
}
```

A failed run still answers `200`: reading the job succeeded; the simulation
is what failed. `404` means the job never existed, or its result has expired
— finished results are kept for a limited window because each is close to a
megabyte.

### `GET /health`

Liveness probe. Answers `{"status": "ok"}`.

### `POST /run-simulation` — deprecated

Runs the simulation and waits for it, holding the request open throughout.
Kept only so a frontend deployed before the queued endpoints keeps working.
Do not build on it.

## The result payload

```typescript
interface SimulationResponse {
  metadata: {
    total_nodes: number;
    flooded_nodes: number;
    non_flooded_nodes: number;
    rpt_file: string; // the SWMM report file the figures were read from
    out_file: string; // the SWMM binary output file
    event_hours: number; // length of the simulated event, in hours
    inconsistent_nodes: number; // nodes the report floods but the output does not
    exposure_basis_counts: { inside: number; nearest: number; unknown: number };
    model_info: ModelInfo; // what the ratings can claim; see lib/simulation-api/model-info.ts
    scoring: unknown; // the settings behind the three ratings
  };
  nodes_list: NodeSimulationResult[]; // one row per node
}
```

The frontend reads only `nodes_list`. The metadata fields past the node
counts are diagnostic; their exact shape is the backend's, so check its
README before relying on one.

Each entry carries the raw flooding figures — `Hours_Flooded`,
`Maximum_Rate_CMS`, `Time_of_Max_days`, `Time_of_Max_hr_min`,
`Total_Flood_Volume_10e6_ltr`, `Time_After_Raining_min` — plus three ratings.

`Time_After_Raining_min` is `null` for a node that never overflowed. The
stored per-return-period scenarios predate that and use `9999` instead;
the client turns both into `null` (`normaliseOverflowMinutes`).

`Vulnerability_Category` is `High`, `Medium`, `Low` or `No hazard`. The
stored scenarios say `High Risk`, `Medium Risk`, `Low Risk` and `No Risk`,
so compare categories through `normaliseHazardCategory`, never by exact
string.

### The three ratings

| Field                                              | What it knows                                                                                                                                        |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Vulnerability_Score` / `Vulnerability_Category`   | **Hazard.** How badly the node floods: volume, duration as a share of the event, peak rate. 0–1, monotonic. A node that floods can never score zero. |
| `Exposure_Score`, `Barangay`, `Population_Density` | **Exposure.** Roughly how many people are around it, from the density of the barangay it sits in. 0–1, never null.                                   |
| `Risk_Score`                                       | **Hazard × exposure.** Rank work lists on this.                                                                                                      |

Ranking on hazard alone puts a drain in an empty lot level with one in the
densest barangay in the city — exposure moves nine of the top twenty.

The field names still say "Vulnerability" because they are the wire
contract. The user-facing term is "flood hazard".

> **What these are not.** They come from simulation, not observation, and
> have not been checked against field records. Exposure is barangay density,
> not a count of who is inside the flood footprint. "No hazard" means the
> model found no overflow at that node under this storm, not that the
> location is safe.

## Parameters

Per-node overrides, keyed by node ID:

| Parameter         | Description                              | Unit   |
| ----------------- | ---------------------------------------- | ------ |
| `inv_elev`        | Invert elevation                         | metres |
| `init_depth`      | Initial water depth                      | metres |
| `ponding_area`    | Area available for surface ponding       | m²     |
| `surcharge_depth` | Depth above the crown before surcharging | metres |

Per-conduit overrides, keyed by a conduit name suffix:

| Parameter               | Description              | Unit   |
| ----------------------- | ------------------------ | ------ |
| `init_flow`             | Flow limit               | m³/s   |
| `upstrm_offset_depth`   | Upstream invert offset   | metres |
| `downstrm_offset_depth` | Downstream invert offset | metres |
| `avg_conduit_loss`      | Average loss coefficient | -      |

The design storm:

| Parameter      | Description          | Range        | Unit  |
| -------------- | -------------------- | ------------ | ----- |
| `total_precip` | Total rainfall depth | ≥ 0          | mm    |
| `duration_hr`  | Storm duration       | > 0 and ≤ 24 | hours |

The backend distributes the depth over the duration as a triangular
hyetograph. Durations beyond 24 hours are rejected rather than silently
truncated to the model's window.

## Using it

```typescript
import { runSimulation } from '@/lib/simulation-api/simulation';

const results = await runSimulation(nodes, links, rainfall, (status) => {
  // Optional: 'queued' | 'running' | 'succeeded' | 'failed'
  console.log(status);
});
```

`runSimulation` throws an `Error` whose message is safe to show the user —
it distinguishes a busy queue, a failed run and an expired result. It gives
up after 30 minutes: a run takes about two, but a job can wait in the queue
behind others for 16-30 minutes first. The
simulation page surfaces `error.message` directly in a toast.

## Performance

- A real run takes roughly **two minutes**. A request with no overrides
  returns pre-computed results in well under a second.
- The backend runs **one simulation at a time** by default, and holds a
  bounded queue behind it. **Do not fan out with `Promise.all`** — past the
  cap, extra requests are rejected with `429`.
- Polling every few seconds is enough; the server suggests an interval via
  `Retry-After`.

## Related

- [Supabase API](SUPABASE.md)
- The backend repository's README, including why it runs a single worker.
