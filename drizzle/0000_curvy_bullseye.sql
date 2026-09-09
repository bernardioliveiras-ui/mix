CREATE TABLE `asaas_events` (
	`event_id` text PRIMARY KEY NOT NULL,
	`event_type` text NOT NULL,
	`payment_id` text,
	`received_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_asaas_events_payment` ON `asaas_events` (`payment_id`);--> statement-breakpoint
CREATE TABLE `auth_login_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`request_key` text NOT NULL,
	`code_hash` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`expires_at` text NOT NULL,
	`consumed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_auth_codes_email_created` ON `auth_login_codes` (`email`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_auth_codes_request_created` ON `auth_login_codes` (`request_key`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_auth_codes_expires` ON `auth_login_codes` (`expires_at`);--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_seen_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_auth_sessions_user` ON `auth_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_auth_sessions_expires` ON `auth_sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT 'seller' NOT NULL,
	`invited_by` text NOT NULL,
	`accepted_at` text,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_invitations_email_expires` ON `invitations` (`email`,`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_invitations_org_created` ON `invitations` (`organization_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `manual_progress` (
	`user_id` text PRIMARY KEY NOT NULL,
	`last_page` integer DEFAULT 1 NOT NULL,
	`completed_at` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `memberships` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`organization_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'seller' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_memberships_org_user` ON `memberships` (`organization_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `idx_memberships_user_status` ON `memberships` (`user_id`,`status`);--> statement-breakpoint
CREATE TABLE `order_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` text NOT NULL,
	`status` text NOT NULL,
	`message` text NOT NULL,
	`actor_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_order_events_order_created` ON `order_events` (`order_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`order_number` text NOT NULL,
	`organization_id` text NOT NULL,
	`created_by` text NOT NULL,
	`kit` text NOT NULL,
	`boxes` integer NOT NULL,
	`unit_price_cents` integer NOT NULL,
	`total_cents` integer NOT NULL,
	`status` text DEFAULT 'payment_pending' NOT NULL,
	`billing_type` text DEFAULT 'UNDEFINED' NOT NULL,
	`asaas_payment_id` text,
	`asaas_invoice_url` text,
	`asaas_qr_payload` text,
	`asaas_qr_image` text,
	`payment_due_date` text,
	`shipping_postal_code` text NOT NULL,
	`shipping_street` text NOT NULL,
	`shipping_number` text NOT NULL,
	`shipping_complement` text DEFAULT '' NOT NULL,
	`shipping_district` text NOT NULL,
	`shipping_city` text NOT NULL,
	`shipping_state` text NOT NULL,
	`tracking_code` text,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_orders_number` ON `orders` (`order_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_orders_asaas_payment` ON `orders` (`asaas_payment_id`);--> statement-breakpoint
CREATE INDEX `idx_orders_org_created` ON `orders` (`organization_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_orders_org_status` ON `orders` (`organization_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_orders_status_created` ON `orders` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`legal_name` text NOT NULL,
	`trade_name` text NOT NULL,
	`cpf_cnpj` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`postal_code` text DEFAULT '' NOT NULL,
	`street` text DEFAULT '' NOT NULL,
	`number` text DEFAULT '' NOT NULL,
	`complement` text DEFAULT '' NOT NULL,
	`district` text DEFAULT '' NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`state` text DEFAULT '' NOT NULL,
	`asaas_customer_id` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_organizations_cpf_cnpj` ON `organizations` (`cpf_cnpj`);--> statement-breakpoint
CREATE INDEX `idx_organizations_status` ON `organizations` (`status`);--> statement-breakpoint
CREATE TABLE `reseller_movements` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`recorded_by` text NOT NULL,
	`type` text NOT NULL,
	`boxes` integer NOT NULL,
	`unit_value_cents` integer DEFAULT 0 NOT NULL,
	`total_value_cents` integer DEFAULT 0 NOT NULL,
	`channel` text DEFAULT 'other' NOT NULL,
	`reference` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`occurred_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recorded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_reseller_movements_org_date` ON `reseller_movements` (`organization_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `idx_reseller_movements_type_date` ON `reseller_movements` (`type`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`system_role` text DEFAULT 'member' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`onboarding_status` text DEFAULT 'profile' NOT NULL,
	`email_verified_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_email` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_users_status` ON `users` (`status`);
--> statement-breakpoint
PRAGMA optimize;
