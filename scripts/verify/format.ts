import { formatPrice } from "../../lib/format";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const formatted = formatPrice(35000);
assert(formatted.includes("350"), `Expected 350 in price, got ${formatted}`);
assert(formatted.includes("₱") || formatted.includes("PHP"), `Expected PHP symbol, got ${formatted}`);

console.log("verify-format: ok", formatted);
