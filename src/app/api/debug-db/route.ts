
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();
    
    const results: any = {};
    
    // 1. Check cursos table
    try {
        const { data: cursoSample, error } = await supabase.from('cursos').select('*').limit(1);
        results.cursos = { data: cursoSample, error };
    } catch (e: any) {
        results.cursos = { exception: e.message };
    }
    
    // 2. Introspection via information_schema
            try {
                const { data: columns, error: schemaError } = await supabase
                    .rpc('get_columns_info'); // Try RPC first if exists
                
                if (schemaError) {
                    // Fallback: we cannot query information_schema directly via client usually, 
                    // but we can try if we have enough permissions or use a raw query if enabled (unlikely via js client).
                    // Actually, let's try to infer from error messages on all potential tables.
                    
                    // Extended list of potential tables
                    const potentialTables = [
                        'cursos', 'mensajes', 'pagos', 'compras', 'inscripciones', 
                        'clases_grabadas', 'calendario_entregas', 'push_subscriptions', 
                        'notification_history', 'intereses', 'cursos_alumnos',
                        'evaluaciones', 'certificados', 'modulos', 'lecciones',
                        'entregas', 'asistencias', 'notas'
                    ];

                    const tableAnalysis: any = {};

                    for (const t of potentialTables) {
                        try {
                            // Check existence
                            // Correct syntax for head check
                            const { error: existError } = await supabase.from(t).select('*', { count: 'exact', head: true });
                            if (existError) {
                                tableAnalysis[t] = { exists: false, error: existError.message || JSON.stringify(existError) };
                                continue;
                            }

                            // Check curso_id type
                            const colName = t === 'intereses' ? 'course_id' : (t === 'evaluaciones' ? 'course_id' : 'curso_id');
                            
                            // Try to query with a TEXT id
                            const { error: textError } = await supabase.from(t).select(colName).eq(colName, 'test-text').limit(1);
                            
                            let type = 'Unknown';
                            if (!textError) {
                                type = 'TEXT compatible';
                            } else if (textError.code === '22P02') {
                                type = 'UUID (strict)';
                            } else if (textError.code === '42703') {
                                type = `Column ${colName} not found`;
                            } else {
                                type = `Error: ${textError.message || JSON.stringify(textError)}`;
                            }

                            tableAnalysis[t] = { exists: true, column: colName, type };

                        } catch (e: any) {
                            tableAnalysis[t] = { error: e.message };
                        }
                    }
                    results.schema_analysis = tableAnalysis;
                } else {
                    results.columns = columns;
                }
            } catch (e: any) {
                results.introspection_error = e.message;
            }
  
    return NextResponse.json(results);
  } catch (e: any) {
    return NextResponse.json({ globalError: e.message }, { status: 500 });
  }
}
