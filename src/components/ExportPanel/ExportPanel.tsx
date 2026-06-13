import { useMemo, useState } from 'react';
import bridge from '@vkontakte/vk-bridge';
import html2canvas from 'html2canvas';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { Button, Group, Header } from '@vkontakte/vkui';
import { downloadText } from '../../utils';
import { computeBestLayout } from '../../gridLayout';
import type { YearStats } from '../../stats';
import type { DayData, VkSyncState } from '../../vkYearStorage';
import { buildYearMarkdownReport } from '../../exportReport';
import { ExportCard } from '../ExportCard/ExportCard';
import './ExportPanel.css';

/**
 * The export card is a fixed shareable artifact, so its dot grid is computed
 * once from a stable target width (clamped to the comfortable 420px cap),
 * independent of the on-screen responsive grid and the user's density choice.
 */
const EXPORT_LAYOUT = computeBestLayout({ width: 440 });

interface ExportPanelProps {
  viewYear: number;
  totalDays: number;
  todayIndex: number;
  days: Record<string, DayData>;
  dateKeys: string[];
  yearStats: YearStats;
  vkSyncState: VkSyncState;
  isDesktopWeb: boolean;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/png');
  });
}

/** Upload a blob to Telegra.ph and return the public HTTPS URL. */
async function uploadToTelegraph(blob: Blob, filename: string): Promise<string> {
  const form = new FormData();
  form.append('file', blob, filename);
  const res = await fetch('https://telegra.ph/upload', { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Telegraph upload failed: ${res.status}`);
  const data = (await res.json()) as Array<{ src: string }>;
  if (!data?.[0]?.src) throw new Error('Telegraph returned empty response');
  return `https://telegra.ph${data[0].src}`;
}

function formatSyncState(syncState: VkSyncState): string {
  if (syncState.status === 'saving') return 'VK Storage: сохраняем изменения...';
  if (syncState.status === 'error') return 'VK Storage: не удалось записать, остаётся локальная копия.';
  if (syncState.status === 'saved' && syncState.savedAt) {
    const time = new Intl.DateTimeFormat('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(syncState.savedAt);
    return `VK Storage: сохранено в ${time}.`;
  }
  return 'VK Storage: синхронизация активна, записи дублируются по ключам года.';
}

export function ExportPanel({
  viewYear,
  totalDays,
  todayIndex,
  days,
  dateKeys,
  yearStats,
  vkSyncState,
  isDesktopWeb,
}: ExportPanelProps) {
  const [isExportingPng, setIsExportingPng] = useState(false);
  const markdownFilename = `days-of-year-${viewYear}.md`;
  const markdownText = useMemo(() => buildYearMarkdownReport({
    year: viewYear,
    totalDays,
    todayIndex,
    days,
    dateKeys,
    yearStats,
  }), [viewYear, totalDays, todayIndex, days, dateKeys, yearStats]);

  async function exportPng() {
    setIsExportingPng(true);
    const host = document.createElement('div');
    host.style.position = 'fixed';
    host.style.left = '-99999px';
    host.style.top = '0';

    let root: ReturnType<typeof createRoot> | null = null;
    try {
      document.body.appendChild(host);
      root = createRoot(host);
      // flushSync forces React to commit the card synchronously, so the node is
      // guaranteed mounted before html2canvas reads it (a bare setTimeout raced
      // React 19's deferred commit and could capture an empty host).
      flushSync(() => {
        root!.render(
          <ExportCard
            year={viewYear}
            totalDays={totalDays}
            todayIndex={todayIndex}
            gridLayout={EXPORT_LAYOUT}
            days={days}
            dateKeys={dateKeys}
            yearStats={yearStats}
          />,
        );
      });

      // Let fonts settle (where supported) before rasterizing.
      await document.fonts?.ready?.catch?.(() => {});

      const target = host.firstElementChild as HTMLElement | null;
      if (!target) return;

      const canvas = await html2canvas(target, {
        backgroundColor: '#08111e',
        scale: 2,
      });

      const filename = `days-of-year-${viewYear}.png`;
      const blob = await canvasToBlob(canvas);

      if (!isDesktopWeb) {
        try {
          const url = await uploadToTelegraph(blob, filename);
          await bridge.send('VKWebAppDownloadFile', { url, filename });
          return;
        } catch {
          // Not on supported mobile VK platform or upload failed.
        }
      }

      try {
        const file = new File([blob], filename, { type: 'image/png' });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file] });
          return;
        }
      } catch {
        // User cancelled or API unavailable.
      }

      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      root?.unmount();
      host.remove();
      setIsExportingPng(false);
    }
  }

  async function exportMarkdown() {
    try {
      const blob = new Blob([markdownText], { type: 'text/markdown;charset=utf-8' });
      const file = new File([blob], markdownFilename, { type: 'text/markdown' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }
    } catch {
      // User cancelled or API unavailable.
    }

    downloadText(markdownFilename, markdownText, 'text/markdown;charset=utf-8');
  }

  async function shareVk() {
    try {
      await bridge.send('VKWebAppShare', { link: window.location.href });
    } catch {
      // User cancelled or VK Bridge unavailable
    }
  }

  return (
    <Group header={<Header>Экспорт</Header>}>
      <div className="vkui-div export-panel__row">
        <Button size="m" mode="primary" onClick={exportPng} loading={isExportingPng} disabled={isExportingPng}>
          Сохранить PNG
        </Button>
        <Button size="m" mode="secondary" onClick={exportMarkdown}>
          Скачать Markdown
        </Button>
        <Button size="m" mode="secondary" onClick={shareVk}>
          Поделиться
        </Button>
      </div>
      <div className="vkui-div small">
        {formatSyncState(vkSyncState)}
      </div>
      <div className="vkui-div small">
        Локальная копия хранится в `localStorage`. На мобильных внутри VK PNG уходит через временную загрузку файла и `VKWebAppDownloadFile`.
      </div>
      <div className="vkui-div export-panel__markdown">
        <div className="export-panel__markdown-head">{markdownFilename}</div>
        <pre className="export-panel__markdown-body">{markdownText}</pre>
      </div>
    </Group>
  );
}
