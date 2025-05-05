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

# Supabase SaaS Layer Scope - v2

## Overview

This Supabase SaaS Layer provides a robust foundation for developers and product owners to kickstart their business ideas without having to build common SaaS infrastructure from scratch. It includes core modules like multi-tenancy, feature bundling, subscription management, permissions/roles, and RLS policies.

## Core Modules

### Features

Business-specific features that are made available to tenants via packages.

* **Feature**: Represents a business capability.
* **Resource**: Represents business objects under the feature.
* **Action**: Defines what operations are allowed on each resource.

### Packages

Packages bundle features into subscription types and define limits.

* **Features**: Set of features included in the package.
* **Limits**: Constraints like rate limits, quotas.
* **Users Limit**: Max number of users per tenant.

### Tenants

Team Admins sign up and are associated with a subscription package.

* **Tenant**: Represents an organization or team.
* **Package**: Assigned subscription type.
* **Roles & Permissions**: Team Admins can create roles and set permissions to features and actions.

---

## Database Schema (SQL Migrations)

```sql
-- Features Table
create table features (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamp with time zone default now()
);

-- Resources Table
create table resources (
  id uuid primary key default gen_random_uuid(),
  feature_id uuid references features(id) on delete cascade,
  name text not null,
  created_at timestamp with time zone default now()
);

-- Actions Table
create table actions (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid references resources(id) on delete cascade,
  name text not null,
  created_at timestamp with time zone default now()
);

-- Packages Table
create table packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  user_limit int,
  rate_limit int,
  created_at timestamp with time zone default now()
);

-- Package Features Table
create table package_features (
  id uuid primary key default gen_random_uuid(),
  package_id uuid references packages(id) on delete cascade,
  feature_id uuid references features(id) on delete cascade
);

-- Tenants Table
create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  package_id uuid references packages(id),
  created_at timestamp with time zone default now()
);

-- Roles Table
create table roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  name text not null,
  created_at timestamp with time zone default now()
);

-- Role Permissions Table
create table role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid references roles(id) on delete cascade,
  action_id uuid references actions(id),
  allow boolean default true,
  created_at timestamp with time zone default now()
);

-- Users Table (mapped to auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  role_id uuid references roles(id),
  created_at timestamp with time zone default now()
);
```

---

## Supabase RLS Policies

```sql
-- Enable RLS on all tenant-based tables
alter table tenants enable row level security;
alter table roles enable row level security;
alter table role_permissions enable row level security;
alter table profiles enable row level security;

-- Example RLS Policy for Profiles
create policy "Users can view/edit their profile" on profiles
  for all
  using (auth.uid() = id);

-- RLS for tenant-scoped resources
create policy "Tenant members only" on roles
  for all
  using (exists (
    select 1 from profiles p where p.id = auth.uid() and p.tenant_id = roles.tenant_id
  ));

-- Repeat similar policies for other tables like tenants, role_permissions, etc.
```

---

## Landing Page Copywriting

### Headline:

**Build SaaS Faster with a Complete Supabase Layer**

### Subheadline:

Everything you need—multi-tenancy, roles, subscriptions, permissions, and APIs. No boilerplate.

### Features Section:

* ⚡ Instant Multi-Tenancy Setup
* 🔐 Role & Permission Control
* 🧩 Feature & Subscription Bundling
* 🚀 RLS Security Pre-configured
* 📦 Ready-to-Use Supabase Migrations

### CTA Buttons:

* **Get Started for Free**
* **View Developer Docs**

---

## Developer Docs

### 📘 Getting Started

#### 1. Clone the SaaS Layer

```bash
git clone https://github.com/your-org/supabase-saas-layer
cd supabase-saas-layer
```

#### 2. Deploy Supabase Project

Set up a Supabase project and link `.env` with your credentials.

#### 3. Run Migrations

```bash
supabase db push
```

#### 4. Setup RLS

Ensure RLS is enabled via Supabase dashboard or CLI.

#### 5. Use Auth

Signup/Login through Supabase Auth and link users to tenant via `profiles` table.

---

### 🧩 Customizing Features

1. Add features and resources in `features` and `resources` tables.
2. Define allowed actions.
3. Bundle them into a `package`.

---

### 🛠️ Assigning Roles and Permissions

Admins can create roles and map them to actions using `role_permissions`.

Use Supabase APIs to fetch feature-action matrix and apply permissions client-side or via edge functions.

---

### 🌐 API Interface (Examples)

#### GET /api/features

Returns features allowed for logged-in user.

#### POST /api/tenants

Creates a new tenant and links the user as Admin.

#### POST /api/roles

Creates role for tenant.

---

This setup provides a scalable foundation to build modern SaaS apps securely and rapidly.

---

Let me know if you'd like to generate this as a downloadable GitHub repo or PDF.
