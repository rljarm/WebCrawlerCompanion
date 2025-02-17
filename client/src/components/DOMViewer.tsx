import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SiCurseforge } from "react-icons/si";

interface DOMViewerProps {
  content: string;
  zoom: number;
  onElementSelect: (selector: string) => void;
}

export default function DOMViewer({ content, zoom, onElementSelect }: DOMViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedHTML, setSelectedHTML] = useState<string>("");

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !content) return;

    const doc = iframe.contentDocument;
    if (!doc) return;

    // Reset iframe content
    doc.open();
    doc.write(content);
    doc.close();

    // Add required styles to the iframe document
    const style = doc.createElement('style');
    style.textContent = `
      .selectable { cursor: crosshair !important; }
      .highlighted { 
        outline: 2px solid blue !important;
        background: rgba(0, 0, 255, 0.1) !important;
      }
    `;
    doc.head.appendChild(style);

    // Add interaction handlers
    const handleMouseOver = (e: MouseEvent) => {
      if (!isSelectMode) return;
      const target = e.target as HTMLElement;
      if (target.tagName !== 'HTML' && target.tagName !== 'BODY') {
        target.classList.add('highlighted');
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      target.classList.remove('highlighted');
    };

    const handleClick = (e: MouseEvent) => {
      if (!isSelectMode) return;
      e.preventDefault();
      e.stopPropagation();
      const target = e.target as HTMLElement;
      if (target.tagName !== 'HTML' && target.tagName !== 'BODY') {
        const selector = generateSelector(target);
        onElementSelect(selector);
        // Store a pretty-printed version of the element's HTML
        setSelectedHTML(target.outerHTML.replace(/></g, '>\n<').trim());
      }
    };

    doc.body.addEventListener('mouseover', handleMouseOver);
    doc.body.addEventListener('mouseout', handleMouseOut);
    doc.body.addEventListener('click', handleClick);

    // Update body class based on select mode
    doc.body.classList.toggle('selectable', isSelectMode);

    // Prevent default link behavior when in select mode
    const links = doc.getElementsByTagName('a');
    Array.from(links).forEach(link => {
      link.addEventListener('click', (e) => {
        if (isSelectMode) {
          e.preventDefault();
        }
      });
    });

    // Cleanup
    return () => {
      doc.body.removeEventListener('mouseover', handleMouseOver);
      doc.body.removeEventListener('mouseout', handleMouseOut);
      doc.body.removeEventListener('click', handleClick);
    };
  }, [content, onElementSelect, isSelectMode]);

  // Update zoom level
  useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.style.transform = `scale(${zoom})`;
      iframeRef.current.style.transformOrigin = 'top left';
    }
  }, [zoom]);

  const generateSelector = (element: HTMLElement): string => {
    const path: string[] = [];
    let currentElement: HTMLElement | null = element;

    while (currentElement && currentElement.tagName !== 'HTML') {
      let selector = currentElement.tagName.toLowerCase();

      // Add id if it exists
      if (currentElement.id) {
        selector = `#${currentElement.id}`;
        path.unshift(selector);
        break;
      }

      // Add classes if they exist
      if (currentElement.className) {
        const classes = Array.from(currentElement.classList)
          .filter(className => className !== 'highlighted' && className !== 'selectable')
          .join('.');
        if (classes) {
          selector += `.${classes}`;
        }
      }

      // Add nth-child
      const parent = currentElement.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children);
        const index = siblings.indexOf(currentElement) + 1;
        selector += `:nth-child(${index})`;
      }

      path.unshift(selector);
      currentElement = currentElement.parentElement;
    }

    return path.join(' > ');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Button 
          onClick={() => setIsSelectMode(!isSelectMode)}
          variant={isSelectMode ? "destructive" : "default"}
        >
          <SiCurseforge className="mr-2 h-4 w-4" />
          {isSelectMode ? "Cancel Selection" : "Select Element"}
        </Button>
        {isSelectMode && (
          <div className="text-sm text-muted-foreground">
            Click any element to select it
          </div>
        )}
      </div>

      <div className="w-full h-[600px] overflow-auto bg-white">
        <iframe
          ref={iframeRef}
          className="w-full h-full border-0"
          sandbox="allow-same-origin"
          title="DOM Preview"
        />
      </div>

      {selectedHTML && (
        <Card className="p-4">
          <div className="text-sm font-medium mb-2">Selected Element HTML:</div>
          <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto">
            {selectedHTML}
          </pre>
        </Card>
      )}
    </div>
  );
}