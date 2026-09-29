export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      agencies: {
        Row: {
          contact_details: Json | null;
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          contact_details?: Json | null;
          created_at?: string;
          id?: string;
          name: string;
        };
        Update: {
          contact_details?: Json | null;
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      barangay_boundaries: {
        Row: {
          boundary: unknown;
          created_at: string | null;
          id: number;
          land_area: string | null;
          name: string;
          population_count: string | null;
          population_density: string | null;
        };
        Insert: {
          boundary: unknown;
          created_at?: string | null;
          id?: number;
          land_area?: string | null;
          name: string;
          population_count?: string | null;
          population_density?: string | null;
        };
        Update: {
          boundary?: unknown;
          created_at?: string | null;
          id?: number;
          land_area?: string | null;
          name?: string;
          population_count?: string | null;
          population_density?: string | null;
        };
        Relationships: [];
      };
      components: {
        Row: {
          location: unknown;
          name: string;
          type: Database['public']['Enums']['component_type'];
        };
        Insert: {
          location: unknown;
          name: string;
          type: Database['public']['Enums']['component_type'];
        };
        Update: {
          location?: unknown;
          name?: string;
          type?: Database['public']['Enums']['component_type'];
        };
        Relationships: [];
      };
      flood_results: {
        Row: {
          cluster: number;
          cluster_score: number;
          hours_flooded: number;
          max_rate_cms: number;
          node_id: string;
          return_period: number;
          time_after_raining_min: number;
          time_of_max: number;
          total_flood_volume_megalitres: number;
          vulnerability_category: string;
          vulnerability_rank: number;
        };
        Insert: {
          cluster: number;
          cluster_score: number;
          hours_flooded: number;
          max_rate_cms: number;
          node_id: string;
          return_period: number;
          time_after_raining_min: number;
          time_of_max: number;
          total_flood_volume_megalitres: number;
          vulnerability_category: string;
          vulnerability_rank: number;
        };
        Update: {
          cluster?: number;
          cluster_score?: number;
          hours_flooded?: number;
          max_rate_cms?: number;
          node_id?: string;
          return_period?: number;
          time_after_raining_min?: number;
          time_of_max?: number;
          total_flood_volume_megalitres?: number;
          vulnerability_category?: string;
          vulnerability_rank?: number;
        };
        Relationships: [];
      };
      geocode_worker_lock: {
        Row: {
          id: number;
          is_running: boolean | null;
          started_at: string | null;
          started_by: string | null;
        };
        Insert: {
          id?: number;
          is_running?: boolean | null;
          started_at?: string | null;
          started_by?: string | null;
        };
        Update: {
          id?: number;
          is_running?: boolean | null;
          started_at?: string | null;
          started_by?: string | null;
        };
        Relationships: [];
      };
      inlets: {
        Row: {
          clogfac: number | null;
          clogtime: number | null;
          fplain_080: number | null;
          geom: unknown;
          gid: number;
          height: number | null;
          in_type: number | null;
          inv_elev: number | null;
          length: number | null;
          maxdepth: number | null;
          name: string | null;
          weir_coeff: number | null;
          x: number | null;
          y: number | null;
        };
        Insert: {
          clogfac?: number | null;
          clogtime?: number | null;
          fplain_080?: number | null;
          geom?: unknown;
          gid?: number;
          height?: number | null;
          in_type?: number | null;
          inv_elev?: number | null;
          length?: number | null;
          maxdepth?: number | null;
          name?: string | null;
          weir_coeff?: number | null;
          x?: number | null;
          y?: number | null;
        };
        Update: {
          clogfac?: number | null;
          clogtime?: number | null;
          fplain_080?: number | null;
          geom?: unknown;
          gid?: number;
          height?: number | null;
          in_type?: number | null;
          inv_elev?: number | null;
          length?: number | null;
          maxdepth?: number | null;
          name?: string | null;
          weir_coeff?: number | null;
          x?: number | null;
          y?: number | null;
        };
        Relationships: [];
      };
      maintenance: {
        Row: {
          agency_id: string;
          component_name: string;
          component_type: Database['public']['Enums']['component_type'];
          created_at: string;
          description: string | null;
          evidence_image: string | null;
          id: string;
          performed_at: string;
          performed_by: string | null;
          status: Database['public']['Enums']['maintenance_status'];
          verification_status: Database['public']['Enums']['verification_status'];
        };
        Insert: {
          agency_id: string;
          component_name: string;
          component_type: Database['public']['Enums']['component_type'];
          created_at?: string;
          description?: string | null;
          evidence_image?: string | null;
          id?: string;
          performed_at?: string;
          performed_by?: string | null;
          status: Database['public']['Enums']['maintenance_status'];
          verification_status?: Database['public']['Enums']['verification_status'];
        };
        Update: {
          agency_id?: string;
          component_name?: string;
          component_type?: Database['public']['Enums']['component_type'];
          created_at?: string;
          description?: string | null;
          evidence_image?: string | null;
          id?: string;
          performed_at?: string;
          performed_by?: string | null;
          status?: Database['public']['Enums']['maintenance_status'];
          verification_status?: Database['public']['Enums']['verification_status'];
        };
        Relationships: [
          {
            foreignKeyName: 'maintenance_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_component_name_fkey';
            columns: ['component_name'];
            isOneToOne: false;
            referencedRelation: 'component_locations';
            referencedColumns: ['name'];
          },
          {
            foreignKeyName: 'maintenance_component_name_fkey';
            columns: ['component_name'];
            isOneToOne: false;
            referencedRelation: 'components';
            referencedColumns: ['name'];
          },
          {
            foreignKeyName: 'maintenance_performed_by_fkey';
            columns: ['performed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      maintenance_reviews: {
        Row: {
          created_at: string;
          evidence_image: string | null;
          id: string;
          maintenance_id: string;
          note: string | null;
          report_id: string | null;
          reviewer_id: string | null;
          reviewer_kind: string;
          verdict: Database['public']['Enums']['review_verdict'];
        };
        Insert: {
          created_at?: string;
          evidence_image?: string | null;
          id?: string;
          maintenance_id: string;
          note?: string | null;
          report_id?: string | null;
          reviewer_id?: string | null;
          reviewer_kind: string;
          verdict: Database['public']['Enums']['review_verdict'];
        };
        Update: {
          created_at?: string;
          evidence_image?: string | null;
          id?: string;
          maintenance_id?: string;
          note?: string | null;
          report_id?: string | null;
          reviewer_id?: string | null;
          reviewer_kind?: string;
          verdict?: Database['public']['Enums']['review_verdict'];
        };
        Relationships: [
          {
            foreignKeyName: 'maintenance_reviews_maintenance_id_fkey';
            columns: ['maintenance_id'];
            isOneToOne: false;
            referencedRelation: 'maintenance';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_reviews_report_id_fkey';
            columns: ['report_id'];
            isOneToOne: false;
            referencedRelation: 'latest_report_per_component';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_reviews_report_id_fkey';
            columns: ['report_id'];
            isOneToOne: false;
            referencedRelation: 'report_repair_days';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_reviews_report_id_fkey';
            columns: ['report_id'];
            isOneToOne: false;
            referencedRelation: 'reports';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_reviews_reviewer_id_fkey';
            columns: ['reviewer_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      man_pipes: {
        Row: {
          barrels: number | null;
          clogper: number | null;
          clogtime: number | null;
          geom: unknown;
          gid: number;
          height: number | null;
          length: number | null;
          mannings: number | null;
          name: string | null;
          pipe_lngth: number | null;
          pipe_shape: string | null;
          type: string | null;
          width: number | null;
        };
        Insert: {
          barrels?: number | null;
          clogper?: number | null;
          clogtime?: number | null;
          geom?: unknown;
          gid?: number;
          height?: number | null;
          length?: number | null;
          mannings?: number | null;
          name?: string | null;
          pipe_lngth?: number | null;
          pipe_shape?: string | null;
          type?: string | null;
          width?: number | null;
        };
        Update: {
          barrels?: number | null;
          clogper?: number | null;
          clogtime?: number | null;
          geom?: unknown;
          gid?: number;
          height?: number | null;
          length?: number | null;
          mannings?: number | null;
          name?: string | null;
          pipe_lngth?: number | null;
          pipe_shape?: string | null;
          type?: string | null;
          width?: number | null;
        };
        Relationships: [];
      };
      outlets: {
        Row: {
          allowq: number | null;
          flapgate: number | null;
          fplain_080: number | null;
          geom: unknown;
          gid: number;
          inv_elev: number | null;
          join_count: number | null;
          name: string | null;
          target_fid: number | null;
          x: number | null;
          y: number | null;
        };
        Insert: {
          allowq?: number | null;
          flapgate?: number | null;
          fplain_080?: number | null;
          geom?: unknown;
          gid?: number;
          inv_elev?: number | null;
          join_count?: number | null;
          name?: string | null;
          target_fid?: number | null;
          x?: number | null;
          y?: number | null;
        };
        Update: {
          allowq?: number | null;
          flapgate?: number | null;
          fplain_080?: number | null;
          geom?: unknown;
          gid?: number;
          inv_elev?: number | null;
          join_count?: number | null;
          name?: string | null;
          target_fid?: number | null;
          x?: number | null;
          y?: number | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          agency_id: string | null;
          avatar_url: string | null;
          created_at: string;
          full_name: string | null;
          id: string;
          role: Database['public']['Enums']['user_role'];
          show_name_on_reports: boolean;
          updated_at: string;
        };
        Insert: {
          agency_id?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          role?: Database['public']['Enums']['user_role'];
          show_name_on_reports?: boolean;
          updated_at?: string;
        };
        Update: {
          agency_id?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          role?: Database['public']['Enums']['user_role'];
          show_name_on_reports?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
        ];
      };
      reports: {
        Row: {
          address: string | null;
          category: Database['public']['Enums']['component_type'] | null;
          component_id: string | null;
          created_at: string;
          description: string | null;
          geocoded_status: string | null;
          id: string;
          image: string | null;
          lat: number | null;
          long: number | null;
          photo_check: Database['public']['Enums']['photo_location_check'];
          photo_distance_m: number | null;
          photo_lat: number | null;
          photo_lon: number | null;
          photo_taken_at: string | null;
          priority: Database['public']['Enums']['report_priority'];
          reporter_name: string | null;
          resolved_at: string | null;
          resolved_by_maintenance_id: string | null;
          resolved_image: string | null;
          review_note: string | null;
          review_status: Database['public']['Enums']['report_review'];
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database['public']['Enums']['report_status'];
          user_id: string | null;
          zone: string | null;
        };
        Insert: {
          address?: string | null;
          category?: Database['public']['Enums']['component_type'] | null;
          component_id?: string | null;
          created_at?: string;
          description?: string | null;
          geocoded_status?: string | null;
          id?: string;
          image?: string | null;
          lat?: number | null;
          long?: number | null;
          photo_check?: Database['public']['Enums']['photo_location_check'];
          photo_distance_m?: number | null;
          photo_lat?: number | null;
          photo_lon?: number | null;
          photo_taken_at?: string | null;
          priority?: Database['public']['Enums']['report_priority'];
          reporter_name?: string | null;
          resolved_at?: string | null;
          resolved_by_maintenance_id?: string | null;
          resolved_image?: string | null;
          review_note?: string | null;
          review_status?: Database['public']['Enums']['report_review'];
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database['public']['Enums']['report_status'];
          user_id?: string | null;
          zone?: string | null;
        };
        Update: {
          address?: string | null;
          category?: Database['public']['Enums']['component_type'] | null;
          component_id?: string | null;
          created_at?: string;
          description?: string | null;
          geocoded_status?: string | null;
          id?: string;
          image?: string | null;
          lat?: number | null;
          long?: number | null;
          photo_check?: Database['public']['Enums']['photo_location_check'];
          photo_distance_m?: number | null;
          photo_lat?: number | null;
          photo_lon?: number | null;
          photo_taken_at?: string | null;
          priority?: Database['public']['Enums']['report_priority'];
          reporter_name?: string | null;
          resolved_at?: string | null;
          resolved_by_maintenance_id?: string | null;
          resolved_image?: string | null;
          review_note?: string | null;
          review_status?: Database['public']['Enums']['report_review'];
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database['public']['Enums']['report_status'];
          user_id?: string | null;
          zone?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'reports_component_id_fkey';
            columns: ['component_id'];
            isOneToOne: false;
            referencedRelation: 'component_locations';
            referencedColumns: ['name'];
          },
          {
            foreignKeyName: 'reports_component_id_fkey';
            columns: ['component_id'];
            isOneToOne: false;
            referencedRelation: 'components';
            referencedColumns: ['name'];
          },
          {
            foreignKeyName: 'reports_resolved_by_maintenance_id_fkey';
            columns: ['resolved_by_maintenance_id'];
            isOneToOne: false;
            referencedRelation: 'maintenance';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reports_reviewed_by_fkey';
            columns: ['reviewed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      simulation_runs: {
        Row: {
          created_at: string;
          error: string | null;
          finished_at: string | null;
          id: string;
          request: NonNullable<Json>;
          result: Json | null;
          started_at: string | null;
          status: Database['public']['Enums']['simulation_status'];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          error?: string | null;
          finished_at?: string | null;
          id: string;
          request?: NonNullable<Json>;
          result?: Json | null;
          started_at?: string | null;
          status?: Database['public']['Enums']['simulation_status'];
          user_id: string;
        };
        Update: {
          created_at?: string;
          error?: string | null;
          finished_at?: string | null;
          id?: string;
          request?: NonNullable<Json>;
          result?: Json | null;
          started_at?: string | null;
          status?: Database['public']['Enums']['simulation_status'];
          user_id?: string;
        };
        Relationships: [];
      };
      storm_drains: {
        Row: {
          clog_per: number | null;
          clogfac: number | null;
          clogtime: number | null;
          fplain_080: number | null;
          geom: unknown;
          gid: number;
          height: number | null;
          id: number | null;
          invelev: number | null;
          length: number | null;
          max_depth: number | null;
          name: string | null;
          namenum: number | null;
          weir_coeff: number | null;
          x: number | null;
          y: number | null;
        };
        Insert: {
          clog_per?: number | null;
          clogfac?: number | null;
          clogtime?: number | null;
          fplain_080?: number | null;
          geom?: unknown;
          gid?: number;
          height?: number | null;
          id?: number | null;
          invelev?: number | null;
          length?: number | null;
          max_depth?: number | null;
          name?: string | null;
          namenum?: number | null;
          weir_coeff?: number | null;
          x?: number | null;
          y?: number | null;
        };
        Update: {
          clog_per?: number | null;
          clogfac?: number | null;
          clogtime?: number | null;
          fplain_080?: number | null;
          geom?: unknown;
          gid?: number;
          height?: number | null;
          id?: number | null;
          invelev?: number | null;
          length?: number | null;
          max_depth?: number | null;
          name?: string | null;
          namenum?: number | null;
          weir_coeff?: number | null;
          x?: number | null;
          y?: number | null;
        };
        Relationships: [];
      };
    };
    Views: {
      component_locations: {
        Row: {
          lat: number | null;
          long: number | null;
          name: string | null;
          type: Database['public']['Enums']['component_type'] | null;
        };
        Insert: {
          lat?: never;
          long?: never;
          name?: string | null;
          type?: Database['public']['Enums']['component_type'] | null;
        };
        Update: {
          lat?: never;
          long?: never;
          name?: string | null;
          type?: Database['public']['Enums']['component_type'] | null;
        };
        Relationships: [];
      };
      latest_report_per_component: {
        Row: {
          address: string | null;
          category: Database['public']['Enums']['component_type'] | null;
          component_id: string | null;
          created_at: string | null;
          description: string | null;
          geocoded_status: string | null;
          id: string | null;
          image: string | null;
          lat: number | null;
          long: number | null;
          photo_check:
            | Database['public']['Enums']['photo_location_check']
            | null;
          photo_distance_m: number | null;
          photo_taken_at: string | null;
          priority: Database['public']['Enums']['report_priority'] | null;
          reporter_name: string | null;
          resolved_at: string | null;
          resolved_by_maintenance_id: string | null;
          resolved_image: string | null;
          review_note: string | null;
          review_status: Database['public']['Enums']['report_review'] | null;
          reviewed_at: string | null;
          status: Database['public']['Enums']['report_status'] | null;
          zone: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'reports_component_id_fkey';
            columns: ['component_id'];
            isOneToOne: false;
            referencedRelation: 'component_locations';
            referencedColumns: ['name'];
          },
          {
            foreignKeyName: 'reports_component_id_fkey';
            columns: ['component_id'];
            isOneToOne: false;
            referencedRelation: 'components';
            referencedColumns: ['name'];
          },
          {
            foreignKeyName: 'reports_resolved_by_maintenance_id_fkey';
            columns: ['resolved_by_maintenance_id'];
            isOneToOne: false;
            referencedRelation: 'maintenance';
            referencedColumns: ['id'];
          },
        ];
      };
      repair_time_by_component: {
        Row: {
          average_days: number | null;
          component_type: Database['public']['Enums']['component_type'] | null;
          resolved_count: number | null;
        };
        Relationships: [];
      };
      report_counts_by_category: {
        Row: {
          category: Database['public']['Enums']['component_type'] | null;
          report_count: number | null;
        };
        Relationships: [];
      };
      report_counts_by_component: {
        Row: {
          category: Database['public']['Enums']['component_type'] | null;
          component_id: string | null;
          report_count: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'reports_component_id_fkey';
            columns: ['component_id'];
            isOneToOne: false;
            referencedRelation: 'component_locations';
            referencedColumns: ['name'];
          },
          {
            foreignKeyName: 'reports_component_id_fkey';
            columns: ['component_id'];
            isOneToOne: false;
            referencedRelation: 'components';
            referencedColumns: ['name'];
          },
        ];
      };
      report_counts_by_zone: {
        Row: {
          report_count: number | null;
          zone: string | null;
        };
        Relationships: [];
      };
      report_repair_days: {
        Row: {
          category: Database['public']['Enums']['component_type'] | null;
          component_id: string | null;
          created_at: string | null;
          id: string | null;
          repair_days: number | null;
          resolved_at: string | null;
        };
        Insert: {
          category?: Database['public']['Enums']['component_type'] | null;
          component_id?: string | null;
          created_at?: string | null;
          id?: string | null;
          repair_days?: never;
          resolved_at?: string | null;
        };
        Update: {
          category?: Database['public']['Enums']['component_type'] | null;
          component_id?: string | null;
          created_at?: string | null;
          id?: string | null;
          repair_days?: never;
          resolved_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'reports_component_id_fkey';
            columns: ['component_id'];
            isOneToOne: false;
            referencedRelation: 'component_locations';
            referencedColumns: ['name'];
          },
          {
            foreignKeyName: 'reports_component_id_fkey';
            columns: ['component_id'];
            isOneToOne: false;
            referencedRelation: 'components';
            referencedColumns: ['name'];
          },
        ];
      };
      team_performance: {
        Row: {
          agency_name: string | null;
          median_days_to_resolve: number | null;
          outstanding_issues: number | null;
          resolved_issues: number | null;
          total_issues: number | null;
          verified_issues: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      consume_rate_limit: { Args: { p_bucket: string }; Returns: boolean };
      dashboard_overview: {
        Args: { p_month_start?: string };
        Returns: {
          average_repair_days: number;
          awaiting_verification: number;
          fixed_this_month: number;
          pending_issues: number;
          total_staff: number;
          verified_fixed_this_month: number;
        }[];
      };
      join_agency: {
        Args: { p_code: string };
        Returns: {
          contact_details: Json | null;
          created_at: string;
          id: string;
          name: string;
        };
        SetofOptions: {
          from: '*';
          to: 'agencies';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      leave_agency: { Args: Record<PropertyKey, never>; Returns: undefined };
      maintenance_history: {
        Args: { p_component_name: string };
        Returns: {
          agency_name: string;
          can_review: boolean;
          description: string;
          evidence_image: string;
          id: string;
          latest_dispute: string;
          my_verdict: Database['public']['Enums']['review_verdict'];
          performed_at: string;
          performed_by_name: string;
          status: Database['public']['Enums']['maintenance_status'];
          verification_status: Database['public']['Enums']['verification_status'];
        }[];
      };
      nearest_components: {
        Args: {
          p_lat: number;
          p_lon: number;
          p_max_results?: number;
          p_radius_m?: number;
          p_type: Database['public']['Enums']['component_type'];
        };
        Returns: {
          distance: number;
          lat: number;
          long: number;
          name: string;
        }[];
      };
      record_maintenance: {
        Args: {
          p_component_name: string;
          p_component_type: Database['public']['Enums']['component_type'];
          p_description?: string;
          p_evidence_image?: string;
          p_status: Database['public']['Enums']['maintenance_status'];
        };
        Returns: {
          agency_id: string;
          component_name: string;
          component_type: Database['public']['Enums']['component_type'];
          created_at: string;
          description: string | null;
          evidence_image: string | null;
          id: string;
          performed_at: string;
          performed_by: string | null;
          status: Database['public']['Enums']['maintenance_status'];
          verification_status: Database['public']['Enums']['verification_status'];
        };
        SetofOptions: {
          from: '*';
          to: 'maintenance';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      repair_trend: {
        Args: { p_days?: number };
        Returns: {
          average_days: number;
          day: string;
        }[];
      };
      respond_to_resolution: {
        Args: {
          p_note?: string;
          p_report_id: string;
          p_verdict: Database['public']['Enums']['review_verdict'];
        };
        Returns: {
          address: string | null;
          category: Database['public']['Enums']['component_type'] | null;
          component_id: string | null;
          created_at: string;
          description: string | null;
          geocoded_status: string | null;
          id: string;
          image: string | null;
          lat: number | null;
          long: number | null;
          photo_check: Database['public']['Enums']['photo_location_check'];
          photo_distance_m: number | null;
          photo_lat: number | null;
          photo_lon: number | null;
          photo_taken_at: string | null;
          priority: Database['public']['Enums']['report_priority'];
          reporter_name: string | null;
          resolved_at: string | null;
          resolved_by_maintenance_id: string | null;
          resolved_image: string | null;
          review_note: string | null;
          review_status: Database['public']['Enums']['report_review'];
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database['public']['Enums']['report_status'];
          user_id: string | null;
          zone: string | null;
        };
        SetofOptions: {
          from: '*';
          to: 'reports';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      review_maintenance: {
        Args: {
          p_evidence_image?: string;
          p_maintenance_id: string;
          p_note?: string;
          p_verdict: Database['public']['Enums']['review_verdict'];
        };
        Returns: {
          agency_id: string;
          component_name: string;
          component_type: Database['public']['Enums']['component_type'];
          created_at: string;
          description: string | null;
          evidence_image: string | null;
          id: string;
          performed_at: string;
          performed_by: string | null;
          status: Database['public']['Enums']['maintenance_status'];
          verification_status: Database['public']['Enums']['verification_status'];
        };
        SetofOptions: {
          from: '*';
          to: 'maintenance';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      review_report: {
        Args: {
          p_note?: string;
          p_priority?: Database['public']['Enums']['report_priority'];
          p_report_id: string;
          p_verdict: Database['public']['Enums']['report_review'];
        };
        Returns: {
          address: string | null;
          category: Database['public']['Enums']['component_type'] | null;
          component_id: string | null;
          created_at: string;
          description: string | null;
          geocoded_status: string | null;
          id: string;
          image: string | null;
          lat: number | null;
          long: number | null;
          photo_check: Database['public']['Enums']['photo_location_check'];
          photo_distance_m: number | null;
          photo_lat: number | null;
          photo_lon: number | null;
          photo_taken_at: string | null;
          priority: Database['public']['Enums']['report_priority'];
          reporter_name: string | null;
          resolved_at: string | null;
          resolved_by_maintenance_id: string | null;
          resolved_image: string | null;
          review_note: string | null;
          review_status: Database['public']['Enums']['report_review'];
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database['public']['Enums']['report_status'];
          user_id: string | null;
          zone: string | null;
        };
        SetofOptions: {
          from: '*';
          to: 'reports';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      rotate_agency_join_code: {
        Args: { p_agency_id: string };
        Returns: string;
      };
      set_member_agency: {
        Args: {
          p_agency_id: string;
          p_role: Database['public']['Enums']['user_role'];
          p_user_id: string;
        };
        Returns: {
          agency_id: string | null;
          avatar_url: string | null;
          created_at: string;
          full_name: string | null;
          id: string;
          role: Database['public']['Enums']['user_role'];
          show_name_on_reports: boolean;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'profiles';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      component_type: 'inlets' | 'outlets' | 'storm_drains' | 'man_pipes';
      maintenance_status: 'in-progress' | 'resolved';
      photo_location_check: 'match' | 'mismatch' | 'missing';
      report_priority: 'low' | 'medium' | 'high' | 'critical';
      report_review: 'unreviewed' | 'confirmed' | 'rejected';
      report_status: 'pending' | 'in-progress' | 'resolved';
      review_verdict: 'confirmed' | 'disputed';
      simulation_status: 'queued' | 'running' | 'succeeded' | 'failed';
      user_role: 'citizen' | 'staff' | 'admin';
      verification_status: 'unverified' | 'verified' | 'disputed';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      component_type: ['inlets', 'outlets', 'storm_drains', 'man_pipes'],
      maintenance_status: ['in-progress', 'resolved'],
      photo_location_check: ['match', 'mismatch', 'missing'],
      report_priority: ['low', 'medium', 'high', 'critical'],
      report_review: ['unreviewed', 'confirmed', 'rejected'],
      report_status: ['pending', 'in-progress', 'resolved'],
      review_verdict: ['confirmed', 'disputed'],
      simulation_status: ['queued', 'running', 'succeeded', 'failed'],
      user_role: ['citizen', 'staff', 'admin'],
      verification_status: ['unverified', 'verified', 'disputed'],
    },
  },
} as const;
