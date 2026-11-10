import { redirect } from 'next/navigation';

/** « Mes chantiers » is the home page now: old links land there. */
export default function Page() {
  redirect('/');
}
