 "use client";
 import { MainLayout } from "@/components/MainLayout";
 import { useEffect, useState } from "react";
 import Link from "next/link";
 
 export default function EvaluacionesAdminClient() {
   const [items, setItems] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const [course, setCourse] = useState("");
 
   useEffect(() => {
     const run = async () => {
       try {
         const qs = course ? `?course=${encodeURIComponent(course)}` : "";
         const res = await fetch(`/api/evaluaciones/listar${qs}`);
         const json = await res.json();
         if (!res.ok) throw new Error(json.error || "Error");
         setItems(json.items || []);
         setError(null);
       } catch (e: any) {
         setError(e.message);
       } finally {
         setLoading(false);
       }
     };
     setLoading(true);
     run();
   }, [course]);
 
   return (
     <MainLayout>
       <div className="p-8">
         <div className="flex items-center justify-between mb-6">
           <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
             Evaluaciones guardadas
           </h1>
          <Link href="/evaluaciones" className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm">
            Crear nueva
          </Link>
         </div>
         <div className="mb-4 flex items-center gap-3">
          <input value={course} onChange={(e) => setCourse(e.target.value)} placeholder="Filtrar por curso" className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white" />
          <Link href="/admin/dashboard" className="px-3 py-2 rounded-lg bg-green-600 text-white text-sm">
            Panel docente
          </Link>
         </div>
         {loading && (
           <div className="text-gray-600 dark:text-gray-400">Cargando...</div>
         )}
         {error && (
           <div className="text-red-600 dark:text-red-400">{error}</div>
         )}
         {!loading && !error && (
           <div className="space-y-3">
             {items.map((it) => (
               <div
                 key={it.id}
                 className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex items-center justify-between"
               >
                 <div>
                   <div className="font-semibold text-gray-900 dark:text-white">
                     {it.title}
                   </div>
                   <div className="text-sm text-gray-600 dark:text-gray-400">
                     {it.course_name || "Sin curso"} •{" "}
                     {new Date(it.created_at).toLocaleString()}
                   </div>
                 </div>
                 <div className="flex items-center gap-3">
                   <Link
                     href={`/evaluaciones/${it.id}`}
                     className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm"
                   >
                     Ver
                   </Link>
                 </div>
               </div>
             ))}
             {items.length === 0 && (
               <div className="text-gray-600 dark:text-gray-400">
                 No hay evaluaciones guardadas
               </div>
             )}
           </div>
         )}
       </div>
     </MainLayout>
   );
 }
