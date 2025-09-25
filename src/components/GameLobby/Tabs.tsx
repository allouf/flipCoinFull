import React from 'react';

interface TabCounts {
  'available': number;
  'running': number;
  'my-rooms': number;
  'history'?: number;
  'refund'?: number;
}

interface TabsProps {
  activeTab: 'available' | 'running' | 'my-rooms' | 'history' | 'refund';
  onTabChange: (tab: 'available' | 'running' | 'my-rooms' | 'history' | 'refund') => void;
  tabCounts: TabCounts;
}

interface TabConfig {
  value: 'available' | 'running' | 'my-rooms' | 'history' | 'refund';
  label: string;
  icon: JSX.Element;
  showCount?: boolean;
}

export const Tabs: React.FC<TabsProps> = ({
  activeTab,
  onTabChange,
  tabCounts,
}) => {
  const tabs: TabConfig[] = [
    {
      value: 'available',
      label: 'Available',
      showCount: true,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    },
    {
      value: 'running',
      label: 'Running',
      showCount: true,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    {
      value: 'my-rooms',
      label: 'My Rooms',
      showCount: true,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 1v6m8-6v6m-9 4h10" />
        </svg>
      )
    },
    {
      value: 'history',
      label: 'History',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      value: 'refund',
      label: 'Refund',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      )
    }
  ];

  return (
    <div className="tabs tabs-boxed">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          className={`tab gap-2 ${activeTab === tab.value ? 'tab-active' : ''}`}
          onClick={() => onTabChange(tab.value)}
        >
          {tab.icon}
          <span>
            {tab.label}
            {tab.showCount && ` (${tabCounts[tab.value] || 0})`}
          </span>
        </button>
      ))}
    </div>
  );
};
