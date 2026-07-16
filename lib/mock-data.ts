export interface Binding {
  principal: string;
  role: string;
  resource: string;
}

export interface IAMData {
  users: string[];
  groups: string[];
  memberships: [string, string][]; // [child, parent] (e.g. ["alice", "developers"] or ["developers", "platform"])
  bindings: Binding[];
}

// Raw GCP Mock Response exactly as specified in the prompt
export const mockGcpResponse: IAMData = {
  users: [
    "alice",
    // 12 other developers
    "bob_dev", "charlie_dev", "david_dev", "emma_dev", "frank_dev", "grace_dev", "henry_dev", "ian_dev", "julia_dev", "kevin_dev", "lucas_dev", "mia_dev",
    // 10 platform engineers
    "olivia_plat", "paul_plat", "quinn_plat", "ryan_plat", "sara_plat", "tom_plat", "uma_plat", "victor_plat", "wendy_plat", "xander_plat"
  ],
  groups: ["developers", "platform", "prod-admins"],
  memberships: [
    // Alice is in developers
    ["alice", "developers"],
    
    // 12 other developers are in developers group
    ["bob_dev", "developers"],
    ["charlie_dev", "developers"],
    ["david_dev", "developers"],
    ["emma_dev", "developers"],
    ["frank_dev", "developers"],
    ["grace_dev", "developers"],
    ["henry_dev", "developers"],
    ["ian_dev", "developers"],
    ["julia_dev", "developers"],
    ["kevin_dev", "developers"],
    ["lucas_dev", "developers"],
    ["mia_dev", "developers"],

    // Nested groups: developers is nested in platform group
    ["developers", "platform"],

    // Direct platform group members (10 engineers)
    ["olivia_plat", "platform"],
    ["paul_plat", "platform"],
    ["quinn_plat", "platform"],
    ["ryan_plat", "platform"],
    ["sara_plat", "platform"],
    ["tom_plat", "platform"],
    ["uma_plat", "platform"],
    ["victor_plat", "platform"],
    ["wendy_plat", "platform"],
    ["xander_plat", "platform"],

    // Nested groups: platform is nested in prod-admins
    ["platform", "prod-admins"]
  ],
  bindings: [
    // Risky production binding
    {
      "principal": "prod-admins",
      "role": "roles/compute.admin",
      "resource": "production-folder"
    },
    // 12 Legitimate development bindings for developers (on 12 separate projects)
    { "principal": "developers", "role": "roles/developer", "resource": "dev-project-1" },
    { "principal": "developers", "role": "roles/developer", "resource": "dev-project-2" },
    { "principal": "developers", "role": "roles/developer", "resource": "dev-project-3" },
    { "principal": "developers", "role": "roles/developer", "resource": "dev-project-4" },
    { "principal": "developers", "role": "roles/developer", "resource": "dev-project-5" },
    { "principal": "developers", "role": "roles/developer", "resource": "dev-project-6" },
    { "principal": "developers", "role": "roles/developer", "resource": "dev-project-7" },
    { "principal": "developers", "role": "roles/developer", "resource": "dev-project-8" },
    { "principal": "developers", "role": "roles/developer", "resource": "dev-project-9" },
    { "principal": "developers", "role": "roles/developer", "resource": "dev-project-10" },
    { "principal": "developers", "role": "roles/developer", "resource": "dev-project-11" },
    { "principal": "developers", "role": "roles/developer", "resource": "dev-project-12" }
  ]
};
