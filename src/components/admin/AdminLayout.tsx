"use client";

import { useState } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { Menu, LogOut, User } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  const handleSignOut = async () => {
      try {
          const supabase = createSupabaseBrowserClient();
          await supabase.auth.signOut();
          window.location.href = "/";
      } catch {}
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      <AdminSidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />
      
      <div className="flex-1 flex flex-col min-w-0">
          {/* Topbar Mobile */}
          <div className="md:hidden border-b border-white/10 p-4 flex items-center justify-between bg-slate-950 sticky top-0 z-30">
             <div className="flex items-center gap-3">
                 <button onClick={() => setSidebarOpen(true)}>
                     <Menu className="w-6 h-6 text-slate-300" />
                 </button>
                 <span className="font-semibold text-slate-100">Panel Admin</span>
             </div>
             <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                 <span className="text-xs font-bold text-white">A</span>
             </div>
          </div>

          <main className="flex-1 overflow-y-auto">
             {children}
          </main>
      </div>
    </div>
  );
}
