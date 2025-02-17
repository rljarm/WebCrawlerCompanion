import { useState } from "react";
import { Card } from "@/components/ui/card";
import URLInput from "@/components/URLInput";
import DOMViewer from "@/components/DOMViewer";
import ProxyConfig from "@/components/ProxyConfig";
import NavigationControls from "@/components/NavigationControls";
import ZoomControls from "@/components/ZoomControls";
import ElementSelector from "@/components/ElementSelector";

export default function Home() {
  const [url, setUrl] = useState("");
  const [domContent, setDomContent] = useState("");
  const [zoom, setZoom] = useState(1);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-4xl font-bold text-foreground">DOM Selector Builder</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="p-6">
              <URLInput onUrlSubmit={(url) => setUrl(url)} />
              <div className="relative mt-4 border rounded-lg overflow-hidden">
                <DOMViewer 
                  content={domContent} 
                  zoom={zoom}
                  onElementSelect={setSelectedElement}
                />
                <div className="absolute bottom-4 right-4 flex gap-2">
                  <NavigationControls />
                  <ZoomControls zoom={zoom} onZoomChange={setZoom} />
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Selected Element</h2>
              <ElementSelector 
                selectedElement={selectedElement} 
                url={url}
              />
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Proxy Configuration</h2>
              <ProxyConfig />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
