"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  BookOpen, 
  FileText, 
  ClipboardCheck, 
  CreditCard, 
  Settings,
  BarChart2,
  X,
  Calendar,
  Video
} from "lucide-react";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

function readLocalStorage(key: string) {
  try {
    return typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

const menuItems = [
  {
    name: "Cursos",
    href: "/cursos",
    icon: BookOpen,
    description: "Mis cursos activos"
  },
  {
    name: "Clases Grabadas",
    href: "/mis-clases",
    icon: Video,
    description: "Videos de clases"
  },
  {
    name: "Calendario",
    href: "/calendario",
    icon: Calendar,
    description: "Fechas de entrega"
  },
  {
    name: "Materiales",
    href: "/materiales",
    icon: FileText,
    description: "Recursos de estudio"
  },
  {
    name: "Evaluaciones",
    href: "/evaluaciones",
    icon: ClipboardCheck,
    description: "Exámenes y trabajos"
  },
  {
    name: "Pagos",
    href: "/pagos",
    icon: CreditCard,
    description: "Estado de cuenta"
  },
  {
    name: "Ajustes",
    href: "/ajustes",
    icon: Settings,
    description: "Configuración"
  },
];

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [showLegajos, setShowLegajos] = useState(false);
  const [studentEmail, setStudentEmail] = useState<string | null>(null);
  const [studentOk, setStudentOk] = useState(false);
  const [hasActiveEnrollment, setHasActiveEnrollment] = useState<boolean | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Cargar datos de localStorage solo en el cliente
    setStudentEmail(readLocalStorage("student_email"));
    setStudentOk(readLocalStorage("student_ok") === "1");
  }, []);
  const [materialesCount, setMaterialesCount] = useState<number | null>(null);
  const [materialesNewCount, setMaterialesNewCount] = useState<number>(0);
  useEffect(() => {
    (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          const { data: insc } = await supabase
            .from("cursos_alumnos")
            .select("curso_id")
            .eq("user_id", user.id)
            .eq("estado", "activo")
            .limit(50);
          const rows = Array.isArray(insc) ? insc : [];
          setHasActiveEnrollment(rows.length > 0);
          setShowLegajos(rows.some((r: any) => String(r?.curso_id || "") === "gestion-documental"));
        } else {
          setHasActiveEnrollment(null);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/alumno/materiales-count", { cache: "no-store" });
        const json = await res.json().catch(() => null as any);
        if (res.ok && json?.ok) {
          setMaterialesCount(typeof json.count === "number" ? json.count : 0);
          setMaterialesNewCount(typeof json.newCount === "number" ? json.newCount : 0);
        } else {
          setMaterialesCount(0);
          setMaterialesNewCount(0);
        }
      } catch {
        setMaterialesCount(0);
        setMaterialesNewCount(0);
      }
    })();
  }, [pathname]);

  const restrictedByCookie = Boolean(studentEmail && !studentOk);
  const restrictedByUser = hasActiveEnrollment === false;
  const visibleMenuItems = !isMounted ? menuItems.slice(0, 1) : (restrictedByCookie || restrictedByUser ? menuItems.slice(0, 1) : menuItems);

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
          w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header del sidebar */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 lg:hidden">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Menú
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
          </div>

          {/* Navegación */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1">
              {visibleMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                const isMateriales = item.href === "/materiales";

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`
                      flex items-start gap-3 px-4 py-3 rounded-lg transition-all
                      ${
                        isActive
                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }
                    `}
                  >
                    <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isActive ? 'text-blue-700 dark:text-blue-400' : ''}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{item.name}</div>
                      <div className={`text-xs mt-0.5 ${isActive ? 'text-blue-600 dark:text-blue-500' : 'text-gray-500 dark:text-gray-400'}`}>
                        {item.description}
                      </div>
                    </div>
                    {isMateriales && typeof materialesCount === "number" && (
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            materialesNewCount > 0
                              ? "bg-emerald-600 text-white"
                              : "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                          }`}
                          title="Nuevos"
                        >
                          +{materialesNewCount}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            materialesCount > 0
                              ? "bg-blue-600/10 text-blue-700 border border-blue-600/30 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-500/30"
                              : "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                          }`}
                          title="Total"
                        >
                          {materialesCount}
                        </span>
                      </div>
                    )}
                  </Link>
                );
              })}
              {showLegajos && (
                <Link
                  href="/legajos"
                  onClick={onClose}
                  className={`
                    flex items-start gap-3 px-4 py-3 rounded-lg transition-all
                    ${pathname === "/legajos" ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"}
                  `}
                >
                  <FileText className={`w-5 h-5 mt-0.5 flex-shrink-0 ${pathname === "/legajos" ? 'text-blue-700 dark:text-blue-400' : ''}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">Legajos</div>
                    <div className={`text-xs mt-0.5 ${pathname === "/legajos" ? 'text-blue-600 dark:text-blue-500' : 'text-gray-500 dark:text-gray-400'}`}>
                      Gestión Documental
                    </div>
                  </div>
                </Link>
              )}
            </div>
          </nav>

          {/* Footer del sidebar */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                ¿Necesitas ayuda?
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                Contacta a soporte técnico
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
