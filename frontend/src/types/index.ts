export type UserRole = 'admin' | 'trainer' | 'client';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  phone?: string;
  photo_url?: string;
  is_active: boolean;
  client_code?: string;
  qr_token?: string;
  created_at: string;
  updated_at: string;
}

export interface Trainer {
  id: string;
  user_id: string;
  specialization?: string;
  experience_years?: number;
  bio?: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface Schedule {
  id: string;
  trainer_id: string;
  hall_id: number;
  dance_style_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  max_capacity: number;
  status: 'scheduled' | 'cancelled' | 'completed' | 'rescheduled';
  created_by: string;
  created_at: string;
  updated_at: string;
  trainer?: Trainer;
  hall?: Hall;
  dance_style?: DanceStyle;
}

export interface ScheduleListItem {
  id: string;
  trainer_id: string;
  hall_id: number;
  dance_style_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  max_capacity: number;
  status: 'scheduled' | 'cancelled' | 'completed' | 'rescheduled';
  hall_name: string;
  dance_style_name: string;
  trainer_name: string;
  hall_capacity?: number;
  dance_style_description?: string;
  dance_style_difficulty?: 'beginner' | 'intermediate' | 'advanced';
  trainer_specialization?: string;
}

export interface ScheduleOptions {
  halls: Hall[];
  dance_styles: Array<{ id: number; name: string }>;
}

export interface TrainerListItem {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  photo_url?: string;
  specialization?: string;
  experience_years?: number;
  bio?: string;
  is_published: boolean;
  is_active: boolean;
  education?: string;
  achievements?: string;
  video_url?: string;
  gallery?: Array<string | { url: string; type?: string }>;
  custom_page_title?: string;
  custom_page_content?: string;
  user_photo_url?: string;
}

export interface Hall {
  id: number;
  name: string;
  capacity: number;
  created_at: string;
}

export interface DanceStyle {
  id: number;
  name: string;
  description?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  is_active: boolean;
  dance_style_id?: number | null;
  created_at: string;
}

export interface MembershipType {
  id: number;
  name: string;
  description?: string;
  price: number;
  duration_days: number;
  visit_count?: number | null;
  dance_style_id?: number | null;
  is_active: boolean;
  created_at: string;
}

export interface Membership {
  id: string;
  client_id: string;
  membership_type_id: number;
  membership_type_name?: string;
  membership_dance_style_id?: number | null;
  start_date: string;
  end_date: string;
  remaining_visits: number | null;
  status: 'active' | 'expired' | 'paused' | 'pending_extension' | 'cancelled';
  created_at: string;
  updated_at: string;
  membership_type?: MembershipType;
}

export interface Booking {
  id: string;
  client_id: string;
  schedule_id: string;
  membership_id: string;
  status: 'booked' | 'cancelled' | 'attended' | 'no_show';
  class_date: string;
  start_time?: string;
  end_time?: string;
  dance_style_name?: string;
  hall_name?: string;
  trainer_name?: string;
  booked_at: string;
  cancelled_at?: string;
  checked_in_at?: string;
  schedule?: Schedule;
}

export interface Message {
  id: number;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
  sender?: User;
  receiver?: User;
}

export interface News {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  author_name?: string;
  author_id: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  author?: User;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  role: UserRole;
  full_name: string;
  phone?: string;
}
