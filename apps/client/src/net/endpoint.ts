export function serverEndpoint(): string {
  const fromEnv = import.meta.env.VITE_SERVER_URL as string | undefined;
  if (fromEnv) return fromEnv;
  const proto = location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${location.hostname}:2567`;
}
