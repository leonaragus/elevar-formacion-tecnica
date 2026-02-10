import { Suspense } from "react";
import { MainLayout } from "@/components/MainLayout";
import CompletarDatosClient from "./CompletarDatosClient";

export default function CompletarDatosPage() {
  return (
    <MainLayout>
      <Suspense fallback={<div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
        <CompletarDatosClient />
      </Suspense>
    </MainLayout>
  );
}
