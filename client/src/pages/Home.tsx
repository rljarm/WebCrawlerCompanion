import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import URLInput from "@/components/URLInput";
import DOMViewer from "@/components/DOMViewer";
import ProxyConfig from "@/components/ProxyConfig";
import NavigationControls from "@/components/NavigationControls";
import ZoomControls from "@/components/ZoomControls";
import ElementSelector from "@/components/ElementSelector";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const DEFAULT_URL = "https://en.wikipedia.org/wiki/Main_Page";

export default function Home() {
  const [url, setUrl] = useState(DEFAULT_URL);
  const [domContent, setDomContent] = useState("");
  const [zoom, setZoom] = useState(1);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isProxyDialogOpen, setIsProxyDialogOpen] = useState(false);

  // Load default URL on mount
  useEffect(() => {
    const fetchDefaultContent = async () => {
      try {
        const response = await fetch("/api/fetch-dom", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: DEFAULT_URL }),
        });
        const data = await response.json();
        setDomContent(data.content);
      } catch (error) {
        console.error("Failed to fetch default content:", error);
      }
    };
    fetchDefaultContent();
  }, []);

  const handleUrlSubmit = async (submittedUrl: string, content: string) => {
    setUrl(submittedUrl);
    setDomContent(content);
  };

  const handleElementSelect = (selector: string, isMultiSelect: boolean) => {
    setSelectedElement(selector);
    // Don't automatically turn off selection mode
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed top-0 left-0 right-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between gap-4 p-4">
          <URLInput onUrlSubmit={handleUrlSubmit} defaultUrl={DEFAULT_URL} />
          <Dialog open={isProxyDialogOpen} onOpenChange={setIsProxyDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Proxy Configuration</DialogTitle>
              </DialogHeader>
              <ProxyConfig />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="pt-16">
        <div className="relative">
          <DOMViewer 
            content={domContent} 
            zoom={zoom}
            onElementSelect={handleElementSelect}
            isSelectionMode={isSelectionMode}
            onSelectionModeChange={toggleSelectionMode}
          />
          <div className="fixed bottom-4 right-4 flex gap-2">
            <NavigationControls />
            <ZoomControls zoom={zoom} onZoomChange={setZoom} />
          </div>

          <ElementSelector 
            selectedElement={selectedElement} 
            url={url}
            onSelectionStart={() => setIsSelectionMode(true)}
          />
        </div>
      </div>
    </div>
  );
}