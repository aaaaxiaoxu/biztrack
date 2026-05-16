import { describe, expect, it } from "vitest";
import orderState from "./order-state";

describe("BizTrackOrderState", () => {
  it("allows each workflow state to stay unchanged or move one step forward", () => {
    expect(orderState.getAvailableStatuses("Pending")).toEqual(["Pending", "Processing"]);
    expect(orderState.getAvailableStatuses("Processing")).toEqual(["Processing", "Shipped"]);
    expect(orderState.getAvailableStatuses("Shipped")).toEqual(["Shipped", "Delivered"]);
    expect(orderState.getAvailableStatuses("Delivered")).toEqual(["Delivered"]);
  });

  it("rejects skipped, reversed, and unknown transitions", () => {
    expect(orderState.canTransition("Pending", "Processing")).toBe(true);
    expect(orderState.canTransition("Pending", "Delivered")).toBe(false);
    expect(orderState.canTransition("Shipped", "Processing")).toBe(false);
    expect(orderState.canTransition("Delivered", "Processing")).toBe(false);
    expect(orderState.canTransition("Pending", "Cancelled")).toBe(false);
  });

  it("enforces Pending as the only initial status for new orders", () => {
    expect(orderState.isInitialStatus("Pending")).toBe(true);
    expect(orderState.isInitialStatus("Processing")).toBe(false);
  });

  it("normalizes corrupt stored statuses to a safe workflow start", () => {
    expect(orderState.normalizeStatus("Lost")).toBe("Pending");
    expect(orderState.normalizeOrder({ orderID: "1009", orderStatus: "Lost" })).toEqual({
      orderID: "1009",
      orderStatus: "Pending",
    });
  });

  it("throws for invalid transitions and returns the next status for valid ones", () => {
    expect(orderState.assertValidTransition("Processing", "Shipped")).toBe("Shipped");
    expect(() => orderState.assertValidTransition("Processing", "Delivered")).toThrow("Invalid order status transition");
  });
});
