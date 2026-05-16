const { strictEqual } = require("node:assert");
const { test } = require("node:test");
const { calculateDiscount, formatUser } = require("./broken_code");

test("formats user correctly", () => {
  strictEqual(
    formatUser({ name: "Alice", email: "alice@example.com" }),
    "Alice (alice@example.com)",
  );
});

// This test WILL FAIL — formatUser does not handle null input (TypeError)
test("handles null user gracefully", () => {
  strictEqual(formatUser(null), "Unknown (unknown@example.com)");
});

test("calculates 20% discount", () => {
  strictEqual(calculateDiscount(100, 20), 80);
});
