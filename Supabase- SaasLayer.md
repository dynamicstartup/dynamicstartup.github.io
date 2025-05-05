# Supabase SaaS Layer Scope

This document defines a foundational multi-tenant SaaS layer built on Supabase. It includes database schema, foreign key relationships, API interfaces, and RLS policies to help developers and product owners rapidly prototype and launch business ideas.

---

## 📦 Scope Overview

This SaaS layer offers foundational blocks for any business-oriented SaaS, covering:

* **Features**: Modular business capabilities.
* **Resources & Actions**: Granular components and permissions.
* **Packages**: Bundled features for subscription plans.
* **Tenants**: Organizations or teams.
* **Roles & Permissions**: Fine-grained access control.
* **Users**: Mapped to tenants with role-based access.
* **Limits & Billing**: Enforce usage quotas and billing structure.

---

## 🗃️ Supabase Schema (PostgreSQL)

### `tenant`

```sql
CREATE TABLE tenant (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### `tenant_user`

```sql
CREATE TABLE tenant_user (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenant(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role_id UUID REFERENCES role(id),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);
```

### `role`

```sql
CREATE TABLE role (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenant(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);
```

### `role_permission`

```sql
CREATE TABLE role_permission (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES role(id) ON DELETE CASCADE,
  feature_id UUID REFERENCES feature(id),
  action_id UUID REFERENCES action(id),
  allow BOOLEAN DEFAULT true
);
```

### `feature`

```sql
CREATE TABLE feature (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT
);
```

### `resource`

```sql
CREATE TABLE resource (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  feature_id UUID REFERENCES feature(id) ON DELETE CASCADE
);
```

### `action`

```sql
CREATE TABLE action (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  resource_id UUID REFERENCES resource(id) ON DELETE CASCADE
);
```

### `package`

```sql
CREATE TABLE package (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### `package_feature`

```sql
CREATE TABLE package_feature (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID REFERENCES package(id) ON DELETE CASCADE,
  feature_id UUID REFERENCES feature(id)
);
```

### `tenant_limit`

```sql
CREATE TABLE tenant_limit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenant(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL
);
```

### `tenant_billing`

```sql
CREATE TABLE tenant_billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenant(id) ON DELETE CASCADE,
  billing_cycle_start TIMESTAMP,
  billing_cycle_end TIMESTAMP,
  package_id UUID REFERENCES package(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### `audit_log`

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenant(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔐 Supabase RLS Policies

### Enable RLS

```sql
ALTER TABLE tenant ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE role ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permission ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource ENABLE ROW LEVEL SECURITY;
ALTER TABLE action ENABLE ROW LEVEL SECURITY;
ALTER TABLE package ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_feature ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_limit ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
```

### Helper Function

```sql
CREATE OR REPLACE FUNCTION is_member_of(tenant UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM tenant_user
    WHERE tenant_user.tenant_id = tenant
      AND tenant_user.user_id = auth.uid()
      AND tenant_user.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Policies per Table

#### `tenant`

```sql
CREATE POLICY "Tenant: user can read their tenants"
ON tenant
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tenant_user
    WHERE tenant_user.tenant_id = tenant.id
    AND tenant_user.user_id = auth.uid()
  )
);

CREATE POLICY "Tenant: only creator can update"
ON tenant
FOR UPDATE
USING (created_by = auth.uid());
```

#### `tenant_user`

```sql
CREATE POLICY "TenantUser: read if member of tenant"
ON tenant_user
FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM tenant_user
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "TenantUser: insert by admin"
ON tenant_user
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tenant_user tu
    JOIN role r ON tu.role_id = r.id
    JOIN role_permission rp ON r.id = rp.role_id
    WHERE tu.user_id = auth.uid()
      AND tu.tenant_id = tenant_user.tenant_id
      AND rp.allow = true
  )
);

CREATE POLICY "TenantUser: update by same tenant"
ON tenant_user
FOR UPDATE
USING (
  tenant_id IN (
    SELECT tenant_id FROM tenant_user
    WHERE user_id = auth.uid()
  )
);
```

#### `role`, `role_permission`

```sql
CREATE POLICY "Role: read/write if member of tenant"
ON role
FOR ALL
USING (tenant_id IN (SELECT tenant_id FROM tenant_user WHERE user_id = auth.uid()))
WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_user WHERE user_id = auth.uid()));

CREATE POLICY "RolePermission: same tenant access"
ON role_permission
FOR ALL
USING (
  role_id IN (
    SELECT id FROM role WHERE tenant_id IN (
      SELECT tenant_id FROM tenant_user WHERE user_id = auth.uid()
    )
  )
);
```

#### `feature`, `resource`, `action` (global)

```sql
CREATE POLICY "Feature: public read"
ON feature
FOR SELECT
USING (true);

CREATE POLICY "Resource: public read"
ON resource
FOR SELECT
USING (true);

CREATE POLICY "Action: public read"
ON action
FOR SELECT
USING (true);
```

#### `package`, `package_feature`

```sql
CREATE POLICY "Package: public read"
ON package
FOR SELECT
USING (true);

CREATE POLICY "PackageFeature: public read"
ON package_feature
FOR SELECT
USING (true);
```

#### `tenant_limit`, `tenant_billing`, `audit_log`

```sql
CREATE POLICY "TenantLimit: tenant access"
ON tenant_limit
FOR ALL
USING (tenant_id IN (SELECT tenant_id FROM tenant_user WHERE user_id = auth.uid()));

CREATE POLICY "TenantBilling: tenant access"
ON tenant_billing
FOR ALL
USING (tenant_id IN (SELECT tenant_id FROM tenant_user WHERE user_id = auth.uid()));

CREATE POLICY "AuditLog: tenant access"
ON audit_log
FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM tenant_user WHERE user_id = auth.uid()));
```

---

## 🌐 API Interface (RESTful)

* `GET /tenants`: List user’s tenants
* `POST /tenants`: Create a tenant
* `GET /roles`: List roles for current tenant
* `POST /tenant-users`: Invite user to tenant
* `GET /features`: List all available features
* `GET /packages`: List subscription packages
* `GET /limits`: View limits for tenant
* `GET /billing`: View current billing status
* `GET /audit-logs`: View tenant logs

Auth is handled via Supabase JWT sessions. Each API call resolves `auth.uid()`.

---

Would you like this exported as a `.sql` or `.md` file for Supabase Studio or GitHub documentation?
