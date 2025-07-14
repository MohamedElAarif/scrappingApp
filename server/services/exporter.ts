import { ScrapedData, ExportRequest } from '@shared/schema';
import { Parser } from 'json2csv';

export class ExportService {
  async exportData(data: ScrapedData[], request: ExportRequest): Promise<{ content: string; mimeType: string; filename: string }> {
    const timestamp = request.includeTimestamp ? new Date().toISOString().replace(/[:.]/g, '-') : '';
    const baseFilename = request.fileName || 'scraped-data';
    
    let filename: string;
    let content: string;
    let mimeType: string;

    switch (request.format) {
      case 'csv':
        filename = `${baseFilename}${timestamp ? '-' + timestamp : ''}.csv`;
        content = this.exportToCsv(data, request.includeMetadata);
        mimeType = 'text/csv';
        break;

      case 'json':
        filename = `${baseFilename}${timestamp ? '-' + timestamp : ''}.json`;
        content = this.exportToJson(data, request.includeMetadata);
        mimeType = 'application/json';
        break;

      case 'xlsx':
        filename = `${baseFilename}${timestamp ? '-' + timestamp : ''}.xlsx`;
        // For now, we'll export as CSV since Excel generation requires additional libraries
        content = this.exportToCsv(data, request.includeMetadata);
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;

      case 'xml':
        filename = `${baseFilename}${timestamp ? '-' + timestamp : ''}.xml`;
        content = this.exportToXml(data, request.includeMetadata);
        mimeType = 'application/xml';
        break;

      default:
        throw new Error(`Unsupported export format: ${request.format}`);
    }

    return { content, mimeType, filename };
  }

  private exportToCsv(data: ScrapedData[], includeMetadata: boolean): string {
    if (data.length === 0) {
      return includeMetadata ? 'No data available\n' : '';
    }

    const parser = new Parser();
    let csvContent = parser.parse(data);

    if (includeMetadata) {
      const metadata = [
        `Export Date: ${new Date().toISOString()}`,
        `Total Records: ${data.length}`,
        `Format: CSV`,
        ''
      ].join('\n');
      
      csvContent = metadata + csvContent;
    }

    return csvContent;
  }

  private exportToJson(data: ScrapedData[], includeMetadata: boolean): string {
    const exportData: any = {
      data: data
    };

    if (includeMetadata) {
      exportData.metadata = {
        exportDate: new Date().toISOString(),
        totalRecords: data.length,
        format: 'JSON'
      };
    }

    return JSON.stringify(exportData, null, 2);
  }

  private exportToXml(data: ScrapedData[], includeMetadata: boolean): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<export>\n';

    if (includeMetadata) {
      xml += '  <metadata>\n';
      xml += `    <exportDate>${new Date().toISOString()}</exportDate>\n`;
      xml += `    <totalRecords>${data.length}</totalRecords>\n`;
      xml += '    <format>XML</format>\n';
      xml += '  </metadata>\n';
    }

    xml += '  <data>\n';
    
    data.forEach((item, index) => {
      xml += `    <record id="${index + 1}">\n`;
      Object.entries(item).forEach(([key, value]) => {
        const safeKey = key.replace(/[^a-zA-Z0-9_]/g, '_');
        const safeValue = this.escapeXml(value || '');
        xml += `      <${safeKey}>${safeValue}</${safeKey}>\n`;
      });
      xml += '    </record>\n';
    });

    xml += '  </data>\n</export>';
    return xml;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

export const exportService = new ExportService();
