import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, RefreshCw, Trash2 } from "lucide-react";
import { ScrapedData } from "@shared/schema";

interface DataPreviewProps {
  data: ScrapedData[];
  onRefresh?: () => void;
  onClear?: () => void;
}

export function DataPreview({ data, onRefresh, onClear }: DataPreviewProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center text-lg font-medium text-gray-900">
            <Eye className="text-blue-700 mr-2 h-5 w-5" />
            Data Preview
          </CardTitle>
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-sm text-blue-700 hover:text-blue-400"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="text-sm text-blue-700 hover:text-blue-400"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {data.slice(0, 10).map((item, index) => (
                <div key={index} className="border border-gray-200 rounded p-3 text-sm">
                  <div className="space-y-1">
                    {Object.entries(item).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="font-medium text-gray-700 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}:
                        </span>
                        <span className="text-gray-900 text-right max-w-xs truncate" title={value || ''}>
                          {value || 'N/A'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 text-center text-sm text-gray-500">
              Showing {Math.min(data.length, 10)} of {data.length} results
              {data.length > 10 && ` (${data.length - 10} more available)`}
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Eye className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No data extracted yet</p>
            <p className="text-sm">Start scraping to see preview</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
