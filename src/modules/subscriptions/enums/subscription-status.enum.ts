export enum SubscriptionStatus {
  /** Active paying subscription or active trial */
  ACTIVE = 'ACTIVE',
  /** In a free trial period */
  TRIALING = 'TRIALING',
  /** Payment failed, grace period active */
  PAST_DUE = 'PAST_DUE',
  /** Subscription cancelled, access until period ends */
  CANCELED = 'CANCELED',
  /** Awaiting first payment confirmation */
  INCOMPLETE = 'INCOMPLETE',
}
