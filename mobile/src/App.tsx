import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

type Product = { id: string; name: string; category: string; description: string; price_ngn: number; image_url: string };
type CartItem = Product & { quantity: number };
type Tab = 'shop' | 'cart' | 'account';
const C = { ink: '#33231f', rose: '#c96f72', roseDark: '#a85056', cream: '#fff8f3', blush: '#f5e6de', muted: '#887a74', line: '#eddfd8', white: '#fff', green: '#476752' };
const money = (n: number) => `₦${n.toLocaleString('en-NG')}`;
const imageUri = (source: string) => `${source}${source.includes('?') ? '&' : '?'}auto=format&fit=crop&w=700&q=82`;
const makeUuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.floor(Math.random() * 16); return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16); });
const fallbackProducts: Product[] = [
  ['01','Cloud Skin Tint','Face',14500,'photo-1611930022073-b7a4ba5fcccd'],['02','Soft Focus Lip Oil','Lips',9800,'photo-1586495777744-4413f21062fa'],['03','Featherlight Brow Gel','Eyes',12500,'photo-1512496015851-a90fb38ba796'],['04','Daylight Cream Blush','Cheeks',11000,'photo-1522335789203-aabd1fc54bc9'],['05','Soft Focus Makeup Primer','Face',18500,'photo-1556229010-6c3f2c9ca5f8'],['06','The Good Brow Pencil','Eyes',8500,'photo-1512496015851-a90fb38ba796'],['07','Velvet Matte Lipstick','Lips',12500,'photo-1586495777744-4413f21062fa'],['08','Everyday Liquid Foundation','Face',16800,'photo-1608248543803-ba4f8c70ae0b'],['09','Sheer Tint Lip Balm','Lips',15500,'photo-1586495777744-4413f21062fa'],['10','Golden Hour Bronzer','Cheeks',13200,'photo-1596462502278-27bfdc403348'],['11','Soft Set Pressed Powder','Face',11800,'photo-1631214524020-7e18db9a8f92'],['12','Lash Day Mascara','Eyes',10500,'photo-1512496015851-a90fb38ba796'],['13','Evening Edit Eyeshadow','Eyes',17900,'photo-1522335789203-aabd1fc54bc9'],['14','Rose Glow Highlighter','Cheeks',12700,'photo-1596704017254-9b121068fb31'],['15','Barely There Concealer','Face',13900,'photo-1601049541289-9b1b7bbbfe19'],['16','Precision Liquid Eyeliner','Eyes',14800,'photo-1512496015851-a90fb38ba796'],['17','Petal Soft Lip Liner','Lips',7200,'photo-1586495777744-4413f21062fa'],['18','The Everyday Glow Set','Sets',32000,'photo-1608248543803-ba4f8c70ae0b'],
].map(([id,name,category,price,image]) => ({ id: String(id), name: String(name), category: String(category), description: '', price_ngn: Number(price), image_url: `https://images.unsplash.com/${image}` }));

export default function App() {
  const [tab, setTab] = useState<Tab>('shop');
  const [products, setProducts] = useState<Product[]>(fallbackProducts);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartId, setCartId] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [checkout, setCheckout] = useState(false);
  const [message, setMessage] = useState('');
  const cartRef = useRef<CartItem[]>([]);
  const signature = useRef('');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '', address: '', city: '', note: '' });

  const setCartSafe = useCallback((next: CartItem[]) => { cartRef.current = next; setCart(next); }, []);
  const loadCart = useCallback(async (id: string) => {
    if (!supabase) return [] as CartItem[];
    const { data, error } = await supabase.functions.invoke('cart', { body: { action: 'load', cartId: id } });
    if (error) throw error;
    const items = Array.isArray(data?.items) ? data.items as CartItem[] : [];
    signature.current = JSON.stringify(items.map(i => ({ id: i.id, quantity: i.quantity })));
    setCartSafe(items);
    return items;
  }, [setCartSafe]);

  useEffect(() => {
    let alive = true;
    (async () => {
      let id = await AsyncStorage.getItem('zams-cart-id');
      if (!id) { id = makeUuid(); await AsyncStorage.setItem('zams-cart-id', id); }
      if (!alive) return;
      setCartId(id);
      const cached = await AsyncStorage.getItem('zams-cart');
      if (alive && cached) { try { setCartSafe(JSON.parse(cached) as CartItem[]); } catch { await AsyncStorage.removeItem('zams-cart'); } }
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (alive) { setUser(data.session?.user || null); setCustomer(v => ({ ...v, name: data.session?.user?.user_metadata?.full_name || '', email: data.session?.user?.email || '' })); }
        const { data: rows } = await supabase.from('products').select('id,name,category,description,price_ngn,image_url').eq('active', true).order('id');
        if (alive && rows?.length) setProducts(rows as Product[]);
      }
      if (alive && !supabase) setReady(true);
    })();
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setReady(false);
        setUser(session?.user || null);
        setCustomer(v => ({ ...v, name: session?.user?.user_metadata?.full_name || v.name, email: session?.user?.email || v.email }));
      });
      return () => { alive = false; subscription.unsubscribe(); };
    }
    return () => { alive = false; };
  }, [setCartSafe]);

  useEffect(() => {
    if (!cartId) return;
    if (!supabase) { setReady(true); return; }
    let alive = true;
    setReady(false);
    loadCart(cartId).catch(error => console.warn('Cart unavailable:', error)).finally(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, [cartId, loadCart, user?.id]);

  useEffect(() => {
    void AsyncStorage.setItem('zams-cart', JSON.stringify(cart));
    const client = supabase;
    if (!client || !cartId || !ready) return;
    const snapshot = JSON.stringify(cart.map(i => ({ id: i.id, quantity: i.quantity })));
    if (snapshot === signature.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const { error } = await client.functions.invoke('cart', { body: { action: 'save', cartId, items: JSON.parse(snapshot) } });
      if (error) console.warn('Cart sync unavailable:', error.message); else signature.current = snapshot;
    }, 180);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [cart, cartId, ready, user?.id]);

  useEffect(() => {
    const client = supabase;
    if (!client || !cartId) return;
    let channel: ReturnType<typeof client.channel> | null = null;
    if (user?.id) {
      channel = client.channel(`mobile-cart-${user.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'cart_snapshots', filter: `user_id=eq.${user.id}` }, async () => {
        try { await loadCart(cartId); } catch (error) { console.warn('Could not refresh shared cart:', error); }
      }).subscribe();
    }
    return () => { if (channel) client.removeChannel(channel); };
  }, [cartId, loadCart, user?.id]);

  const categories = useMemo(() => ['All', ...Array.from(new Set(products.map(p => p.category)))], [products]);
  const visible = products.filter(p => (category === 'All' || p.category === category) && `${p.name} ${p.category}`.toLowerCase().includes(query.toLowerCase()));
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price_ngn * item.quantity, 0);

  const updateItem = (product: Product, delta: number) => {
    const current = cartRef.current;
    const existing = current.find(i => i.id === product.id);
    if (!existing) { if (delta > 0) setCartSafe([...current, { ...product, quantity: Math.min(50, delta) }]); return; }
    const quantity = Math.max(0, Math.min(50, existing.quantity + delta));
    setCartSafe(current.map(i => i.id === product.id ? { ...i, quantity } : i).filter(i => i.quantity > 0));
  };

  const signIn = async () => {
    if (!supabase) { Alert.alert('Connect the shop', 'Add the Supabase URL and publishable key to mobile/.env first.'); return; }
    try {
      setBusy(true);
      const redirectTo = AuthSession.makeRedirectUri({ scheme: 'zamsbeauty', path: 'auth/callback' });
      const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: true } });
      if (error) throw error;
      if (!data.url) throw new Error('Google sign-in could not be started.');
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== 'success') return;
      const returned = new URL(result.url);
      const code = returned.searchParams.get('code');
      if (code) {
        const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
        if (sessionError) throw sessionError;
      } else {
        const tokens = new URLSearchParams(returned.hash.replace(/^#/, ''));
        const access_token = tokens.get('access_token');
        const refresh_token = tokens.get('refresh_token');
        if (!access_token || !refresh_token) throw new Error('Google did not return a login session.');
        const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
        if (sessionError) throw sessionError;
      }
    } catch (error) { Alert.alert('Could not sign in', error instanceof Error ? error.message : 'Please try again.'); }
    finally { setBusy(false); }
  };

  const placeOrder = async () => {
    if (!supabase) { Alert.alert('Checkout unavailable', 'Add Supabase settings to mobile/.env.'); return; }
    if (!customer.name || !customer.email || !customer.phone || !customer.address || !customer.city) { Alert.alert('A few more details', 'Please complete your name, email, phone, address and city.'); return; }
    if (!cart.length) return;
    setBusy(true);
    const payload = { customer, items: cart.map(i => ({ id: i.id, quantity: i.quantity })) };
    const { data, error } = await supabase.functions.invoke('create-order', { body: payload });
    setBusy(false);
    if (error || data?.error) { Alert.alert('Order not placed', data?.error || error?.message || 'Please try again.'); return; }
    await supabase.functions.invoke('cart', { body: { action: 'clear', cartId } });
    signature.current = '[]';
    setCartSafe([]);
    setCheckout(false); setTab('shop');
    Alert.alert('Order received', data?.emailSent ? `Confirmation sent to ${customer.email}.` : `Your order ${data?.id || ''} is saved. Please keep this reference.`);
  };

  if (!ready) return <SafeAreaView style={styles.loading}><StatusBar barStyle="dark-content"/><ActivityIndicator color={C.rose}/><Text style={styles.muted}>Opening your beauty cabinet…</Text></SafeAreaView>;

  return <SafeAreaView style={styles.safe}><StatusBar barStyle="dark-content" backgroundColor={C.cream}/>
    <View style={styles.topbar}><Text style={styles.brand}>zam's <Text style={styles.brandAccent}>beauty</Text></Text><Pressable onPress={() => setTab('cart')} style={styles.cartPill}><Text style={styles.cartPillText}>Cart · {count}</Text></Pressable></View>
    {tab === 'shop' && <FlatList data={visible} keyExtractor={p => p.id} numColumns={2} contentContainerStyle={styles.list} columnWrapperStyle={styles.row} ListHeaderComponent={<>
      <View style={styles.hero}><Text style={styles.eyebrow}>YOUR EVERYDAY MAKEUP EDIT</Text><Text style={styles.heroTitle}>Beauty that feels{ '\n' }like <Text style={styles.italic}>you.</Text></Text><Text style={styles.heroText}>Really good makeup. Nothing complicated. A little brighter, every day.</Text><View style={styles.heroTag}><Text style={styles.heroTagText}>FREE DELIVERY OVER ₦50,000</Text></View></View>
      <View style={styles.headingRow}><View><Text style={styles.eyebrow}>THE GOOD STUFF</Text><Text style={styles.heading}>Find your <Text style={styles.italic}>favourite.</Text></Text></View><Text style={styles.itemCount}>{products.length} lovely things</Text></View>
      <TextInput value={query} onChangeText={setQuery} placeholder="Search makeup" placeholderTextColor="#a99b95" style={styles.search}/>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{categories.map(c => <Pressable key={c} onPress={() => setCategory(c)} style={[styles.chip, category === c && styles.chipActive]}><Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text></Pressable>)}</ScrollView>
      {products.length === 0 && <View style={styles.emptyCatalog}><Text style={styles.emptyTitle}>Your edit is getting ready.</Text><Text style={styles.muted}>The product catalogue will appear here when Supabase is configured.</Text></View>}
    </>} renderItem={({ item }) => <View style={styles.card}><View style={styles.imageWrap}><Image source={{ uri: imageUri(item.image_url) }} style={styles.productImage}/><View style={styles.typeTag}><Text style={styles.typeTagText}>{item.category}</Text></View></View><View style={styles.cardBody}><Text style={styles.productName} numberOfLines={2}>{item.name}</Text><Text style={styles.price}>{money(item.price_ngn)}</Text><Pressable onPress={() => updateItem(item, 1)} style={styles.addButton}><Text style={styles.addButtonText}>Add to cart  +</Text></Pressable></View></View>} ListFooterComponent={<View style={styles.footer}><Text style={styles.footerBrand}>ZAM'S BEAUTY</Text><Text style={styles.muted}>Thoughtfully picked. Happily worn.</Text></View>}/>}
    {tab === 'cart' && <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled"><Text style={styles.eyebrow}>YOUR LITTLE EDIT · {count} ITEMS</Text><Text style={styles.heading}>Your cart is <Text style={styles.italic}>lovely.</Text></Text>{user ? <Text style={styles.syncNote}>Signed in · changes sync instantly across your devices</Text> : <Text style={styles.syncNote}>Sign in on web and mobile to keep this cart in sync.</Text>}{cart.length ? <>{cart.map(item => <View key={item.id} style={styles.cartRow}><Image source={{ uri: imageUri(item.image_url) }} style={styles.cartImage}/><View style={styles.cartInfo}><Text style={styles.productName}>{item.name}</Text><Text style={styles.price}>{money(item.price_ngn)}</Text><View style={styles.quantity}><Pressable onPress={() => updateItem(item, -1)} style={styles.quantityButton}><Text>−</Text></Pressable><Text style={styles.quantityText}>{item.quantity}</Text><Pressable onPress={() => updateItem(item, 1)} style={styles.quantityButton}><Text>+</Text></Pressable></View></View><Pressable onPress={() => updateItem(item, -item.quantity)}><Text style={styles.remove}>Remove</Text></Pressable></View>)}<View style={styles.summary}><Text style={styles.summaryLine}>Subtotal <Text>{money(subtotal)}</Text></Text><Text style={styles.muted}>Delivery {subtotal >= 50000 ? 'on us' : money(2000)}</Text><Text style={styles.total}>Total  {money(subtotal + (subtotal >= 50000 ? 0 : 2000))}</Text><Pressable onPress={() => setCheckout(true)} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Continue to checkout  →</Text></Pressable></View></> : <View style={styles.empty}><Text style={styles.emptyTitle}>A little room for something lovely.</Text><Text style={styles.muted}>Your cart is empty for now.</Text><Pressable onPress={() => setTab('shop')} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Explore the edit</Text></Pressable></View>}</ScrollView>}
    {tab === 'account' && <ScrollView contentContainerStyle={styles.page}><Text style={styles.eyebrow}>YOUR ZAM'S ACCOUNT</Text><Text style={styles.heading}>Hello, <Text style={styles.italic}>{user?.user_metadata?.full_name?.split(' ')[0] || 'lovely'}.</Text></Text>{user ? <><View style={styles.accountCard}><Text style={styles.accountEmail}>{user.email}</Text><Text style={styles.syncNote}>Your cart is shared securely across the Zam's Beauty website and mobile app.</Text></View><Pressable style={styles.outlineButton} onPress={async () => { await supabase?.auth.signOut(); setTab('shop'); }}><Text style={styles.outlineButtonText}>Sign out</Text></Pressable></> : <><Text style={styles.paragraph}>Sign in with Google to keep your cart with you on every device.</Text><Pressable disabled={busy} onPress={signIn} style={styles.primaryButton}>{busy ? <ActivityIndicator color={C.white}/> : <Text style={styles.primaryButtonText}>Continue with Google</Text>}</Pressable><Text style={styles.finePrint}>Use the same Google account on the website and mobile app.</Text></>}</ScrollView>}
    {checkout && <View style={styles.checkoutOverlay}><KeyboardAvoidingView style={styles.checkoutSheet} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.checkoutContent}><View style={styles.checkoutTop}><Pressable onPress={() => setCheckout(false)}><Text style={styles.remove}>← Back to cart</Text></Pressable><Text style={styles.eyebrow}>A HAPPY CHECKOUT</Text></View><Text style={styles.heading}>Let's make it <Text style={styles.italic}>official.</Text></Text><Text style={styles.muted}>Your order total · {money(subtotal + (subtotal >= 50000 ? 0 : 2000))}</Text>{([['name','Full name','Your name'],['email','Email address','you@example.com'],['phone','Phone number','080 1234 5678'],['address','Delivery address','House number and street'],['city','City','Where should we bring your order?']] as const).map(([key,label,placeholder]) => <View key={key} style={styles.field}><Text style={styles.label}>{label}</Text><TextInput value={customer[key]} onChangeText={v => setCustomer(c => ({ ...c, [key]: v }))} placeholder={placeholder} placeholderTextColor="#a99b95" autoCapitalize={key === 'email' ? 'none' : 'words'} keyboardType={key === 'email' ? 'email-address' : key === 'phone' ? 'phone-pad' : 'default'} style={styles.input}/></View>)}<View style={styles.field}><Text style={styles.label}>Delivery note · optional</Text><TextInput value={customer.note} onChangeText={v => setCustomer(c => ({ ...c, note: v }))} placeholder="Anything we should know?" placeholderTextColor="#a99b95" style={styles.input}/></View><Pressable disabled={busy} onPress={placeOrder} style={styles.primaryButton}>{busy ? <ActivityIndicator color={C.white}/> : <Text style={styles.primaryButtonText}>Place my order  →</Text>}</Pressable><Text style={styles.finePrint}>Our team will confirm delivery and payment with you.</Text></ScrollView></KeyboardAvoidingView></View>}
    <View style={styles.tabbar}>{([['shop','Shop'],['cart',`Cart ${count ? `(${count})` : ''}`],['account','Account']] as [Tab,string][]).map(([key,label]) => <Pressable key={key} onPress={() => setTab(key)} style={styles.tab}><Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>{tab === key && <View style={styles.tabDot}/>}</Pressable>)}</View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream }, loading: { flex: 1, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center', gap: 12 }, muted: { color: C.muted, fontSize: 13, lineHeight: 20 },
  topbar: { height: 60, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: C.line, backgroundColor: C.cream }, brand: { color: C.ink, fontSize: 23, fontWeight: '800', letterSpacing: -1.5 }, brandAccent: { color: C.rose, fontWeight: '500', fontStyle: 'italic' }, cartPill: { borderColor: C.line, borderWidth: 1, borderRadius: 30, paddingHorizontal: 14, paddingVertical: 8 }, cartPillText: { color: C.ink, fontSize: 12, fontWeight: '700' },
  list: { paddingHorizontal: 20, paddingBottom: 26 }, row: { gap: 13, marginBottom: 16 }, hero: { backgroundColor: C.blush, borderRadius: 22, marginTop: 18, paddingHorizontal: 22, paddingVertical: 24, overflow: 'hidden' }, eyebrow: { color: C.roseDark, fontSize: 10, letterSpacing: 1.6, fontWeight: '800' }, heroTitle: { color: C.ink, fontSize: 38, lineHeight: 42, fontWeight: '700', letterSpacing: -1.8, marginTop: 14 }, italic: { color: C.rose, fontStyle: 'italic', fontWeight: '500' }, heroText: { color: '#665651', fontSize: 14, lineHeight: 21, marginTop: 12, maxWidth: 280 }, heroTag: { alignSelf: 'flex-start', backgroundColor: '#fff9f4', borderRadius: 30, paddingVertical: 8, paddingHorizontal: 12, marginTop: 18 }, heroTagText: { color: C.roseDark, fontWeight: '800', fontSize: 9, letterSpacing: 1 }, headingRow: { marginTop: 27, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }, heading: { color: C.ink, fontSize: 27, lineHeight: 34, fontWeight: '700', letterSpacing: -1 }, itemCount: { color: C.muted, fontSize: 11, paddingBottom: 4 }, search: { borderColor: C.line, borderWidth: 1, borderRadius: 12, marginTop: 16, paddingHorizontal: 15, paddingVertical: 12, color: C.ink, backgroundColor: C.white }, chips: { gap: 8, paddingVertical: 14 }, chip: { borderRadius: 30, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: C.white }, chipActive: { backgroundColor: C.ink, borderColor: C.ink }, chipText: { color: C.ink, fontSize: 11, fontWeight: '600' }, chipTextActive: { color: C.white },
  card: { flex: 1, backgroundColor: C.white, borderRadius: 15, borderWidth: 1, borderColor: C.line, overflow: 'hidden' }, imageWrap: { aspectRatio: 0.88, backgroundColor: C.blush }, productImage: { width: '100%', height: '100%' }, typeTag: { position: 'absolute', bottom: 9, left: 9, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: 'rgba(255,248,243,0.92)', borderRadius: 30 }, typeTagText: { color: C.roseDark, fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 }, cardBody: { padding: 11 }, productName: { color: C.ink, fontSize: 13, lineHeight: 18, fontWeight: '700', minHeight: 36 }, price: { color: C.roseDark, fontSize: 13, fontWeight: '800', marginTop: 6 }, addButton: { marginTop: 10, backgroundColor: C.ink, borderRadius: 9, paddingVertical: 10, alignItems: 'center' }, addButtonText: { color: C.white, fontSize: 10, fontWeight: '700' }, emptyCatalog: { backgroundColor: C.white, padding: 18, borderRadius: 14, borderColor: C.line, borderWidth: 1, marginTop: 5 }, emptyTitle: { color: C.ink, fontSize: 17, fontWeight: '700', marginBottom: 5 }, footer: { paddingVertical: 26, alignItems: 'center', gap: 5 }, footerBrand: { color: C.roseDark, fontWeight: '800', fontSize: 10, letterSpacing: 1.5 },
  page: { padding: 23, paddingBottom: 100, flexGrow: 1 }, syncNote: { color: C.green, fontSize: 12, lineHeight: 18, marginTop: 10 }, cartRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderColor: C.line, paddingVertical: 15 }, cartImage: { width: 76, height: 82, borderRadius: 10, backgroundColor: C.blush }, cartInfo: { flex: 1 }, quantity: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 }, quantityButton: { width: 26, height: 26, borderRadius: 13, borderColor: C.line, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white }, quantityText: { color: C.ink, fontSize: 12, fontWeight: '700' }, remove: { color: C.roseDark, fontSize: 11, fontWeight: '700' }, summary: { marginTop: 20, backgroundColor: C.white, borderColor: C.line, borderWidth: 1, borderRadius: 14, padding: 17 }, summaryLine: { color: C.ink, fontWeight: '600', fontSize: 14, flexDirection: 'row', justifyContent: 'space-between' }, total: { color: C.ink, fontSize: 17, fontWeight: '800', marginTop: 15, paddingTop: 13, borderTopWidth: 1, borderColor: C.line }, primaryButton: { backgroundColor: C.ink, paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 16 }, primaryButtonText: { color: C.white, fontSize: 13, fontWeight: '700' }, empty: { alignItems: 'center', marginTop: 65, padding: 25, backgroundColor: C.white, borderRadius: 16, borderColor: C.line, borderWidth: 1 }, paragraph: { color: C.muted, fontSize: 14, lineHeight: 22, marginTop: 16, marginBottom: 5 }, accountCard: { padding: 18, marginTop: 20, borderRadius: 15, borderColor: C.line, borderWidth: 1, backgroundColor: C.white }, accountEmail: { color: C.ink, fontSize: 15, fontWeight: '700' }, outlineButton: { marginTop: 16, borderColor: C.line, borderWidth: 1, borderRadius: 12, padding: 14, alignItems: 'center' }, outlineButtonText: { color: C.roseDark, fontWeight: '700' }, finePrint: { color: C.muted, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 13 },
  tabbar: { height: 63, position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, borderColor: C.line, backgroundColor: C.cream, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }, tab: { minWidth: 75, alignItems: 'center', justifyContent: 'center', height: '100%' }, tabText: { color: C.muted, fontSize: 11, fontWeight: '600' }, tabTextActive: { color: C.roseDark, fontWeight: '800' }, tabDot: { width: 4, height: 4, borderRadius: 3, backgroundColor: C.rose, marginTop: 4 },
  checkoutOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(35,22,19,0.38)', justifyContent: 'flex-end' }, checkoutSheet: { backgroundColor: C.cream, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '94%' }, checkoutContent: { padding: 23, paddingBottom: 45 }, checkoutTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 17 }, field: { marginTop: 15 }, label: { color: C.ink, fontSize: 11, fontWeight: '700', marginBottom: 7 }, input: { borderColor: C.line, borderWidth: 1, borderRadius: 11, paddingHorizontal: 13, paddingVertical: 12, backgroundColor: C.white, color: C.ink, fontSize: 13 },
});
