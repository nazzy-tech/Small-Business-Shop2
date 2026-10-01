import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const cors = { 'Access-Control-Allow-Origin': Deno.env.get('SITE_URL') || '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json' };
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: cors });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  const url = Deno.env.get('SUPABASE_URL'), key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return reply({ error: 'Store is not configured yet.' }, 503);
  let input: any;
  try { input = await req.json(); } catch { return reply({ error: 'Invalid request.' }, 400); }
  const c = input?.customer;
  if (!c || !['name','email','phone','address','city'].every(k => typeof c[k] === 'string' && c[k].trim()) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email.trim())) return reply({ error: 'Please enter your name, a valid email, phone, delivery address and city.' }, 400);
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 50) return reply({ error: 'Your bag is empty or contains too many items.' }, 400);
  const quantities = new Map<string, number>();
  for (const item of input.items) {
    if (!item || typeof item.id !== 'string' || !/^\d{2}$/.test(item.id) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50) return reply({ error: 'One of the quantities is invalid.' }, 400);
    quantities.set(item.id, (quantities.get(item.id) || 0) + item.quantity);
  }
  if ([...quantities.values()].some(q => q > 50)) return reply({ error: 'There are too many of one product.' }, 400);
  const db = createClient(url, key);
  const { data: products, error: productError } = await db.from('products').select('id,name,price_ngn').in('id', [...quantities.keys()]).eq('active', true);
  if (productError) return reply({ error: 'Could not check the catalogue. Please try again.' }, 503);
  if (!products || products.length !== quantities.size) return reply({ error: 'One of these products is no longer available. Refresh your bag and try again.' }, 400);
  const rows = products.map(p => ({ product_id: p.id, product_name: p.name, quantity: quantities.get(p.id)!, unit_price_ngn: p.price_ngn }));
  const subtotal = rows.reduce((sum, row) => sum + row.unit_price_ngn * row.quantity, 0);
  const delivery = subtotal >= 50000 ? 0 : 2000;
  let userId: string | null = null;
  const bearer = req.headers.get('Authorization');
  if (bearer) {
    const token = bearer.replace(/^Bearer\s+/i, '');
    const { data: { user } } = await db.auth.getUser(token);
    if (user) userId = user.id;
  }
  const { data: order, error: orderError } = await db.from('orders').insert({ user_id: userId, customer_name: c.name.trim().slice(0,160), customer_email: c.email.trim().toLowerCase().slice(0,254), phone: c.phone.trim().slice(0,40), address: c.address.trim().slice(0,500), city: c.city.trim().slice(0,120), note: typeof c.note === 'string' ? c.note.trim().slice(0,1000) : '', subtotal_ngn: subtotal, delivery_ngn: delivery, total_ngn: subtotal + delivery }).select('id,created_at').single();
  if (orderError || !order) { console.error('Order creation failed:', orderError?.message); return reply({ error: 'We could not save your order. Please try again.' }, 503); }
  const { error: itemError } = await db.from('order_items').insert(rows.map(row => ({ ...row, order_id: order.id })));
  if (itemError) { await db.from('orders').delete().eq('id', order.id); console.error('Order items insert failed:', itemError.message); return reply({ error: 'We could not save your order. Please try again.' }, 503); }
  let emailSent = false;
  const domain = Deno.env.get('MAILGUN_DOMAIN'), mailKey = Deno.env.get('MAILGUN_API_KEY'), from = Deno.env.get('MAILGUN_FROM_EMAIL');
  if (domain && mailKey && from) {
    const format = (n: number) => `₦${n.toLocaleString('en-NG')}`;
    const list = rows.map(row => `<li>${row.product_name} × ${row.quantity} — ${format(row.quantity * row.unit_price_ngn)}</li>`).join('');
    const safe = (s: string) => s.replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]!));
    const form = new URLSearchParams({ from, to: c.email.trim(), subject: `Your Zam's Beauty order is in ✨`, text: `Hi ${c.name.trim()},\n\nThank you for choosing Zam's Beauty! We have received your order ${order.id}.\n\n${rows.map(row => `${row.product_name} × ${row.quantity} — ${format(row.quantity * row.unit_price_ngn)}`).join('\n')}\n\nSubtotal: ${format(subtotal)}\nDelivery: ${delivery ? format(delivery) : 'On us'}\nTotal: ${format(subtotal + delivery)}\n\nWe will be in touch shortly about delivery and payment.\n\nWith love,\nZam's Beauty`, html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#302f28"><h1 style="font-family:Georgia,serif;font-weight:normal">Good things are on their way.</h1><p>Hi ${safe(c.name.trim())}, thank you for choosing Zam's Beauty. We have received your order.</p><p style="color:#888;font-size:12px">ORDER ${safe(order.id)}</p><ul style="line-height:2">${rows.map(row => `<li>${safe(row.product_name)} × ${row.quantity} — ${format(row.quantity * row.unit_price_ngn)}</li>`).join('')}</ul><p>Subtotal: ${format(subtotal)}<br>Delivery: ${delivery ? format(delivery) : 'On us'}<br><strong>Total: ${format(subtotal + delivery)}</strong></p><p>We will be in touch shortly about delivery and payment.</p><p>With love,<br>Zam's Beauty</p></div>` });
    try { const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, { method:'POST', headers:{ Authorization:`Basic ${btoa(`api:${mailKey}`)}, 'Content-Type':'application/x-www-form-urlencoded' }, body:form }); emailSent = response.ok; if (!response.ok) console.error('Mailgun delivery failed:', response.status, await response.text()); } catch (err) { console.error('Mailgun request failed:', err); }
  }
  await db.from('orders').update({ email_status: emailSent ? 'sent' : 'failed' }).eq('id', order.id);
  return reply({ id: order.id, emailSent });
});
