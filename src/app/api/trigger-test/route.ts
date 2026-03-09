
import { NextRequest, NextResponse } from "next/server";

// Este es un disparador de pruebas temporal. Su única función es llamar al
// arnés de pruebas principal usando la URL correcta de la aplicación.

export async function GET(req: NextRequest) {
    try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL;
        if (!appUrl) {
            throw new Error("NEXT_PUBLIC_APP_URL no está definida.");
        }

        const testName = 'approve_inscription'; // La prueba que queremos ejecutar

        // Llamada interna desde el servidor al arnés de pruebas
        const response = await fetch(`${appUrl}/api/admin/run-tests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ test: testName }),
        });

        // Devolvemos el resultado exacto de la prueba
        const result = await response.json();
        const status = response.ok ? 200 : 500;

        return NextResponse.json(result, { status });

    } catch (e: any) {
        return NextResponse.json({ error: 'Error en el disparador de pruebas.', details: e.message }, { status: 500 });
    }
}

