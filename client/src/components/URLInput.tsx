import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface URLInputProps {
  onUrlSubmit: (url: string, content: string) => void;
  defaultUrl: string;
}

export default function URLInput({ onUrlSubmit, defaultUrl }: URLInputProps) {
  const [inputUrl, setInputUrl] = useState(defaultUrl);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const formatUrl = (url: string): string => {
    let formattedUrl = url.trim();

    // Add protocol if missing
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }

    // Add www if needed (only for domains without subdomains)
    const urlObj = new URL(formattedUrl);
    const hostParts = urlObj.hostname.split('.');
    if (hostParts.length === 2 && !urlObj.hostname.startsWith('www.')) {
      urlObj.hostname = 'www.' + urlObj.hostname;
      formattedUrl = urlObj.toString();
    }

    return formattedUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;

    setLoading(true);
    let formattedUrl;

    try {
      formattedUrl = formatUrl(inputUrl);
      const response = await apiRequest("POST", "/api/fetch-dom", { url: formattedUrl });
      const data = await response.json();

      // Only update URL and content if fetch was successful
      onUrlSubmit(formattedUrl, data.content);
      // Update input field with formatted URL
      setInputUrl(formattedUrl);

      toast({
        title: "Success",
        description: "Page content loaded successfully",
      });
    } catch (error) {
      // If URL formatting fails
      if (error instanceof Error && error.message.includes('Invalid URL')) {
        toast({
          title: "Invalid URL",
          description: "Please enter a valid website URL",
          variant: "destructive"
        });
      } else {
        // If fetch fails
        toast({
          title: "Error",
          description: "Failed to fetch the page content",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        type="text"
        placeholder="Enter website URL (e.g., example.com)"
        value={inputUrl}
        onChange={(e) => setInputUrl(e.target.value)}
        className="flex-1"
        required
      />
      <Button type="submit" disabled={loading || !inputUrl.trim()}>
        {loading ? "Loading..." : "Analyze"}
      </Button>
    </form>
  );
}