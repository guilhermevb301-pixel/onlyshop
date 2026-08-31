import { supabase } from '@/integrations/supabase/client';

type TikTokResponse<T = any> = {
  success: boolean;
  error?: string;
  data?: T;
  [key: string]: any;
};

export const tiktokApi = {
  // ===== AUTH =====
  async getAuthUrl(redirectUri: string): Promise<TikTokResponse> {
    const { data, error } = await supabase.functions.invoke('tiktok-auth', {
      body: { action: 'get_auth_url', redirect_uri: redirectUri },
    });
    if (error) return { success: false, error: error.message };
    return data;
  },

  async exchangeToken(code: string, redirectUri: string): Promise<TikTokResponse> {
    const { data, error } = await supabase.functions.invoke('tiktok-auth', {
      body: { action: 'exchange_token', code, redirect_uri: redirectUri },
    });
    if (error) return { success: false, error: error.message };
    return data;
  },

  // ===== METRICS =====
  async getUserStats(): Promise<TikTokResponse> {
    const { data, error } = await supabase.functions.invoke('tiktok-metrics', {
      body: { action: 'user_stats' },
    });
    if (error) return { success: false, error: error.message };
    return data;
  },

  async getVideoList(cursor?: string): Promise<TikTokResponse> {
    const { data, error } = await supabase.functions.invoke('tiktok-metrics', {
      body: { action: 'video_list', cursor },
    });
    if (error) return { success: false, error: error.message };
    return data;
  },

  // ===== POSTING =====
  async publishVideo(videoUrl: string, caption: string, privacyLevel?: string): Promise<TikTokResponse> {
    const { data, error } = await supabase.functions.invoke('tiktok-post', {
      body: { action: 'publish_video', video_url: videoUrl, caption, privacy_level: privacyLevel },
    });
    if (error) return { success: false, error: error.message };
    return data;
  },

  async getPublishStatus(publishId: string): Promise<TikTokResponse> {
    const { data, error } = await supabase.functions.invoke('tiktok-post', {
      body: { action: 'publish_status', publish_id: publishId },
    });
    if (error) return { success: false, error: error.message };
    return data;
  },

  // ===== SHOP =====
  async getShopInfo(): Promise<TikTokResponse> {
    const { data, error } = await supabase.functions.invoke('tiktok-shop', {
      body: { action: 'shop_info' },
    });
    if (error) return { success: false, error: error.message };
    return data;
  },

  async getOrders(startTime?: number, endTime?: number, cursor?: string): Promise<TikTokResponse> {
    const { data, error } = await supabase.functions.invoke('tiktok-shop', {
      body: { action: 'orders', start_time: startTime, end_time: endTime, cursor },
    });
    if (error) return { success: false, error: error.message };
    return data;
  },

  async getOrderDetail(orderId: string): Promise<TikTokResponse> {
    const { data, error } = await supabase.functions.invoke('tiktok-shop', {
      body: { action: 'order_detail', order_id: orderId },
    });
    if (error) return { success: false, error: error.message };
    return data;
  },
};
