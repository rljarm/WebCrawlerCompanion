import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SiCurseforge } from "react-icons/si";
import { useLongPress } from "@/hooks/useLongPress";

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

    // Add styles for selection mode
    const style = doc.createElement('style');
    style.textContent = `
      * { cursor: default !important; }
      .selectable * { cursor: crosshair !important; }
      .highlight-target { 
        outline: 2px solid #2563eb !important;
        background: rgba(37, 99, 235, 0.1) !important;
      }
      .selected-element {
        outline: 2px solid #16a34a !important;
        background: rgba(22, 163, 74, 0.1) !important;
      }
    `;
    doc.head.appendChild(style);

    const selectElement = (element: HTMLElement) => {
      if (element.tagName === 'HTML' || element.tagName === 'BODY') return;

      doc.querySelectorAll('.selected-element, .highlight-target').forEach(el => {
        el.classList.remove('selected-element', 'highlight-target');
      });

      element.classList.add('selected-element');
      const selector = generateSelector(element);
      onElementSelect(selector);
      setSelectedHTML(element.outerHTML);
    };

    // Event handlers
    const handleMouseOver = (e: MouseEvent) => {
      if (!isSelectMode) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'HTML' || target.tagName === 'BODY') return;
      target.classList.add('highlight-target');
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      target.classList.remove('highlight-target');
    };

    const handleClick = (e: MouseEvent) => {
      if (!isSelectMode) return;
      e.preventDefault();
      e.stopPropagation();
      selectElement(e.target as HTMLElement);
    };

    // Add longpress handling
    doc.querySelectorAll('*').forEach(element => {
      const longPressProps = useLongPress({
        onLongPress: () => {
          if (isSelectMode) {
            selectElement(element as HTMLElement);
          }
        },
        threshold: 500
      });

      Object.entries(longPressProps).forEach(([event, handler]) => {
        element.addEventListener(event.toLowerCase(), handler);
      });
    });

    // Add event listeners
    doc.addEventListener('mouseover', handleMouseOver, true);
    doc.addEventListener('mouseout', handleMouseOut, true);
    doc.addEventListener('click', handleClick, true);

    // Toggle selection mode class
    doc.body.classList.toggle('selectable', isSelectMode);

    return () => {
      // Clean up event listeners
      doc.removeEventListener('mouseover', handleMouseOver, true);
      doc.removeEventListener('mouseout', handleMouseOut, true);
      doc.removeEventListener('click', handleClick, true);

      // Clean up longpress listeners
      doc.querySelectorAll('*').forEach(element => {
        const longPressProps = useLongPress({
          onLongPress: () => {},
          threshold: 500
        });
        Object.entries(longPressProps).forEach(([event, handler]) => {
          element.removeEventListener(event.toLowerCase(), handler);
        });
      });
    };
  }, [content, onElementSelect, isSelectMode]);

  const generateSelector = (element: HTMLElement): string => {
    const path: string[] = [];
    let currentElement: HTMLElement | null = element;

    while (currentElement && currentElement.tagName !== 'HTML') {
      let selector = currentElement.tagName.toLowerCase();

      if (currentElement.id) {
        selector = `#${currentElement.id}`;
        path.unshift(selector);
        break;
      }

      if (currentElement.className) {
        const classes = Array.from(currentElement.classList)
          .filter(className => !['highlight-target', 'selected-element', 'selectable'].includes(className))
          .join('.');
        if (classes) {
          selector += `.${classes}`;
        }
      }

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

  // Update zoom level
  useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.style.transform = `scale(${zoom})`;
      iframeRef.current.style.transformOrigin = 'top left';
    }
  }, [zoom]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Button
          onClick={() => {
            setIsSelectMode(!isSelectMode);
            if (iframeRef.current?.contentDocument) {
              iframeRef.current.contentDocument.querySelectorAll('.selected-element, .highlight-target').forEach(el => {
                el.classList.remove('selected-element', 'highlight-target');
              });
              setSelectedHTML("");
            }
          }}
          variant={isSelectMode ? "destructive" : "default"}
        >
          <SiCurseforge className="mr-2 h-4 w-4" />
          {isSelectMode ? "Cancel Selection" : "Select Element"}
        </Button>
        {isSelectMode && (
          <div className="text-sm text-muted-foreground">
            {window.matchMedia('(hover: none)').matches 
              ? "Long press any element to select it"
              : "Click any element to select it"}
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