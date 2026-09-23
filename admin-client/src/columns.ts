import type { ColDef, ICellRendererParams, ValueGetterParams } from 'ag-grid-community';

import type { Column, Row } from './api';

const dateFormat = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'medium' });

function escape(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/**
 * Значение ссылки для сортировки, фильтра и быстрого поиска — подпись вместе с id:
 * искать хочется и «Иван», и «#7». Висячая — со знаком, чтобы её можно было найти поиском.
 */
function refValue(row: Row | undefined, field: string): string | null {
  const id = row?.[field];
  if (id == null) return null;
  const label = row?.$labels?.[field];
  return label == null ? `⚠ #${String(id)}` : `${label} #${String(id)}`;
}

function refRenderer(field: string) {
  return (params: ICellRendererParams<Row>) => {
    const id = params.data?.[field];
    if (id == null) return '';
    const label = params.data?.$labels?.[field];
    const idHtml = `<span class="ref-id">#${escape(String(id))}</span>`;
    if (label == null) return `<span class="ref-dangling" title="Нет в базе">⚠ нет</span> ${idHtml}`;
    return `${escape(label)} ${idHtml}`;
  };
}

/** Колонки AG Grid по описанию с сервера. Типы — из OID Postgres, не из данных. */
export function columnDefs(columns: Column[]): ColDef<Row>[] {
  return columns.map((column, index): ColDef<Row> => {
    const base: ColDef<Row> = {
      field: column.field,
      headerName: column.field,
      headerTooltip: `${column.field}: ${column.ref ? 'ссылка' : column.type}`,
      // Первая колонка — почти всегда id: при прокрутке вбок строку без неё не опознать.
      pinned: index === 0 ? 'left' : undefined,
      // Своя отрисовка у каждого типа: вывод типов AG Grid по данным путается на null.
      cellDataType: false,
    };

    if (column.ref) {
      return {
        ...base,
        valueGetter: (p: ValueGetterParams<Row>) => refValue(p.data, column.field),
        cellRenderer: refRenderer(column.field),
        filter: 'agTextColumnFilter',
        minWidth: 180,
      };
    }

    switch (column.type) {
      case 'number':
        return { ...base, filter: 'agNumberColumnFilter', type: 'rightAligned', width: 110 };
      case 'boolean':
        return {
          ...base,
          cellDataType: 'boolean',
          filter: true,
          width: 110,
        };
      case 'date':
        return {
          ...base,
          valueGetter: (p) => {
            const value = p.data?.[column.field];
            return value == null ? null : new Date(value as string);
          },
          valueFormatter: (p) => (p.value ? dateFormat.format(p.value as Date) : ''),
          filter: 'agDateColumnFilter',
          width: 180,
        };
      case 'json':
        return {
          ...base,
          valueGetter: (p) => {
            const value = p.data?.[column.field];
            return value == null ? null : JSON.stringify(value);
          },
          cellClass: 'cell-json',
          filter: 'agTextColumnFilter',
          width: 320,
        };
      case 'array':
        return {
          ...base,
          valueGetter: (p) => {
            const value = p.data?.[column.field];
            return Array.isArray(value) ? value.join(', ') : value;
          },
          filter: 'agTextColumnFilter',
        };
      default:
        return { ...base, filter: 'agTextColumnFilter' };
    }
  });
}
