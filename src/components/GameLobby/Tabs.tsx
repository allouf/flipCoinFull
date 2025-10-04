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
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    },
    {
      value: 'running',
      label: 'Running',
      showCount: true,
      icon: (
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    {
      value: 'my-rooms',
      label: 'My Rooms',
      showCount: true,
      icon: (
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 1v6m8-6v6m-9 4h10" />
        </svg>
      )
    },
    {
      value: 'history',
      label: 'History',
      icon: (
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      value: 'refund',
      label: 'Refund',
      icon: (
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      )
    }
  ];

  // Mobile-friendly abbreviations for each tab
  const mobileLabels: Record<string, string> = {
    'available': 'Avail',
    'running': 'Active',
    'my-rooms': 'Mine',
    'history': 'Past',
    'refund': 'Refund'
  };

  return (
    <div className="tabs tabs-boxed flex-nowrap p-1">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          className={`
            tab flex-1 min-w-0
            flex-col md:flex-row gap-0 md:gap-2
            px-1.5 md:px-4 py-1.5 md:py-2
            ${activeTab === tab.value ? 'tab-active' : ''}
          `}
          onClick={() => onTabChange(tab.value)}
        >
          {/* Label with icon - stacked on mobile, horizontal on desktop */}
          <span className="flex items-center gap-0.5 md:gap-1 flex-nowrap">
            {tab.icon}
            {/* Show full label on md+, abbreviated on smaller screens */}
            <span className="hidden md:inline whitespace-nowrap text-sm">{tab.label}</span>
            <span className="md:hidden whitespace-nowrap text-[10px] leading-none">{mobileLabels[tab.value]}</span>
          </span>
          {/* Show count badge - below label on mobile, beside on desktop */}
          {tab.showCount && (tabCounts[tab.value] ?? 0) > 0 && (
            <span className="badge badge-xs mt-0.5 md:mt-0 text-[9px] md:text-xs h-3 md:h-auto min-h-0 md:min-h-[1rem] px-1 md:px-2">
              {tabCounts[tab.value] ?? 0}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};
