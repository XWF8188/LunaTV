/* eslint-disable @typescript-eslint/no-explicit-any, no-console */

'use client';

import PageLayout from '@/components/PageLayout';
import UserCardKeyBinding from '@/components/UserCardKeyBinding';

export default function SettingsPage() {
  return (
    <PageLayout>
      <div className='max-w-4xl mx-auto p-6'>
        <UserCardKeyBinding />
      </div>
    </PageLayout>
  );
}
