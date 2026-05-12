import { describe, expect, it } from "vitest";
import validation from "./validation-pipeline.js";

describe("BizTrackValidation", () => {
  it("runs validators in order and returns transformed values", () => {
    const validate = validation.createPipeline([
      validation.requiredField("name", "Name"),
      validation.nonNegativeNumber("amount", "Amount"),
      validation.custom((values) => ({ total: values.amount * 2 })),
    ]);

    expect(validate({ name: "Rent", amount: "12.50" })).toEqual({
      name: "Rent",
      amount: 12.5,
      total: 25,
    });
  });

  it("throws for missing required fields and invalid numbers", () => {
    const validate = validation.createPipeline([
      validation.requiredField("name", "Name"),
      validation.nonNegativeNumber("amount", "Amount"),
    ]);

    expect(() => validate({ name: " ", amount: "5" })).toThrow("Name is required");
    expect(() => validate({ name: "Rent", amount: "-1" })).toThrow("Amount must be a non-negative number");
  });

  it("supports custom duplicate-id messages", () => {
    const validate = validation.createPipeline([
      validation.uniqueId({
        field: "id",
        exists: (id) => id === "A",
        message: () => "Duplicate record",
      }),
    ]);

    expect(() => validate({ id: "A" })).toThrow("Duplicate record");
    expect(validate({ id: "B" })).toEqual({ id: "B" });
  });
});
