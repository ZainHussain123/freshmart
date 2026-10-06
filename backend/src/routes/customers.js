import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { query } from '../db.js';

const r = Router();
r.use(auth);

r.get('/', async (req, res) => {
  const s = req.query.search || '';
  const x = await query(
    `SELECT c.*,
      COALESCE((SELECT SUM(total) FROM purchases WHERE customer_id=c.id),0) purchased,
      COALESCE((SELECT SUM(amount) FROM payments WHERE customer_id=c.id),0) paid
     FROM customers c
     WHERE c.name ILIKE '%'||$1||'%' OR COALESCE(c.phone,'') ILIKE '%'||$1||'%'
     ORDER BY c.name`,
    [s]
  );
  res.json(x.rows.map(v => ({ ...v, balance: Number(v.purchased) - Number(v.paid) })));
});

r.get('/:id', async (req, res) => {
  const customer = (await query('SELECT * FROM customers WHERE id=$1', [req.params.id])).rows[0];
  if (!customer) return res.status(404).json({ message: 'Customer not found' });

  const purchases = (await query(
    `SELECT p.*,
      COALESCE(
        json_agg(
          json_build_object(
            'id',i.id,
            'product_name',i.product_name,
            'product_name_ur',COALESCE(i.product_name_ur,''),
            'category',COALESCE(i.category,'vegetable'),
            'quantity',i.quantity,
            'unit',i.unit,
            'price',i.price,
            'line_total',i.line_total
          ) ORDER BY i.id
        ) FILTER(WHERE i.id IS NOT NULL),'[]'
      ) items
     FROM purchases p
     LEFT JOIN purchase_items i ON i.purchase_id=p.id
     WHERE p.customer_id=$1
     GROUP BY p.id
     ORDER BY p.purchased_at DESC`,
    [req.params.id]
  )).rows;

  const payments = (await query(
    'SELECT * FROM payments WHERE customer_id=$1 ORDER BY paid_at DESC',
    [req.params.id]
  )).rows;

  const totals = (await query(
    `SELECT
      COALESCE((SELECT SUM(total) FROM purchases WHERE customer_id=$1),0) purchased,
      COALESCE((SELECT SUM(amount) FROM payments WHERE customer_id=$1),0) paid`,
    [req.params.id]
  )).rows[0];

  res.json({
    customer,
    purchases,
    payments,
    totals: {
      purchased: Number(totals.purchased),
      paid: Number(totals.paid),
      balance: Number(totals.purchased) - Number(totals.paid)
    }
  });
});

r.post('/', async (req, res) => {
  const { name, phone = '', address = '', notes = '' } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: 'Customer name is required' });
  res.status(201).json((await query(
    'INSERT INTO customers(name,phone,address,notes) VALUES($1,$2,$3,$4) RETURNING *',
    [name.trim(), phone, address, notes]
  )).rows[0]);
});

r.put('/:id', async (req, res) => {
  const { name, phone = '', address = '', notes = '' } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: 'Customer name is required' });
  const result = await query(
    'UPDATE customers SET name=$1,phone=$2,address=$3,notes=$4,updated_at=NOW() WHERE id=$5 RETURNING *',
    [name.trim(), phone, address, notes, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ message: 'Customer not found' });
  res.json(result.rows[0]);
});

r.delete('/:id', async (req, res) => {
  await query('DELETE FROM customers WHERE id=$1', [req.params.id]);
  res.json({ message: 'Deleted' });
});

export default r;
