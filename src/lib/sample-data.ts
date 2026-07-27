/**
 * Sample data used to render the UI when the backend is not connected.
 * Every shape matches `@/lib/types`, so swapping in real API calls later
 * is a drop-in change.
 */

import type {
  Project,
  SopFile,
  Rule,
  Scenario,
  TeamMember,
} from "@/lib/types";

export const sampleProjects: Project[] = [
  {
    id: "onboarding",
    name: "Employee Onboarding",
    description: "HR onboarding procedures converted to approval rules.",
    status: "ready",
    file_count: 4,
    rule_count: 18,
    created_at: "2026-07-10T09:00:00Z",
    updated_at: "2026-07-25T14:30:00Z",
  },
  {
    id: "refunds",
    name: "Refund Policy Engine",
    description: "Customer refund eligibility and escalation logic.",
    status: "processing",
    file_count: 2,
    rule_count: 9,
    created_at: "2026-07-20T11:00:00Z",
    updated_at: "2026-07-27T06:00:00Z",
  },
  {
    id: "compliance",
    name: "Compliance Checks",
    description: "Regulatory SOPs mapped to validation rules.",
    status: "draft",
    file_count: 6,
    rule_count: 0,
    created_at: "2026-07-18T08:00:00Z",
    updated_at: "2026-07-19T08:00:00Z",
  },
];

export const sampleFiles: Record<string, SopFile[]> = {
  onboarding: [
    {
      id: "f1",
      project_id: "onboarding",
      filename: "onboarding-policy.pdf",
      content_type: "application/pdf",
      size_bytes: 248_320,
      status: "processed",
      page_count: 12,
      char_count: 18420,
      created_at: "2026-07-10T09:05:00Z",
    },
    {
      id: "f2",
      project_id: "onboarding",
      filename: "access-provisioning.docx",
      content_type:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size_bytes: 96_100,
      status: "processed",
      page_count: 5,
      char_count: 7300,
      created_at: "2026-07-11T10:00:00Z",
    },
    {
      id: "f3",
      project_id: "onboarding",
      filename: "equipment-checklist.txt",
      content_type: "text/plain",
      size_bytes: 4_200,
      status: "parsed",
      char_count: 4100,
      created_at: "2026-07-12T12:00:00Z",
    },
  ],
  refunds: [
    {
      id: "f4",
      project_id: "refunds",
      filename: "refund-policy.pdf",
      content_type: "application/pdf",
      size_bytes: 132_500,
      status: "processing",
      page_count: 8,
      char_count: 12040,
      created_at: "2026-07-20T11:05:00Z",
    },
  ],
  compliance: [],
};

export const sampleScenarios: Scenario[] = [
  {
    id: "s1",
    section_id: "sec-eligibility",
    condition: "Order age is within 30 days and item is unopened",
    resolution: "Approve full refund automatically",
    resolution_group: "Auto-approve",
    confidence: 0.92,
  },
  {
    id: "s2",
    section_id: "sec-eligibility",
    condition: "Order age is over 30 days but within 60 days",
    resolution: "Route to manager for manual review",
    resolution_group: "Escalate",
    confidence: 0.81,
  },
  {
    id: "s3",
    section_id: "sec-fraud",
    condition: "Customer has 3 or more refunds in 90 days",
    resolution: "Flag account and deny automated refund",
    resolution_group: "Deny",
    confidence: 0.76,
  },
];

export const sampleRules: Rule[] = [
  {
    id: "r1",
    name: "Auto-approve recent unopened returns",
    description: "Approve refunds for unopened items within the return window.",
    priority: 10,
    all: [
      { fact: "order_age_days", operator: "less_than", value: 30 },
      { fact: "item_condition", operator: "equals", value: "unopened" },
    ],
    actions: [
      { type: "set", target: "refund_status", value: "approved" },
      { type: "set", target: "refund_amount", value: "full" },
    ],
    enabled: true,
    source_scenario_id: "s1",
  },
  {
    id: "r2",
    name: "Escalate aging returns",
    description: "Send 30–60 day returns to a manager for review.",
    priority: 20,
    all: [
      { fact: "order_age_days", operator: "greater_than", value: 30 },
      { fact: "order_age_days", operator: "less_than", value: 60 },
    ],
    actions: [{ type: "route", target: "queue", value: "manager_review" }],
    enabled: true,
    source_scenario_id: "s2",
  },
  {
    id: "r3",
    name: "Deny high-frequency refunders",
    description: "Block automated refunds for likely abuse.",
    priority: 5,
    all: [{ fact: "refunds_last_90d", operator: "greater_than", value: 2 }],
    actions: [
      { type: "set", target: "refund_status", value: "denied" },
      { type: "flag", target: "account", value: "review" },
    ],
    enabled: false,
    source_scenario_id: "s3",
  },
];

export const sampleTeam: TeamMember[] = [
  {
    id: "u1",
    name: "Amit Sharma",
    email: "amit@convin.ai",
    role: "owner",
    status: "active",
  },
  {
    id: "u2",
    name: "Priya Nair",
    email: "priya@convin.ai",
    role: "admin",
    status: "active",
  },
  {
    id: "u3",
    name: "Dev Patel",
    email: "dev@convin.ai",
    role: "editor",
    status: "active",
  },
  {
    id: "u4",
    name: "Sara Khan",
    email: "sara@convin.ai",
    role: "viewer",
    status: "invited",
  },
];

export function getProject(id: string): Project | undefined {
  return sampleProjects.find((p) => p.id === id);
}
