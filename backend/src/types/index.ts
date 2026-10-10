export type UserRole = 'admin' | 'trainer' | 'client';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  full_name: string;
  phone?: string;
  photo_url?: string;
  is_active: boolean;
  client_code?: string;
  qr_token?: string;
  created_at: Date;
  updated_at: Date;
}

export interface TrainerProfile {
  id: string;
  user_id: string;
  specialization?: string;
  bio?: string;
  experience_years?: number;
  education?: string;
  achievements?: string;
  photo_url?: string;
  video_url?: string;
  gallery?: any[];
  certificates?: any[];
  social_links?: any[];
  custom_page_title?: string;
  custom_page_content?: string;
  hired_at: Date;
  is_published: boolean;
  full_name?: string;
  email?: string;
  user_photo_url?: string;
  is_active?: boolean;
}

export interface Schedule {
  id: string;
  trainer_id: string;
  hall_id: number;
  dance_style_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  max_capacity: number;
  status: 'scheduled' | 'cancelled' | 'completed' | 'rescheduled';
  cancel_reason?: string;
  rescheduled_to?: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface MembershipType {
  id: number;
  name: string;
  description?: string;
  price: number;
  visit_count?: number | null;
  duration_days: number;
  dance_style_id?: number | null;
  is_active: boolean;
}

export interface Membership {
  id: string;
  client_id: string;
  membership_type_id: number;
  payment_id?: string;
  purchase_date: Date;
  start_date: Date;
  end_date: Date;
  remaining_visits?: number;
  status: 'active' | 'expired' | 'paused' | 'pending_extension' | 'cancelled';
  price_paid: number;
  paused_at?: Date;
  paused_until?: Date;
}

export interface Booking {
  id: string;
  schedule_id: string;
  class_date: Date;
  class_start: Date;
  class_end: Date;
  client_id: string;
  membership_id: string;
  booked_at: Date;
  status: 'booked' | 'cancelled' | 'attended' | 'no_show';
  cancelled_at?: Date;
  cancelled_by?: string;
  checked_in: boolean;
  checked_in_at?: Date;
  checked_in_by?: string;
}

export interface Message {
  id: number;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  edited: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface News {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  is_published: boolean;
  author_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  is_read: boolean;
  read_at?: Date;
  created_at: Date;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}
