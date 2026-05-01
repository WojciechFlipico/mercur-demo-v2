import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260501103206 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "payment_milestone" ("id" text not null, "invoice_id" text not null, "order_id" text null, "label" text not null, "sequence" integer not null default 0, "percentage" integer not null, "amount" numeric not null, "currency_code" text not null default 'usd', "due_at" timestamptz null, "status" text check ("status" in ('pending', 'due', 'paid', 'cancelled')) not null default 'pending', "paid_at" timestamptz null, "notes" text null, "raw_amount" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "payment_milestone_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_payment_milestone_deleted_at" ON "payment_milestone" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "payment_milestone" cascade;`);
  }

}
