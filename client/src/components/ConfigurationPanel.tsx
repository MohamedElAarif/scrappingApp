import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { SelectorEditor } from "./SelectorEditor";
import { Target, Crosshair, Filter, Save, TestTube, Play, CheckCircle } from "lucide-react";
import { ScrapingConfiguration, ScrapingSelector } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ConfigurationPanelProps {
  configuration: Partial<ScrapingConfiguration>;
  onChange: (config: Partial<ScrapingConfiguration>) => void;
  onStartScraping: () => void;
  isScrapingActive: boolean;
}

export function ConfigurationPanel({ 
  configuration, 
  onChange, 
  onStartScraping,
  isScrapingActive 
}: ConfigurationPanelProps) {
  const [urlValidation, setUrlValidation] = useState<{ isValid?: boolean; message?: string }>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const validateUrlMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest("POST", "/api/validate-url", { url });
      return response.json();
    },
    onSuccess: (data) => {
      setUrlValidation({ isValid: true, message: data.message });
      toast({ title: "URL Validation", description: "URL is accessible and ready for scraping" });
    },
    onError: () => {
      setUrlValidation({ isValid: false, message: "URL is not accessible" });
      toast({ title: "URL Validation Failed", description: "Please check the URL and try again", variant: "destructive" });
    }
  });

  const testSelectorMutation = useMutation({
    mutationFn: async ({ url, selector }: { url: string; selector: ScrapingSelector }) => {
      const response = await apiRequest("POST", "/api/test-selector", { url, selector });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ 
          title: "Selector Test Success", 
          description: `Preview: ${data.preview?.substring(0, 100)}${data.preview?.length > 100 ? '...' : ''}` 
        });
      } else {
        toast({ 
          title: "Selector Test Failed", 
          description: data.error,
          variant: "destructive" 
        });
      }
    },
    onError: () => {
      toast({ title: "Test Failed", description: "Failed to test selector", variant: "destructive" });
    }
  });

  const saveConfigMutation = useMutation({
    mutationFn: async (config: Partial<ScrapingConfiguration>) => {
      const response = await apiRequest("POST", "/api/configurations", config);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Configuration saved successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/configurations"] });
    },
    onError: () => {
      toast({ title: "Save Failed", description: "Failed to save configuration", variant: "destructive" });
    }
  });

  const handleValidateUrl = () => {
    if (configuration.targetUrl) {
      validateUrlMutation.mutate(configuration.targetUrl);
    }
  };

  const handleTestSelector = (selector: ScrapingSelector) => {
    if (configuration.targetUrl) {
      testSelectorMutation.mutate({ url: configuration.targetUrl, selector });
    }
  };

  const handleSaveConfiguration = () => {
    saveConfigMutation.mutate(configuration);
  };

  const handleTestConfiguration = () => {
    toast({ title: "Test Started", description: "Testing configuration..." });
  };

  return (
    <div className="space-y-6">
      {/* Target Configuration Card */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-lg font-medium text-gray-900">
            <Target className="text-blue-700 mr-2 h-5 w-5" />
            Target Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">Target URL</Label>
            <div className="flex space-x-2">
              <Input
                type="url"
                value={configuration.targetUrl || ""}
                onChange={(e) => onChange({ ...configuration, targetUrl: e.target.value })}
                placeholder="https://example.com"
                className="flex-1"
              />
              <Button
                onClick={handleValidateUrl}
                disabled={!configuration.targetUrl || validateUrlMutation.isPending}
                className="bg-blue-700 hover:bg-blue-600"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                {validateUrlMutation.isPending ? "Validating..." : "Validate"}
              </Button>
            </div>
            {urlValidation.isValid && (
              <div className="mt-1 text-sm text-green-600 flex items-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                URL is accessible and ready for scraping
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">User Agent</Label>
              <Select
                value={configuration.userAgent || "Chrome (Desktop)"}
                onValueChange={(value) => onChange({ ...configuration, userAgent: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Chrome (Desktop)">Chrome (Desktop)</SelectItem>
                  <SelectItem value="Firefox (Desktop)">Firefox (Desktop)</SelectItem>
                  <SelectItem value="Safari (Desktop)">Safari (Desktop)</SelectItem>
                  <SelectItem value="Mobile Chrome">Mobile Chrome</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">Request Delay (ms)</Label>
              <Input
                type="number"
                value={configuration.requestDelay || 1000}
                onChange={(e) => onChange({ ...configuration, requestDelay: parseInt(e.target.value) })}
                placeholder="1000"
                min="100"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selector Configuration Card */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-lg font-medium text-gray-900">
            <Crosshair className="text-blue-700 mr-2 h-5 w-5" />
            Data Selectors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SelectorEditor
            selectors={configuration.selectors || []}
            onChange={(selectors) => onChange({ ...configuration, selectors })}
            targetUrl={configuration.targetUrl}
            onTestSelector={handleTestSelector}
          />
        </CardContent>
      </Card>

      {/* Filters and Options Card */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-lg font-medium text-gray-900">
            <Filter className="text-blue-700 mr-2 h-5 w-5" />
            Filters & Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">Text Pattern Filters</Label>
            <div className="space-y-2">
              <Input
                value={configuration.filters?.include || ""}
                onChange={(e) => onChange({ 
                  ...configuration, 
                  filters: { ...configuration.filters, include: e.target.value }
                })}
                placeholder="Include text patterns (regex supported)"
              />
              <Input
                value={configuration.filters?.exclude || ""}
                onChange={(e) => onChange({ 
                  ...configuration, 
                  filters: { ...configuration.filters, exclude: e.target.value }
                })}
                placeholder="Exclude text patterns (regex supported)"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center text-sm text-gray-700">
              <Checkbox
                checked={configuration.options?.handlePagination || false}
                onCheckedChange={(checked) => onChange({
                  ...configuration,
                  options: { ...configuration.options, handlePagination: checked as boolean }
                })}
                className="mr-2"
              />
              Handle Pagination
            </label>
            <label className="flex items-center text-sm text-gray-700">
              <Checkbox
                checked={configuration.options?.waitForDynamic || false}
                onCheckedChange={(checked) => onChange({
                  ...configuration,
                  options: { ...configuration.options, waitForDynamic: checked as boolean }
                })}
                className="mr-2"
              />
              Wait for Dynamic Content
            </label>
            <label className="flex items-center text-sm text-gray-700">
              <Checkbox
                checked={configuration.options?.removeDuplicates || false}
                onCheckedChange={(checked) => onChange({
                  ...configuration,
                  options: { ...configuration.options, removeDuplicates: checked as boolean }
                })}
                className="mr-2"
              />
              Remove Duplicates
            </label>
            <label className="flex items-center text-sm text-gray-700">
              <Checkbox
                checked={configuration.options?.respectRobots || false}
                onCheckedChange={(checked) => onChange({
                  ...configuration,
                  options: { ...configuration.options, respectRobots: checked as boolean }
                })}
                className="mr-2"
              />
              Respect robots.txt
            </label>
          </div>

          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">Pagination Settings</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                value={configuration.pagination?.nextSelector || ""}
                onChange={(e) => onChange({
                  ...configuration,
                  pagination: { ...configuration.pagination, nextSelector: e.target.value }
                })}
                placeholder="Next page selector"
              />
              <Input
                type="number"
                value={configuration.pagination?.maxPages || ""}
                onChange={(e) => onChange({
                  ...configuration,
                  pagination: { ...configuration.pagination, maxPages: parseInt(e.target.value) }
                })}
                placeholder="Max pages"
                min="1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <Button
          onClick={onStartScraping}
          disabled={isScrapingActive || !configuration.targetUrl || !configuration.selectors?.length}
          className="flex-1 bg-blue-700 hover:bg-blue-600 py-3 font-medium shadow-lg"
        >
          <Play className="h-4 w-4 mr-2" />
          {isScrapingActive ? "Scraping..." : "Start Scraping"}
        </Button>
        <Button
          variant="outline"
          onClick={handleTestConfiguration}
          className="px-6 py-3 font-medium"
        >
          <TestTube className="h-4 w-4 mr-2" />
          Test
        </Button>
        <Button
          variant="outline"
          onClick={handleSaveConfiguration}
          disabled={saveConfigMutation.isPending}
          className="px-6 py-3 font-medium"
        >
          <Save className="h-4 w-4 mr-2" />
          {saveConfigMutation.isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
