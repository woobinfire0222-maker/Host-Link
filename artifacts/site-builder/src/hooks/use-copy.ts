import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

export function useCopy() {
  const { toast } = useToast();
  const [isCopied, setIsCopied] = useState(false);

  const copy = useCallback(
    async (text: string, message: string = "Copied to clipboard") => {
      if (!navigator?.clipboard) {
        toast({
          title: "Copy failed",
          description: "Clipboard API not available",
          variant: "destructive",
        });
        return false;
      }

      try {
        await navigator.clipboard.writeText(text);
        setIsCopied(true);
        toast({
          title: message,
          duration: 2000,
        });
        setTimeout(() => setIsCopied(false), 2000);
        return true;
      } catch (error) {
        console.error("Copy failed", error);
        toast({
          title: "Copy failed",
          description: "Could not copy text",
          variant: "destructive",
        });
        return false;
      }
    },
    [toast]
  );

  return { isCopied, copy };
}
