import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

/**
 * Validates whether a string is a standard UUID.
 * @param {string} str
 * @returns {boolean}
 */
export function isUUID(str) {
  if (typeof str !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str.trim());
}

/**
 * Sanitize user email or ID for safe output logging.
 * @param {string} identifier
 * @returns {string}
 */
export function maskIdentifier(identifier) {
  if (!identifier) return '[hidden]';
  if (isUUID(identifier)) {
    return `${identifier.slice(0, 8)}...${identifier.slice(-4)}`;
  }
  const parts = identifier.split('@');
  if (parts.length === 2) {
    const name = parts[0];
    const domain = parts[1];
    const maskedName = name.length > 2 ? `${name[0]}***${name[name.length - 1]}` : '***';
    return `${maskedName}@${domain}`;
  }
  return '[identifier]';
}

/**
 * Helper to locate a target Supabase Auth user by ID or Email.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseClient
 * @param {string} targetIdentifier
 * @returns {Promise<{ user: any | null; error: string | null }>}
 */
export async function findTargetUser(supabaseClient, targetIdentifier) {
  const trimmed = targetIdentifier.trim();

  if (isUUID(trimmed)) {
    const { data, error } = await supabaseClient.auth.admin.getUserById(trimmed);
    if (error) {
      return { user: null, error: `Failed to fetch user by ID: ${error.message}` };
    }
    if (!data || !data.user) {
      return { user: null, error: `User with ID '${maskIdentifier(trimmed)}' was not found.` };
    }
    return { user: data.user, error: null };
  }

  // Treat targetIdentifier as an email address
  const emailTarget = trimmed.toLowerCase();

  // Paginate listUsers to find matching user strictly by email
  let page = 1;
  const perPage = 100;
  const matchingUsers = [];

  while (true) {
    const { data, error } = await supabaseClient.auth.admin.listUsers({
      page: page,
      perPage: perPage,
    });

    if (error) {
      return { user: null, error: `Failed to list users: ${error.message}` };
    }

    const users = data?.users || [];
    if (users.length === 0) break;

    for (const u of users) {
      if (u.email && u.email.toLowerCase() === emailTarget) {
        matchingUsers.push(u);
      }
    }

    if (users.length < perPage) break;
    page++;
  }

  if (matchingUsers.length === 0) {
    return {
      user: null,
      error: `User with email '${maskIdentifier(trimmed)}' was not found. Note: Accounts are not automatically created.`,
    };
  }

  if (matchingUsers.length > 1) {
    return {
      user: null,
      error: `Ambiguous target identifier: Multiple users found with email '${maskIdentifier(trimmed)}'. Use ADMIN_USER_ID instead.`,
    };
  }

  return { user: matchingUsers[0], error: null };
}

/**
 * Grants administrator privileges (app_metadata.role = 'admin') to an existing target user.
 *
 * @param {object} options
 * @param {string} [options.supabaseUrl]
 * @param {string} [options.serviceRoleKey]
 * @param {string} [options.targetIdentifier]
 * @param {import('@supabase/supabase-js').SupabaseClient} [options.supabaseClient]
 * @returns {Promise<{ success: boolean; message: string; user_id?: string; updated?: boolean }>}
 */
export async function seedAdminUser(options = {}) {
  const url = options.supabaseUrl || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = options.serviceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const identifier = options.targetIdentifier || process.env.ADMIN_USER_ID || process.env.ADMIN_EMAIL || process.env.ADMIN_IDENTIFIER;

  if (!url) {
    return {
      success: false,
      message: 'Configuration error: Missing SUPABASE_URL or VITE_SUPABASE_URL environment variable.',
    };
  }

  if (!key) {
    return {
      success: false,
      message: 'Configuration error: Missing SUPABASE_SERVICE_ROLE_KEY environment variable.',
    };
  }

  if (!identifier || !identifier.trim()) {
    return {
      success: false,
      message: 'Configuration error: Missing ADMIN_USER_ID, ADMIN_EMAIL, or ADMIN_IDENTIFIER environment variable.',
    };
  }

  const supabase = options.supabaseClient || createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { user, error: findError } = await findTargetUser(supabase, identifier);

  if (findError || !user) {
    return {
      success: false,
      message: findError || 'Target user not found.',
    };
  }

  const existingAppMetadata = user.app_metadata || {};

  // Idempotency check: verify if user already has role = 'admin'
  if (existingAppMetadata.role === 'admin') {
    return {
      success: true,
      user_id: user.id,
      updated: false,
      message: `User '${user.id}' (${maskIdentifier(identifier)}) is already granted administrator privileges (app_metadata.role = 'admin'). No changes needed.`,
    };
  }

  // Preserve all existing app_metadata properties and set role to 'admin'
  const updatedAppMetadata = {
    ...existingAppMetadata,
    role: 'admin',
  };

  const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
    user.id,
    { app_metadata: updatedAppMetadata }
  );

  if (updateError) {
    return {
      success: false,
      message: `Failed to update app_metadata for user '${user.id}': ${updateError.message}`,
    };
  }

  if (!updateData || !updateData.user) {
    return {
      success: false,
      message: `Unexpected response when updating app_metadata for user '${user.id}'.`,
    };
  }

  return {
    success: true,
    user_id: user.id,
    updated: true,
    message: `Successfully granted administrator privileges (app_metadata.role = 'admin') to user '${user.id}' (${maskIdentifier(identifier)}).`,
  };
}

export async function run() {
  console.log('--- Horizon Admin Seeding Script ---');
  const result = await seedAdminUser();
  if (result.success) {
    console.log(`[SUCCESS] ${result.message}`);
  } else {
    console.error(`[ERROR] ${result.message}`);
    process.exitCode = 1;
  }
}

const currentFilePath = fileURLToPath(import.meta.url);
if (process.argv[1] && currentFilePath === process.argv[1]) {
  run();
}
