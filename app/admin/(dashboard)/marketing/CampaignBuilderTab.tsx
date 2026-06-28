'use client';

import { CampaignBuilderWizard } from './campaign-builder/CampaignBuilderWizard';

interface CampaignBuilderTabProps {
  isOwner: boolean;
  googleAdsConfigured: boolean;
  llmConfigured: boolean;
}

export function CampaignBuilderTab(props: CampaignBuilderTabProps) {
  return <CampaignBuilderWizard {...props} />;
}
