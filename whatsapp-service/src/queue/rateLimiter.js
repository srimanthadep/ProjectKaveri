/**
 * Simple token-bucket limiter. Caps outbound message throughput so bulk
 * operations (e.g. broadcasting a check-in reminder to every guest arriving
 * tomorrow) can't fire dozens of messages in the same second, which is a
 * common trigger for WhatsApp's automated-spam detection.
 */
export class TokenBucket {
  constructor({ capacity = 5, refillPerSecond = 5 } = {}) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillPerSecond = refillPerSecond;
    this.lastRefill = Date.now();
  }

  #refill() {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefill) / 1000;
    const toAdd = elapsedSeconds * this.refillPerSecond;
    if (toAdd > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + toAdd);
      this.lastRefill = now;
    }
  }

  /** Returns true and consumes a token if available, otherwise false. */
  tryConsume() {
    this.#refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }
}
