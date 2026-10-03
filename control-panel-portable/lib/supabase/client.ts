// Mock Supabase client for the portable "look only" bundle.
// No network calls — every query resolves to a benign empty/demo result so the
// UI renders without a real backend. Mirrors the chainable query-builder,
// storage, auth and realtime-channel surface the control panel touches.

const DEMO_PROFILE: Record<string, unknown> = {
  id: 'demo-user',
  full_name: 'Demo User',
  avatar_url: '',
  role: 'admin',
  agency_id: 'demo-agency',
};

const CHAINABLE = [
  'select',
  'insert',
  'update',
  'delete',
  'upsert',
  'eq',
  'neq',
  'in',
  'lte',
  'gte',
  'lt',
  'gt',
  'order',
  'limit',
  'range',
  'match',
  'filter',
  'is',
  'contains',
  'not',
] as const;

function makeQueryBuilder(table: string) {
  let wantsSingle = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: any = {};
  for (const m of CHAINABLE) builder[m] = () => builder;
  builder.single = () => {
    wantsSingle = true;
    return builder;
  };
  builder.maybeSingle = () => {
    wantsSingle = true;
    return builder;
  };
  // Make the builder awaitable.
  builder.then = (resolve: (value: unknown) => unknown) => {
    if (wantsSingle) {
      return resolve({
        data: table === 'profiles' ? DEMO_PROFILE : null,
        error: null,
      });
    }
    return resolve({ data: [], error: null, count: 0 });
  };
  return builder;
}

const storageBucket = {
  upload: async () => ({ data: { path: '' }, error: null }),
  remove: async () => ({ data: [], error: null }),
  download: async () => ({ data: null, error: null }),
  getPublicUrl: (_path: string) => ({ data: { publicUrl: '' } }),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const client: any = {
  from: (table: string) => makeQueryBuilder(table),
  storage: { from: (_bucket: string) => storageBucket },
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),
  },
  channel: () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ch: any = { on: () => ch, subscribe: () => ch };
    return ch;
  },
  removeChannel: () => {},
};

export default client;
