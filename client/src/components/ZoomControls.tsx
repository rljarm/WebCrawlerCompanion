import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut } from "lucide-react";

interface ZoomControlsProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

export default function ZoomControls({ zoom, onZoomChange }: ZoomControlsProps) {
  const handleZoomIn = () => {
    onZoomChange(Math.min(zoom + 0.1, 2));
  };

  const handleZoomOut = () => {
    onZoomChange(Math.max(zoom - 0.1, 0.5));
  };

  return (
    <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-lg p-2">
      <Button variant="outline" size="icon" onClick={handleZoomOut}>
        <ZoomOut className="h-4 w-4" />
      </Button>
      
      <Slider
        min={50}
        max={200}
        step={10}
        value={[zoom * 100]}
        onValueChange={([value]) => onZoomChange(value / 100)}
        className="w-24"
      />

      <Button variant="outline" size="icon" onClick={handleZoomIn}>
        <ZoomIn className="h-4 w-4" />
      </Button>
    </div>
  );
}
