import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { query } from '../db.js';

const r = Router();
r.use(auth);

const allowedCategories = ['vegetable', 'chicken', 'fruit'];

r.get('/', async (req, res) => {
  const search = req.query.search || '';
  const category = req.query.category || '';
  const params = [search];
  let sql = `SELECT * FROM products WHERE (name ILIKE '%'||$1||'%' OR COALESCE(name_ur,'') ILIKE '%'||$1||'%')`;
  if (category && allowedCategories.includes(category)) {
    params.push(category);
    sql += ` AND category=$${params.length}`;
  }
  sql += ' ORDER BY category, name';
  res.json((await query(sql, params)).rows);
});

r.post('/', async (req, res) => {
  const { name, name_ur = '', category = 'vegetable', unit = 'kg', price = 0, stock = 0 } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: 'Item name is required' });
  if (!allowedCategories.includes(category)) return res.status(400).json({ message: 'Invalid item category' });
  if (Number(price) < 0 || Number(stock) < 0) return res.status(400).json({ message: 'Price and stock cannot be negative' });
  res.status(201).json((await query(
    'INSERT INTO products(name,name_ur,category,unit,price,stock) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
    [name.trim(), name_ur.trim(), category, unit.trim() || 'kg', price, stock]
  )).rows[0]);
});

r.put('/:id', async (req, res) => {
  const { name, name_ur = '', category = 'vegetable', unit = 'kg', price = 0, stock = 0 } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: 'Item name is required' });
  if (!allowedCategories.includes(category)) return res.status(400).json({ message: 'Invalid item category' });
  if (Number(price) < 0 || Number(stock) < 0) return res.status(400).json({ message: 'Price and stock cannot be negative' });
  const result = await query(
    'UPDATE products SET name=$1,name_ur=$2,category=$3,unit=$4,price=$5,stock=$6,updated_at=NOW() WHERE id=$7 RETURNING *',
    [name.trim(), name_ur.trim(), category, unit.trim() || 'kg', price, stock, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ message: 'Item not found' });
  res.json(result.rows[0]);
});

r.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM products WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

export default r;
