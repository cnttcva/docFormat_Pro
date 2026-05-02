// File: src/services/docxService.ts
import JSZip from 'jszip';
import { ProcessResult, DocxOptions, HeaderType } from '../types';
import {
    W_NS, TWIPS_PER_CM, TWIPS_PER_PT, DOC_TYPE_KEYWORDS, DEFAULT_OPTIONS,
    getNodes, getOrCreate, setAttr, forceBoldNode, forceParagraphBold, removeBoldNode,
    isTableParagraph, isParagraphBold, normalizeSummary, cleanPunctuation, enforceSchema
} from './docUtils';
import { normalizeTables } from './docTable';
import { createHeaderTemplate, createSignatureBlock } from './docSignature';
import { autoCorrectText } from './textCorrector';
import { formatPageStructure } from './docPageLayout';
import { coreSmartFormat } from './docTextProcessor';

import { cleanHeader, cleanTail, trimParagraphs } from './docCleaner';
import { extractReceivers } from './docExtractor';

// 🔥 MỤC TIÊU 1: NÂNG CẤP LÕI NHẬN DIỆN TỪ ĐIỂN ĐÁM MÂY
export const processDocx = async (file: File, options: DocxOptions, dictionary: any[] = []): Promise<ProcessResult> => {
  const logs: string[] = [];
  const finalOptions = { ...DEFAULT_OPTIONS, ...options };

  // 🛡️ TRẠM KIỂM SOÁT TỪ VỰNG TỪ ĐÁM MÂY
  const applyCloudDictionary = (text: string) => {
    if (!text || !dictionary || dictionary.length === 0) return text;
    let newText = text;

    dictionary.forEach(entry => {
      if (entry.wrong && entry.right) {
        const escapedWrong = entry.wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedWrong, 'g');
        newText = newText.replace(regex, entry.right);
      }
    });

    return newText;
  };

  try {
    logs.push(`Loading file: ${file.name}`);

    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    const docXmlPath = "word/document.xml";
    const docXmlContent = await zip.file(docXmlPath)?.async("string");

    if (!docXmlContent) throw new Error("Invalid DOCX");

    const parser = new DOMParser();
    const doc = parser.parseFromString(docXmlContent, "application/xml");
    const body = getNodes(doc, "body")[0];

    extractReceivers(doc, finalOptions);
    trimParagraphs(doc);
    cleanHeader(doc, finalOptions.headerType);
    cleanTail(doc);

    // ==========================================
    // BƯỚC 2: XÓA ĐÁNH SỐ TỰ ĐỘNG
    // ==========================================
    let listFormats: Record<string, string> = {};
    const numberingXmlContent = await zip.file("word/numbering.xml")?.async("string");

    if (numberingXmlContent) {
        const numDoc = parser.parseFromString(numberingXmlContent, "application/xml");
        const nums = getNodes(numDoc, "num");
        const abstractNums = getNodes(numDoc, "abstractNum");

        const numToAbstractMap: Record<string, string> = {};

        for (const num of nums) {
            const numId = num.getAttributeNS(W_NS, "numId") || num.getAttribute("w:numId");
            const absNumIdEl = getNodes(num, "abstractNumId")[0];

            if (numId && absNumIdEl) {
              numToAbstractMap[numId] =
                absNumIdEl.getAttributeNS(W_NS, "val") ||
                absNumIdEl.getAttribute("w:val") ||
                "";
            }
        }

        const absNumMap: Record<string, Element> = {};

        for (const absNum of abstractNums) {
            const absId =
              absNum.getAttributeNS(W_NS, "abstractNumId") ||
              absNum.getAttribute("w:abstractNumId");

            if (absId) absNumMap[absId] = absNum;
        }

        for (const numId in numToAbstractMap) {
            const absId = numToAbstractMap[numId];
            const absNum = absNumMap[absId];

            if (absNum) {
                const lvls = getNodes(absNum, "lvl");

                for (const lvl of lvls) {
                    const ilvl = lvl.getAttributeNS(W_NS, "ilvl") || lvl.getAttribute("w:ilvl");
                    const numFmtEl = getNodes(lvl, "numFmt")[0];
                    const numFmt = numFmtEl
                      ? (numFmtEl.getAttributeNS(W_NS, "val") || numFmtEl.getAttribute("w:val"))
                      : "";

                    if (ilvl && numFmt) listFormats[`${numId}_${ilvl}`] = numFmt;
                }
            }
        }
    }

    if (finalOptions.removeNumbering) {
        const allParagraphs = getNodes(doc, "p");
        let listCounters: Record<string, number> = {};

        for (const p of allParagraphs) {
            const pPr = getNodes(p, "pPr")[0];

            let fullText = "";
            const pRunsForText = getNodes(p, "r");

            for (const r of pRunsForText) {
                Array.from(r.childNodes).forEach(child => {
                    const name = child.nodeName.replace("w:", "");
                    if (name === "t") fullText += child.textContent;
                    if (name === "tab") fullText += " ";
                });
            }

            fullText = fullText.trim();

            if (pPr) {
                const numPr = getNodes(pPr, "numPr")[0];

                if (numPr) {
                    const ilvlEl = getNodes(numPr, "ilvl")[0];
                    const numIdEl = getNodes(numPr, "numId")[0];

                    const ilvl = ilvlEl
                      ? (ilvlEl.getAttributeNS(W_NS, "val") || ilvlEl.getAttribute("w:val") || "0")
                      : "0";

                    const numId = numIdEl
                      ? (numIdEl.getAttributeNS(W_NS, "val") || numIdEl.getAttribute("w:val") || "0")
                      : "0";

                    const levelKey = `${numId}_${ilvl}`;
                    const numFmt = listFormats[levelKey] || "decimal";

                    if (!listCounters[levelKey]) listCounters[levelKey] = 0;
                    listCounters[levelKey]++;

                    const hasListPrefix = /^([IVXLCDM]+\.|[0-9]+\.|[a-zđ]\)|\-|\+|\*|•)/i.test(fullText);

                    if (!hasListPrefix && fullText.length > 0) {
                        let prefix = "";

                        if (numFmt === "bullet") prefix = "";
                        else if (numFmt === "decimal") prefix = `${listCounters[levelKey]}. `;
                        else if (numFmt === "lowerLetter") prefix = `${String.fromCharCode(96 + listCounters[levelKey])}) `;
                        else if (numFmt === "upperLetter") prefix = `${String.fromCharCode(64 + listCounters[levelKey])}. `;
                        else prefix = `${listCounters[levelKey]}. `;

                        if (prefix !== "") {
                            const r = doc.createElementNS(W_NS, "w:r");
                            const t = doc.createElementNS(W_NS, "w:t");

                            t.setAttribute("xml:space", "preserve");
                            t.textContent = prefix;
                            r.appendChild(t);

                            const insertBeforeNode = pPr.nextSibling;

                            if (insertBeforeNode) p.insertBefore(r, insertBeforeNode);
                            else p.appendChild(r);
                        }
                    }

                    pPr.removeChild(numPr);
                }
            }

            const firstRun = getNodes(p, "r")[0];

            if (firstRun) {
                const firstText = getNodes(firstRun, "t")[0];

                if (firstText && firstText.textContent) {
                    const bulletRegex = /^[\s]*([•\-\–\—\*])[\s]+/;

                    if (bulletRegex.test(firstText.textContent)) {
                        firstText.textContent = firstText.textContent.replace(bulletRegex, "").trimStart();
                    }
                }
            }
        }
    }

    formatPageStructure(doc, finalOptions);
    normalizeTables(doc, finalOptions);

    const rebuildParagraph = (
      p: Element,
      text: string,
      isBold: boolean,
      fontSize: string,
      isTitle: boolean
    ) => {
        Array.from(p.childNodes).forEach(child => {
            const localName = child.nodeName.includes(":") ? child.nodeName.split(":")[1] : child.nodeName;
            if (localName !== "pPr") p.removeChild(child);
        });

        const r = doc.createElementNS(W_NS, "w:r");
        const rPr = doc.createElementNS(W_NS, "w:rPr");
        r.appendChild(rPr);

        const pPr = getOrCreate(p, "w:pPr");

        const jc = getOrCreate(pPr, "w:jc");
        setAttr(jc, "val", "center");

        const ind = getOrCreate(pPr, "w:ind");
        setAttr(ind, "left", "0");
        setAttr(ind, "right", "0");
        setAttr(ind, "firstLine", "0");
        ind.removeAttributeNS(W_NS, "hanging");
        ind.removeAttribute("w:hanging");

        const spacing = getOrCreate(pPr, "w:spacing");
        setAttr(spacing, "before", isTitle ? "480" : "0");
        setAttr(spacing, "after", "0");
        setAttr(spacing, "line", "240");
        setAttr(spacing, "lineRule", "auto");

        const rFonts = getOrCreate(rPr, "w:rFonts");
        setAttr(rFonts, "ascii", finalOptions.font.family);
        setAttr(rFonts, "hAnsi", finalOptions.font.family);
        setAttr(rFonts, "cs", finalOptions.font.family);
        setAttr(rFonts, "eastAsia", finalOptions.font.family);

        if (isBold) {
            forceBoldNode(rPr);
            forceParagraphBold(pPr);
        } else {
            removeBoldNode(rPr);
        }

        const iEl = getNodes(rPr, "i")[0];
        if (iEl) rPr.removeChild(iEl);

        const iCsEl = getNodes(rPr, "iCs")[0];
        if (iCsEl) rPr.removeChild(iCsEl);

        const sz = getOrCreate(rPr, "w:sz");
        setAttr(sz, "val", fontSize);

        const szCs = getOrCreate(rPr, "w:szCs");
        setAttr(szCs, "val", fontSize);

        const t = doc.createElementNS(W_NS, "w:t");
        t.textContent = applyCloudDictionary(text);
        r.appendChild(t);
        p.appendChild(r);
    };

    const createTitleUnderlineFrag = (
      protectedElements: Set<Element>,
      lineTables: Set<Element>
    ): DocumentFragment => {
        const frag = doc.createDocumentFragment();

        const tbl = doc.createElementNS(W_NS, "w:tbl");
        lineTables.add(tbl);

        const tblPr = doc.createElementNS(W_NS, "w:tblPr");
        tbl.appendChild(tblPr);

        const jcTbl = doc.createElementNS(W_NS, "w:jc");
        setAttr(jcTbl, "val", "center");
        tblPr.appendChild(jcTbl);

        const tblW = doc.createElementNS(W_NS, "w:tblW");
        setAttr(tblW, "w", "1500");
        setAttr(tblW, "type", "dxa");
        tblPr.appendChild(tblW);

        const tblLayout = doc.createElementNS(W_NS, "w:tblLayout");
        setAttr(tblLayout, "type", "fixed");
        tblPr.appendChild(tblLayout);

        const tblGrid = doc.createElementNS(W_NS, "w:tblGrid");
        const gridCol = doc.createElementNS(W_NS, "w:gridCol");
        setAttr(gridCol, "w", "1500");
        tblGrid.appendChild(gridCol);
        tbl.appendChild(tblGrid);

        const tr = doc.createElementNS(W_NS, "w:tr");
        tbl.appendChild(tr);

        const trPr = doc.createElementNS(W_NS, "w:trPr");
        const trHeight = doc.createElementNS(W_NS, "w:trHeight");
        setAttr(trHeight, "val", String(Math.round(0.1 * TWIPS_PER_CM)));
        setAttr(trHeight, "hRule", "exact");
        trPr.appendChild(trHeight);
        tr.appendChild(trPr);

        const tc = doc.createElementNS(W_NS, "w:tc");
        tr.appendChild(tc);

        const tcPr = doc.createElementNS(W_NS, "w:tcPr");
        tc.appendChild(tcPr);

        const tcW = doc.createElementNS(W_NS, "w:tcW");
        setAttr(tcW, "w", "1500");
        setAttr(tcW, "type", "dxa");
        tcPr.appendChild(tcW);

        const tcMar = doc.createElementNS(W_NS, "w:tcMar");
        ["top", "bottom", "left", "right"].forEach(side => {
            const mar = doc.createElementNS(W_NS, `w:${side}`);
            setAttr(mar, "w", "0");
            setAttr(mar, "type", "dxa");
            tcMar.appendChild(mar);
        });
        tcPr.appendChild(tcMar);

        const tcBorders = doc.createElementNS(W_NS, "w:tcBorders");
        const top = doc.createElementNS(W_NS, "w:top");
        setAttr(top, "val", "single");
        setAttr(top, "sz", "6");
        setAttr(top, "space", "0");
        setAttr(top, "color", "000000");
        tcBorders.appendChild(top);
        tcPr.appendChild(tcBorders);

        const p = doc.createElementNS(W_NS, "w:p");
        const pPr = doc.createElementNS(W_NS, "w:pPr");
        p.appendChild(pPr);

        const spacing = doc.createElementNS(W_NS, "w:spacing");
        setAttr(spacing, "before", "0");
        setAttr(spacing, "after", "120");
        setAttr(spacing, "line", "2");
        setAttr(spacing, "lineRule", "exact");
        pPr.appendChild(spacing);

        tc.appendChild(p);
        protectedElements.add(p);

        frag.appendChild(tbl);
        return frag;
    };

    const createPartyDashLine = (protectedElements: Set<Element>): Element => {
        const p = doc.createElementNS(W_NS, "w:p");
        const pPr = getOrCreate(p, "w:pPr");

        const jc = getOrCreate(pPr, "w:jc");
        setAttr(jc, "val", "center");

        const ind = getOrCreate(pPr, "w:ind");
        setAttr(ind, "left", "0");
        setAttr(ind, "right", "0");
        setAttr(ind, "firstLine", "0");
        ind.removeAttributeNS(W_NS, "hanging");
        ind.removeAttribute("w:hanging");

        const spacing = getOrCreate(pPr, "w:spacing");
        setAttr(spacing, "before", "0");
        setAttr(spacing, "after", "120");
        setAttr(spacing, "line", "240");
        setAttr(spacing, "lineRule", "auto");

        const r = doc.createElementNS(W_NS, "w:r");
        const rPr = getOrCreate(r, "w:rPr");

        const rFonts = getOrCreate(rPr, "w:rFonts");
        setAttr(rFonts, "ascii", finalOptions.font.family);
        setAttr(rFonts, "hAnsi", finalOptions.font.family);
        setAttr(rFonts, "cs", finalOptions.font.family);
        setAttr(rFonts, "eastAsia", finalOptions.font.family);

        removeBoldNode(rPr);

        const sz = getOrCreate(rPr, "w:sz");
        setAttr(sz, "val", String(finalOptions.font.sizeNormal * 2));

        const szCs = getOrCreate(rPr, "w:szCs");
        setAttr(szCs, "val", String(finalOptions.font.sizeNormal * 2));

        const t = doc.createElementNS(W_NS, "w:t");
        t.textContent = "-----";

        r.appendChild(t);
        p.appendChild(r);

        protectedElements.add(p);

        return p;
    };

    const paragraphs = getNodes(doc, "p");
    let detectedDocType = "";
    const docTypeElements = new Set<Element>();
    const abstractElements = new Set<Element>();
    const protectedElements = new Set<Element>();
    const lineTables = new Set<Element>();

    let shouldAddSingleLineBeforeBody = false;

    const limit = Math.min(paragraphs.length, 20);

    for (let i = 0; i < limit; i++) {
        const p = paragraphs[i];

        if (isTableParagraph(p)) continue;

        const text = p.textContent?.trim() || "";

        if (!text) continue;

        if (finalOptions.isCongVan) {
            const upperText = text.toUpperCase();

            if (
                upperText === "CÔNG VĂN" ||
                upperText.startsWith("V/V") ||
                upperText.startsWith("VỀ VIỆC") ||
                upperText.startsWith("TRÍCH YẾU")
            ) {
                abstractElements.add(p);
                p.parentNode?.removeChild(p);
            }

            continue;
        }

        const cleanText = text.toUpperCase().replace(/^[^A-ZÀ-Ỹ]+/, '');
        const matchedKeyword = DOC_TYPE_KEYWORDS.find(k => cleanText.startsWith(k));

        if (matchedKeyword) {
            docTypeElements.add(p);
            detectedDocType = matchedKeyword;

            const summaryParagraphs: Element[] = [];
            const originalUpper = text.toUpperCase();
            const keywordIndex = originalUpper.indexOf(matchedKeyword);
            const remainingText = text.slice(keywordIndex + matchedKeyword.length).trim();

            rebuildParagraph(p, matchedKeyword, true, "28", true);

            if (remainingText.length > 3) {
                const newP = doc.createElementNS(W_NS, "w:p");

                if (p.nextSibling) p.parentNode?.insertBefore(newP, p.nextSibling);
                else p.parentNode?.appendChild(newP);

                summaryParagraphs.push(newP);

                rebuildParagraph(
                    newP,
                    applyCloudDictionary(normalizeSummary(remainingText)),
                    true,
                    String(finalOptions.font.sizeNormal * 2),
                    false
                );
            }

            let linesCaptured = 0;
            let currentIndex = i + 1;
            let hasFoundBoldSummary = false;

            while (currentIndex < paragraphs.length && linesCaptured < 8) {
                const tempP = paragraphs[currentIndex];

                if (isTableParagraph(tempP)) break;

                const tempText = tempP.textContent?.trim() || "";

                if (tempText.length > 0) {
                    const upperText = tempText.toUpperCase();

                    if (
                        upperText.startsWith("CĂN CỨ") ||
                        upperText.startsWith("XÉT") ||
                        upperText.startsWith("THEO") ||
                        upperText.startsWith("KÍNH GỬI") ||
                        upperText.startsWith("HÔM NAY") ||
                        upperText.startsWith("THỜI GIAN:") ||
                        upperText.startsWith("ĐỒNG KÍNH GỬI")
                    ) break;

                    if (
                        upperText.startsWith("HIỆU TRƯỞNG") ||
                        upperText.startsWith("GIÁM ĐỐC") ||
                        upperText.startsWith("CHỦ TỊCH") ||
                        upperText.startsWith("QUYẾT ĐỊNH")
                    ) break;

                    if (/^([IVXLCDM]+|[0-9]+)[\.\)]\s/.test(tempText)) break;
                    if (tempText.length > 250) break;

                    const isBold = isParagraphBold(tempP);

                    if (hasFoundBoldSummary && !isBold) break;
                    if (isBold) hasFoundBoldSummary = true;
                    if (!hasFoundBoldSummary && linesCaptured >= 3) break;

                    summaryParagraphs.push(tempP);

                    rebuildParagraph(
                        tempP,
                        applyCloudDictionary(normalizeSummary(tempText)),
                        true,
                        String(finalOptions.font.sizeNormal * 2),
                        false
                    );

                    linesCaptured++;
                } else {
                    const toDelete = tempP;
                    toDelete.parentNode?.removeChild(toDelete);
                }

                currentIndex++;
            }

            summaryParagraphs.forEach(sp => abstractElements.add(sp));

            if (!finalOptions.isCongVan) {
                const targetNode =
                  summaryParagraphs.length > 0
                    ? summaryParagraphs[summaryParagraphs.length - 1]
                    : p;

                let nextNode = targetNode.nextSibling;

                while (nextNode) {
                    const nodeName = nextNode.nodeName;

                    if (nodeName === "w:p" || nodeName === "p") {
                        const el = nextNode as Element;
                        const textNodes = getNodes(el, "t");
                        const text = textNodes.map(n => n.textContent || "").join("").trim();

                        let hasPageBreak = false;
                        const brs = getNodes(el, "br");

                        for (const br of brs) {
                            if (
                              br.getAttribute("w:type") === "page" ||
                              br.getAttributeNS(W_NS, "type") === "page"
                            ) {
                                hasPageBreak = true;
                                break;
                            }
                        }

                        if (text.length === 0 && !hasPageBreak) {
                            const toDelete = nextNode;
                            nextNode = nextNode.nextSibling;
                            toDelete.parentNode?.removeChild(toDelete);
                        } else {
                            break;
                        }
                    } else if (nodeName === "w:tbl" || nodeName === "tbl") {
                        const el = nextNode as Element;
                        const text = el.textContent?.trim() || "";

                        if (text.length === 0) {
                            const toDelete = nextNode;
                            nextNode = nextNode.nextSibling;
                            toDelete.parentNode?.removeChild(toDelete);
                        } else {
                            break;
                        }
                    } else {
                        nextNode = nextNode.nextSibling;
                    }
                }

                if (finalOptions.headerType === HeaderType.PARTY) {
                    const dashP = createPartyDashLine(protectedElements);

                    if (nextNode) targetNode.parentNode?.insertBefore(dashP, nextNode);
                    else targetNode.parentNode?.appendChild(dashP);
                } else {
                    const underlineFrag = createTitleUnderlineFrag(protectedElements, lineTables);

                    if (nextNode) targetNode.parentNode?.insertBefore(underlineFrag, nextNode);
                    else targetNode.parentNode?.appendChild(underlineFrag);
                }
            }

            if (
                detectedDocType !== "QUYẾT ĐỊNH" &&
                finalOptions.isDecision !== true &&
                finalOptions.isCongVan !== true
            ) {
                shouldAddSingleLineBeforeBody = true;
            }

            break;
        }
    }

    const finalParagraphs = getNodes(doc, "p");
    let inKinhGuiBlock = false;
    let addSpaceBeforeMainContent = false;
    let isBodyArea = true;
    
    let hasPassedDecisionWord = false; 
    let validContentLines = 0;

    const isSchoolDecision =
      finalOptions.isDecision === true &&
      finalOptions.headerType === HeaderType.SCHOOL;

    const isPartyDecision =
      finalOptions.isDecision === true &&
      finalOptions.headerType === HeaderType.PARTY;

    for (const p of finalParagraphs) {
      if (docTypeElements.has(p) || abstractElements.has(p) || protectedElements.has(p)) continue;

      const pText = p.textContent || "";
      const trimmedPTextOriginal = pText.trim();
      const upperText = trimmedPTextOriginal.toUpperCase();

      if (upperText === "QUYẾT ĐỊNH" || upperText === "QUYẾT ĐỊNH:") {
          hasPassedDecisionWord = true;
      }

      if (trimmedPTextOriginal.length > 0) {
          validContentLines++;
      }

      if (isBodyArea && trimmedPTextOriginal.length > 0) {
          const isTopHeaderAuth = (detectedDocType === "QUYẾT ĐỊNH" || finalOptions.isDecision === true) && 
                                  !hasPassedDecisionWord && 
                                  (upperText.includes("HIỆU TRƯỞNG") || upperText.includes("GIÁM ĐỐC") || upperText.includes("CHỦ TỊCH") || upperText.includes("CẤP ỦY"));

          if (
            upperText.startsWith("NƠI NHẬN:") ||
            upperText === "NƠI NHẬN" ||
            (
              !isTopHeaderAuth && 
              validContentLines > 2 && 
              trimmedPTextOriginal.length < 40 &&
              (
                upperText.includes("HIỆU TRƯỞNG") ||
                upperText.includes("GIÁM ĐỐC") ||
                upperText.includes("CHỦ TỊCH") ||
                upperText.includes("BÍ THƯ") ||
                upperText.includes("BỘ TRƯỞNG") ||
                upperText.startsWith("KT. ") ||
                upperText.startsWith("TM. ") ||
                upperText.startsWith("T/M ") ||
                upperText === "THỦ TRƯỞNG ĐƠN VỊ" ||
                upperText === "CHỦ TỌA" ||
                upperText === "THƯ KÝ" ||
                upperText === "NGƯỜI LẬP" ||
                upperText === "NGƯỜI VIẾT"
              )
            )
          ) {
              isBodyArea = false;
          }
      }

      const isTable = isTableParagraph(p);
      const rawTextForEmptyCheck = pText.replace(/[\s\u200B-\u200D\uFEFF\xA0]+/g, '');

      if (isBodyArea && rawTextForEmptyCheck.length === 0 && !isTable) {
          const hasDrawing = getNodes(p, "drawing").length > 0;
          const hasPict = getNodes(p, "pict").length > 0;
          const hasObject = getNodes(p, "object").length > 0;
          const hasSectPr = getNodes(p, "sectPr").length > 0;

          let hasPageBreak = false;
          const brs = getNodes(p, "br");

          for (const br of brs) {
            if (
              br.getAttribute("w:type") === "page" ||
              br.getAttributeNS(W_NS, "type") === "page"
            ) {
              hasPageBreak = true;
              break;
            }
          }

          const hasContent = hasDrawing || hasPict || hasObject || hasSectPr || hasPageBreak;

          if (!hasContent) {
            p.parentNode?.removeChild(p);
            continue;
          }
      }

      if (isTable) continue;

      const pPr = getOrCreate(p, "w:pPr");

      if (
        shouldAddSingleLineBeforeBody &&
        isBodyArea &&
        trimmedPTextOriginal.length > 0 &&
        !isTable
      ) {
        addSpaceBeforeMainContent = true;
        shouldAddSingleLineBeforeBody = false;
      }

      let startTrimmed = false;
      const runsForTrim = getNodes(p, "r");

      for (const r of runsForTrim) {
          if (startTrimmed) break;

          const children = Array.from(r.childNodes);

          for (const child of children) {
              const name = child.nodeName.replace("w:", "");

              if (name === "tab") {
                r.removeChild(child);
              } else if (name === "t") {
                  if (child.textContent) {
                      const original = child.textContent;
                      const trimmed = original.replace(/^[\s\xA0]+/, '');

                      child.textContent = trimmed;

                      if (trimmed.length > 0) {
                        startTrimmed = true;
                        break;
                      }
                  }
              } else if (name === "drawing" || name === "pict") {
                startTrimmed = true;
                break;
              }
          }
      }

      const contextualSpacing = getNodes(pPr, "contextualSpacing")[0];
      if (contextualSpacing) contextualSpacing.parentNode?.removeChild(contextualSpacing);

      if (finalOptions.isCongVan) {
          if (upperText.startsWith("KÍNH GỬI:") || upperText === "KÍNH GỬI") {
              inKinhGuiBlock = true;

              const jc = getOrCreate(pPr, "w:jc");
              setAttr(jc, "val", "left");

              const ind = getOrCreate(pPr, "w:ind");
              setAttr(ind, "left", "2160");
              setAttr(ind, "right", "0");
              setAttr(ind, "firstLine", "0");
              ind.removeAttributeNS(W_NS, "hanging");
              ind.removeAttribute("w:hanging");

              const spacing = getOrCreate(pPr, "w:spacing");
              setAttr(spacing, "before", "240");
              setAttr(spacing, "after", "0");

              const targetSize = finalOptions.font.sizeNormal * 2;
              const runs = getNodes(p, "r");

              for (const r of runs) {
                  const rPr = getOrCreate(r, "w:rPr");

                  forceBoldNode(rPr);

                  const iEl = getNodes(rPr, "i")[0];
                  if (iEl) rPr.removeChild(iEl);

                  const iCsEl = getNodes(rPr, "iCs")[0];
                  if (iCsEl) rPr.removeChild(iCsEl);

                  const sz = getOrCreate(rPr, "w:sz");
                  setAttr(sz, "val", String(targetSize));

                  const szCs = getOrCreate(rPr, "w:szCs");
                  setAttr(szCs, "val", String(targetSize));
              }

              forceParagraphBold(pPr);
              continue;
          }

          if (inKinhGuiBlock) {
              if (trimmedPTextOriginal.startsWith("-") || trimmedPTextOriginal.startsWith("+")) {
                  const jc = getOrCreate(pPr, "w:jc");
                  setAttr(jc, "val", "left");

                  const ind = getOrCreate(pPr, "w:ind");
                  setAttr(ind, "left", "2880");
                  setAttr(ind, "right", "0");
                  setAttr(ind, "firstLine", "0");
                  ind.removeAttributeNS(W_NS, "hanging");
                  ind.removeAttribute("w:hanging");

                  const spacing = getOrCreate(pPr, "w:spacing");
                  setAttr(spacing, "before", "0");
                  setAttr(spacing, "after", "0");

                  const targetSize = finalOptions.font.sizeNormal * 2;
                  const runs = getNodes(p, "r");

                  for (const r of runs) {
                      const rPr = getOrCreate(r, "w:rPr");

                      forceBoldNode(rPr);

                      const iEl = getNodes(rPr, "i")[0];
                      if (iEl) rPr.removeChild(iEl);

                      const iCsEl = getNodes(rPr, "iCs")[0];
                      if (iCsEl) rPr.removeChild(iCsEl);

                      const sz = getOrCreate(rPr, "w:sz");
                      setAttr(sz, "val", String(targetSize));

                      const szCs = getOrCreate(rPr, "w:szCs");
                      setAttr(szCs, "val", String(targetSize));
                  }

                  forceParagraphBold(pPr);
                  continue;
              } else if (trimmedPTextOriginal.length > 0) {
                inKinhGuiBlock = false;
                addSpaceBeforeMainContent = true;
              }
          }
      }

      let isDecisionSpecialLine = false;
      let normalizedDecisionSpecialText = "";

      if (
        (detectedDocType === "QUYẾT ĐỊNH" || finalOptions.isDecision === true) &&
        trimmedPTextOriginal.length > 0
      ) {
        if (isSchoolDecision) {
          if (upperText.startsWith("HIỆU TRƯỞNG")) {
            isDecisionSpecialLine = true;
            normalizedDecisionSpecialText = trimmedPTextOriginal.toUpperCase();
          } else if (upperText === "QUYẾT ĐỊNH" || upperText === "QUYẾT ĐỊNH:") {
            isDecisionSpecialLine = true;
            normalizedDecisionSpecialText = "QUYẾT ĐỊNH:";
          }
        } else if (isPartyDecision) {
          if (
            upperText === "CẤP ỦY CHI BỘ" ||
            upperText === "CẤP UỶ CHI BỘ" ||
            upperText === "CHI ỦY CHI BỘ" ||
            upperText === "CHI UỶ CHI BỘ"
          ) {
            isDecisionSpecialLine = true;
            normalizedDecisionSpecialText = "CẤP ỦY CHI BỘ";
          } else if (upperText === "QUYẾT ĐỊNH" || upperText === "QUYẾT ĐỊNH:") {
            isDecisionSpecialLine = true;
            normalizedDecisionSpecialText = "QUYẾT ĐỊNH";
          }
        } else if (upperText === "QUYẾT ĐỊNH:" || upperText === "QUYẾT ĐỊNH") {
          isDecisionSpecialLine = true;
          normalizedDecisionSpecialText =
            upperText === "QUYẾT ĐỊNH:" ? "QUYẾT ĐỊNH:" : "QUYẾT ĐỊNH";
        }
      }

      if (isDecisionSpecialLine) {
        if (normalizedDecisionSpecialText) {
          const textNodes = getNodes(p, "t");

          if (textNodes.length > 0) {
            textNodes[0].textContent = normalizedDecisionSpecialText;

            for (let i = 1; i < textNodes.length; i++) {
              textNodes[i].textContent = "";
            }
          }
        }

        const jc = getOrCreate(pPr, "w:jc");
        setAttr(jc, "val", "center");

        const spacing = getOrCreate(pPr, "w:spacing");
        setAttr(spacing, "before", "120");
        setAttr(spacing, "after", "120");
        setAttr(spacing, "line", "240");
        setAttr(spacing, "lineRule", "auto");

        const ind = getOrCreate(pPr, "w:ind");
        setAttr(ind, "left", "0");
        setAttr(ind, "right", "0");
        setAttr(ind, "firstLine", "0");
        ind.removeAttributeNS(W_NS, "hanging");
        ind.removeAttribute("w:hanging");

        const targetSize = finalOptions.font.sizeNormal * 2;
        const runs = getNodes(p, "r");

        for (const r of runs) {
          const rPr = getOrCreate(r, "w:rPr");

          forceBoldNode(rPr);

          const iEl = getNodes(rPr, "i")[0];
          if (iEl) rPr.removeChild(iEl);

          const iCsEl = getNodes(rPr, "iCs")[0];
          if (iCsEl) rPr.removeChild(iCsEl);

          const sz = getOrCreate(rPr, "w:sz");
          setAttr(sz, "val", String(targetSize));

          const szCs = getOrCreate(rPr, "w:szCs");
          setAttr(szCs, "val", String(targetSize));
        }

        forceParagraphBold(pPr);
        continue;
      }

      let pTextParsed = "";
      const runsForText = getNodes(p, "r");

      for (const r of runsForText) {
          Array.from(r.childNodes).forEach(child => {
              const name = child.nodeName.replace("w:", "");
              if (name === "t") pTextParsed += child.textContent;
              if (name === "tab") pTextParsed += " ";
          });
      }

      const trimmedPText = pTextParsed.trim();
      const lowerPText = trimmedPText.toLowerCase().replace(/^[\-\+*•\s]+/, '');

      const isBasisLine =
        lowerPText.startsWith("căn cứ") ||
        lowerPText.startsWith("xét") ||
        lowerPText.startsWith("theo");

      let isItalicBasis = false;

      if (isBasisLine) {
        if (isSchoolDecision) {
          isItalicBasis = true;
        } else if (isPartyDecision) {
          isItalicBasis = false;
        } else if (detectedDocType === "QUYẾT ĐỊNH" || detectedDocType === "NGHỊ QUYẾT") {
          isItalicBasis = true;
        }
      }

      const isRomanHeading = /^(i{1,3}|iv|v|vi{1,3}|ix|x|xi{1,3}|xiv|xv|xvi{1,3}|xix|xx|[IVXLCDM]+)\.[\s\xA0]+/.test(trimmedPText);
      const isNumberHeading = /^\d+(?:\.\d+)*\.[\s\xA0]+/.test(trimmedPText);

      let isHeading = isRomanHeading || isNumberHeading;

      if (isHeading) {
          const endsWithPunctuation = /[\.\;\:\,]$/.test(trimmedPText);
          if (endsWithPunctuation && trimmedPText.length > 50) isHeading = false;
          if (trimmedPText.length > 150) isHeading = false;
      }

      if (isRomanHeading && isHeading) {
          const tNodesForUpper = getNodes(p, "t");

          for (const t of tNodesForUpper) {
            if (t.textContent) t.textContent = t.textContent.toUpperCase();
          }
      }

      const jc = getOrCreate(pPr, "w:jc");
      setAttr(jc, "val", "both");

      const spacing = getOrCreate(pPr, "w:spacing");

      if (addSpaceBeforeMainContent) {
        setAttr(spacing, "before", "240");
        addSpaceBeforeMainContent = false;
      } else {
        setAttr(spacing, "before", "0");
      }

      setAttr(spacing, "after", String(Math.round(finalOptions.paragraph.after * TWIPS_PER_PT)));
      setAttr(spacing, "line", String(Math.round(finalOptions.paragraph.lineSpacing * 240)));
      setAttr(spacing, "lineRule", "auto");

      const ind = getOrCreate(pPr, "w:ind");
      setAttr(ind, "left", "0");
      setAttr(ind, "right", "0");
      setAttr(ind, "firstLine", String(Math.round(finalOptions.paragraph.indent * TWIPS_PER_CM)));
      ind.removeAttributeNS(W_NS, "hanging");
      ind.removeAttribute("w:hanging");

      const targetSize = finalOptions.font.sizeNormal * 2;
      const runs = getNodes(p, "r");

      for (const r of runs) {
          const tNodes = getNodes(r, "t");

          for (const t of tNodes) {
              if (t.textContent) {
                  const hasLeadingSpace = /^\s/.test(t.textContent);
                  const hasTrailingSpace = /\s$/.test(t.textContent);

                  let cleaned = applyCloudDictionary(t.textContent);
                  cleaned = autoCorrectText(cleanPunctuation(cleaned));

                  if (hasLeadingSpace && !/^\s/.test(cleaned)) cleaned = " " + cleaned;
                  if (hasTrailingSpace && !/\s$/.test(cleaned)) cleaned = cleaned + " ";

                  t.textContent = cleaned;
              }
          }

          const rPr = getOrCreate(r, "w:rPr");

          const sz = getOrCreate(rPr, "w:sz");
          setAttr(sz, "val", String(targetSize));

          const szCs = getOrCreate(rPr, "w:szCs");
          setAttr(szCs, "val", String(targetSize));

          const uNode = getNodes(rPr, "u")[0];

          if (uNode) {
            const newU = doc.createElementNS(W_NS, "w:u");
            setAttr(
              newU,
              "val",
              uNode.getAttributeNS(W_NS, "val") ||
              uNode.getAttribute("w:val") ||
              "single"
            );
            rPr.appendChild(newU);
          }

          if (isHeading) forceBoldNode(rPr);

          if (isBasisLine) {
              if (isItalicBasis) {
                const iEl = getOrCreate(rPr, "w:i");
                setAttr(iEl, "val", "true");

                const iCsEl = getOrCreate(rPr, "w:iCs");
                setAttr(iCsEl, "val", "true");
              } else {
                const iEl = getNodes(rPr, "i")[0];
                if (iEl) rPr.removeChild(iEl);

                const iCsEl = getNodes(rPr, "iCs")[0];
                if (iCsEl) rPr.removeChild(iCsEl);
              }

              removeBoldNode(rPr);
          }
      }

      if (isHeading) forceParagraphBold(pPr);
    }

    if (finalOptions.headerType !== HeaderType.NONE && body) {
        const headerTable = createHeaderTemplate(doc, finalOptions);

        if (body.firstChild) body.insertBefore(headerTable, body.firstChild);
        else body.appendChild(headerTable);

        const sectPrs = getNodes(doc, "sectPr");
        const lastSectPr = sectPrs.length > 0 ? sectPrs[sectPrs.length - 1] : null;

        const blankP = doc.createElementNS(W_NS, "w:p");
        const signatureBlock = createSignatureBlock(doc, finalOptions as any, detectedDocType);

        if (lastSectPr && lastSectPr.parentNode === body) {
          body.insertBefore(blankP, lastSectPr);
          body.insertBefore(signatureBlock, lastSectPr);
        } else {
          body.appendChild(blankP);
          body.appendChild(signatureBlock);
        }
    }

    const allRunsInDoc = getNodes(doc, "r");

    for (const r of allRunsInDoc) {
      getOrCreate(r, "w:rPr");
    }

    const allPPrsInDoc = getNodes(doc, "pPr");

    for (const pPr of allPPrsInDoc) {
      getOrCreate(pPr, "w:rPr");
    }

    const allRPrs = getNodes(doc, "rPr");

    for (const rPr of allRPrs) {
        const rFonts = getOrCreate(rPr, "w:rFonts");
        setAttr(rFonts, "ascii", finalOptions.font.family);
        setAttr(rFonts, "hAnsi", finalOptions.font.family);
        setAttr(rFonts, "cs", finalOptions.font.family);
        setAttr(rFonts, "eastAsia", finalOptions.font.family);

        ["asciiTheme", "hAnsiTheme", "cstheme", "eastAsiaTheme"].forEach(theme => {
          rFonts.removeAttributeNS(W_NS, theme);
          rFonts.removeAttribute(theme);
          rFonts.removeAttribute(`w:${theme}`);
        });
    }

    const allFinalParagraphs = getNodes(doc, "p");
    let inNoiNhanZone = false;

    for (const p of allFinalParagraphs) {
        const textNodes = getNodes(p, "t");

        if (textNodes.length === 0) continue;

        const fullText = textNodes.map(t => t.textContent || "").join("");
        const upperFullText = fullText.trim().toUpperCase();

        if (upperFullText === "NƠI NHẬN:" || upperFullText === "NƠI NHẬN") {
          inNoiNhanZone = true;
          continue;
        }

        if (inNoiNhanZone) {
            if (
              [
                "HIỆU TRƯỞNG",
                "GIÁM ĐỐC",
                "CHỦ TỊCH",
                "BÍ THƯ",
                "T/M",
                "KT.",
                "QUYỀN",
                "CHỦ TỌA",
                "THƯ KÝ",
                "NGƯỜI LẬP",
                "NGƯỜI VIẾT",
                "TỔ TRƯỞNG",
                "DUYỆT"
              ].some(k => upperFullText.includes(k))
            ) {
              inNoiNhanZone = false;
              continue;
            }

            if (fullText.trim().length > 0 && fullText.trim().length < 150) {
                let cleanText = fullText.replace(/^[\-\+•\s]+/, '').trim();

                if (!cleanText) continue;

                const prefixMatch = fullText.match(/^[\-\+•\s]+/);
                const prefix = prefixMatch ? prefixMatch[0] : "";

                if (finalOptions.headerType === HeaderType.PARTY) {
                    let formattedText = cleanText
                      .replace(/\btpt\b/ig, "TPT")
                      .replace(/\bhscb\b/ig, "HSCB")
                      .replace(/\bbt\b/ig, "BT");

                    const finalString = prefix + applyCloudDictionary(formattedText);

                    textNodes[0].textContent = finalString;

                    for (let i = 1; i < textNodes.length; i++) {
                      textNodes[i].textContent = "";
                    }

                    continue;
                }

                const lowerText = cleanText.toLowerCase();

                let formattedText = coreSmartFormat(lowerText);
                formattedText = applyCloudDictionary(autoCorrectText(formattedText));

                if (lowerText.startsWith("lưu") || lowerText.includes("lưu vt")) {
                  formattedText = formattedText.replace(/[\.\,\;]+$/, '') + ".";
                } else {
                  if (!formattedText.endsWith(";")) {
                    formattedText = formattedText.replace(/[\.\,\;]+$/, '') + ";";
                  }
                }

                const finalString = prefix + formattedText;

                textNodes[0].textContent = finalString;

                for (let i = 1; i < textNodes.length; i++) {
                  textNodes[i].textContent = "";
                }
            }
        }
    }

    // ============================================================
    // 🧹 BƯỚC DỌN DẸP CUỐI CÙNG - INLINE
    // Lệnh mới: Tiêu diệt TOÀN BỘ dòng rỗng không có ngoại lệ
    // ============================================================
    const bodyForCleanup = getNodes(doc, "body")[0];
    if (bodyForCleanup) {
      const W_NAMESPACE = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
      
      const checkParagraphEmpty = (elem: Element): boolean => {
        const textNodes = elem.getElementsByTagNameNS(W_NAMESPACE, "t");
        for (let i = 0; i < textNodes.length; i++) {
          const txt = textNodes[i].textContent || "";
          if (txt.replace(/[\s\u200B-\u200D\uFEFF\xA0]+/g, '').length > 0) {
            return false;
          }
        }
        
        if (elem.getElementsByTagNameNS(W_NAMESPACE, "drawing").length > 0) return false;
        if (elem.getElementsByTagNameNS(W_NAMESPACE, "pict").length > 0) return false;
        if (elem.getElementsByTagNameNS(W_NAMESPACE, "object").length > 0) return false;
        if (elem.getElementsByTagNameNS(W_NAMESPACE, "sectPr").length > 0) return false;
        
        const brs = elem.getElementsByTagNameNS(W_NAMESPACE, "br");
        for (let i = 0; i < brs.length; i++) {
          const brType = brs[i].getAttribute("w:type") || brs[i].getAttributeNS(W_NAMESPACE, "type");
          if (brType === "page") return false;
        }
        
        return true;
      };
      
      const getLocalName = (elem: Element): string => {
        const tagName = elem.tagName || elem.nodeName || "";
        return tagName.includes(":") ? tagName.split(":")[1] : tagName;
      };
      
      let totalRemoved = 0;
      
      // Chỉ cần 1 Pass duy nhất để quét sạch
      const childNodes = Array.from(bodyForCleanup.childNodes);
      for (const node of childNodes) {
        if (node.nodeType === 1) { 
          const elem = node as Element;
          if (getLocalName(elem) === "p" && checkParagraphEmpty(elem)) {
            elem.parentNode?.removeChild(elem);
            totalRemoved++;
          }
        }
      }
      
      logs.push(`Cleanup: removed ${totalRemoved} empty paragraphs unconditionally`);
    }

    const serializer = new XMLSerializer();

    const modifyXmlFonts = async (filePath: string) => {
        const xmlContent = await zip.file(filePath)?.async("string");

        if (xmlContent) {
            const extDoc = parser.parseFromString(xmlContent, "application/xml");

            const getOrCreateExt = (parent: Element, tagName: string): Element => {
                let child = parent.getElementsByTagName(tagName)[0];

                if (!child) {
                  child = extDoc.createElementNS(W_NS, tagName);

                  if (tagName.endsWith("Pr") && parent.firstChild) {
                    parent.insertBefore(child, parent.firstChild);
                  } else {
                    parent.appendChild(child);
                  }
                }

                return child;
            };

            const rPrsExt = getNodes(extDoc, "rPr");

            for (const rPr of rPrsExt) {
                const rFonts = getOrCreateExt(rPr, "w:rFonts");

                setAttr(rFonts, "ascii", finalOptions.font.family);
                setAttr(rFonts, "hAnsi", finalOptions.font.family);
                setAttr(rFonts, "cs", finalOptions.font.family);
                setAttr(rFonts, "eastAsia", finalOptions.font.family);

                ["asciiTheme", "hAnsiTheme", "cstheme", "eastAsiaTheme"].forEach(theme => {
                  rFonts.removeAttributeNS(W_NS, theme);
                  rFonts.removeAttribute(theme);
                  rFonts.removeAttribute(`w:${theme}`);
                });
            }

            enforceSchema(extDoc);
            zip.file(filePath, serializer.serializeToString(extDoc));
        }
    };

    await modifyXmlFonts("word/styles.xml");
    await modifyXmlFonts("word/numbering.xml");

    const sectPrs = getNodes(doc, "sectPr");

    for (const sPr of sectPrs) {
        let titlePg = sPr.getElementsByTagName("w:titlePg")[0];

        if (!titlePg) {
          titlePg = doc.createElementNS(W_NS, "w:titlePg");
          sPr.appendChild(titlePg);
        }

        const headerRefs = Array.from(sPr.getElementsByTagName("w:headerReference"));

        for (const hr of headerRefs) {
          if (hr.getAttribute("w:type") === "default") sPr.removeChild(hr);
        }

        const newHdrRef = doc.createElementNS(W_NS, "w:headerReference");
        setAttr(newHdrRef, "type", "default");
        newHdrRef.setAttribute("r:id", "rIdCustomHdr");
        sPr.appendChild(newHdrRef);
    }

    enforceSchema(doc);

    const fontSize = finalOptions.font.sizeTable * 2;
    const fontFamily = finalOptions.font.family;

    const draftWatermarkXml = finalOptions.isDraft
      ? `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:noProof/></w:rPr><w:pict><v:shapetype id="_x0000_t136" coordsize="21600,21600" o:spt="136" adj="10800" path="m@7,l@8,m@5,21600l@6,21600e"><v:formulas><v:f eqn="sum #0 0 10800"/><v:f eqn="prod #0 2 1"/><v:f eqn="sum 21600 0 @1"/><v:f eqn="sum 0 0 @2"/><v:f eqn="sum 21600 0 @3"/><v:f eqn="if @0 @3 0"/><v:f eqn="if @0 21600 @1"/><v:f eqn="if @0 0 @2"/><v:f eqn="if @0 @4 21600"/><v:f eqn="mid @5 @6"/><v:f eqn="mid @8 @5"/><v:f eqn="mid @7 @8"/><v:f eqn="mid @6 @7"/><v:f eqn="sum @6 0 @5"/></v:formulas><v:path textpathok="t" o:connecttype="custom" o:connectlocs="@9,0;@10,10800;@11,21600;@12,10800" o:connectangles="270,180,90,0"/><v:textpath on="t" fitshape="t"/><o:handles v="h,position,#0,bottomRight"/><o:lock v="ext" shapetype="t"/></v:shapetype><v:shape id="WaterMarkObject1" o:spid="_x0000_s1025" type="#_x0000_t136" style="position:absolute;left:0;text-align:left;margin-left:0;margin-top:0;width:500pt;height:120pt;rotation:315;z-index:-251657216;mso-position-horizontal:center;mso-position-horizontal-relative:margin;mso-position-vertical:center;mso-position-vertical-relative:margin" o:allowincell="f" fillcolor="#d9d9d9" stroked="f"><v:fill opacity="0.3"/><v:textpath style="font-family:&quot;${fontFamily}&quot;;font-size:1pt;font-weight:bold" string="DỰ THẢO"/><w10:wrap anchorx="margin" anchory="margin"/></v:shape></w:pict></w:r></w:p>`
      : '';

    const headerXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w10="urn:schemas-microsoft-com:office:word">
        <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="${fontFamily}" w:hAnsi="${fontFamily}" w:cs="${fontFamily}" w:eastAsia="${fontFamily}"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:rPr><w:rFonts w:ascii="${fontFamily}" w:hAnsi="${fontFamily}" w:cs="${fontFamily}" w:eastAsia="${fontFamily}"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:rPr><w:rFonts w:ascii="${fontFamily}" w:hAnsi="${fontFamily}" w:cs="${fontFamily}" w:eastAsia="${fontFamily}"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/><w:noProof/></w:rPr><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:rPr><w:rFonts w:ascii="${fontFamily}" w:hAnsi="${fontFamily}" w:cs="${fontFamily}" w:eastAsia="${fontFamily}"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/><w:noProof/></w:rPr><w:t></w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="${fontFamily}" w:hAnsi="${fontFamily}" w:cs="${fontFamily}" w:eastAsia="${fontFamily}"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r></w:p>
        ${draftWatermarkXml}
    </w:hdr>`;

    zip.file("word/header_custom.xml", headerXml);

    let contentTypesXml = await zip.file("[Content_Types].xml")?.async("string");

    if (contentTypesXml && !contentTypesXml.includes('PartName="/word/header_custom.xml"')) {
      contentTypesXml = contentTypesXml.replace(
        '</Types>',
        '<Override PartName="/word/header_custom.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/></Types>'
      );
      zip.file("[Content_Types].xml", contentTypesXml);
    }

    let relsXml = await zip.file("word/_rels/document.xml.rels")?.async("string");

    if (relsXml && !relsXml.includes('Target="header_custom.xml"')) {
      relsXml = relsXml.replace(
        '</Relationships>',
        '<Relationship Id="rIdCustomHdr" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header_custom.xml"/></Relationships>'
      );
      zip.file("word/_rels/document.xml.rels", relsXml);
    }

    const newDocXml = serializer.serializeToString(doc);
    zip.file(docXmlPath, newDocXml);

    const generatedBlob = await zip.generateAsync({ type: "blob" });

    return {
      success: true,
      blob: generatedBlob,
      fileName: `formatted_${file.name}`,
      logs
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
      logs
    };
  }
};