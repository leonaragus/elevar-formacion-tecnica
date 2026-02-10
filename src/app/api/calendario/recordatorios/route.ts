import { enviarRecordatoriosCalendario } from '@/lib/calendario/recordatorios';
import { NextResponse } from 'next/server';

// POST /api/calendario/recordatorios - Ejecutar envío de recordatorios
export async function POST(request: Request) {
  try {
    // Verificar autorización con API key o similar
    const authHeader = request.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '');
    
    if (apiKey !== process.env.CRON_API_KEY) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const resultado = await enviarRecordatoriosCalendario();
    
    if (resultado.error) {
      return NextResponse.json({ error: resultado.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: resultado.message || 'Recordatorios procesados exitosamente',
      recordatorios_enviados: resultado.recordatorios_enviados || 0
    });

  } catch (error) {
    console.error('Error en endpoint de recordatorios:', error);
    return NextResponse.json(
      { error: 'Error procesando recordatorios' },
      { status: 500 }
    );
  }
}