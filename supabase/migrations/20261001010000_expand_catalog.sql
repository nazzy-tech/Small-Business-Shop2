-- Expand the everyday cosmetics edit from six products to eighteen.
insert into public.products (id,name,category,description,price_ngn,image_url) values
('07','Velvet Matte Lipstick','Lips','Comfortable soft-matte colour for everyday wear.',12500,'https://images.unsplash.com/photo-1586495777744-4413f21062fa'),
('08','Dew Drop Serum','Skin','A lightweight serum for a simple daily skincare routine.',16800,'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b'),
('09','Butter Balm Moisturizer','Skin','A rich, comfortable moisturizer for daily skin care.',15500,'https://images.unsplash.com/photo-1571781926291-c477ebfd024b'),
('10','Golden Hour Bronzer','Cheeks','A blendable bronzer for a warm, everyday look.',13200,'https://images.unsplash.com/photo-1596462502278-27bfdc403348'),
('11','Soft Set Pressed Powder','Skin','A lightweight pressed powder with a soft-focus finish.',11800,'https://images.unsplash.com/photo-1631214524020-7e18db9a8f92'),
('12','Lash Day Mascara','Eyes','An everyday mascara for a defined lash look.',10500,'https://images.unsplash.com/photo-1512496015851-a90fb38ba796'),
('13','Evening Edit Eyeshadow','Eyes','A versatile eyeshadow palette for soft daytime and evening looks.',17900,'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9'),
('14','Rose Glow Highlighter','Cheeks','A buildable highlighter with a subtle rose-toned sheen.',12700,'https://images.unsplash.com/photo-1596704017254-9b121068fb31'),
('15','Barely There Concealer','Skin','Natural-looking coverage with a skin-like finish.',13900,'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19'),
('16','Gentle Melt Cleansing Balm','Skin','A gentle cleansing balm that melts away makeup.',14800,'https://images.unsplash.com/photo-1556228720-195a672e8a03'),
('17','Petal Polish Nail Colour','Nails','A glossy sheer-rose nail colour for a soft pop of colour.',7200,'https://images.unsplash.com/photo-1604654894610-df63bc536371'),
('18','The Everyday Glow Set','Sets','A set of three everyday beauty favourites.',32000,'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b')
on conflict (id) do update set
  name=excluded.name,
  category=excluded.category,
  description=excluded.description,
  price_ngn=excluded.price_ngn,
  image_url=excluded.image_url;
