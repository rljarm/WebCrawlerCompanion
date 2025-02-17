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
  const currentHighlightedElement = useRef<HTMLElement | null>(null);

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
        outline: 3px solid #2563eb !important;
        background: rgba(37, 99, 235, 0.1) !important;
        transition: all 0.2s ease-in-out;
      }
      /* Only disable pointer events on links and buttons */
      .selectable a, .selectable button { 
        pointer-events: none !important;
      }
      .longpress-progress {
        position: absolute;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(37, 99, 235, 0.2);
        transform: translate(-50%, -50%);
        pointer-events: none;
        transition: transform 0.5s ease-in-out;
      }
    `;
    doc.head.appendChild(style);

    const highlightElement = (target: HTMLElement) => {
      if (target.tagName !== 'HTML' && target.tagName !== 'BODY') {
        if (currentHighlightedElement.current) {
          currentHighlightedElement.current.classList.remove('highlighted');
        }
        target.classList.add('highlighted');
        currentHighlightedElement.current = target;
        setSelectedHTML(target.outerHTML.replace(/></g, '>\n<').trim());
      }
    };

    const unhighlightElement = () => {
      if (currentHighlightedElement.current) {
        currentHighlightedElement.current.classList.remove('highlighted');
        currentHighlightedElement.current = null;
        setSelectedHTML("");
      }
    };

    const selectElement = (target: HTMLElement) => {
      if (target.tagName !== 'HTML' && target.tagName !== 'BODY') {
        const selector = generateSelector(target);
        onElementSelect(selector);
        setSelectedHTML(target.outerHTML.replace(/></g, '>\n<').trim());
      }
    };

    let progressElement: HTMLElement | null = null;

    const createProgressElement = (x: number, y: number) => {
      progressElement = doc.createElement('div');
      progressElement.className = 'longpress-progress';
      progressElement.style.left = `${x}px`;
      progressElement.style.top = `${y}px`;
      doc.body.appendChild(progressElement);
    };

    const removeProgressElement = () => {
      if (progressElement && progressElement.parentNode) {
        progressElement.parentNode.removeChild(progressElement);
        progressElement = null;
      }
    };

    // Desktop hover handlers
    const handleMouseOver = (e: MouseEvent) => {
      if (!isSelectMode) return;
      highlightElement(e.target as HTMLElement);
    };

    const handleMouseOut = (e: MouseEvent) => {
      if (!isLongPressing.current) {
        unhighlightElement();
      }
    };

    // Desktop click handler
    const handleElementSelect = (e: MouseEvent) => {
      if (!isSelectMode) return;
      e.stopPropagation();
      selectElement(e.target as HTMLElement);
    };

    // Mobile touch handlers
    const handleTouchStart = (e: TouchEvent) => {
      if (!isSelectMode) return;
      const touch = e.touches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement;

      isLongPressing.current = true;
      createProgressElement(touch.clientX, touch.clientY);

      longPressTimer.current = window.setTimeout(() => {
        if (isLongPressing.current) {
          highlightElement(target);
          if (progressElement) {
            progressElement.style.transform = 'translate(-50%, -50%) scale(1.5)';
          }
        }
      }, 500);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isSelectMode) return;
      removeProgressElement();
      clearTimeout(longPressTimer.current);

      if (isLongPressing.current) {
        const touch = e.changedTouches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement;
        if (currentHighlightedElement.current === target) {
          selectElement(target);
        }
      }
      isLongPressing.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isSelectMode) return;
      isLongPressing.current = false;
      clearTimeout(longPressTimer.current);
      removeProgressElement();

      const touch = e.touches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement;
      highlightElement(target);
    };

    // Add event listeners for both desktop and mobile
    doc.addEventListener('mouseover', handleMouseOver, true);
    doc.addEventListener('mouseout', handleMouseOut, true);
    doc.addEventListener('click', handleElementSelect, true);
    doc.addEventListener('touchstart', handleTouchStart, { passive: false });
    doc.addEventListener('touchend', handleTouchEnd, { passive: false });
    doc.addEventListener('touchmove', handleTouchMove, { passive: false });

    // Update body class based on select mode
    doc.body.classList.toggle('selectable', isSelectMode);

    // Cleanup
    return () => {
      clearTimeout(longPressTimer.current);
      removeProgressElement();
      unhighlightElement();
      doc.removeEventListener('mouseover', handleMouseOver, true);
      doc.removeEventListener('mouseout', handleMouseOut, true);
      doc.removeEventListener('click', handleElementSelect, true);
      doc.removeEventListener('touchstart', handleTouchStart);
      doc.removeEventListener('touchend', handleTouchEnd);
      doc.removeEventListener('touchmove', handleTouchMove);
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
          .filter(className => !['highlighted', 'selectable'].includes(className))
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