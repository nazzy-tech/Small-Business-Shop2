import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const cors = { 'Access-Control-Allow-Origin': Deno.env.get('SITE_URL') || '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json' };
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: cors });

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  try {
    const { action, cartId, items } = await req.json();
    if (typeof cartId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cartId)) return reply({ error: 'Invalid cart.' }, 400);
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    if (action === 'load') {
      const { data, error } = await db.from('cart_snapshots').select('items').eq('id', cartId).maybeSingle();
      if (error) throw error;
      const saved = Array.isArray(data?.items) ? data.items : [];
      if (!saved.length) return reply({ items: [] });
      const ids = saved.map((item: any) => item.id).filter((id: unknown) => typeof id === 'string');
      const { data: products } = await db.from('products').select('id,name,category,price_ngn,image_url').eq('active', true).in('id', ids);
      const valid = new Map((products || []).map((product: any) => [product.id, product]));
      const hydrated = saved.flatMap((item: any) => {
        const product: any = valid.get(item.id);
        return product && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 50 ? [{ id: product.id, name: product.name, type: product.category, price: product.price_ngn, image: product.image_url.split('/').pop(), qty: item.quantity }] : [];
      });
      return reply({ items: hydrated });
    }
    if (action === 'clear') {
      const { error } = await db.from('cart_snapshots').delete().eq('id', cartId);
      if (error) throw error;
      return reply({ success: true });
    }
    if (action !== 'save' || !Array.isArray(items) || items.length > 50) return reply({ error: 'Invalid cart.' }, 400);
    const validItems = items.filter((item: any) => item && typeof item.id === 'string' && /^\d{2}$/.test(item.id) && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 50).map((item: any) => ({ id: item.id, quantity: item.quantity }));
    if (validItems.length !== items.length) return reply({ error: 'Invalid cart items.' }, 400);
    if (!validItems.length) { const { error } = await db.from('cart_snapshots').delete().eq('id', cartId); if (error) throw error; return reply({ success: true }); }
    const { error } = await db.from('cart_snapshots').upsert({ id: cartId, items: validItems, updated_at: new Date().toISOString() });
    if (error) throw error;
    return reply({ success: true });
  } catch (error) { console.error('Cart operation failed:', error); return reply({ error: 'Could not update your bag. Please try again.' }, 503); }
});
