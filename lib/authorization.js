import { DEMO_USERS } from "./seed";

export const roleCan = {
  view: new Set(["owner", "editor", "viewer"]),
  editWorkflow: new Set(["owner", "editor"]),
  trigger: new Set(["owner", "editor"]),
  approve: new Set(["owner", "editor"]),
  manageMembers: new Set(["owner"]),
  privilegedStep: new Set(["owner"])
};

export function actorFromRequest(request) {
  const actorId = request.headers.get("x-demo-actor") || DEMO_USERS.ownerA.id;
  return Object.values(DEMO_USERS).find((user) => user.id === actorId) || DEMO_USERS.ownerA;
}

export function assertOrgAccess(actor, organizationId, capability = "view") {
  if (actor.orgId !== organizationId || !roleCan[capability]?.has(actor.role)) {
    const error = new Error("You do not have permission to access this organization resource.");
    error.status = 403;
    throw error;
  }
}

export function assertStepPermission(actor, stepType) {
  if (["db_write", "notify"].includes(stepType) && !roleCan.privilegedStep.has(actor.role)) {
    const error = new Error(`${stepType} steps may only be configured by an organization owner.`);
    error.status = 403;
    throw error;
  }
}

export function apiError(error) {
  return {
    error: error.message || "Unexpected server error",
    status: error.status || 500
  };
}
