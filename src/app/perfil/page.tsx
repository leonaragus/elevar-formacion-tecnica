'use client';

import { MainLayout } from "@/components/MainLayout";
import { useAuth } from "@/components/AuthProvider";
import { useState, useEffect } from "react";
import { User, Save, AlertCircle, CheckCircle } from "lucide-react";

export default function PerfilPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    documento: "",
    telefono: "",
    direccion: "",
    fecha_nacimiento: "",
  });
  const [originalForm, setOriginalForm] = useState(formData);

  useEffect(() => {
    if (authLoading) return;

    if (user) {
      // Extraer nombre del email si no hay metadatos
      const nombreFromEmail = user.email?.split('@')[0] || "";
      const capitalize = (s: string) => s && s[0].toUpperCase() + s.slice(1);

      const filled = {
        nombre: user.user_metadata?.nombre || capitalize(nombreFromEmail),
        apellido: user.user_metadata?.apellido || "",
        documento: user.user_metadata?.documento || "",
        telefono: user.user_metadata?.telefono || "",
        direccion: user.user_metadata?.direccion || "",
        fecha_nacimiento: user.user_metadata?.fecha_nacimiento || "",
      };
      setFormData(filled);
      setOriginalForm(filled);
    } else {
        // Si no hay usuario, redirigir o mostrar mensaje
    }
    setLoading(false);
  }, [user, authLoading]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
        setMsg({ type: "error", text: "Debes iniciar sesión para guardar los cambios." });
        return;
    }
    setSaving(true);
    setMsg(null);

    try {
      const payload = { ...formData, email: user.email }; // Adjuntar siempre el email del usuario autenticado

      const response = await fetch("/api/perfil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json?.error || "Error al guardar los datos");
      }

      setOriginalForm(formData); // Actualizar el estado original para el botón Cancelar
      setMsg({ type: "success", text: "Datos actualizados correctamente." });
    } catch (error) {
      const text = error instanceof Error ? error.message : "No se pudieron guardar los cambios";
      setMsg({ type: "error", text });
    } finally {
      setSaving(false);
    }
  };
  
  const handleCancel = () => {
    setFormData(originalForm);
    setMsg(null);
  };

  if (loading) {
    return (
      <MainLayout><div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div></MainLayout>
    );
  }

  if (!user) {
    return (
        <MainLayout><div className="p-8 text-center text-red-600">Error: No se pudo verificar tu identidad. Por favor, intenta iniciar sesión de nuevo.</div></MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3"><User className="w-8 h-8 text-blue-600" />Mi Perfil</h1>
          <p className="text-gray-600 dark:text-gray-400">Completa tus datos personales para mantener tu legajo actualizado.</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nombre</label>
                <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Tu nombre" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Apellido</label>
                <input type="text" name="apellido" value={formData.apellido} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Tu apellido" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">DNI / Documento</label>
                <input type="text" name="documento" value={formData.documento} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Número de documento" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Fecha de Nacimiento</label>
                <input type="date" name="fecha_nacimiento" value={formData.fecha_nacimiento} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Dirección</label>
                <input type="text" name="direccion" value={formData.direccion} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Calle, número, ciudad..." />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Teléfono de Contacto</label>
                <input type="tel" name="telefono" value={formData.telefono} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="+54 9 11..." />
              </div>
            </div>

            {msg && (
              <div className={`p-4 mt-6 rounded-lg flex items-center gap-3 text-sm ${msg.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'}`}>
                {msg.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                {msg.text}
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
              <button type="button" onClick={handleCancel} disabled={saving} className="mr-4 px-6 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50">
                <Save size={18} />
                {saving ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}
