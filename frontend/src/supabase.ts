import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ebxxnjttexfykpgkkbbu.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVieHhuanR0ZXhmeWtwZ2trYmJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NzU1NDIsImV4cCI6MjA4MzI1MTU0Mn0.PkwOYBIeM-oLGu_eXhr0BawmpLAI7E__Y341GbCWnHw'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
