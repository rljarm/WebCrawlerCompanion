import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X, Plus, ChevronUp, ChevronDown, ArrowUpToLine, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface ElementSelectorProps {
  selectedElement: string | null;
  url: string;
  onSelectionStart: () => void;
}

const ATTRIBUTES = {
  Basic: ["text", "href", "src", "alt", "title", "value"],
  Data: ["data-src", "data-href", "data-id", "data-url", "data-type"],
  Media: ["src", "poster", "preload", "controls", "autoplay"],
  Download: ["download", "data-download-url", "data-file-type"]
};

const MEDIA_DOWNLOADERS = [
  { name: "Direct Download", handler: "direct" },
  { name: "YouTube-DL", handler: "youtube-dl" },
  { name: "Video Extractor", handler: "video" },
  { name: "Audio Extractor", handler: "audio" }
];

interface SelectedSelector {
  selector: string;
  attributes: string[];
  extractedData: Record<string, string>;
  mediaType?: string;
}

export default function ElementSelector({ selectedElement, url, onSelectionStart }: ElementSelectorProps) {
  const { toast } = useToast();
  const [selectedSelectors, setSelectedSelectors] = useState<SelectedSelector[]>([]);
  const [selectedHtml, setSelectedHtml] = useState<string>("");
  const [isHtmlDialogOpen, setIsHtmlDialogOpen] = useState(false);
  const [currentElement, setCurrentElement] = useState<Element | null>(null);
  const [lastSuccessfulDownloader, setLastSuccessfulDownloader] = useState<string | null>(null);

  useEffect(() => {
    if (selectedElement) {
      const iframe = document.querySelector('iframe');
      if (iframe?.contentDocument) {
        const element = iframe.contentDocument.querySelector(selectedElement);
        if (element) {
          // Default to text attribute
          const initialData = { text: element.textContent || '' };

          // Detect media type
          let mediaType;
          if (element instanceof HTMLVideoElement || element.querySelector('video')) {
            mediaType = 'video';
          } else if (element instanceof HTMLAudioElement || element.querySelector('audio')) {
            mediaType = 'audio';
          } else if (element instanceof HTMLImageElement || element.querySelector('img')) {
            mediaType = 'image';
          }

          const newSelector: SelectedSelector = {
            selector: selectedElement,
            attributes: ['text'],
            extractedData: initialData,
            mediaType
          };

          setSelectedSelectors(prev => {
            const exists = prev.some(s => s.selector === selectedElement);
            if (!exists) {
              return [...prev, newSelector];
            }
            return prev;
          });
        }
      }
    }
  }, [selectedElement]);

  const handleAttributeToggle = (selector: string, attribute: string) => {
    setSelectedSelectors(prev => prev.map(s => {
      if (s.selector === selector) {
        const iframe = document.querySelector('iframe');
        if (iframe?.contentDocument) {
          const element = iframe.contentDocument.querySelector(selector);
          if (element) {
            let value = '';
            if (attribute === 'text') {
              value = element.textContent || '';
            } else {
              value = (element as HTMLElement).getAttribute(attribute) || '';
            }

            const newAttributes = s.attributes.includes(attribute)
              ? s.attributes.filter(a => a !== attribute)
              : [...s.attributes, attribute];

            const newData = { ...s.extractedData };
            if (newAttributes.includes(attribute)) {
              newData[attribute] = value;
            } else {
              delete newData[attribute];
            }

            return {
              ...s,
              attributes: newAttributes,
              extractedData: newData
            };
          }
        }
        return s;
      }
      return s;
    }));
  };

  const handleMediaDownload = async (selector: string, handler: string) => {
    const iframe = document.querySelector('iframe');
    if (!iframe?.contentDocument) return;

    const element = iframe.contentDocument.querySelector(selector);
    if (!element) return;

    try {
      let url = '';
      if (element instanceof HTMLVideoElement || element instanceof HTMLAudioElement) {
        url = element.src;
      } else if (element instanceof HTMLAnchorElement) {
        url = element.href;
      } else {
        const mediaElement = element.querySelector('video, audio');
        if (mediaElement) {
          url = (mediaElement as HTMLMediaElement).src;
        }
      }

      if (!url) {
        toast({ title: "Error", description: "No media URL found" });
        return;
      }

      // In a real implementation, this would call your backend API
      const response = await fetch('/api/download-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, handler })
      });

      if (response.ok) {
        setLastSuccessfulDownloader(handler);
        toast({ title: "Success", description: "Media download started" });
      } else {
        throw new Error("Download failed");
      }
    } catch (error) {
      console.error("Download error:", error);
      toast({ title: "Error", description: "Failed to download media" });
    }
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
              {Object.entries(ATTRIBUTES).map(([category, attrs]) => (
                <>
                  <DropdownMenuItem
                    key={category}
                    className="text-[#007BFF] font-bold"
                  >
                    {category}
                  </DropdownMenuItem>
                  {attrs.map(attr => (
                    <DropdownMenuItem
                      key={attr}
                      className={`pl-4 ${
                        selector.attributes.includes(attr)
                          ? "text-[#ADD8E6]"
                          : "text-[#007BFF]"
                      } hover:text-[#ADD8E6] hover:bg-black/50`}
                      onClick={() => handleAttributeToggle(selector.selector, attr)}
                    >
                      {attr}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex-1 px-3 py-1">
            <div className="text-[#007BFF] font-bold mb-1">{selector.selector}</div>
            {Object.entries(selector.extractedData).map(([attr, value]) => (
              <div key={attr} className="text-white text-sm">
                <span className="text-[#ADD8E6]">{attr}:</span> {value}
              </div>
            ))}
          </div>

          {selector.mediaType && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-8 w-8 p-0 text-[#007BFF] hover:text-[#ADD8E6] transition-colors"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-black border-[#007BFF] shadow-[0_0_15px_#ADD8E6]">
                {MEDIA_DOWNLOADERS.map(downloader => (
                  <DropdownMenuItem
                    key={downloader.handler}
                    onClick={() => handleMediaDownload(selector.selector, downloader.handler)}
                    className={`
                      text-[#007BFF] hover:text-[#ADD8E6] hover:bg-black/50
                      ${lastSuccessfulDownloader === downloader.handler ? "text-[#ADD8E6]" : ""}
                    `}
                  >
                    {downloader.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-[#007BFF] hover:text-[#ADD8E6] rounded-full transition-colors"
            onClick={() => setSelectedSelectors(prev => prev.filter(s => s.selector !== selector.selector))}
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
    </div>
  );
}