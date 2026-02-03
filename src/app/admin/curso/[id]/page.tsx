
import { AdminCursoDetailClient } from "./AdminCursoDetailClient";
import { AdminLayout } from "@/components/admin/AdminLayout";

export default async function AdminCursoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AdminLayout>
      <AdminCursoDetailClient id={id} />
    </AdminLayout>
  );
}
