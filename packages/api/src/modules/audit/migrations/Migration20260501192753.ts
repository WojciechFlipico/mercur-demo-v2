import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260501192753 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "audit_entry" ("id" text not null, "action" text not null, "resource_type" text not null, "resource_id" text not null, "actor_type" text check ("actor_type" in ('customer', 'user', 'seller', 'system', 'anonymous')) not null default 'system', "actor_id" text null, "actor_label" text null, "payload" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "audit_entry_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_audit_entry_deleted_at" ON "audit_entry" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "audit_entry" cascade;`);
  }

}
