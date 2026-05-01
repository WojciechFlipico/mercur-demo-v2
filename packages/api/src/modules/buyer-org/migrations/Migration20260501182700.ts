import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260501182700 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "buyer_org" ("id" text not null, "name" text not null, "owner_customer_id" text not null, "approval_threshold" numeric null, "currency_code" text not null default 'usd', "notes" text null, "raw_approval_threshold" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "buyer_org_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_buyer_org_deleted_at" ON "buyer_org" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "buyer_member" ("id" text not null, "customer_id" text null, "email" text not null, "name" text null, "role" text check ("role" in ('admin', 'approver', 'buyer')) not null default 'buyer', "approval_limit" numeric null, "org_id" text not null, "raw_approval_limit" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "buyer_member_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_buyer_member_org_id" ON "buyer_member" ("org_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_buyer_member_deleted_at" ON "buyer_member" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "buyer_member" add constraint "buyer_member_org_id_foreign" foreign key ("org_id") references "buyer_org" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "buyer_member" drop constraint if exists "buyer_member_org_id_foreign";`);

    this.addSql(`drop table if exists "buyer_org" cascade;`);

    this.addSql(`drop table if exists "buyer_member" cascade;`);
  }

}
