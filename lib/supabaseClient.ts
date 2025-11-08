
import { createClient } from '@supabase/supabase-js';

// Dane do połączenia z Twoim projektem Supabase
const supabaseUrl = 'https://ipdzreofebvkeizqpnhm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwZHpyZW9mZWJ2a2VpenFwbmhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5MjExMzMsImV4cCI6MjA3NzQ5NzEzM30.n1aqL1O6KJf0xRnnjZL8g67adPemtuIW7AoACWUGpqY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
