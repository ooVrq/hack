import { describe, expect, it } from "vitest";
import { normalizeUrl } from "../app/normalize-url";

describe("normalizeUrl", () => {
  it("adds https:// to a bare address", () => {
    expect(normalizeUrl("jobs.apple.com")).toBe("https://jobs.apple.com");
    expect(normalizeUrl("www.google.com")).toBe("https://www.google.com");
    expect(normalizeUrl("example.com")).toBe("https://example.com");
    expect(normalizeUrl("example.com/careers?team=ios#open")).toBe(
      "https://example.com/careers?team=ios#open",
    );
    expect(normalizeUrl("example.com:8443/status")).toBe("https://example.com:8443/status");
  });

  it("uses http:// for the local demo server", () => {
    expect(normalizeUrl("localhost:3000/demo/job-board")).toBe(
      "http://localhost:3000/demo/job-board",
    );
    expect(normalizeUrl("LOCALHOST/demo")).toBe("http://LOCALHOST/demo");
    expect(normalizeUrl("127.0.0.1:3000")).toBe("http://127.0.0.1:3000");
  });

  it("leaves a value that already has a scheme alone", () => {
    expect(normalizeUrl("https://jobs.apple.com")).toBe("https://jobs.apple.com");
    expect(normalizeUrl("http://localhost:3000/demo/job-board")).toBe(
      "http://localhost:3000/demo/job-board",
    );
    expect(normalizeUrl("ftp://files.example.com")).toBe("ftp://files.example.com");
    expect(normalizeUrl("javascript:alert(1)")).toBe("javascript:alert(1)");
  });

  it("trims, and leaves an empty value empty", () => {
    expect(normalizeUrl("  example.com  ")).toBe("https://example.com");
    expect(normalizeUrl("   ")).toBe("");
  });
});
