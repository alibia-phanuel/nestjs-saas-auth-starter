export interface OrganizationInvitationEvent {
  email: string;
  organizationName: string;
  token: string;
  expiresAt: Date;
}
