export interface Photo {
  id: string;
  storage_path: string;
  thumbnail_path: string;
  dish_name: string | null;
  description_en: string | null;
  description_cn: string | null;
  original_filename: string | null;
  file_size: number | null;
  width: number | null;
  height: number | null;
  taken_at: string | null;
  created_at: string;
  updated_at: string;
  uploaded_by: string | null;
}

export interface PhotoWithUrls extends Photo {
  imageUrl: string;
  thumbnailUrl: string;
}

export type GalleryView = 'floating' | 'masonry' | 'timeline';

export type MobileTab = 'feed' | 'browse' | 'analytics' | 'upload';

export interface PaginatedPhotos {
  photos: PhotoWithUrls[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface MonthlyCount {
  month: string;
  label: string;
  count: number;
}

export interface DishCount {
  dishName: string;
  count: number;
}

export interface DailyTrendPoint {
  date: string;
  count: number;
}

export interface AnalyticsResponse {
  totalCount: number;
  perMonth: MonthlyCount[];
  topDishes: DishCount[];
  recentTrend: DailyTrendPoint[];
}
