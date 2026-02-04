import type { FieldConfig, DatasetType } from './types';

export const FIELD_CONFIGS: Record<DatasetType, FieldConfig[]> = {
  inlets: [
    {
      label: 'ID',
      key: 'id',
      description: 'Unique code identifying each drainage structure.',
    },
    {
      label: 'Inverted Elevation',
      key: 'Inv_Elev',
      description:
        "Height of the drain's lowest point above a reference level.",
      unit: 'm',
    },
    {
      label: 'Max Depth',
      key: 'MaxDepth',
      description: 'Maximum depth from surface to the bottom of the drain.',
      unit: 'm',
    },
    {
      label: 'Length',
      key: 'Length',
      description: 'Horizontal distance or span of the drainage segment.',
      unit: 'm',
    },
    {
      label: 'Height',
      key: 'Height',
      description: 'Vertical dimension of the drain or opening.',
      unit: 'm',
    },
    {
      label: 'Weir Coefficient',
      key: 'Weir_Coeff',
      description: 'Factor showing how efficiently water flows over a weir.',
    },
    {
      label: 'Inlet Type',
      key: 'In_Type',
      description: 'Category or code describing the type of inlet.',
    },
    {
      label: 'Clog Factor',
      key: 'ClogFac',
      description: 'Estimated percentage of flow reduction from blockage.',
      unit: '%',
    },
    {
      label: 'Clog Time',
      key: 'ClogTime',
      description: 'Estimated time before clogging begins to affect flow.',
      unit: 'hr',
    },
  ],
  man_pipes: [
    {
      label: 'Pipe ID',
      key: 'id',
      description: 'Unique code identifying each pipe in the drainage network.',
    },
    {
      label: 'Type',
      key: 'TYPE',
      description: 'Material or classification of the pipe used.',
    },
    {
      label: 'Shape',
      key: 'Pipe_Shape',
      description: 'Geometric form of the pipe cross-section.',
    },
    {
      label: 'Length',
      key: 'Pipe_Lngth',
      description: 'Total horizontal distance or span of the pipe.',
      unit: 'm',
    },
    {
      label: 'Height',
      key: 'Height',
      description: 'Vertical size or internal diameter of the pipe.',
      unit: 'm',
    },
    {
      label: 'Width',
      key: 'Width',
      description:
        'Horizontal dimension of the pipe, used for non-circular shapes.',
      unit: 'm',
    },
    {
      label: 'Barrels',
      key: 'Barrels',
      description:
        'Number of parallel pipes functioning together as one conduit.',
    },
    {
      label: 'Clog %',
      key: 'ClogPer',
      description: 'Estimated percentage of blockage reducing flow capacity.',
      unit: '%',
    },
    {
      label: 'Clog Time',
      key: 'ClogTime',
      description: 'Estimated time before clogging begins to affect flow.',
      unit: 'hr',
    },
    {
      label: "Manning's n",
      key: 'Mannings',
      description:
        'Roughness coefficient representing flow resistance inside the pipe.',
    },
  ],
  outlets: [
    {
      label: 'Outlet ID',
      key: 'id',
      description: 'Unique code identifying each drainage outlet.',
    },
    {
      label: 'Inverted Elevation',
      key: 'Inv_Elev',
      description:
        "Height of the outlet's lowest point above a reference level.",
      unit: 'm',
    },
    {
      label: 'AllowQ',
      key: 'AllowQ',
      description: 'Indicates whether flow through the outlet is allowed.',
    },
    {
      label: 'Flap Gate',
      key: 'FlapGate',
      description: 'Specifies if a flap gate is installed to prevent backflow.',
    },
  ],
  storm_drains: [
    {
      label: 'ID',
      key: 'id',
      description: 'Unique identifier for the storm drain.',
    },
    {
      label: 'Elevation',
      key: 'InvElev',
      description:
        "Height of the drain's lowest point above a reference level.",
      unit: 'm',
    },
    {
      label: 'Clog %',
      key: 'clog_per',
      description: 'Estimated percentage of blockage reducing flow capacity.',
      unit: '%',
    },
    {
      label: 'Clog Time',
      key: 'clogtime',
      description: 'Estimated time before clogging begins to affect flow.',
      unit: 'hr',
    },
    {
      label: 'Weir Coefficient',
      key: 'Weir_coeff',
      description: 'Factor showing how efficiently water flows over a weir.',
    },
    {
      label: 'Length',
      key: 'Length',
      description: 'Horizontal distance or span of the drainage segment.',
      unit: 'm',
    },
    {
      label: 'Height',
      key: 'Height',
      description: 'Vertical dimension of the drain or opening.',
      unit: 'm',
    },
    {
      label: 'Max Depth',
      key: 'Max_Depth',
      description: 'Maximum depth from surface to the bottom of the drain.',
      unit: 'm',
    },
  ],
};

export const MODEL_URLS: Record<DatasetType, string> = {
  inlets: '/models/inlet.glb',
  man_pipes: '/models/pipe.glb',
  outlets: '/models/outlet.glb',
  storm_drains: '/models/storm_drain.glb',
};

export const DETAIL_TITLES: Record<DatasetType, string> = {
  inlets: 'Inlet Details',
  man_pipes: 'Pipe Details',
  outlets: 'Outlet Details',
  storm_drains: 'Drain Details',
};
