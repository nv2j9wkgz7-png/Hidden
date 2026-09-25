import { configured } from '@/lib/env';
import { supabase } from '@/lib/supabase/server';
import { CreatorHome } from '@/components/creator-home';

export default async function Home() {
  let signedIn = false;
  if (configured()) {
    const {
      data: { user },
    } = await (await supabase()).auth.getUser();
    signedIn = Boolean(user);
  }
  return <CreatorHome signedIn={signedIn} />;
}
