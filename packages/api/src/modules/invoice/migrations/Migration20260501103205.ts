import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260501103205 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "invoice" drop constraint if exists "invoice_invoice_number_unique";`);
    this.addSql(`create table if not exists "invoice" ("id" text not null, "invoice_number" text not null, "order_id" text null, "seller_id" text null, "buyer_email" text not null, "buyer_name" text null, "buyer_company" text null, "amount_due" numeric not null, "amount_paid" numeric not null default 0, "currency_code" text not null default 'usd', "status" text check ("status" in ('draft', 'sent', 'paid', 'overdue', 'cancelled')) not null default 'draft', "issued_at" timestamptz null, "due_at" timestamptz null, "paid_at" timestamptz null, "notes" text null, "raw_amount_due" jsonb not null, "raw_amount_paid" jsonb not null default '{"value":"0","precision":20}', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "invoice_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_invoice_invoice_number_unique" ON "invoice" ("invoice_number") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_invoice_deleted_at" ON "invoice" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "invoice" cascade;`);
  }

}
