
import { AdminCursoDetailClient } from "./AdminCursoDetailClient";
import { AdminLayout } from "@/components/admin/AdminLayout";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function AdminCursoDetailPage(props: { searchParams: SearchParams }) {
  const searchParams = props.searchParams;
  const id = searchParams.id as string;
  
  if (!id) {
    return (
      <AdminLayout>
        <div className="p-8 text-red-400">Error: ID de curso no especificado</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <AdminCursoDetailClient id={id} />
    </AdminLayout>
  );
}
