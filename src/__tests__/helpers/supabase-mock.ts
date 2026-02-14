import { vi } from "vitest";

/**
 * Creates a chainable mock that mimics the Supabase query builder pattern:
 *   supabase.from("table").select("*").eq("id", "x").single()
 *
 * Each method returns `this` for chaining, and the terminal result
 * is controlled via `mockResult()`.
 */
export function createQueryMock(defaultResult: Record<string, unknown> = {}) {
  let result: Record<string, unknown> = { ...defaultResult };

  const mock = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    // Allow setting the result for the next chain
    mockResult(r: Record<string, unknown>) {
      result = r;
      return mock;
    },
    // For `then`-able resolution (when chain ends without .single())
    then(resolve: (val: Record<string, unknown>) => void) {
      return Promise.resolve(result).then(resolve);
    },
  };

  return mock;
}

/**
 * Creates a mock Supabase client with configurable per-table responses.
 * Usage:
 *   const { client, setTableResponse } = createMockSupabaseClient();
 *   setTableResponse("bookings", { data: { id: "123" }, error: null });
 */
export function createMockSupabaseClient() {
  const tableResponses: Record<string, Record<string, unknown>> = {};
  const queryMocks: Record<string, ReturnType<typeof createQueryMock>> = {};

  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      admin: {
        deleteUser: vi.fn().mockResolvedValue({ error: null }),
      },
    },
    from: vi.fn((table: string) => {
      if (!queryMocks[table]) {
        queryMocks[table] = createQueryMock(
          tableResponses[table] || { data: null, error: null }
        );
      }
      // Reset result to configured table response on each .from() call
      queryMocks[table].mockResult(
        tableResponses[table] || { data: null, error: null }
      );
      return queryMocks[table];
    }),
  };

  function setTableResponse(table: string, response: Record<string, unknown>) {
    tableResponses[table] = response;
    if (queryMocks[table]) {
      queryMocks[table].mockResult(response);
    }
  }

  function setUser(user: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null) {
    client.auth.getUser.mockResolvedValue({
      data: { user },
      error: null,
    });
  }

  function getQueryMock(table: string) {
    return queryMocks[table];
  }

  return { client, setTableResponse, setUser, getQueryMock };
}

/**
 * Sets up standard mocks for server action tests.
 * Mocks createClient (server) and createAdminClient, returning
 * separate controllable mock clients.
 */
export function setupServerActionMocks() {
  const server = createMockSupabaseClient();
  const admin = createMockSupabaseClient();

  vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(() => Promise.resolve(server.client)),
  }));

  vi.mock("@/lib/supabase/admin", () => ({
    createAdminClient: vi.fn(() => admin.client),
  }));

  return { server, admin };
}
