/**
 * Display prices and limits. Whop plan ids are filled in when checkout is added.
 * Components read this file instead of hard-coding prices.
 */

export const plan_ids = ["free", "keep_1_year", "monthly", "yearly"] as const;

/** Plan key stored on a museum once payments exist. */
export type plan_id = (typeof plan_ids)[number];

export interface plan_config {
  id: plan_id;
  name: string;
  price_label: string;
  cadence: string;
  photo_limit: number;
  /** Days the museum stays live. Null means the billing period decides. */
  live_days: number | null;
  show_badge: boolean;
  video_export: boolean;
  /** Whop plan id. Null until the product is created in the Whop sandbox. */
  whop_plan_id: string | null;
}

export const plans: readonly plan_config[] = [
  {
    id: "free",
    name: "Free",
    price_label: "$2",
    cadence: "7 days live",
    photo_limit: 20,
    live_days: 7,
    show_badge: true,
    video_export: false,
    whop_plan_id: null,
  },
  {
    id: "keep_1_year",
    name: "Keep 1 Year",
    price_label: "$12",
    cadence: "one time",
    photo_limit: 100,
    live_days: 365,
    show_badge: false,
    video_export: true,
    whop_plan_id: null,
  },
  {
    id: "monthly",
    name: "Monthly",
    price_label: "$5",
    cadence: "per month",
    photo_limit: 100,
    live_days: null,
    show_badge: false,
    video_export: true,
    whop_plan_id: null,
  },
  {
    id: "yearly",
    name: "Yearly",
    price_label: "$40",
    cadence: "per year",
    photo_limit: 100,
    live_days: null,
    show_badge: false,
    video_export: true,
    whop_plan_id: null,
  },
];

/**
 * Look up a plan by id.
 *
 * @param plan_id - Plan key.
 * @returns The plan, or null when the id is unknown.
 */
export function get_plan(plan_id: string): plan_config | null {
  return plans.find((plan) => plan.id === plan_id) ?? null;
}
