(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.BizTrackValidation = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  class ValidationError extends Error {
    constructor(message) {
      super(message);
      this.name = "ValidationError";
    }
  }

  function resolveMessage(message, values, fallback) {
    if (typeof message === "function") return message(values);
    return message || fallback;
  }

  function fail(message, values, fallback) {
    throw new ValidationError(resolveMessage(message, values, fallback));
  }

  function createPipeline(rules) {
    return function validate(input = {}) {
      const values = { ...input };

      rules.forEach((rule) => {
        const result = rule(values);
        if (result && typeof result === "object") {
          Object.assign(values, result);
        }
      });

      return values;
    };
  }

  function requiredField(field, label, message) {
    return function requireValue(values) {
      const value = values[field];
      if (String(value ?? "").trim() === "") {
        fail(message, values, `${label} is required.`);
      }
    };
  }

  function nonNegativeNumber(field, label, message) {
    return function parseNonNegativeNumber(values) {
      const number = Number(values[field]);
      if (!Number.isFinite(number) || number < 0) {
        fail(message, values, `${label} must be a non-negative number.`);
      }

      return { [field]: number };
    };
  }

  function uniqueId({ field, exists, label = "ID", message }) {
    return function requireUniqueId(values) {
      if (exists(values[field], values)) {
        fail(message, values, `${label} already exists.`);
      }
    };
  }

  function custom(check) {
    return check;
  }

  return {
    ValidationError,
    createPipeline,
    custom,
    nonNegativeNumber,
    requiredField,
    uniqueId,
  };
});
