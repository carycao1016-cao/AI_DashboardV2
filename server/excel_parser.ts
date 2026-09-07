import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";

export interface ParsedCell {
  extracted_header_id: string;
  source_cell: string;
  raw_value: unknown;
  excel_display_value: string;
  parsed_value: unknown;
  parsed_unit: string;
  original_significance_marker: string;
  significance_mapping_status: string;
}

export interface ParsedHeader {
  extracted_header_id: string;
  data_column?: string;
  header_path: string[];
  display_label: string;
  significance_code: string;
  source_header_cells?: string[];
}

export interface ParsedRow {
  extracted_row_id: string;
  original_label: string;
  detected_row_type: "base" | "data" | "subtotal" | "header";
  cells: ParsedCell[];
}

export interface ParsedTable {
  extracted_table_id: string;
  source_sheet: string;
  source_range: string;
  detected_question_number: string;
  detected_question_text: string;
  detected_table_title: string;
  table_variant: string;
  headers: ParsedHeader[];
  rows: ParsedRow[];
}

function getCellSafeText(cell: ExcelJS.Cell | undefined): string {
  if (!cell || cell.value === null || cell.value === undefined) return "";
  const val = cell.value;
  if (typeof val === "object") {
    if ("text" in val && (val as any).text) return String((val as any).text);
    if ("result" in val && (val as any).result !== undefined && (val as any).result !== null) return String((val as any).result);
    if ("richText" in val && Array.isArray((val as any).richText)) {
      return (val as any).richText.map((rt: any) => rt.text || "").join("");
    }
  }
  return String(val);
}

function getCellRawValue(cell: ExcelJS.Cell | undefined): any {
  if (!cell || cell.value === null || cell.value === undefined) return null;
  const val = cell.value;
  if (typeof val === "object" && "result" in val && (val as any).result !== undefined) {
    return (val as any).result;
  }
  return val;
}

export async function parseExcelWorkbook(filePath: string, versionId: string): Promise<{
  sheetSummaries: { sheet_name: string; row_count: number; column_count: number; table_count: number }[];
  tables: ParsedTable[];
}> {
  if (!fs.existsSync(filePath)) {
    return { sheetSummaries: [], tables: [] };
  }

  const fileBuffer = fs.readFileSync(filePath);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer);

  const tables: ParsedTable[] = [];
  const sheetSummaries: { sheet_name: string; row_count: number; column_count: number; table_count: number }[] = [];

  let globalTableIndex = 1;

  for (const worksheet of workbook.worksheets) {
    const rowCount = worksheet.rowCount || 0;
    if (rowCount === 0) continue;

    // Detect if this is a Crosstab workbook (Decipher / Kantar format)
    // Structure typically has:
    // "Top Break: ..." or banner rows
    // Banner header rows (e.g. Total, Age, Gender)
    // Question title row (e.g. S1. Country, S3. City/region)
    // Base row (e.g. Base : Total Respondent)
    // Data rows
    // "Table No: X / Y" or next Top Break

    // Multi-pass scan:
    // 1. Check for Quantum #page markers
    const pageRows: number[] = [];
    for (let r = 1; r <= rowCount; r++) {
      const cellA = getCellSafeText(worksheet.getRow(r).getCell(1)).trim();
      if (cellA === "#page") {
        pageRows.push(r);
      }
    }

    interface RawSegment {
      bannerStartRow: number;
      bannerEndRow: number;
      questionRow: number;
      baseRow: number;
      dataStartRow: number;
      dataEndRow: number;
      questionText: string;
      questionNum: string;
    }

    const segments: RawSegment[] = [];

    if (pageRows.length > 0) {
      // Quantum crosstab partitioned by #page
      for (let i = 0; i < pageRows.length; i++) {
        const startRow = pageRows[i];
        const endRow = i + 1 < pageRows.length ? pageRows[i + 1] - 1 : rowCount;

        let qRow = -1;
        let qText = "";
        let qNum = "";
        let bRow = -1;

        for (let r = startRow + 1; r <= endRow; r++) {
          const cellA = getCellSafeText(worksheet.getRow(r).getCell(1)).trim();
          if (
            !qText &&
            cellA &&
            cellA !== "#page" &&
            !cellA.startsWith("____") &&
            !cellA.startsWith("Proportions/Means") &&
            !cellA.startsWith("Overlap formulae")
          ) {
            qRow = r;
            qText = cellA;
            const qMatch = cellA.match(/^([A-Za-z0-9_]{1,30})[\s\.:：-]\s*(.+)/i);
            qNum = qMatch ? qMatch[1].toUpperCase() : `Q${i + 1}`;
          } else if (
            /^Base\s*[:：=]/i.test(cellA) ||
            /^Base\b/i.test(cellA) ||
            /^Unweighted Base/i.test(cellA) ||
            (/^Total\b/i.test(cellA) && bRow === -1 && qRow > 0)
          ) {
            bRow = r;
            break;
          }
        }

        if (qRow > 0) {
          const bannerStart = qRow + 1;
          const bannerEnd = bRow > bannerStart ? bRow - 1 : bannerStart;
          const dataStart = bRow > 0 ? bRow + 1 : bannerEnd + 1;
          segments.push({
            bannerStartRow: bannerStart,
            bannerEndRow: bannerEnd,
            questionRow: qRow,
            baseRow: bRow,
            dataStartRow: dataStart,
            dataEndRow: endRow,
            questionText: qText,
            questionNum: qNum,
          });
        }
      }
    } else {
      // Decipher / Kantar or standard crosstabs
      let currentBannerStart = -1;
      let currentQuestionRow = -1;
      let currentQuestionText = "";
      let currentQuestionNum = "";
      let currentBaseRow = -1;
      let currentDataStart = -1;

      for (let r = 1; r <= rowCount; r++) {
        const row = worksheet.getRow(r);
        const cellA = getCellSafeText(row.getCell(1)).trim();

        if (/^Top Break:/i.test(cellA)) {
          currentBannerStart = r + 1;
        }

        const isQMatch = cellA.match(/^([A-Za-z0-9_]{1,30})[\s\.:：-]\s*(.+)/i);
        const isTableNo = /^Table No:\s*(\d+)/i.test(cellA);

        if (isQMatch && !/^Table No:/i.test(cellA) && !/^Base\b/i.test(cellA) && !/^Total\b/i.test(cellA)) {
          if (currentQuestionRow > 0 && currentDataStart > 0) {
            segments.push({
              bannerStartRow: currentBannerStart > 0 ? currentBannerStart : Math.max(1, currentQuestionRow - 4),
              bannerEndRow: currentQuestionRow - 1,
              questionRow: currentQuestionRow,
              baseRow: currentBaseRow,
              dataStartRow: currentDataStart,
              dataEndRow: r - 1,
              questionText: currentQuestionText,
              questionNum: currentQuestionNum,
            });
          }

          currentQuestionRow = r;
          currentQuestionNum = isQMatch[1].toUpperCase();
          currentQuestionText = cellA;
          currentBaseRow = -1;
          currentDataStart = -1;
        } else if (/^Base\s*[:：=]/i.test(cellA) || /^Base\b/i.test(cellA) || /^Unweighted Base/i.test(cellA)) {
          currentBaseRow = r;
          currentDataStart = r + 1;
        } else if (isTableNo) {
          if (currentQuestionRow > 0 && currentDataStart > 0) {
            segments.push({
              bannerStartRow: currentBannerStart > 0 ? currentBannerStart : Math.max(1, currentQuestionRow - 4),
              bannerEndRow: currentQuestionRow - 1,
              questionRow: currentQuestionRow,
              baseRow: currentBaseRow,
              dataStartRow: currentDataStart,
              dataEndRow: r - 1,
              questionText: currentQuestionText,
              questionNum: currentQuestionNum,
            });
            currentQuestionRow = -1;
            currentDataStart = -1;
          }
        }
      }

      if (currentQuestionRow > 0 && currentDataStart > 0) {
        segments.push({
          bannerStartRow: currentBannerStart > 0 ? currentBannerStart : Math.max(1, currentQuestionRow - 4),
          bannerEndRow: currentQuestionRow - 1,
          questionRow: currentQuestionRow,
          baseRow: currentBaseRow,
          dataStartRow: currentDataStart,
          dataEndRow: rowCount,
          questionText: currentQuestionText,
          questionNum: currentQuestionNum,
        });
      }
    }

    // If standard crosstab detection found segments, process them
    if (segments.length > 0) {
      for (const seg of segments) {
        const headers: ParsedHeader[] = [];
        const colMap: Map<number, ParsedHeader> = new Map();

        // Determine column range by checking banner or base row
        const checkRow = worksheet.getRow(seg.baseRow > 0 ? seg.baseRow : seg.dataStartRow);
        const maxCol = Math.max(checkRow.actualCellCount, 35);

        // Build multi-level header paths from banner rows with horizontal propagation for merged cells
        const bannerStart = Math.max(1, seg.bannerStartRow);
        const bannerEnd = Math.max(bannerStart, seg.bannerEndRow);

        // Pre-propagate merged banner cells across columns
        const bannerGrid: string[][] = [];
        for (let br = bannerStart; br <= bannerEnd; br++) {
          const rowVals: string[] = [];
          let lastVal = "";
          for (let c = 1; c <= maxCol; c++) {
            const txt = getCellSafeText(worksheet.getRow(br).getCell(c)).trim();
            if (txt && !txt.startsWith("____") && !txt.startsWith("Proportions/Means")) {
              lastVal = txt;
              rowVals[c] = txt;
            } else if (lastVal && c > 1) {
              // Check if worksheet has merged cells covering (br, c)
              const cell = worksheet.getRow(br).getCell(c);
              if (cell.isMerged) {
                rowVals[c] = lastVal;
              } else {
                rowVals[c] = "";
              }
            } else {
              rowVals[c] = "";
            }
          }
          bannerGrid.push(rowVals);
        }

        for (let col = 2; col <= maxCol; col++) {
          const pathParts: string[] = [];
          for (const rowVals of bannerGrid) {
            const txt = rowVals[col] || "";
            if (txt && !pathParts.includes(txt)) {
              pathParts.push(txt);
            }
          }

          if (pathParts.length === 0) {
            // Check base or data row to see if this column has values
            const baseTxt = seg.baseRow > 0 ? getCellSafeText(worksheet.getRow(seg.baseRow).getCell(col)).trim() : "";
            const sampleDataTxt = getCellSafeText(worksheet.getRow(seg.dataStartRow).getCell(col)).trim();
            if (!baseTxt && !sampleDataTxt) continue;
            pathParts.push(`Column ${col}`);
          }

          const displayLabel = pathParts.join(" > ");
          const lastPart = pathParts[pathParts.length - 1] || "";
          const sigMatch = displayLabel.match(/\(([A-Za-z]+)\)\s*$/) || lastPart.match(/^[A-Za-z]$/);
          const sigCode = sigMatch ? sigMatch[1] || sigMatch[0] : "";

          const headerObj: ParsedHeader = {
            extracted_header_id: `h_${versionId}_${globalTableIndex}_${col}`,
            data_column: worksheet.getRow(1).getCell(col).address.replace(/\d+/g, ""),
            header_path: pathParts,
            display_label: displayLabel,
            significance_code: sigCode,
            source_header_cells: [worksheet.getRow(bannerEnd).getCell(col).address],
          };
          headers.push(headerObj);
          colMap.set(col, headerObj);
        }

        // Build Rows
        const rows: ParsedRow[] = [];

        // Add Base row if exists
        if (seg.baseRow > 0) {
          const bRow = worksheet.getRow(seg.baseRow);
          const baseLabel = getCellSafeText(bRow.getCell(1)).trim() || "Base : Total Respondent";
          const baseCells: ParsedCell[] = [];

          headers.forEach((header) => {
            let colNum = 2;
            for (const [cNum, hObj] of colMap.entries()) {
              if (hObj === header) {
                colNum = cNum;
                break;
              }
            }
            const cell = bRow.getCell(colNum);
            const rawVal = getCellRawValue(cell);
            const cellText = getCellSafeText(cell).trim();
            const num = parseFloat(cellText.replace(/[^\d.]/g, ""));
            baseCells.push({
              extracted_header_id: header.extracted_header_id,
              source_cell: cell.address,
              raw_value: rawVal ?? null,
              excel_display_value: cellText || String(rawVal ?? ""),
              parsed_value: isNaN(num) ? rawVal : num,
              parsed_unit: "count",
              original_significance_marker: "",
              significance_mapping_status: "not_applicable",
            });
          });

          rows.push({
            extracted_row_id: `r_${versionId}_${globalTableIndex}_base`,
            original_label: baseLabel,
            detected_row_type: "base",
            cells: baseCells,
          });
        }

        // Add Data Rows (and handle Quantum following-row significance)
        let lastDataRow: ParsedRow | null = null;

        for (let r = seg.dataStartRow; r <= seg.dataEndRow; r++) {
          const row = worksheet.getRow(r);
          const cellA = getCellSafeText(row.getCell(1)).trim();

          // Check if this row is a Quantum significance marker row (Col A is empty, but cols have uppercase letter codes)
          if (!cellA && lastDataRow) {
            let hasSigLetters = false;
            headers.forEach((header) => {
              let colNum = 2;
              for (const [cNum, hObj] of colMap.entries()) {
                if (hObj === header) {
                  colNum = cNum;
                  break;
                }
              }
              const txt = getCellSafeText(row.getCell(colNum)).trim();
              if (/^[A-Za-z/]+$/.test(txt)) {
                hasSigLetters = true;
                const prevCell = lastDataRow!.cells.find((c) => c.extracted_header_id === header.extracted_header_id);
                if (prevCell) {
                  prevCell.original_significance_marker = txt;
                  prevCell.significance_mapping_status = "mapped";
                }
              }
            });
            if (hasSigLetters) {
              continue; // Successfully attached to previous data row
            }
          }

          if (!cellA || /^Table No:/i.test(cellA) || /^Top Break:/i.test(cellA) || cellA.startsWith("____") || cellA.startsWith("Proportions/Means")) {
            continue;
          }

          const normA = cellA.toLowerCase();
          let rowType: "base" | "data" | "subtotal" | "header" = "data";
          if (
            normA === "sigma" ||
            normA.startsWith("sigma") ||
            normA.includes("sigma") ||
            normA.includes("σ") ||
            normA.includes("∑") ||
            normA.startsWith("net") ||
            normA.startsWith("total") ||
            normA.startsWith("mean") ||
            normA.startsWith("median") ||
            normA.startsWith("std dev") ||
            normA.startsWith("average") ||
            normA.includes("subtotal") ||
            normA === "总计" ||
            normA === "合计" ||
            normA === "均值"
          ) {
            rowType = "subtotal";
          }

          const cells: ParsedCell[] = [];
          headers.forEach((header) => {
            let colNum = 2;
            for (const [cNum, hObj] of colMap.entries()) {
              if (hObj === header) {
                colNum = cNum;
                break;
              }
            }
            const cell = row.getCell(colNum);
            const rawVal = getCellRawValue(cell);
            const cellText = getCellSafeText(cell).trim();

            let parsedVal: any = rawVal;
            let parsedUnit = "percentage";
            let sigMarker = "";

            if (typeof cellText === "string") {
              const sigMatch = cellText.match(/([A-Za-z]+(\/[A-Za-z]+)?)\s*$/);
              if (sigMatch && !/^Total/i.test(cellText) && !/^Base/i.test(cellText)) {
                sigMarker = sigMatch[1];
              }
            }

            if (cellText === "-" || cellText === "•" || cellText === "*") {
              parsedVal = 0;
            } else if (typeof rawVal === "number") {
              if (rawVal > 1.0) {
                parsedVal = rawVal / 100;
              } else {
                parsedVal = rawVal;
              }
            } else if (typeof cellText === "string" && cellText.length > 0) {
              const cleanNum = parseFloat(cellText.replace(/[^\d.-]/g, ""));
              if (!isNaN(cleanNum)) {
                if (cellText.includes("%") || cleanNum > 1.0) {
                  parsedVal = cleanNum / 100;
                } else {
                  parsedVal = cleanNum;
                }
              }
            }

            let displayVal = cellText;
            if (!displayVal && typeof parsedVal === "number") {
              displayVal = `${(parsedVal * 100).toFixed(1)}%`;
            }

            cells.push({
              extracted_header_id: header.extracted_header_id,
              source_cell: cell.address,
              raw_value: rawVal ?? null,
              excel_display_value: displayVal || String(rawVal ?? ""),
              parsed_value: parsedVal ?? null,
              parsed_unit: parsedUnit,
              original_significance_marker: sigMarker,
              significance_mapping_status: sigMarker ? "mapped" : "not_applicable",
            });
          });

          const newRow: ParsedRow = {
            extracted_row_id: `r_${versionId}_${globalTableIndex}_${r}`,
            original_label: cellA,
            detected_row_type: rowType,
            cells,
          };
          rows.push(newRow);

          if (rowType === "data") {
            lastDataRow = newRow;
          } else {
            lastDataRow = null;
          }
        }

        if (rows.length > 0) {
          const tableId = `tbl_${versionId}_${globalTableIndex}`;
          tables.push({
            extracted_table_id: tableId,
            source_sheet: worksheet.name,
            source_range: `A${seg.bannerStartRow}:AJ${seg.dataEndRow}`,
            detected_question_number: seg.questionNum || `T${globalTableIndex}`,
            detected_question_text: seg.questionText || `Table ${globalTableIndex}`,
            detected_table_title: seg.questionText || `Table ${globalTableIndex}`,
            table_variant: "percentage",
            headers,
            rows,
          });
          globalTableIndex++;
        }
      }
    } else {
      // Fallback for simple flat Excel tables
      const headers: ParsedHeader[] = [];
      const colMap: Map<number, ParsedHeader> = new Map();
      const firstRow = worksheet.getRow(1);

      firstRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        if (colNumber > 1) {
          const rawText = getCellSafeText(cell).trim();
          if (rawText) {
            const headerObj: ParsedHeader = {
              extracted_header_id: `h_${versionId}_${globalTableIndex}_${colNumber}`,
              data_column: cell.address.replace(/\d+/g, ""),
              header_path: [rawText],
              display_label: rawText,
              significance_code: "",
              source_header_cells: [cell.address],
            };
            headers.push(headerObj);
            colMap.set(colNumber, headerObj);
          }
        }
      });

      const rows: ParsedRow[] = [];
      for (let r = 2; r <= Math.min(rowCount, 100); r++) {
        const row = worksheet.getRow(r);
        const cellA = getCellSafeText(row.getCell(1)).trim();
        if (!cellA) continue;

        const cells: ParsedCell[] = [];
        headers.forEach((header) => {
          let colNum = 2;
          for (const [cNum, hObj] of colMap.entries()) {
            if (hObj === header) {
              colNum = cNum;
              break;
            }
          }
          const cell = row.getCell(colNum);
          const rawVal = getCellRawValue(cell);
          const cellText = getCellSafeText(cell).trim();

          cells.push({
            extracted_header_id: header.extracted_header_id,
            source_cell: cell.address,
            raw_value: rawVal ?? null,
            excel_display_value: cellText || String(rawVal ?? ""),
            parsed_value: rawVal ?? null,
            parsed_unit: "count",
            original_significance_marker: "",
            significance_mapping_status: "not_applicable",
          });
        });

        rows.push({
          extracted_row_id: `r_${versionId}_${globalTableIndex}_${r}`,
          original_label: cellA,
          detected_row_type: "data",
          cells,
        });
      }

      if (rows.length > 0) {
        tables.push({
          extracted_table_id: `tbl_${versionId}_${globalTableIndex}`,
          source_sheet: worksheet.name,
          source_range: `A1:Z${Math.min(rowCount, 100)}`,
          detected_question_number: "Q1",
          detected_question_text: `${worksheet.name} 数据总表`,
          detected_table_title: `${worksheet.name} 数据总表`,
          table_variant: "count",
          headers,
          rows,
        });
        globalTableIndex++;
      }
    }

    sheetSummaries.push({
      sheet_name: worksheet.name,
      row_count: rowCount,
      column_count: worksheet.columnCount || 0,
      table_count: tables.filter(t => t.source_sheet === worksheet.name).length,
    });
  }

  return { sheetSummaries, tables };
}
