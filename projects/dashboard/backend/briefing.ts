import fs from 'fs';
import path from 'path';
import { callClaude } from './anthropic.js';

// FR-003/FR-020/FR-024: first working Claude API call for the briefing module. Per the
// 2026-06-29 turnover doc's Session 1 goal: "XO manifest + Finance manifest → one briefing
// section." There is no dedicated agents/finance manifest yet (finance is a home-apps module,
// not an H-staff agent), so finances/INDEX.md stands in as the closest equivalent — revisit
// once agents/h8-finance is actually built out.

function vaultRoot(): string {
  return process.env.VAULT_ROOT ?? path.join(process.env.HOME ?? '', 'gdrive/ObsidianVault');
}

function readVaultFile(relPath: string): string | null {
  const full = path.join(vaultRoot(), relPath);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, 'utf8');
}

function briefingsDir(): string {
  return path.join(vaultRoot(), '_meta/briefings');
}

export interface BriefingResult {
  timestamp: string;
  text: string;
}

function assembleSystemPrompt(): string {
  const xoManifest = readVaultFile('agents/xo/manifest.md') ?? '';
  const financeContext = readVaultFile('finances/INDEX.md') ?? '';

  return [
    'You are XO, Nick\'s Chief of Staff agent. You are producing one section of a daily',
    'briefing. Verify and route — do not invent action items that aren\'t grounded in the',
    'context below. If there is nothing notable, say so plainly.',
    '',
    '## XO manifest',
    xoManifest,
    '',
    '## Finance context (finances/INDEX.md)',
    financeContext,
  ].join('\n');
}

export async function runBriefing(): Promise<BriefingResult> {
  const systemPrompt = assembleSystemPrompt();
  const text = await callClaude(
    systemPrompt,
    'Produce a short finance-focused briefing section: anything financially notable Nick ' +
      'should know about today, grounded only in the context provided. 3-5 sentences max.'
  );

  const timestamp = new Date().toISOString();
  const dir = briefingsDir();
  fs.mkdirSync(dir, { recursive: true });
  const filename = `${timestamp.replace(/[:.]/g, '-')}.md`;
  fs.writeFileSync(path.join(dir, filename), `# Briefing — ${timestamp}\n\n${text}\n`, 'utf8');

  return { timestamp, text };
}

export function getLatestBriefing(): BriefingResult | null {
  const dir = briefingsDir();
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort().reverse();
  if (!files.length) return null;

  const content = fs.readFileSync(path.join(dir, files[0]), 'utf8');
  const timestamp = content.match(/^# Briefing — (.+)$/m)?.[1] ?? files[0];
  const text = content.split('\n').slice(2).join('\n').trim();
  return { timestamp, text };
}
