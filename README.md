## Supabase + Next.js 14+ (App Router) con `@supabase/ssr`

Este paquete de archivos te deja un cliente de Supabase que funciona en:

- **Server Components** (lectura/escritura de cookies de sesión cuando corresponde)
- **Client Components** (navegador)
- **Middleware** (refresh automático de sesión)

### 1) Dependencias

En tu proyecto Next.js 14+ instala:

```bash
npm i @supabase/supabase-js @supabase/ssr
```

### 2) Variables de entorno

Crea un `.env.local` en la raíz del proyecto (o copia `./.env.local.example`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3) Archivos a copiar a tu proyecto

- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/middleware.ts` (o `middleware.ts` si no usas `src/`)

### 4) Uso

#### Server Component (por ejemplo `src/app/page.tsx`)

```ts
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.from("todos").select("*").limit(10);
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}
```

#### Client Component (por ejemplo `src/app/components/Profile.tsx`)

```ts
"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function Profile() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  return <div>{email ?? "Sin sesión"}</div>;
}
```

