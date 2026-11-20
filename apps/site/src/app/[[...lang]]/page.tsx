import { Landing } from '@/components/landing';
import { langOf } from '@/lib/languages';

export default async function Page({ params }: { params: Promise<{ lang?: string[] }> }) {
  return <Landing lang={langOf((await params).lang) ?? 'ar'} />;
}
