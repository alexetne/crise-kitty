CREATE TYPE "user_status" AS ENUM (
  'active',
  'suspended',
  'disabled',
  'archived'
);

CREATE TYPE "membership_status" AS ENUM (
  'active',
  'suspended',
  'left'
);

CREATE TYPE "invitation_status" AS ENUM (
  'pending',
  'accepted',
  'revoked',
  'expired'
);

CREATE TYPE "auth_provider" AS ENUM (
  'local',
  'google',
  'microsoft',
  'sso'
);

CREATE TYPE "mfa_method_type" AS ENUM (
  'totp_app',
  'sms'
);

CREATE TYPE "mfa_method_status" AS ENUM (
  'pending',
  'active',
  'disabled'
);

CREATE TYPE "mfa_challenge_status" AS ENUM (
  'pending',
  'verified',
  'expired',
  'cancelled'
);

CREATE TYPE "token_type" AS ENUM (
  'password_reset',
  'email_verification',
  'magic_login'
);

CREATE TYPE "role_scope" AS ENUM (
  'global',
  'organization'
);

CREATE TYPE "crisis_domain_status" AS ENUM (
  'active',
  'inactive',
  'archived'
);

CREATE TYPE "scenario_status" AS ENUM (
  'draft',
  'review',
  'published',
  'archived'
);

CREATE TYPE "scenario_visibility" AS ENUM (
  'private',
  'organization',
  'public_catalog'
);

CREATE TYPE "scenario_mode" AS ENUM (
  'scripted',
  'hybrid',
  'ai'
);

CREATE TYPE "difficulty_level" AS ENUM (
  'very_easy',
  'easy',
  'medium',
  'hard',
  'expert',
  'custom'
);

CREATE TYPE "scenario_variable_type" AS ENUM (
  'integer',
  'decimal',
  'boolean',
  'text',
  'json'
);

CREATE TYPE "resource_type" AS ENUM (
  'document',
  'image',
  'video',
  'audio',
  'link',
  'file',
  'template'
);

CREATE TYPE "actor_role_type" AS ENUM (
  'facilitator',
  'participant',
  'observer',
  'npc',
  'authority',
  'media',
  'stakeholder'
);

CREATE TYPE "node_type" AS ENUM (
  'start',
  'narrative',
  'decision',
  'incident',
  'consequence',
  'checkpoint',
  'end_success',
  'end_failure',
  'end_neutral'
);

CREATE TYPE "choice_type" AS ENUM (
  'single',
  'multiple',
  'hidden',
  'timed',
  'automatic'
);

CREATE TYPE "transition_type" AS ENUM (
  'manual',
  'automatic',
  'conditional',
  'scheduled'
);

CREATE TYPE "condition_operator" AS ENUM (
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'not_in',
  'contains',
  'not_contains',
  'is_true',
  'is_false',
  'changed'
);

CREATE TYPE "inject_type" AS ENUM (
  'email',
  'call',
  'media',
  'alert',
  'message',
  'social_post',
  'authority_notice',
  'document',
  'custom'
);

CREATE TYPE "inject_channel" AS ENUM (
  'email',
  'phone',
  'dashboard',
  'chat',
  'press',
  'social_network',
  'siren',
  'official_letter',
  'custom'
);

CREATE TYPE "inject_priority" AS ENUM (
  'low',
  'medium',
  'high',
  'critical'
);

CREATE TYPE "trigger_type" AS ENUM (
  'manual',
  'automatic',
  'scheduled',
  'conditional'
);

CREATE TYPE "trigger_source" AS ENUM (
  'timeline',
  'player_choice',
  'facilitator_action',
  'rule_engine',
  'system'
);

CREATE TYPE "rule_action_type" AS ENUM (
  'set_variable',
  'increment_variable',
  'decrement_variable',
  'activate_edge',
  'deactivate_edge',
  'unlock_choice',
  'lock_choice',
  'trigger_inject',
  'set_node',
  'set_status',
  'add_tag',
  'remove_tag',
  'end_scenario'
);

CREATE TYPE "session_status" AS ENUM (
  'planned',
  'running',
  'paused',
  'completed',
  'cancelled',
  'archived'
);

CREATE TYPE "session_participant_role" AS ENUM (
  'facilitator',
  'participant',
  'observer',
  'evaluator'
);

CREATE TYPE "session_event_type" AS ENUM (
  'session_started',
  'session_paused',
  'session_resumed',
  'session_ended',
  'node_entered',
  'choice_made',
  'inject_triggered',
  'rule_triggered',
  'variable_changed',
  'consequence_applied',
  'checkpoint_reached',
  'note_added'
);

CREATE TABLE "users" (
  "id" uuid PRIMARY KEY NOT NULL,
  "email" varchar(255) UNIQUE NOT NULL,
  "first_name" varchar(100) NOT NULL,
  "last_name" varchar(100) NOT NULL,
  "display_name" varchar(150),
  "phone" varchar(30),
  "avatar_url" text,
  "status" user_status NOT NULL DEFAULT 'active',
  "email_verified_at" timestamptz,
  "last_login_at" timestamptz,
  "last_seen_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now()),
  "deleted_at" timestamptz
);

CREATE TABLE "user_identities" (
  "id" uuid PRIMARY KEY NOT NULL,
  "user_id" uuid NOT NULL,
  "provider" auth_provider NOT NULL,
  "provider_user_id" varchar(255),
  "password_hash" text,
  "is_primary" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "organizations" (
  "id" uuid PRIMARY KEY NOT NULL,
  "name" varchar(150) NOT NULL,
  "slug" varchar(150) UNIQUE NOT NULL,
  "description" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now()),
  "deleted_at" timestamptz
);

CREATE TABLE "organization_members" (
  "id" uuid PRIMARY KEY NOT NULL,
  "organization_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "job_title" varchar(100),
  "department" varchar(100),
  "status" membership_status NOT NULL DEFAULT 'active',
  "joined_at" timestamptz NOT NULL DEFAULT (now()),
  "left_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now()),
  "deleted_at" timestamptz
);

CREATE TABLE "organization_invitations" (
  "id" uuid PRIMARY KEY NOT NULL,
  "organization_id" uuid NOT NULL,
  "email" varchar(255) NOT NULL,
  "invited_user_id" uuid,
  "invited_by_user_id" uuid NOT NULL,
  "status" invitation_status NOT NULL DEFAULT 'pending',
  "expires_at" timestamptz NOT NULL,
  "accepted_at" timestamptz,
  "revoked_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "roles" (
  "id" uuid PRIMARY KEY NOT NULL,
  "code" varchar(50) UNIQUE NOT NULL,
  "name" varchar(100) NOT NULL,
  "scope" role_scope NOT NULL,
  "description" text,
  "is_system" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "permissions" (
  "id" uuid PRIMARY KEY NOT NULL,
  "code" varchar(100) UNIQUE NOT NULL,
  "name" varchar(150) NOT NULL,
  "description" text,
  "resource" varchar(100) NOT NULL,
  "action" varchar(50) NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "role_permissions" (
  "role_id" uuid NOT NULL,
  "permission_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  PRIMARY KEY ("role_id", "permission_id")
);

CREATE TABLE "user_global_roles" (
  "id" uuid PRIMARY KEY NOT NULL,
  "user_id" uuid NOT NULL,
  "role_id" uuid NOT NULL,
  "assigned_by_user_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "organization_member_roles" (
  "id" uuid PRIMARY KEY NOT NULL,
  "organization_member_id" uuid NOT NULL,
  "role_id" uuid NOT NULL,
  "assigned_by_user_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "user_sessions" (
  "id" uuid PRIMARY KEY NOT NULL,
  "user_id" uuid NOT NULL,
  "user_identity_id" uuid,
  "refresh_token_hash" text NOT NULL,
  "ip_address" inet,
  "user_agent" text,
  "expires_at" timestamptz NOT NULL,
  "revoked_at" timestamptz,
  "last_used_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "auth_tokens" (
  "id" uuid PRIMARY KEY NOT NULL,
  "user_id" uuid NOT NULL,
  "user_identity_id" uuid,
  "token_hash" text NOT NULL,
  "token_type" token_type NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "used_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "user_mfa_methods" (
  "id" uuid PRIMARY KEY NOT NULL,
  "user_id" uuid NOT NULL,
  "method_type" mfa_method_type NOT NULL,
  "status" mfa_method_status NOT NULL DEFAULT 'pending',
  "label" varchar(100),
  "phone" varchar(30),
  "secret" text,
  "code_hash" text,
  "code_expires_at" timestamptz,
  "last_used_at" timestamptz,
  "is_primary" boolean NOT NULL DEFAULT false,
  "verified_at" timestamptz,
  "disabled_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "auth_mfa_challenges" (
  "id" uuid PRIMARY KEY NOT NULL,
  "user_id" uuid NOT NULL,
  "mfa_method_id" uuid NOT NULL,
  "challenge_code_hash" text,
  "status" mfa_challenge_status NOT NULL DEFAULT 'pending',
  "expires_at" timestamptz NOT NULL,
  "verified_at" timestamptz,
  "cancelled_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "user_audit_logs" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "user_id" uuid,
  "actor_user_id" uuid,
  "organization_id" uuid,
  "event_type" varchar(100) NOT NULL,
  "event_data" jsonb,
  "ip_address" inet,
  "user_agent" text,
  "created_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "crisis_domains" (
  "id" uuid PRIMARY KEY NOT NULL,
  "code" varchar(50) UNIQUE NOT NULL,
  "name" varchar(150) NOT NULL,
  "description" text,
  "status" crisis_domain_status NOT NULL DEFAULT 'active',
  "default_severity" smallint NOT NULL DEFAULT 1,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "crisis_types" (
  "id" uuid PRIMARY KEY NOT NULL,
  "crisis_domain_id" uuid NOT NULL,
  "code" varchar(50) NOT NULL,
  "name" varchar(150) NOT NULL,
  "description" text,
  "default_severity" smallint NOT NULL DEFAULT 1,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "crisis_subtypes" (
  "id" uuid PRIMARY KEY NOT NULL,
  "crisis_type_id" uuid NOT NULL,
  "code" varchar(50) NOT NULL,
  "name" varchar(150) NOT NULL,
  "description" text,
  "default_severity" smallint NOT NULL DEFAULT 1,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "classification_tags" (
  "id" uuid PRIMARY KEY NOT NULL,
  "code" varchar(50) UNIQUE NOT NULL,
  "label" varchar(100) NOT NULL,
  "category" varchar(100),
  "description" text,
  "color" varchar(20),
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "scenarios" (
  "id" uuid PRIMARY KEY NOT NULL,
  "organization_id" uuid,
  "crisis_domain_id" uuid NOT NULL,
  "crisis_type_id" uuid,
  "crisis_subtype_id" uuid,
  "code" varchar(50) UNIQUE NOT NULL,
  "title" varchar(200) NOT NULL,
  "summary" text,
  "business_category" varchar(100),
  "status" scenario_status NOT NULL DEFAULT 'draft',
  "visibility" scenario_visibility NOT NULL DEFAULT 'private',
  "mode" scenario_mode NOT NULL DEFAULT 'scripted',
  "default_difficulty" difficulty_level NOT NULL DEFAULT 'medium',
  "min_duration_minutes" int,
  "max_duration_minutes" int,
  "recommended_duration_minutes" int,
  "min_participants" int,
  "max_participants" int,
  "current_version_id" uuid,
  "created_by_user_id" uuid,
  "updated_by_user_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now()),
  "archived_at" timestamptz
);

CREATE TABLE "scenario_versions" (
  "id" uuid PRIMARY KEY NOT NULL,
  "scenario_id" uuid NOT NULL,
  "version_number" int NOT NULL,
  "label" varchar(100),
  "status" scenario_status NOT NULL DEFAULT 'draft',
  "is_published" boolean NOT NULL DEFAULT false,
  "is_archived" boolean NOT NULL DEFAULT false,
  "content_summary" text,
  "facilitator_notes" text,
  "balancing_profile" varchar(100),
  "created_by_user_id" uuid,
  "published_by_user_id" uuid,
  "published_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "scenario_tag_links" (
  "scenario_id" uuid NOT NULL,
  "tag_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  PRIMARY KEY ("scenario_id", "tag_id")
);

CREATE TABLE "scenario_learning_objectives" (
  "id" uuid PRIMARY KEY NOT NULL,
  "scenario_version_id" uuid NOT NULL,
  "title" varchar(200) NOT NULL,
  "description" text,
  "sort_order" int NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "scenario_difficulty_profiles" (
  "id" uuid PRIMARY KEY NOT NULL,
  "scenario_version_id" uuid NOT NULL,
  "code" varchar(50) NOT NULL,
  "label" varchar(100) NOT NULL,
  "difficulty" difficulty_level NOT NULL,
  "description" text,
  "settings" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "scenario_duration_profiles" (
  "id" uuid PRIMARY KEY NOT NULL,
  "scenario_version_id" uuid NOT NULL,
  "code" varchar(50) NOT NULL,
  "label" varchar(100) NOT NULL,
  "duration_minutes" int NOT NULL,
  "description" text,
  "settings" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "scenario_balancing_profiles" (
  "id" uuid PRIMARY KEY NOT NULL,
  "scenario_version_id" uuid NOT NULL,
  "code" varchar(50) NOT NULL,
  "label" varchar(100) NOT NULL,
  "description" text,
  "settings" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "scenario_variables" (
  "id" uuid PRIMARY KEY NOT NULL,
  "scenario_version_id" uuid NOT NULL,
  "code" varchar(100) NOT NULL,
  "name" varchar(150) NOT NULL,
  "variable_type" scenario_variable_type NOT NULL,
  "default_value" jsonb,
  "min_value" numeric(14,4),
  "max_value" numeric(14,4),
  "visibility" varchar(30) NOT NULL DEFAULT 'facilitator',
  "is_runtime" boolean NOT NULL DEFAULT true,
  "is_ai_managed" boolean NOT NULL DEFAULT false,
  "description" text,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "scenario_resources" (
  "id" uuid PRIMARY KEY NOT NULL,
  "scenario_version_id" uuid NOT NULL,
  "code" varchar(100) NOT NULL,
  "name" varchar(150) NOT NULL,
  "resource_type" resource_type NOT NULL,
  "description" text,
  "content" text,
  "file_url" text,
  "metadata" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "scenario_actors" (
  "id" uuid PRIMARY KEY NOT NULL,
  "scenario_version_id" uuid NOT NULL,
  "code" varchar(100) NOT NULL,
  "name" varchar(150) NOT NULL,
  "actor_role" actor_role_type NOT NULL,
  "description" text,
  "persona" jsonb,
  "default_stress_level" smallint,
  "default_influence_level" smallint,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "scenario_structures" (
  "id" uuid PRIMARY KEY NOT NULL,
  "scenario_version_id" uuid UNIQUE NOT NULL,
  "name" varchar(150) NOT NULL,
  "description" text,
  "start_node_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "scenario_nodes" (
  "id" uuid PRIMARY KEY NOT NULL,
  "scenario_structure_id" uuid NOT NULL,
  "code" varchar(100) NOT NULL,
  "title" varchar(150) NOT NULL,
  "node_type" node_type NOT NULL,
  "narrative_content" text,
  "facilitator_notes" text,
  "incident_severity" smallint,
  "time_limit_seconds" int,
  "is_start" boolean NOT NULL DEFAULT false,
  "is_active" boolean NOT NULL DEFAULT true,
  "sort_order" int NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "node_resources" (
  "node_id" uuid NOT NULL,
  "resource_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  PRIMARY KEY ("node_id", "resource_id")
);

CREATE TABLE "node_actors" (
  "node_id" uuid NOT NULL,
  "actor_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  PRIMARY KEY ("node_id", "actor_id")
);

CREATE TABLE "node_choices" (
  "id" uuid PRIMARY KEY NOT NULL,
  "node_id" uuid NOT NULL,
  "code" varchar(100) NOT NULL,
  "label" varchar(200) NOT NULL,
  "description" text,
  "choice_type" choice_type NOT NULL DEFAULT 'single',
  "is_default" boolean NOT NULL DEFAULT false,
  "is_locked" boolean NOT NULL DEFAULT false,
  "unlock_condition_summary" text,
  "timeout_seconds" int,
  "sort_order" int NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "node_edges" (
  "id" uuid PRIMARY KEY NOT NULL,
  "scenario_structure_id" uuid NOT NULL,
  "source_node_id" uuid NOT NULL,
  "target_node_id" uuid NOT NULL,
  "source_choice_id" uuid,
  "code" varchar(100) NOT NULL,
  "label" varchar(150),
  "transition_type" transition_type NOT NULL DEFAULT 'manual',
  "is_enabled" boolean NOT NULL DEFAULT true,
  "is_hidden" boolean NOT NULL DEFAULT false,
  "delay_seconds" int,
  "priority" smallint NOT NULL DEFAULT 1,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "edge_conditions" (
  "id" uuid PRIMARY KEY NOT NULL,
  "edge_id" uuid NOT NULL,
  "scenario_variable_id" uuid,
  "operator" condition_operator NOT NULL,
  "expected_value" jsonb,
  "sort_order" int NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "scenario_checkpoints" (
  "id" uuid PRIMARY KEY NOT NULL,
  "scenario_version_id" uuid NOT NULL,
  "node_id" uuid,
  "code" varchar(100) NOT NULL,
  "name" varchar(150) NOT NULL,
  "description" text,
  "is_mandatory" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "checkpoint_conditions" (
  "id" uuid PRIMARY KEY NOT NULL,
  "checkpoint_id" uuid NOT NULL,
  "scenario_variable_id" uuid,
  "operator" condition_operator NOT NULL,
  "expected_value" jsonb,
  "sort_order" int NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "scenario_outcomes" (
  "id" uuid PRIMARY KEY NOT NULL,
  "scenario_version_id" uuid NOT NULL,
  "node_id" uuid,
  "code" varchar(100) NOT NULL,
  "name" varchar(150) NOT NULL,
  "description" text,
  "outcome_type" varchar(50) NOT NULL DEFAULT 'generic',
  "success_score" numeric(6,2),
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "scenario_injects" (
  "id" uuid PRIMARY KEY NOT NULL,
  "scenario_version_id" uuid NOT NULL,
  "node_id" uuid,
  "code" varchar(100) NOT NULL,
  "title" varchar(150) NOT NULL,
  "inject_type" inject_type NOT NULL,
  "channel" inject_channel NOT NULL,
  "priority" inject_priority NOT NULL DEFAULT 'medium',
  "content_text" text,
  "content_html" text,
  "is_repeatable" boolean NOT NULL DEFAULT false,
  "valid_from_offset_seconds" int,
  "valid_until_offset_seconds" int,
  "metadata" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "inject_resources" (
  "inject_id" uuid NOT NULL,
  "resource_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  PRIMARY KEY ("inject_id", "resource_id")
);

CREATE TABLE "inject_triggers" (
  "id" uuid PRIMARY KEY NOT NULL,
  "inject_id" uuid NOT NULL,
  "trigger_type" trigger_type NOT NULL,
  "trigger_source" trigger_source NOT NULL,
  "offset_seconds" int,
  "cron_expression" varchar(100),
  "source_node_id" uuid,
  "source_choice_id" uuid,
  "is_active" boolean NOT NULL DEFAULT true,
  "priority" smallint NOT NULL DEFAULT 1,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "inject_trigger_conditions" (
  "id" uuid PRIMARY KEY NOT NULL,
  "inject_trigger_id" uuid NOT NULL,
  "scenario_variable_id" uuid,
  "operator" condition_operator NOT NULL,
  "expected_value" jsonb,
  "sort_order" int NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "inject_effects" (
  "id" uuid PRIMARY KEY NOT NULL,
  "inject_id" uuid NOT NULL,
  "effect_type" rule_action_type NOT NULL,
  "target_type" varchar(50) NOT NULL,
  "target_id" uuid,
  "payload" jsonb,
  "sort_order" int NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "scenario_rules" (
  "id" uuid PRIMARY KEY NOT NULL,
  "scenario_version_id" uuid NOT NULL,
  "code" varchar(100) NOT NULL,
  "name" varchar(150) NOT NULL,
  "description" text,
  "priority" smallint NOT NULL DEFAULT 1,
  "is_active" boolean NOT NULL DEFAULT true,
  "is_system" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "rule_conditions" (
  "id" uuid PRIMARY KEY NOT NULL,
  "rule_id" uuid NOT NULL,
  "scenario_variable_id" uuid,
  "operator" condition_operator NOT NULL,
  "expected_value" jsonb,
  "sort_order" int NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "rule_actions" (
  "id" uuid PRIMARY KEY NOT NULL,
  "rule_id" uuid NOT NULL,
  "action_type" rule_action_type NOT NULL,
  "target_type" varchar(50) NOT NULL,
  "target_id" uuid,
  "payload" jsonb,
  "sort_order" int NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "simulation_sessions" (
  "id" uuid PRIMARY KEY NOT NULL,
  "scenario_version_id" uuid NOT NULL,
  "organization_id" uuid,
  "code" varchar(50) UNIQUE NOT NULL,
  "title" varchar(200) NOT NULL,
  "status" session_status NOT NULL DEFAULT 'planned',
  "selected_difficulty" difficulty_level,
  "duration_profile_code" varchar(50),
  "balancing_profile_code" varchar(50),
  "started_at" timestamptz,
  "paused_at" timestamptz,
  "ended_at" timestamptz,
  "current_time_seconds" int NOT NULL DEFAULT 0,
  "current_node_id" uuid,
  "engine_state" jsonb,
  "random_seed" varchar(100),
  "created_by_user_id" uuid,
  "facilitator_user_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "simulation_session_participants" (
  "id" uuid PRIMARY KEY NOT NULL,
  "simulation_session_id" uuid NOT NULL,
  "user_id" uuid,
  "organization_member_id" uuid,
  "role_in_session" session_participant_role NOT NULL DEFAULT 'participant',
  "assigned_actor_id" uuid,
  "assigned_role_label" varchar(100),
  "joined_at" timestamptz,
  "left_at" timestamptz,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "simulation_state_variables" (
  "id" uuid PRIMARY KEY NOT NULL,
  "simulation_session_id" uuid NOT NULL,
  "scenario_variable_id" uuid NOT NULL,
  "current_value" jsonb,
  "last_changed_at" timestamptz,
  "last_changed_by_user_id" uuid,
  "last_change_source" varchar(50),
  "created_at" timestamptz NOT NULL DEFAULT (now()),
  "updated_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "simulation_variable_history" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "simulation_state_variable_id" uuid NOT NULL,
  "old_value" jsonb,
  "new_value" jsonb,
  "change_reason" varchar(100),
  "changed_by_user_id" uuid,
  "changed_by_rule_id" uuid,
  "changed_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "simulation_session_events" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "simulation_session_id" uuid NOT NULL,
  "event_type" session_event_type NOT NULL,
  "node_id" uuid,
  "actor_user_id" uuid,
  "participant_id" uuid,
  "payload" jsonb,
  "occurred_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "simulation_choice_history" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "simulation_session_id" uuid NOT NULL,
  "node_id" uuid NOT NULL,
  "choice_id" uuid NOT NULL,
  "participant_id" uuid,
  "chosen_at" timestamptz NOT NULL DEFAULT (now()),
  "payload" jsonb
);

CREATE TABLE "simulation_inject_history" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "simulation_session_id" uuid NOT NULL,
  "inject_id" uuid NOT NULL,
  "trigger_id" uuid,
  "triggered_by_user_id" uuid,
  "triggered_at" timestamptz NOT NULL DEFAULT (now()),
  "delivery_status" varchar(50) NOT NULL DEFAULT 'triggered',
  "payload" jsonb
);

CREATE TABLE "simulation_rule_history" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "simulation_session_id" uuid NOT NULL,
  "rule_id" uuid NOT NULL,
  "triggered_at" timestamptz NOT NULL DEFAULT (now()),
  "was_applied" boolean NOT NULL DEFAULT true,
  "result_payload" jsonb
);

CREATE TABLE "simulation_consequence_history" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "simulation_session_id" uuid NOT NULL,
  "source_type" varchar(50) NOT NULL,
  "source_id" uuid,
  "consequence_type" rule_action_type NOT NULL,
  "target_type" varchar(50) NOT NULL,
  "target_id" uuid,
  "payload" jsonb,
  "applied_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE INDEX ON "users" ("email");

CREATE INDEX ON "users" ("status");

CREATE INDEX ON "users" ("last_login_at");

CREATE INDEX ON "user_identities" ("user_id");

CREATE UNIQUE INDEX ON "user_identities" ("provider", "provider_user_id");

CREATE UNIQUE INDEX ON "user_identities" ("user_id", "provider");

CREATE INDEX ON "organizations" ("slug");

CREATE INDEX ON "organizations" ("is_active");

CREATE UNIQUE INDEX ON "organization_members" ("organization_id", "user_id");

CREATE INDEX ON "organization_members" ("organization_id");

CREATE INDEX ON "organization_members" ("user_id");

CREATE INDEX ON "organization_members" ("status");

CREATE INDEX ON "organization_invitations" ("organization_id");

CREATE INDEX ON "organization_invitations" ("email");

CREATE INDEX ON "organization_invitations" ("status");

CREATE INDEX ON "organization_invitations" ("expires_at");

CREATE INDEX ON "roles" ("code");

CREATE INDEX ON "roles" ("scope");

CREATE INDEX ON "permissions" ("code");

CREATE UNIQUE INDEX ON "permissions" ("resource", "action");

CREATE INDEX ON "role_permissions" ("permission_id");

CREATE UNIQUE INDEX ON "user_global_roles" ("user_id", "role_id");

CREATE INDEX ON "user_global_roles" ("user_id");

CREATE INDEX ON "user_global_roles" ("role_id");

CREATE UNIQUE INDEX ON "organization_member_roles" ("organization_member_id", "role_id");

CREATE INDEX ON "organization_member_roles" ("organization_member_id");

CREATE INDEX ON "organization_member_roles" ("role_id");

CREATE INDEX ON "user_sessions" ("user_id");

CREATE INDEX ON "user_sessions" ("user_identity_id");

CREATE INDEX ON "user_sessions" ("expires_at");

CREATE INDEX ON "auth_tokens" ("user_id");

CREATE INDEX ON "auth_tokens" ("user_identity_id");

CREATE INDEX ON "auth_tokens" ("token_type");

CREATE INDEX ON "auth_tokens" ("expires_at");

CREATE INDEX ON "user_mfa_methods" ("user_id");

CREATE INDEX ON "user_mfa_methods" ("method_type");

CREATE INDEX ON "user_mfa_methods" ("status");

CREATE INDEX ON "user_mfa_methods" ("code_expires_at");

CREATE UNIQUE INDEX ON "user_mfa_methods" ("user_id", "method_type", "label");

CREATE INDEX ON "auth_mfa_challenges" ("user_id");

CREATE INDEX ON "auth_mfa_challenges" ("mfa_method_id");

CREATE INDEX ON "auth_mfa_challenges" ("status");

CREATE INDEX ON "auth_mfa_challenges" ("expires_at");

CREATE INDEX ON "user_audit_logs" ("user_id");

CREATE INDEX ON "user_audit_logs" ("actor_user_id");

CREATE INDEX ON "user_audit_logs" ("organization_id");

CREATE INDEX ON "user_audit_logs" ("event_type");

CREATE INDEX ON "user_audit_logs" ("created_at");

CREATE INDEX ON "crisis_domains" ("code");

CREATE INDEX ON "crisis_domains" ("status");

CREATE INDEX ON "crisis_types" ("crisis_domain_id");

CREATE UNIQUE INDEX ON "crisis_types" ("crisis_domain_id", "code");

CREATE INDEX ON "crisis_types" ("is_active");

CREATE INDEX ON "crisis_subtypes" ("crisis_type_id");

CREATE UNIQUE INDEX ON "crisis_subtypes" ("crisis_type_id", "code");

CREATE INDEX ON "crisis_subtypes" ("is_active");

CREATE INDEX ON "classification_tags" ("code");

CREATE INDEX ON "classification_tags" ("category");

CREATE INDEX ON "classification_tags" ("is_active");

CREATE INDEX ON "scenarios" ("code");

CREATE INDEX ON "scenarios" ("organization_id");

CREATE INDEX ON "scenarios" ("crisis_domain_id");

CREATE INDEX ON "scenarios" ("status");

CREATE INDEX ON "scenarios" ("visibility");

CREATE INDEX ON "scenarios" ("mode");

CREATE INDEX ON "scenario_versions" ("scenario_id");

CREATE UNIQUE INDEX ON "scenario_versions" ("scenario_id", "version_number");

CREATE INDEX ON "scenario_versions" ("status");

CREATE INDEX ON "scenario_versions" ("is_published");

CREATE INDEX ON "scenario_tag_links" ("tag_id");

CREATE INDEX ON "scenario_learning_objectives" ("scenario_version_id");

CREATE INDEX ON "scenario_learning_objectives" ("sort_order");

CREATE INDEX ON "scenario_difficulty_profiles" ("scenario_version_id");

CREATE UNIQUE INDEX ON "scenario_difficulty_profiles" ("scenario_version_id", "code");

CREATE INDEX ON "scenario_duration_profiles" ("scenario_version_id");

CREATE UNIQUE INDEX ON "scenario_duration_profiles" ("scenario_version_id", "code");

CREATE INDEX ON "scenario_balancing_profiles" ("scenario_version_id");

CREATE UNIQUE INDEX ON "scenario_balancing_profiles" ("scenario_version_id", "code");

CREATE INDEX ON "scenario_variables" ("scenario_version_id");

CREATE UNIQUE INDEX ON "scenario_variables" ("scenario_version_id", "code");

CREATE INDEX ON "scenario_variables" ("visibility");

CREATE INDEX ON "scenario_resources" ("scenario_version_id");

CREATE UNIQUE INDEX ON "scenario_resources" ("scenario_version_id", "code");

CREATE INDEX ON "scenario_resources" ("resource_type");

CREATE INDEX ON "scenario_actors" ("scenario_version_id");

CREATE UNIQUE INDEX ON "scenario_actors" ("scenario_version_id", "code");

CREATE INDEX ON "scenario_actors" ("actor_role");

CREATE INDEX ON "scenario_structures" ("scenario_version_id");

CREATE INDEX ON "scenario_nodes" ("scenario_structure_id");

CREATE UNIQUE INDEX ON "scenario_nodes" ("scenario_structure_id", "code");

CREATE INDEX ON "scenario_nodes" ("node_type");

CREATE INDEX ON "scenario_nodes" ("is_start");

CREATE INDEX ON "scenario_nodes" ("is_active");

CREATE INDEX ON "node_resources" ("resource_id");

CREATE INDEX ON "node_actors" ("actor_id");

CREATE INDEX ON "node_choices" ("node_id");

CREATE UNIQUE INDEX ON "node_choices" ("node_id", "code");

CREATE INDEX ON "node_choices" ("choice_type");

CREATE INDEX ON "node_choices" ("sort_order");

CREATE INDEX ON "node_edges" ("scenario_structure_id");

CREATE INDEX ON "node_edges" ("source_node_id");

CREATE INDEX ON "node_edges" ("target_node_id");

CREATE INDEX ON "node_edges" ("source_choice_id");

CREATE UNIQUE INDEX ON "node_edges" ("scenario_structure_id", "code");

CREATE INDEX ON "node_edges" ("is_enabled");

CREATE INDEX ON "edge_conditions" ("edge_id");

CREATE INDEX ON "edge_conditions" ("scenario_variable_id");

CREATE INDEX ON "edge_conditions" ("sort_order");

CREATE INDEX ON "scenario_checkpoints" ("scenario_version_id");

CREATE INDEX ON "scenario_checkpoints" ("node_id");

CREATE UNIQUE INDEX ON "scenario_checkpoints" ("scenario_version_id", "code");

CREATE INDEX ON "checkpoint_conditions" ("checkpoint_id");

CREATE INDEX ON "checkpoint_conditions" ("scenario_variable_id");

CREATE INDEX ON "checkpoint_conditions" ("sort_order");

CREATE INDEX ON "scenario_outcomes" ("scenario_version_id");

CREATE INDEX ON "scenario_outcomes" ("node_id");

CREATE UNIQUE INDEX ON "scenario_outcomes" ("scenario_version_id", "code");

CREATE INDEX ON "scenario_injects" ("scenario_version_id");

CREATE INDEX ON "scenario_injects" ("node_id");

CREATE UNIQUE INDEX ON "scenario_injects" ("scenario_version_id", "code");

CREATE INDEX ON "scenario_injects" ("inject_type");

CREATE INDEX ON "scenario_injects" ("channel");

CREATE INDEX ON "inject_resources" ("resource_id");

CREATE INDEX ON "inject_triggers" ("inject_id");

CREATE INDEX ON "inject_triggers" ("trigger_type");

CREATE INDEX ON "inject_triggers" ("trigger_source");

CREATE INDEX ON "inject_triggers" ("is_active");

CREATE INDEX ON "inject_trigger_conditions" ("inject_trigger_id");

CREATE INDEX ON "inject_trigger_conditions" ("scenario_variable_id");

CREATE INDEX ON "inject_trigger_conditions" ("sort_order");

CREATE INDEX ON "inject_effects" ("inject_id");

CREATE INDEX ON "inject_effects" ("effect_type");

CREATE INDEX ON "inject_effects" ("sort_order");

CREATE INDEX ON "scenario_rules" ("scenario_version_id");

CREATE UNIQUE INDEX ON "scenario_rules" ("scenario_version_id", "code");

CREATE INDEX ON "scenario_rules" ("priority");

CREATE INDEX ON "scenario_rules" ("is_active");

CREATE INDEX ON "scenario_rules" ("is_system");

CREATE INDEX ON "rule_conditions" ("rule_id");

CREATE INDEX ON "rule_conditions" ("scenario_variable_id");

CREATE INDEX ON "rule_conditions" ("sort_order");

CREATE INDEX ON "rule_actions" ("rule_id");

CREATE INDEX ON "rule_actions" ("action_type");

CREATE INDEX ON "rule_actions" ("sort_order");

CREATE INDEX ON "simulation_sessions" ("code");

CREATE INDEX ON "simulation_sessions" ("scenario_version_id");

CREATE INDEX ON "simulation_sessions" ("organization_id");

CREATE INDEX ON "simulation_sessions" ("status");

CREATE INDEX ON "simulation_sessions" ("started_at");

CREATE INDEX ON "simulation_sessions" ("ended_at");

CREATE INDEX ON "simulation_session_participants" ("simulation_session_id");

CREATE INDEX ON "simulation_session_participants" ("user_id");

CREATE INDEX ON "simulation_session_participants" ("organization_member_id");

CREATE INDEX ON "simulation_session_participants" ("role_in_session");

CREATE INDEX ON "simulation_session_participants" ("is_active");

CREATE INDEX ON "simulation_state_variables" ("simulation_session_id");

CREATE INDEX ON "simulation_state_variables" ("scenario_variable_id");

CREATE UNIQUE INDEX ON "simulation_state_variables" ("simulation_session_id", "scenario_variable_id");

CREATE INDEX ON "simulation_state_variables" ("last_changed_at");

CREATE INDEX ON "simulation_variable_history" ("simulation_state_variable_id");

CREATE INDEX ON "simulation_variable_history" ("changed_by_user_id");

CREATE INDEX ON "simulation_variable_history" ("changed_by_rule_id");

CREATE INDEX ON "simulation_variable_history" ("changed_at");

CREATE INDEX ON "simulation_session_events" ("simulation_session_id");

CREATE INDEX ON "simulation_session_events" ("event_type");

CREATE INDEX ON "simulation_session_events" ("node_id");

CREATE INDEX ON "simulation_session_events" ("occurred_at");

CREATE INDEX ON "simulation_choice_history" ("simulation_session_id");

CREATE INDEX ON "simulation_choice_history" ("node_id");

CREATE INDEX ON "simulation_choice_history" ("choice_id");

CREATE INDEX ON "simulation_choice_history" ("participant_id");

CREATE INDEX ON "simulation_choice_history" ("chosen_at");

CREATE INDEX ON "simulation_inject_history" ("simulation_session_id");

CREATE INDEX ON "simulation_inject_history" ("inject_id");

CREATE INDEX ON "simulation_inject_history" ("trigger_id");

CREATE INDEX ON "simulation_inject_history" ("triggered_at");

CREATE INDEX ON "simulation_rule_history" ("simulation_session_id");

CREATE INDEX ON "simulation_rule_history" ("rule_id");

CREATE INDEX ON "simulation_rule_history" ("triggered_at");

CREATE INDEX ON "simulation_rule_history" ("was_applied");

CREATE INDEX ON "simulation_consequence_history" ("simulation_session_id");

CREATE INDEX ON "simulation_consequence_history" ("source_type");

CREATE INDEX ON "simulation_consequence_history" ("consequence_type");

CREATE INDEX ON "simulation_consequence_history" ("applied_at");

COMMENT ON TABLE "user_identities" IS 'Une identité par fournisseur d''authentification.
password_hash n''est utilisé que pour provider = local.
';

ALTER TABLE "user_identities" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "organization_members" ADD FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "organization_members" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "organization_invitations" ADD FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "organization_invitations" ADD FOREIGN KEY ("invited_user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "organization_invitations" ADD FOREIGN KEY ("invited_by_user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "role_permissions" ADD FOREIGN KEY ("role_id") REFERENCES "roles" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "role_permissions" ADD FOREIGN KEY ("permission_id") REFERENCES "permissions" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_global_roles" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_global_roles" ADD FOREIGN KEY ("role_id") REFERENCES "roles" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_global_roles" ADD FOREIGN KEY ("assigned_by_user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "organization_member_roles" ADD FOREIGN KEY ("organization_member_id") REFERENCES "organization_members" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "organization_member_roles" ADD FOREIGN KEY ("role_id") REFERENCES "roles" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "organization_member_roles" ADD FOREIGN KEY ("assigned_by_user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_sessions" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_sessions" ADD FOREIGN KEY ("user_identity_id") REFERENCES "user_identities" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "auth_tokens" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "auth_tokens" ADD FOREIGN KEY ("user_identity_id") REFERENCES "user_identities" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_mfa_methods" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "auth_mfa_challenges" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "auth_mfa_challenges" ADD FOREIGN KEY ("mfa_method_id") REFERENCES "user_mfa_methods" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_audit_logs" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_audit_logs" ADD FOREIGN KEY ("actor_user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_audit_logs" ADD FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "crisis_types" ADD FOREIGN KEY ("crisis_domain_id") REFERENCES "crisis_domains" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "crisis_subtypes" ADD FOREIGN KEY ("crisis_type_id") REFERENCES "crisis_types" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "scenarios" ADD FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "scenarios" ADD FOREIGN KEY ("crisis_domain_id") REFERENCES "crisis_domains" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "scenarios" ADD FOREIGN KEY ("crisis_type_id") REFERENCES "crisis_types" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "scenarios" ADD FOREIGN KEY ("crisis_subtype_id") REFERENCES "crisis_subtypes" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "scenarios" ADD FOREIGN KEY ("created_by_user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "scenarios" ADD FOREIGN KEY ("updated_by_user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "scenario_versions" ADD FOREIGN KEY ("scenario_id") REFERENCES "scenarios" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "scenario_versions" ADD FOREIGN KEY ("created_by_user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "scenario_versions" ADD FOREIGN KEY ("published_by_user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "scenario_tag_links" ADD FOREIGN KEY ("scenario_id") REFERENCES "scenarios" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "scenario_tag_links" ADD FOREIGN KEY ("tag_id") REFERENCES "classification_tags" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "scenario_learning_objectives" ADD FOREIGN KEY ("scenario_version_id") REFERENCES "scenario_versions" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "scenario_difficulty_profiles" ADD FOREIGN KEY ("scenario_version_id") REFERENCES "scenario_versions" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "scenario_duration_profiles" ADD FOREIGN KEY ("scenario_version_id") REFERENCES "scenario_versions" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "scenario_balancing_profiles" ADD FOREIGN KEY ("scenario_version_id") REFERENCES "scenario_versions" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "scenario_variables" ADD FOREIGN KEY ("scenario_version_id") REFERENCES "scenario_versions" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "scenario_resources" ADD FOREIGN KEY ("scenario_version_id") REFERENCES "scenario_versions" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "scenario_actors" ADD FOREIGN KEY ("scenario_version_id") REFERENCES "scenario_versions" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "scenario_structures" ADD FOREIGN KEY ("scenario_version_id") REFERENCES "scenario_versions" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "scenario_nodes" ADD FOREIGN KEY ("scenario_structure_id") REFERENCES "scenario_structures" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "node_resources" ADD FOREIGN KEY ("node_id") REFERENCES "scenario_nodes" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "node_resources" ADD FOREIGN KEY ("resource_id") REFERENCES "scenario_resources" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "node_actors" ADD FOREIGN KEY ("node_id") REFERENCES "scenario_nodes" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "node_actors" ADD FOREIGN KEY ("actor_id") REFERENCES "scenario_actors" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "node_choices" ADD FOREIGN KEY ("node_id") REFERENCES "scenario_nodes" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "node_edges" ADD FOREIGN KEY ("scenario_structure_id") REFERENCES "scenario_structures" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "node_edges" ADD FOREIGN KEY ("source_node_id") REFERENCES "scenario_nodes" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "node_edges" ADD FOREIGN KEY ("target_node_id") REFERENCES "scenario_nodes" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "node_edges" ADD FOREIGN KEY ("source_choice_id") REFERENCES "node_choices" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "edge_conditions" ADD FOREIGN KEY ("edge_id") REFERENCES "node_edges" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "edge_conditions" ADD FOREIGN KEY ("scenario_variable_id") REFERENCES "scenario_variables" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "scenario_checkpoints" ADD FOREIGN KEY ("scenario_version_id") REFERENCES "scenario_versions" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "scenario_checkpoints" ADD FOREIGN KEY ("node_id") REFERENCES "scenario_nodes" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "checkpoint_conditions" ADD FOREIGN KEY ("checkpoint_id") REFERENCES "scenario_checkpoints" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "checkpoint_conditions" ADD FOREIGN KEY ("scenario_variable_id") REFERENCES "scenario_variables" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "scenario_outcomes" ADD FOREIGN KEY ("scenario_version_id") REFERENCES "scenario_versions" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "scenario_outcomes" ADD FOREIGN KEY ("node_id") REFERENCES "scenario_nodes" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "scenario_injects" ADD FOREIGN KEY ("scenario_version_id") REFERENCES "scenario_versions" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "scenario_injects" ADD FOREIGN KEY ("node_id") REFERENCES "scenario_nodes" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "inject_resources" ADD FOREIGN KEY ("inject_id") REFERENCES "scenario_injects" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "inject_resources" ADD FOREIGN KEY ("resource_id") REFERENCES "scenario_resources" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "inject_triggers" ADD FOREIGN KEY ("inject_id") REFERENCES "scenario_injects" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "inject_triggers" ADD FOREIGN KEY ("source_node_id") REFERENCES "scenario_nodes" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "inject_triggers" ADD FOREIGN KEY ("source_choice_id") REFERENCES "node_choices" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "inject_trigger_conditions" ADD FOREIGN KEY ("inject_trigger_id") REFERENCES "inject_triggers" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "inject_trigger_conditions" ADD FOREIGN KEY ("scenario_variable_id") REFERENCES "scenario_variables" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "inject_effects" ADD FOREIGN KEY ("inject_id") REFERENCES "scenario_injects" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "scenario_rules" ADD FOREIGN KEY ("scenario_version_id") REFERENCES "scenario_versions" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "rule_conditions" ADD FOREIGN KEY ("rule_id") REFERENCES "scenario_rules" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "rule_conditions" ADD FOREIGN KEY ("scenario_variable_id") REFERENCES "scenario_variables" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "rule_actions" ADD FOREIGN KEY ("rule_id") REFERENCES "scenario_rules" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "simulation_sessions" ADD FOREIGN KEY ("scenario_version_id") REFERENCES "scenario_versions" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "simulation_sessions" ADD FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "simulation_sessions" ADD FOREIGN KEY ("current_node_id") REFERENCES "scenario_nodes" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "simulation_sessions" ADD FOREIGN KEY ("created_by_user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "simulation_sessions" ADD FOREIGN KEY ("facilitator_user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "simulation_session_participants" ADD FOREIGN KEY ("simulation_session_id") REFERENCES "simulation_sessions" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "simulation_session_participants" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "simulation_session_participants" ADD FOREIGN KEY ("organization_member_id") REFERENCES "organization_members" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "simulation_session_participants" ADD FOREIGN KEY ("assigned_actor_id") REFERENCES "scenario_actors" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "simulation_state_variables" ADD FOREIGN KEY ("simulation_session_id") REFERENCES "simulation_sessions" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "simulation_state_variables" ADD FOREIGN KEY ("scenario_variable_id") REFERENCES "scenario_variables" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "simulation_state_variables" ADD FOREIGN KEY ("last_changed_by_user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "simulation_variable_history" ADD FOREIGN KEY ("simulation_state_variable_id") REFERENCES "simulation_state_variables" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "simulation_variable_history" ADD FOREIGN KEY ("changed_by_user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "simulation_variable_history" ADD FOREIGN KEY ("changed_by_rule_id") REFERENCES "scenario_rules" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "simulation_session_events" ADD FOREIGN KEY ("simulation_session_id") REFERENCES "simulation_sessions" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "simulation_session_events" ADD FOREIGN KEY ("node_id") REFERENCES "scenario_nodes" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "simulation_session_events" ADD FOREIGN KEY ("actor_user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "simulation_session_events" ADD FOREIGN KEY ("participant_id") REFERENCES "simulation_session_participants" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "simulation_choice_history" ADD FOREIGN KEY ("simulation_session_id") REFERENCES "simulation_sessions" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "simulation_choice_history" ADD FOREIGN KEY ("node_id") REFERENCES "scenario_nodes" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "simulation_choice_history" ADD FOREIGN KEY ("choice_id") REFERENCES "node_choices" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "simulation_choice_history" ADD FOREIGN KEY ("participant_id") REFERENCES "simulation_session_participants" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "simulation_inject_history" ADD FOREIGN KEY ("simulation_session_id") REFERENCES "simulation_sessions" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "simulation_inject_history" ADD FOREIGN KEY ("inject_id") REFERENCES "scenario_injects" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "simulation_inject_history" ADD FOREIGN KEY ("trigger_id") REFERENCES "inject_triggers" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "simulation_inject_history" ADD FOREIGN KEY ("triggered_by_user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "simulation_rule_history" ADD FOREIGN KEY ("simulation_session_id") REFERENCES "simulation_sessions" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "simulation_rule_history" ADD FOREIGN KEY ("rule_id") REFERENCES "scenario_rules" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "simulation_consequence_history" ADD FOREIGN KEY ("simulation_session_id") REFERENCES "simulation_sessions" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "scenarios" ADD FOREIGN KEY ("current_version_id") REFERENCES "scenario_versions" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "scenario_structures" ADD FOREIGN KEY ("start_node_id") REFERENCES "scenario_nodes" ("id") DEFERRABLE INITIALLY IMMEDIATE;
