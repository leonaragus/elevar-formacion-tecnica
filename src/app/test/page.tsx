import { createSupabaseServerClient } from "../../lib/supabase/server";

export default async function TestPage() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.from("cursos").select("*").limit(20);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>Test Supabase</h1>
      <p>
        Probando conexión con la tabla <code>cursos</code>
      </p>

      {error ? (
        <>
          <h2>Error</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {JSON.stringify(
              { message: error.message, details: error.details, hint: error.hint, code: error.code },
              null,
              2,
            )}
          </pre>
        </>
      ) : (
        <>
          <h2>Resultado</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(data, null, 2)}</pre>
        </>
      )}
    </main>
  );
}

