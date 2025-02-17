import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function ProxyConfig() {
  const [name, setName] = useState("");
  const [proxies, setProxies] = useState("");
  const [strategy, setStrategy] = useState("round-robin");
  const { toast } = useToast();

  const { data: configs } = useQuery({
    queryKey: ["/api/proxy-configs"]
  });

  const mutation = useMutation({
    mutationFn: async (data: { name: string; proxies: string[]; rotationStrategy: string }) => {
      const response = await apiRequest("POST", "/api/proxy-configs", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proxy-configs"] });
      toast({ title: "Success", description: "Proxy configuration saved" });
      setName("");
      setProxies("");
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to save proxy configuration",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      name,
      proxies: proxies.split('\n').filter(p => p.trim()),
      rotationStrategy: strategy
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Input
          placeholder="Configuration Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div>
        <Textarea
          placeholder="Enter proxies (one per line)"
          value={proxies}
          onChange={(e) => setProxies(e.target.value)}
          required
          className="h-32"
        />
      </div>

      <div>
        <Select value={strategy} onValueChange={setStrategy}>
          <SelectTrigger>
            <SelectValue placeholder="Select rotation strategy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="round-robin">Round Robin</SelectItem>
            <SelectItem value="random">Random</SelectItem>
            <SelectItem value="sequential">Sequential</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" className="w-full">
        Save Configuration
      </Button>
    </form>
  );
}
