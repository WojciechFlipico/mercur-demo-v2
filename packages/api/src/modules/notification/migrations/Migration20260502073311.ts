import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260502073311 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "app_notification" ("id" text not null, "recipient_type" text check ("recipient_type" in ('customer', 'seller', 'user')) not null, "recipient_id" text not null, "kind" text not null, "title" text not null, "body" text null, "link" text null, "payload" jsonb null, "read_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "app_notification_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_app_notification_deleted_at" ON "app_notification" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "app_notification" cascade;`);
  }

}
