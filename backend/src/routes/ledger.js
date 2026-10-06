import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { query, transaction } from '../db.js';

const r = Router();
r.use(auth);

r.post('/purchase', async (req, res) => {
  const { customer_id, items = [], notes = '', purchased_at } = req.body;
  if (!customer_id || !items.length) return res.status(400).json({ message: 'Customer and at least one item are required' });

  try {
    const out = await transaction(async c => {
      if (!(await c.query('SELECT id FROM customers WHERE id=$1', [customer_id])).rows[0]) {
        throw Error('Customer not found');
      }

      let total = 0;
      const lines = [];

      for (const item of items) {
        const product = (await c.query('SELECT * FROM products WHERE id=$1 FOR UPDATE', [item.product_id])).rows[0];
        const quantity = Number(item.quantity);
        if (!product) throw Error('Item not found');
        if (!Number.isFinite(quantity) || quantity <= 0) throw Error(`Invalid quantity for ${product.name}`);
        if (quantity > Number(product.stock)) throw Error(`Not enough stock for ${product.name}`);

        // Snapshot the current name, Urdu name, category, unit and price.
        // Future product edits will never change an already-created purchase.
        const lineTotal = quantity * Number(product.price);
        total += lineTotal;
        lines.push({ product, quantity, lineTotal });
      }

      const purchase = (await c.query(
        'INSERT INTO purchases(customer_id,total,notes,purchased_at) VALUES($1,$2,$3,COALESCE($4,NOW())) RETURNING *',
        [customer_id, total, notes, purchased_at || null]
      )).rows[0];

      for (const line of lines) {
        await c.query(
          `INSERT INTO purchase_items(
            purchase_id,product_id,product_name,product_name_ur,category,quantity,unit,price,line_total
          ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            purchase.id,
            line.product.id,
            line.product.name,
            line.product.name_ur || '',
            line.product.category,
            line.quantity,
            line.product.unit,
            line.product.price,
            line.lineTotal
          ]
        );
        await c.query(
          'UPDATE products SET stock=stock-$1,updated_at=NOW() WHERE id=$2',
          [line.quantity, line.product.id]
        );
      }

      return purchase;
    });

    res.status(201).json(out);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

r.post('/payment', async (req, res) => {
  const { customer_id, amount, method = 'cash', notes = '', paid_at } = req.body;
  if (!customer_id || Number(amount) <= 0) return res.status(400).json({ message: 'Valid customer and payment required' });
  res.status(201).json((await query(
    'INSERT INTO payments(customer_id,amount,method,notes,paid_at) VALUES($1,$2,$3,$4,COALESCE($5,NOW())) RETURNING *',
    [customer_id, amount, method, notes, paid_at || null]
  )).rows[0]);
});

r.get('/recent', async (_req, res) => {
  res.json((await query(
    'SELECT p.*,c.name customer_name FROM purchases p JOIN customers c ON c.id=p.customer_id ORDER BY p.purchased_at DESC LIMIT 10'
  )).rows);
});

export default r;
