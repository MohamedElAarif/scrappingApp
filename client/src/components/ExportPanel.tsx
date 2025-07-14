import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Download } from "lucide-react";
import { ExportRequest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";

interface ExportPanelProps {
  sessionId: number | null;
  dataCount: number;
}

export function ExportPanel({ sessionId, dataCount }: ExportPanelProps) {
  const [exportConfig, setExportConfig] = useState<Omit<ExportRequest, 'sessionId'>>({
    format: 'csv',
    fileName: 'scraped-data',
    includeTimestamp: true,
    includeMetadata: false,
  });

  const { toast } = useToast();

  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!sessionId) throw new Error('No session selected');
      
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...exportConfig, sessionId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Export failed');
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get('content-disposition');
      let filename = exportConfig.fileName || 'scraped-data';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      return { filename };
    },
    onSuccess: (data) => {
      toast({ 
        title: "Export Successful", 
        description: `Data exported as ${data.filename}` 
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Export Failed", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const handleExport = () => {
    if (!sessionId) {
      toast({ 
        title: "No Data", 
        description: "Please run a scraping session first",
        variant: "destructive" 
      });
      return;
    }

    if (dataCount === 0) {
      toast({ 
        title: "No Data", 
        description: "No data available for export",
        variant: "destructive" 
      });
      return;
    }

    exportMutation.mutate();
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-lg font-medium text-gray-900">
          <Download className="text-blue-700 mr-2 h-5 w-5" />
          Export Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-2">Export Format</Label>
          <Select
            value={exportConfig.format}
            onValueChange={(value: 'csv' | 'json' | 'xlsx' | 'xml') => 
              setExportConfig({ ...exportConfig, format: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
              <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
              <SelectItem value="xml">XML</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-2">File Name</Label>
          <Input
            value={exportConfig.fileName}
            onChange={(e) => setExportConfig({ ...exportConfig, fileName: e.target.value })}
            placeholder="scraped-data"
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center text-sm text-gray-700">
            <Checkbox
              checked={exportConfig.includeTimestamp}
              onCheckedChange={(checked) => 
                setExportConfig({ ...exportConfig, includeTimestamp: checked as boolean })
              }
              className="mr-2"
            />
            Include timestamp in filename
          </label>
          <label className="flex items-center text-sm text-gray-700">
            <Checkbox
              checked={exportConfig.includeMetadata}
              onCheckedChange={(checked) => 
                setExportConfig({ ...exportConfig, includeMetadata: checked as boolean })
              }
              className="mr-2"
            />
            Include scraping metadata
          </label>
        </div>

        <Button
          onClick={handleExport}
          disabled={!sessionId || dataCount === 0 || exportMutation.isPending}
          className="w-full bg-green-600 hover:bg-green-700 font-medium"
        >
          <Download className="h-4 w-4 mr-2" />
          {exportMutation.isPending ? "Exporting..." : "Export Data"}
        </Button>

        {dataCount > 0 && (
          <div className="text-xs text-gray-500 text-center">
            {dataCount} records ready for export
          </div>
        )}
      </CardContent>
    </Card>
  );
}
