
import puppeteer from 'puppeteer';
import { getSkillById } from './skill.service';
import { User } from '../models/user.model';
import { GithubProfile } from '../models/GithubProfile';
import { Judgement } from '../models/judgement.model';
import { SkillCheckSession } from '../models/skill.check.session.model';

export async function generateSkillCertificate(skillId: string, userId?: string, username?: string): Promise<Buffer> {
  // Fetch skill and user
  const skill = await getSkillById(skillId);
  if (!skill) throw new Error('Skill not found');

  let user = userId ? await User.findById(userId).lean() : null;

  if (!user && username) {
    user = await User.findOne({
      $or: [
        { name: username },
        { email: username }
      ]
    }).lean();
  }

  if (!user && username) {
    const githubProfile = await GithubProfile.findOne({
      username: new RegExp(`^${username}$`, 'i')
    }).lean();

    if (githubProfile?.userId) {
      user = await User.findById(githubProfile.userId).lean();
    }
  }

  if (!user) throw new Error('User not found');

  // Find latest session for user and skill
  const session = await SkillCheckSession.findOne({ userId: user._id, skillName: skill.name }).sort({ createdAt: -1 });
  if (!session) throw new Error('Skill session not found');

  // Find latest evaluation for session
  const evaluation = await Judgement.findOne({ sessionId: session._id }).sort({ createdAt: -1 }).lean();
  if (!evaluation) throw new Error('Evaluation not found');

  const githubProfile = await GithubProfile.findOne({ userId: user._id }).lean();
  const verificationIdentity = githubProfile?.username || user.name || user.email;
  const averageScore = ((evaluation.clarity ?? 0) + (evaluation.correctness ?? 0) + (evaluation.depth ?? 0) + (evaluation.delivery ?? 0)) / 4;
  const scoreOutOfTen = Math.max(0, Math.min(10, averageScore));
  const scorePercent = (scoreOutOfTen / 10) * 100;
  const clarityPercent = Math.max(0, Math.min(100, (evaluation.clarity ?? 0) * 10));
  const deliveryPercent = Math.max(0, Math.min(100, (evaluation.delivery ?? 0) * 10));
  const scoreDisplay = Number.isInteger(scoreOutOfTen) ? `${scoreOutOfTen}` : scoreOutOfTen.toFixed(1);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>SkillCraft Certificate</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
 
    body {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 2rem;
      font-family: 'DM Sans', Arial, sans-serif;
    }
 
    .cert {
      width: 600px;
      background: #0b0f1a;
      border-radius: 20px;
      overflow: hidden;
      position: relative;
      border: 1px solid rgba(99,179,237,0.2);
      box-shadow:
        0 0 0 1px rgba(255,255,255,0.04),
        0 24px 64px rgba(0,0,0,0.6);
    }
 
    .cert-top-bar {
      height: 4px;
      background: linear-gradient(90deg, #1a6b8a 0%, #3cb3e0 35%, #f0c040 65%, #e07b30 100%);
    }
 
    .cert-bg-glow {
      position: absolute;
      top: -60px;
      left: 50%;
      transform: translateX(-50%);
      width: 340px;
      height: 220px;
      background: radial-gradient(ellipse, rgba(60,179,224,0.08) 0%, transparent 70%);
      pointer-events: none;
    }
 
    .corner-ornament {
      position: absolute;
      width: 60px;
      height: 60px;
      opacity: 0.12;
    }
    .corner-tl { top: 16px; left: 16px; }
    .corner-br { bottom: 16px; right: 16px; transform: rotate(180deg); }
 
    .cert-inner {
      padding: 36px 44px 40px;
      position: relative;
      z-index: 1;
    }
 
    .cert-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 28px;
    }
 
    .cert-brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
 
    .cert-logo-mark { width: 36px; height: 36px; }
 
    .cert-brand-name {
      font-family: 'Playfair Display', serif;
      font-size: 17px;
      font-weight: 600;
      color: #e8f0fa;
      letter-spacing: 0.03em;
    }
 
    .cert-badge {
      background: rgba(240,192,64,0.12);
      border: 1px solid rgba(240,192,64,0.3);
      color: #f0c040;
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      padding: 5px 12px;
      border-radius: 100px;
    }
 
    .cert-divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(99,179,237,0.2), rgba(240,192,64,0.15), transparent);
      margin-bottom: 28px;
    }
 
    .cert-presented {
      font-size: 11px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: rgba(180,200,230,0.5);
      margin-bottom: 6px;
    }
 
    .cert-name {
      font-family: 'Playfair Display', serif;
      font-size: 32px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 6px;
      line-height: 1.1;
    }
 
    .cert-sub {
      font-size: 13px;
      color: rgba(180,200,230,0.55);
      margin-bottom: 28px;
      font-weight: 300;
    }
 
    .cert-skill-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 12px;
      padding: 18px 22px;
      margin-bottom: 20px;
    }
 
    .cert-skill-label {
      font-size: 11px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: rgba(180,200,230,0.45);
      margin-bottom: 5px;
    }
 
    .cert-skill-name {
      font-family: 'Playfair Display', serif;
      font-size: 20px;
      font-weight: 600;
      color: #e8f0fa;
    }
 
    .cert-score-ring {
      width: 72px;
      height: 72px;
      position: relative;
      flex-shrink: 0;
    }
 
    .cert-score-ring svg { transform: rotate(-90deg); }
 
    .cert-score-value {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
    }
 
    .cert-score-num {
      font-family: 'Playfair Display', serif;
      font-size: 20px;
      font-weight: 700;
      color: #f0c040;
      line-height: 1;
      display: block;
    }
 
    .cert-score-denom {
      font-size: 10px;
      color: rgba(240,192,64,0.5);
      display: block;
    }
 
    .cert-metrics {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 24px;
    }
 
    .cert-metric {
      background: rgba(255,255,255,0.025);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 10px;
      padding: 14px 16px;
    }
 
    .cert-metric-label {
      font-size: 10px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: rgba(180,200,230,0.4);
      margin-bottom: 8px;
    }
 
    .cert-metric-bar-bg {
      height: 4px;
      background: rgba(255,255,255,0.06);
      border-radius: 2px;
      margin-bottom: 8px;
      overflow: hidden;
    }
 
    .cert-metric-bar { height: 100%; border-radius: 2px; }
 
    .cert-metric-val {
      font-size: 16px;
      font-weight: 500;
      color: #c8ddf0;
    }
 
    .cert-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 20px;
      border-top: 1px solid rgba(255,255,255,0.06);
    }
 
    .cert-verify {
      display: flex;
      align-items: center;
      gap: 6px;
    }
 
    .cert-verify-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #3cb3e0;
      box-shadow: 0 0 6px rgba(60,179,224,0.8);
      animation: pulse 2s infinite;
      flex-shrink: 0;
    }
 
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
 
    .cert-verify-text { font-size: 11px; color: rgba(180,200,230,0.45); }
 
    .cert-verify-link {
      font-size: 11px;
      color: #3cb3e0;
      text-decoration: none;
      letter-spacing: 0.02em;
    }
 
    .cert-verify-link:hover { color: #5cd0f5; }
 
    .cert-seal { display: flex; align-items: center; gap: 8px; }
    .cert-seal-icon { width: 28px; height: 28px; }
 
    .cert-seal-text {
      font-size: 10px;
      color: rgba(240,192,64,0.6);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      line-height: 1.3;
    }
  </style>
</head>
<body>
 
  <div class="cert">
    <div class="cert-top-bar"></div>
 
    <svg class="corner-ornament corner-tl" viewBox="0 0 60 60" fill="none">
      <path d="M4 56 L4 4 L56 4" stroke="#3cb3e0" stroke-width="1.5" fill="none"/>
      <path d="M4 46 L4 4 L46 4" stroke="#f0c040" stroke-width="0.8" fill="none" opacity="0.6"/>
    </svg>
    <svg class="corner-ornament corner-br" viewBox="0 0 60 60" fill="none">
      <path d="M4 56 L4 4 L56 4" stroke="#3cb3e0" stroke-width="1.5" fill="none"/>
      <path d="M4 46 L4 4 L46 4" stroke="#f0c040" stroke-width="0.8" fill="none" opacity="0.6"/>
    </svg>
 
    <div class="cert-bg-glow"></div>
 
    <div class="cert-inner">
 
      <div class="cert-header">
        <div class="cert-brand">
          <svg class="cert-logo-mark" viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="8" fill="rgba(60,179,224,0.1)" stroke="rgba(60,179,224,0.3)" stroke-width="1"/>
            <path d="M10 26 L18 10 L26 26" stroke="#3cb3e0" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M13 20 L23 20" stroke="#f0c040" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span class="cert-brand-name">SkillCraft</span>
        </div>
        <div class="cert-badge">Certificate of Proficiency</div>
      </div>
 
      <div class="cert-divider"></div>
 
      <div class="cert-presented">This certificate is proudly awarded to</div>
      <div class="cert-name">${user.name || user.email}</div>
      <div class="cert-sub">${user.email}</div>
 
      <div class="cert-skill-row">
        <div>
          <div class="cert-skill-label">Skill Assessed</div>
          <div class="cert-skill-name">${skill.name}</div>
        </div>
        <div class="cert-score-ring">
          <svg width="72" height="72" viewBox="0 0 72 72">
            <defs>
              <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#f0c040"/>
                <stop offset="100%" stop-color="#e07b30"/>
              </linearGradient>
            </defs>
            <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(240,192,64,0.12)" stroke-width="5"/>
            <circle
              cx="36" cy="36" r="30"
              fill="none"
              stroke="url(#scoreGrad)"
              stroke-width="5"
              stroke-dasharray="188.5"
              stroke-dashoffset="${(188.5 * (1 - scorePercent / 100)).toFixed(1)}"
              stroke-linecap="round"
            />
          </svg>
          <div class="cert-score-value">
            <span class="cert-score-num">${scoreDisplay}</span>
            <span class="cert-score-denom">/10</span>
          </div>
        </div>
      </div>
 
      <div class="cert-metrics">
        <div class="cert-metric">
          <div class="cert-metric-label">Concept Coverage</div>
          <div class="cert-metric-bar-bg">
            <div class="cert-metric-bar"
              style="width: ${clarityPercent}%; background: linear-gradient(90deg, #3cb3e0, #5cd0f5);"></div>
          </div>
          <div class="cert-metric-val">${evaluation.clarity ?? 'N/A'}${typeof evaluation.clarity === 'number' ? '/10' : ''}</div>
        </div>
        <div class="cert-metric">
          <div class="cert-metric-label">Communication Score</div>
          <div class="cert-metric-bar-bg">
            <div class="cert-metric-bar"
              style="width: ${deliveryPercent}%; background: linear-gradient(90deg, #a56fff, #c99fff);"></div>
          </div>
          <div class="cert-metric-val">${evaluation.delivery ?? 'N/A'}${typeof evaluation.delivery === 'number' ? '/10' : ''}</div>
        </div>
      </div>
 
      <div class="cert-footer">
        <div class="cert-verify">
          <div class="cert-verify-dot"></div>
          <span class="cert-verify-text">Verifiable at&nbsp;</span>
          <a class="cert-verify-link"
            href="https://skillcraft.app/verify/${verificationIdentity}/${encodeURIComponent(skill.name)}"
            target="_blank">skillcraft.app/verify</a>
        </div>
        <div class="cert-seal">
          <svg class="cert-seal-icon" viewBox="0 0 28 28" fill="none">
            <path d="M14 2 L16.5 9 L24 9 L18 13.5 L20.5 21 L14 16.5 L7.5 21 L10 13.5 L4 9 L11.5 9 Z"
              fill="rgba(240,192,64,0.7)" stroke="rgba(240,192,64,0.4)" stroke-width="0.5"/>
          </svg>
          <div class="cert-seal-text">Verified<br>Achievement</div>
        </div>
      </div>
 
    </div>
  </div>
 
</body>
</html>
`;


  // Launch Puppeteer and render PNG.
  // Some Linux environments block Chromium sandboxing, so we disable it here.
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const image = await page.screenshot({ type: 'png', fullPage: false });
  await browser.close();
  return image as Buffer;
}
