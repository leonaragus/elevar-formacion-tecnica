"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Activity, 
  Database, 
  FileText, 
  Users, 
  DollarSign, 
  Settings,
  X,
  LogOut
} from "lucide-react";

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const menuItems = [
  {
    name: "Dashboard",
    href: "/admin/dashboard",
    icon: Activity,
    description: "Resumen general"
  },
  {
    name: "Cursos",
    href: "/admin/cursos",
    icon: Database,
    description: "Gestión de cursos"
  },
  {
    name: "Mensajes",
    href: "/admin/mensajes",
    icon: FileText,
    description: "Comunicación alumnos"
  },
  {
    name: "Evaluaciones",
    href: "/admin/evaluaciones",
    icon: FileText,
    description: "Exámenes y notas"
  },
  {
    name: "Legajos",
    href: "/admin/legajos",
    icon: Users,
    description: "Alumnos y perfiles"
  },
  {
    name: "Pagos",
    href: "/admin/pagos",
    icon: DollarSign,
    description: "Finanzas"
  },
  {
    name: "Ajustes",
    href: "/admin/ajustes",
    icon: Settings,
    description: "Configuración"
  },
];

export function AdminSidebar({ isOpen = true, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Overlay para móvil */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-50 h-screen
          w-72 bg-slate-950 border-r border-white/10
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header del sidebar */}
          <div className="flex items-center justify-between p-4 border-b border-white/10 lg:hidden">
            <h2 className="text-lg font-semibold text-slate-100">
              Admin
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 text-slate-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="hidden lg:flex items-center gap-3 p-6 border-b border-white/10">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
               <span className="text-white font-bold">A</span>
            </div>
            <div>
               <h2 className="font-bold text-slate-100">Panel Admin</h2>
               <p className="text-xs text-slate-400">Elevar Formación</p>
            </div>
          </div>

          {/* Navegación */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`
                      flex items-start gap-3 px-4 py-3 rounded-lg transition-all
                      ${
                        isActive
                          ? "bg-blue-600/20 text-blue-400"
                          : "text-slate-300 hover:bg-white/5 hover:text-slate-100"
                      }
                    `}
                  >
                    <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isActive ? 'text-blue-400' : ''}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{item.name}</div>
                      <div className={`text-xs mt-0.5 ${isActive ? 'text-blue-300' : 'text-slate-500'}`}>
                        {item.description}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Footer del sidebar */}
          <div className="p-4 border-t border-white/10">
             <button
                onClick={() => {
                   // Logout action
                   window.location.href = "/api/auth/logout";
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-slate-300 hover:bg-white/5 hover:text-slate-100"
             >
                <LogOut className="w-5 h-5" />
                <div className="flex-1 text-left">
                   <div className="font-medium">Cerrar Sesión</div>
                </div>
             </button>
             <div className="bg-white/5 rounded-lg p-3 mt-3">
               <p className="text-xs text-slate-400">
                 v1.0.0 Stable
               </p>
             </div>
          </div>
        </div>
      </aside>
    </>
  );
}
