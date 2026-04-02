-- 015: Create inventory_items table and FK from products

-- Create inventory_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  cost_price NUMERIC DEFAULT 0,
  selling_price NUMERIC DEFAULT 0,
  stock INT DEFAULT 0,
  reorder_level INT DEFAULT 5,
  supplier TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add inventory_item_id column to products if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'inventory_item_id'
  ) THEN
    ALTER TABLE products ADD COLUMN inventory_item_id UUID;
  END IF;
END $$;

-- Add FK from products to inventory_items if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_products_inventory' AND table_name = 'products'
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT fk_products_inventory
      FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id);
  END IF;
END $$;

-- Add FK from inventory_logs to inventory_items if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_inventory_logs_item' AND table_name = 'inventory_logs'
  ) THEN
    ALTER TABLE inventory_logs
      ADD CONSTRAINT fk_inventory_logs_item
      FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

-- Allow public read access (needed for stock display)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'inventory_items' AND policyname = 'Public read inventory_items'
  ) THEN
    CREATE POLICY "Public read inventory_items" ON inventory_items FOR SELECT USING (true);
  END IF;
END $$;

-- Allow inserts (for admin operations)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'inventory_items' AND policyname = 'Public insert inventory_items'
  ) THEN
    CREATE POLICY "Public insert inventory_items" ON inventory_items FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Allow updates (for admin operations)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'inventory_items' AND policyname = 'Public update inventory_items'
  ) THEN
    CREATE POLICY "Public update inventory_items" ON inventory_items FOR UPDATE USING (true);
  END IF;
END $$;
