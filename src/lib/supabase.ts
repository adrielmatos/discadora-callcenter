import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://arcaaeehnxluginzncfs.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyY2FhZWVobnhsdWdpbnpuY2ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5MDMwNzEsImV4cCI6MjEwNjQ3OTA3MX0.sesEcB-EF3yCGa0b84xQ-56kEchoryt4c5sNqm4sup0";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
