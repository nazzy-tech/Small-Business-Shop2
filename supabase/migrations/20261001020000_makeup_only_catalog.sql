-- Replace the original skincare and nail items with makeup across all 18 slots.
insert into public.products (id,name,category,description,price_ngn,image_url) values
('01','Cloud Skin Tint','Face','Lightweight, dewy everyday makeup tint.',14500,'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd'),
('02','Soft Focus Lip Oil','Lips','A comfortable, non-sticky rosewater lip oil.',9800,'https://images.unsplash.com/photo-1586495777744-4413f21062fa'),
('03','Featherlight Brow Gel','Eyes','A soft-hold brow gel for natural definition.',12500,'https://images.unsplash.com/photo-1512496015851-a90fb38ba796'),
('04','Daylight Cream Blush','Cheeks','A buildable, soft-flush cream blush.',11000,'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9'),
('05','Soft Focus Makeup Primer','Face','A smoothing makeup primer for a fresh-looking base.',18500,'https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8'),
('06','The Good Brow Pencil','Eyes','An easy-to-use pencil for natural-looking brows.',8500,'https://images.unsplash.com/photo-1512496015851-a90fb38ba796'),
('07','Velvet Matte Lipstick','Lips','Comfortable soft-matte colour for everyday wear.',12500,'https://images.unsplash.com/photo-1586495777744-4413f21062fa'),
('08','Everyday Liquid Foundation','Face','Buildable foundation with a natural-looking makeup finish.',16800,'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b'),
('09','Sheer Tint Lip Balm','Lips','A comfortable lip balm with a soft wash of makeup colour.',15500,'https://images.unsplash.com/photo-1586495777744-4413f21062fa'),
('10','Golden Hour Bronzer','Cheeks','A blendable bronzer for a warm, everyday look.',13200,'https://images.unsplash.com/photo-1596462502278-27bfdc403348'),
('11','Soft Set Pressed Powder','Face','A lightweight pressed makeup powder with a soft-focus finish.',11800,'https://images.unsplash.com/photo-1631214524020-7e18db9a8f92'),
('12','Lash Day Mascara','Eyes','An everyday mascara for a defined lash look.',10500,'https://images.unsplash.com/photo-1512496015851-a90fb38ba796'),
('13','Evening Edit Eyeshadow','Eyes','A versatile eyeshadow palette for soft daytime and evening looks.',17900,'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9'),
('14','Rose Glow Highlighter','Cheeks','A buildable highlighter with a subtle rose-toned sheen.',12700,'https://images.unsplash.com/photo-1596704017254-9b121068fb31'),
('15','Barely There Concealer','Face','Natural-looking makeup coverage with a skin-like finish.',13900,'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19'),
('16','Precision Liquid Eyeliner','Eyes','A fine-tip liquid eyeliner for precise definition.',14800,'https://images.unsplash.com/photo-1512496015851-a90fb38ba796'),
('17','Petal Soft Lip Liner','Lips','A softly blending lip liner in a sheer rose shade.',7200,'https://images.unsplash.com/photo-1586495777744-4413f21062fa'),
('18','The Everyday Glow Set','Sets','A set of three everyday makeup favourites.',32000,'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b')
on conflict (id) do update set
  name=excluded.name,
  category=excluded.category,
  description=excluded.description,
  price_ngn=excluded.price_ngn,
  image_url=excluded.image_url;
