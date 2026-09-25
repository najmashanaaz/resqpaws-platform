import { env } from '../config/env.js';

/** Sends a high-risk alert to a webhook (Slack, Discord, Teams, Zapier, ...). Never throws. */
export async function notifyHighRisk(report, user) {
  if (!env.alertWebhook) return 'skipped';
  const text = `ResQPaws HIGH-RISK alert: ${report.animalGuess} (${report.state}), confidence ${Math.round(report.confidence * 100)}%. Reported by ${user?.name || 'a user'}. ${
    report.locationText || (report.location ? `Location: ${report.location.coordinates[1]}, ${report.location.coordinates[0]}` : '')
  }`;
  try {
    const res = await fetch(env.alertWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, content: text, report: { id: report._id, riskLevel: report.riskLevel, state: report.state } }),
      signal: AbortSignal.timeout(5000)
    });
    return res.ok ? 'sent' : 'failed';
  } catch {
    return 'failed';
  }
}
