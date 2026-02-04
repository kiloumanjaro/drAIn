# Supabase API Documentation

Complete reference for Supabase database operations, authentication, storage, and real-time subscriptions.

## Overview

drAIn uses Supabase as its primary backend, providing:

- PostgreSQL database with PostGIS extension
- Authentication and user management
- File storage for images
- Real-time data synchronization

## Configuration

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Client Initialization

```typescript
// lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

## Database Schema

### Tables

#### profiles

User profile information.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT,
  avatar_url TEXT,
  role TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Columns:**

- `id` (UUID, PK): User ID from auth.users
- `full_name` (TEXT): User's full name
- `avatar_url` (TEXT): URL to avatar image in storage
- `role` (TEXT): User role (admin, user, agency)
- `created_at` (TIMESTAMP): Account creation time

#### reports

Flood and drainage issue reports.

```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL,
  description TEXT,
  image TEXT,
  reporter_name TEXT,
  status TEXT DEFAULT 'pending',
  component_id TEXT,
  long DECIMAL(10, 8),
  lat DECIMAL(10, 8),
  address TEXT,
  geocoded_status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES profiles(id)
);
```

**Columns:**

- `id` (UUID, PK): Unique report identifier
- `category` (TEXT): Report type (blockage, overflow, damage, other)
- `description` (TEXT): Detailed description of the issue
- `image` (TEXT): URL to uploaded image
- `reporter_name` (TEXT): Name of person submitting report
- `status` (TEXT): Current status (pending, in_progress, fixed, rejected)
- `component_id` (TEXT): ID of nearest drainage component
- `long` (DECIMAL): Longitude coordinate
- `lat` (DECIMAL): Latitude coordinate
- `address` (TEXT): Human-readable address
- `geocoded_status` (TEXT): Geocoding result status
- `created_at` (TIMESTAMP): Report submission time
- `user_id` (UUID, FK): User who submitted the report

#### Maintenance Tables

```sql
-- inlets_maintenance
CREATE TABLE inlets_maintenance (
  id UUID PRIMARY KEY,
  inlet_id TEXT REFERENCES inlets(id),
  maintenance_date TIMESTAMP,
  description TEXT,
  performed_by TEXT,
  status TEXT
);

-- Similar structure for:
-- outlets_maintenance
-- drains_maintenance
-- pipes_maintenance
```

## Authentication API

### Sign Up

Create a new user account.

```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure_password123',
  options: {
    data: {
      full_name: 'John Doe',
    },
  },
});
```

**Response:**

```typescript
{
  user: {
    id: "uuid",
    email: "user@example.com",
    // ... other user fields
  },
  session: {
    access_token: "jwt_token",
    refresh_token: "refresh_token",
    expires_in: 3600
  }
}
```

### Sign In

Authenticate an existing user.

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'secure_password123',
});
```

### Get Session

Retrieve the current session.

```typescript
const {
  data: { session },
  error,
} = await supabase.auth.getSession();
```

### Sign Out

Log out the current user.

```typescript
const { error } = await supabase.auth.signOut();
```

### Get User

Get the currently authenticated user.

```typescript
const {
  data: { user },
  error,
} = await supabase.auth.getUser();
```

## Database Operations

### Profiles

#### Get Profile

```typescript
// lib/supabase/profile.ts
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}
```

#### Update Profile

```typescript
export async function updateUserProfile(
  userId: string,
  updates: { full_name?: string; avatar_url?: string }
) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

### Reports

#### Fetch All Reports

```typescript
// lib/supabase/report.ts
export async function fetchAllReports() {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}
```

#### Fetch Reports with Filters

```typescript
export async function fetchReportsByStatus(status: string) {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}
```

#### Fetch Latest Report Per Component

```typescript
export async function fetchLatestReportsPerComponent() {
  const { data, error } = await supabase.rpc(
    'get_latest_reports_per_component'
  );

  if (error) throw error;
  return data;
}
```

#### Upload Report with Image

```typescript
export async function uploadReport(report: {
  category: string;
  description: string;
  image?: File;
  reporter_name: string;
  status: string;
  long: number;
  lat: number;
  address: string;
  user_id?: string;
}) {
  let imageUrl: string | null = null;

  // Upload image if provided
  if (report.image) {
    const fileName = `${Date.now()}_${report.image.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('ReportImage')
      .upload(fileName, report.image);

    if (uploadError) throw uploadError;

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('ReportImage').getPublicUrl(fileName);

    imageUrl = publicUrl;
  }

  // Insert report
  const { data, error } = await supabase
    .from('reports')
    .insert({
      ...report,
      image: imageUrl,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

#### Update Report Status

```typescript
export async function updateReportStatus(reportId: string, status: string) {
  const { data, error } = await supabase
    .from('reports')
    .update({ status })
    .eq('id', reportId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

#### Delete Report

```typescript
export async function deleteReport(reportId: string) {
  const { error } = await supabase.from('reports').delete().eq('id', reportId);

  if (error) throw error;
}
```

## Storage API

### Upload Image

```typescript
const { data, error } = await supabase.storage
  .from('ReportImage')
  .upload('path/to/image.jpg', file, {
    cacheControl: '3600',
    upsert: false,
  });
```

### Get Public URL

```typescript
const { data } = supabase.storage
  .from('ReportImage')
  .getPublicUrl('path/to/image.jpg');

const publicUrl = data.publicUrl;
```

### Delete Image

```typescript
const { error } = await supabase.storage
  .from('ReportImage')
  .remove(['path/to/image.jpg']);
```

### List Files

```typescript
const { data, error } = await supabase.storage
  .from('ReportImage')
  .list('folder', {
    limit: 100,
    offset: 0,
    sortBy: { column: 'name', order: 'asc' },
  });
```

## Real-time Subscriptions

### Subscribe to Report Changes

```typescript
const channel = supabase
  .channel('reports-db-changes')
  .on(
    'postgres_changes',
    {
      event: '*', // INSERT, UPDATE, DELETE, or *
      schema: 'public',
      table: 'reports',
    },
    (payload) => {
      console.log('Change received!', payload);
      // Handle the change
    }
  )
  .subscribe();
```

### Subscribe to Specific Event

```typescript
// Only new inserts
const channel = supabase
  .channel('new-reports')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'reports',
    },
    (payload) => {
      console.log('New report:', payload.new);
    }
  )
  .subscribe();
```

### Subscribe with Filters

```typescript
// Only specific status
const channel = supabase
  .channel('pending-reports')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'reports',
      filter: 'status=eq.pending',
    },
    (payload) => {
      console.log('Pending report updated:', payload.new);
    }
  )
  .subscribe();
```

### Unsubscribe

```typescript
supabase.removeChannel(channel);
```

## Row Level Security (RLS)

### Example Policies

```sql
-- Allow users to read all reports
CREATE POLICY "Public reports are viewable by everyone"
  ON reports FOR SELECT
  USING (true);

-- Allow users to insert their own reports
CREATE POLICY "Users can insert their own reports"
  ON reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own reports
CREATE POLICY "Users can update their own reports"
  ON reports FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow users to view their own profile
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);
```

## Error Handling

### Common Errors

```typescript
try {
  const { data, error } = await supabase.from('reports').select('*');

  if (error) throw error;
  return data;
} catch (error) {
  if (error.code === 'PGRST116') {
    // No rows returned
    console.log('No data found');
  } else if (error.code === '23505') {
    // Unique constraint violation
    console.error('Duplicate entry');
  } else {
    console.error('Database error:', error.message);
  }
}
```

## Best Practices

1. **Always handle errors**: Check for errors after every operation
2. **Use RLS policies**: Protect your data at the database level
3. **Batch operations**: Use `.insert([...])` for multiple inserts
4. **Use indexes**: Add indexes to frequently queried columns
5. **Limit results**: Use `.limit()` to prevent large data transfers
6. **Clean up subscriptions**: Always unsubscribe when components unmount
7. **Use transactions**: For complex operations that need atomicity

## Rate Limits

- **Free tier**: 500 MB database, 1 GB file storage, 2 GB bandwidth
- **API requests**: No hard limit, but fair use applies
- **Real-time connections**: 200 concurrent connections on free tier

## Related Documentation

- [Supabase Official Docs](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [PostGIS Documentation](https://postgis.net/documentation/)

---

For simulation API, see [Simulation API](SIMULATION.md).
For report-specific endpoints, see [Report API](REPORTS.md).
