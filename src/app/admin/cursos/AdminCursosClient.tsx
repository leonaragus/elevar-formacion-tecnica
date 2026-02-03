"use client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
import { User, Activity, Users, BookOpen, DollarSign, AlertTriangle, Database, Settings, LogOut, Search, Filter, Download, Trash2, Plus, Edit, Eye, CheckCircle, Clock, XCircle, Upload, ExternalLink } from "lucide-react";
import Link from "next/link";
 
 type CursoRow = {
   id: string;
   titulo: string;
   descripcion: string;
   duracion: string;
   modalidad: "presencial" | "virtual" | "semipresencial" | "a distancia";
   categoria: string;
   nivel: "inicial" | "intermedio" | "avanzado" | "especializacion";
   precio: number;
   estado: "activo" | "inactivo" | "en_desarrollo" | "suspendido";
   created_at: string;
   updated_at: string;
 };
 
 type AlumnoRow = {
   id: string;
   nombre: string;
   apellido: string;
   email: string;
   documento: string;
   telefono: string;
   curso_id?: string;
   created_at: string;
 };
 
 export default function AdminCursosClient() {
   const [cursos, setCursos] = useState<CursoRow[]>([]);
   const [alumnos, setAlumnos] = useState<AlumnoRow[]>([]);
   const [pendientes, setPendientes] = useState<{ user_id: string; curso_id: string; estado: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const supabase = createSupabaseBrowserClient();
  const demoEnabled = process.env.NEXT_PUBLIC_ENABLE_DEMO === "1";
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadError(null);
        const { data: { user: userData } } = await supabase.auth.getUser();
        setUser(userData);

        const res = await fetch(`/api/admin/cursos`, { cache: "no-store" }).catch(() => null as any);
        const json = await res?.json().catch(() => null as any);

        setCursos(Array.isArray(json?.cursos) ? json.cursos : []);
        setAlumnos(Array.isArray(json?.alumnos) ? json.alumnos : []);
        
        let resPend = await fetch(`/api/admin/inscripciones`, { cache: "no-store" }).catch(() => null as any);
        let jsonPend = await resPend?.json().catch(() => null as any);
        
        if (jsonPend) {
          setDebugInfo(jsonPend.debug);
        }

        if (jsonPend && !jsonPend.ok && jsonPend.error) {
           setLoadError(`Error cargando inscripciones: ${jsonPend.error}`);
        }

        if (resPend && resPend.status === 401 && demoEnabled) {
          try {
            await fetch("/api/profesor/access", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code: "vanesa2025" }),
            });
            const resCursos = await fetch(`/api/admin/cursos`, { cache: "no-store" }).catch(() => null as any);
            const jsonCursos = await resCursos?.json().catch(() => null as any);
            setCursos(Array.isArray(jsonCursos?.cursos) ? jsonCursos.cursos : []);
            setAlumnos(Array.isArray(jsonCursos?.alumnos) ? jsonCursos.alumnos : []);
            resPend = await fetch(`/api/admin/inscripciones`, { cache: "no-store" }).catch(() => null as any);
            jsonPend = await resPend?.json().catch(() => null as any);
            if (jsonPend && !jsonPend.ok && jsonPend.error) {
               setLoadError(`Error cargando inscripciones: ${jsonPend.error}`);
            }
          } catch {}
        }
        setPendientes(Array.isArray(jsonPend?.pendientes) ? jsonPend.pendientes : []);
      } catch (error: any) {
        console.error("Error fetching data:", error);
        setLoadError(error?.message || "Error desconocido");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [supabase]);

  const forceReload = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/inscripciones?t=${Date.now()}`, { cache: "no-store" });
      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        alert("Respuesta no válida del servidor: " + text.substring(0, 100));
        return;
      }
      
      alert(`Estado: ${res.status}\nDatos: ${JSON.stringify(json, null, 2)}`);
      
      if (json && json.pendientes) {
        setPendientes(json.pendientes);
        setDebugInfo(json.debug);
      }
    } catch (e: any) {
      alert("Error de red: " + e.message);
    } finally {
      setLoading(false);
    }
  };
 
   const [searchTerm, setSearchTerm] = useState("");
   const [filterEstado, setFilterEstado] = useState("");
   const [filterCategoria, setFilterCategoria] = useState("");
   const [filterNivel, setFilterNivel] = useState("");
   const [currentPage, setCurrentPage] = useState(1);
   const [itemsPerPage] = useState(10);
 
   const [showNew, setShowNew] = useState(false);
   const [newTitulo, setNewTitulo] = useState("");
   const [newDescripcion, setNewDescripcion] = useState("");
   const [newDuracion, setNewDuracion] = useState("");
   const [newModalidad, setNewModalidad] = useState<"presencial" | "virtual" | "semipresencial" | "a distancia">("virtual");
   const [newCategoria, setNewCategoria] = useState("");
   const [newNivel, setNewNivel] = useState<"inicial" | "intermedio" | "avanzado" | "especializacion">("inicial");
   const [newPrecio, setNewPrecio] = useState<number>(0);
   const [newEstado, setNewEstado] = useState<"activo" | "inactivo" | "en_desarrollo" | "suspendido">("en_desarrollo");
   const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const saveNewCourse = async () => {
     try {
       setSaving(true);
       const method = editingId ? "PUT" : "POST";
       const body: any = {
           titulo: newTitulo,
           descripcion: newDescripcion,
           duracion: newDuracion,
           modalidad: newModalidad,
           categoria: newCategoria,
           nivel: newNivel,
           precio: newPrecio,
           estado: newEstado,
       };
       if (editingId) body.id = editingId;

       const res = await fetch("/api/admin/cursos", {
         method,
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify(body),
       });
       const json = await res.json().catch(() => null as any);
       if (!res.ok || !json?.ok) {
         alert(json?.error || "No se pudo guardar el curso");
         return;
       }
       setShowNew(false);
       setEditingId(null);
       setNewTitulo("");
       setNewDescripcion("");
       setNewDuracion("");
       setNewCategoria("");
       setNewPrecio(0);
       // Refresh
       setLoading(true);
       const res2 = await fetch(`/api/admin/cursos`, { cache: "no-store" }).catch(() => null as any);
       const json2 = await res2?.json().catch(() => null as any);
       setCursos(Array.isArray(json2?.cursos) ? json2.cursos : []);
       setAlumnos(Array.isArray(json2?.alumnos) ? json2.alumnos : []);
     } catch (e) {
       alert("Error al guardar curso");
     } finally {
       setSaving(false);
       setLoading(false);
     }
   };

   const startEdit = (curso: CursoRow) => {
      setEditingId(curso.id);
      setNewTitulo(curso.titulo);
      setNewDescripcion(curso.descripcion);
      setNewDuracion(curso.duracion);
      setNewModalidad(curso.modalidad as any);
      setNewCategoria(curso.categoria);
      setNewNivel(curso.nivel as any);
      setNewPrecio(curso.precio);
      setNewEstado(curso.estado as any);
      setShowNew(true);
   };

   const deleteCourse = async (id: string) => {
      if (!confirm("¿Eliminar este curso?")) return;
      try {
          const res = await fetch(`/api/admin/cursos?id=${id}`, { method: "DELETE" });
          if (res.ok) {
              setCursos(prev => prev.filter(c => c.id !== id));
          } else {
              alert("Error al eliminar");
          }
      } catch {
          alert("Error de red");
      }
   };

   const approvePending = async (user_id: string, curso_id: string) => {
     try {
       const res = await fetch("/api/admin/inscripciones", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ user_id, curso_id }),
       });
       const json = await res.json().catch(() => null as any);
       if (!res.ok || !json?.ok) {
         alert(json?.error || "No se pudo aprobar");
         return;
       }
       setPendientes(prev => prev.filter(p => !(p.user_id === user_id && p.curso_id === curso_id)));
     } catch (e) {
       alert("Error al aprobar");
     }
   };
 
   const rejectPending = async (user_id: string, curso_id: string) => {
     try {
       const res = await fetch("/api/admin/inscripciones", {
         method: "DELETE",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ user_id, curso_id }),
       });
       const json = await res.json().catch(() => null as any);
       if (!res.ok || !json?.ok) {
         alert(json?.error || "No se pudo rechazar");
         return;
       }
       setPendientes(prev => prev.filter(p => !(p.user_id === user_id && p.curso_id === curso_id)));
     } catch (e) {
       alert("Error al rechazar");
     }
   };
 
   const filteredCursos = cursos.filter(curso => {
     const searchMatch = !searchTerm || 
       curso.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
       curso.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
       curso.categoria.toLowerCase().includes(searchTerm.toLowerCase());
     
     const estadoMatch = !filterEstado || curso.estado === filterEstado;
     const categoriaMatch = !filterCategoria || curso.categoria === filterCategoria;
     const nivelMatch = !filterNivel || curso.nivel === filterNivel;
     
     return searchMatch && estadoMatch && categoriaMatch && nivelMatch;
   });
 
   const totalPages = Math.ceil(filteredCursos.length / itemsPerPage);
   const paginatedCursos = filteredCursos.slice(
     (currentPage - 1) * itemsPerPage,
     currentPage * itemsPerPage
   );
 
   const categorias = Array.from(new Set(cursos.map(c => c.categoria)));
   const niveles = Array.from(new Set(cursos.map(c => c.nivel)));
 
   return (
     <div className="p-4 md:p-8">
       <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
         <div>
           <h1 className="text-xl font-semibold text-slate-50">
             <Database className="w-5 h-5 mr-2 inline text-blue-400" />
             Gestión de Cursos
           </h1>
           <p className="mt-1 text-sm text-slate-400">
             Administración completa de cursos, categorías y matrículas
           </p>
         </div>
         <div className="flex items-center gap-4 text-sm text-slate-300">
           <User className="w-5 h-5" />
           {user?.email || "Administrador"}
         </div>
       </header>

       <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-6">
             <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
               <div className="md:col-span-3">
                 <div className="relative">
                   <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                   <input
                     type="text"
                     placeholder="Buscar por título, descripción o categoría..."
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="w-full pl-10 pr-4 py-2 bg-transparent border border-white/10 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                   />
                 </div>
               </div>
 
               <div>
                 <select
                   value={filterEstado}
                   onChange={(e) => setFilterEstado(e.target.value)}
                   className="w-full px-4 py-2 bg-transparent border border-white/10 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                 >
                   <option value="">Todos los estados</option>
                   <option value="activo">Activos</option>
                   <option value="inactivo">Inactivos</option>
                   <option value="en_desarrollo">En desarrollo</option>
                   <option value="suspendido">Suspendidos</option>
                 </select>
               </div>
 
               <div>
                 <select
                   value={filterCategoria}
                   onChange={(e) => setFilterCategoria(e.target.value)}
                   className="w-full px-4 py-2 bg-transparent border border-white/10 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                 >
                   <option value="">Todas las categorías</option>
                   {categorias.map(cat => (
                     <option key={cat} value={cat}>{cat}</option>
                   ))}
                 </select>
               </div>
 
               <div>
                 <select
                   value={filterNivel}
                   onChange={(e) => setFilterNivel(e.target.value)}
                   className="w-full px-4 py-2 bg-transparent border border-white/10 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                 >
                   <option value="">Todos los niveles</option>
                   {niveles.map(nivel => (
                     <option key={nivel} value={nivel}>{nivel}</option>
                   ))}
                 </select>
               </div>
             </div>
           </div>
 
           <div className="flex items-center justify-between mb-6 p-4 bg-white/5 rounded-2xl border border-white/10">
             <div className="text-sm font-medium text-slate-50">
               {filteredCursos.length} cursos encontrados
             </div>
             <div className="flex items-center gap-2">
               <button
                onClick={() => setShowNew(true)}
                 className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                 <Plus className="w-4 h-4" />
                 Nuevo Curso
               </button>
               <button
                 onClick={() => {
                   console.log("Exportando cursos...");
                 }}
                 className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                 <Download className="w-4 h-4" />
                 Exportar
               </button>
             </div>
           </div>
 
           <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
             {showNew && (
               <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                     <label className="text-xs text-slate-400">Título</label>
                     <input value={newTitulo} onChange={(e) => setNewTitulo(e.target.value)} className="w-full px-3 py-2 bg-transparent border border-white/10 rounded-lg text-slate-100" />
                   </div>
                   <div>
                     <label className="text-xs text-slate-400">Categoría</label>
                     <input value={newCategoria} onChange={(e) => setNewCategoria(e.target.value)} className="w-full px-3 py-2 bg-transparent border border-white/10 rounded-lg text-slate-100" />
                   </div>
                   <div className="md:col-span-2">
                     <label className="text-xs text-slate-400">Descripción</label>
                     <textarea value={newDescripcion} onChange={(e) => setNewDescripcion(e.target.value)} className="w-full px-3 py-2 bg-transparent border border-white/10 rounded-lg text-slate-100" />
                   </div>
                   <div>
                     <label className="text-xs text-slate-400">Duración</label>
                     <input value={newDuracion} onChange={(e) => setNewDuracion(e.target.value)} className="w-full px-3 py-2 bg-transparent border border-white/10 rounded-lg text-slate-100" />
                   </div>
                   <div>
                     <label className="text-xs text-slate-400">Modalidad</label>
                     <select value={newModalidad} onChange={(e) => setNewModalidad(e.target.value as any)} className="w-full px-3 py-2 bg-transparent border border-white/10 rounded-lg text-slate-100">
                       <option value="virtual">Virtual</option>
                       <option value="presencial">Presencial</option>
                       <option value="semipresencial">Semipresencial</option>
                       <option value="a distancia">A distancia</option>
                     </select>
                   </div>
                   <div>
                     <label className="text-xs text-slate-400">Nivel</label>
                     <select value={newNivel} onChange={(e) => setNewNivel(e.target.value as any)} className="w-full px-3 py-2 bg-transparent border border-white/10 rounded-lg text-slate-100">
                       <option value="inicial">Inicial</option>
                       <option value="intermedio">Intermedio</option>
                       <option value="avanzado">Avanzado</option>
                       <option value="especializacion">Especialización</option>
                     </select>
                   </div>
                   <div>
                     <label className="text-xs text-slate-400">Precio (ARS)</label>
                     <input type="number" value={newPrecio} onChange={(e) => setNewPrecio(Number(e.target.value))} className="w-full px-3 py-2 bg-transparent border border-white/10 rounded-lg text-slate-100" />
                   </div>
                   <div>
                     <label className="text-xs text-slate-400">Estado</label>
                     <select value={newEstado} onChange={(e) => setNewEstado(e.target.value as any)} className="w-full px-3 py-2 bg-transparent border border-white/10 rounded-lg text-slate-100">
                       <option value="en_desarrollo">En desarrollo</option>
                       <option value="activo">Activo</option>
                       <option value="inactivo">Inactivo</option>
                       <option value="suspendido">Suspendido</option>
                     </select>
                   </div>
                 </div>
                 <div className="mt-4 flex items-center gap-2">
                   <button onClick={saveNewCourse} disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-50">
                     Guardar curso
                   </button>
                   <button onClick={() => setShowNew(false)} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-100 text-sm">
                     Cancelar
                   </button>
                 </div>
              </div>
            )}
            <table className="w-full">
               <thead className="text-left">
                 <tr>
                   <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Curso</th>
                   <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Descripción</th>
                   <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Duración</th>
                   <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Modalidad</th>
                   <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Precio</th>
                   <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Estado</th>
                   <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Alumnos</th>
                   <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Acciones</th>
                 </tr>
               </thead>
               <tbody className="bg-white/5">
                 {paginatedCursos.length === 0 ? (
                   <tr>
                     <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                       <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
                       <p className="text-sm">No se encontraron cursos con los criterios actuales</p>
                     </td>
                   </tr>
                 ) : (
                   paginatedCursos.map((curso) => (
                     <tr key={curso.id} className="hover:bg-white/10">
                       <td className="px-4 py-3">
                          <Link href={`/admin/detalle-curso?id=${curso.id}`} className="block group" onClick={() => console.log("Navigating to:", curso.id)}>
                          <div className="text-sm font-medium text-slate-50 group-hover:text-blue-400 transition-colors flex items-center gap-2">
                             {curso.titulo}
                             <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="text-xs text-slate-400">ID: {curso.id}</div>
                        </Link>
                      </td>
                       <td className="px-4 py-3">
                         <div className="text-sm text-slate-400 line-clamp-2">{curso.descripcion || "Sin descripción"}</div>
                       </td>
                       <td className="px-4 py-3 text-center">
                         <div className="text-sm text-slate-50">{curso.duracion}</div>
                       </td>
                       <td className="px-4 py-3 text-center">
                         <div className="text-sm text-slate-50 capitalize">{curso.modalidad}</div>
                       </td>
                       <td className="px-4 py-3 text-center">
                         <div className="text-sm font-medium text-emerald-400">${curso.precio.toLocaleString()}</div>
                       </td>
                       <td className="px-4 py-3 text-center">
                         <span className={`px-2 py-1 rounded-full text-xs ${
                           curso.estado === "activo" ? "bg-green-600 text-green-100" :
                           curso.estado === "inactivo" ? "bg-red-600 text-red-100" :
                           curso.estado === "en_desarrollo" ? "bg-yellow-600 text-yellow-100" :
                           "bg-gray-600 text-gray-100"
                         }`}>
                           {curso.estado.replace("_", " ")}
                         </span>
                       </td>
                       <td className="px-4 py-3 text-center">
                         <div className="text-sm text-slate-50 font-medium">
                           {alumnos.filter(al => al.curso_id === curso.id).length}</div>
                       </td>
                       <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/detalle-curso?id=${curso.id}`}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
                          >
                              <Settings className="w-3 h-3" />
                              Gestionar
                          </Link>
                          <button
                           onClick={() => startEdit(curso)}
                           className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                           title="Editar información básica"
                          >
                             <Edit className="w-4 h-4" />
                           </button>
                         <button
                           onClick={() => {
                             if (confirm("¿Está seguro que desea cambiar el estado de este curso?")) {
                               console.log("Cambiar estado:", curso.id);
                             }
                           }}
                           className="p-1.5 text-slate-400 hover:text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-colors"
                           title="Cambiar estado"
                         >
                             <Clock className="w-4 h-4" />
                           </button>
                         <button
                           onClick={() => deleteCourse(curso.id)}
                           className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                           title="Eliminar curso"
                         >
                             <Trash2 className="w-4 h-4" />
                           </button>
                        </div>
                      </td>
                     </tr>
                   ))
                 )}
               </tbody>
             </table>
 
             <div className="mt-10">
               <h2 className="text-lg font-semibold text-slate-50 mb-4">
                 <Users className="w-5 h-5 mr-2 inline text-blue-400" />
                 Solicitudes de ingreso pendientes
                 <button 
                   onClick={forceReload}
                   className="ml-4 text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded text-slate-300"
                 >
                   🔍 Diagnóstico
                 </button>
               </h2>
              {loadError && (
                  <div className="mb-4 p-4 rounded-lg bg-red-900/50 border border-red-500/50 text-red-200 text-sm">
                    {loadError}
                  </div>
               )}
               {debugInfo && (
                  <div className="mb-4 p-4 rounded-lg bg-blue-900/30 border border-blue-500/30 text-blue-200 text-xs font-mono whitespace-pre-wrap">
                    DEBUG INFO (Solo Admin):<br/>
                    - Has Service Key: {debugInfo.hasServiceKey ? "SÍ" : "NO (Crítico)"}<br/>
                    - Intereses Count: {debugInfo.interesesCount}<br/>
                    - Intereses Error: {debugInfo.interesesError || "Ninguno"}<br/>
                    - CursosAlumnos Count: {debugInfo.cursosAlumnosCount}<br/>
                    - CursosAlumnos Error: {debugInfo.cursosAlumnosError || "Ninguno"}<br/>
                    {(!debugInfo.hasServiceKey) && (
                      <span className="text-red-300 font-bold block mt-2">
                        ⚠️ ATENCIÓN: Falta configurar SUPABASE_SERVICE_ROLE_KEY en Vercel.
                        Sin esto, el admin no puede ver las solicitudes de inscripción.
                      </span>
                    )}
                  </div>
               )}
               <div className="rounded-xl border border-white/10 bg-white/5">
                 {pendientes.length === 0 ? (
                   <div className="p-6 text-sm text-slate-400">No hay solicitudes pendientes.</div>
                 ) : (
                   <div className="divide-y divide-white/10">
                     {pendientes.map((p) => (
                       <div key={`${p.user_id}:${p.curso_id}`} className="p-4 flex items-center justify-between">
                         <div className="text-sm text-slate-200">
                           Usuario: <span className="font-mono">{p.user_id}</span> • Curso: <span className="font-mono">{p.curso_id}</span>
                         </div>
                         <div className="flex items-center gap-2">
                           <button onClick={() => approvePending(p.user_id, p.curso_id)} className="px-3 py-1 rounded bg-green-600 hover:bg-green-700 text-white text-xs">
                             Aprobar
                           </button>
                           <button onClick={() => rejectPending(p.user_id, p.curso_id)} className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-xs">
                             Rechazar
                           </button>
                         </div>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
             </div>
 
             {filteredCursos.length > itemsPerPage && (
               <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
                 <div className="text-sm text-slate-400">
                   Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredCursos.length)} de {filteredCursos.length} cursos
                 </div>
                 <div className="flex items-center gap-2">
                   <button
                     onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                     disabled={currentPage === 1}
                     className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-slate-100 text-xs disabled:opacity-50">
                     Anterior
                   </button>
                   <div className="flex items-center gap-1">
                     {[...Array(totalPages)].map((_, idx) => (
                       <button
                         key={idx}
                         onClick={() => setCurrentPage(idx + 1)}
                         className={`px-3 py-1 rounded text-xs ${
                           currentPage === idx + 1
                             ? "bg-blue-600 text-white"
                             : "bg-white/10 text-slate-100 hover:bg-white/20"
                         }`}
                       >
                         {idx + 1}
                       </button>
                     ))}
                   </div>
                   <button
                     onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                     disabled={currentPage === totalPages}
                     className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-slate-100 text-xs disabled:opacity-50">
                     Siguiente
                   </button>
                 </div>
               </div>
             )}
      </div>
    </div>
  );
}
