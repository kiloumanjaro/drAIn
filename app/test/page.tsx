// app/test-simulation/page.tsx or pages/test-simulation.tsx

'use client'; // If using App Router

import { useState } from 'react';
import {
  runSimulation,
  type SimulationResponse,
} from '@/lib/simulation-api/simulation';

export default function TestSimulation() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimulationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    // Sample data
    const nodes = {
      'I-4': {
        inv_elev: 16.1,
        init_depth: 0,
        ponding_area: 0,
        surcharge_depth: 0,
      },
    };

    const links = {};

    const rainfall = {
      total_precip: 104.9,
      duration_hr: 1,
    };

    try {
      const data = await runSimulation(nodes, links, rainfall);
      setResult(data);
      // console.log('✅ Simulation successful:', data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('❌ Simulation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-3xl font-bold">SWMM API Test</h1>

        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <button
            onClick={handleTest}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {loading ? 'Running Simulation...' : 'Run Test Simulation'}
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
              <span className="text-blue-700">Running simulation...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6">
            <h2 className="mb-2 text-xl font-semibold text-red-700">
              ❌ Error
            </h2>
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Success State */}
        {result && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-6">
            <h2 className="mb-4 text-xl font-semibold text-green-700">
              ✅ Simulation Complete
            </h2>
            <div className="max-h-96 overflow-auto rounded bg-white p-4">
              <pre className="text-sm text-gray-800">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 rounded-lg bg-gray-100 p-6">
          <h3 className="mb-2 font-semibold">📝 What this test does:</h3>
          <ul className="list-inside list-disc space-y-1 text-gray-700">
            <li>
              Sends sample nodes, links, and rainfall data to your Railway API
            </li>
            <li>Displays the flooding summary results</li>
            <li>Shows any errors that occur</li>
          </ul>

          <div className="mt-4 border-t border-gray-300 pt-4">
            <p className="text-sm text-gray-600">
              <strong>API Endpoint:</strong>{' '}
              https://web-production-2976d.up.railway.app/run-simulation
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
