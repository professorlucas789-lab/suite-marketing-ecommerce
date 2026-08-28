import writeXlsxFile from 'write-excel-file/browser';
import type { Cell, Sheet, SheetData } from 'write-excel-file/browser';

export type ExcelCellValue = string | number | boolean | Date | null | undefined;

export interface ExcelSheetDefinition {
  name: string;
  rows: ExcelCellValue[][];
  columnWidths?: number[];
  headerRow?: number;
}

function sanitizeWorksheetName(name: string): string {
  const safeName = name.replace(/[\\/*?:[\]]/g, ' ').trim();
  return (safeName || 'Relatorio').slice(0, 31);
}

function ensureXlsxExtension(filename: string): string {
  return filename.toLowerCase().endsWith('.xlsx') ? filename : `${filename}.xlsx`;
}

function normalizeCellValue(value: ExcelCellValue): Exclude<ExcelCellValue, null | undefined> | string {
  return value ?? '';
}

function getColumnWidths(rows: ExcelCellValue[][], explicitWidths?: number[]) {
  const columnCount = Math.max(...rows.map((row) => row.length), 0);

  return Array.from({ length: columnCount }, (_, index) => {
    const explicitWidth = explicitWidths?.[index];

    if (explicitWidth) {
      return { width: Math.min(Math.max(explicitWidth, 8), 50) };
    }

    const maxLength = rows.reduce((max, row) => {
      const value = row[index];
      return Math.max(max, String(value ?? '').length);
    }, 10);

    return { width: Math.min(Math.max(maxLength + 2, 10), 50) };
  });
}

function toSheetData(sheet: ExcelSheetDefinition): SheetData {
  return sheet.rows.map((row, rowIndex) => {
    const isHeader = sheet.headerRow === rowIndex + 1;

    return row.map((value): Cell => {
      const normalizedValue = normalizeCellValue(value);

      if (!isHeader) {
        return normalizedValue;
      }

      return {
        value: normalizedValue,
        fontWeight: 'bold',
      };
    });
  });
}

export async function exportSheetsToXlsx(
  sheets: ExcelSheetDefinition[],
  filename: string
): Promise<void> {
  const workbookSheets: Sheet<Blob>[] = sheets.map((sheet) => ({
    data: toSheetData(sheet),
    sheet: sanitizeWorksheetName(sheet.name),
    columns: getColumnWidths(sheet.rows, sheet.columnWidths),
    stickyRowsCount: sheet.headerRow,
  }));

  await writeXlsxFile(workbookSheets, {
    fontFamily: 'Arial',
    fontSize: 10,
  }).toFile(ensureXlsxExtension(filename));
}
