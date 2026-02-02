# SWMM Simulation API Documentation

Documentation for the Storm Water Management Model (SWMM) simulation API hosted on Railway.

## Overview

The SWMM API is a FastAPI backend that integrates PySWMM (Python wrapper for EPA SWMM) to run hydraulic simulations of urban drainage systems. It provides endpoints for:
- Running drainage network simulations
- Predicting flood scenarios for different rainfall return periods
- Calculating vulnerability metrics for drainage components

## Base URL

```
NEXT_PUBLIC_RAILWAY_URL=https://your-app.railway.app
```

## Authentication

Currently, the API is open (no authentication required). In production, consider adding API key authentication.

## Endpoints

### 1. Run SWMM Simulation

Run a complete SWMM simulation with custom parameters.

**Endpoint:** `POST /swmm-simulate`

**Request Body:**

```typescript
interface SimulationRequest {
  nodes: Array<{
    id: string
    inlet_type: string
    max_depth: number
    clog_factor: number
    inv_elev: number
    length: number
    width: number
    weir_coeff: number
  }>
  links: Array<{
    id: string
    from_node: string
    to_node: string
    length: number
    roughness: number
    inlet_offset: number
    outlet_offset: number
    shape: string
    geom1: number
    geom2: number
    barrels: number
  }>
  rainfall: {
    total_precipitation: number
    duration_hours: number
    time_step_minutes: number
  }
}
```

**Example Request:**

```typescript
// lib/simulation-api/simulation.ts
export async function runSimulation(params: SimulationRequest) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_RAILWAY_URL}/swmm-simulate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    }
  )

  if (!response.ok) {
    throw new Error(`Simulation failed: ${response.statusText}`)
  }

  return await response.json()
}
```

**Response:**

```typescript
interface SimulationResponse {
  node_results: {
    [nodeId: string]: {
      max_flooding: number        // Maximum flooding rate (CMS)
      total_flooding: number      // Total flood volume (cubic meters)
      peak_inflow: number         // Peak inflow rate (CMS)
      flooding_volume: number     // Flooding volume (cubic meters)
      overflow_duration: number   // Duration of overflow (minutes)
      max_depth: number          // Maximum depth (meters)
    }
  }
  link_results: {
    [linkId: string]: {
      peak_flow: number          // Peak flow rate (CMS)
      max_velocity: number       // Maximum velocity (m/s)
      max_depth: number          // Maximum depth (meters)
      capacity_ratio: number     // Flow / Full capacity
    }
  }
  summary: {
    total_simulation_time: number  // Total simulation time (hours)
    total_rainfall: number         // Total rainfall (mm)
    total_flooding: number         // System-wide flooding (cubic meters)
    critical_nodes: string[]       // IDs of nodes with critical flooding
  }
}
```

**Usage Example:**

```typescript
import { runSimulation } from '@/lib/simulation-api/simulation'

// Prepare simulation parameters
const simulationParams = {
  nodes: [
    {
      id: 'N1',
      inlet_type: 'GRATE',
      max_depth: 2.5,
      clog_factor: 0.1,
      inv_elev: 100.0,
      length: 0.5,
      width: 0.5,
      weir_coeff: 1.8
    }
  ],
  links: [
    {
      id: 'C1',
      from_node: 'N1',
      to_node: 'N2',
      length: 100.0,
      roughness: 0.013,
      inlet_offset: 0,
      outlet_offset: 0,
      shape: 'CIRCULAR',
      geom1: 0.6,
      geom2: 0,
      barrels: 1
    }
  ],
  rainfall: {
    total_precipitation: 100, // mm
    duration_hours: 2,
    time_step_minutes: 5
  }
}

// Run simulation
const results = await runSimulation(simulationParams)

// Access results
console.log('Total flooding:', results.summary.total_flooding)
console.log('Node N1 max flooding:', results.node_results.N1.max_flooding)
```

### 2. Predict 25-Year Flood Scenario

Predict flooding for a 25-year return period rainfall event.

**Endpoint:** `POST /predict-25yr`

**Request Body:**

```typescript
interface PredictionRequest {
  location_id: string
  drainage_data: DrainageNetworkData
}
```

**Response:**

```typescript
interface PredictionResponse {
  scenario: '25yr'
  flood_probability: number
  vulnerable_nodes: Array<{
    node_id: string
    flood_depth: number
    risk_level: 'low' | 'medium' | 'high' | 'critical'
  }>
  recommendations: string[]
}
```

### 3. Predict 50-Year Flood Scenario

**Endpoint:** `POST /predict-50yr`

Same structure as 25-year prediction.

### 4. Predict 100-Year Flood Scenario

**Endpoint:** `POST /predict-100yr`

Same structure as 25-year prediction.

## Data Transformation

### Transform Results to Vulnerability Table

```typescript
// lib/simulation-api/simulation.ts
export function transformToNodeDetails(
  simulationResults: SimulationResponse
): VulnerabilityTableRow[] {
  return Object.entries(simulationResults.node_results).map(
    ([nodeId, metrics]) => ({
      id: nodeId,
      name: `Node ${nodeId}`,
      flooding_volume: metrics.flooding_volume,
      max_flooding: metrics.max_flooding,
      overflow_duration: metrics.overflow_duration,
      peak_inflow: metrics.peak_inflow,
      vulnerability_rank: calculateVulnerability(metrics),
      risk_level: getRiskLevel(metrics.flooding_volume)
    })
  )
}

function calculateVulnerability(metrics: NodeMetrics): number {
  // Weighted scoring system
  const floodingScore = metrics.flooding_volume * 0.4
  const overflowScore = metrics.overflow_duration * 0.3
  const inflowScore = metrics.peak_inflow * 0.3

  return Math.min(100, floodingScore + overflowScore + inflowScore)
}

function getRiskLevel(floodingVolume: number): string {
  if (floodingVolume > 100) return 'critical'
  if (floodingVolume > 50) return 'high'
  if (floodingVolume > 10) return 'medium'
  return 'low'
}
```

## Error Handling

### Common Errors

```typescript
try {
  const results = await runSimulation(params)
} catch (error) {
  if (error.message.includes('500')) {
    // Server error - likely SWMM computation failure
    console.error('Simulation failed:', error)
    toast.error('Simulation failed. Check your input parameters.')
  } else if (error.message.includes('timeout')) {
    // Request timeout
    console.error('Simulation timeout')
    toast.error('Simulation taking too long. Try reducing the simulation time.')
  } else if (error.message.includes('400')) {
    // Bad request - invalid parameters
    console.error('Invalid parameters:', error)
    toast.error('Invalid simulation parameters.')
  } else {
    console.error('Unknown error:', error)
    toast.error('An error occurred. Please try again.')
  }
}
```

### Validation

Validate parameters before sending to API:

```typescript
function validateSimulationParams(params: SimulationRequest): string[] {
  const errors: string[] = []

  // Validate nodes
  params.nodes.forEach(node => {
    if (node.max_depth <= 0) {
      errors.push(`Node ${node.id}: max_depth must be positive`)
    }
    if (node.clog_factor < 0 || node.clog_factor > 1) {
      errors.push(`Node ${node.id}: clog_factor must be between 0 and 1`)
    }
  })

  // Validate links
  params.links.forEach(link => {
    if (link.length <= 0) {
      errors.push(`Link ${link.id}: length must be positive`)
    }
    if (link.roughness <= 0) {
      errors.push(`Link ${link.id}: roughness must be positive`)
    }
  })

  // Validate rainfall
  if (params.rainfall.total_precipitation <= 0) {
    errors.push('Total precipitation must be positive')
  }
  if (params.rainfall.duration_hours <= 0) {
    errors.push('Duration must be positive')
  }

  return errors
}
```

## Parameter Guidelines

### Node Parameters

| Parameter | Description | Typical Range | Unit |
|-----------|-------------|---------------|------|
| `max_depth` | Maximum depth of node | 0.5 - 5.0 | meters |
| `clog_factor` | Percentage of inlet clogging | 0.0 - 0.5 | ratio |
| `inv_elev` | Invert elevation | 0 - 1000 | meters |
| `length` | Inlet opening length | 0.3 - 2.0 | meters |
| `width` | Inlet opening width | 0.3 - 2.0 | meters |
| `weir_coeff` | Weir coefficient | 1.5 - 2.0 | - |

### Link Parameters

| Parameter | Description | Typical Range | Unit |
|-----------|-------------|---------------|------|
| `length` | Pipe length | 10 - 500 | meters |
| `roughness` | Manning's n | 0.011 - 0.015 | - |
| `geom1` | Diameter (circular) or height | 0.3 - 3.0 | meters |
| `geom2` | Width (rectangular) | 0.3 - 3.0 | meters |
| `barrels` | Number of barrels | 1 - 4 | count |

### Rainfall Parameters

| Parameter | Description | Typical Range | Unit |
|-----------|-------------|---------------|------|
| `total_precipitation` | Total rainfall | 10 - 200 | mm |
| `duration_hours` | Storm duration | 0.5 - 24 | hours |
| `time_step_minutes` | Calculation timestep | 1 - 15 | minutes |

## Performance Considerations

1. **Simulation Duration**: Large networks with many nodes/links will take longer
   - Small network (< 50 nodes): 2-5 seconds
   - Medium network (50-200 nodes): 5-15 seconds
   - Large network (> 200 nodes): 15-60 seconds

2. **Time Step**: Smaller time steps increase accuracy but slow down simulation
   - Recommended: 5 minutes for most cases
   - Use 1-2 minutes for high-detail analysis

3. **Parallel Requests**: The API can handle multiple simultaneous simulations
   - Use Promise.all() for batch predictions

4. **Caching**: Consider caching results for identical parameter sets

## Integration Example

Complete example of running a simulation from the UI:

```typescript
// app/simulation/page.tsx
'use client'

import { useState } from 'react'
import { runSimulation, transformToNodeDetails } from '@/lib/simulation-api/simulation'
import { VulnerabilityDataTable } from '@/components/vulnerability-data-table'

export default function SimulationPage() {
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSimulate() {
    setLoading(true)

    try {
      const params = {
        nodes: gatherNodeParams(),
        links: gatherLinkParams(),
        rainfall: {
          total_precipitation: 100,
          duration_hours: 2,
          time_step_minutes: 5
        }
      }

      const response = await runSimulation(params)
      const tableData = transformToNodeDetails(response)
      setResults(tableData)
    } catch (error) {
      console.error('Simulation failed:', error)
      alert('Simulation failed. Please check your parameters.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button onClick={handleSimulate} disabled={loading}>
        {loading ? 'Running...' : 'Run Simulation'}
      </button>

      {results && (
        <VulnerabilityDataTable data={results} />
      )}
    </div>
  )
}
```

## Backend Implementation (FastAPI)

For reference, here's what the backend endpoint looks like:

```python
# main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from pyswmm import Simulation, Nodes, Links
import tempfile
import os

app = FastAPI()

class SimulationRequest(BaseModel):
    nodes: list
    links: list
    rainfall: dict

@app.post("/swmm-simulate")
async def run_swmm_simulation(request: SimulationRequest):
    try:
        # Create temporary INP file
        inp_file = create_inp_file(request)

        # Run simulation
        with Simulation(inp_file) as sim:
            results = {"node_results": {}, "link_results": {}}

            for step in sim:
                # Collect results during simulation
                pass

            # Gather final results
            for node_id in request.nodes:
                node = Nodes(sim)[node_id['id']]
                results["node_results"][node_id['id']] = {
                    "max_flooding": node.flooding,
                    # ... other metrics
                }

        # Clean up
        os.remove(inp_file)

        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

## Related Documentation

- [EPA SWMM Documentation](https://www.epa.gov/water-research/storm-water-management-model-swmm)
- [PySWMM Documentation](https://pyswmm.readthedocs.io/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)

---

For database operations, see [Supabase API](SUPABASE.md).
For report endpoints, see [Report API](REPORTS.md).
