import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface URLInputProps {
  onUrlSubmit: (url: string, content: string) => void;
}

export default function URLInput({ onUrlSubmit }: URLInputProps) {
  const [inputUrl, setInputUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiRequest("POST", "/api/fetch-dom", { url: inputUrl });
      const data = await response.json();
      onUrlSubmit(inputUrl, data.content);
      toast({
        title: "Success",
        description: "Page content loaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch the page content",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        type="url"
        placeholder="Enter URL to analyze..."
        value={inputUrl}
        onChange={(e) => setInputUrl(e.target.value)}
        className="flex-1"
        required
      />
      <Button type="submit" disabled={loading}>
        {loading ? "Loading..." : "Analyze"}
      </Button>
    </form>
  );
}