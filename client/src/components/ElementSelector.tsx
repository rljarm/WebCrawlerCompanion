import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ElementSelectorProps {
  selectedElement: string | null;
  url: string;
}

const AVAILABLE_ATTRIBUTES = [
  "text",
  "href",
  "src",
  "alt",
  "title",
  "value",
  "data-*"
];

export default function ElementSelector({ selectedElement, url }: ElementSelectorProps) {
  const { toast } = useToast();
  
  const mutation = useMutation({
    mutationFn: async (data: { selector: string; attributes: string[]; url: string }) => {
      const response = await apiRequest("POST", "/api/selectors", {
        name: "Selection",
        ...data
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/selectors"] });
      toast({ title: "Success", description: "Selector saved successfully" });
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to save selector",
        variant: "destructive"
      });
    }
  });

  const handleSave = (attributes: string[]) => {
    if (selectedElement && url) {
      mutation.mutate({
        selector: selectedElement,
        attributes,
        url
      });
    }
  };

  if (!selectedElement) {
    return (
      <div className="text-muted-foreground text-sm">
        Click an element in the preview to select it
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-medium mb-2">Selected Selector:</div>
        <code className="block p-2 bg-muted rounded-md text-sm break-all">
          {selectedElement}
        </code>
      </div>

      <div>
        <div className="text-sm font-medium mb-2">Select Attributes:</div>
        <Select
          onValueChange={(value) => handleSave([value])}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose attributes to extract" />
          </SelectTrigger>
          <SelectContent>
            {AVAILABLE_ATTRIBUTES.map(attr => (
              <SelectItem key={attr} value={attr}>
                {attr}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
