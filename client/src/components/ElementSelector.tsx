import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X, List, ChevronDown, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface ElementSelectorProps {
  selectedElement: string | null;
  url: string;
  onSelectionStart: () => void;
}

const MEDIA_DOWNLOADERS = [
  { name: "Direct Download", handler: "direct" },
  { name: "YouTube-DL", handler: "youtube-dl" },
  { name: "Video Extractor", handler: "video" },
  { name: "Audio Extractor", handler: "audio" }
];

const ALL_ATTRIBUTES = {
  Basic: ["text", "href", "src", "alt", "title", "value"],
  Media: ["src", "poster", "preload", "controls", "autoplay"],
  Data: ["data-src", "data-href", "data-id", "data-url", "data-type"],
  Download: ["download", "data-download-url", "data-file-type"]
};

interface SelectedSelector {
  selector: string;
  attributes: string[];
  extractedData: Record<string, string>;
  mediaType?: string;
  availableAttributes: string[];
}

export default function ElementSelector({ selectedElement, url, onSelectionStart }: ElementSelectorProps) {
  const { toast } = useToast();
  const [selectedSelectors, setSelectedSelectors] = useState<SelectedSelector[]>([]);
  const [isAttributeDialogOpen, setIsAttributeDialogOpen] = useState(false);
  const [currentSelector, setCurrentSelector] = useState<string | null>(null);
  const [customAttribute, setCustomAttribute] = useState("");
  const [lastSuccessfulDownloader, setLastSuccessfulDownloader] = useState<string | null>(null);

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes glow {
        from {
          box-shadow: 0 0 15px #ADD8E6;
        }
        to {
          box-shadow: 0 0 20px #007BFF;
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    if (!selectedElement) return;

    const iframe = document.querySelector('iframe');
    if (!iframe?.contentDocument) return;

    const element = iframe.contentDocument.querySelector(selectedElement);
    if (!element) return;

    // Don't add duplicate selectors
    if (selectedSelectors.some(s => s.selector === selectedElement)) return;

    // Get all available attributes
    const availableAttributes = Array.from(element.attributes)
      .map(attr => attr.name)
      .filter(attr => attr !== 'class' && attr !== 'style');

    // Always include text if element has text content
    const textContent = element.textContent?.trim();
    if (textContent) {
      availableAttributes.unshift('text');
    }

    // Detect media type
    let mediaType;
    if (element instanceof HTMLVideoElement || element.querySelector('video')) {
      mediaType = 'video';
    } else if (element instanceof HTMLAudioElement || element.querySelector('audio')) {
      mediaType = 'audio';
    } else if (element instanceof HTMLImageElement || element.querySelector('img')) {
      mediaType = 'image';
    } else if (element instanceof HTMLAnchorElement && element.href?.match(/\.(mp4|webm|ogg|mp3|wav)$/i)) {
      mediaType = element.href.match(/\.(mp4|webm|ogg)$/i) ? 'video' : 'audio';
    }

    // Initialize extracted data with text content
    const extractedData: Record<string, string> = {};
    if (textContent) {
      extractedData.text = textContent;
    }

    // Add values for available attributes
    availableAttributes.forEach(attr => {
      if (attr !== 'text') {
        const value = element.getAttribute(attr);
        if (value) {
          extractedData[attr] = value;
        }
      }
    });

    // Create new selector with detected attributes
    const newSelector: SelectedSelector = {
      selector: selectedElement,
      attributes: Object.keys(extractedData),
      extractedData,
      mediaType,
      availableAttributes
    };

    setSelectedSelectors(prev => [...prev, newSelector]);
  }, [selectedElement]);

  const handleAttributeDialogOpen = (selector: string) => {
    setCurrentSelector(selector);
    setIsAttributeDialogOpen(true);
  };

  const handleAttributeToggle = (attribute: string) => {
    if (!currentSelector) return;

    setSelectedSelectors(prev => prev.map(s => {
      if (s.selector === currentSelector) {
        const iframe = document.querySelector('iframe');
        if (!iframe?.contentDocument) return s;

        const element = iframe.contentDocument.querySelector(s.selector);
        if (!element) return s;

        let value = '';
        if (attribute === 'text') {
          value = element.textContent?.trim() || '';
        } else {
          value = element.getAttribute(attribute) || '';
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
      return s;
    }));
  };

  const handleAddCustomAttribute = () => {
    if (!customAttribute || !currentSelector) return;

    const iframe = document.querySelector('iframe');
    if (!iframe?.contentDocument) return;

    const element = iframe.contentDocument.querySelector(currentSelector);
    if (!element) return;

    const value = element.getAttribute(customAttribute) || '';

    setSelectedSelectors(prev => prev.map(s => {
      if (s.selector === currentSelector) {
        return {
          ...s,
          attributes: [...s.attributes, customAttribute],
          extractedData: {
            ...s.extractedData,
            [customAttribute]: value
          },
          availableAttributes: [...s.availableAttributes, customAttribute]
        };
      }
      return s;
    }));

    setCustomAttribute("");
    toast({ title: "Success", description: "Custom attribute added" });
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
      {selectedSelectors.map((selector) => (
        <div
          key={selector.selector}
          className="flex items-center gap-2 bg-black border-2 border-[#007BFF] rounded-[25%] shadow-[0_0_15px_#ADD8E6] hover:shadow-[0_0_20px_#007BFF] transition-all duration-300 p-2"
          style={{
            animation: "glow 1.5s ease-in-out infinite alternate"
          }}
        >
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 text-[#007BFF] hover:text-[#ADD8E6] transition-colors"
            onClick={() => handleAttributeDialogOpen(selector.selector)}
          >
            <List className="h-4 w-4" />
          </Button>

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

      <Dialog open={isAttributeDialogOpen} onOpenChange={setIsAttributeDialogOpen}>
        <DialogContent className="bg-black border-2 border-[#007BFF] shadow-[0_0_15px_#ADD8E6]">
          <DialogHeader>
            <DialogTitle className="text-[#007BFF]">Manage Attributes</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {currentSelector && selectedSelectors.find(s => s.selector === currentSelector) && (
              <>
                <div className="space-y-2">
                  <h4 className="text-[#ADD8E6] font-medium">Available Attributes</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedSelectors
                      .find(s => s.selector === currentSelector)
                      ?.availableAttributes.map(attr => (
                        <Button
                          key={attr}
                          variant="outline"
                          size="sm"
                          className={`
                            border-[#007BFF] 
                            ${selectedSelectors.find(s => s.selector === currentSelector)?.attributes.includes(attr)
                              ? "bg-[#007BFF] text-white"
                              : "text-[#007BFF]"
                            }
                            hover:text-[#ADD8E6] hover:border-[#ADD8E6]
                          `}
                          onClick={() => handleAttributeToggle(attr)}
                        >
                          {attr}
                        </Button>
                      ))
                    }
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[#ADD8E6] font-medium">Add Custom Attribute</h4>
                  <div className="flex gap-2">
                    <Input
                      value={customAttribute}
                      onChange={(e) => setCustomAttribute(e.target.value)}
                      placeholder="Enter attribute name"
                      className="bg-black border-[#007BFF] text-white"
                    />
                    <Button
                      onClick={handleAddCustomAttribute}
                      className="border-[#007BFF] text-[#007BFF] hover:text-[#ADD8E6] hover:border-[#ADD8E6]"
                    >
                      Add
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[#ADD8E6] font-medium">Common Attributes</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(ALL_ATTRIBUTES).map(([category, attrs]) => (
                      <div key={category}>
                        <h5 className="text-[#007BFF] text-sm mb-1">{category}</h5>
                        {attrs.map(attr => (
                          <Button
                            key={attr}
                            variant="outline"
                            size="sm"
                            className={`
                              border-[#007BFF] mb-1 w-full
                              ${selectedSelectors.find(s => s.selector === currentSelector)?.attributes.includes(attr)
                                ? "bg-[#007BFF] text-white"
                                : "text-[#007BFF]"
                              }
                              hover:text-[#ADD8E6] hover:border-[#ADD8E6]
                            `}
                            onClick={() => handleAttributeToggle(attr)}
                          >
                            {attr}
                          </Button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}