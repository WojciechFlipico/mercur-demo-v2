import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260501182701 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "quote" add column if not exists "requested_by_customer_id" text null, add column if not exists "buyer_org_id" text null, add column if not exists "approval_status" text check ("approval_status" in ('not_required', 'pending', 'approved', 'rejected')) not null default 'not_required', add column if not exists "approval_requested_at" timestamptz null, add column if not exists "approved_by_customer_id" text null, add column if not exists "approved_at" timestamptz null, add column if not exists "approval_note" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "quote" drop column if exists "requested_by_customer_id", drop column if exists "buyer_org_id", drop column if exists "approval_status", drop column if exists "approval_requested_at", drop column if exists "approved_by_customer_id", drop column if exists "approved_at", drop column if exists "approval_note";`);
  }

}
