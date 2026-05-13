// File: src/services/docx/docRepairGuards.ts
import { W_NS, getOrCreate, setAttr } from '../docUtils';

const getLocalName = (node: Node): string => {
  const name = (node as Element).localName || node.nodeName || '';
  return name.includes(':') ? name.split(':').pop() || name : name;
};

/**
 * Word repair guard for nested tables inside table cells.
 *
 * In WordprocessingML, a table cell should end with a paragraph. Word may
 * display "unreadable content" when a generated cell ends directly with a
 * nested table. This pass is intentionally generic so it also protects
 * signature/header tables created by other modules.
 */
export const ensureEveryTableCellEndsWithParagraph = (docRef: Document): void => {
  const tableCells = Array.from(docRef.getElementsByTagNameNS(W_NS, 'tc'));

  for (const tc of tableCells) {
    const elementChildren = Array.from(tc.childNodes).filter(
      (node): node is Element => node.nodeType === 1
    );

    if (elementChildren.length === 0) {
      const p = docRef.createElementNS(W_NS, 'w:p');
      tc.appendChild(p);
      continue;
    }

    const last = elementChildren[elementChildren.length - 1];
    const lastLocalName = getLocalName(last);

    if (lastLocalName !== 'p') {
      const p = docRef.createElementNS(W_NS, 'w:p');
      const pPr = getOrCreate(p, 'w:pPr');
      const spacing = getOrCreate(pPr, 'w:spacing');

      setAttr(spacing, 'before', '0');
      setAttr(spacing, 'after', '0');
      setAttr(spacing, 'line', '1');
      setAttr(spacing, 'lineRule', 'exact');

      tc.appendChild(p);
    }
  }
};

/**
 * Reorder direct child elements by OOXML local-name order.
 * Only property containers should be reordered. Do not use this for body-level
 * content blocks because order there is semantically meaningful.
 */
export const reorderElementChildrenByLocalName = (
  parent: Element,
  preferredOrder: string[]
): void => {
  const children = Array.from(parent.childNodes).filter(
    (node): node is Element => node.nodeType === 1
  );

  if (children.length <= 1) return;

  const orderIndex = (el: Element): number => {
    const local = getLocalName(el);
    const idx = preferredOrder.indexOf(local);
    return idx >= 0 ? idx : 999;
  };

  const sorted = children
    .map((el, index) => ({ el, index }))
    .sort((a, b) => {
      const diff = orderIndex(a.el) - orderIndex(b.el);
      return diff !== 0 ? diff : a.index - b.index;
    })
    .map(item => item.el);

  sorted.forEach(child => parent.appendChild(child));
};

/**
 * Word repair guard for table-related OOXML child order.
 *
 * Word is strict about child order inside w:tblPr and w:tcPr. For example,
 * w:tblW must appear before w:jc and w:tblBorders, while w:tcBorders must
 * appear before w:tcMar.
 */
export const normalizeTableXmlForWord = (docRef: Document): void => {
  const tblPrOrder = [
    'tblStyle',
    'tblpPr',
    'tblOverlap',
    'bidiVisual',
    'tblStyleRowBandSize',
    'tblStyleColBandSize',
    'tblW',
    'jc',
    'tblCellSpacing',
    'tblInd',
    'tblBorders',
    'shd',
    'tblLayout',
    'tblCellMar',
    'tblLook',
    'tblCaption',
    'tblDescription',
    'tblPrChange'
  ];

  const tcPrOrder = [
    'cnfStyle',
    'tcW',
    'gridSpan',
    'hMerge',
    'vMerge',
    'tcBorders',
    'shd',
    'noWrap',
    'tcMar',
    'textDirection',
    'tcFitText',
    'vAlign',
    'hideMark',
    'headers',
    'cellIns',
    'cellDel',
    'cellMerge',
    'tcPrChange'
  ];

  const moveFirstChildByLocalName = (parent: Element, localName: string): void => {
    const child = Array.from(parent.childNodes).find(
      node => node.nodeType === 1 && getLocalName(node) === localName
    );

    if (child && parent.firstChild !== child) {
      parent.insertBefore(child, parent.firstChild);
    }
  };

  const moveTblPrAndGridToTop = (tbl: Element): void => {
    const tblPr = Array.from(tbl.childNodes).find(
      node => node.nodeType === 1 && getLocalName(node) === 'tblPr'
    );

    const tblGrid = Array.from(tbl.childNodes).find(
      node => node.nodeType === 1 && getLocalName(node) === 'tblGrid'
    );

    if (tblPr) tbl.insertBefore(tblPr, tbl.firstChild);

    if (tblGrid) {
      const insertAfter =
        tblPr && tblPr.parentNode === tbl ? tblPr.nextSibling : tbl.firstChild;
      tbl.insertBefore(tblGrid, insertAfter);
    }
  };

  /**
   * Important: do NOT sort block-level content inside w:tc.
   * Only property containers are reordered. For container blocks, we only move
   * mandatory property children to the top and keep the original block order.
   */
  Array.from(docRef.getElementsByTagNameNS(W_NS, 'tblPr')).forEach(el => {
    reorderElementChildrenByLocalName(el, tblPrOrder);
  });

  Array.from(docRef.getElementsByTagNameNS(W_NS, 'tbl')).forEach(el => {
    moveTblPrAndGridToTop(el);
  });

  Array.from(docRef.getElementsByTagNameNS(W_NS, 'tr')).forEach(el => {
    moveFirstChildByLocalName(el, 'trPr');
  });

  Array.from(docRef.getElementsByTagNameNS(W_NS, 'tcPr')).forEach(el => {
    reorderElementChildrenByLocalName(el, tcPrOrder);
  });

  Array.from(docRef.getElementsByTagNameNS(W_NS, 'tc')).forEach(el => {
    moveFirstChildByLocalName(el, 'tcPr');
  });
};