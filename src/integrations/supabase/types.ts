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
      app_settings: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json
          reference: string | null
          resource_id: string | null
          resource_type: string | null
          store_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json
          reference?: string | null
          resource_id?: string | null
          resource_type?: string | null
          store_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json
          reference?: string | null
          resource_id?: string | null
          resource_type?: string | null
          store_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_sends: {
        Row: {
          audience: string
          campaign_type: string
          created_at: string
          created_by: string | null
          id: string
          message: string
          product_id: string | null
          recipient_name: string | null
          recipient_ref: string | null
          recipient_whatsapp: string
          store_id: string | null
        }
        Insert: {
          audience?: string
          campaign_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          message: string
          product_id?: string | null
          recipient_name?: string | null
          recipient_ref?: string | null
          recipient_whatsapp: string
          store_id?: string | null
        }
        Update: {
          audience?: string
          campaign_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          product_id?: string | null
          recipient_name?: string | null
          recipient_ref?: string | null
          recipient_whatsapp?: string
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_sends_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_sends_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          position: number
          store_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          position?: number
          store_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          position?: number
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          last_order_at: string | null
          name: string
          notes: string | null
          orders_count: number
          store_id: string
          total_spent: number
          updated_at: string
          whatsapp: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          last_order_at?: string | null
          name?: string
          notes?: string | null
          orders_count?: number
          store_id: string
          total_spent?: number
          updated_at?: string
          whatsapp?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          last_order_at?: string | null
          name?: string
          notes?: string | null
          orders_count?: number
          store_id?: string
          total_spent?: number
          updated_at?: string
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      installments: {
        Row: {
          amount: number
          created_at: string
          customer_id: string | null
          due_date: string
          id: string
          installment_number: number
          order_id: string
          paid_at: string | null
          paid_by: string | null
          payment_method: string | null
          payment_reference: string | null
          public_token: string
          status: string
          store_id: string
          total_installments: number
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          customer_id?: string | null
          due_date: string
          id?: string
          installment_number: number
          order_id: string
          paid_at?: string | null
          paid_by?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          public_token?: string
          status?: string
          store_id: string
          total_installments: number
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string | null
          due_date?: string
          id?: string
          installment_number?: number
          order_id?: string
          paid_at?: string | null
          paid_by?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          public_token?: string
          status?: string
          store_id?: string
          total_installments?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "installments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_settings: {
        Row: {
          badge: string | null
          created_at: string
          cta_href: string | null
          cta_label: string | null
          id: string
          image_url: string | null
          singleton: boolean
          subtitle: string | null
          title: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          badge?: string | null
          created_at?: string
          cta_href?: string | null
          cta_label?: string | null
          id?: string
          image_url?: string | null
          singleton?: boolean
          subtitle?: string | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          badge?: string | null
          created_at?: string
          cta_href?: string | null
          cta_label?: string | null
          id?: string
          image_url?: string | null
          singleton?: boolean
          subtitle?: string | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      manual_sales: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          customer_name: string | null
          description: string | null
          id: string
          method: string
          note: string | null
          sold_at: string
          store_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          description?: string | null
          id?: string
          method?: string
          note?: string | null
          sold_at?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          description?: string | null
          id?: string
          method?: string
          note?: string | null
          sold_at?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_sales_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          subtotal: number
          unit_price: number
          variant_label: string | null
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          subtotal?: number
          unit_price?: number
          variant_label?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          subtotal?: number
          unit_price?: number
          variant_label?: string | null
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
          created_at: string
          customer_id: string | null
          customer_name: string
          customer_whatsapp: string
          id: string
          installments_count: number
          note: string | null
          number: number
          payment_declared: boolean
          payment_method: string
          status: string
          store_id: string
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          customer_whatsapp?: string
          id?: string
          installments_count?: number
          note?: string | null
          number?: number
          payment_declared?: boolean
          payment_method?: string
          status?: string
          store_id: string
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          customer_whatsapp?: string
          id?: string
          installments_count?: number
          note?: string | null
          number?: number
          payment_declared?: boolean
          payment_method?: string
          status?: string
          store_id?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_reminders: {
        Row: {
          channel: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          id: string
          installment_id: string
          link: string | null
          message: string | null
          store_id: string
        }
        Insert: {
          channel?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          installment_id: string
          link?: string | null
          message?: string | null
          store_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          installment_id?: string
          link?: string | null
          message?: string | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_reminders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_installment_id_fkey"
            columns: ["installment_id"]
            isOneToOne: false
            referencedRelation: "installments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      pix_settings: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          pix_key: string
          pix_key_type: string
          receiver_city: string
          receiver_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          pix_key: string
          pix_key_type?: string
          receiver_city: string
          receiver_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          pix_key?: string
          pix_key_type?: string
          receiver_city?: string
          receiver_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      plan_pricing: {
        Row: {
          base_price: number
          created_at: string
          id: string
          plan: string
          promo_active: boolean
          promo_ends_at: string | null
          promo_label: string | null
          promo_price: number | null
          promo_starts_at: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          base_price?: number
          created_at?: string
          id?: string
          plan?: string
          promo_active?: boolean
          promo_ends_at?: string | null
          promo_label?: string | null
          promo_price?: number | null
          promo_starts_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          base_price?: number
          created_at?: string
          id?: string
          plan?: string
          promo_active?: boolean
          promo_ends_at?: string | null
          promo_label?: string | null
          promo_price?: number | null
          promo_starts_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      platform_sales: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          method: string
          note: string | null
          sold_at: string
          store_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          method?: string
          note?: string | null
          sold_at?: string
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          method?: string
          note?: string | null
          sold_at?: string
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_sales_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      pro_pix_requests: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          payment_method: string
          period_end: string | null
          period_start: string | null
          pix_key_snapshot: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          requested_at: string
          status: string
          store_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          payment_method?: string
          period_end?: string | null
          period_start?: string | null
          pix_key_snapshot?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requested_at?: string
          status?: string
          store_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          payment_method?: string
          period_end?: string | null
          period_start?: string | null
          pix_key_snapshot?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requested_at?: string
          status?: string
          store_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pro_pix_requests_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_option_values: {
        Row: {
          id: string
          option_id: string
          position: number
          value: string
        }
        Insert: {
          id?: string
          option_id: string
          position?: number
          value: string
        }
        Update: {
          id?: string
          option_id?: string
          position?: number
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
          id: string
          name: string
          position: number
          product_id: string
        }
        Insert: {
          id?: string
          name: string
          position?: number
          product_id: string
        }
        Update: {
          id?: string
          name?: string
          position?: number
          product_id?: string
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
      product_variants: {
        Row: {
          id: string
          is_available: boolean
          label: string
          price: number | null
          product_id: string
          stock: number
        }
        Insert: {
          id?: string
          is_available?: boolean
          label: string
          price?: number | null
          product_id: string
          stock?: number
        }
        Update: {
          id?: string
          is_available?: boolean
          label?: string
          price?: number | null
          product_id?: string
          stock?: number
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
          category_id: string | null
          created_at: string
          description: string
          has_variants: boolean
          id: string
          image_url: string | null
          is_available: boolean
          is_featured: boolean
          is_hidden: boolean
          name: string
          position: number
          price: number
          sku: string | null
          stock: number
          store_id: string
          track_stock: boolean
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string
          has_variants?: boolean
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_featured?: boolean
          is_hidden?: boolean
          name: string
          position?: number
          price?: number
          sku?: string | null
          stock?: number
          store_id: string
          track_stock?: boolean
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string
          has_variants?: boolean
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_featured?: boolean
          is_hidden?: boolean
          name?: string
          position?: number
          price?: number
          sku?: string | null
          stock?: number
          store_id?: string
          track_stock?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          name?: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      store_events: {
        Row: {
          created_at: string
          id: string
          product_id: string | null
          store_id: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: string | null
          store_id: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string | null
          store_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_events_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          accept_pix: boolean
          allow_installments: boolean
          banner_url: string | null
          category: string
          created_at: string
          description: string
          id: string
          instagram: string | null
          is_active: boolean
          logo_url: string | null
          max_installments: number
          min_installment_amount: number
          name: string
          onboarding_done: boolean
          owner_id: string | null
          pix_key: string
          pix_key_type: string
          plan: string
          primary_color: string
          seller_name: string
          slug: string
          updated_at: string
          welcome_message: string
          whatsapp: string
        }
        Insert: {
          accept_pix?: boolean
          allow_installments?: boolean
          banner_url?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          instagram?: string | null
          is_active?: boolean
          logo_url?: string | null
          max_installments?: number
          min_installment_amount?: number
          name: string
          onboarding_done?: boolean
          owner_id?: string | null
          pix_key?: string
          pix_key_type?: string
          plan?: string
          primary_color?: string
          seller_name?: string
          slug: string
          updated_at?: string
          welcome_message?: string
          whatsapp?: string
        }
        Update: {
          accept_pix?: boolean
          allow_installments?: boolean
          banner_url?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          instagram?: string | null
          is_active?: boolean
          logo_url?: string | null
          max_installments?: number
          min_installment_amount?: number
          name?: string
          onboarding_done?: boolean
          owner_id?: string | null
          pix_key?: string
          pix_key_type?: string
          plan?: string
          primary_color?: string
          seller_name?: string
          slug?: string
          updated_at?: string
          welcome_message?: string
          whatsapp?: string
        }
        Relationships: []
      }
      subscription_events: {
        Row: {
          error_message: string | null
          event_id: string
          event_type: string
          id: string
          payload_hash: string | null
          processed_at: string | null
          provider: string
          received_at: string
          resource_id: string | null
          status: string
          store_id: string | null
        }
        Insert: {
          error_message?: string | null
          event_id: string
          event_type: string
          id?: string
          payload_hash?: string | null
          processed_at?: string | null
          provider?: string
          received_at?: string
          resource_id?: string | null
          status?: string
          store_id?: string | null
        }
        Update: {
          error_message?: string | null
          event_id?: string
          event_type?: string
          id?: string
          payload_hash?: string | null
          processed_at?: string | null
          provider?: string
          received_at?: string
          resource_id?: string | null
          status?: string
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_events_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          due_at: string | null
          external_status: string | null
          id: string
          paid_at: string | null
          provider: string
          provider_payment_id: string
          status: string
          store_id: string
          subscription_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          due_at?: string | null
          external_status?: string | null
          id?: string
          paid_at?: string | null
          provider?: string
          provider_payment_id: string
          status?: string
          store_id: string
          subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          due_at?: string | null
          external_status?: string | null
          id?: string
          paid_at?: string | null
          provider?: string
          provider_payment_id?: string
          status?: string
          store_id?: string
          subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          canceled_at: string | null
          created_at: string
          currency: string
          current_period_end: string | null
          external_reference: string | null
          external_status: string | null
          grace_until: string | null
          id: string
          init_point: string | null
          last_payment_at: string | null
          next_billing_date: string | null
          past_due_since: string | null
          paused_at: string | null
          plan: string
          provider: string | null
          provider_plan_id: string | null
          provider_ref: string | null
          provider_subscription_id: string | null
          started_at: string | null
          status: string
          store_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount?: number
          canceled_at?: string | null
          created_at?: string
          currency?: string
          current_period_end?: string | null
          external_reference?: string | null
          external_status?: string | null
          grace_until?: string | null
          id?: string
          init_point?: string | null
          last_payment_at?: string | null
          next_billing_date?: string | null
          past_due_since?: string | null
          paused_at?: string | null
          plan?: string
          provider?: string | null
          provider_plan_id?: string | null
          provider_ref?: string | null
          provider_subscription_id?: string | null
          started_at?: string | null
          status?: string
          store_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          canceled_at?: string | null
          created_at?: string
          currency?: string
          current_period_end?: string | null
          external_reference?: string | null
          external_status?: string | null
          grace_until?: string | null
          id?: string
          init_point?: string | null
          last_payment_at?: string | null
          next_billing_date?: string | null
          past_due_since?: string | null
          paused_at?: string | null
          plan?: string
          provider?: string | null
          provider_plan_id?: string | null
          provider_ref?: string | null
          provider_subscription_id?: string | null
          started_at?: string | null
          status?: string
          store_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      enforce_subscription_grace: { Args: never; Returns: number }
      get_public_store: {
        Args: { _slug: string }
        Returns: {
          accept_pix: boolean
          allow_installments: boolean
          banner_url: string
          category: string
          description: string
          id: string
          instagram: string
          logo_url: string
          max_installments: number
          min_installment_amount: number
          name: string
          pix_key: string
          pix_key_type: string
          primary_color: string
          seller_name: string
          slug: string
          welcome_message: string
          whatsapp: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_overdue_installments: { Args: never; Returns: number }
    }
    Enums: {
      app_role: "admin" | "seller"
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
      app_role: ["admin", "seller"],
    },
  },
} as const
