import { W_NS, TWIPS_PER_CM, getNodes, getOrCreate, setAttr, forceBoldNode, forceParagraphBold } from './docUtils';

export const normalizeTables = (doc: Document, options: any) => {
    const tables = getNodes(doc, "tbl");
    const targetSz = String(options.font.sizeTable * 2);

    for (const tbl of tables) {
        // ==========================================
        // FIX LỖI: BỎ QUA BẢNG KẺ ĐƯỜNG TRANG TRÍ
        // Bảng gạch chân tiêu đề không có text bên trong, ta sẽ skip nó
        // để không làm nó bị kéo giãn 100%
        // ==========================================
        const textContent = tbl.textContent || "";
        if (textContent.trim() === "") {
            continue; 
        }

        // ==========================================
        // TÍNH NĂNG 2: AUTO FIT WIDTH (CHỐNG TRÀN BẢNG DỮ LIỆU)
        // ==========================================
        const tblPr = getOrCreate(tbl, "w:tblPr");
        const tblW = getOrCreate(tblPr, "w:tblW");
        setAttr(tblW, "w", "5000"); 
        setAttr(tblW, "type", "pct"); 
        
        const tblLayout = getOrCreate(tblPr, "w:tblLayout");
        setAttr(tblLayout, "type", "autofit");

        let sttColIndex = -1;
        const rows = getNodes(tbl, "tr");
        
        for (let rIndex = 0; rIndex < rows.length; rIndex++) {
            const tr = rows[rIndex];
            const cells = getNodes(tr, "tc");
            let logicalColIndex = 0;
            for (const tc of cells) {
                const gridSpanEl = getNodes(tc, "gridSpan")[0];
                const gridSpan = gridSpanEl ? parseInt(gridSpanEl.getAttributeNS(W_NS, "val") || gridSpanEl.getAttribute("w:val") || "1") : 1;
                
                const tcTextNodes = getNodes(tc, "t");
                const rawCellText = tcTextNodes.map(n => n.textContent || "").join("");
                const cleanTextForStt = rawCellText.toUpperCase().replace(/[\.\s\t\u200B-\u200D\uFEFF\xA0]/g, '');
                
                if (sttColIndex === -1 && (cleanTextForStt === "STT" || cleanTextForStt === "SỐTT" || cleanTextForStt === "TT")) {
                    sttColIndex = logicalColIndex;
                }
                logicalColIndex += gridSpan;
            }
        }

        // ==========================================
        // TÍNH NĂNG 1: AUTO ĐÁNH SỐ STT (SỐ THỨ TỰ)
        // ==========================================
        let sttCounter = 1;

        for (let rIndex = 0; rIndex < rows.length; rIndex++) {
            const tr = rows[rIndex];
            const trPr = getOrCreate(tr, "w:trPr");

            let isHeaderRow = (rIndex === 0);
            if (!isHeaderRow && getNodes(trPr, "tblHeader").length > 0) isHeaderRow = true;

            const trTextNodes = getNodes(tr, "t");
            const trText = trTextNodes.map(n => n.textContent || "").join("").toUpperCase();
            const isTotalRow = !isHeaderRow && (trText.includes("TỔNG CỘNG") || trText.includes("TỔNG SỐ") || trText.includes("TỔNG:"));

            let trHeight = getOrCreate(trPr, "w:trHeight");
            setAttr(trHeight, "val", String(Math.round(options.table.rowHeight * TWIPS_PER_CM))); 
            setAttr(trHeight, "hRule", "atLeast"); 

            const cells = getNodes(tr, "tc");
            let logicalColIndex = 0;
            let incrementSttThisRow = false;

            for (const tc of cells) {
                const tcPr = getOrCreate(tc, "w:tcPr");
                const vAlign = getOrCreate(tcPr, "w:vAlign");
                setAttr(vAlign, "val", "center"); 
                
                const gridSpanEl = getNodes(tc, "gridSpan")[0];
                const gridSpan = gridSpanEl ? parseInt(gridSpanEl.getAttributeNS(W_NS, "val") || gridSpanEl.getAttribute("w:val") || "1") : 1;

                const tcParagraphs = getNodes(tc, "p");
                const tcTextNodesAll = getNodes(tc, "t");
                const rawCellTextFull = tcTextNodesAll.map(n => n.textContent || "").join("").trim();
                const isNumericCell = rawCellTextFull.length > 0 && /^[\(\[\-+]?[\d\.\,\s\t\u200B-\u200D\uFEFF\xA0]+(?:vnđ|vnd|đ|%)?[\)\]]?$/i.test(rawCellTextFull);

                const isSttCellTarget = !isHeaderRow && !isTotalRow && logicalColIndex === sttColIndex;
                if (isSttCellTarget) incrementSttThisRow = true;

                for (let pIndex = 0; pIndex < tcParagraphs.length; pIndex++) {
                    const p = tcParagraphs[pIndex];
                    const pPr = getOrCreate(p, "w:pPr");
                    const jc = getOrCreate(pPr, "w:jc");
                    
                    if (isHeaderRow || logicalColIndex === sttColIndex) setAttr(jc, "val", "center");
                    else if (!isHeaderRow && isNumericCell) setAttr(jc, "val", "right"); 
                    else if (isTotalRow && logicalColIndex === 0 && rawCellTextFull.toUpperCase().includes("TỔNG")) setAttr(jc, "val", "center"); 
                    else setAttr(jc, "val", "left");
                    
                    const ind = getOrCreate(pPr, "w:ind");
                    setAttr(ind, "left", "0"); setAttr(ind, "right", "0"); setAttr(ind, "firstLine", "0");
                    ind.removeAttribute("w:hanging"); ind.removeAttributeNS(W_NS, "hanging");

                    const spacing = getOrCreate(pPr, "w:spacing");
                    setAttr(spacing, "before", "0"); setAttr(spacing, "after", "0");
                    setAttr(spacing, "line", "240"); setAttr(spacing, "lineRule", "auto");

                    if (isSttCellTarget) {
                        if (pIndex === 0) {
                            Array.from(p.childNodes).forEach(child => {
                                const name = child.nodeName.replace("w:", "");
                                if (name === "r" || name === "hyperlink") p.removeChild(child);
                            });
                            const r = doc.createElementNS(W_NS, "w:r");
                            const rPr = getOrCreate(r, "w:rPr");
                            const sz = getOrCreate(rPr, "w:sz"); setAttr(sz, "val", targetSz);
                            const szCs = getOrCreate(rPr, "w:szCs"); setAttr(szCs, "val", targetSz);
                            const t = doc.createElementNS(W_NS, "w:t");
                            t.textContent = String(sttCounter);
                            r.appendChild(t);
                            p.appendChild(r);
                        } else {
                            p.parentNode?.removeChild(p);
                        }
                    } else {
                        const runs = getNodes(p, "r");
                        for (const r of runs) {
                            const rPr = getOrCreate(r, "w:rPr");
                            if (isHeaderRow || isTotalRow) forceBoldNode(rPr);
                            const sz = getOrCreate(rPr, "w:sz"); setAttr(sz, "val", targetSz);
                            const szCs = getOrCreate(rPr, "w:szCs"); setAttr(szCs, "val", targetSz);
                        }
                    }
                    
                    if (isHeaderRow || isTotalRow) forceParagraphBold(pPr);
                }
                logicalColIndex += gridSpan;
            }
            if (incrementSttThisRow) sttCounter++;
        }
    }
};