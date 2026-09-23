// Mock of the drainage data hooks for the portable bundle.
// Original used TanStack Query + GeoJSON fetches; this returns static demo data
// synchronously so the panel renders without any data layer or QueryClient.

import type {
  Inlet,
  Outlet,
  Pipe,
  Drain,
} from '@/components/control-panel/types';

interface MockQueryResult<T> {
  data: T[];
  isLoading: boolean;
  error: Error | null;
  isError: boolean;
  isSuccess: boolean;
  refetch: () => Promise<void>;
}

function ok<T>(data: T[]): MockQueryResult<T> {
  return {
    data,
    isLoading: false,
    error: null,
    isError: false,
    isSuccess: true,
    refetch: async () => {},
  };
}

const MOCK_INLETS: Inlet[] = [
  {
    id: 'INL-001',
    Inv_Elev: 12.4,
    MaxDepth: 1.5,
    Length: 0.9,
    Height: 0.6,
    Weir_Coeff: 1.84,
    In_Type: 1,
    ClogFac: 0.2,
    ClogTime: 24,
    FPLAIN_080: 0,
    coordinates: [123.9417, 10.3296],
  },
  {
    id: 'INL-002',
    Inv_Elev: 11.1,
    MaxDepth: 1.2,
    Length: 0.8,
    Height: 0.5,
    Weir_Coeff: 1.84,
    In_Type: 2,
    ClogFac: 0.35,
    ClogTime: 18,
    FPLAIN_080: 1,
    coordinates: [123.943, 10.3285],
  },
];

const MOCK_OUTLETS: Outlet[] = [
  {
    id: 'OUT-001',
    Inv_Elev: 8.2,
    AllowQ: 3.5,
    FlapGate: 1,
    coordinates: [123.9462, 10.3258],
  },
  {
    id: 'OUT-002',
    Inv_Elev: 7.6,
    AllowQ: 4.1,
    FlapGate: 0,
    coordinates: [123.9448, 10.3271],
  },
];

const MOCK_PIPES: Pipe[] = [
  {
    id: 'PIPE-001',
    TYPE: 'Concrete',
    Pipe_Shape: 'Circular',
    Pipe_Lngth: 124.5,
    Height: 0.9,
    Width: 0.9,
    Barrels: 1,
    ClogPer: 0.15,
    ClogTime: 36,
    Mannings: 0.013,
    coordinates: [
      [123.9402, 10.331],
      [123.9417, 10.3296],
    ],
  },
  {
    id: 'PIPE-002',
    TYPE: 'RCP',
    Pipe_Shape: 'Box',
    Pipe_Lngth: 88.0,
    Height: 1.2,
    Width: 1.5,
    Barrels: 2,
    ClogPer: 0.05,
    ClogTime: 48,
    Mannings: 0.012,
    coordinates: [
      [123.9417, 10.3296],
      [123.9448, 10.3271],
    ],
  },
];

const MOCK_DRAINS: Drain[] = [
  {
    id: 'DRN-001',
    In_Name: 'DRN-001',
    InvElev: 10.5,
    clog_per: 0.25,
    clogtime: 20,
    Weir_coeff: 1.7,
    Length: 0.7,
    Height: 0.7,
    Max_Depth: 1.4,
    ClogFac: 0.3,
    NameNum: 1,
    FPLAIN_080: 0,
    coordinates: [123.9385, 10.3331],
  },
  {
    id: 'DRN-002',
    In_Name: 'DRN-002',
    InvElev: 9.8,
    clog_per: 0.4,
    clogtime: 15,
    Weir_coeff: 1.7,
    Length: 0.6,
    Height: 0.6,
    Max_Depth: 1.1,
    ClogFac: 0.45,
    NameNum: 2,
    FPLAIN_080: 1,
    coordinates: [123.9371, 10.3344],
  },
];

export function useInlets(): MockQueryResult<Inlet> {
  return ok(MOCK_INLETS);
}
export function useOutlets(): MockQueryResult<Outlet> {
  return ok(MOCK_OUTLETS);
}
export function usePipes(): MockQueryResult<Pipe> {
  return ok(MOCK_PIPES);
}
export function useDrains(): MockQueryResult<Drain> {
  return ok(MOCK_DRAINS);
}
