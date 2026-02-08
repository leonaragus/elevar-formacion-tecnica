
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Sign out the user
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error("Logout error:", error);
      return NextResponse.redirect(new URL("/admin?error=logout_failed", req.url));
    }
    
    // Redirect to home page
    return NextResponse.redirect(new URL("/", req.url));
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.redirect(new URL("/admin?error=logout_failed", req.url));
  }
}