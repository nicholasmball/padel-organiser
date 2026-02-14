import { describe, it, expect } from "vitest";
import { getWhatsAppUrl } from "@/lib/whatsapp";

describe("getWhatsAppUrl", () => {
  it("returns a wa.me URL with digits only", () => {
    expect(getWhatsAppUrl("+44 7911 123456")).toBe(
      "https://wa.me/447911123456"
    );
  });

  it("strips spaces, dashes, and parentheses", () => {
    expect(getWhatsAppUrl("(07911) 123-456")).toBe(
      "https://wa.me/07911123456"
    );
  });

  it("handles already-clean numbers", () => {
    expect(getWhatsAppUrl("447911123456")).toBe("https://wa.me/447911123456");
  });

  it("handles empty string", () => {
    expect(getWhatsAppUrl("")).toBe("https://wa.me/");
  });
});
