import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Exam {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  exam_id: string;
  name: string;
  code?: string;
  created_at: string;
  updated_at: string;
}

export interface Slot {
  id: string;
  course_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Part {
  id: string;
  course_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id?: string;
  question_type: string;
  question_statement: string;
  options?: string[];
  course_id: string;
  slot?: string;
  part?: string;
  year: number;
  categorized?: boolean;
  correct_marks?: number;
  incorrect_marks?: number;
  skipped_marks?: number;
  partial_marks?: number;
  time_minutes?: number;
  created_at?: string;
  updated_at?: string;
}
