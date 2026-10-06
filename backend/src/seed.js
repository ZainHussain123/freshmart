import bcrypt from 'bcryptjs';
import { query } from './db.js';

export async function initializeDatabase() {
  await query(`
    CREATE TABLE IF NOT EXISTS admins(
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(180) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS customers(
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      phone VARCHAR(40),
      address TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS products(
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      name_ur VARCHAR(150) DEFAULT '',
      category VARCHAR(30) NOT NULL DEFAULT 'vegetable',
      unit VARCHAR(30) DEFAULT 'kg',
      price NUMERIC(10,2) DEFAULT 0,
      stock NUMERIC(10,2) DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS purchases(
      id SERIAL PRIMARY KEY,
      customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
      total NUMERIC(12,2) NOT NULL,
      notes TEXT DEFAULT '',
      purchased_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS purchase_items(
      id SERIAL PRIMARY KEY,
      purchase_id INTEGER REFERENCES purchases(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      product_name VARCHAR(150) NOT NULL,
      product_name_ur VARCHAR(150) DEFAULT '',
      category VARCHAR(30) DEFAULT 'vegetable',
      quantity NUMERIC(10,2) NOT NULL,
      unit VARCHAR(30) NOT NULL,
      price NUMERIC(10,2) NOT NULL,
      line_total NUMERIC(12,2) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payments(
      id SERIAL PRIMARY KEY,
      customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
      amount NUMERIC(12,2) NOT NULL,
      method VARCHAR(30) DEFAULT 'cash',
      notes TEXT DEFAULT '',
      paid_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE products ADD COLUMN IF NOT EXISTS name_ur VARCHAR(150) DEFAULT '';
    ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(30) NOT NULL DEFAULT 'vegetable';
    ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS product_name_ur VARCHAR(150) DEFAULT '';
    ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS category VARCHAR(30) DEFAULT 'vegetable';
  `);

  // Backfill category/name translations for databases created by an older version.
  await query(`
    UPDATE products SET category='vegetable' WHERE category IS NULL OR category='';
    UPDATE purchase_items SET category='vegetable' WHERE category IS NULL OR category='';
  `);

  // Set ADMIN_EMAIL / ADMIN_PASSWORD in production; the demo login is only a local default.
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@vegetablemart.local').toLowerCase().trim();
  const pw = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
  await query(
    `INSERT INTO admins(name,email,password_hash)
     VALUES('Mart Admin',$2,$1)
     ON CONFLICT(email) DO NOTHING`,
    [pw, adminEmail]
  );

  const pc = await query('SELECT COUNT(*)::int c FROM products');
  if (!pc.rows[0].c) {
    const products = [
      ['Potatoes', 'آلو', 'vegetable', 'kg', 120, 100],
      ['Tomatoes', 'ٹماٹر', 'vegetable', 'kg', 220, 80],
      ['Onions', 'پیاز', 'vegetable', 'kg', 160, 100],
      ['Carrots', 'گاجر', 'vegetable', 'kg', 180, 70],
      ['Cucumbers', 'کھیرا', 'vegetable', 'kg', 160, 60],
      ['Spinach', 'پالک', 'vegetable', 'bunch', 100, 50],
      ['Cauliflower', 'پھول گوبھی', 'vegetable', 'piece', 180, 40],
      ['Cabbage', 'بند گوبھی', 'vegetable', 'kg', 140, 50],
      ['Green Chilies', 'ہری مرچ', 'vegetable', 'kg', 300, 30],
      ['Coriander', 'دھنیا', 'vegetable', 'bunch', 70, 60],
      ['Mint', 'پودینہ', 'vegetable', 'bunch', 80, 50],
      ['Lemon', 'لیموں', 'vegetable', 'kg', 350, 40],
      ['Chicken', 'مرغی', 'chicken', 'kg', 650, 80],
      ['Chicken Boneless', 'بون لیس چکن', 'chicken', 'kg', 900, 40],
      ['Apples', 'سیب', 'fruit', 'kg', 450, 50],
      ['Bananas', 'کیلا', 'fruit', 'dozen', 220, 30],
      ['Oranges', 'مالٹے', 'fruit', 'kg', 300, 50],
      ['Mangoes', 'آم', 'fruit', 'kg', 400, 40],
      ['Grapes', 'انگور', 'fruit', 'kg', 550, 30],
      ['Guava', 'امرود', 'fruit', 'kg', 300, 35]
    ];

    for (const p of products) {
      await query(
        'INSERT INTO products(name,name_ur,category,unit,price,stock) VALUES($1,$2,$3,$4,$5,$6)',
        p
      );
    }
  }

  // Add the new categories when upgrading an existing database from the old version.
  await query(`
    UPDATE products SET name_ur='آلو' WHERE name='Potatoes' AND COALESCE(name_ur,'')='';
    UPDATE products SET name_ur='ٹماٹر' WHERE name='Tomatoes' AND COALESCE(name_ur,'')='';
    UPDATE products SET name_ur='پیاز' WHERE name='Onions' AND COALESCE(name_ur,'')='';
    UPDATE products SET name_ur='گاجر' WHERE name='Carrots' AND COALESCE(name_ur,'')='';
    UPDATE products SET name_ur='کھیرا' WHERE name='Cucumbers' AND COALESCE(name_ur,'')='';
    UPDATE products SET name_ur='پالک' WHERE name='Spinach' AND COALESCE(name_ur,'')='';
    UPDATE products SET name_ur='پھول گوبھی' WHERE name='Cauliflower' AND COALESCE(name_ur,'')='';
    UPDATE products SET name_ur='بند گوبھی' WHERE name='Cabbage' AND COALESCE(name_ur,'')='';
    UPDATE products SET name_ur='ہری مرچ' WHERE name='Green Chilies' AND COALESCE(name_ur,'')='';
    UPDATE products SET name_ur='دھنیا' WHERE name='Coriander' AND COALESCE(name_ur,'')='';
    UPDATE products SET name_ur='پودینہ' WHERE name='Mint' AND COALESCE(name_ur,'')='';
    UPDATE products SET name_ur='لیموں' WHERE name='Lemon' AND COALESCE(name_ur,'')='';
  `);

  const newCategoryItems = [
    ['Chicken', 'مرغی', 'chicken', 'kg', 650, 80],
    ['Chicken Boneless', 'بون لیس چکن', 'chicken', 'kg', 900, 40],
    ['Apples', 'سیب', 'fruit', 'kg', 450, 50],
    ['Bananas', 'کیلا', 'fruit', 'dozen', 220, 30],
    ['Oranges', 'مالٹے', 'fruit', 'kg', 300, 50],
    ['Mangoes', 'آم', 'fruit', 'kg', 400, 40],
    ['Grapes', 'انگور', 'fruit', 'kg', 550, 30],
    ['Guava', 'امرود', 'fruit', 'kg', 300, 35]
  ];
  for (const item of newCategoryItems) {
    await query(
      `INSERT INTO products(name,name_ur,category,unit,price,stock)
       SELECT $1,$2,$3,$4,$5,$6
       WHERE NOT EXISTS (SELECT 1 FROM products WHERE name=$1::varchar)`,
      item
    );
  }

  const cc = await query('SELECT COUNT(*)::int c FROM customers');
  if (!cc.rows[0].c) {
    await query(`
      INSERT INTO customers(name,phone,address,notes)
      VALUES
        ('Ali Khan','0300-1111111','Gulshan-e-Iqbal','Regular customer'),
        ('Ahmed Traders','0300-2222222','North Nazimabad','Weekly account'),
        ('Usman','0300-3333333','PECHS','')
    `);
  }
}
