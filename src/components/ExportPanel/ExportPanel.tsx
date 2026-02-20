import bridge from '@vkontakte/vk-bridge';
import html2canvas from 'html2canvas';
import { createRoot } from 'react-dom/client';
import { Button, Group, Header } from '@vkontakte/vkui';
import { downloadText } from '../../utils';
import type { GridLayout } from '../../gridLayout';
import type { Store } from '../../localStore';
import { ExportCard } from '../ExportCard/ExportCard';
import './ExportPanel.css';

interface ExportPanelProps {
  viewYear: number;
  totalDays: number;
  todayIndex: number;
  gridLayout: GridLayout;
  store: Store;
  dateKeys: string[];
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

export function ExportPanel({ viewYear, totalDays, todayIndex, gridLayout, store, dateKeys, isDesktopWeb }: ExportPanelProps) {
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

    root.unmount();
    host.remove();

    const filename = `days-of-year-${viewYear}.png`;
    const blob = await canvasToBlob(canvas);

    // 1. Try native share sheet (mobile browsers)
    try {
      const file = new File([blob], filename, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }
    } catch {
      // User cancelled or API unavailable — fall through
    }

    // 2. Try VK Bridge download (upload to Telegraph → VKWebAppDownloadFile)
    try {
      const url = await uploadToTelegraph(blob, filename);
      await bridge.send('VKWebAppDownloadFile', { url, filename });
      return;
    } catch {
      // Not on VK mobile or upload failed — fall through
    }

    // 3. Fallback: anchor download (web)
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function exportJson() {
    const filename = `days-of-year-${viewYear}.json`;
    const text = JSON.stringify(store, null, 2);

    // 1. Try native share sheet (mobile)
    try {
      const blob = new Blob([text], { type: 'application/json' });
      const file = new File([blob], filename, { type: 'application/json' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }
    } catch {
      // User cancelled or API unavailable — fall through
    }

    // 2. Fallback: anchor download
    downloadText(filename, text);
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
        {isDesktopWeb && (
          <Button size="m" mode="primary" onClick={exportPng}>
            Экспорт PNG
          </Button>
        )}
        {isDesktopWeb && (
          <Button size="m" mode="secondary" onClick={exportJson}>
            Экспорт JSON
          </Button>
        )}
        <Button size="m" mode="secondary" onClick={shareVk}>
          Поделиться
        </Button>
      </div>
      <div className="vkui-div small">
        Данные хранятся локально (localStorage) и в VK Storage (ключ на год).
      </div>
    </Group>
  );
}
