import type {
  BizTrackValidation,
  UniqueIdRuleOptions,
  ValidationRule,
  ValidationValues,
} from "./types";

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

function resolveMessage<T extends ValidationValues>(
  message: string | ((values: T) => string) | undefined,
  values: T,
  fallback: string,
): string {
  if (typeof message === "function") return message(values);
  return message || fallback;
}

function fail<T extends ValidationValues>(
  message: string | ((values: T) => string) | undefined,
  values: T,
  fallback: string,
): never {
  throw new ValidationError(resolveMessage(message, values, fallback));
}

function createPipeline<T extends ValidationValues>(rules: ValidationRule<T>[]): (input?: Partial<T>) => T {
  return function validate(input: Partial<T> = {}): T {
    const values = { ...input } as T;

    rules.forEach((rule) => {
      const result = rule(values);
      if (result && typeof result === "object") {
        Object.assign(values, result);
      }
    });

    return values;
  };
}

function requiredField<T extends ValidationValues>(
  field: keyof T & string,
  label: string,
  message?: string | ((values: T) => string),
): ValidationRule<T> {
  return function requireValue(values: T): void {
    const value = values[field];
    if (String(value ?? "").trim() === "") {
      fail(message, values, `${label} is required.`);
    }
  };
}

function nonNegativeNumber<T extends ValidationValues>(
  field: keyof T & string,
  label: string,
  message?: string | ((values: T) => string),
): ValidationRule<T> {
  return function parseNonNegativeNumber(values: T): Partial<T> {
    const number = Number(values[field]);
    if (!Number.isFinite(number) || number < 0) {
      fail(message, values, `${label} must be a non-negative number.`);
    }

    return { [field]: number } as Partial<T>;
  };
}

function uniqueId<T extends ValidationValues>({
  field,
  exists,
  label = "ID",
  message,
}: UniqueIdRuleOptions<T>): ValidationRule<T> {
  return function requireUniqueId(values: T): void {
    if (exists(values[field], values)) {
      fail(message, values, `${label} already exists.`);
    }
  };
}

function custom<T extends ValidationValues>(check: ValidationRule<T>): ValidationRule<T> {
  return check;
}

const validation: BizTrackValidation = {
  ValidationError,
  createPipeline,
  custom,
  nonNegativeNumber,
  requiredField,
  uniqueId,
};

(globalThis as typeof globalThis & { BizTrackValidation: BizTrackValidation }).BizTrackValidation = validation;

export {
  ValidationError,
  createPipeline,
  custom,
  nonNegativeNumber,
  requiredField,
  uniqueId,
};

export default validation;
