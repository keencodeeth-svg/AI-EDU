import { ApiError } from "./http";

export type Validator<T> = (value: unknown, path?: string) => T;

type StringOptions = {
  trim?: boolean;
  minLength?: number;
  maxLength?: number;
  allowEmpty?: boolean;
};

type NumberOptions = {
  min?: number;
  max?: number;
  integer?: boolean;
  coerce?: boolean;
};

type ArrayOptions = {
  minLength?: number;
  maxLength?: number;
};

function fail(path: string, message: string, details?: unknown): never {
  throw new ApiError(400, `${path} ${message}`, details);
}

export function string(options: StringOptions = {}): Validator<string> {
  return (value, path = "field") => {
    if (typeof value !== "string") {
      fail(path, "must be a string");
    }
    const trimmed = options.trim === false ? value : value.trim();

    if (!options.allowEmpty && trimmed.length === 0) {
      fail(path, "cannot be empty");
    }
    if (typeof options.minLength === "number" && trimmed.length < options.minLength) {
      fail(path, `must be at least ${options.minLength} chars`);
    }
    if (typeof options.maxLength === "number" && trimmed.length > options.maxLength) {
      fail(path, `must be at most ${options.maxLength} chars`);
    }
    return trimmed;
  };
}

export function number(options: NumberOptions = {}): Validator<number> {
  return (value, path = "field") => {
    const parsed =
      typeof value === "number"
        ? value
        : options.coerce && typeof value === "string" && value.trim() !== ""
          ? Number(value)
          : NaN;

    if (!Number.isFinite(parsed)) {
      fail(path, "must be a number");
    }
    if (options.integer && !Number.isInteger(parsed)) {
      fail(path, "must be an integer");
    }
    if (typeof options.min === "number" && parsed < options.min) {
      fail(path, `must be >= ${options.min}`);
    }
    if (typeof options.max === "number" && parsed > options.max) {
      fail(path, `must be <= ${options.max}`);
    }
    return parsed;
  };
}

export function boolean(): Validator<boolean> {
  return (value, path = "field") => {
    if (typeof value !== "boolean") {
      fail(path, "must be a boolean");
    }
    return value;
  };
}

export function enumValue<const T extends readonly string[]>(values: T): Validator<T[number]> {
  const allowed = new Set(values);
  return (value, path = "field") => {
    if (typeof value !== "string" || !allowed.has(value)) {
      fail(path, `must be one of: ${values.join(", ")}`);
    }
    return value as T[number];
  };
}

export function optional<T>(validator: Validator<T>): Validator<T | undefined> {
  return (value, path = "field") => {
    if (value === undefined || value === null) {
      return undefined;
    }
    return validator(value, path);
  };
}

export function array<T>(itemValidator: Validator<T>, options: ArrayOptions = {}): Validator<T[]> {
  return (value, path = "field") => {
    if (!Array.isArray(value)) {
      fail(path, "must be an array");
    }
    if (typeof options.minLength === "number" && value.length < options.minLength) {
      fail(path, `must contain at least ${options.minLength} items`);
    }
    if (typeof options.maxLength === "number" && value.length > options.maxLength) {
      fail(path, `must contain at most ${options.maxLength} items`);
    }

    return value.map((item, index) => itemValidator(item, `${path}[${index}]`));
  };
}

export function object<T extends Record<string, unknown>>(
  shape: { [K in keyof T]: Validator<T[K]> },
  options: { allowUnknown?: boolean } = {}
): Validator<T> {
  return (value, path = "body") => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      fail(path, "must be an object");
    }

    const input = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};

    for (const [key, validator] of Object.entries(shape)) {
      output[key] = (validator as Validator<unknown>)(input[key], `${path}.${key}`);
    }

    if (options.allowUnknown === false) {
      const unknownKeys = Object.keys(input).filter((key) => !(key in shape));
      if (unknownKeys.length) {
        fail(path, `contains unknown fields: ${unknownKeys.join(", ")}`, { unknownKeys });
      }
    }

    return output as T;
  };
}

export async function parseJson<T>(request: Request, validator: Validator<T>) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    throw new ApiError(400, "invalid json body");
  }
  return validator(payload, "body");
}

export function parseSearchParams<T>(request: Request, validator: Validator<T>) {
  const { searchParams } = new URL(request.url);
  const payload: Record<string, unknown> = {};

  const keys = new Set<string>();
  searchParams.forEach((_, key) => keys.add(key));
  keys.forEach((key) => {
    const values = searchParams.getAll(key);
    payload[key] = values.length > 1 ? values : values[0] ?? undefined;
  });

  return validator(payload, "query");
}

export function parseParams<T>(params: Record<string, string | undefined>, validator: Validator<T>) {
  return validator(params, "params");
}

export const v = {
  string,
  number,
  boolean,
  enum: enumValue,
  optional,
  array,
  object
};
