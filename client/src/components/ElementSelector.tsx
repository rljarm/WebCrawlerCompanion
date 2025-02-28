import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X, Plus, ChevronUp, ChevronDown, ArrowUpToLine } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ElementSelectorProps {
  selectedElement: string | null;
  url: string;
  onSelectionStart: () => void;
}

// Combine all attributes into a single list
const ALL_ATTRIBUTES = [
  { category: "Basic", items: ["text", "href", "src", "alt", "title", "value", "class", "id", "name", "type"] },
  { category: "Data", items: ["data-src", "data-href", "data-id", "data-url", "data-type", "data-value", "data-title"] },
  { category: "Media", items: ["src", "poster", "preload", "controls", "autoplay", "loop", "muted", "playsinline"] },
  { category: "Download", items: ["download", "data-download-url", "data-file-type", "data-file-size", "data-format"] }
];

const ACTIONS = [
  { label: "Follow Link", value: "follow" },
  { label: "Download Content", value: "download" },
  { label: "Copy Text", value: "copy" },
  { label: "Extract Media", value: "media" }
];

export default function ElementSelector({ selectedElement, url, onSelectionStart }: ElementSelectorProps) {
  const { toast } = useToast();
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

  const handleAction = (action: string, selector: string) => {
    const iframe = document.querySelector('iframe');
    if (!iframe?.contentDocument) return;

    const element = iframe.contentDocument.querySelector(selector);
    if (!element) return;

    switch (action) {
      case 'follow':
        if (element instanceof HTMLAnchorElement) {
          window.open(element.href, '_blank');
        }
        break;
      case 'download':
        if (element instanceof HTMLImageElement || element instanceof HTMLVideoElement) {
          const link = document.createElement('a');
          link.href = element.src;
          link.download = '';
          link.click();
        }
        break;
      case 'copy':
        navigator.clipboard.writeText(element.textContent || '');
        toast({ title: "Copied", description: "Text copied to clipboard" });
        break;
      case 'media':
        const mediaUrl = element.getAttribute('src') || element.getAttribute('data-src');
        if (mediaUrl) {
          window.open(mediaUrl, '_blank');
        }
        break;
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
        const selector = generateSelector(element as HTMLElement);
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

  if (selectedSelectors.length === 0) {
    return (
      <div className="fixed bottom-4 left-4">
        <Button
          type="button"
          onClick={onSelectionStart}
          variant="secondary"
        >
          <Plus className="mr-2 h-4 w-4" />
          Select Elements
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 flex flex-col gap-2">
      {selectedSelectors.map((selector, index) => (
        <div
          key={index}
          className="flex items-center gap-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-full shadow-lg p-2"
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Plus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {ALL_ATTRIBUTES.map(category => (
                <DropdownMenuItem
                  key={category.category}
                  className="flex items-center"
                  onSelect={() => handleAttributeSelect(category.items[0])}
                >
                  {category.category}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div
            className="px-3 py-1 cursor-pointer"
            onClick={() => handleShowHtml(selector)}
          >
            <span className="truncate max-w-[200px]">
              {selector}
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {ACTIONS.map(action => (
                <DropdownMenuItem
                  key={action.value}
                  onSelect={() => handleAction(action.value, selector)}
                >
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground rounded-full"
            onClick={() => handleRemoveSelector(selector)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}

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

const generateSelector = (element: HTMLElement): string => {
  let selector = element.tagName.toLowerCase();
  if (element.id) {
    selector += `#${element.id}`;
  } else if (element.classList.length > 0) {
    selector += `.${Array.from(element.classList).join('.')}`;
  }
  return selector;
};