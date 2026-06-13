import { Group, Header } from '@vkontakte/vkui';

import { DayDetail } from '../DayDetail/DayDetail';
import { ExportPanel } from '../ExportPanel/ExportPanel';
import { StatsPanel } from '../StatsPanel/StatsPanel';
import type { Badge } from '../../badges';
import type { YearStats } from '../../stats';
import type { DayData, VkSyncState } from '../../vkYearStorage';

interface AppSidebarProps {
  isDesktop: boolean;
  selectedKey: string;
  selectedDayIndex: number;
  totalDays: number;
  isEditable: boolean;
  isToday: boolean;
  dayData: DayData;
  onUpdateDay: (key: string, patch: Partial<DayData>) => void;
  yearStats: YearStats;
  badges: Badge[];
  viewYear: number;
  todayIndex: number;
  days: Record<string, DayData>;
  dateKeys: string[];
  vkSyncState: VkSyncState;
  isDesktopWeb: boolean;
}

export function AppSidebar({
  isDesktop,
  selectedKey,
  selectedDayIndex,
  totalDays,
  isEditable,
  isToday,
  dayData,
  onUpdateDay,
  yearStats,
  badges,
  viewYear,
  todayIndex,
  days,
  dateKeys,
  vkSyncState,
  isDesktopWeb,
}: AppSidebarProps) {
  return (
    <div className="app-layout__side">
      {isDesktop && (
        <Group header={<Header>День</Header>}>
          <DayDetail
            selectedKey={selectedKey}
            selectedDayIndex={selectedDayIndex}
            totalDays={totalDays}
            isEditable={isEditable}
            isToday={isToday}
            dayData={dayData}
            onUpdateDay={onUpdateDay}
          />
        </Group>
      )}

      <Group header={<Header>Статистика</Header>}>
        <StatsPanel yearStats={yearStats} badges={badges} isDesktop={isDesktop} />
      </Group>

      <ExportPanel
        viewYear={viewYear}
        totalDays={totalDays}
        todayIndex={todayIndex}
        days={days}
        dateKeys={dateKeys}
        yearStats={yearStats}
        vkSyncState={vkSyncState}
        isDesktopWeb={isDesktopWeb}
      />
    </div>
  );
}
