import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { seedAdminUser, isUUID, maskIdentifier, findTargetUser } from '../seed_admin.mjs';

describe('seed_admin helper functions', () => {
  it('isUUID correctly identifies valid and invalid UUID strings', () => {
    expect(isUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    expect(isUUID('  123E4567-E89B-12D3-A456-426614174000  ')).toBe(true);
    expect(isUUID('not-a-uuid')).toBe(false);
    expect(isUUID('12345678-1234-1234-1234-1234567890')).toBe(false);
    expect(isUUID(null as unknown as string)).toBe(false);
  });

  it('maskIdentifier correctly sanitizes emails and UUIDs for log safety', () => {
    expect(maskIdentifier('123e4567-e89b-12d3-a456-426614174000')).toBe('123e4567...4000');
    expect(maskIdentifier('admin@example.com')).toBe('a***n@example.com');
    expect(maskIdentifier('ab@example.com')).toBe('***@example.com');
    expect(maskIdentifier('')).toBe('[hidden]');
  });
});

describe('seedAdminUser configuration checks', () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.ADMIN_USER_ID;
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_IDENTIFIER;
  });

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it('fails gracefully when SUPABASE_URL is missing', async () => {
    const result = await seedAdminUser({
      serviceRoleKey: 'test-key',
      targetIdentifier: '123e4567-e89b-12d3-a456-426614174000',
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('Missing SUPABASE_URL');
  });

  it('fails gracefully when SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
    const result = await seedAdminUser({
      supabaseUrl: 'https://test.supabase.co',
      targetIdentifier: '123e4567-e89b-12d3-a456-426614174000',
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('Missing SUPABASE_SERVICE_ROLE_KEY');
  });

  it('fails gracefully when target administrator identifier is missing', async () => {
    const result = await seedAdminUser({
      supabaseUrl: 'https://test.supabase.co',
      serviceRoleKey: 'test-key',
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('Missing ADMIN_USER_ID, ADMIN_EMAIL, or ADMIN_IDENTIFIER');
  });
});

describe('seedAdminUser core execution & safety', () => {
  const targetUuid = '123e4567-e89b-12d3-a456-426614174000';

  it('successfully locates user by UUID and grants admin role while preserving existing app_metadata', async () => {
    const getUserByIdMock = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: targetUuid,
          email: 'admin@example.com',
          app_metadata: { provider: 'email', existing_flag: true },
        },
      },
      error: null,
    });

    const updateUserByIdMock = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: targetUuid,
          app_metadata: { provider: 'email', existing_flag: true, role: 'admin' },
        },
      },
      error: null,
    });

    const mockSupabase = {
      auth: {
        admin: {
          getUserById: getUserByIdMock,
          updateUserById: updateUserByIdMock,
        },
      },
    };

    const result = await seedAdminUser({
      supabaseUrl: 'https://test.supabase.co',
      serviceRoleKey: 'secret-service-key',
      targetIdentifier: targetUuid,
      supabaseClient: mockSupabase as any,
    });

    expect(result.success).toBe(true);
    expect(result.updated).toBe(true);
    expect(result.user_id).toBe(targetUuid);
    expect(getUserByIdMock).toHaveBeenCalledWith(targetUuid);
    expect(updateUserByIdMock).toHaveBeenCalledWith(targetUuid, {
      app_metadata: {
        provider: 'email',
        existing_flag: true,
        role: 'admin',
      },
    });
  });

  it('successfully locates user by Email and grants admin role', async () => {
    const listUsersMock = vi.fn().mockResolvedValue({
      data: {
        users: [
          {
            id: targetUuid,
            email: 'admin@example.com',
            app_metadata: { provider: 'google' },
          },
        ],
      },
      error: null,
    });

    const updateUserByIdMock = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: targetUuid,
          app_metadata: { provider: 'google', role: 'admin' },
        },
      },
      error: null,
    });

    const mockSupabase = {
      auth: {
        admin: {
          listUsers: listUsersMock,
          updateUserById: updateUserByIdMock,
        },
      },
    };

    const result = await seedAdminUser({
      supabaseUrl: 'https://test.supabase.co',
      serviceRoleKey: 'secret-service-key',
      targetIdentifier: 'admin@example.com',
      supabaseClient: mockSupabase as any,
    });

    expect(result.success).toBe(true);
    expect(result.updated).toBe(true);
    expect(result.user_id).toBe(targetUuid);
    expect(listUsersMock).toHaveBeenCalledWith({ page: 1, perPage: 100 });
    expect(updateUserByIdMock).toHaveBeenCalledWith(targetUuid, {
      app_metadata: { provider: 'google', role: 'admin' },
    });
  });

  it('is idempotent and skips API update if user already has app_metadata.role === "admin"', async () => {
    const getUserByIdMock = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: targetUuid,
          email: 'admin@example.com',
          app_metadata: { role: 'admin', tier: 'premium' },
        },
      },
      error: null,
    });

    const updateUserByIdMock = vi.fn();

    const mockSupabase = {
      auth: {
        admin: {
          getUserById: getUserByIdMock,
          updateUserById: updateUserByIdMock,
        },
      },
    };

    const result = await seedAdminUser({
      supabaseUrl: 'https://test.supabase.co',
      serviceRoleKey: 'secret-service-key',
      targetIdentifier: targetUuid,
      supabaseClient: mockSupabase as any,
    });

    expect(result.success).toBe(true);
    expect(result.updated).toBe(false);
    expect(result.message).toContain('already granted administrator privileges');
    expect(updateUserByIdMock).not.toHaveBeenCalled();
  });

  it('fails safely and does not auto-create account when target user is not found', async () => {
    const listUsersMock = vi.fn().mockResolvedValue({
      data: { users: [] },
      error: null,
    });

    const createUserMock = vi.fn();

    const mockSupabase = {
      auth: {
        admin: {
          listUsers: listUsersMock,
          createUser: createUserMock,
        },
      },
    };

    const result = await seedAdminUser({
      supabaseUrl: 'https://test.supabase.co',
      serviceRoleKey: 'secret-service-key',
      targetIdentifier: 'nonexistent@example.com',
      supabaseClient: mockSupabase as any,
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('was not found');
    expect(result.message).toContain('Accounts are not automatically created');
    expect(createUserMock).not.toHaveBeenCalled();
  });

  it('fails safely when ambiguous email returns multiple users', async () => {
    const listUsersMock = vi.fn().mockResolvedValue({
      data: {
        users: [
          { id: 'uuid-1', email: 'duplicate@example.com' },
          { id: 'uuid-2', email: 'duplicate@example.com' },
        ],
      },
      error: null,
    });

    const mockSupabase = {
      auth: {
        admin: { listUsers: listUsersMock },
      },
    };

    const result = await seedAdminUser({
      supabaseUrl: 'https://test.supabase.co',
      serviceRoleKey: 'secret-service-key',
      targetIdentifier: 'duplicate@example.com',
      supabaseClient: mockSupabase as any,
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('Ambiguous target identifier');
  });

  it('handles API errors gracefully without throwing uncaught exceptions or leaking secrets', async () => {
    const getUserByIdMock = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: 'Database connection timeout' },
    });

    const mockSupabase = {
      auth: {
        admin: { getUserById: getUserByIdMock },
      },
    };

    const result = await seedAdminUser({
      supabaseUrl: 'https://test.supabase.co',
      serviceRoleKey: 'secret-service-key',
      targetIdentifier: targetUuid,
      supabaseClient: mockSupabase as any,
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('Failed to fetch user by ID: Database connection timeout');
    expect(result.message).not.toContain('secret-service-key');
  });
});
