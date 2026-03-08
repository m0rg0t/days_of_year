import {
  ModalPage,
  ModalPageHeader,
  PanelHeaderButton,
} from '@vkontakte/vkui';

import { DayDetail } from '../DayDetail/DayDetail';
import type { DayData } from '../../vkYearStorage';

interface AppDayModalProps {
  id: string;
  selectedKey: string;
  selectedDayIndex: number;
  totalDays: number;
  isEditable: boolean;
  isToday: boolean;
  dayData: DayData;
  onClose: () => void;
  onUpdateDay: (key: string, patch: Partial<DayData>) => void;
}

export function AppDayModal({
  id,
  selectedKey,
  selectedDayIndex,
  totalDays,
  isEditable,
  isToday,
  dayData,
  onClose,
  onUpdateDay,
}: AppDayModalProps) {
  return (
    <ModalPage
      id={id}
      onClose={onClose}
      dynamicContentHeight
      header={(
        <ModalPageHeader
          after={(
            <PanelHeaderButton onClick={onClose}>
              Готово
            </PanelHeaderButton>
          )}
        >
          День
        </ModalPageHeader>
      )}
    >
      <DayDetail
        selectedKey={selectedKey}
        selectedDayIndex={selectedDayIndex}
        totalDays={totalDays}
        isEditable={isEditable}
        isToday={isToday}
        dayData={dayData}
        onUpdateDay={onUpdateDay}
      />
    </ModalPage>
  );
}
