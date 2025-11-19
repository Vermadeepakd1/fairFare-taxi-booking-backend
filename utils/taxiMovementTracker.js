// Global tracker for active taxi movement intervals
const activeMovements = new Map(); // taxiId -> { pickupInterval, dropoffInterval }

/**
 * Stop all movement for a taxi
 */
export function stopTaxiMovement(taxiId) {
  const movement = activeMovements.get(taxiId);
  if (movement) {
    if (movement.pickupInterval) {
      clearInterval(movement.pickupInterval);
    }
    if (movement.dropoffInterval) {
      clearInterval(movement.dropoffInterval);
    }
    activeMovements.delete(taxiId);
    console.log(`Stopped all movement for taxi ${taxiId}`);
  }
}

/**
 * Store movement interval for a taxi
 */
export function storeTaxiMovement(taxiId, type, interval) {
  if (!activeMovements.has(taxiId)) {
    activeMovements.set(taxiId, {});
  }
  const movement = activeMovements.get(taxiId);
  movement[type] = interval;
}

/**
 * Get active movement for a taxi
 */
export function getTaxiMovement(taxiId) {
  return activeMovements.get(taxiId);
}

