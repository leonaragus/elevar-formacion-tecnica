import MisClasesServerContent from './MisClasesServerContent';
import { dynamic } from './MisClasesServerContent'; // Re-export dynamic

export { dynamic }; // Export dynamic from here

export default async function MisClasesPage({ searchParams }: { searchParams?: { curso_id?: string; clase_id?: string; } }) {
  return <MisClasesServerContent searchParams={searchParams} />;
}
