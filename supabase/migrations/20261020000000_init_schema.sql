-- ==============================================================================
-- SUPABASE MIGRATION: 20261020000000_init_schema.sql
-- POS F&B Restoran & Kafe (Multi-Outlet, RLS, Stock, Orders, Shifts, Delivery)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. OUTLETS
CREATE TABLE IF NOT EXISTS outlets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    tax_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.1000, -- 10% PB1
    service_charge_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.0500, -- 5%
    stock_deduct_trigger TEXT NOT NULL DEFAULT 'on_send', -- 'on_send' | 'on_paid'
    allow_negative_stock BOOLEAN NOT NULL DEFAULT TRUE,
    qr_approval_required BOOLEAN NOT NULL DEFAULT FALSE,
    max_discount_without_manager NUMERIC(5, 2) NOT NULL DEFAULT 10.00, -- 10%
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. USERS / PROFILES (Role: owner, manager, cashier, waiter, kitchen)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id UUID,
    outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'cashier', 'waiter', 'kitchen')),
    pin_hash TEXT NOT NULL, -- SHA-256 hash of 4-6 digit PIN
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. AREAS & TABLES
CREATE TABLE IF NOT EXISTS areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    floor_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE NOT NULL,
    area_id UUID REFERENCES areas(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    capacity INT NOT NULL DEFAULT 4,
    shape TEXT NOT NULL DEFAULT 'square' CHECK (shape IN ('square', 'round', 'rectangle')),
    pos_x INT NOT NULL DEFAULT 50,
    pos_y INT NOT NULL DEFAULT 50,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'needs_cleaning')),
    qr_token TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. CATEGORIES & PRODUCTS
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    station TEXT NOT NULL DEFAULT 'Kitchen' CHECK (station IN ('Bar', 'Grill', 'Dessert', 'Kitchen')),
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    image_url TEXT,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. MODIFIERS
CREATE TABLE IF NOT EXISTS modifier_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    min_select INT NOT NULL DEFAULT 0,
    max_select INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS modifier_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES modifier_groups(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    price_delta NUMERIC(12, 2) NOT NULL DEFAULT 0,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_modifier_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    group_id UUID REFERENCES modifier_groups(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(product_id, group_id)
);

-- 6. INGREDIENTS & RECIPES
CREATE TABLE IF NOT EXISTS ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    base_unit TEXT NOT NULL, -- 'g', 'ml', 'pcs'
    purchase_unit TEXT NOT NULL, -- 'kg', 'liter', 'dus', 'pack'
    conversion NUMERIC(10, 4) NOT NULL DEFAULT 1000, -- 1 kg = 1000 g
    cost NUMERIC(12, 4) NOT NULL DEFAULT 0, -- cost per base_unit
    current_stock NUMERIC(12, 4) NOT NULL DEFAULT 0,
    min_stock NUMERIC(12, 4) NOT NULL DEFAULT 100,
    is_critical BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    option_id UUID REFERENCES modifier_options(id) ON DELETE CASCADE,
    ingredient_id UUID REFERENCES ingredients(id) ON DELETE RESTRICT NOT NULL,
    qty NUMERIC(12, 4) NOT NULL, -- in base_unit
    action TEXT NOT NULL DEFAULT 'add' CHECK (action IN ('add', 'replace')),
    replaces_ingredient_id UUID REFERENCES ingredients(id) ON DELETE SET NULL,
    size_variant TEXT, -- e.g. 'Regular', 'Large' or NULL
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE NOT NULL,
    ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('sale', 'purchase', 'adjust', 'waste', 'opname', 'reversal')),
    qty NUMERIC(12, 4) NOT NULL, -- positive for add, negative for deduct
    balance_after NUMERIC(12, 4) NOT NULL,
    ref_id TEXT, -- order_id, po_id, etc.
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. SHIFTS & CASH MOVEMENTS
CREATE TABLE IF NOT EXISTS shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE RESTRICT NOT NULL,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at TIMESTAMPTZ,
    opening_cash NUMERIC(12, 2) NOT NULL DEFAULT 0,
    expected_cash NUMERIC(12, 2) NOT NULL DEFAULT 0,
    actual_cash NUMERIC(12, 2) NOT NULL DEFAULT 0,
    variance NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cash_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('in', 'out')),
    amount NUMERIC(12, 2) NOT NULL,
    reason TEXT NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. ORDERS & ITEMS
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE NOT NULL,
    order_number TEXT NOT NULL,
    table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
    shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('dine_in', 'takeaway', 'qr', 'delivery')),
    source TEXT NOT NULL DEFAULT 'pos' CHECK (source IN ('pos', 'qr', 'gofood', 'grabfood', 'shopeefood')),
    queue_number INT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'sent', 'ready', 'completed', 'cancelled')),
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    tax NUMERIC(12, 2) NOT NULL DEFAULT 0,
    service NUMERIC(12, 2) NOT NULL DEFAULT 0,
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    discount_reason TEXT,
    discount_authorized_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    parent_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    customer_name TEXT,
    notes TEXT,
    version INT NOT NULL DEFAULT 1,
    stock_deducted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
    name_snapshot TEXT NOT NULL,
    price_snapshot NUMERIC(12, 2) NOT NULL,
    qty INT NOT NULL DEFAULT 1,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'preparing', 'ready', 'served', 'void')),
    is_additional BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at TIMESTAMPTZ,
    ready_at TIMESTAMPTZ,
    served_at TIMESTAMPTZ,
    void_reason TEXT,
    void_authorized_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_item_modifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id UUID REFERENCES order_items(id) ON DELETE CASCADE NOT NULL,
    option_id UUID REFERENCES modifier_options(id) ON DELETE SET NULL,
    name_snapshot TEXT NOT NULL,
    price_delta NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. BILLS & PAYMENTS (SPLIT BILL)
CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    split_group INT NOT NULL DEFAULT 1,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    tax NUMERIC(12, 2) NOT NULL DEFAULT 0,
    service NUMERIC(12, 2) NOT NULL DEFAULT 0,
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bill_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID REFERENCES bills(id) ON DELETE CASCADE NOT NULL,
    order_item_id UUID REFERENCES order_items(id) ON DELETE CASCADE NOT NULL,
    qty INT NOT NULL DEFAULT 1,
    allocated_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID REFERENCES bills(id) ON DELETE CASCADE NOT NULL,
    method TEXT NOT NULL CHECK (method IN ('cash', 'qris', 'card')),
    amount NUMERIC(12, 2) NOT NULL,
    tendered_amount NUMERIC(12, 2),
    change_amount NUMERIC(12, 2),
    reference TEXT,
    status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
    idempotency_key TEXT UNIQUE,
    paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. TABLE MERGES
CREATE TABLE IF NOT EXISTS table_merges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    primary_table_id UUID REFERENCES tables(id) ON DELETE CASCADE NOT NULL,
    merged_table_id UUID REFERENCES tables(id) ON DELETE CASCADE NOT NULL,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(merged_table_id)
);

-- 11. DELIVERY INTEGRATION
CREATE TABLE IF NOT EXISTS delivery_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('gofood', 'grabfood', 'shopeefood')),
    external_id TEXT NOT NULL,
    commission_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.2000,
    commission_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    driver_name TEXT,
    driver_phone TEXT,
    status TEXT NOT NULL DEFAULT 'incoming' CHECK (status IN ('incoming', 'accepted', 'rejected', 'ready', 'picked_up')),
    raw_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sku_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('gofood', 'grabfood', 'shopeefood')),
    external_sku TEXT NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(outlet_id, platform, external_sku)
);

-- 12. PURCHASING
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE NOT NULL,
    po_number TEXT NOT NULL,
    supplier_name TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'received', 'cancelled')),
    total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    received_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE NOT NULL,
    ingredient_id UUID REFERENCES ingredients(id) ON DELETE RESTRICT NOT NULL,
    order_qty NUMERIC(12, 4) NOT NULL,
    unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
    received_qty NUMERIC(12, 4),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. AUDIT LOGS & NOTIFICATIONS
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT,
    reason TEXT,
    before_state JSONB,
    after_state JSONB,
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- INDEXES FOR SPEED
CREATE INDEX IF NOT EXISTS idx_tables_outlet ON tables(outlet_id, status);
CREATE INDEX IF NOT EXISTS idx_tables_token ON tables(qr_token);
CREATE INDEX IF NOT EXISTS idx_products_outlet ON products(outlet_id, is_available);
CREATE INDEX IF NOT EXISTS idx_orders_outlet_status ON orders(outlet_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_table ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_bills_order ON bills(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_bill ON payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_shifts_user_status ON shifts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_stock_movements_ingredient ON stock_movements(ingredient_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_outlet ON audit_logs(outlet_id, created_at DESC);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_merges ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sku_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Permissive policies for authenticated / service role & demo purposes
-- Note: In production Supabase, jwt -> auth.uid() -> profile.outlet_id filters each row
CREATE POLICY "Public read for outlets" ON outlets FOR SELECT USING (true);
CREATE POLICY "Public read for profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Public read for areas" ON areas FOR ALL USING (true);
CREATE POLICY "Public read/write for tables" ON tables FOR ALL USING (true);
CREATE POLICY "Public read for categories" ON categories FOR ALL USING (true);
CREATE POLICY "Public read/write for products" ON products FOR ALL USING (true);
CREATE POLICY "Public read for modifier_groups" ON modifier_groups FOR ALL USING (true);
CREATE POLICY "Public read for modifier_options" ON modifier_options FOR ALL USING (true);
CREATE POLICY "Public read for product_modifier_groups" ON product_modifier_groups FOR ALL USING (true);
CREATE POLICY "Public read/write for ingredients" ON ingredients FOR ALL USING (true);
CREATE POLICY "Public read/write for recipes" ON recipes FOR ALL USING (true);
CREATE POLICY "Public read/write for stock_movements" ON stock_movements FOR ALL USING (true);
CREATE POLICY "Public read/write for shifts" ON shifts FOR ALL USING (true);
CREATE POLICY "Public read/write for cash_movements" ON cash_movements FOR ALL USING (true);
CREATE POLICY "Public read/write for orders" ON orders FOR ALL USING (true);
CREATE POLICY "Public read/write for order_items" ON order_items FOR ALL USING (true);
CREATE POLICY "Public read/write for order_item_modifiers" ON order_item_modifiers FOR ALL USING (true);
CREATE POLICY "Public read/write for bills" ON bills FOR ALL USING (true);
CREATE POLICY "Public read/write for bill_items" ON bill_items FOR ALL USING (true);
CREATE POLICY "Public read/write for payments" ON payments FOR ALL USING (true);
CREATE POLICY "Public read/write for table_merges" ON table_merges FOR ALL USING (true);
CREATE POLICY "Public read/write for delivery_orders" ON delivery_orders FOR ALL USING (true);
CREATE POLICY "Public read/write for sku_mappings" ON sku_mappings FOR ALL USING (true);
CREATE POLICY "Public read/write for purchase_orders" ON purchase_orders FOR ALL USING (true);
CREATE POLICY "Public read/write for purchase_order_items" ON purchase_order_items FOR ALL USING (true);
CREATE POLICY "Public read/write for audit_logs" ON audit_logs FOR ALL USING (true);
CREATE POLICY "Public read/write for notifications" ON notifications FOR ALL USING (true);

-- Enable Realtime publication
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE tables;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE delivery_orders;
