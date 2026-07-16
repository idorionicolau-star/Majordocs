import { useMemo } from 'react';
import { differenceInDays, startOfDay } from 'date-fns';
import type { Company } from '@/lib/types';

export type SubscriptionState = {
  isReadOnly: boolean;
  isTrial: boolean;
  daysLeft: number;
  reason: 'trial_expired' | 'suspended' | null;
};

export function useSubscriptionState(companyData: Company | null): SubscriptionState {
  return useMemo(() => {
    if (!companyData) {
      return { isReadOnly: false, isTrial: false, daysLeft: 0, reason: null };
    }

    const status = companyData.status;

    if (status === 'active') {
      return { isReadOnly: false, isTrial: false, daysLeft: 0, reason: null };
    }

    if (status === 'suspended' || (status as string) === 'inactive') {
      return { isReadOnly: true, isTrial: false, daysLeft: 0, reason: 'suspended' };
    }

    if (status === 'trial') {
      if (!companyData.trialEndsAt) {
        // Fallback if no trial date is set
        return { isReadOnly: false, isTrial: true, daysLeft: 0, reason: null };
      }

      const endDate = new Date(companyData.trialEndsAt);
      const today = new Date();

      if (today > endDate) {
        return { isReadOnly: true, isTrial: false, daysLeft: 0, reason: 'trial_expired' };
      } else {
        const days = differenceInDays(startOfDay(endDate), startOfDay(today));
        return { 
          isReadOnly: false, 
          isTrial: true, 
          daysLeft: Math.max(0, days), 
          reason: null 
        };
      }
    }

    return { isReadOnly: false, isTrial: false, daysLeft: 0, reason: null };
  }, [companyData]);
}
