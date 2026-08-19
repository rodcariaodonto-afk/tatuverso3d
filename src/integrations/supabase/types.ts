export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          city: string
          complement: string | null
          country: string | null
          created_at: string
          id: string
          is_default: boolean | null
          label: string | null
          neighborhood: string | null
          number: string | null
          phone: string | null
          postal_code: string
          recipient: string
          state: string
          street: string
          updated_at: string
          user_id: string
        }
        Insert: {
          city: string
          complement?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          label?: string | null
          neighborhood?: string | null
          number?: string | null
          phone?: string | null
          postal_code: string
          recipient: string
          state: string
          street: string
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string
          complement?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          label?: string | null
          neighborhood?: string | null
          number?: string | null
          phone?: string | null
          postal_code?: string
          recipient?: string
          state?: string
          street?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
        }
        Relationships: []
      }
      b2b_leads: {
        Row: {
          assigned_admin_id: string | null
          company_name: string
          contact_name: string
          created_at: string
          desired_deadline: string | null
          email: string
          estimated_quantity: string | null
          has_brand: boolean | null
          id: string
          internal_notes: string | null
          logo_url: string | null
          notes: string | null
          packaging_preference: string | null
          phone: string | null
          purpose: string | null
          source: string | null
          status: Database["public"]["Enums"]["b2b_lead_status"]
          updated_at: string
        }
        Insert: {
          assigned_admin_id?: string | null
          company_name: string
          contact_name: string
          created_at?: string
          desired_deadline?: string | null
          email: string
          estimated_quantity?: string | null
          has_brand?: boolean | null
          id?: string
          internal_notes?: string | null
          logo_url?: string | null
          notes?: string | null
          packaging_preference?: string | null
          phone?: string | null
          purpose?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["b2b_lead_status"]
          updated_at?: string
        }
        Update: {
          assigned_admin_id?: string | null
          company_name?: string
          contact_name?: string
          created_at?: string
          desired_deadline?: string | null
          email?: string
          estimated_quantity?: string | null
          has_brand?: boolean | null
          id?: string
          internal_notes?: string | null
          logo_url?: string | null
          notes?: string | null
          packaging_preference?: string | null
          phone?: string | null
          purpose?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["b2b_lead_status"]
          updated_at?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string
          cta_label: string | null
          cta_url: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          placement: string | null
          sort_order: number | null
          starts_at: string | null
          subtitle: string | null
          title: string
        }
        Insert: {
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          placement?: string | null
          sort_order?: number | null
          starts_at?: string | null
          subtitle?: string | null
          title: string
        }
        Update: {
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          placement?: string | null
          sort_order?: number | null
          starts_at?: string | null
          subtitle?: string | null
          title?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_name: string | null
          body: string | null
          category: string | null
          cover_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          published_at: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_name?: string | null
          body?: string | null
          category?: string | null
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_name?: string | null
          body?: string | null
          category?: string | null
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          cart_id: string
          created_at: string
          grind_option: Database["public"]["Enums"]["grind_option"] | null
          id: string
          product_id: string
          quantity: number
          variant_id: string | null
        }
        Insert: {
          cart_id: string
          created_at?: string
          grind_option?: Database["public"]["Enums"]["grind_option"] | null
          id?: string
          product_id: string
          quantity?: number
          variant_id?: string | null
        }
        Update: {
          cart_id?: string
          created_at?: string
          grind_option?: Database["public"]["Enums"]["grind_option"] | null
          id?: string
          product_id?: string
          quantity?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          created_at: string
          id: string
          session_token: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          session_token?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          session_token?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          name: string
          parent_id: string | null
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      corporate_quote_requests: {
        Row: {
          amount: number
          created_at: string
          id: string
          lead_id: string | null
          notes: string | null
          project_id: string | null
          status: Database["public"]["Enums"]["corporate_quote_status"]
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          lead_id?: string | null
          notes?: string | null
          project_id?: string | null
          status?: Database["public"]["Enums"]["corporate_quote_status"]
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          lead_id?: string | null
          notes?: string | null
          project_id?: string | null
          status?: Database["public"]["Enums"]["corporate_quote_status"]
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "corporate_quote_requests_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "b2b_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corporate_quote_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "private_label_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          min_order_total: number | null
          starts_at: string | null
          used_count: number | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_total?: number | null
          starts_at?: string | null
          used_count?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_total?: number | null
          starts_at?: string | null
          used_count?: number | null
        }
        Relationships: []
      }
      farms: {
        Row: {
          altitude_meters: number | null
          country: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          producer_id: string
          region: string | null
          updated_at: string
        }
        Insert: {
          altitude_meters?: number | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          producer_id: string
          region?: string | null
          updated_at?: string
        }
        Update: {
          altitude_meters?: number | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          producer_id?: string
          region?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "farms_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "producers"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          movement_type: string
          notes: string | null
          order_id: string | null
          previous_quantity: number | null
          product_id: string | null
          quantity: number
          reason: string | null
          reference_id: string | null
          reference_type: string | null
          resulting_quantity: number | null
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type: string
          notes?: string | null
          order_id?: string | null
          previous_quantity?: number | null
          product_id?: string | null
          quantity: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          resulting_quantity?: number | null
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type?: string
          notes?: string | null
          order_id?: string | null
          previous_quantity?: number | null
          product_id?: string | null
          quantity?: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          resulting_quantity?: number | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          customization_data: Json
          grind_option: Database["public"]["Enums"]["grind_option"] | null
          id: string
          item_status: Database["public"]["Enums"]["order_status"] | null
          order_id: string
          producer_id: string | null
          product_id: string
          product_name: string
          production_notes: string | null
          production_status: string
          quantity: number
          sku_snapshot: string | null
          total_price: number
          unit_price: number
          variant_id: string | null
          variant_name_snapshot: string | null
        }
        Insert: {
          created_at?: string
          customization_data?: Json
          grind_option?: Database["public"]["Enums"]["grind_option"] | null
          id?: string
          item_status?: Database["public"]["Enums"]["order_status"] | null
          order_id: string
          producer_id?: string | null
          product_id: string
          product_name: string
          production_notes?: string | null
          production_status?: string
          quantity: number
          sku_snapshot?: string | null
          total_price: number
          unit_price: number
          variant_id?: string | null
          variant_name_snapshot?: string | null
        }
        Update: {
          created_at?: string
          customization_data?: Json
          grind_option?: Database["public"]["Enums"]["grind_option"] | null
          id?: string
          item_status?: Database["public"]["Enums"]["order_status"] | null
          order_id?: string
          producer_id?: string | null
          product_id?: string
          product_name?: string
          production_notes?: string | null
          production_status?: string
          quantity?: number
          sku_snapshot?: string | null
          total_price?: number
          unit_price?: number
          variant_id?: string | null
          variant_name_snapshot?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "producers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["order_status"] | null
          id: string
          notes: string | null
          order_id: string
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          notes?: string | null
          order_id: string
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          notes?: string | null
          order_id?: string
          to_status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          coupon_id: string | null
          created_at: string
          customer_id: string
          discount_total: number
          id: string
          notes: string | null
          payment_provider: string | null
          payment_reference: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          production_days: number
          shipping_address: Json | null
          shipping_quote_id: string | null
          shipping_snapshot: Json | null
          shipping_total: number
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          coupon_id?: string | null
          created_at?: string
          customer_id: string
          discount_total?: number
          id?: string
          notes?: string | null
          payment_provider?: string | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          production_days?: number
          shipping_address?: Json | null
          shipping_quote_id?: string | null
          shipping_snapshot?: Json | null
          shipping_total?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          coupon_id?: string | null
          created_at?: string
          customer_id?: string
          discount_total?: number
          id?: string
          notes?: string | null
          payment_provider?: string | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          production_days?: number
          shipping_address?: Json | null
          shipping_quote_id?: string | null
          shipping_snapshot?: Json | null
          shipping_total?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shipping_quote_id_fkey"
            columns: ["shipping_quote_id"]
            isOneToOne: false
            referencedRelation: "shipping_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      packaging_options: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          min_quantity: number | null
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          min_quantity?: number | null
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          min_quantity?: number | null
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string | null
          order_id: string
          provider: string
          provider_payment_id: string | null
          raw_payload: Json | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method?: string | null
          order_id: string
          provider: string
          provider_payment_id?: string | null
          raw_payload?: Json | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string | null
          order_id?: string
          provider?: string
          provider_payment_id?: string | null
          raw_payload?: Json | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json | null
        }
        Relationships: []
      }
      private_label_projects: {
        Row: {
          created_at: string
          estimated_value: number | null
          id: string
          internal_notes: string | null
          lead_id: string | null
          packaging_option_id: string | null
          project_name: string
          quantity: number | null
          status: Database["public"]["Enums"]["private_label_project_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          estimated_value?: number | null
          id?: string
          internal_notes?: string | null
          lead_id?: string | null
          packaging_option_id?: string | null
          project_name: string
          quantity?: number | null
          status?: Database["public"]["Enums"]["private_label_project_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          estimated_value?: number | null
          id?: string
          internal_notes?: string | null
          lead_id?: string | null
          packaging_option_id?: string | null
          project_name?: string
          quantity?: number | null
          status?: Database["public"]["Enums"]["private_label_project_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_label_projects_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "b2b_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_label_projects_packaging_option_id_fkey"
            columns: ["packaging_option_id"]
            isOneToOne: false
            referencedRelation: "packaging_options"
            referencedColumns: ["id"]
          },
        ]
      }
      producer_applications: {
        Row: {
          admin_notes: string | null
          applicant_user_id: string | null
          brand_name: string
          city: string | null
          country: string | null
          created_at: string
          email: string
          id: string
          links: Json | null
          message: string | null
          monthly_volume_kg: number | null
          operation_type: string | null
          phone: string
          responsible_name: string
          reviewed_at: string | null
          reviewed_by: string | null
          state: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          applicant_user_id?: string | null
          brand_name: string
          city?: string | null
          country?: string | null
          created_at?: string
          email: string
          id?: string
          links?: Json | null
          message?: string | null
          monthly_volume_kg?: number | null
          operation_type?: string | null
          phone: string
          responsible_name: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          applicant_user_id?: string | null
          brand_name?: string
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string
          id?: string
          links?: Json | null
          message?: string | null
          monthly_volume_kg?: number | null
          operation_type?: string | null
          phone?: string
          responsible_name?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      producer_plans: {
        Row: {
          commission_rate: number
          created_at: string
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          max_products: number | null
          monthly_price: number
          name: string
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          commission_rate?: number
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          max_products?: number | null
          monthly_price?: number
          name: string
          slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          commission_rate?: number
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          max_products?: number | null
          monthly_price?: number
          name?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      producers: {
        Row: {
          certifications: string[] | null
          city: string | null
          commission_rate: number | null
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          document: string | null
          id: string
          joined_at: string | null
          logo_url: string | null
          name: string
          owner_user_id: string | null
          plan_id: string | null
          region: string | null
          slug: string
          social_links: Json | null
          state: string | null
          status: Database["public"]["Enums"]["producer_status"]
          story: string | null
          updated_at: string
        }
        Insert: {
          certifications?: string[] | null
          city?: string | null
          commission_rate?: number | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          document?: string | null
          id?: string
          joined_at?: string | null
          logo_url?: string | null
          name: string
          owner_user_id?: string | null
          plan_id?: string | null
          region?: string | null
          slug: string
          social_links?: Json | null
          state?: string | null
          status?: Database["public"]["Enums"]["producer_status"]
          story?: string | null
          updated_at?: string
        }
        Update: {
          certifications?: string[] | null
          city?: string | null
          commission_rate?: number | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          document?: string | null
          id?: string
          joined_at?: string | null
          logo_url?: string | null
          name?: string
          owner_user_id?: string | null
          plan_id?: string | null
          region?: string | null
          slug?: string
          social_links?: Json | null
          state?: string | null
          status?: Database["public"]["Enums"]["producer_status"]
          story?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "producers_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "producer_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          category_id: string
          product_id: string
        }
        Insert: {
          category_id: string
          product_id: string
        }
        Update: {
          category_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_customization_fields: {
        Row: {
          created_at: string
          field_type: Database["public"]["Enums"]["customization_field_type"]
          help_text: string | null
          id: string
          is_active: boolean
          is_required: boolean
          label: string
          max_length: number | null
          min_length: number | null
          options: Json
          placeholder: string | null
          price_adjustment: number
          product_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          field_type?: Database["public"]["Enums"]["customization_field_type"]
          help_text?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          label: string
          max_length?: number | null
          min_length?: number | null
          options?: Json
          placeholder?: string | null
          price_adjustment?: number
          product_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          field_type?: Database["public"]["Enums"]["customization_field_type"]
          help_text?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          label?: string
          max_length?: number | null
          min_length?: number | null
          options?: Json
          placeholder?: string | null
          price_adjustment?: number
          product_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_customization_fields_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt: string | null
          created_at: string
          id: string
          product_id: string
          sort_order: number | null
          url: string
          variant_id: string | null
        }
        Insert: {
          alt?: string | null
          created_at?: string
          id?: string
          product_id: string
          sort_order?: number | null
          url: string
          variant_id?: string | null
        }
        Update: {
          alt?: string | null
          created_at?: string
          id?: string
          product_id?: string
          sort_order?: number | null
          url?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_option_values: {
        Row: {
          color_hex: string | null
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          label: string
          option_id: string
          price_adjustment: number
          sort_order: number
          value: string
        }
        Insert: {
          color_hex?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          label: string
          option_id: string
          price_adjustment?: number
          sort_order?: number
          value: string
        }
        Update: {
          color_hex?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          label?: string
          option_id?: string
          price_adjustment?: number
          sort_order?: number
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_option_values_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "product_options"
            referencedColumns: ["id"]
          },
        ]
      }
      product_options: {
        Row: {
          created_at: string
          id: string
          is_required: boolean
          name: string
          option_type: Database["public"]["Enums"]["product_option_type"]
          product_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean
          name: string
          option_type?: Database["public"]["Enums"]["product_option_type"]
          product_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean
          name?: string
          option_type?: Database["public"]["Enums"]["product_option_type"]
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_options_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sensory_notes: {
        Row: {
          product_id: string
          sensory_note_id: string
        }
        Insert: {
          product_id: string
          sensory_note_id: string
        }
        Update: {
          product_id?: string
          sensory_note_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_sensory_notes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_sensory_notes_sensory_note_id_fkey"
            columns: ["sensory_note_id"]
            isOneToOne: false
            referencedRelation: "sensory_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          barcode: string | null
          compare_at_price: number | null
          cost_price: number | null
          created_at: string
          dimensions_text: string | null
          free_shipping: boolean
          grind_option: Database["public"]["Enums"]["grind_option"] | null
          id: string
          image_url: string | null
          is_active: boolean
          is_default: boolean | null
          low_stock_threshold: number
          name: string | null
          price: number
          product_id: string
          requires_separate_package: boolean
          reserved_quantity: number
          shipping_additional_days: number
          shipping_height_cm: number | null
          shipping_length_cm: number | null
          shipping_weight_grams: number | null
          shipping_width_cm: number | null
          sku: string | null
          sort_order: number
          stock_quantity: number
          updated_at: string
          weight_grams: number | null
        }
        Insert: {
          barcode?: string | null
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string
          dimensions_text?: string | null
          free_shipping?: boolean
          grind_option?: Database["public"]["Enums"]["grind_option"] | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_default?: boolean | null
          low_stock_threshold?: number
          name?: string | null
          price: number
          product_id: string
          requires_separate_package?: boolean
          reserved_quantity?: number
          shipping_additional_days?: number
          shipping_height_cm?: number | null
          shipping_length_cm?: number | null
          shipping_weight_grams?: number | null
          shipping_width_cm?: number | null
          sku?: string | null
          sort_order?: number
          stock_quantity?: number
          updated_at?: string
          weight_grams?: number | null
        }
        Update: {
          barcode?: string | null
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string
          dimensions_text?: string | null
          free_shipping?: boolean
          grind_option?: Database["public"]["Enums"]["grind_option"] | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_default?: boolean | null
          low_stock_threshold?: number
          name?: string | null
          price?: number
          product_id?: string
          requires_separate_package?: boolean
          reserved_quantity?: number
          shipping_additional_days?: number
          shipping_height_cm?: number | null
          shipping_length_cm?: number | null
          shipping_weight_grams?: number | null
          shipping_width_cm?: number | null
          sku?: string | null
          sort_order?: number
          stock_quantity?: number
          updated_at?: string
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          acidity: number | null
          age_recommendation: string | null
          allow_backorder: boolean
          altitude_meters: number | null
          badges: string[] | null
          body: number | null
          care_instructions: string | null
          color_notes: string | null
          compare_at_price: number | null
          cover_url: string | null
          created_at: string
          description: string | null
          dimensions_text: string | null
          farm_id: string | null
          free_shipping: boolean
          grind_options: Database["public"]["Enums"]["grind_option"][] | null
          id: string
          included_items: string | null
          intensity: number | null
          is_featured: boolean | null
          is_personalizable: boolean
          is_sensory: boolean
          is_subscription_available: boolean | null
          low_stock_threshold: number
          made_to_order: boolean
          material_description: string | null
          name: string
          origin_country: string | null
          origin_region: string | null
          price: number
          process: string | null
          producer_id: string | null
          product_type: Database["public"]["Enums"]["product_type_3d"]
          production_time_days: number | null
          published_at: string | null
          recommended_brew: Database["public"]["Enums"]["brew_method"][] | null
          requires_separate_package: boolean
          roast_date: string | null
          roast_level: Database["public"]["Enums"]["roast_level"] | null
          safety_notes: string | null
          score: number | null
          seo_description: string | null
          seo_title: string | null
          shipping_additional_days: number
          shipping_height_cm: number | null
          shipping_length_cm: number | null
          shipping_weight_grams: number | null
          shipping_width_cm: number | null
          short_description: string | null
          sku: string | null
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["product_status"]
          stock_quantity: number
          sweetness: number | null
          tasting_notes_text: string | null
          track_inventory: boolean
          updated_at: string
          variety: string | null
          weight_grams: number | null
        }
        Insert: {
          acidity?: number | null
          age_recommendation?: string | null
          allow_backorder?: boolean
          altitude_meters?: number | null
          badges?: string[] | null
          body?: number | null
          care_instructions?: string | null
          color_notes?: string | null
          compare_at_price?: number | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          dimensions_text?: string | null
          farm_id?: string | null
          free_shipping?: boolean
          grind_options?: Database["public"]["Enums"]["grind_option"][] | null
          id?: string
          included_items?: string | null
          intensity?: number | null
          is_featured?: boolean | null
          is_personalizable?: boolean
          is_sensory?: boolean
          is_subscription_available?: boolean | null
          low_stock_threshold?: number
          made_to_order?: boolean
          material_description?: string | null
          name: string
          origin_country?: string | null
          origin_region?: string | null
          price: number
          process?: string | null
          producer_id?: string | null
          product_type?: Database["public"]["Enums"]["product_type_3d"]
          production_time_days?: number | null
          published_at?: string | null
          recommended_brew?: Database["public"]["Enums"]["brew_method"][] | null
          requires_separate_package?: boolean
          roast_date?: string | null
          roast_level?: Database["public"]["Enums"]["roast_level"] | null
          safety_notes?: string | null
          score?: number | null
          seo_description?: string | null
          seo_title?: string | null
          shipping_additional_days?: number
          shipping_height_cm?: number | null
          shipping_length_cm?: number | null
          shipping_weight_grams?: number | null
          shipping_width_cm?: number | null
          short_description?: string | null
          sku?: string | null
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["product_status"]
          stock_quantity?: number
          sweetness?: number | null
          tasting_notes_text?: string | null
          track_inventory?: boolean
          updated_at?: string
          variety?: string | null
          weight_grams?: number | null
        }
        Update: {
          acidity?: number | null
          age_recommendation?: string | null
          allow_backorder?: boolean
          altitude_meters?: number | null
          badges?: string[] | null
          body?: number | null
          care_instructions?: string | null
          color_notes?: string | null
          compare_at_price?: number | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          dimensions_text?: string | null
          farm_id?: string | null
          free_shipping?: boolean
          grind_options?: Database["public"]["Enums"]["grind_option"][] | null
          id?: string
          included_items?: string | null
          intensity?: number | null
          is_featured?: boolean | null
          is_personalizable?: boolean
          is_sensory?: boolean
          is_subscription_available?: boolean | null
          low_stock_threshold?: number
          made_to_order?: boolean
          material_description?: string | null
          name?: string
          origin_country?: string | null
          origin_region?: string | null
          price?: number
          process?: string | null
          producer_id?: string | null
          product_type?: Database["public"]["Enums"]["product_type_3d"]
          production_time_days?: number | null
          published_at?: string | null
          recommended_brew?: Database["public"]["Enums"]["brew_method"][] | null
          requires_separate_package?: boolean
          roast_date?: string | null
          roast_level?: Database["public"]["Enums"]["roast_level"] | null
          safety_notes?: string | null
          score?: number | null
          seo_description?: string | null
          seo_title?: string | null
          shipping_additional_days?: number
          shipping_height_cm?: number | null
          shipping_length_cm?: number | null
          shipping_weight_grams?: number | null
          shipping_width_cm?: number | null
          short_description?: string | null
          sku?: string | null
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["product_status"]
          stock_quantity?: number
          sweetness?: number | null
          tasting_notes_text?: string | null
          track_inventory?: boolean
          updated_at?: string
          variety?: string | null
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "producers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          document: string | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          preferences: Json | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          preferences?: Json | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          preferences?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      project_files: {
        Row: {
          created_at: string
          file_name: string | null
          file_type: string | null
          file_url: string
          id: string
          lead_id: string | null
          project_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url: string
          id?: string
          lead_id?: string | null
          project_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string
          id?: string
          lead_id?: string | null
          project_id?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_files_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "b2b_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "private_label_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_responses: {
        Row: {
          answers: Json
          created_at: string
          id: string
          recommended_product_ids: string[] | null
          user_id: string | null
        }
        Insert: {
          answers: Json
          created_at?: string
          id?: string
          recommended_product_ids?: string[] | null
          user_id?: string | null
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          recommended_product_ids?: string[] | null
          user_id?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          body: string | null
          created_at: string
          customer_id: string
          id: string
          is_approved: boolean | null
          product_id: string
          rating: number
          title: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          customer_id: string
          id?: string
          is_approved?: boolean | null
          product_id: string
          rating: number
          title?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          is_approved?: boolean | null
          product_id?: string
          rating?: number
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      sensory_notes: {
        Row: {
          created_at: string
          family: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          family?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          family?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      shipments: {
        Row: {
          carrier: string | null
          created_at: string
          delivered_at: string | null
          estimated_delivery_at: string | null
          id: string
          order_id: string
          service: string | null
          shipped_at: string | null
          status: string | null
          tracking_code: string | null
          tracking_url: string | null
          updated_at: string
        }
        Insert: {
          carrier?: string | null
          created_at?: string
          delivered_at?: string | null
          estimated_delivery_at?: string | null
          id?: string
          order_id: string
          service?: string | null
          shipped_at?: string | null
          status?: string | null
          tracking_code?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Update: {
          carrier?: string | null
          created_at?: string
          delivered_at?: string | null
          estimated_delivery_at?: string | null
          id?: string
          order_id?: string
          service?: string | null
          shipped_at?: string | null
          status?: string | null
          tracking_code?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_methods: {
        Row: {
          code: string
          created_at: string
          delivery_days: number
          description: string | null
          free_above_total: number | null
          id: string
          is_active: boolean
          kind: string
          max_order_total: number | null
          min_order_total: number | null
          name: string
          price: number
          provider: string
          regions: string[]
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          delivery_days?: number
          description?: string | null
          free_above_total?: number | null
          id?: string
          is_active?: boolean
          kind?: string
          max_order_total?: number | null
          min_order_total?: number | null
          name: string
          price?: number
          provider?: string
          regions?: string[]
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          delivery_days?: number
          description?: string | null
          free_above_total?: number | null
          id?: string
          is_active?: boolean
          kind?: string
          max_order_total?: number | null
          min_order_total?: number | null
          name?: string
          price?: number
          provider?: string
          regions?: string[]
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      shipping_quotes: {
        Row: {
          carrier: string | null
          cart_hash: string
          customer_id: string | null
          delivery_days: number
          expires_at: string
          external_id: string | null
          id: string
          method_code: string
          package_data: Json
          postal_code: string
          price: number
          production_days: number
          provider: string
          quoted_at: string
          service: string | null
        }
        Insert: {
          carrier?: string | null
          cart_hash: string
          customer_id?: string | null
          delivery_days: number
          expires_at?: string
          external_id?: string | null
          id?: string
          method_code: string
          package_data?: Json
          postal_code: string
          price: number
          production_days?: number
          provider: string
          quoted_at?: string
          service?: string | null
        }
        Update: {
          carrier?: string | null
          cart_hash?: string
          customer_id?: string | null
          delivery_days?: number
          expires_at?: string
          external_id?: string | null
          id?: string
          method_code?: string
          package_data?: Json
          postal_code?: string
          price?: number
          production_days?: number
          provider?: string
          quoted_at?: string
          service?: string | null
        }
        Relationships: []
      }
      shipping_settings: {
        Row: {
          active_provider: string
          free_shipping_min_total: number | null
          handling_days: number
          id: boolean
          local_pickup_address: string | null
          local_pickup_enabled: boolean
          local_pickup_instructions: string | null
          local_pickup_label: string | null
          melhor_envio_enabled: boolean
          melhor_envio_sandbox: boolean
          origin_city: string | null
          origin_complement: string | null
          origin_neighborhood: string | null
          origin_number: string | null
          origin_postal_code: string | null
          origin_state: string | null
          origin_street: string | null
          shipping_markup_percent: number
          updated_at: string
        }
        Insert: {
          active_provider?: string
          free_shipping_min_total?: number | null
          handling_days?: number
          id?: boolean
          local_pickup_address?: string | null
          local_pickup_enabled?: boolean
          local_pickup_instructions?: string | null
          local_pickup_label?: string | null
          melhor_envio_enabled?: boolean
          melhor_envio_sandbox?: boolean
          origin_city?: string | null
          origin_complement?: string | null
          origin_neighborhood?: string | null
          origin_number?: string | null
          origin_postal_code?: string | null
          origin_state?: string | null
          origin_street?: string | null
          shipping_markup_percent?: number
          updated_at?: string
        }
        Update: {
          active_provider?: string
          free_shipping_min_total?: number | null
          handling_days?: number
          id?: boolean
          local_pickup_address?: string | null
          local_pickup_enabled?: boolean
          local_pickup_instructions?: string | null
          local_pickup_label?: string | null
          melhor_envio_enabled?: boolean
          melhor_envio_sandbox?: boolean
          origin_city?: string | null
          origin_complement?: string | null
          origin_neighborhood?: string | null
          origin_number?: string | null
          origin_postal_code?: string | null
          origin_state?: string | null
          origin_street?: string | null
          shipping_markup_percent?: number
          updated_at?: string
        }
        Relationships: []
      }
      site_images: {
        Row: {
          alt: string
          key: string
          updated_at: string
          url: string
        }
        Insert: {
          alt?: string
          key: string
          updated_at?: string
          url: string
        }
        Update: {
          alt?: string
          key?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          cycle: string
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          monthly_price: number
          name: string
          packages_per_month: number
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          cycle?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          monthly_price: number
          name: string
          packages_per_month?: number
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          cycle?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          monthly_price?: number
          name?: string
          packages_per_month?: number
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancelled_at: string | null
          created_at: string
          customer_id: string
          id: string
          next_delivery_at: string | null
          plan_id: string
          preferences: Json | null
          started_at: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          customer_id: string
          id?: string
          next_delivery_at?: string | null
          plan_id: string
          preferences?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          next_delivery_at?: string | null
          plan_id?: string
          preferences?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_events: {
        Row: {
          created_at: string
          description: string | null
          id: string
          location: string | null
          occurred_at: string
          raw: Json | null
          shipment_id: string
          status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          occurred_at?: string
          raw?: Json | null
          shipment_id: string
          status: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          occurred_at?: string
          raw?: Json | null
          shipment_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_events_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      variant_option_values: {
        Row: {
          option_value_id: string
          variant_id: string
        }
        Insert: {
          option_value_id: string
          variant_id: string
        }
        Update: {
          option_value_id?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "variant_option_values_option_value_id_fkey"
            columns: ["option_value_id"]
            isOneToOne: false
            referencedRelation: "product_option_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variant_option_values_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_cart_session: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      product_sales_counts: {
        Args: never
        Returns: {
          product_id: string
          sold: number
        }[]
      }
    }
    Enums: {
      app_role: "customer" | "producer" | "admin" | "support"
      b2b_lead_status:
        | "new"
        | "contacted"
        | "in_proposal"
        | "won"
        | "lost"
        | "archived"
      brew_method:
        | "espresso"
        | "filter"
        | "french_press"
        | "aeropress"
        | "moka"
        | "cold_brew"
        | "chemex"
        | "v60"
      corporate_quote_status:
        | "draft"
        | "sent"
        | "accepted"
        | "rejected"
        | "expired"
      customization_field_type:
        | "short_text"
        | "long_text"
        | "select"
        | "color"
        | "number"
        | "file"
        | "image"
        | "checkbox"
      grind_option:
        | "whole_bean"
        | "espresso"
        | "moka"
        | "filter"
        | "french_press"
        | "aeropress"
        | "cold_brew"
      order_status:
        | "pending"
        | "paid"
        | "preparing"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded"
      payment_status: "pending" | "authorized" | "paid" | "failed" | "refunded"
      private_label_project_status:
        | "briefing"
        | "design"
        | "approval"
        | "production"
        | "delivered"
        | "cancelled"
      producer_status: "pending_review" | "active" | "suspended" | "rejected"
      product_option_type: "color" | "size" | "material" | "finish" | "other"
      product_status:
        | "draft"
        | "pending_review"
        | "active"
        | "rejected"
        | "archived"
      product_type_3d:
        | "sensory"
        | "decoration"
        | "utility"
        | "gift"
        | "collectible"
        | "articulated"
        | "organizer"
        | "personalized"
        | "other"
      roast_level: "light" | "medium_light" | "medium" | "medium_dark" | "dark"
      subscription_status: "active" | "paused" | "cancelled" | "pending"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["customer", "producer", "admin", "support"],
      b2b_lead_status: [
        "new",
        "contacted",
        "in_proposal",
        "won",
        "lost",
        "archived",
      ],
      brew_method: [
        "espresso",
        "filter",
        "french_press",
        "aeropress",
        "moka",
        "cold_brew",
        "chemex",
        "v60",
      ],
      corporate_quote_status: [
        "draft",
        "sent",
        "accepted",
        "rejected",
        "expired",
      ],
      customization_field_type: [
        "short_text",
        "long_text",
        "select",
        "color",
        "number",
        "file",
        "image",
        "checkbox",
      ],
      grind_option: [
        "whole_bean",
        "espresso",
        "moka",
        "filter",
        "french_press",
        "aeropress",
        "cold_brew",
      ],
      order_status: [
        "pending",
        "paid",
        "preparing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
      payment_status: ["pending", "authorized", "paid", "failed", "refunded"],
      private_label_project_status: [
        "briefing",
        "design",
        "approval",
        "production",
        "delivered",
        "cancelled",
      ],
      producer_status: ["pending_review", "active", "suspended", "rejected"],
      product_option_type: ["color", "size", "material", "finish", "other"],
      product_status: [
        "draft",
        "pending_review",
        "active",
        "rejected",
        "archived",
      ],
      product_type_3d: [
        "sensory",
        "decoration",
        "utility",
        "gift",
        "collectible",
        "articulated",
        "organizer",
        "personalized",
        "other",
      ],
      roast_level: ["light", "medium_light", "medium", "medium_dark", "dark"],
      subscription_status: ["active", "paused", "cancelled", "pending"],
    },
  },
} as const
