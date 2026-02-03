
import { AdminCursoDetailClient } from "./AdminCursoDetailClient";
import { AdminLayout } from "@/components/admin/AdminLayout";

export default function AdminCursoDetailPage({ params }: { params: { id: string } }) {
  return (
    <AdminLayout>
      <AdminCursoDetailClient id={params.id} />
    </AdminLayout>
  );
}
