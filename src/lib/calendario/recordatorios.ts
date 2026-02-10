// Servicio de notificaciones automáticas para calendario de entregas
import { createClient } from '@supabase/supabase-js';
import { sendPushNotification } from '@/lib/push-notifications/service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Recordatorio {
  id: string;
  entrega_id: string;
  tipo_recordatorio: string;
  fecha_envio: string;
  enviado: boolean;
}

interface Entrega {
  id: string;
  curso_id: string;
  titulo: string;
  descripcion: string;
  fecha_entrega: string;
  tipo_entrega: string;
}

export async function enviarRecordatoriosCalendario() {
  try {
    console.log('Iniciando envío de recordatorios de calendario...');

    // Obtener recordatorios pendientes de enviar
    const { data: recordatorios, error: recordatoriosError } = await supabase
      .from('recordatorios_entregas')
      .select('*')
      .eq('enviado', false)
      .lte('fecha_envio', new Date().toISOString());

    if (recordatoriosError) {
      console.error('Error obteniendo recordatorios:', recordatoriosError);
      return { error: 'Error obteniendo recordatorios' };
    }

    if (!recordatorios || recordatorios.length === 0) {
      console.log('No hay recordatorios pendientes');
      return { message: 'No hay recordatorios pendientes' };
    }

    console.log(`Se encontraron ${recordatorios.length} recordatorios pendientes`);

    for (const recordatorio of recordatorios) {
      await procesarRecordatorio(recordatorio);
    }

    return { 
      success: true, 
      recordatorios_enviados: recordatorios.length 
    };
  } catch (error) {
    console.error('Error en enviarRecordatoriosCalendario:', error);
    return { error: 'Error procesando recordatorios' };
  }
}

async function procesarRecordatorio(recordatorio: Recordatorio) {
  try {
    // Obtener la información de la entrega
    const { data: entrega, error: entregaError } = await supabase
      .from('calendario_entregas')
      .select('*')
      .eq('id', recordatorio.entrega_id)
      .eq('activo', true)
      .single();

    if (entregaError || !entrega) {
      console.log(`Entrega ${recordatorio.entrega_id} no encontrada o inactiva`);
      // Marcar el recordatorio como enviado para no volver a procesarlo
      await marcarRecordatorioEnviado(recordatorio.id);
      return;
    }

    // Obtener los alumnos del curso
    const { data: alumnos, error: alumnosError } = await supabase
      .from('inscripciones_cursos')
      .select('alumno_id')
      .eq('curso_id', entrega.curso_id)
      .eq('estado', 'aprobado');

    if (alumnosError) {
      console.error('Error obteniendo alumnos:', alumnosError);
      return;
    }

    if (!alumnos || alumnos.length === 0) {
      console.log(`No hay alumnos en el curso ${entrega.curso_id}`);
      await marcarRecordatorioEnviado(recordatorio.id);
      return;
    }

    // Enviar notificaciones a cada alumno
    let notificacionesEnviadas = 0;
    
    for (const alumno of alumnos) {
      const enviada = await enviarNotificacionAlumno(alumno.alumno_id, entrega, recordatorio);
      if (enviada) notificacionesEnviadas++;
    }

    console.log(`Se enviaron ${notificacionesEnviadas} notificaciones para la entrega ${entrega.id}`);

    // Marcar el recordatorio como enviado
    await marcarRecordatorioEnviado(recordatorio.id);

  } catch (error) {
    console.error(`Error procesando recordatorio ${recordatorio.id}:`, error);
  }
}

async function enviarNotificacionAlumno(alumnoId: string, entrega: Entrega, recordatorio: Recordatorio) {
  try {
    // Verificar que el alumno no haya entregado ya
    const { data: entregaAlumno, error: entregaAlumnoError } = await supabase
      .from('entregas_alumnos')
      .select('estado')
      .eq('entrega_id', entrega.id)
      .eq('alumno_id', alumnoId)
      .single();

    if (entregaAlumnoError && entregaAlumnoError.code !== 'PGRST116') {
      console.error('Error verificando entrega del alumno:', entregaAlumnoError);
      return false;
    }

    // Si ya entregó, no enviar notificación
    if (entregaAlumno && entregaAlumno.estado === 'entregado') {
      return false;
    }

    // Obtener el perfil del alumno para el email
    const { data: perfil, error: perfilError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', alumnoId)
      .single();

    if (perfilError || !perfil) {
      console.error('Error obteniendo perfil del alumno:', perfilError);
      return false;
    }

    // Preparar el mensaje según el tipo de recordatorio
    const diasRestantes = Math.ceil(
      (new Date(entrega.fecha_entrega).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    let titulo = '';
    let mensaje = '';

    switch (recordatorio.tipo_recordatorio) {
      case '7_dias':
        titulo = `📅 Recordatorio: ${entrega.titulo}`;
        mensaje = `Faltan 7 días para la entrega de "${entrega.titulo}". No olvides preparar tu trabajo.`;
        break;
      
      case '3_dias':
        titulo = `⚠️ Próxima entrega: ${entrega.titulo}`;
        mensaje = `Solo quedan 3 días para entregar "${entrega.titulo}". ¡Es momento de finalizar!`;
        break;
      
      case '1_dia':
        titulo = `🚨 Último día: ${entrega.titulo}`;
        mensaje = `Mañana vence la entrega de "${entrega.titulo}". ¡No te olvides!`;
        break;
      
      default:
        titulo = `📅 Entrega: ${entrega.titulo}`;
        mensaje = `Recuerda que tienes una entrega pendiente: "${entrega.titulo}"`;
    }

    // Enviar notificación push
    const resultado = await sendPushNotification({
      userEmail: perfil.email,
      cursoId: entrega.curso_id,
      title: titulo,
      body: mensaje,
      data: {
        type: 'calendario_entrega',
        entrega_id: entrega.id,
        curso_id: entrega.curso_id,
        fecha_entrega: entrega.fecha_entrega,
        dias_restantes: diasRestantes.toString()
      }
    });

    if (resultado.success) {
      console.log(`Notificación enviada a ${perfil.email} para entrega ${entrega.id}`);
      
      // Registrar en el historial
      await supabase.from('notification_history').insert([{
        curso_id: entrega.curso_id,
        user_id: alumnoId,
        user_email: perfil.email,
        title: titulo,
        body: mensaje,
        data: {
          type: 'calendario_entrega',
          entrega_id: entrega.id,
          recordatorio_tipo: recordatorio.tipo_recordatorio
        }
      }]);
      
      return true;
    } else {
      console.error('Error enviando notificación push:', resultado.error);
      return false;
    }

  } catch (error) {
    console.error(`Error enviando notificación a alumno ${alumnoId}:`, error);
    return false;
  }
}

async function marcarRecordatorioEnviado(recordatorioId: string) {
  try {
    const { error } = await supabase
      .from('recordatorios_entregas')
      .update({ 
        enviado: true,
        fecha_envio: new Date().toISOString()
      })
      .eq('id', recordatorioId);

    if (error) {
      console.error('Error marcando recordatorio como enviado:', error);
    }
  } catch (error) {
    console.error('Error en marcarRecordatorioEnviado:', error);
  }
}