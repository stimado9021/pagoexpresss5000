-- Migration: add_multi_tenant_schema
-- Transforms PagoExpress from single-tenant to multi-tenant SaaS

-- ============================================================
-- 1. ADD tenant_id to existing tables
-- ============================================================

ALTER TABLE usuarios ADD COLUMN tenant_id INT NULL AFTER vendedor_id;
ALTER TABLE prestamos ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER id;
ALTER TABLE pagos ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER id;
ALTER TABLE historial ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER usuario_id;

-- ============================================================
-- 2. CREATE new multi-tenant tables
-- ============================================================

CREATE TABLE tenants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    subdominio VARCHAR(100) NOT NULL UNIQUE,
    logo_url VARCHAR(500) NULL,
    plan_id INT NULL,
    status ENUM('TRIAL','ACTIVE','TRIAL_EXPIRED','SUSPENDED','CANCELLED') NOT NULL DEFAULT 'TRIAL',
    trial_starts_at DATETIME NOT NULL,
    trial_ends_at DATETIME NOT NULL,
    plan_starts_at DATETIME NULL,
    plan_expires_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tenants_slug (slug),
    INDEX idx_tenants_subdominio (subdominio),
    INDEX idx_tenants_plan_id (plan_id),
    INDEX idx_tenants_status (status),
    CONSTRAINT fk_tenants_plan FOREIGN KEY (plan_id) REFERENCES planes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE planes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE,
    precio_mensual DECIMAL(10,2) NOT NULL,
    precio_anual DECIMAL(10,2) NULL,
    intervalo ENUM('MONTHLY','ANUAL') NOT NULL DEFAULT 'MONTHLY',
    description TEXT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    trial_days INT NOT NULL DEFAULT 14,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE plan_limites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plan_id INT NOT NULL,
    recurso ENUM('MAX_VENDEDORES','MAX_CLIENTES','MAX_PRESTAMOS','REPORTES_AVANZADOS','API_ACCESS','CUSTOM_BRANDING') NOT NULL,
    valor INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_plan_recurso (plan_id, recurso),
    CONSTRAINT fk_plan_limites_plan FOREIGN KEY (plan_id) REFERENCES planes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE suscripciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    plan_id INT NOT NULL,
    stripe_customer_id VARCHAR(255) NULL,
    wompi_customer_id VARCHAR(255) NULL,
    estado ENUM('PENDING','ACTIVE','PAUSED','CANCELLED','PAST_DUE') NOT NULL DEFAULT 'PENDING',
    ciclo_actual INT NOT NULL DEFAULT 1,
    renovacion_proxima DATETIME NULL,
    pagado_hasta DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_suscripciones_tenant (tenant_id),
    UNIQUE KEY uk_suscripciones_tenant (tenant_id),
    CONSTRAINT fk_suscripciones_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_suscripciones_plan FOREIGN KEY (plan_id) REFERENCES planes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE invitaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    email VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    invitado_por INT NOT NULL,
    aceptada BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_invitaciones_tenant (tenant_id),
    INDEX idx_invitaciones_token (token),
    CONSTRAINT fk_invitaciones_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE configuracion_tenant (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL UNIQUE,
    tasa_interes DECIMAL(10,2) NOT NULL DEFAULT 20.00,
    cuota_diaria_min DECIMAL(10,2) NOT NULL DEFAULT 0,
    nombre_empresa VARCHAR(200) NULL,
    logo_url VARCHAR(500) NULL,
    notificaciones TEXT NOT NULL DEFAULT '{}',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_configuracion_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 3. ADD indexes for tenant_id on existing tables
-- ============================================================

ALTER TABLE usuarios ADD INDEX idx_usuarios_tenant (tenant_id);
ALTER TABLE prestamos ADD INDEX idx_prestamos_tenant (tenant_id);
ALTER TABLE pagos ADD INDEX idx_pagos_tenant (tenant_id);
ALTER TABLE historial ADD INDEX idx_historial_tenant (tenant_id);