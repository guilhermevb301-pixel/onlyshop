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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      waitlist_leads: {
        Row: { id: string; position: number; name: string; email: string; whatsapp: string; profile: string; created_at: string; consent_at: string; consent_version: string }
        Insert: { name: string; email: string; whatsapp: string; profile: string }
        Update: { name?: string; email?: string; whatsapp?: string; profile?: string }
        Relationships: []
      }
      affiliate_invites: {
        Row: {
          affiliate_user_id: string
          brand_id: string
          campaign_id: string | null
          created_at: string
          id: string
          message: string | null
          responded_at: string | null
          status: string
        }
        Insert: {
          affiliate_user_id: string
          brand_id: string
          campaign_id?: string | null
          created_at?: string
          id?: string
          message?: string | null
          responded_at?: string | null
          status?: string
        }
        Update: {
          affiliate_user_id?: string
          brand_id?: string
          campaign_id?: string | null
          created_at?: string
          id?: string
          message?: string | null
          responded_at?: string | null
          status?: string
        }
        Relationships: []
      }
      affiliate_links: {
        Row: {
          clicks_count: number
          conversions_count: number
          created_at: string
          destination_url: string
          id: string
          name: string
          short_code: string
          user_id: string
        }
        Insert: {
          clicks_count?: number
          conversions_count?: number
          created_at?: string
          destination_url: string
          id?: string
          name: string
          short_code: string
          user_id: string
        }
        Update: {
          clicks_count?: number
          conversions_count?: number
          created_at?: string
          destination_url?: string
          id?: string
          name?: string
          short_code?: string
          user_id?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          created_at: string
          description: string | null
          icon_url: string | null
          id: string
          name: string
          points: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          name: string
          points?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          name?: string
          points?: number
        }
        Relationships: []
      }
      brands: {
        Row: {
          city: string | null
          created_at: string
          description: string | null
          id: string
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string
          niches: string[] | null
          slug: string
          state: string | null
          status: string
          target_categories: string[] | null
          updated_at: string
          user_id: string
          verified: boolean
          website: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          description?: string | null
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          niches?: string[] | null
          slug: string
          state?: string | null
          status?: string
          target_categories?: string[] | null
          updated_at?: string
          user_id: string
          verified?: boolean
          website?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          description?: string | null
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          niches?: string[] | null
          slug?: string
          state?: string | null
          status?: string
          target_categories?: string[] | null
          updated_at?: string
          user_id?: string
          verified?: boolean
          website?: string | null
        }
        Relationships: []
      }
      campaign_affiliates: {
        Row: {
          applied_at: string
          approved_at: string | null
          campaign_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          applied_at?: string
          approved_at?: string | null
          campaign_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          applied_at?: string
          approved_at?: string | null
          campaign_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_affiliates_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          bonus_percentage: number | null
          brand_id: string
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          max_affiliates: number | null
          name: string
          product_id: string | null
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          bonus_percentage?: number | null
          brand_id: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          max_affiliates?: number | null
          name: string
          product_id?: string | null
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          bonus_percentage?: number | null
          brand_id?: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          max_affiliates?: number | null
          name?: string
          product_id?: string | null
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      commissions: {
        Row: {
          amount: number
          created_at: string
          id: string
          paid_at: string | null
          percentage: number
          sale_id: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          paid_at?: string | null
          percentage: number
          sale_id: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          paid_at?: string | null
          percentage?: number
          sale_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          course_id: string | null
          cover_url: string | null
          created_at: string
          creator_id: string
          description: string | null
          id: string
          is_private: boolean
          members_count: number
          name: string
          pinned_post_id: string | null
          rules: string | null
          theme: string | null
        }
        Insert: {
          course_id?: string | null
          cover_url?: string | null
          created_at?: string
          creator_id: string
          description?: string | null
          id?: string
          is_private?: boolean
          members_count?: number
          name: string
          pinned_post_id?: string | null
          rules?: string | null
          theme?: string | null
        }
        Update: {
          course_id?: string | null
          cover_url?: string | null
          created_at?: string
          creator_id?: string
          description?: string | null
          id?: string
          is_private?: boolean
          members_count?: number
          name?: string
          pinned_post_id?: string | null
          rules?: string | null
          theme?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communities_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communities_pinned_post_id_fkey"
            columns: ["pinned_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_members: {
        Row: {
          community_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          community_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          community_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      course_enrollments: {
        Row: {
          certificate_code: string | null
          completed_at: string | null
          course_id: string
          enrolled_at: string
          id: string
          last_accessed_at: string | null
          progress_percent: number
          streak_days: number
          streak_last_date: string | null
          user_id: string
        }
        Insert: {
          certificate_code?: string | null
          completed_at?: string | null
          course_id: string
          enrolled_at?: string
          id?: string
          last_accessed_at?: string | null
          progress_percent?: number
          streak_days?: number
          streak_last_date?: string | null
          user_id: string
        }
        Update: {
          certificate_code?: string | null
          completed_at?: string | null
          course_id?: string
          enrolled_at?: string
          id?: string
          last_accessed_at?: string | null
          progress_percent?: number
          streak_days?: number
          streak_last_date?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_lesson_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          enrollment_id: string
          id: string
          lesson_id: string
          notes: string | null
          updated_at: string
          watch_seconds: number | null
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          enrollment_id: string
          id?: string
          lesson_id: string
          notes?: string | null
          updated_at?: string
          watch_seconds?: number | null
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          enrollment_id?: string
          id?: string
          lesson_id?: string
          notes?: string | null
          updated_at?: string
          watch_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "course_lesson_progress_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "course_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      course_lessons: {
        Row: {
          attachment_url: string | null
          content: string | null
          created_at: string
          description: string | null
          duration_seconds: number | null
          id: string
          is_free_preview: boolean
          lesson_type: Database["public"]["Enums"]["course_lesson_type"]
          module_id: string
          position: number
          title: string
          video_url: string | null
        }
        Insert: {
          attachment_url?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_free_preview?: boolean
          lesson_type?: Database["public"]["Enums"]["course_lesson_type"]
          module_id: string
          position?: number
          title: string
          video_url?: string | null
        }
        Update: {
          attachment_url?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_free_preview?: boolean
          lesson_type?: Database["public"]["Enums"]["course_lesson_type"]
          module_id?: string
          position?: number
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          drip_date: string | null
          drip_days: number | null
          drip_progress_min: number | null
          id: string
          position: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          drip_date?: string | null
          drip_days?: number | null
          drip_progress_min?: number | null
          id?: string
          position?: number
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          drip_date?: string | null
          drip_days?: number | null
          drip_progress_min?: number | null
          id?: string
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          access_type: Database["public"]["Enums"]["course_access_type"]
          brand_id: string
          cover_url: string | null
          created_at: string
          description: string | null
          drip_type: Database["public"]["Enums"]["course_drip_type"]
          id: string
          product_id: string | null
          published: boolean
          students_count: number
          title: string
          updated_at: string
        }
        Insert: {
          access_type?: Database["public"]["Enums"]["course_access_type"]
          brand_id: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          drip_type?: Database["public"]["Enums"]["course_drip_type"]
          id?: string
          product_id?: string | null
          published?: boolean
          students_count?: number
          title: string
          updated_at?: string
        }
        Update: {
          access_type?: Database["public"]["Enums"]["course_access_type"]
          brand_id?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          drip_type?: Database["public"]["Enums"]["course_drip_type"]
          id?: string
          product_id?: string | null
          published?: boolean
          students_count?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          key: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          key: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          key?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      gamification_points: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json | null
          points: number
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json | null
          points?: number
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          points?: number
          user_id?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      link_clicks: {
        Row: {
          affiliate_link_id: string
          clicked_at: string
          id: string
          ip_hash: string | null
          referer: string | null
          user_agent: string | null
        }
        Insert: {
          affiliate_link_id: string
          clicked_at?: string
          id?: string
          ip_hash?: string | null
          referer?: string | null
          user_agent?: string | null
        }
        Update: {
          affiliate_link_id?: string
          clicked_at?: string
          id?: string
          ip_hash?: string | null
          referer?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "link_clicks_affiliate_link_id_fkey"
            columns: ["affiliate_link_id"]
            isOneToOne: false
            referencedRelation: "affiliate_links"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          media_url: string | null
          message_type: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          media_url?: string | null
          message_type?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          media_url?: string | null
          message_type?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          required_action: string
          reward_points: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          required_action: string
          reward_points?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          required_action?: string
          reward_points?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string
          created_at: string
          id: string
          post_id: string | null
          read: boolean
          type: string
          user_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          id?: string
          post_id?: string | null
          read?: boolean
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          id?: string
          post_id?: string | null
          read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_profiles_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      order_items: {
        Row: {
          commission_amount: number | null
          commission_percentage: number | null
          created_at: string
          id: string
          order_id: string
          product_id: string
          product_name: string
          quantity: number
          unit_price: number
        }
        Insert: {
          commission_amount?: number | null
          commission_percentage?: number | null
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          product_name: string
          quantity?: number
          unit_price: number
        }
        Update: {
          commission_amount?: number | null
          commission_percentage?: number | null
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          product_name?: string
          quantity?: number
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
          affiliate_id: string | null
          affiliate_link_id: string | null
          created_at: string
          currency: string
          id: string
          paid_at: string | null
          payment_method: string | null
          shipping_address: Json | null
          status: string
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          affiliate_id?: string | null
          affiliate_link_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          shipping_address?: Json | null
          status?: string
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          affiliate_id?: string | null
          affiliate_link_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          shipping_address?: Json | null
          status?: string
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_affiliate_link_id_fkey"
            columns: ["affiliate_link_id"]
            isOneToOne: false
            referencedRelation: "affiliate_links"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          comments_count: number
          community_id: string | null
          content: string
          created_at: string
          id: string
          label: string | null
          label_metadata: Json | null
          likes_count: number
          media_url: string | null
          post_type: Database["public"]["Enums"]["post_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          comments_count?: number
          community_id?: string | null
          content: string
          created_at?: string
          id?: string
          label?: string | null
          label_metadata?: Json | null
          likes_count?: number
          media_url?: string | null
          post_type?: Database["public"]["Enums"]["post_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          comments_count?: number
          community_id?: string | null
          content?: string
          created_at?: string
          id?: string
          label?: string | null
          label_metadata?: Json | null
          likes_count?: number
          media_url?: string | null
          post_type?: Database["public"]["Enums"]["post_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          brand_id: string
          category: string | null
          commission_type: string
          commission_value: number
          created_at: string
          currency: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: number
          promo_materials: Json | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          active?: boolean
          brand_id: string
          category?: string | null
          commission_type?: string
          commission_value?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price?: number
          promo_materials?: Json | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          active?: boolean
          brand_id?: string
          category?: string | null
          commission_type?: string
          commission_value?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          promo_materials?: Json | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          categories: string[] | null
          city: string | null
          conversion_rate: number
          created_at: string
          display_name: string | null
          followers_count: number
          id: string
          latitude: number | null
          longitude: number | null
          niches: string[] | null
          performance_score: number
          state: string | null
          total_revenue: number
          total_sales: number
          updated_at: string
          user_id: string
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          categories?: string[] | null
          city?: string | null
          conversion_rate?: number
          created_at?: string
          display_name?: string | null
          followers_count?: number
          id?: string
          latitude?: number | null
          longitude?: number | null
          niches?: string[] | null
          performance_score?: number
          state?: string | null
          total_revenue?: number
          total_sales?: number
          updated_at?: string
          user_id: string
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          categories?: string[] | null
          city?: string | null
          conversion_rate?: number
          created_at?: string
          display_name?: string | null
          followers_count?: number
          id?: string
          latitude?: number | null
          longitude?: number | null
          niches?: string[] | null
          performance_score?: number
          state?: string | null
          total_revenue?: number
          total_sales?: number
          updated_at?: string
          user_id?: string
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      sales: {
        Row: {
          affiliate_link_id: string
          amount: number
          created_at: string
          currency: string
          external_order_id: string | null
          id: string
          product_name: string
        }
        Insert: {
          affiliate_link_id: string
          amount: number
          created_at?: string
          currency?: string
          external_order_id?: string | null
          id?: string
          product_name: string
        }
        Update: {
          affiliate_link_id?: string
          amount?: number
          created_at?: string
          currency?: string
          external_order_id?: string | null
          id?: string
          product_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_affiliate_link_id_fkey"
            columns: ["affiliate_link_id"]
            isOneToOne: false
            referencedRelation: "affiliate_links"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          media_type: string
          media_url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          media_type?: string
          media_url: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          media_type?: string
          media_url?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          currency: string
          features: Json | null
          id: string
          name: string
          price: number
          slug: string
          tier: number
        }
        Insert: {
          created_at?: string
          currency?: string
          features?: Json | null
          id?: string
          name: string
          price: number
          slug: string
          tier?: number
        }
        Update: {
          created_at?: string
          currency?: string
          features?: Json | null
          id?: string
          name?: string
          price?: number
          slug?: string
          tier?: number
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          plan_id: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan_id: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan_id?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
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
      tiktok_connections: {
        Row: {
          access_token: string | null
          avatar_url: string | null
          created_at: string
          display_name: string | null
          followers_count: number | null
          following_count: number | null
          id: string
          is_verified: boolean | null
          last_synced_at: string | null
          likes_count: number | null
          refresh_token: string | null
          scopes: string[] | null
          tiktok_user_id: string | null
          tiktok_username: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
          video_count: number | null
        }
        Insert: {
          access_token?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          followers_count?: number | null
          following_count?: number | null
          id?: string
          is_verified?: boolean | null
          last_synced_at?: string | null
          likes_count?: number | null
          refresh_token?: string | null
          scopes?: string[] | null
          tiktok_user_id?: string | null
          tiktok_username?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
          video_count?: number | null
        }
        Update: {
          access_token?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          followers_count?: number | null
          following_count?: number | null
          id?: string
          is_verified?: boolean | null
          last_synced_at?: string | null
          likes_count?: number | null
          refresh_token?: string | null
          scopes?: string[] | null
          tiktok_user_id?: string | null
          tiktok_username?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
          video_count?: number | null
        }
        Relationships: []
      }
      tiktok_posts: {
        Row: {
          affiliate_link_id: string | null
          caption: string | null
          comments_count: number | null
          created_at: string
          id: string
          likes_count: number | null
          shares_count: number | null
          status: string
          tiktok_video_id: string | null
          updated_at: string
          user_id: string
          views_count: number | null
        }
        Insert: {
          affiliate_link_id?: string | null
          caption?: string | null
          comments_count?: number | null
          created_at?: string
          id?: string
          likes_count?: number | null
          shares_count?: number | null
          status?: string
          tiktok_video_id?: string | null
          updated_at?: string
          user_id: string
          views_count?: number | null
        }
        Update: {
          affiliate_link_id?: string | null
          caption?: string | null
          comments_count?: number | null
          created_at?: string
          id?: string
          likes_count?: number | null
          shares_count?: number | null
          status?: string
          tiktok_video_id?: string | null
          updated_at?: string
          user_id?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tiktok_posts_affiliate_link_id_fkey"
            columns: ["affiliate_link_id"]
            isOneToOne: false
            referencedRelation: "affiliate_links"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_levels: {
        Row: {
          id: string
          level: string
          month_start: string | null
          monthly_xp: number
          streak_days: number
          streak_last_date: string | null
          total_xp: number
          updated_at: string
          user_id: string
          week_start: string | null
          weekly_xp: number
        }
        Insert: {
          id?: string
          level?: string
          month_start?: string | null
          monthly_xp?: number
          streak_days?: number
          streak_last_date?: string | null
          total_xp?: number
          updated_at?: string
          user_id: string
          week_start?: string | null
          weekly_xp?: number
        }
        Update: {
          id?: string
          level?: string
          month_start?: string | null
          monthly_xp?: number
          streak_days?: number
          streak_last_date?: string | null
          total_xp?: number
          updated_at?: string
          user_id?: string
          week_start?: string | null
          weekly_xp?: number
        }
        Relationships: []
      }
      user_missions: {
        Row: {
          completed_at: string | null
          id: string
          mission_id: string
          progress: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          mission_id: string
          progress?: number
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          mission_id?: string
          progress?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_missions_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vsl_analytics: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          session_id: string
          vsl_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          session_id: string
          vsl_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          session_id?: string
          vsl_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vsl_analytics_vsl_id_fkey"
            columns: ["vsl_id"]
            isOneToOne: false
            referencedRelation: "vsl_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      vsl_settings: {
        Row: {
          autoplay: boolean | null
          created_at: string
          cta_delay_seconds: number | null
          cta_text: string | null
          headline: string
          id: string
          is_active: boolean | null
          subheadline: string | null
          updated_at: string
          video_url: string
        }
        Insert: {
          autoplay?: boolean | null
          created_at?: string
          cta_delay_seconds?: number | null
          cta_text?: string | null
          headline: string
          id?: string
          is_active?: boolean | null
          subheadline?: string | null
          updated_at?: string
          video_url: string
        }
        Update: {
          autoplay?: boolean | null
          created_at?: string
          cta_delay_seconds?: number | null
          cta_text?: string | null
          headline?: string
          id?: string
          is_active?: boolean | null
          subheadline?: string | null
          updated_at?: string
          video_url?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          pix_key: string | null
          pix_key_type: string | null
          reference_id: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          pix_key?: string | null
          pix_key_type?: string | null
          reference_id?: string | null
          status?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          pix_key?: string | null
          pix_key_type?: string | null
          reference_id?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_gamification_points: {
        Args: {
          _action: string
          _metadata?: Json
          _points: number
          _user_id: string
        }
        Returns: undefined
      }
      get_trending_products: {
        Args: {
          _category?: string
          _limit?: number
          _period_days?: number
          _state?: string
        }
        Returns: {
          brand_id: string
          brand_logo: string
          brand_name: string
          brand_state: string
          category: string
          commission_type: string
          commission_value: number
          currency: string
          description: string
          image_url: string
          name: string
          price: number
          product_id: string
          recent_clicks: number
          recent_sales: number
          trend_score: number
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_active_subscription: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      haversine_km: {
        Args: { lat1: number; lat2: number; lon1: number; lon2: number }
        Returns: number
      }
      is_admin: { Args: never; Returns: boolean }
      is_affiliate_or_above: { Args: { _user_id: string }; Returns: boolean }
      is_enrolled_in_course: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      match_affiliates_for_brand: {
        Args: { _brand_id: string; _limit?: number }
        Returns: {
          avatar_url: string
          categories: string[]
          city: string
          conversion_rate: number
          display_name: string
          distance_km: number
          followers_count: number
          match_score: number
          niche_overlap: number
          niches: string[]
          performance_score: number
          state: string
          total_revenue: number
          total_sales: number
          user_id: string
          username: string
        }[]
      }
      match_brands_for_affiliate: {
        Args: { _limit?: number; _user_id: string }
        Returns: {
          brand_id: string
          city: string
          distance_km: number
          logo_url: string
          match_score: number
          name: string
          niche_overlap: number
          niches: string[]
          slug: string
          state: string
          verified: boolean
        }[]
      }
    }
    Enums: {
      app_role:
        | "viewer"
        | "learner"
        | "affiliate"
        | "agency"
        | "brand"
        | "admin"
      course_access_type: "lifetime" | "subscription" | "installment"
      course_drip_type:
        | "none"
        | "date"
        | "days_after_enrollment"
        | "progress"
        | "manual"
      course_lesson_type: "video" | "text" | "pdf" | "quiz"
      post_type: "text" | "image" | "video"
      subscription_status: "active" | "canceled" | "past_due" | "trialing"
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
      app_role: ["viewer", "learner", "affiliate", "agency", "brand", "admin"],
      course_access_type: ["lifetime", "subscription", "installment"],
      course_drip_type: [
        "none",
        "date",
        "days_after_enrollment",
        "progress",
        "manual",
      ],
      course_lesson_type: ["video", "text", "pdf", "quiz"],
      post_type: ["text", "image", "video"],
      subscription_status: ["active", "canceled", "past_due", "trialing"],
    },
  },
} as const
