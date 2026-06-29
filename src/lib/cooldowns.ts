const cooldowns = new Map<string, number>();

export function checkCooldown(userId: string, commandName: string, cooldownSeconds: number): number | null {
  const key = `${userId}:${commandName}`;
  const now = Date.now();
  const expiry = cooldowns.get(key);

  if (expiry && expiry > now) {
    return Math.ceil((expiry - now) / 1000);
  }

  cooldowns.set(key, now + cooldownSeconds * 1000);
  return null;
}
