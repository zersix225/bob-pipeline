// demo/broken_code.js — intentionally broken for BobOps demo
// BobOps will detect the failure, identify the root cause, and open a fix PR.

function formatUser(user) {
  return `${user.name} (${user.email})`;
}

function calculateDiscount(price, discountPercent) {
  return price - (price * discountPercent) / 100;
}

module.exports = { formatUser, calculateDiscount };
