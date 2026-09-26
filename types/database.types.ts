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
      '100YR': {
        Row: {
          Cluster: number | null;
          Cluster_Score: number | null;
          'Hours Flooded': number | null;
          'Maximum Rate (CMS)': number | null;
          Node_ID: string;
          'Time of Max (hr:min)': number | null;
          Time_After_Raining_min: number | null;
          'Total Flood Volume (10^6 ltr)': number | null;
          Vulnerability_Category: string | null;
          Vulnerability_Rank: number | null;
          YR: string | null;
        };
        Insert: {
          Cluster?: number | null;
          Cluster_Score?: number | null;
          'Hours Flooded'?: number | null;
          'Maximum Rate (CMS)'?: number | null;
          Node_ID: string;
          'Time of Max (hr:min)'?: number | null;
          Time_After_Raining_min?: number | null;
          'Total Flood Volume (10^6 ltr)'?: number | null;
          Vulnerability_Category?: string | null;
          Vulnerability_Rank?: number | null;
          YR?: string | null;
        };
        Update: {
          Cluster?: number | null;
          Cluster_Score?: number | null;
          'Hours Flooded'?: number | null;
          'Maximum Rate (CMS)'?: number | null;
          Node_ID?: string;
          'Time of Max (hr:min)'?: number | null;
          Time_After_Raining_min?: number | null;
          'Total Flood Volume (10^6 ltr)'?: number | null;
          Vulnerability_Category?: string | null;
          Vulnerability_Rank?: number | null;
          YR?: string | null;
        };
        Relationships: [];
      };
      '10YR': {
        Row: {
          Cluster: number | null;
          Cluster_Score: number | null;
          'Hours Flooded': number | null;
          'Maximum Rate (CMS)': number | null;
          Node_ID: string;
          'Time of Max (hr:min)': number | null;
          Time_After_Raining_min: number | null;
          'Total Flood Volume (10^6 ltr)': number | null;
          Vulnerability_Category: string | null;
          Vulnerability_Rank: number | null;
          YR: string | null;
        };
        Insert: {
          Cluster?: number | null;
          Cluster_Score?: number | null;
          'Hours Flooded'?: number | null;
          'Maximum Rate (CMS)'?: number | null;
          Node_ID: string;
          'Time of Max (hr:min)'?: number | null;
          Time_After_Raining_min?: number | null;
          'Total Flood Volume (10^6 ltr)'?: number | null;
          Vulnerability_Category?: string | null;
          Vulnerability_Rank?: number | null;
          YR?: string | null;
        };
        Update: {
          Cluster?: number | null;
          Cluster_Score?: number | null;
          'Hours Flooded'?: number | null;
          'Maximum Rate (CMS)'?: number | null;
          Node_ID?: string;
          'Time of Max (hr:min)'?: number | null;
          Time_After_Raining_min?: number | null;
          'Total Flood Volume (10^6 ltr)'?: number | null;
          Vulnerability_Category?: string | null;
          Vulnerability_Rank?: number | null;
          YR?: string | null;
        };
        Relationships: [];
      };
      '15YR': {
        Row: {
          Cluster: number | null;
          Cluster_Score: number | null;
          'Hours Flooded': number | null;
          'Maximum Rate (CMS)': number | null;
          Node_ID: string;
          'Time of Max (hr:min)': number | null;
          Time_After_Raining_min: number | null;
          'Total Flood Volume (10^6 ltr)': number | null;
          Vulnerability_Category: string | null;
          Vulnerability_Rank: number | null;
          YR: string | null;
        };
        Insert: {
          Cluster?: number | null;
          Cluster_Score?: number | null;
          'Hours Flooded'?: number | null;
          'Maximum Rate (CMS)'?: number | null;
          Node_ID: string;
          'Time of Max (hr:min)'?: number | null;
          Time_After_Raining_min?: number | null;
          'Total Flood Volume (10^6 ltr)'?: number | null;
          Vulnerability_Category?: string | null;
          Vulnerability_Rank?: number | null;
          YR?: string | null;
        };
        Update: {
          Cluster?: number | null;
          Cluster_Score?: number | null;
          'Hours Flooded'?: number | null;
          'Maximum Rate (CMS)'?: number | null;
          Node_ID?: string;
          'Time of Max (hr:min)'?: number | null;
          Time_After_Raining_min?: number | null;
          'Total Flood Volume (10^6 ltr)'?: number | null;
          Vulnerability_Category?: string | null;
          Vulnerability_Rank?: number | null;
          YR?: string | null;
        };
        Relationships: [];
      };
      '20YR': {
        Row: {
          Cluster: number | null;
          Cluster_Score: number | null;
          'Hours Flooded': number | null;
          'Maximum Rate (CMS)': number | null;
          Node_ID: string;
          'Time of Max (hr:min)': number | null;
          Time_After_Raining_min: number | null;
          'Total Flood Volume (10^6 ltr)': number | null;
          Vulnerability_Category: string | null;
          Vulnerability_Rank: number | null;
          YR: string | null;
        };
        Insert: {
          Cluster?: number | null;
          Cluster_Score?: number | null;
          'Hours Flooded'?: number | null;
          'Maximum Rate (CMS)'?: number | null;
          Node_ID: string;
          'Time of Max (hr:min)'?: number | null;
          Time_After_Raining_min?: number | null;
          'Total Flood Volume (10^6 ltr)'?: number | null;
          Vulnerability_Category?: string | null;
          Vulnerability_Rank?: number | null;
          YR?: string | null;
        };
        Update: {
          Cluster?: number | null;
          Cluster_Score?: number | null;
          'Hours Flooded'?: number | null;
          'Maximum Rate (CMS)'?: number | null;
          Node_ID?: string;
          'Time of Max (hr:min)'?: number | null;
          Time_After_Raining_min?: number | null;
          'Total Flood Volume (10^6 ltr)'?: number | null;
          Vulnerability_Category?: string | null;
          Vulnerability_Rank?: number | null;
          YR?: string | null;
        };
        Relationships: [];
      };
      '25YR': {
        Row: {
          Cluster: number | null;
          Cluster_Score: number | null;
          'Hours Flooded': number | null;
          'Maximum Rate (CMS)': number | null;
          Node_ID: string;
          'Time of Max (hr:min)': number | null;
          Time_After_Raining_min: number | null;
          'Total Flood Volume (10^6 ltr)': number | null;
          Vulnerability_Category: string | null;
          Vulnerability_Rank: number | null;
          YR: string | null;
        };
        Insert: {
          Cluster?: number | null;
          Cluster_Score?: number | null;
          'Hours Flooded'?: number | null;
          'Maximum Rate (CMS)'?: number | null;
          Node_ID: string;
          'Time of Max (hr:min)'?: number | null;
          Time_After_Raining_min?: number | null;
          'Total Flood Volume (10^6 ltr)'?: number | null;
          Vulnerability_Category?: string | null;
          Vulnerability_Rank?: number | null;
          YR?: string | null;
        };
        Update: {
          Cluster?: number | null;
          Cluster_Score?: number | null;
          'Hours Flooded'?: number | null;
          'Maximum Rate (CMS)'?: number | null;
          Node_ID?: string;
          'Time of Max (hr:min)'?: number | null;
          Time_After_Raining_min?: number | null;
          'Total Flood Volume (10^6 ltr)'?: number | null;
          Vulnerability_Category?: string | null;
          Vulnerability_Rank?: number | null;
          YR?: string | null;
        };
        Relationships: [];
      };
      '2YR': {
        Row: {
          Cluster: number | null;
          Cluster_Score: number | null;
          'Hours Flooded': number | null;
          'Maximum Rate (CMS)': number | null;
          Node_ID: string | null;
          'Time of Max (hr:min)': number | null;
          Time_After_Raining_min: number | null;
          'Total Flood Volume (10^6 ltr)': number | null;
          Vulnerability_Category: string | null;
          Vulnerability_Rank: number | null;
          YR: string | null;
        };
        Insert: {
          Cluster?: number | null;
          Cluster_Score?: number | null;
          'Hours Flooded'?: number | null;
          'Maximum Rate (CMS)'?: number | null;
          Node_ID?: string | null;
          'Time of Max (hr:min)'?: number | null;
          Time_After_Raining_min?: number | null;
          'Total Flood Volume (10^6 ltr)'?: number | null;
          Vulnerability_Category?: string | null;
          Vulnerability_Rank?: number | null;
          YR?: string | null;
        };
        Update: {
          Cluster?: number | null;
          Cluster_Score?: number | null;
          'Hours Flooded'?: number | null;
          'Maximum Rate (CMS)'?: number | null;
          Node_ID?: string | null;
          'Time of Max (hr:min)'?: number | null;
          Time_After_Raining_min?: number | null;
          'Total Flood Volume (10^6 ltr)'?: number | null;
          Vulnerability_Category?: string | null;
          Vulnerability_Rank?: number | null;
          YR?: string | null;
        };
        Relationships: [];
      };
      '50YR': {
        Row: {
          Cluster: number | null;
          Cluster_Score: number | null;
          'Hours Flooded': number | null;
          'Maximum Rate (CMS)': number | null;
          Node_ID: string;
          'Time of Max (hr:min)': number | null;
          Time_After_Raining_min: number | null;
          'Total Flood Volume (10^6 ltr)': number | null;
          Vulnerability_Category: string | null;
          Vulnerability_Rank: number | null;
          YR: string | null;
        };
        Insert: {
          Cluster?: number | null;
          Cluster_Score?: number | null;
          'Hours Flooded'?: number | null;
          'Maximum Rate (CMS)'?: number | null;
          Node_ID: string;
          'Time of Max (hr:min)'?: number | null;
          Time_After_Raining_min?: number | null;
          'Total Flood Volume (10^6 ltr)'?: number | null;
          Vulnerability_Category?: string | null;
          Vulnerability_Rank?: number | null;
          YR?: string | null;
        };
        Update: {
          Cluster?: number | null;
          Cluster_Score?: number | null;
          'Hours Flooded'?: number | null;
          'Maximum Rate (CMS)'?: number | null;
          Node_ID?: string;
          'Time of Max (hr:min)'?: number | null;
          Time_After_Raining_min?: number | null;
          'Total Flood Volume (10^6 ltr)'?: number | null;
          Vulnerability_Category?: string | null;
          Vulnerability_Rank?: number | null;
          YR?: string | null;
        };
        Relationships: [];
      };
      '5YR': {
        Row: {
          Cluster: number | null;
          Cluster_Score: number | null;
          'Hours Flooded': number | null;
          'Maximum Rate (CMS)': number | null;
          Node_ID: string;
          'Time of Max (hr:min)': number | null;
          Time_After_Raining_min: number | null;
          'Total Flood Volume (10^6 ltr)': number | null;
          Vulnerability_Category: string | null;
          Vulnerability_Rank: number | null;
          YR: string | null;
        };
        Insert: {
          Cluster?: number | null;
          Cluster_Score?: number | null;
          'Hours Flooded'?: number | null;
          'Maximum Rate (CMS)'?: number | null;
          Node_ID: string;
          'Time of Max (hr:min)'?: number | null;
          Time_After_Raining_min?: number | null;
          'Total Flood Volume (10^6 ltr)'?: number | null;
          Vulnerability_Category?: string | null;
          Vulnerability_Rank?: number | null;
          YR?: string | null;
        };
        Update: {
          Cluster?: number | null;
          Cluster_Score?: number | null;
          'Hours Flooded'?: number | null;
          'Maximum Rate (CMS)'?: number | null;
          Node_ID?: string;
          'Time of Max (hr:min)'?: number | null;
          Time_After_Raining_min?: number | null;
          'Total Flood Volume (10^6 ltr)'?: number | null;
          Vulnerability_Category?: string | null;
          Vulnerability_Rank?: number | null;
          YR?: string | null;
        };
        Relationships: [];
      };
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
      inlets_maintenance: {
        Row: {
          addressed_report_id: string | null;
          agency_id: string;
          created_at: string;
          description: string | null;
          evidence_image: string | null;
          id: string;
          in_name: string;
          last_cleaned_at: string;
          represented_by: string;
          status: string | null;
        };
        Insert: {
          addressed_report_id?: string | null;
          agency_id: string;
          created_at?: string;
          description?: string | null;
          evidence_image?: string | null;
          id?: string;
          in_name: string;
          last_cleaned_at?: string;
          represented_by: string;
          status?: string | null;
        };
        Update: {
          addressed_report_id?: string | null;
          agency_id?: string;
          created_at?: string;
          description?: string | null;
          evidence_image?: string | null;
          id?: string;
          in_name?: string;
          last_cleaned_at?: string;
          represented_by?: string;
          status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'inlets_maintenance_addressed_report_id_fkey';
            columns: ['addressed_report_id'];
            isOneToOne: false;
            referencedRelation: 'reports';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'inlets_maintenance_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'inlets_maintenance_represented_by_fkey';
            columns: ['represented_by'];
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
      man_pipes_maintenance: {
        Row: {
          addressed_report_id: string | null;
          agency_id: string;
          created_at: string;
          description: string | null;
          evidence_image: string | null;
          id: string;
          last_cleaned_at: string;
          name: string;
          represented_by: string;
          status: string | null;
        };
        Insert: {
          addressed_report_id?: string | null;
          agency_id: string;
          created_at?: string;
          description?: string | null;
          evidence_image?: string | null;
          id?: string;
          last_cleaned_at?: string;
          name: string;
          represented_by: string;
          status?: string | null;
        };
        Update: {
          addressed_report_id?: string | null;
          agency_id?: string;
          created_at?: string;
          description?: string | null;
          evidence_image?: string | null;
          id?: string;
          last_cleaned_at?: string;
          name?: string;
          represented_by?: string;
          status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'man_pipes_maintenance_addressed_report_id_fkey';
            columns: ['addressed_report_id'];
            isOneToOne: false;
            referencedRelation: 'reports';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'man_pipes_maintenance_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'man_pipes_maintenance_represented_by_fkey';
            columns: ['represented_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
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
      outlets_maintenance: {
        Row: {
          addressed_report_id: string | null;
          agency_id: string;
          created_at: string;
          description: string | null;
          evidence_image: string | null;
          id: string;
          last_cleaned_at: string;
          out_name: string;
          represented_by: string;
          status: string | null;
        };
        Insert: {
          addressed_report_id?: string | null;
          agency_id: string;
          created_at?: string;
          description?: string | null;
          evidence_image?: string | null;
          id?: string;
          last_cleaned_at?: string;
          out_name: string;
          represented_by: string;
          status?: string | null;
        };
        Update: {
          addressed_report_id?: string | null;
          agency_id?: string;
          created_at?: string;
          description?: string | null;
          evidence_image?: string | null;
          id?: string;
          last_cleaned_at?: string;
          out_name?: string;
          represented_by?: string;
          status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'outlets_maintenance_addressed_report_id_fkey';
            columns: ['addressed_report_id'];
            isOneToOne: false;
            referencedRelation: 'reports';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'outlets_maintenance_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'outlets_maintenance_represented_by_fkey';
            columns: ['represented_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
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
          category: string | null;
          component_id: string | null;
          created_at: string;
          description: string | null;
          geocoded_status: string | null;
          id: string;
          image: string | null;
          lat: number | null;
          long: number | null;
          priority: string | null;
          reporter_name: string | null;
          resolved_by_maintenance_id: string | null;
          resolved_by_maintenance_type: string | null;
          resolved_image: string | null;
          status: string;
          user_id: string | null;
          zone: string | null;
        };
        Insert: {
          address?: string | null;
          category?: string | null;
          component_id?: string | null;
          created_at?: string;
          description?: string | null;
          geocoded_status?: string | null;
          id?: string;
          image?: string | null;
          lat?: number | null;
          long?: number | null;
          priority?: string | null;
          reporter_name?: string | null;
          resolved_by_maintenance_id?: string | null;
          resolved_by_maintenance_type?: string | null;
          resolved_image?: string | null;
          status: string;
          user_id?: string | null;
          zone?: string | null;
        };
        Update: {
          address?: string | null;
          category?: string | null;
          component_id?: string | null;
          created_at?: string;
          description?: string | null;
          geocoded_status?: string | null;
          id?: string;
          image?: string | null;
          lat?: number | null;
          long?: number | null;
          priority?: string | null;
          reporter_name?: string | null;
          resolved_by_maintenance_id?: string | null;
          resolved_by_maintenance_type?: string | null;
          resolved_image?: string | null;
          status?: string;
          user_id?: string | null;
          zone?: string | null;
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
      storm_drains_maintenance: {
        Row: {
          addressed_report_id: string | null;
          agency_id: string;
          created_at: string;
          description: string | null;
          evidence_image: string | null;
          id: string;
          in_name: string;
          last_cleaned_at: string;
          represented_by: string;
          status: string | null;
        };
        Insert: {
          addressed_report_id?: string | null;
          agency_id: string;
          created_at?: string;
          description?: string | null;
          evidence_image?: string | null;
          id?: string;
          in_name: string;
          last_cleaned_at?: string;
          represented_by: string;
          status?: string | null;
        };
        Update: {
          addressed_report_id?: string | null;
          agency_id?: string;
          created_at?: string;
          description?: string | null;
          evidence_image?: string | null;
          id?: string;
          in_name?: string;
          last_cleaned_at?: string;
          represented_by?: string;
          status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'storm_drains_maintenance_addressed_report_id_fkey';
            columns: ['addressed_report_id'];
            isOneToOne: false;
            referencedRelation: 'reports';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'storm_drains_maintenance_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'storm_drains_maintenance_represented_by_fkey';
            columns: ['represented_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      extract_barangay_from_coordinates: {
        Args: { latitude: number; longitude: number };
        Returns: string;
      };
      get_closest_inlet: {
        Args: { input_lat: number; input_lon: number };
        Returns: {
          distance: number;
          lat: number;
          long: number;
          name: string;
        }[];
      };
      get_closest_man_pipe: {
        Args: { input_lat: number; input_lon: number };
        Returns: {
          distance: number;
          lat: number;
          long: number;
          name: string;
        }[];
      };
      get_closest_outlet: {
        Args: { input_lat: number; input_lon: number };
        Returns: {
          distance: number;
          lat: number;
          long: number;
          name: string;
        }[];
      };
      get_closest_storm_drain: {
        Args: { input_lat: number; input_lon: number };
        Returns: {
          distance: number;
          lat: number;
          long: number;
          name: string;
        }[];
      };
      get_component_by_category: {
        Args: { category_name: string };
        Returns: {
          lat: number;
          long: number;
          name: string;
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
      asset_point_type: 'inlet' | 'outlet' | 'stormdrain';
      drainage_status:
        | 'Clean'
        | 'Needs_Cleaning'
        | 'Clogged'
        | 'Damaged'
        | 'Overflowing';
      maintenance_type: 'Cleaning' | 'Repair' | 'Inspection' | 'Unclogging';
      report_status:
        | 'pending'
        | 'received'
        | 'action_taken'
        | 'resolved'
        | 'rejected';
      user_role: 'citizen' | 'staff' | 'admin';
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
      asset_point_type: ['inlet', 'outlet', 'stormdrain'],
      drainage_status: [
        'Clean',
        'Needs_Cleaning',
        'Clogged',
        'Damaged',
        'Overflowing',
      ],
      maintenance_type: ['Cleaning', 'Repair', 'Inspection', 'Unclogging'],
      report_status: [
        'pending',
        'received',
        'action_taken',
        'resolved',
        'rejected',
      ],
      user_role: ['citizen', 'staff', 'admin'],
    },
  },
} as const;

// ---- App helpers (not generated; re-add after regenerating) ----

/** Names of the four per-component-type maintenance tables. */
export type MaintenanceTableName =
  | 'inlets_maintenance'
  | 'outlets_maintenance'
  | 'storm_drains_maintenance'
  | 'man_pipes_maintenance';
