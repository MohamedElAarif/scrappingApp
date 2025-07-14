import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Play, Plus } from "lucide-react";
import { ScrapingSelector } from "@shared/schema";

interface SelectorEditorProps {
  selectors: ScrapingSelector[];
  onChange: (selectors: ScrapingSelector[]) => void;
  targetUrl?: string;
  onTestSelector?: (selector: ScrapingSelector) => void;
}

export function SelectorEditor({ selectors, onChange, targetUrl, onTestSelector }: SelectorEditorProps) {
  const [testingSelector, setTestingSelector] = useState<string | null>(null);

  const updateSelector = (index: number, updates: Partial<ScrapingSelector>) => {
    const updated = [...selectors];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const removeSelector = (index: number) => {
    const updated = selectors.filter((_, i) => i !== index);
    onChange(updated);
  };

  const addSelector = () => {
    const newSelector: ScrapingSelector = {
      id: Date.now().toString(),
      name: "",
      cssSelector: "",
      xpath: "",
      attribute: "textContent",
      required: false,
    };
    onChange([...selectors, newSelector]);
  };

  const handleTestSelector = async (selector: ScrapingSelector) => {
    if (!targetUrl || !onTestSelector) return;
    
    setTestingSelector(selector.id);
    try {
      await onTestSelector(selector);
    } finally {
      setTestingSelector(null);
    }
  };

  return (
    <div className="space-y-4">
      {selectors.map((selector, index) => (
        <Card key={selector.id} className="border border-gray-200">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <Input
                  value={selector.name}
                  onChange={(e) => updateSelector(index, { name: e.target.value })}
                  placeholder="Field Name"
                  className="font-medium border-none p-0 focus-visible:ring-0 text-gray-900"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeSelector(index)}
                className="text-gray-400 hover:text-red-500 ml-2"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <Label className="text-xs font-medium text-gray-500 mb-1">CSS Selector</Label>
                <Input
                  value={selector.cssSelector || ""}
                  onChange={(e) => updateSelector(index, { cssSelector: e.target.value })}
                  placeholder="h1.product-title"
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-500 mb-1">XPath (Alternative)</Label>
                <Input
                  value={selector.xpath || ""}
                  onChange={(e) => updateSelector(index, { xpath: e.target.value })}
                  placeholder="//h1[@class='product-title']"
                  className="text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <label className="flex items-center text-sm text-gray-600">
                  <Checkbox
                    checked={selector.required}
                    onCheckedChange={(checked) => updateSelector(index, { required: checked as boolean })}
                    className="mr-2"
                  />
                  Required
                </label>
                <Select
                  value={selector.attribute}
                  onValueChange={(value) => updateSelector(index, { attribute: value })}
                >
                  <SelectTrigger className="w-auto text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="textContent">textContent</SelectItem>
                    <SelectItem value="href">href</SelectItem>
                    <SelectItem value="src">src</SelectItem>
                    <SelectItem value="innerHTML">innerHTML</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleTestSelector(selector)}
                disabled={!targetUrl || !selector.cssSelector && !selector.xpath || testingSelector === selector.id}
                className="text-sm text-blue-700 hover:text-blue-400"
              >
                <Play className="h-3 w-3 mr-1" />
                {testingSelector === selector.id ? "Testing..." : "Test"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <Button
        variant="outline"
        onClick={addSelector}
        className="w-full py-2 border-2 border-dashed border-gray-300 hover:border-blue-400 hover:text-blue-700"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add New Selector
      </Button>
    </div>
  );
}
