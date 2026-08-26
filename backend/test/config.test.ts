import { describe, expect, it } from "vitest";
import { resolveDatabaseUrl } from "../src/config.js";

describe("resolveDatabaseUrl", () => {
  const sessionUrl =
    "postgresql://postgres.exampleproject:encoded%23password@aws-0-ca-central-1.pooler.supabase.com:5432/postgres";

  it("keeps the session-pooler URL in session mode", () => {
    expect(resolveDatabaseUrl(sessionUrl, "session")).toBe(sessionUrl);
  });

  it("converts a Supabase session-pooler URL to the direct endpoint", () => {
    expect(resolveDatabaseUrl(sessionUrl, "direct")).toBe(
      "postgresql://postgres:encoded%23password@db.exampleproject.supabase.co:5432/postgres",
    );
  });

  it("keeps an existing direct URL unchanged", () => {
    const directUrl =
      "postgresql://postgres:encoded%23password@db.exampleproject.supabase.co:5432/postgres";
    expect(resolveDatabaseUrl(directUrl, "direct")).toBe(directUrl);
  });

  it("rejects URLs that cannot be converted safely", () => {
    expect(() =>
      resolveDatabaseUrl("postgresql://user:password@example.com:5432/postgres", "direct"),
    ).toThrow(/requires a Supabase direct or session-pooler URL/);
  });
});
