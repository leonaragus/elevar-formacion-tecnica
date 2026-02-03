
import { AdminCursoDetailClient } from "./AdminCursoDetailClient";
import { AdminLayout } from "@/components/admin/AdminLayout";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type Params = Promise<{ id: string }>;

export default async function AdminCursoDetailPage(props: { params: Params }) {
  const params = await props.params;
  const id = params.id;
  
  return (
    <AdminLayout>
      <AdminCursoDetailClient id={id} />
    </AdminLayout>
  );
}
