// Server-only helper: for a referral, list every transition the current
// user could attempt, marking the target as allowed or with the specific
// guards it's failing. Powers the status action button UI.

import { permittedTargets, evaluateGuard, reasonRequired, type Status } from "@/lib/status-machine";

export type AvailableTransition = {
  to: Status;
  allowed: boolean;
  reasonRequired: boolean;
  unmet: string[];
  message?: string;
};

export async function availableTransitions(
  caseId: string,
  from: Status,
): Promise<AvailableTransition[]> {
  const targets = permittedTargets(from);
  const results = await Promise.all(
    targets.map(async (to) => {
      const guard = await evaluateGuard(caseId, to);
      return {
        to,
        allowed: guard.allowed,
        reasonRequired: reasonRequired(to),
        unmet: guard.allowed ? [] : guard.unmet,
        message: guard.allowed ? undefined : guard.message,
      };
    }),
  );
  return results;
}
