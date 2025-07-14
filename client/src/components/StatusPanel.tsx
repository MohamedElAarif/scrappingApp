import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp } from "lucide-react";
import { ScrapingSession } from "@shared/schema";

interface StatusPanelProps {
  session: ScrapingSession | null;
}

export function StatusPanel({ session }: StatusPanelProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'text-blue-600';
      case 'completed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'stopped':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'running':
        return 'Scraping in progress...';
      case 'completed':
        return 'Scraping completed';
      case 'failed':
        return 'Scraping failed';
      case 'stopped':
        return 'Scraping stopped';
      default:
        return 'Ready to scrape';
    }
  };

  const progress = session?.progress || { current: 0, total: 0, extracted: 0, errors: 0 };
  const progressPercent = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-lg font-medium text-gray-900">
          <TrendingUp className="text-blue-700 mr-2 h-5 w-5" />
          Scraping Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Status:</span>
          <span className={`text-sm font-medium ${getStatusColor(session?.status || 'idle')}`}>
            {getStatusText(session?.status || 'idle')}
          </span>
        </div>

        <div>
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span>{progress.current} / {progress.total || 'Unknown'}</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-gray-50 rounded p-3">
            <div className="text-2xl font-bold text-gray-900">{progress.extracted}</div>
            <div className="text-xs text-gray-500">Extracted</div>
          </div>
          <div className="bg-gray-50 rounded p-3">
            <div className="text-2xl font-bold text-gray-900">{progress.errors}</div>
            <div className="text-xs text-gray-500">Errors</div>
          </div>
        </div>

        {session?.errorLog && session.errorLog.length > 0 && (
          <div className="text-xs text-gray-500 space-y-1 max-h-32 overflow-y-auto">
            <div className="font-medium">Recent errors:</div>
            {session.errorLog.slice(-3).map((error, index) => (
              <div key={index} className="text-red-600">• {error}</div>
            ))}
          </div>
        )}

        {(!session?.errorLog || session.errorLog.length === 0) && (
          <div className="text-xs text-gray-500 space-y-1">
            <div>• Configuration ready</div>
            <div>• Waiting to start scraping</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
