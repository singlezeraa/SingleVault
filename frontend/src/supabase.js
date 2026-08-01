import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://edeuzvkxsofsirwkkvvg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZXV6dmt4c29mc2lyd2trdnZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzMDUzMTIsImV4cCI6MjA5OTg4MTMxMn0.wiKneqjr3C3YgjOJGJtE67P0ZvzpBdYjhq7AIvGUdGE';

export const supabase = createClient(supabaseUrl, supabaseKey);