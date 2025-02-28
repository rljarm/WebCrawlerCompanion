import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X, ChevronUp, ChevronDown, Maximize, ArrowUpToLine } from "lucide-react";

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
  const [currentElement, setCurrentElement] = useState<Element | null>(null);

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
        setCurrentElement(element);
        setSelectedHtml(element.outerHTML);
        setIsHtmlDialogOpen(true);
      }
    }
  };

  const navigateDOM = (direction: 'up' | 'down') => {
    if (!currentElement) return;

    const newElement = direction === 'up'
      ? currentElement.parentElement
      : currentElement.firstElementChild;

    if (newElement && newElement.tagName !== 'HTML' && newElement.tagName !== 'BODY') {
      setCurrentElement(newElement);
      setSelectedHtml(newElement.outerHTML);
    }
  };

  const expandToRoot = () => {
    if (!currentElement) return;
    let root = currentElement;
    while (root.parentElement && root.parentElement.tagName !== 'BODY') {
      root = root.parentElement;
    }
    setCurrentElement(root);
    setSelectedHtml(root.outerHTML);
  };

  const handleHtmlClick = (e: React.MouseEvent<HTMLPreElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'SPAN' && target.classList.contains('tag-name')) {
      const element = currentElement;
      if (element) {
        const selector = generateSelector(element as HTMLElement); // Assuming generateSelector function exists
        if (!selectedSelectors.includes(selector)) {
          setSelectedSelectors(prev => [...prev, selector]);
        }
        setIsHtmlDialogOpen(false);
      }
    }
  };

  const formatHtml = (html: string) => {
    return html.replace(
      /(<\/?[a-z0-9]+)/gi,
      '<span class="tag-name cursor-pointer hover:text-primary">$1</span>'
    );
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
            <DialogTitle className="flex items-center justify-between">
              <span>Selected Element HTML</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateDOM('up')}
                  disabled={!currentElement?.parentElement || currentElement.parentElement.tagName === 'BODY'}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateDOM('down')}
                  disabled={!currentElement?.firstElementChild}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={expandToRoot}
                  disabled={!currentElement?.parentElement || currentElement.parentElement.tagName === 'BODY'}
                >
                  <ArrowUpToLine className="h-4 w-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <pre
            className="bg-muted p-4 rounded-lg overflow-x-auto"
            onClick={handleHtmlClick}
          >
            <code dangerouslySetInnerHTML={{ __html: formatHtml(selectedHtml) }} />
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Placeholder for generateSelector function - needs actual implementation
const generateSelector = (element: HTMLElement): string => {
  // Implement logic to generate a CSS selector for the given element
  // This is a crucial part and needs proper implementation based on your needs.
  // A simple example, but may not be sufficient for all cases:
  let selector = element.tagName.toLowerCase();
  if (element.id) {
    selector += `#${element.id}`;
  } else if (element.classList.length > 0) {
    selector += `.${Array.from(element.classList).join('.')}`;
  }
  return selector;
};