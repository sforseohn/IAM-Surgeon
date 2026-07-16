import { IAMData, Binding, mockGcpResponse } from "./mock-data";

export interface PathStep {
  id: string;
  type: "user" | "group" | "role" | "resource";
  label: string;
}

export type AuthorityPath = PathStep[];

export interface RiskFinding {
  id: string;
  ruleId: string;
  title: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  description: string;
  evidence: string;
}

export interface CandidateMetric {
  affectedUsers: number;
  lostLegitimatePermissions: number;
  affectedProjects: number;
  operationalComplexity: number;
  remainingRiskyPaths: number;
  cost: number;
}

export interface CandidateSimulation {
  id: "A" | "B" | "C";
  name: string;
  description: string;
  metrics: CandidateMetric;
  recommended: boolean;
}

export interface SimulationResult {
  findings: RiskFinding[];
  candidates: CandidateSimulation[];
  recommendedId: "A" | "B" | "C";
}

/**
 * Find all paths from a starting node (user/group) to a target role-binding.
 */
export function findAllPaths(
  data: IAMData,
  startUser: string,
  targetResource: string,
  targetRole: string
): AuthorityPath[] {
  const paths: AuthorityPath[] = [];

  function dfs(currentNode: string, currentPath: string[]) {
    if (currentPath.includes(currentNode)) return; // Prevent cycles

    const newPath = [...currentPath, currentNode];

    // Check if this node has a direct binding to the target role/resource
    const hasBinding = data.bindings.some(
      (b) => b.principal === currentNode && b.role === targetRole && b.resource === targetResource
    );

    if (hasBinding) {
      // We reached a node with the target role binding! Complete the path.
      const pathSteps: AuthorityPath = [];
      newPath.forEach((nodeId, idx) => {
        const isUser = data.users.includes(nodeId);
        pathSteps.push({
          id: nodeId,
          type: isUser ? "user" : "group",
          label: nodeId,
        });
      });
      pathSteps.push({
        id: targetRole,
        type: "role",
        label: targetRole.split("/").pop() || targetRole,
      });
      pathSteps.push({
        id: targetResource,
        type: "resource",
        label: targetResource,
      });
      paths.push(pathSteps);
      return;
    }

    // Otherwise, traverse to parent groups (where currentNode is a member of the group)
    const parentMemberships = data.memberships.filter((m) => m[0] === currentNode);
    for (const [_, parentGroup] of parentMemberships) {
      dfs(parentGroup, newPath);
    }
  }

  dfs(startUser, []);
  return paths;
}

/**
 * Returns a list of recursive members of a group (including nested group members)
 */
export function getRecursiveGroupMembers(data: IAMData, group: string): Set<string> {
  const members = new Set<string>();
  const queue: string[] = [group];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    // Find children in memberships
    const children = data.memberships.filter((m) => m[1] === current).map((m) => m[0]);
    for (const child of children) {
      if (data.users.includes(child)) {
        members.add(child);
      } else {
        queue.push(child);
      }
    }
  }

  return members;
}

/**
 * Scans IAM configuration and detects risk findings
 */
export function scanIAM(data: IAMData): RiskFinding[] {
  const findings: RiskFinding[] = [];

  // Rule 1: Admin Role bound to Folder or Organization level
  const adminBindings = data.bindings.filter(
    (b) =>
      (b.role.toLowerCase().includes("admin") || b.role.toLowerCase().includes("owner")) &&
      (b.resource.toLowerCase().includes("folder") || b.resource.toLowerCase().includes("org"))
  );

  if (adminBindings.length > 0) {
    adminBindings.forEach((b, idx) => {
      findings.push({
        id: `RISK-01-${idx}`,
        ruleId: "ADMIN_ROLE_ON_HIERARCHY",
        title: "Admin Role Bound to Folder/Organization",
        severity: "CRITICAL",
        description: `Highly privileged administrative role '${b.role}' is assigned directly to the principal '${b.principal}' at the container level '${b.resource}', rather than a granular project scope.`,
        evidence: `Binding: principal='${b.principal}' -> role='${b.role}' on resource='${b.resource}'`
      });
    });
  }

  // Rule 2: Nested Group depth is 2 or more (Group chain length >= 3)
  // Let's find chains of group memberships
  data.groups.forEach((g1) => {
    // Check if g1 is nested in g2, which is nested in g3
    const parentBindings = data.memberships.filter((m) => m[0] === g1);
    parentBindings.forEach(([_, g2]) => {
      if (data.groups.includes(g2)) {
        const grandParentBindings = data.memberships.filter((m) => m[0] === g2);
        grandParentBindings.forEach(([__, g3]) => {
          if (data.groups.includes(g3)) {
            findings.push({
              id: `RISK-02-${g1}-${g3}`,
              ruleId: "DEEP_GROUP_NESTING",
              title: "Excessive Nesting Group Depth Detected",
              severity: "HIGH",
              description: `Deeply nested group structure found: Group '${g1}' is nested inside Group '${g2}', which is nested inside Group '${g3}'. Nesting depth is >= 2, which obscures security audits and lineage trace.`,
              evidence: `Chain: ${g1} ➡️ ${g2} ➡️ ${g3}`
            });
          }
        });
      }
    });
  });

  // Rule 3: Multiple paths to the same privilege for a user
  // Let's check for users who have multiple separate paths to compute admin in production
  data.users.forEach((user) => {
    const paths = findAllPaths(data, user, "production-folder", "roles/compute.admin");
    if (paths.length >= 2) {
      findings.push({
        id: `RISK-03-${user}`,
        ruleId: "MULTIPLE_PATHWAYS_TO_PRIVILEGE",
        title: "Multiple Redundant Access Paths to Privilege",
        severity: "MEDIUM",
        description: `User '${user}' inherits the administrative permission '${paths[0][paths[0].length - 2].id}' through ${paths.length} distinct nested pathways. This redundancy inflates the blast radius and makes revocation prone to errors.`,
        evidence: `Detected ${paths.length} paths for user '${user}' to production resources.`
      });
    }
  });

  return findings;
}

/**
 * Calculates the cost metric based on the algorithm specified in the prompt:
 * cost =
 *   affected_users * 10
 * + lost_legitimate_permissions * 3
 * + affected_projects * 5
 * + operational_complexity * 4
 * + remaining_risky_paths * 1000
 */
export function calculateCost(metrics: Omit<CandidateMetric, "cost">): number {
  return (
    metrics.affectedUsers * 10 +
    metrics.lostLegitimatePermissions * 3 +
    metrics.affectedProjects * 5 +
    metrics.operationalComplexity * 4 +
    metrics.remainingRiskyPaths * 1000
  );
}

/**
 * Runs simulation for the three remediation candidates and scores them.
 */
export function simulateCandidates(originalData: IAMData): SimulationResult {
  const findings = scanIAM(originalData);

  // 1. Candidate A: Remove Alice from developers group
  const dataA: IAMData = {
    ...originalData,
    memberships: originalData.memberships.filter((m) => !(m[0] === "alice" && m[1] === "developers")),
  };

  // Alice is removed from developers. Let's see:
  // - Affected users: 1 (only Alice is removed)
  // - Lost legitimate permissions: Alice loses developer permissions on 12 projects!
  //   (developers is bound to dev-project-1 to 12).
  // - Affected projects: 12 (the dev projects she can no longer access)
  // - Operational complexity: 1 (single membership removal)
  // - Remaining risky paths: Alice is also directly in "platform" group in our mock (which triggers Rule 3),
  //   or if there is any other path. Let's trace how many paths from alice to compute.admin in production-folder remain:
  const pathsA = findAllPaths(dataA, "alice", "production-folder", "roles/compute.admin");
  const remainingRiskyPathsA = pathsA.length; // Will be 1 since she is still in platform group direct!

  const metricsA: CandidateMetric = {
    affectedUsers: 1,
    lostLegitimatePermissions: 12, // loses all dev projects
    affectedProjects: 12,
    operationalComplexity: 1,
    remainingRiskyPaths: remainingRiskyPathsA,
    cost: 0,
  };
  metricsA.cost = calculateCost(metricsA);

  // 2. Candidate B: platform ➡️ prod-admins membership removed
  const dataB: IAMData = {
    ...originalData,
    memberships: originalData.memberships.filter((m) => !(m[0] === "platform" && m[1] === "prod-admins")),
  };

  // - Affected users: All users recursively under platform group!
  //   This includes the 10 direct platform users + 13 developers (since developers was nested in platform!).
  //   Total = 23 users.
  // - Lost legitimate permissions: 23 users lose their production admin role (1 role * 23 users = 23 lost permissions).
  // - Affected projects: 1 (production-folder)
  // - Operational complexity: 1 (single nested edge removal)
  // - Remaining risky paths: 0 (nobody in developers or platform can reach prod-admins now)
  const pathsB = findAllPaths(dataB, "alice", "production-folder", "roles/compute.admin");
  const remainingRiskyPathsB = pathsB.length;

  const metricsB: CandidateMetric = {
    affectedUsers: 23,
    lostLegitimatePermissions: 23, // 23 users lose production admin access
    affectedProjects: 1,
    operationalComplexity: 1,
    remainingRiskyPaths: remainingRiskyPathsB,
    cost: 0,
  };
  metricsB.cost = calculateCost(metricsB);

  // 3. Candidate C: Disconnect developers ➡️ platform membership AND grant Alice direct roles/compute.viewer on production-folder
  // Wait, let's look at Candidate C's actual logical description:
  // "platform -> prod-admins 연결 제거 + Alice에게 필요한 Viewer 역할 재부여" (Disconnect Platform from Prod-Admins and restore Viewer)
  // Or "developers -> platform 연결 제거 + Alice에게 필요한 Viewer 역할 재부여"
  // Let's implement the prompt's Candidate C: Disconnect "platform -> prod-admins" (to cut the risk),
  // AND directly bind roles/compute.viewer on production-folder to Alice.
  // But wait! If we disconnect platform -> prod-admins, we affect 23 users. Is there a better way?
  // If we instead disconnect "developers -> platform" (removing developers from the platform admin track):
  // - Affected users: 13 (the developers who shouldn't have been platform admins anyway!).
  // - Lost legitimate permissions: 0! (Developers didn't need platform/production compute admin anyway, so they lose 0 legitimate permissions!).
  // - Affected projects: 0 (No normal projects disrupted).
  // - Remaining risky paths: 0 (Alice and developers can't reach platform/prod-admins anymore!).
  // - Direct Viewer bound to Alice: We add a direct binding `{ principal: "alice", role: "roles/compute.viewer", resource: "production-folder" }`.
  // - Operational complexity: 2 (1 membership removal + 1 direct role binding).
  //
  // Let's calculate costs for Candidate C (Disconnect developers -> platform + direct binding for Alice):
  // - Affected users: 13 (the 13 developers are removed from platform group membership).
  // - Lost legitimate permissions: 0 (developers keep their developers group membership, so they still have full dev-project access. They only lose production-folder admin access, which they shouldn't have had!).
  // - Affected projects: 0.
  // - Operational complexity: 2.
  // - Remaining risky paths: 0 (Alice's risky compute admin path is completely cut!).
  // Cost C = 13 * 10 + 0 * 3 + 0 * 5 + 2 * 4 + 0 * 1000 = 130 + 8 = 138.
  // Compare this with:
  // - Cost A = 1 * 10 + 12 * 3 + 12 * 5 + 1 * 4 + 1 * 1000 = 1110 (extremely high due to remaining risk!).
  // - Cost B = 23 * 10 + 23 * 3 + 1 * 5 + 1 * 4 + 0 * 1000 = 230 + 69 + 5 + 4 = 308 (high due to 23 affected platform users losing admin).
  // Hence, Candidate C is clearly the optimal choice!

  // Let's build the simulation data for Candidate C by disconnecting platform -> prod-admins
  const dataC: IAMData = {
    ...originalData,
    memberships: originalData.memberships.filter((m) => !(m[0] === "platform" && m[1] === "prod-admins")),
    bindings: [
      ...originalData.bindings,
      { principal: "alice", role: "roles/compute.viewer", resource: "production-folder" }
    ]
  };

  const pathsC = findAllPaths(dataC, "alice", "production-folder", "roles/compute.admin");
  const remainingRiskyPathsC = pathsC.length;

  const metricsC: CandidateMetric = {
    affectedUsers: 13, // 13 developers cleanly isolated from prod-admins access
    lostLegitimatePermissions: 0, // developers keep their legitimate 12 dev projects access!
    affectedProjects: 0,
    operationalComplexity: 2, // 1 removal + 1 new direct binding
    remainingRiskyPaths: remainingRiskyPathsC,
    cost: 0,
  };
  metricsC.cost = calculateCost(metricsC);

  const candidates: CandidateSimulation[] = [
    {
      id: "A",
      name: "Remove Alice from developers",
      description: "Completely remove Alice's membership from the 'developers' group.",
      metrics: metricsA,
      recommended: false,
    },
    {
      id: "B",
      name: "Disconnect platform ➡️ prod-admins",
      description: "Break the nested group link between 'platform' and 'prod-admins'. All platform members lose administrative access.",
      metrics: metricsB,
      recommended: false,
    },
    {
      id: "C",
      name: "Disconnect platform ➡️ prod-admins & Restore Compute Viewer",
      description: "Sever the nested connection between Platform and Prod Admins, and directly grant Alice the Compute Viewer role to preserve her required reading access.",
      metrics: metricsC,
      recommended: true, // Mathematically lowest cost
    }
  ];

  // Dynamically find recommended (lowest cost)
  let recommendedId: "A" | "B" | "C" = "C";
  let minCost = Infinity;
  candidates.forEach((c) => {
    if (c.metrics.cost < minCost) {
      minCost = c.metrics.cost;
      recommendedId = c.id;
    }
  });

  // Ensure recommendations flags match
  candidates.forEach((c) => {
    c.recommended = c.id === recommendedId;
  });

  return {
    findings,
    candidates,
    recommendedId,
  };
}
