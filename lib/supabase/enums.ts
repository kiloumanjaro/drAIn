import { Constants, type Database } from '@/types/database.types';

/**
 * The database's fixed vocabularies, as TypeScript types. They come from the
 * generated types, so a value added to an enum in supabase/schemas shows up
 * here after `gen types`, and a value removed breaks the build where it's
 * still used.
 */
type Enums = Database['public']['Enums'];

export type ComponentType = Enums['component_type'];
export type ReportStatus = Enums['report_status'];
export type ReportPriority = Enums['report_priority'];
export type MaintenanceStatus = Enums['maintenance_status'];
export type UserRole = Enums['user_role'];
export type ReportReview = Enums['report_review'];
export type PhotoLocationCheck = Enums['photo_location_check'];

const oneOf =
  <T extends string>(values: readonly T[]) =>
  (value: unknown): value is T =>
    typeof value === 'string' && (values as readonly string[]).includes(value);

/** True for 'inlets', 'outlets', 'storm_drains' or 'man_pipes'. */
export const isComponentType = oneOf(Constants.public.Enums.component_type);
export const isReportPriority = oneOf(Constants.public.Enums.report_priority);
