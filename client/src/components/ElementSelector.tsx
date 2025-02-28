import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";

interface ElementSelectorProps {
  selectedElement: string | null;
  url: string;
  onSelectionStart: () => void;
}

const AVAILABLE_ATTRIBUTES = {
  Basic: [
    "text",
    "href",
    "src",
    "alt",
    "title",
    "value",
    "class",
    "id",
    "name",
    "type"
  ],
  Data: [
    "data-src",
    "data-href",
    "data-id",
    "data-url",
    "data-type",
    "data-value",
    "data-title"
  ],
  Media: [
    "src",
    "poster",
    "preload",
    "controls",
    "autoplay",
    "loop",
    "muted",
    "playsinline",
    "data-video-url",
    "data-audio-url",
    "data-media-type",
    "data-duration",
    "data-timestamp"
  ],
  Download: [
    "download",
    "data-download-url",
    "data-file-type",
    "data-file-size",
    "data-format"
  ]
};

export default function ElementSelector({ selectedElement, url, onSelectionStart }: ElementSelectorProps) {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof AVAILABLE_ATTRIBUTES>("Basic");
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);
  const [selectedSelectors, setSelectedSelectors] = useState<string[]>([]);
  const [selectedHtml, setSelectedHtml] = useState<string>("");
  const [isHtmlDialogOpen, setIsHtmlDialogOpen] = useState(false);

  useEffect(() => {
    if (selectedElement) {
      if (!selectedSelectors.includes(selectedElement)) {
        setSelectedSelectors(prev => [...prev, selectedElement]);
      }
    }
  }, [selectedElement]);

  const mutation = useMutation({
    mutationFn: async (data: { selectors: string[]; attributes: string[]; url: string }) => {
      const response = await apiRequest("POST", "/api/selectors", {
        name: "Selection",
        ...data
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/selectors"] });
      toast({ title: "Success", description: "Selectors saved successfully" });
      setSelectedAttributes([]);
      setSelectedSelectors([]);
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to save selectors",
        variant: "destructive"
      });
    }
  });

  const handleAttributeSelect = (attribute: string) => {
    if (!selectedAttributes.includes(attribute)) {
      setSelectedAttributes([...selectedAttributes, attribute]);
    }
  };

  const handleRemoveAttribute = (attribute: string) => {
    setSelectedAttributes(selectedAttributes.filter(a => a !== attribute));
  };

  const handleRemoveSelector = (selector: string) => {
    setSelectedSelectors(selectedSelectors.filter(s => s !== selector));
  };

  const handleShowHtml = (selector: string) => {
    const iframe = document.querySelector('iframe');
    if (iframe && iframe.contentDocument) {
      const element = iframe.contentDocument.querySelector(selector);
      if (element) {
        setSelectedHtml(element.outerHTML);
        setIsHtmlDialogOpen(true);
      }
    }
  };

  const handleSave = () => {
    if (selectedSelectors.length > 0 && url && selectedAttributes.length > 0) {
      mutation.mutate({
        selectors: selectedSelectors,
        attributes: selectedAttributes,
        url
      });
    }
  };

  if (selectedSelectors.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-muted-foreground text-sm">
          Click or long press an element in the preview to select it
        </div>
        <Button 
          type="button" 
          onClick={onSelectionStart}
          className="w-full"
        >
          Start Selection
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-medium mb-2">Selected Elements:</div>
        <div className="flex flex-wrap gap-2">
          {selectedSelectors.map((selector, index) => (
            <div key={index} className="flex items-center">
              <Badge 
                variant="secondary"
                className="cursor-pointer text-xs py-1 pl-2 pr-1 flex items-center gap-1"
              >
                <span 
                  onClick={() => handleShowHtml(selector)}
                  className="truncate max-w-[200px]"
                >
                  {selector}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveSelector(selector);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            </div>
          ))}
        </div>
        <Button 
          type="button" 
          onClick={onSelectionStart}
          className="w-full mt-2"
        >
          Select More Elements
        </Button>
      </div>

      <div>
        <div className="text-sm font-medium mb-2">Attribute Category:</div>
        <Select value={selectedCategory} onValueChange={(value: keyof typeof AVAILABLE_ATTRIBUTES) => setSelectedCategory(value)}>
          <SelectTrigger>
            <SelectValue placeholder="Choose attribute category" />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(AVAILABLE_ATTRIBUTES).map(category => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <div className="text-sm font-medium mb-2">Select Attributes:</div>
        <Select onValueChange={handleAttributeSelect}>
          <SelectTrigger>
            <SelectValue placeholder="Choose attributes to extract" />
          </SelectTrigger>
          <SelectContent>
            {AVAILABLE_ATTRIBUTES[selectedCategory].map(attr => (
              <SelectItem key={attr} value={attr}>
                {attr}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedAttributes.length > 0 && (
        <div>
          <div className="text-sm font-medium mb-2">Selected Attributes:</div>
          <div className="flex flex-wrap gap-2">
            {selectedAttributes.map(attr => (
              <Badge 
                key={attr} 
                variant="secondary"
                onClick={() => handleRemoveAttribute(attr)}
                className="cursor-pointer text-xs py-1 px-2"
              >
                {attr} ×
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Button 
        type="button" 
        onClick={handleSave}
        disabled={selectedAttributes.length === 0 || selectedSelectors.length === 0}
        className="w-full"
      >
        Save Selections
      </Button>

      <Dialog open={isHtmlDialogOpen} onOpenChange={setIsHtmlDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Selected Element HTML</DialogTitle>
          </DialogHeader>
          <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
            <code>{selectedHtml}</code>
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}