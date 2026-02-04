export interface Report {
  id: string;
  category: string;
  description: string;
  image: string | null;
  reporterName: string;
  date: string;
  status: 'pending' | 'in-progress' | 'resolved';
  componentType: 'inlet' | 'outlet' | 'pipe' | 'drain';
  componentId: string;
  coordinates: [number, number]; // [longitude, latitude]
}

export const dummyReports: Report[] = [
  {
    id: '1',
    category: 'Blockage',
    description:
      'Inlet is completely blocked with debris and leaves. Water is pooling on the street during rain.',
    image: '/images/blocked-inlet.jpg',
    reporterName: 'John Smith',
    date: '2025-09-28T10:30:00Z',
    status: 'pending',
    componentType: 'inlet',
    componentId: 'I-0',
    coordinates: [123.915424397260537, 10.360172475881017], // I-0
  },
  {
    id: '2',
    category: 'Structural Damage',
    description:
      'Outlet pipe is cracked and leaking. Erosion visible around the outlet area.',
    image: '/images/cracked-outlet.jpg',
    reporterName: 'Maria Garcia',
    date: '2025-09-27T14:15:00Z',
    status: 'in-progress',
    componentType: 'outlet',
    componentId: 'O1',
    coordinates: [123.918361755162664, 10.357608641506733], // I-1
  },
  {
    id: '3',
    category: 'Clogging',
    description:
      'Pipe appears to be severely clogged. Slow drainage and backup observed during last rainfall.',
    image: '/images/clogged-pipe.jpg',
    reporterName: 'Robert Johnson',
    date: '2025-09-26T08:45:00Z',
    status: 'resolved',
    componentType: 'pipe',
    componentId: 'P1',
    coordinates: [123.920987252764391, 10.338730655455292], // I-2
  },
  {
    id: '4',
    category: 'Odor',
    description:
      'Strong sewage smell coming from storm drain. Possible blockage or stagnant water.',
    image: '/images/drain-odor.jpg',
    reporterName: 'Sarah Chen',
    date: '2025-09-25T16:20:00Z',
    status: 'pending',
    componentType: 'drain',
    componentId: 'SD1',
    coordinates: [123.921170664731619, 10.354456954123773], // I-3
  },
  {
    id: '5',
    category: 'Missing Grate',
    description:
      'Inlet grate is missing, creating a safety hazard. Opening is exposed and dangerous.',
    image: null,
    reporterName: 'Michael Brown',
    date: '2025-09-24T11:00:00Z',
    status: 'in-progress',
    componentType: 'inlet',
    componentId: 'I-4',
    coordinates: [123.921962851926708, 10.338411826888034], // I-4
  },
  {
    id: '6',
    category: 'Overflow',
    description:
      'Outlet is overflowing during normal rain conditions. Possible downstream blockage.',
    image: '/images/overflow-outlet.jpg',
    reporterName: 'Lisa Anderson',
    date: '2025-09-23T09:30:00Z',
    status: 'resolved',
    componentType: 'outlet',
    componentId: 'O2',
    coordinates: [123.923446999999769, 10.334737], // I-5
  },
  {
    id: '7',
    category: 'Corrosion',
    description:
      'Severe corrosion visible on pipe section. Metal is deteriorating and may fail soon.',
    image: '/images/corroded-pipe.jpg',
    reporterName: 'David Martinez',
    date: '2025-09-22T13:45:00Z',
    status: 'pending',
    componentType: 'pipe',
    componentId: 'P2',
    coordinates: [123.924270610005564, 10.337863285361866], // I-6
  },
  {
    id: '8',
    category: 'Vegetation',
    description:
      'Tree roots growing into storm drain. Causing partial blockage and structural damage.',
    image: null,
    reporterName: 'Jennifer Wilson',
    date: '2025-09-21T07:15:00Z',
    status: 'resolved',
    componentType: 'drain',
    componentId: 'SD2',
    coordinates: [123.924274242405161, 10.328531541760796], // I-7
  },
  {
    id: '9',
    category: 'Sediment Buildup',
    description:
      'Heavy sediment buildup in inlet reducing capacity. Needs cleaning urgently.',
    image: '/images/sediment-inlet.jpg',
    reporterName: 'Thomas Lee',
    date: '2025-09-20T15:50:00Z',
    status: 'in-progress',
    componentType: 'inlet',
    componentId: 'I-8',
    coordinates: [123.924471617302004, 10.323027400798289], // I-8
  },
  {
    id: '10',
    category: 'Collapse',
    description:
      'Partial pipe collapse detected. Water flow is restricted and flooding risk is high.',
    image: null,
    reporterName: 'Amanda Taylor',
    date: '2025-09-19T06:30:00Z',
    status: 'pending',
    componentType: 'pipe',
    componentId: 'P3',
    coordinates: [123.924715052953118, 10.339478649035902], // I-9
  },
];
