import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';

interface PdfItem {
  id: number;
  file: File;
  url: string; // адрес для предпросмотра, живёт только в этом браузере
}

const MAX_SIZE_MB = 20;

const isPdf = (file: File) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

const fileKey = (file: File) => `${file.name}|${file.size}|${file.lastModified}`; // нет дублерам

const formatSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} КБ` : `${(bytes / 1024 / 1024).toFixed(1)} МБ`;

let sequence = 0;

const actionBtn =
  'text-sm font-medium px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50';

// чистая ДЕМОНСТРАЦИЯ: файлы никуда не отправляются, они читаются прямо в браузере
export default function CreateTestFromPdf() {
  const navigate = useNavigate();
  const [items, setItems] = useState<PdfItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  // id файла, который сейчас заменяем; null, если файлы добавляются
  const replaceId = useRef<number | null>(null);
  const itemsRef = useRef<PdfItem[]>([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // освобождаем адреса предпросмотра при уходе со страницы
  useEffect(
    () => () => {
      itemsRef.current.forEach((item) => URL.revokeObjectURL(item.url));
    },
    [],
  );

  const selected = items.find((item) => item.id === selectedId) ?? items[0] ?? null;

    const takeFiles = (files: File[], target: number | null) => {
    const problems: string[] = [];
    // уже добавленные файлы; при замене сам заменяемый файл в набор не входит
    const known = new Set(items.filter((item) => item.id !== target).map((item) => fileKey(item.file)));
    const valid = files.filter((file) => {
      if (!isPdf(file)) {
        problems.push(`«${file.name}» не PDF, нужен формат PDF`);
        return false;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        problems.push(`«${file.name}» больше ${MAX_SIZE_MB} МБ`);
        return false;
      }
      const key = fileKey(file);
      if (known.has(key)) {
        problems.push(`«${file.name}» уже добавлен`);
        return false;
      }
      known.add(key);
      return true;
    });
    setError(problems.length > 0 ? `Не добавлено: ${problems.join(', ')}.` : null);
    if (valid.length === 0) return;

    if (target !== null) {
      const [file] = valid;
      const old = items.find((item) => item.id === target);
      if (old) URL.revokeObjectURL(old.url);
      setItems((cur) => cur.map((item) => (item.id === target ? { ...item, file, url: URL.createObjectURL(file) } : item)));
      setSelectedId(target);
      return;
    }

    const added = valid.map((file) => ({ id: ++sequence, file, url: URL.createObjectURL(file) }));
    setItems((cur) => [...cur, ...added]);
    setSelectedId(added[0].id);
  };

  const onPick = (event: ChangeEvent<HTMLInputElement>) => {
    takeFiles(Array.from(event.target.files ?? []), replaceId.current);
    replaceId.current = null;
    event.target.value = ''; // чтобы тот же файл можно было выбрать повторно ヽ（≧□≦）ノ
  };

  const openPicker = (target: number | null) => {
    replaceId.current = target;
    inputRef.current?.click();
  };

  const remove = (id: number) => {
    const item = items.find((i) => i.id === id);
    if (item) URL.revokeObjectURL(item.url);
    setItems((cur) => cur.filter((i) => i.id !== id));
    if (selectedId === id) setSelectedId(null);
    setError(null);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    takeFiles(Array.from(event.dataTransfer.files), null);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-5xl mx-auto px-6">
        <button
          onClick={() => navigate('/teacher/tests/new')}
          className="text-blue-600 hover:text-blue-700 font-medium mb-8"
        >
          ← Назад к выбору
        </button>

        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Создать тест из PDF</h1>
        <p className="text-gray-600 text-lg mb-4">Загрузите PDF-файлы.</p>
        <p className="mb-6 text-sm text-gray-500 bg-gray-100 rounded-2xl p-4">
          Это демонстрация: файлы остаются в вашем браузере и никуда не отправляются.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          onChange={onPick}
          className="hidden"
          data-testid="pdf-input"
        />

        {error && (
          <p role="alert" className="mb-6 bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4">
            {error}
          </p>
        )}

        {items.length === 0 ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`bg-white rounded-3xl border-2 border-dashed p-12 text-center transition-colors ${
              dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
            }`}
          >
            <p className="text-lg text-gray-900 font-medium mb-2">Перетащите PDF сюда</p>
            <p className="text-gray-500 mb-6">или выберите файлы на компьютере (до {MAX_SIZE_MB} МБ каждый)</p>
            <button
              type="button"
              onClick={() => openPicker(null)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-2xl"
            >
              Выбрать PDF
            </button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[320px_1fr] gap-6">
            <div className="space-y-3">
              {items.map((item) => {
                const active = item.id === selected?.id;
                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-2xl border p-4 ${
                      active ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-100'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      aria-pressed={active}
                      className="block w-full text-left"
                    >
                      <p className="font-medium text-gray-900 break-words">{item.file.name}</p>
                      <p className="text-sm text-gray-500 mt-1">{formatSize(item.file.size)}</p>
                    </button>
                    <div className="flex gap-2 mt-3">
                      <button type="button" onClick={() => openPicker(item.id)} className={actionBtn}>
                        Заменить
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(item.id)}
                        className={`${actionBtn} text-red-600 hover:bg-red-50`}
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => openPicker(null)}
                className="w-full rounded-2xl border border-dashed border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium py-3"
              >
                Добавить ещё файлы
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4">
              {selected && (
                <>
                  <div className="flex items-center justify-between gap-4 mb-3 px-2">
                    <p className="font-medium text-gray-900 truncate">{selected.file.name}</p>
                    <a
                      href={selected.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-700 shrink-0"
                    >
                      Открыть в новой вкладке
                    </a>
                  </div>
                  <iframe
                    key={selected.url}
                    src={selected.url}
                    title={`Предпросмотр: ${selected.file.name}`}
                    className="w-full h-[70vh] rounded-2xl border border-gray-100"
                  />
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}