import bridge from '@vkontakte/vk-bridge';
import html2canvas from 'html2canvas';
import { createRoot } from 'react-dom/client';
import { Button, Div, Group, Header } from '@vkontakte/vkui';
import { downloadText } from '../../utils';
import type { Store } from '../../localStore';
import { ExportCard } from '../ExportCard/ExportCard';
import './ExportPanel.css';

interface ExportPanelProps {
  viewYear: number;
  totalDays: number;
  todayIndex: number;
  gridLayout: { cols: number; cell: number; gap: number };
  store: Store;
  dateKeys: string[];
}

export function ExportPanel({ viewYear, totalDays, todayIndex, gridLayout, store, dateKeys }: ExportPanelProps) {
  async function exportPng() {
    const host = document.createElement('div');
    host.style.position = 'fixed';
    host.style.left = '-99999px';
    host.style.top = '0';
    document.body.appendChild(host);

    const root = createRoot(host);
    root.render(
      <ExportCard
        year={viewYear}
        totalDays={totalDays}
        todayIndex={todayIndex}
        gridLayout={gridLayout}
        days={store.days}
        dateKeys={dateKeys}
      />,
    );

    await new Promise((r) => setTimeout(r, 30));

    const target = host.firstElementChild as HTMLElement | null;
    if (!target) {
      root.unmount();
      host.remove();
      return;
    }

    const canvas = await html2canvas(target, {
      backgroundColor: '#0f0f10',
      scale: 2,
    });
    const dataUrl = canvas.toDataURL('image/png');

    root.unmount();
    host.remove();

    try {
      await bridge.send('VKWebAppShowWallPostBox', {
        message: 'Этот день — один из твоих 365.',
        attachments: dataUrl,
      });
      return;
    } catch {
      // fallback to local download
    }

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `days-of-year-${viewYear}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function exportJson() {
    const filename = `days-of-year-${viewYear}.json`;
    downloadText(filename, JSON.stringify(store, null, 2));
  }

  return (
    <Group header={<Header>Экспорт</Header>}>
      <Div className="export-panel__row">
        <Button size="m" mode="primary" onClick={exportPng}>
          Экспорт PNG
        </Button>
        <Button size="m" mode="secondary" onClick={exportJson}>
          Экспорт JSON
        </Button>
      </Div>
      <Div className="small">
        Данные хранятся локально (localStorage) и в VK Storage (ключ на год).
      </Div>
    </Group>
  );
}
