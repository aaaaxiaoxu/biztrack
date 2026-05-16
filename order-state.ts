import type { BizTrackOrderState, DataRecord, OrderStatus } from "./types";

const STATUSES = Object.freeze({
  PENDING: "Pending",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
} satisfies Record<string, OrderStatus>);

class OrderState {
  readonly status: OrderStatus;
  readonly nextStatuses: readonly OrderStatus[];

  constructor(status: OrderStatus, nextStatuses: OrderStatus[]) {
    this.status = status;
    this.nextStatuses = Object.freeze([...nextStatuses]);
  }

  availableStatuses(): OrderStatus[] {
    return [this.status, ...this.nextStatuses];
  }

  canMoveTo(nextStatus: unknown): boolean {
    return this.availableStatuses().includes(nextStatus as OrderStatus);
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

function isKnownStatus(status: unknown): status is OrderStatus {
  return typeof status === "string" && Object.prototype.hasOwnProperty.call(statesByStatus, status);
}

function normalizeStatus(status: unknown): OrderStatus {
  return isKnownStatus(status) ? status : STATUSES.PENDING;
}

function getState(status: unknown): OrderState {
  return statesByStatus[normalizeStatus(status)];
}

function getAvailableStatuses(status: unknown): OrderStatus[] {
  return getState(status).availableStatuses();
}

function getStatusClass(status: unknown): string {
  return normalizeStatus(status).toLowerCase();
}

function canTransition(fromStatus: unknown, toStatus: unknown): boolean {
  if (!isKnownStatus(toStatus)) return false;
  return getState(fromStatus).canMoveTo(toStatus);
}

function assertValidTransition(fromStatus: unknown, toStatus: unknown): OrderStatus {
  if (!canTransition(fromStatus, toStatus)) {
    throw new Error(`Invalid order status transition from ${fromStatus} to ${toStatus}.`);
  }

  return toStatus as OrderStatus;
}

function isInitialStatus(status: unknown): boolean {
  return status === STATUSES.PENDING;
}

function normalizeOrder<T extends DataRecord>(order: T): T & { orderStatus: OrderStatus } {
  return {
    ...order,
    orderStatus: normalizeStatus(order?.orderStatus),
  };
}

const orderState: BizTrackOrderState = {
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

(globalThis as typeof globalThis & { BizTrackOrderState: BizTrackOrderState }).BizTrackOrderState = orderState;

export {
  STATUSES,
  assertValidTransition,
  canTransition,
  getAvailableStatuses,
  getStatusClass,
  isInitialStatus,
  isKnownStatus,
  normalizeOrder,
  normalizeStatus,
};

export default orderState;
