ALTER TABLE persons ADD COLUMN curp VARCHAR(18);
ALTER TABLE persons ADD CONSTRAINT uq_persons_curp_tenant UNIQUE (curp, tenant_id);
