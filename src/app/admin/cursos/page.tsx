import AdminCursosClient from "./AdminCursosClient";
import { AdminLayout } from "@/components/admin/AdminLayout";

export const dynamic = "force-dynamic";

export default async function AdminCursosPage() {
  return (
    <AdminLayout>
      <AdminCursosClient />
    </AdminLayout>
  );
}

