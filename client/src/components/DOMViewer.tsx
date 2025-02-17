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
  const longPressTimer = useRef<number>();
  const isLongPressing = useRef(false);

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
      /* Disable pointer events when in select mode */
      .selectable * { pointer-events: none !important; }
      .selectable a, .selectable button, .selectable input { 
        pointer-events: none !important;
      }
    `;
    doc.head.appendChild(style);

    // Prevent all default behaviors when in select mode
    const preventDefaultInSelectMode = (e: Event) => {
      if (isSelectMode) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Add the event listener in the capture phase
    doc.addEventListener('click', preventDefaultInSelectMode, true);
    doc.addEventListener('mousedown', preventDefaultInSelectMode, true);
    doc.addEventListener('mouseup', preventDefaultInSelectMode, true);
    doc.addEventListener('touchstart', preventDefaultInSelectMode, true);
    doc.addEventListener('touchend', preventDefaultInSelectMode, true);

    const highlightElement = (target: HTMLElement) => {
      if (target.tagName !== 'HTML' && target.tagName !== 'BODY') {
        target.classList.add('highlighted');
      }
    };

    const unhighlightElement = (target: HTMLElement) => {
      target.classList.remove('highlighted');
    };

    const selectElement = (target: HTMLElement) => {
      if (target.tagName !== 'HTML' && target.tagName !== 'BODY') {
        const selector = generateSelector(target);
        onElementSelect(selector);
        setSelectedHTML(target.outerHTML.replace(/></g, '>\n<').trim());
      }
    };

    // Desktop hover handlers
    const handleMouseOver = (e: MouseEvent) => {
      if (!isSelectMode) return;
      highlightElement(e.target as HTMLElement);
    };

    const handleMouseOut = (e: MouseEvent) => {
      unhighlightElement(e.target as HTMLElement);
    };

    // Desktop click handler
    const handleElementSelect = (e: MouseEvent) => {
      if (!isSelectMode) return;
      e.preventDefault();
      e.stopPropagation();
      selectElement(e.target as HTMLElement);
    };

    // Mobile touch handlers
    const handleTouchStart = (e: TouchEvent) => {
      if (!isSelectMode) return;
      const touch = e.touches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement;

      isLongPressing.current = true;
      longPressTimer.current = window.setTimeout(() => {
        if (isLongPressing.current) {
          highlightElement(target);
        }
      }, 500);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isSelectMode) return;
      clearTimeout(longPressTimer.current);

      if (isLongPressing.current) {
        const touch = e.changedTouches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement;
        selectElement(target);
        unhighlightElement(target);
      }
      isLongPressing.current = false;
    };

    const handleTouchMove = () => {
      isLongPressing.current = false;
      clearTimeout(longPressTimer.current);
    };

    // Add event listeners for both desktop and mobile
    doc.addEventListener('mouseover', handleMouseOver, true);
    doc.addEventListener('mouseout', handleMouseOut, true);
    doc.addEventListener('click', handleElementSelect, true);
    doc.addEventListener('touchstart', handleTouchStart, true);
    doc.addEventListener('touchend', handleTouchEnd, true);
    doc.addEventListener('touchmove', handleTouchMove, true);

    // Update body class based on select mode
    doc.body.classList.toggle('selectable', isSelectMode);

    // Cleanup
    return () => {
      clearTimeout(longPressTimer.current);
      doc.removeEventListener('click', preventDefaultInSelectMode, true);
      doc.removeEventListener('mousedown', preventDefaultInSelectMode, true);
      doc.removeEventListener('mouseup', preventDefaultInSelectMode, true);
      doc.removeEventListener('touchstart', preventDefaultInSelectMode, true);
      doc.removeEventListener('touchend', preventDefaultInSelectMode, true);
      doc.removeEventListener('mouseover', handleMouseOver, true);
      doc.removeEventListener('mouseout', handleMouseOut, true);
      doc.removeEventListener('click', handleElementSelect, true);
      doc.removeEventListener('touchstart', handleTouchStart, true);
      doc.removeEventListener('touchend', handleTouchEnd, true);
      doc.removeEventListener('touchmove', handleTouchMove, true);
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