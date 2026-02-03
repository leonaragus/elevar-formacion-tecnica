
import { AdminLayout } from "@/components/admin/AdminLayout";

export default function PruebaPage() {
  return (
    <AdminLayout>
      <div className="p-8 text-white">
        <h1 className="text-2xl font-bold">Página de Prueba Estática</h1>
        <p>Si ves esto, las rutas estáticas en /admin funcionan.</p>
      </div>
    </AdminLayout>
  );
}
