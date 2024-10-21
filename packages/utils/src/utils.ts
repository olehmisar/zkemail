import ms from "ms";

export { joinURL as joinUrl } from "ufo";

export function sleep(duration: number | string) {
  const durationMs = typeof duration === "number" ? duration : ms(duration);
  return new Promise<void>((resolve) => setTimeout(resolve, durationMs));
}

export function lazyValue<T>(value: () => T): () => T {
  let initialized = false;
  let result: T;
  return () => {
    if (!initialized) {
      initialized = true;
      result = value();
    }
    return result;
  };
}

export function errorToString(error: any) {
  return String(error?.message || error);
}

export function removePrefixOrThrow(str: string, prefix: string) {
  if (!str.startsWith(prefix)) {
    throw new Error(`string does not start with "${prefix}"`);
  }

  return str.slice(prefix.length);
}
