(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.BizTrackOrderState = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  const STATUSES = Object.freeze({
    PENDING: "Pending",
    PROCESSING: "Processing",
    SHIPPED: "Shipped",
    DELIVERED: "Delivered",
  });

  class OrderState {
    constructor(status, nextStatuses) {
      this.status = status;
      this.nextStatuses = Object.freeze([...nextStatuses]);
    }

    availableStatuses() {
      return [this.status, ...this.nextStatuses];
    }

    canMoveTo(nextStatus) {
      return this.availableStatuses().includes(nextStatus);
    }
  }

  class PendingState extends OrderState {
    constructor() {
      super(STATUSES.PENDING, [STATUSES.PROCESSING]);
    }
  }

  class ProcessingState extends OrderState {
    constructor() {
      super(STATUSES.PROCESSING, [STATUSES.SHIPPED]);
    }
  }

  class ShippedState extends OrderState {
    constructor() {
      super(STATUSES.SHIPPED, [STATUSES.DELIVERED]);
    }
  }

  class DeliveredState extends OrderState {
    constructor() {
      super(STATUSES.DELIVERED, []);
    }
  }

  const statesByStatus = Object.freeze({
    [STATUSES.PENDING]: new PendingState(),
    [STATUSES.PROCESSING]: new ProcessingState(),
    [STATUSES.SHIPPED]: new ShippedState(),
    [STATUSES.DELIVERED]: new DeliveredState(),
  });

  function isKnownStatus(status) {
    return Object.prototype.hasOwnProperty.call(statesByStatus, status);
  }

  function normalizeStatus(status) {
    return isKnownStatus(status) ? status : STATUSES.PENDING;
  }

  function getState(status) {
    return statesByStatus[normalizeStatus(status)];
  }

  function getAvailableStatuses(status) {
    return getState(status).availableStatuses();
  }

  function getStatusClass(status) {
    return normalizeStatus(status).toLowerCase();
  }

  function canTransition(fromStatus, toStatus) {
    if (!isKnownStatus(toStatus)) return false;
    return getState(fromStatus).canMoveTo(toStatus);
  }

  function assertValidTransition(fromStatus, toStatus) {
    if (!canTransition(fromStatus, toStatus)) {
      throw new Error(`Invalid order status transition from ${fromStatus} to ${toStatus}.`);
    }

    return toStatus;
  }

  function isInitialStatus(status) {
    return status === STATUSES.PENDING;
  }

  function normalizeOrder(order) {
    return {
      ...order,
      orderStatus: normalizeStatus(order?.orderStatus),
    };
  }

  return {
    STATUSES,
    canTransition,
    assertValidTransition,
    getAvailableStatuses,
    getStatusClass,
    isInitialStatus,
    isKnownStatus,
    normalizeOrder,
    normalizeStatus,
  };
});
