export interface ISafetyCheckResult {
  safe: boolean;
  reason?: string;
  command: string;
}

export class SecretRedactor {
  private static readonly PATTERNS: Array<{ regex: RegExp; token: string }> = [
    // OpenAI / Generic API keys (legacy and modern sk-proj keys)
    { regex: /sk-[A-Za-z0-9_-]{32,}/g, token: '<redacted:OPENAI_API_KEY>' },
    // GitHub Tokens
    { regex: /gh[pous]_[A-Za-z0-9]{36,}/g, token: '<redacted:GITHUB_TOKEN>' },
    // AWS Access Key ID
    { regex: /AKIA[0-9A-Z]{16}/g, token: '<redacted:AWS_KEY_ID>' },
    // AWS Secret Key
    { regex: /(?:aws_secret_access_key|aws_secret_key)\s*[:=]\s*["']?([A-Za-z0-9\/+=]{40})["']?/gi, token: '<redacted:AWS_SECRET_KEY>' },
    // Stripe Secret Key
    { regex: /sk_live_[0-9a-zA-Z]{24}/g, token: '<redacted:STRIPE_SECRET_KEY>' },
    // Database Connection Strings with Passwords
    { regex: /(postgres|mysql|mongodb|redis):\/\/[^:\s]+:[^@\s]+@[^\s]+/gi, token: '<redacted:DATABASE_CONNECTION_URI>' },
    // Private RSA / SSH Keys
    { regex: /-----BEGIN (?:RSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA )?PRIVATE KEY-----/g, token: '<redacted:PRIVATE_KEY>' },
  ];

  public static redact(text: string): { cleanText: string; redactionCount: number } {
    let cleanText = text;
    let redactionCount = 0;

    for (const { regex, token } of this.PATTERNS) {
      if (regex.test(cleanText)) {
        cleanText = cleanText.replace(regex, () => {
          redactionCount++;
          return token;
        });
      }
    }

    return { cleanText, redactionCount };
  }

  public static checkCommandSafety(command: string): ISafetyCheckResult {
    const lower = command.toLowerCase().trim();

    // Dangerous destructive patterns
    if (lower.includes('rm -rf /') || lower.includes('rm -rf ~') || lower.includes('rm -rf *')) {
      return { safe: false, reason: 'Command attempts recursive deletion of broad paths.', command };
    }
    if (lower.includes('drop database') || lower.includes('drop table')) {
      return { safe: false, reason: 'Command attempts destructive database dropping.', command };
    }
    if (lower.includes('git push --force') || lower.includes('git push -f')) {
      return { safe: false, reason: 'Command attempts destructive git force push.', command };
    }
    if (lower.includes('format c:') || lower.includes('mkfs')) {
      return { safe: false, reason: 'Command attempts disk formatting.', command };
    }

    return { safe: true, command };
  }

  public redact(text: string): { cleanText: string; redactionCount: number } {
    return SecretRedactor.redact(text);
  }

  public checkCommandSafety(command: string): ISafetyCheckResult {
    return SecretRedactor.checkCommandSafety(command);
  }
}
