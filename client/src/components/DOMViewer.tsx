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
  const touchTarget = useRef<HTMLElement | null>(null);

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
      .highlight-target { 
        outline: 3px solid #2563eb !important;
        background: rgba(37, 99, 235, 0.1) !important;
      }
      .selected-element {
        outline: 3px solid #16a34a !important;
        background: rgba(22, 163, 74, 0.1) !important;
      }
      /* Prevent clicks on interactive elements during selection */
      .selectable a, .selectable button { 
        pointer-events: none !important;
      }
      .longpress-indicator {
        position: fixed;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: rgba(37, 99, 235, 0.2);
        pointer-events: none;
        transform: translate(-50%, -50%) scale(0);
        transition: transform 0.5s ease-out;
      }
      .longpress-indicator.active {
        transform: translate(-50%, -50%) scale(1);
      }
    `;
    doc.head.appendChild(style);

    const handleMouseOver = (event: MouseEvent) => {
      if (!isSelectMode) return;
      const target = event.target as HTMLElement;
      if (target.tagName !== 'HTML' && target.tagName !== 'BODY') {
        target.classList.add('highlight-target');
        setSelectedHTML(target.outerHTML.replace(/></g, '>\n<').trim());
      }
    };

    const handleMouseOut = (event: MouseEvent) => {
      if (!isSelectMode) return;
      const target = event.target as HTMLElement;
      target.classList.remove('highlight-target');
    };

    const handleClick = (event: MouseEvent) => {
      if (!isSelectMode) return;
      event.preventDefault();
      event.stopPropagation();

      const target = event.target as HTMLElement;
      selectElement(target);
    };

    const selectElement = (target: HTMLElement) => {
      if (target.tagName !== 'HTML' && target.tagName !== 'BODY') {
        // Remove previous selections
        doc.querySelectorAll('.selected-element').forEach(el => {
          el.classList.remove('selected-element');
        });

        // Add new selection
        target.classList.remove('highlight-target');
        target.classList.add('selected-element');

        const selector = generateSelector(target);
        onElementSelect(selector);
        setSelectedHTML(target.outerHTML.replace(/></g, '>\n<').trim());
      }
    };

    // Mobile touch handling
    let indicator: HTMLDivElement | null = null;

    const createIndicator = (x: number, y: number) => {
      indicator = doc.createElement('div');
      indicator.className = 'longpress-indicator';
      indicator.style.left = `${x}px`;
      indicator.style.top = `${y}px`;
      doc.body.appendChild(indicator);
      // Force reflow
      indicator.offsetHeight;
      indicator.classList.add('active');
    };

    const removeIndicator = () => {
      if (indicator && indicator.parentNode) {
        indicator.classList.remove('active');
        setTimeout(() => {
          indicator?.parentNode?.removeChild(indicator);
          indicator = null;
        }, 500);
      }
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (!isSelectMode) return;
      event.preventDefault(); // Prevent scrolling during selection

      const touch = event.touches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement;
      if (!target || target.tagName === 'HTML' || target.tagName === 'BODY') return;

      touchTarget.current = target;
      target.classList.add('highlight-target');
      createIndicator(touch.clientX, touch.clientY);

      longPressTimer.current = window.setTimeout(() => {
        if (touchTarget.current === target) {
          selectElement(target);
        }
      }, 500);
    };

    const handleTouchEnd = () => {
      if (!isSelectMode) return;
      clearTimeout(longPressTimer.current);
      if (touchTarget.current) {
        touchTarget.current.classList.remove('highlight-target');
        touchTarget.current = null;
      }
      removeIndicator();
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!isSelectMode) return;
      event.preventDefault();
      clearTimeout(longPressTimer.current);

      const touch = event.touches[0];
      const newTarget = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement;

      if (touchTarget.current) {
        touchTarget.current.classList.remove('highlight-target');
      }

      if (newTarget && newTarget.tagName !== 'HTML' && newTarget.tagName !== 'BODY') {
        touchTarget.current = newTarget;
        newTarget.classList.add('highlight-target');
        setSelectedHTML(newTarget.outerHTML.replace(/></g, '>\n<').trim());
      }

      if (indicator) {
        indicator.style.left = `${touch.clientX}px`;
        indicator.style.top = `${touch.clientY}px`;
      }
    };

    // Add event listeners for both desktop and mobile
    doc.addEventListener('mouseover', handleMouseOver);
    doc.addEventListener('mouseout', handleMouseOut);
    doc.addEventListener('click', handleClick, true);
    doc.addEventListener('touchstart', handleTouchStart, { passive: false });
    doc.addEventListener('touchend', handleTouchEnd, { passive: false });
    doc.addEventListener('touchmove', handleTouchMove, { passive: false });

    // Toggle selection mode class
    doc.body.classList.toggle('selectable', isSelectMode);

    // Cleanup
    return () => {
      clearTimeout(longPressTimer.current);
      removeIndicator();
      doc.removeEventListener('mouseover', handleMouseOver);
      doc.removeEventListener('mouseout', handleMouseOut);
      doc.removeEventListener('click', handleClick, true);
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
          .filter(className => !['highlight-target', 'selected-element', 'selectable'].includes(className))
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
          onClick={() => {
            if (!isSelectMode) {
              setIsSelectMode(true);
            } else {
              setIsSelectMode(false);
              // Clear any existing selections when exiting select mode
              if (iframeRef.current?.contentDocument) {
                iframeRef.current.contentDocument.querySelectorAll('.selected-element, .highlight-target').forEach(el => {
                  el.classList.remove('selected-element', 'highlight-target');
                });
                setSelectedHTML("");
              }
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