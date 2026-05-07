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
    PostgrestVersion: "14.5"
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
        }
        Insert: {
          cart_id: string
          created_at?: string
          grind_option?: Database["public"]["Enums"]["grind_option"] | null
          id?: string
          product_id: string
          quantity?: number
        }
        Update: {
          cart_id?: string
          created_at?: string
          grind_option?: Database["public"]["Enums"]["grind_option"] | null
          id?: string
          product_id?: string
          quantity?: number
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
        ]
      }
      carts: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
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
      order_items: {
        Row: {
          created_at: string
          grind_option: Database["public"]["Enums"]["grind_option"] | null
          id: string
          item_status: Database["public"]["Enums"]["order_status"] | null
          order_id: string
          producer_id: string
          product_id: string
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          grind_option?: Database["public"]["Enums"]["grind_option"] | null
          id?: string
          item_status?: Database["public"]["Enums"]["order_status"] | null
          order_id: string
          producer_id: string
          product_id: string
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          grind_option?: Database["public"]["Enums"]["grind_option"] | null
          id?: string
          item_status?: Database["public"]["Enums"]["order_status"] | null
          order_id?: string
          producer_id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          total_price?: number
          unit_price?: number
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
          shipping_address: Json | null
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
          shipping_address?: Json | null
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
          shipping_address?: Json | null
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
      product_images: {
        Row: {
          alt: string | null
          created_at: string
          id: string
          product_id: string
          sort_order: number | null
          url: string
        }
        Insert: {
          alt?: string | null
          created_at?: string
          id?: string
          product_id: string
          sort_order?: number | null
          url: string
        }
        Update: {
          alt?: string | null
          created_at?: string
          id?: string
          product_id?: string
          sort_order?: number | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
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
      products: {
        Row: {
          acidity: number | null
          altitude_meters: number | null
          badges: string[] | null
          body: number | null
          compare_at_price: number | null
          cover_url: string | null
          created_at: string
          description: string | null
          farm_id: string | null
          grind_options: Database["public"]["Enums"]["grind_option"][] | null
          id: string
          intensity: number | null
          is_featured: boolean | null
          is_subscription_available: boolean | null
          name: string
          origin_country: string | null
          origin_region: string | null
          price: number
          process: string | null
          producer_id: string
          published_at: string | null
          recommended_brew: Database["public"]["Enums"]["brew_method"][] | null
          roast_date: string | null
          roast_level: Database["public"]["Enums"]["roast_level"] | null
          score: number | null
          short_description: string | null
          sku: string | null
          slug: string
          status: Database["public"]["Enums"]["product_status"]
          stock_quantity: number
          sweetness: number | null
          tasting_notes_text: string | null
          updated_at: string
          variety: string | null
          weight_grams: number | null
        }
        Insert: {
          acidity?: number | null
          altitude_meters?: number | null
          badges?: string[] | null
          body?: number | null
          compare_at_price?: number | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          farm_id?: string | null
          grind_options?: Database["public"]["Enums"]["grind_option"][] | null
          id?: string
          intensity?: number | null
          is_featured?: boolean | null
          is_subscription_available?: boolean | null
          name: string
          origin_country?: string | null
          origin_region?: string | null
          price: number
          process?: string | null
          producer_id: string
          published_at?: string | null
          recommended_brew?: Database["public"]["Enums"]["brew_method"][] | null
          roast_date?: string | null
          roast_level?: Database["public"]["Enums"]["roast_level"] | null
          score?: number | null
          short_description?: string | null
          sku?: string | null
          slug: string
          status?: Database["public"]["Enums"]["product_status"]
          stock_quantity?: number
          sweetness?: number | null
          tasting_notes_text?: string | null
          updated_at?: string
          variety?: string | null
          weight_grams?: number | null
        }
        Update: {
          acidity?: number | null
          altitude_meters?: number | null
          badges?: string[] | null
          body?: number | null
          compare_at_price?: number | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          farm_id?: string | null
          grind_options?: Database["public"]["Enums"]["grind_option"][] | null
          id?: string
          intensity?: number | null
          is_featured?: boolean | null
          is_subscription_available?: boolean | null
          name?: string
          origin_country?: string | null
          origin_region?: string | null
          price?: number
          process?: string | null
          producer_id?: string
          published_at?: string | null
          recommended_brew?: Database["public"]["Enums"]["brew_method"][] | null
          roast_date?: string | null
          roast_level?: Database["public"]["Enums"]["roast_level"] | null
          score?: number | null
          short_description?: string | null
          sku?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["product_status"]
          stock_quantity?: number
          sweetness?: number | null
          tasting_notes_text?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "customer" | "producer" | "admin" | "support"
      brew_method:
        | "espresso"
        | "filter"
        | "french_press"
        | "aeropress"
        | "moka"
        | "cold_brew"
        | "chemex"
        | "v60"
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
      producer_status: "pending_review" | "active" | "suspended" | "rejected"
      product_status:
        | "draft"
        | "pending_review"
        | "active"
        | "rejected"
        | "archived"
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
      producer_status: ["pending_review", "active", "suspended", "rejected"],
      product_status: [
        "draft",
        "pending_review",
        "active",
        "rejected",
        "archived",
      ],
      roast_level: ["light", "medium_light", "medium", "medium_dark", "dark"],
      subscription_status: ["active", "paused", "cancelled", "pending"],
    },
  },
} as const
