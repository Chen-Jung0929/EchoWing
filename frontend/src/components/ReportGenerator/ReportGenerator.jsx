import { forwardRef, useImperativeHandle } from 'react';
import { buildBirdReportPdf } from '../../utils/pdf/pdfReportBuilder';

/**
 * 以 jsPDF 向量文字 + 高解析度頻譜 raster 產生可搜尋 PDF（不再使用 html2canvas）。
 */
const ReportGenerator = forwardRef(function ReportGenerator(
  { reportModel, lang = 'zh' },
  ref
) {
  useImperativeHandle(ref, () => ({
    downloadPdf: async () => {
      if (!reportModel) {
        throw new Error('Report data is not ready');
      }
      const { pdf, filename, qa } = await buildBirdReportPdf(reportModel, { lang });
      if (qa?.warnings?.length) {
        console.warn('[PDF QA]', qa.warnings);
      }
      pdf.save(filename);
    },
  }));

  return null;
});

export default ReportGenerator;
