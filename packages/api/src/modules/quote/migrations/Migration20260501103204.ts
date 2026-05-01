import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260501103204 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "quote" ("id" text not null, "buyer_email" text not null, "buyer_name" text null, "buyer_company" text null, "status" text check ("status" in ('requested', 'quoted', 'accepted', 'rejected', 'expired')) not null default 'requested', "seller_id" text null, "total_amount" numeric null, "currency_code" text not null default 'usd', "notes" text null, "seller_notes" text null, "valid_until" timestamptz null, "responded_at" timestamptz null, "accepted_at" timestamptz null, "order_id" text null, "raw_total_amount" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "quote_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_quote_deleted_at" ON "quote" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "quote_item" ("id" text not null, "product_id" text null, "variant_id" text null, "title" text not null, "description" text null, "quantity" integer not null, "target_unit_price" numeric null, "unit_price" numeric null, "lead_time_days" integer null, "notes" text null, "quote_id" text not null, "raw_target_unit_price" jsonb null, "raw_unit_price" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "quote_item_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_quote_item_quote_id" ON "quote_item" ("quote_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_quote_item_deleted_at" ON "quote_item" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "quote_item" add constraint "quote_item_quote_id_foreign" foreign key ("quote_id") references "quote" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "quote_item" drop constraint if exists "quote_item_quote_id_foreign";`);

    this.addSql(`drop table if exists "quote" cascade;`);

    this.addSql(`drop table if exists "quote_item" cascade;`);
  }

}
