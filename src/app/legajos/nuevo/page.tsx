"use client";
export const dynamic = "force-dynamic";
import { MainLayout } from "@/components/MainLayout";
import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Save, ShieldCheck, FilePlus, AlertCircle } from "lucide-react";

function validarCUIT(cuit: string) {
  if (cuit.length !== 11) return false;
  const factores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let suma = 0;
  for (let i = 0; i < 10; i++) {
    suma += parseInt(cuit[i]) * factores[i];
  }
  let control = 11 - (suma % 11);
  if (control === 11) control = 0;
  if (control === 10) control = 9;
  return control === parseInt(cuit[10]);
}

export default function Page() {
  const [hasGD, setHasGD] = useState<boolean | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          const { data: insc } = await supabase
            .from("cursos_alumnos")
            .select("curso_id, estado")
            .eq("user_id", user.id)
            .eq("curso_id", "gestion-documental")
            .eq("estado", "activo")
            .limit(1);
          setHasGD(Array.isArray(insc) && insc.length > 0);
        } else {
          setHasGD(false);
        }
      } catch {
        setHasGD(false);
      }
    })();
  }, []);
  const [form, setForm] = useState({
    foto_url: "",
    nacionalidad: "Argentino",
    apellido: "",
    nombre: "",
    cuit_cuil: "",
    tipo_doc: "DNI",
    nro_doc: "",
    fecha_nacimiento: "",
    nivel_instruccion: "",
    puesto_empresa: "",
    diagrama_trabajo: "",
    horas_normales: 8,
    relacion_laboral: "Dependencia",
    fecha_inicio: "",
    situacion_gremial: "Fuera de convenio",
    poliza_art_id: "",
    poliza_vida_id: "",
  });

  const [seguros, setSeguros] = useState({
    vencimiento_seguros: "",
  });

  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSegurosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSeguros((prev) => ({ ...prev, [name]: value }));
  };

  const mayorDe18 = (fecha: string) => {
    if (!fecha) return false;
    const fn = new Date(fecha);
    const hoy = new Date();
    const diff = hoy.getTime() - fn.getTime();
    const years = diff / (1000 * 60 * 60 * 24 * 365.25);
    return years >= 18;
  };

  const esAfectable = () => {
    const vencOk = seguros.vencimiento_seguros && new Date(seguros.vencimiento_seguros) > new Date();
    return vencOk && !!form.foto_url;
  };

  const guardarBorrador = async () => {
    setError(null);
    setOk(null);
    if (!form.foto_url) return setError("foto_url es obligatorio");
    if (!form.apellido || !form.nombre) return setError("Apellido y Nombre son obligatorios");
    if (!validarCUIT(form.cuit_cuil)) return setError("CUIT/CUIL inválido");
    if (!mayorDe18(form.fecha_nacimiento)) return setError("Debe ser mayor de 18 años");
    setSaving(true);
    try {
      const res = await fetch("/api/legajos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form }),
      });
      const json = await res.json().catch(() => null as any);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Error al guardar");
      setOk("Guardado como Borrador");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const adjuntarSeguros = async () => {
    setError(null);
    setOk(null);
    if (!seguros.vencimiento_seguros) return setError("Debe informar vencimiento de seguros");
    if (new Date(seguros.vencimiento_seguros) <= new Date()) return setError("El vencimiento debe ser futuro");
    setSaving(true);
    try {
      const res = await fetch("/api/legajos/seguros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cuit_cuil: form.cuit_cuil, ...seguros, poliza_art_id: form.poliza_art_id, poliza_vida_id: form.poliza_vida_id }),
      });
      const json = await res.json().catch(() => null as any);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Error al adjuntar seguros");
      setOk("Seguros adjuntados");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const validarAuditoria = async () => {
    setError(null);
    setOk(null);
    setSaving(true);
    try {
      const res = await fetch("/api/legajos/validar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cuit_cuil: form.cuit_cuil }),
      });
      const json = await res.json().catch(() => null as any);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo validar");
      setOk("Legajo Habilitado");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Nuevo Legajo</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">Completa los datos del empleado</p>

        {hasGD === false && (
          <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-yellow-800 dark:text-yellow-300">
            Este módulo es exclusivo del curso “Gestión y Control Documental”. Selecciona el curso correcto en Ajustes y espera la aceptación.
            Si te equivocaste, vuelve a solicitar la inscripción al curso correcto.
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}
        {ok && (
          <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-green-700 dark:text-green-300">
            {ok}
          </div>
        )}

        {hasGD !== false && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-1">
            <label className="block text-sm font-medium mb-1">Foto URL</label>
            <input name="foto_url" value={form.foto_url} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" placeholder="https://..." />
          </div>
          <div className="col-span-1">
            <label className="block text-sm font-medium mb-1">Nacionalidad</label>
            <select name="nacionalidad" value={form.nacionalidad} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg">
              <option>Argentino</option>
              <option>Extranjero</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Apellido</label>
            <input name="apellido" value={form.apellido} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Nombre</label>
            <input name="nombre" value={form.nombre} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">CUIT/CUIL</label>
            <input name="cuit_cuil" value={form.cuit_cuil} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" placeholder="11 dígitos" />
            <div className={`text-xs mt-1 ${form.cuit_cuil.length === 11 ? (validarCUIT(form.cuit_cuil) ? "text-green-600" : "text-red-600") : "text-gray-500"}`}>
              {form.cuit_cuil.length === 11 ? (validarCUIT(form.cuit_cuil) ? "CUIT válido" : "CUIT inválido") : "Debe tener 11 dígitos"}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tipo de Documento</label>
            <select name="tipo_doc" value={form.tipo_doc} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg">
              <option>DNI</option>
              <option>Pasaporte</option>
              <option>LC</option>
              <option>LE</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Nro. Documento</label>
            <input name="nro_doc" value={form.nro_doc} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fecha de Nacimiento</label>
            <input type="date" name="fecha_nacimiento" value={form.fecha_nacimiento} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Nivel de Instrucción</label>
            <input name="nivel_instruccion" value={form.nivel_instruccion} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" placeholder="Univ. Completo, Sec. Incompleto, etc." />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Puesto en Empresa</label>
            <input name="puesto_empresa" value={form.puesto_empresa} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Diagrama de Trabajo</label>
            <input name="diagrama_trabajo" value={form.diagrama_trabajo} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" placeholder="5x2, 7x7, etc." />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Horas Normales</label>
            <input type="number" name="horas_normales" value={form.horas_normales} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Relación Laboral</label>
            <select name="relacion_laboral" value={form.relacion_laboral} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg">
              <option>Dependencia</option>
              <option>Autónomo</option>
              <option>Subcontratado</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fecha Inicio</label>
            <input type="date" name="fecha_inicio" value={form.fecha_inicio} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Situación Gremial</label>
            <select name="situacion_gremial" value={form.situacion_gremial} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg">
              <option>Fuera de convenio</option>
              <option>Dentro de convenio</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Póliza ART (UUID)</label>
            <input name="poliza_art_id" value={form.poliza_art_id} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Póliza Vida (UUID)</label>
            <input name="poliza_vida_id" value={form.poliza_vida_id} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
          </div>
        </div>
        )}

        {hasGD !== false && (
        <div className="mt-6 flex gap-3">
          <button onClick={guardarBorrador} disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg inline-flex items-center gap-2">
            <Save className="w-4 h-4" />
            Guardar Datos (Borrador)
          </button>
          <button onClick={adjuntarSeguros} disabled={saving} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg inline-flex items-center gap-2">
            <FilePlus className="w-4 h-4" />
            Adjuntar Seguros
          </button>
          <button onClick={validarAuditoria} disabled={saving || !esAfectable()} className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg inline-flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            Validar (Auditor)
          </button>
        </div>
        )}

        <div className="mt-6 p-4 rounded-lg border bg-gray-50 dark:bg-gray-900/40">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Vencimiento Seguros</label>
              <input type="date" name="vencimiento_seguros" value={seguros.vencimiento_seguros} onChange={handleSegurosChange} className="w-full px-3 py-2 border rounded-lg" />
              <div className="text-xs mt-1">{seguros.vencimiento_seguros ? (new Date(seguros.vencimiento_seguros) > new Date() ? "Vigente" : "Vencido") : "No informado"}</div>
            </div>
            <div>
              <div className="text-sm">Afectable</div>
              <div className={`mt-1 text-sm ${esAfectable() ? "text-green-600" : "text-red-600"}`}>{esAfectable() ? "Sí" : "No"}</div>
            </div>
            <div>
              <div className="text-sm">Pruebas en vivo CUIT</div>
              <div className={`mt-1 text-xs ${form.cuit_cuil.length === 11 ? (validarCUIT(form.cuit_cuil) ? "text-green-600" : "text-red-600") : "text-gray-500"}`}>
                {form.cuit_cuil.length === 11 ? (validarCUIT(form.cuit_cuil) ? "CUIT válido" : "CUIT inválido") : "Ingrese CUIT para probar"}
              </div>
              <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                Si aparece “CUIT inválido”, verifica que tenga 11 dígitos y que el dígito verificador sea correcto.
              </div>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-700 dark:text-gray-300">
            Guía rápida:
            <ul className="list-disc list-inside mt-1">
              <li>Completa Apellido, Nombre y Foto antes de Guardar.</li>
              <li>Adjunta seguros con vencimiento futuro.</li>
              <li>Valida con auditoría solo si “Afectable” está en “Sí”.</li>
              <li>Si te equivocaste, puedes volver a Guardar para actualizar los datos.</li>
            </ul>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
