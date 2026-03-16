"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decryptAccessToken = exports.encryptAccessToken = exports.exchangeCodeForAccessToken = exports.verifyOAuthState = exports.createOAuthState = exports.buildGithubAuthUrl = void 0;
const crypto_1 = __importDefault(require("crypto"));
const requireEnv = (value, name) => {
    if (!value) {
        throw new Error(`${name} is not configured`);
    }
    return value;
};
const getGithubClientId = () => process.env.GITHUB_CLIENT_ID ?? "";
const getGithubClientSecret = () => process.env.GITHUB_CLIENT_SECRET ?? "";
const getGithubStateSecret = () => process.env.GITHUB_STATE_SECRET ?? process.env.GITHUB_CLIENT_SECRET ?? "skillcraft-github-state";
const getGithubEncryptionKey = () => process.env.GITHUB_TOKEN_SECRET ?? process.env.GITHUB_CLIENT_SECRET ?? "skillcraft-token-secret";
const deriveKey = (secret) => crypto_1.default.createHash("sha256").update(secret).digest();
const toBase64Url = (value) => Buffer.from(value).toString("base64url");
const fromBase64Url = (value) => Buffer.from(value, "base64url");
const buildGithubAuthUrl = (state) => {
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
exports.buildGithubAuthUrl = buildGithubAuthUrl;
const createOAuthState = (userId) => {
    const payload = {
        userId,
        nonce: crypto_1.default.randomUUID(),
        issuedAt: Date.now(),
    };
    const serializedPayload = JSON.stringify(payload);
    const signature = crypto_1.default
        .createHmac("sha256", getGithubStateSecret())
        .update(serializedPayload)
        .digest("hex");
    return toBase64Url(JSON.stringify({ payload, signature }));
};
exports.createOAuthState = createOAuthState;
const verifyOAuthState = (state) => {
    const decoded = JSON.parse(fromBase64Url(state).toString("utf8"));
    const serializedPayload = JSON.stringify(decoded.payload);
    const expectedSignature = crypto_1.default
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
exports.verifyOAuthState = verifyOAuthState;
const exchangeCodeForAccessToken = async (code) => {
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
    const payload = (await response.json());
    if (!payload.access_token) {
        throw new Error(payload.error || "GitHub did not return an access token");
    }
    return payload.access_token;
};
exports.exchangeCodeForAccessToken = exchangeCodeForAccessToken;
const encryptAccessToken = (token) => {
    const iv = crypto_1.default.randomBytes(12);
    const cipher = crypto_1.default.createCipheriv("aes-256-gcm", deriveKey(getGithubEncryptionKey()), iv);
    const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
        accessToken: encrypted.toString("base64"),
        tokenIv: iv.toString("base64"),
        tokenTag: tag.toString("base64"),
    };
};
exports.encryptAccessToken = encryptAccessToken;
const decryptAccessToken = (encryptedToken, iv, tag) => {
    const decipher = crypto_1.default.createDecipheriv("aes-256-gcm", deriveKey(getGithubEncryptionKey()), Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encryptedToken, "base64")),
        decipher.final(),
    ]);
    return decrypted.toString("utf8");
};
exports.decryptAccessToken = decryptAccessToken;
