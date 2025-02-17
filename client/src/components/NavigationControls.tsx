import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown } from "lucide-react";

export default function NavigationControls() {
  const handleUp = () => {
    // Navigate up in DOM
  };

  const handleDown = () => {
    // Navigate down in DOM
  };

  return (
    <div className="flex gap-2 bg-background/80 backdrop-blur-sm rounded-lg p-2">
      <Button variant="outline" size="icon" onClick={handleUp}>
        <ArrowUp className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="icon" onClick={handleDown}>
        <ArrowDown className="h-4 w-4" />
      </Button>
    </div>
  );
}
