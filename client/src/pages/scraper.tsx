import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ConfigurationPanel } from "@/components/ConfigurationPanel";
import { StatusPanel } from "@/components/StatusPanel";
import { DataPreview } from "@/components/DataPreview";
import { ExportPanel } from "@/components/ExportPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bookmark, Settings, Activity } from "lucide-react";
import { ScrapingConfiguration, ScrapingSession } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ScraperPage() {
  const [configuration, setConfiguration] = useState<Partial<ScrapingConfiguration>>({
    name: "",
    targetUrl: "",
    userAgent: "Chrome (Desktop)",
    requestDelay: 1000,
    selectors: [],
    filters: {},
    options: {
      handlePagination: false,
      waitForDynamic: true,
      removeDuplicates: true,
      respectRobots: true,
    },
    pagination: {},
  });

  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch saved configurations
  const { data: savedConfigurations = [] } = useQuery<ScrapingConfiguration[]>({
    queryKey: ["/api/configurations"],
  });

  // Fetch current session data
  const { data: currentSession } = useQuery<ScrapingSession>({
    queryKey: ["/api/sessions", currentSessionId],
    enabled: !!currentSessionId,
    refetchInterval: (data) => {
      if (!currentSessionId) return false;
      const status = data?.status || "";
      return !["completed", "failed", "stopped"].includes(status) ? 2000 : false;
    },
  });

  // Start scraping mutation
  const startScrapingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/scraping/start", { 
        configurationId: await saveCurrentConfig() 
      });
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentSessionId(data.sessionId);
      toast({ title: "Scraping Started", description: "Data extraction in progress..." });
    },
    onError: () => {
      toast({ title: "Failed to Start", description: "Could not start scraping", variant: "destructive" });
    }
  });

  // Stop scraping mutation
  const stopScrapingMutation = useMutation({
    mutationFn: async () => {
      if (!currentSessionId) throw new Error("No active session");
      const response = await apiRequest("POST", "/api/scraping/stop", { 
        sessionId: currentSessionId 
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Scraping Stopped", description: "Data extraction has been stopped" });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", currentSessionId] });
    },
    onError: () => {
      toast({ title: "Failed to Stop", description: "Could not stop scraping", variant: "destructive" });
    }
  });

  // Save configuration helper
  const saveCurrentConfig = async (): Promise<number> => {
    const response = await apiRequest("POST", "/api/configurations", {
      ...configuration,
      name: configuration.name || `Config ${Date.now()}`,
    });
    const saved = await response.json();
    queryClient.invalidateQueries({ queryKey: ["/api/configurations"] });
    return saved.id;
  };

  const handleStartScraping = () => {
    if (!configuration.targetUrl || !configuration.selectors?.length) {
      toast({ 
        title: "Configuration Incomplete", 
        description: "Please provide a target URL and at least one selector",
        variant: "destructive" 
      });
      return;
    }

    startScrapingMutation.mutate();
  };

  const handleStopScraping = () => {
    stopScrapingMutation.mutate();
  };

  const handleLoadConfiguration = (config: ScrapingConfiguration) => {
    setConfiguration(config);
    toast({ title: "Configuration Loaded", description: `Loaded "${config.name}"` });
  };

  const isScrapingActive = currentSession?.status === "running";
  const scrapedData = currentSession?.results || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-700 rounded flex items-center justify-center">
                <Activity className="text-white h-4 w-4" />
              </div>
              <h1 className="text-xl font-medium text-gray-900">Advanced Web Scraper</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  isScrapingActive ? 'bg-blue-600 animate-pulse' : 'bg-green-500'
                }`} />
                <span className="text-sm text-gray-600">
                  {isScrapingActive ? 'Scraping...' : 'Ready'}
                </span>
              </div>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Configuration Panel */}
          <div className="lg:col-span-2">
            <ConfigurationPanel
              configuration={configuration}
              onChange={setConfiguration}
              onStartScraping={handleStartScraping}
              onStopScraping={handleStopScraping}
              isScrapingActive={isScrapingActive}
            />
          </div>

          {/* Status and Preview Panel */}
          <div className="space-y-6">
            
            {/* Status Panel */}
            <StatusPanel session={currentSession || null} />

            {/* Data Preview */}
            <DataPreview 
              data={scrapedData}
              onRefresh={() => {
                if (currentSessionId) {
                  queryClient.invalidateQueries({ queryKey: ["/api/sessions", currentSessionId] });
                }
              }}
              onClear={() => {
                // Could implement clearing preview data
                toast({ title: "Preview Cleared", description: "Data preview has been cleared" });
              }}
            />

            {/* Export Panel */}
            <ExportPanel 
              sessionId={currentSessionId}
              dataCount={scrapedData.length}
            />

            {/* Saved Configurations */}
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center text-lg font-medium text-gray-900">
                    <Bookmark className="text-blue-700 mr-2 h-5 w-5" />
                    Saved Configs
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-sm text-blue-700 hover:text-blue-400">
                    <Settings className="h-3 w-3 mr-1" />
                    Manage
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {savedConfigurations.length > 0 ? (
                  <div className="space-y-2">
                    {savedConfigurations.slice(0, 5).map((config) => (
                      <div key={config.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded transition-colors">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{config.name}</div>
                          <div className="text-xs text-gray-500">
                            {new URL(config.targetUrl).hostname} • {config.selectors.length} selectors
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleLoadConfiguration(config)}
                            className="text-xs text-blue-700 hover:text-blue-400"
                          >
                            Load
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <Bookmark className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No saved configurations</p>
                    <p className="text-xs">Save a configuration to see it here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
