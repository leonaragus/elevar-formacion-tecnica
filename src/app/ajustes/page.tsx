 "use client";
import { MainLayout } from "@/components/MainLayout";
import { UalaBisQRComponent } from "@/components/UalaBisQRComponent";
import { User, Bell, Lock, Palette, CreditCard, Shield, Save, Mail } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AjustesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    nombre: user?.user_metadata?.nombre || "",
    apellido: user?.user_metadata?.apellido || "",
    email: user?.email || "",
    telefono: user?.user_metadata?.telefono || "",
  });
  const [hasActive, setHasActive] = useState(false);
  const [hasPending, setHasPending] = useState(false);
  const [cursos, setCursos] = useState<Array<{ id: string; titulo: string }>>([]);
  const [selecting, setSelecting] = useState(false);

  useEffect(() => {
    const run = async () => {
      const supabase = createSupabaseBrowserClient();
      if (user?.id) {
        const { data: insc } = await supabase
          .from("cursos_alumnos")
          .select("curso_id, estado")
          .eq("user_id", user.id)
          .limit(20);
        const estados = Array.isArray(insc) ? insc.map((r: any) => r.estado) : [];
        setHasActive(estados.includes("activo"));
        setHasPending(estados.includes("pendiente"));
        const idsInsc = Array.isArray(insc) ? insc.map((r: any) => r.curso_id).filter((id) => id != null) : [];
        const res = await fetch("/api/admin/cursos?public=1", { cache: "no-store", headers: { "x-public": "1" } }).catch(() => null as any);
        const json = await res?.json().catch(() => null as any);
        const list = Array.isArray(json?.cursos) ? json.cursos : [];
        const base = list.map((c: any) => ({ id: String(c.id), titulo: String(c.titulo ?? "Curso") }));
        setCursos(base.filter((c: { id: string }) => !idsInsc.includes(c.id)));
      }
    };
    run();
  }, [user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      const supabase = createSupabaseBrowserClient();
      
      const { error } = await supabase.auth.updateUser({
        email: formData.email,
        data: {
          nombre: formData.nombre,
          apellido: formData.apellido,
          telefono: formData.telefono,
        },
      });

      if (error) throw error;
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Error al actualizar perfil:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };
  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Configuración y Ajustes
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Personaliza tu experiencia y gestiona tu cuenta
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna izquierda - Ajustes */}
          <div className="lg:col-span-2 space-y-6">
            {!hasPending || cursos.length > 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="border-b border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Selecciona tu curso para continuar
                    </h2>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  {hasPending ? (
                    <div className="rounded-lg border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 p-4 text-sm text-yellow-800 dark:text-yellow-300">
                      Tu solicitud de cursado está pendiente de aprobación. Te avisaremos cuando sea aceptada.
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Elige el curso al que estás anotado para solicitar tu inscripción.
                      </p>
                      <div className="space-y-3">
                        {cursos.length === 0 ? (
                          <div className="text-sm text-gray-500 dark:text-gray-400">No hay cursos disponibles.</div>
                        ) : (
                          cursos.map((c) => (
                            <button
                              key={c.id}
                              disabled={selecting}
                              onClick={async () => {
                                try {
                                  setSelecting(true);
                                  const res = await fetch("/api/alumno/inscripcion", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ curso_id: c.id }),
                                  });
                                  const json = await res.json().catch(() => null as any);
                                  if (!res.ok || !json?.ok) throw new Error(json?.error || "Error");
                                  setHasPending(true);
                                } catch (e) {
                                } finally {
                                  setSelecting(false);
                                }
                              }}
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                              <div className="font-medium text-gray-900 dark:text-white">{c.titulo}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">{c.id}</div>
                            </button>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : null}
            {/* Perfil */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="border-b border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Información Personal
                  </h2>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nombre
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Tu nombre"
                    disabled={!hasActive}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Apellido
                  </label>
                  <input
                    type="text"
                    name="apellido"
                    value={formData.apellido}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Tu apellido"
                    disabled={!hasActive}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="tu@email.com"
                      disabled={!hasActive}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+54 9 11 1234-5678"
                    disabled={!hasActive}
                  />
                </div>
                
                {success && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                    <p className="text-sm text-green-600 dark:text-green-400">Perfil actualizado correctamente</p>
                  </div>
                )}
                
                <button
                  type="submit"
                  disabled={loading || !hasActive}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {loading ? "Guardando..." : "Guardar cambios"}
                </button>
              </form>
            </div>

            {/* Notificaciones */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="border-b border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Notificaciones
                  </h2>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Notificaciones por email
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Recibe actualizaciones de tus cursos
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Recordatorios de clases
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Te avisaremos antes de cada clase
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Novedades del instituto
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Mantente informado de las novedades
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Seguridad */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="border-b border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Seguridad
                  </h2>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <button
                  onClick={async () => {
                    try {
                      const supabase = createSupabaseBrowserClient();
                      const { error } = await supabase.auth.resetPasswordForEmail(user?.email || '');
                      if (error) throw error;
                      alert('Se ha enviado un enlace para restablecer tu contraseña a tu email');
                    } catch (error) {
                      console.error('Error al enviar email de restablecimiento:', error);
                      alert('Error al enviar el email de restablecimiento');
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <p className="font-medium text-gray-900 dark:text-white">
                    Cambiar contraseña
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Actualiza tu contraseña regularmente
                  </p>
                </button>
                <button className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <p className="font-medium text-gray-900 dark:text-white">
                    Autenticación de dos factores
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Añade una capa extra de seguridad
                  </p>
                </button>
              </div>
            </div>
          </div>

          {/* Columna derecha - Método de pago */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <UalaBisQRComponent amount={15000} description="Mensualidad Marzo 2026" />
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
