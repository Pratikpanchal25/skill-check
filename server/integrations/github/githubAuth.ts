import crypto from "crypto";

const requireEnv = (value: string, name: string) => {
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
};

const getGithubClientId = () => process.env.GITHUB_CLIENT_ID ?? "";
const getGithubClientSecret = () => process.env.GITHUB_CLIENT_SECRET ?? "";
const getGithubStateSecret = () =>
  process.env.GITHUB_STATE_SECRET ?? process.env.GITHUB_CLIENT_SECRET ?? "skillcraft-github-state";
const getGithubEncryptionKey = () =>
  process.env.GITHUB_TOKEN_SECRET ?? process.env.GITHUB_CLIENT_SECRET ?? "skillcraft-token-secret";

const deriveKey = (secret: string) => crypto.createHash("sha256").update(secret).digest();
const toBase64Url = (value: Buffer | string) => Buffer.from(value).toString("base64url");
const fromBase64Url = (value: string) => Buffer.from(value, "base64url");

export const buildGithubAuthUrl = (state: string) => {
  const clientId = requireEnv(getGithubClientId(), "GITHUB_CLIENT_ID");
  const callbackUrl = requireEnv(process.env.GITHUB_CALLBACK_URL ?? "", "GITHUB_CALLBACK_URL");
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", callbackUrl);
  url.searchParams.set("scope", "read:user repo");
  url.searchParams.set("state", state);
  url.searchParams.set("allow_signup", "true");
  return url.toString();
};

export const createOAuthState = (userId: string) => {
  const payload = {
    userId,
    nonce: crypto.randomUUID(),
    issuedAt: Date.now(),
  };
  const serializedPayload = JSON.stringify(payload);
  const signature = crypto
    .createHmac("sha256", getGithubStateSecret())
    .update(serializedPayload)
    .digest("hex");

  return toBase64Url(JSON.stringify({ payload, signature }));
};

export const verifyOAuthState = (state: string) => {
  const decoded = JSON.parse(fromBase64Url(state).toString("utf8")) as {
    payload: { userId: string; nonce: string; issuedAt: number };
    signature: string;
  };
  const serializedPayload = JSON.stringify(decoded.payload);
  const expectedSignature = crypto
    .createHmac("sha256", getGithubStateSecret())
    .update(serializedPayload)
    .digest("hex");

  if (decoded.signature !== expectedSignature) {
    throw new Error("Invalid GitHub OAuth state");
  }
  if (Date.now() - decoded.payload.issuedAt > 15 * 60 * 1000) {
    throw new Error("GitHub OAuth state expired");
  }

  return decoded.payload;
};

export const exchangeCodeForAccessToken = async (code: string) => {
  const clientId = requireEnv(getGithubClientId(), "GITHUB_CLIENT_ID");
  const clientSecret = requireEnv(getGithubClientSecret(), "GITHUB_CLIENT_SECRET");
  const callbackUrl = requireEnv(process.env.GITHUB_CALLBACK_URL ?? "", "GITHUB_CALLBACK_URL");

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "Skillcraft-GitHub-Auth",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: callbackUrl,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to exchange GitHub OAuth code");
  }

  const payload = (await response.json()) as { access_token?: string; error?: string };
  if (!payload.access_token) {
    throw new Error(payload.error || "GitHub did not return an access token");
  }

  return payload.access_token;
};

export const encryptAccessToken = (token: string) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", deriveKey(getGithubEncryptionKey()), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    accessToken: encrypted.toString("base64"),
    tokenIv: iv.toString("base64"),
    tokenTag: tag.toString("base64"),
  };
};

export const decryptAccessToken = (encryptedToken: string, iv: string, tag: string) => {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    deriveKey(getGithubEncryptionKey()),
    Buffer.from(iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedToken, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
};
