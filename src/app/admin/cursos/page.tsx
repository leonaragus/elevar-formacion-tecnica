import AdminCursosClient from "./AdminCursosClient";

export const dynamic = "force-dynamic";

export default async function AdminCursosPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="bg-indigo-600 text-white text-xs py-1 px-4 text-center font-mono">
        Admin Build: {new Date().toLocaleString("es-AR")}
      </div>
      <AdminCursosClient />
    </div>
  );
}

