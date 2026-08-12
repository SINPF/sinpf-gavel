"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { updateNotificationPrefs } from "@/app/actions/update-notification-prefs";

type Prefs = {
  emailNewReferral: boolean;
  emailDeadline: boolean;
  emailInactivity: boolean;
  emailUnassigned: boolean;
  emailMissedInstalment: boolean;
  emailContractExpiry: boolean;
  emailInsuranceExpiry: boolean;
  digestMode: "individual" | "daily_digest";
};

const ALERT_ROWS: { key: keyof Omit<Prefs, "digestMode">; label: string; description: string }[] = [
  { key: "emailNewReferral", label: "New referral", description: "When a case is created and when it is assigned." },
  { key: "emailDeadline", label: "Approaching or passed deadline", description: "Response due dates and next court dates (7, 3, 0 days out and overdue)." },
  { key: "emailInactivity", label: "Case inactivity", description: "Open cases with no activity for over 30 days." },
  { key: "emailUnassigned", label: "Unassigned referral", description: "Received but unassigned for over 3 days (MLS only)." },
  { key: "emailMissedInstalment", label: "Missed settlement instalment", description: "Deed instalment due date passes without a matching payment." },
  { key: "emailContractExpiry", label: "Contract expiry approaching", description: "Contracts expiring in 90, 60, 30 days or on the day (MLS)." },
  { key: "emailInsuranceExpiry", label: "Insurance policy expiry approaching", description: "Medical or property policies expiring in 60, 30 days or on the day (MLS)." },
];

export default function NotificationPrefsClient({ initial }: { initial: Prefs }) {
  const [prefs, setPrefs] = useState<Prefs>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function submit() {
    setSaving(true);
    setSaved(false);
    try {
      await updateNotificationPrefs(prefs);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-3">Email me for</h2>
        <div className="space-y-3">
          {ALERT_ROWS.map((r) => (
            <label
              key={r.key}
              className="flex items-start gap-3 p-3 rounded-md border border-border hover:bg-muted/30 transition-colors cursor-pointer"
            >
              <input
                type="checkbox"
                checked={prefs[r.key]}
                onChange={(e) => setPrefs({ ...prefs, [r.key]: e.target.checked })}
                className="mt-1"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{r.label}</p>
                <p className="text-xs text-muted-foreground">{r.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-3">Email cadence</h2>
        <div className="space-y-2">
          <label className="flex items-center gap-3 p-3 rounded-md border border-border hover:bg-muted/30 transition-colors cursor-pointer">
            <input
              type="radio"
              name="digest"
              checked={prefs.digestMode === "individual"}
              onChange={() => setPrefs({ ...prefs, digestMode: "individual" })}
            />
            <div>
              <p className="text-sm font-medium text-foreground">One email per alert</p>
              <p className="text-xs text-muted-foreground">Immediate notification, one email at a time.</p>
            </div>
          </label>
          <label className="flex items-center gap-3 p-3 rounded-md border border-border hover:bg-muted/30 transition-colors cursor-pointer">
            <input
              type="radio"
              name="digest"
              checked={prefs.digestMode === "daily_digest"}
              onChange={() => setPrefs({ ...prefs, digestMode: "daily_digest" })}
            />
            <div>
              <p className="text-sm font-medium text-foreground">Daily digest</p>
              <p className="text-xs text-muted-foreground">One email per day summarising all alerts.</p>
            </div>
          </label>
        </div>
      </div>

      <div className="flex justify-end items-center gap-3">
        {saved && <span className="text-sm text-success font-medium">Saved.</span>}
        <button
          onClick={submit}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving…" : "Save preferences"}
        </button>
      </div>
    </div>
  );
}
