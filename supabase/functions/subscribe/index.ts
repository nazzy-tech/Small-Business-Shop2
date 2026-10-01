import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const cors = { 'Access-Control-Allow-Origin': Deno.env.get('SITE_URL') || '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json' };
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: cors });

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  try {
    const { email } = await req.json();
    if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return reply({ error: 'Please enter a valid email address.' }, 400);
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { error } = await db.from('newsletter_subscribers').upsert({ email: email.trim().toLowerCase() }, { onConflict: 'email', ignoreDuplicates: true });
    if (error) { console.error('Newsletter subscription failed:', error.message); return reply({ error: 'Could not save your subscription. Please try again.' }, 503); }
    return reply({ success: true });
  } catch { return reply({ error: 'Invalid request.' }, 400); }
});
