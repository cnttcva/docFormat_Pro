// File: src/services/docx/docNumbering.ts
import { W_NS, getNodes } from '../docUtils';

type NumberingZipLike = {
  file: (path: string) => any;
};

const getAttrVal = (el: Element | undefined | null, localName: string): string => {
  if (!el) return '';

  return (
    el.getAttributeNS(W_NS, localName) ||
    el.getAttribute(`w:${localName}`) ||
    el.getAttribute(localName) ||
    ''
  );
};

/**
 * Xóa đánh số tự động trong DOCX.
 *
 * Mục tiêu:
 * - Đọc word/numbering.xml để biết kiểu numbering của từng paragraph.
 * - Nếu paragraph đang dùng numbering tự động, chuyển số thứ tự thành text thật.
 * - Sau đó xóa w:numPr để Word không còn auto-numbering.
 * - Đồng thời xóa bullet đầu dòng kiểu •, -, –, —, * nếu có.
 */
export const removeAutomaticNumbering = async (
  doc: Document,
  zip: NumberingZipLike,
  parser: DOMParser,
  finalOptions: any
): Promise<void> => {
  let listFormats: Record<string, string> = {};
  const numberingXmlContent = await zip.file('word/numbering.xml')?.async('string');

  if (numberingXmlContent) {
    const numDoc = parser.parseFromString(numberingXmlContent, 'application/xml');
    const nums = getNodes(numDoc, 'num');
    const abstractNums = getNodes(numDoc, 'abstractNum');

    const numToAbstractMap: Record<string, string> = {};

    for (const num of nums) {
      const numId = getAttrVal(num, 'numId');
      const absNumIdEl = getNodes(num, 'abstractNumId')[0];

      if (numId && absNumIdEl) {
        numToAbstractMap[numId] = getAttrVal(absNumIdEl, 'val');
      }
    }

    const absNumMap: Record<string, Element> = {};

    for (const absNum of abstractNums) {
      const absId = getAttrVal(absNum, 'abstractNumId');
      if (absId) absNumMap[absId] = absNum;
    }

    for (const numId in numToAbstractMap) {
      const absId = numToAbstractMap[numId];
      const absNum = absNumMap[absId];

      if (absNum) {
        const lvls = getNodes(absNum, 'lvl');

        for (const lvl of lvls) {
          const ilvl = getAttrVal(lvl, 'ilvl');
          const numFmtEl = getNodes(lvl, 'numFmt')[0];
          const numFmt = numFmtEl ? getAttrVal(numFmtEl, 'val') : '';

          if (ilvl && numFmt) {
            listFormats[`${numId}_${ilvl}`] = numFmt;
          }
        }
      }
    }
  }

  if (!finalOptions.removeNumbering) {
    return;
  }

  const allParagraphs = getNodes(doc, 'p');
  const listCounters: Record<string, number> = {};

  for (const p of allParagraphs) {
    const pPr = getNodes(p, 'pPr')[0];

    let fullText = '';
    const pRunsForText = getNodes(p, 'r');

    for (const r of pRunsForText) {
      Array.from(r.childNodes).forEach(child => {
        const name = child.nodeName.replace('w:', '');

        if (name === 't') {
          fullText += child.textContent;
        }

        if (name === 'tab') {
          fullText += ' ';
        }
      });
    }

    fullText = fullText.trim();

    if (pPr) {
      const numPr = getNodes(pPr, 'numPr')[0];

      if (numPr) {
        const ilvlEl = getNodes(numPr, 'ilvl')[0];
        const numIdEl = getNodes(numPr, 'numId')[0];

        const ilvl = ilvlEl ? getAttrVal(ilvlEl, 'val') || '0' : '0';
        const numId = numIdEl ? getAttrVal(numIdEl, 'val') || '0' : '0';

        const levelKey = `${numId}_${ilvl}`;
        const numFmt = listFormats[levelKey] || 'decimal';

        if (!listCounters[levelKey]) {
          listCounters[levelKey] = 0;
        }

        listCounters[levelKey]++;

        const hasListPrefix = /^([IVXLCDM]+\.|[0-9]+\.|[a-zđ]\)|\-|\+|\*|•)/i.test(fullText);

        if (!hasListPrefix && fullText.length > 0) {
          let prefix = '';

          if (numFmt === 'bullet') {
            prefix = '';
          } else if (numFmt === 'decimal') {
            prefix = `${listCounters[levelKey]}. `;
          } else if (numFmt === 'lowerLetter') {
            prefix = `${String.fromCharCode(96 + listCounters[levelKey])}) `;
          } else if (numFmt === 'upperLetter') {
            prefix = `${String.fromCharCode(64 + listCounters[levelKey])}. `;
          } else {
            prefix = `${listCounters[levelKey]}. `;
          }

          if (prefix !== '') {
            const r = doc.createElementNS(W_NS, 'w:r');
            const t = doc.createElementNS(W_NS, 'w:t');

            t.setAttribute('xml:space', 'preserve');
            t.textContent = prefix;
            r.appendChild(t);

            const insertBeforeNode = pPr.nextSibling;

            if (insertBeforeNode) {
              p.insertBefore(r, insertBeforeNode);
            } else {
              p.appendChild(r);
            }
          }
        }

        pPr.removeChild(numPr);
      }
    }

    const firstRun = getNodes(p, 'r')[0];

    if (firstRun) {
      const firstText = getNodes(firstRun, 't')[0];

      if (firstText && firstText.textContent) {
        const bulletRegex = /^[\s]*([•\-\–\—\*])[\s]+/;

        if (bulletRegex.test(firstText.textContent)) {
          firstText.textContent = firstText.textContent.replace(bulletRegex, '').trimStart();
        }
      }
    }
  }
};