import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const cors = { 'Access-Control-Allow-Origin': Deno.env.get('SITE_URL') || '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json' };
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: cors });
const validCartId = (id: unknown): id is string => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  try {
    const { action, cartId, items } = await req.json();
    if (cartId != null && !validCartId(cartId)) return reply({ error: 'Invalid cart.' }, 400);
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    let userId: string | null = null;
    if (token) {
      const { data, error } = await db.auth.getUser(token);
      if (error) return reply({ error: 'Please sign in again to sync your cart.' }, 401);
      userId = data.user.id;
    }
    if (!userId && !validCartId(cartId)) return reply({ error: 'A cart ID is required for guest carts.' }, 400);

    const readItems = async (saved: any[]) => {
      if (!saved.length) return [];
      const ids = saved.map(item => item.id).filter((id: unknown) => typeof id === 'string');
      const { data: products, error } = await db.from('products').select('id,name,category,price_ngn,image_url').eq('active', true).in('id', ids);
      if (error) throw error;
      const valid = new Map((products || []).map((product: any) => [product.id, product]));
      return saved.flatMap((item: any) => {
        const product: any = valid.get(item.id);
        return product && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 50 ? [{ id: product.id, name: product.name, type: product.category, price: product.price_ngn, image: product.image_url.split('/').pop(), qty: item.quantity }] : [];
      });
    };

    if (action === 'load') {
      let data: any = null;
      if (userId) {
        const result = await db.from('cart_snapshots').select('id,items').eq('user_id', userId).maybeSingle();
        if (result.error) throw result.error;
        data = result.data;
        // Claim this browser's existing guest cart the first time the customer signs in.
        if (!data && validCartId(cartId)) {
          const guest = await db.from('cart_snapshots').select('items').eq('id', cartId).is('user_id', null).maybeSingle();
          if (guest.error) throw guest.error;
          const claimed = await db.from('cart_snapshots').upsert({ id: crypto.randomUUID(), user_id: userId, items: guest.data?.items || [], updated_at: new Date().toISOString() }, { onConflict: 'user_id', ignoreDuplicates: true }).select('id,items').maybeSingle();
          if (claimed.error) throw claimed.error;
          if (guest.data) {
            const { error: deleteError } = await db.from('cart_snapshots').delete().eq('id', cartId).is('user_id', null);
            if (deleteError) throw deleteError;
          }
          if (claimed.data) data = claimed.data;
          else {
            const canonical = await db.from('cart_snapshots').select('id,items').eq('user_id', userId).single();
            if (canonical.error) throw canonical.error;
            data = canonical.data;
          }
        }
      } else {
        const result = await db.from('cart_snapshots').select('items').eq('id', cartId).is('user_id', null).maybeSingle();
        if (result.error) throw result.error;
        data = result.data;
      }
      return reply({ items: await readItems(Array.isArray(data?.items) ? data.items : []) });
    }
    if (action === 'clear') {
      if (userId) {
        const { error } = await db.from('cart_snapshots').upsert({ id: crypto.randomUUID(), user_id: userId, items: [], updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
        if (error) throw error;
      }
      if (validCartId(cartId)) {
        const { error } = await db.from('cart_snapshots').delete().eq('id', cartId).is('user_id', null);
        if (error) throw error;
      }
      return reply({ success: true });
    }
    if (action !== 'save' || !Array.isArray(items) || items.length > 50) return reply({ error: 'Invalid cart.' }, 400);
    const validItems = items.filter((item: any) => item && typeof item.id === 'string' && /^\d{2}$/.test(item.id) && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 50).map((item: any) => ({ id: item.id, quantity: item.quantity }));
    if (validItems.length !== items.length) return reply({ error: 'Invalid cart items.' }, 400);
    if (!validItems.length) {
      const result = userId
        ? await db.from('cart_snapshots').upsert({ id: crypto.randomUUID(), user_id: userId, items: [], updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
        : await db.from('cart_snapshots').delete().eq('id', cartId);
      const { error } = result;
      if (error) throw error;
      return reply({ success: true });
    }
    const row = userId
      ? { id: crypto.randomUUID(), user_id: userId, items: validItems, updated_at: new Date().toISOString() }
      : { id: cartId, items: validItems, updated_at: new Date().toISOString() };
    const { error } = await db.from('cart_snapshots').upsert(row, { onConflict: userId ? 'user_id' : 'id' });
    if (error) throw error;
    return reply({ success: true });
  } catch (error) { console.error('Cart operation failed:', error); return reply({ error: 'Could not update your cart. Please try again.' }, 503); }
});
