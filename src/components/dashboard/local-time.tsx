"use client";

type LocalTimeProps = {
  fallback: string;
  value: string;
};

export function LocalTime({ fallback, value }: LocalTimeProps) {
  const time =
    typeof window === "undefined"
      ? fallback
      : new Intl.DateTimeFormat(undefined, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(new Date(value));

  return <span suppressHydrationWarning>{time}</span>;
}
