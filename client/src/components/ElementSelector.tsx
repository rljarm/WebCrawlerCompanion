import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X, Plus, ChevronUp, ChevronDown, ArrowUpToLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

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

  return (
    <div className="fixed top-20 right-4 flex flex-col gap-2 max-h-[calc(100vh-6rem)] overflow-y-auto">
      {selectedSelectors.map((selector, index) => (
        <div
          key={index}
          className="flex items-center gap-2 bg-black border-2 border-[#007BFF] rounded-[25%] shadow-[0_0_15px_#ADD8E6] hover:shadow-[0_0_20px_#007BFF] transition-all duration-300 p-2"
          style={{
            animation: "glow 1.5s ease-in-out infinite alternate"
          }}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 text-[#007BFF] hover:text-[#ADD8E6] transition-colors"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-black border-[#007BFF] shadow-[0_0_15px_#ADD8E6]">
              {ALL_ATTRIBUTES.map(category => (
                <DropdownMenuItem
                  key={category.category}
                  className="flex items-center text-[#007BFF] hover:text-[#ADD8E6] hover:bg-black/50"
                >
                  {category.category}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div
            className="px-3 py-1 cursor-pointer text-white hover:text-[#ADD8E6] transition-colors"
            onClick={() => handleShowHtml(selector)}
          >
            <span className="truncate max-w-[200px]">
              {selector}
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 text-[#007BFF] hover:text-[#ADD8E6] transition-colors"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-black border-[#007BFF] shadow-[0_0_15px_#ADD8E6]">
              {ACTIONS.map(action => (
                <DropdownMenuItem
                  key={action.value}
                  onSelect={() => handleAction(action.value, selector)}
                  className="text-[#007BFF] hover:text-[#ADD8E6] hover:bg-black/50"
                >
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-[#007BFF] hover:text-[#ADD8E6] rounded-full transition-colors"
            onClick={() => handleRemoveSelector(selector)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <style jsx global>{`
        @keyframes glow {
          from {
            box-shadow: 0 0 15px #ADD8E6;
          }
          to {
            box-shadow: 0 0 20px #007BFF;
          }
        }
      `}</style>

      <Dialog open={isHtmlDialogOpen} onOpenChange={setIsHtmlDialogOpen}>
        <DialogContent className="max-w-3xl bg-black border-2 border-[#007BFF] shadow-[0_0_15px_#ADD8E6]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-[#007BFF]">
              <span>Selected Element HTML</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateDOM('up')}
                  disabled={!currentElement?.parentElement || currentElement.parentElement.tagName === 'BODY'}
                  className="border-[#007BFF] text-[#007BFF] hover:text-[#ADD8E6] hover:border-[#ADD8E6]"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateDOM('down')}
                  disabled={!currentElement?.firstElementChild}
                  className="border-[#007BFF] text-[#007BFF] hover:text-[#ADD8E6] hover:border-[#ADD8E6]"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={expandToRoot}
                  disabled={!currentElement?.parentElement || currentElement.parentElement.tagName === 'BODY'}
                  className="border-[#007BFF] text-[#007BFF] hover:text-[#ADD8E6] hover:border-[#ADD8E6]"
                >
                  <ArrowUpToLine className="h-4 w-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <pre
            className="bg-black text-white p-4 rounded-lg overflow-x-auto border border-[#007BFF]"
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