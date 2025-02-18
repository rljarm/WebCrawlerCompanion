import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SiCurseforge } from "react-icons/si";

interface DOMViewerProps {
  content: string;
  zoom: number;
  onElementSelect: (selector: string, isMultiSelect: boolean) => void;
}

export default function DOMViewer({ content, zoom, onElementSelect }: DOMViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [selectedHTML, setSelectedHTML] = useState<string>("");
  const pressTimerRef = useRef<number>();
  const pressTargetRef = useRef<HTMLElement | null>(null);
  const isPressingRef = useRef(false);

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
      * { 
        cursor: default !important;
        -webkit-tap-highlight-color: transparent !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
        touch-action: none !important;
      }
      .selectable * { 
        cursor: crosshair !important; 
      }
      .highlight-target { 
        outline: 2px solid #2563eb !important;
        background: rgba(37, 99, 235, 0.1) !important;
        transition: outline 0.15s ease, background 0.15s ease !important;
      }
      .selected-element {
        outline: 3px solid #16a34a !important;
        background: rgba(22, 163, 74, 0.1) !important;
        transition: outline 0.15s ease, background 0.15s ease !important;
      }
    `;
    doc.head.appendChild(style);

    const selectElement = (element: HTMLElement) => {
      if (element.tagName === 'HTML' || element.tagName === 'BODY') return;

      // Remove previous highlights
      doc.querySelectorAll('.highlight-target').forEach(el => {
        el.classList.remove('highlight-target');
      });

      // If not in multi-select mode, clear previous selections
      if (!isMultiSelect) {
        doc.querySelectorAll('.selected-element').forEach(el => {
          el.classList.remove('selected-element');
        });
      }

      // Add new selection
      element.classList.remove('highlight-target');
      element.classList.add('selected-element');

      const selector = generateSelector(element);
      onElementSelect(selector, isMultiSelect);
      setSelectedHTML(element.outerHTML);
    };

    const handleMouseOver = (e: MouseEvent) => {
      if (!isSelectMode || isPressingRef.current) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'HTML' || target.tagName === 'BODY') return;

      // Don't highlight if already selected
      if (!target.classList.contains('selected-element')) {
        target.classList.add('highlight-target');
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      if (!isSelectMode || isPressingRef.current) return;
      const target = e.target as HTMLElement;
      if (!target.classList.contains('selected-element')) {
        target.classList.remove('highlight-target');
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (!isSelectMode) return;
      e.preventDefault();
      e.stopPropagation();
      selectElement(e.target as HTMLElement);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (!isSelectMode) return;
      e.preventDefault();
      e.stopPropagation();
      isPressingRef.current = true;

      const touch = e.touches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement;
      if (!target || target.tagName === 'HTML' || target.tagName === 'BODY') return;

      pressTargetRef.current = target;
      if (!target.classList.contains('selected-element')) {
        target.classList.add('highlight-target');
      }

      pressTimerRef.current = window.setTimeout(() => {
        if (pressTargetRef.current === target) {
          selectElement(target);
        }
      }, 500);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isSelectMode || !isPressingRef.current) return;
      e.preventDefault();
      e.stopPropagation();

      // Remove highlight from previous target
      if (pressTargetRef.current && !pressTargetRef.current.classList.contains('selected-element')) {
        pressTargetRef.current.classList.remove('highlight-target');
      }

      const touch = e.touches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement;
      if (!target || target.tagName === 'HTML' || target.tagName === 'BODY') return;

      pressTargetRef.current = target;
      if (!target.classList.contains('selected-element')) {
        target.classList.add('highlight-target');
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isSelectMode) return;
      e.preventDefault();
      e.stopPropagation();
      isPressingRef.current = false;

      if (pressTimerRef.current) {
        clearTimeout(pressTimerRef.current);
      }

      if (pressTargetRef.current && !pressTargetRef.current.classList.contains('selected-element')) {
        pressTargetRef.current.classList.remove('highlight-target');
      }
      pressTargetRef.current = null;
    };

    // Add event listeners
    doc.addEventListener('mouseover', handleMouseOver, true);
    doc.addEventListener('mouseout', handleMouseOut, true);
    doc.addEventListener('click', handleClick, true);
    doc.addEventListener('touchstart', handleTouchStart, { passive: false });
    doc.addEventListener('touchmove', handleTouchMove, { passive: false });
    doc.addEventListener('touchend', handleTouchEnd, { passive: false });

    // Prevent context menu
    doc.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      return false;
    }, true);

    // Toggle selection mode class
    doc.body.classList.toggle('selectable', isSelectMode);

    return () => {
      if (pressTimerRef.current) {
        clearTimeout(pressTimerRef.current);
      }
      // Clean up event listeners
      doc.removeEventListener('mouseover', handleMouseOver, true);
      doc.removeEventListener('mouseout', handleMouseOut, true);
      doc.removeEventListener('click', handleClick, true);
      doc.removeEventListener('touchstart', handleTouchStart);
      doc.removeEventListener('touchmove', handleTouchMove);
      doc.removeEventListener('touchend', handleTouchEnd);
      doc.removeEventListener('contextmenu', (e) => e.preventDefault());
    };
  }, [content, onElementSelect, isSelectMode, isMultiSelect]);

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
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setIsSelectMode(!isSelectMode);
              if (!isSelectMode) {
                setIsMultiSelect(false);
              }
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
            <Button
              onClick={() => setIsMultiSelect(!isMultiSelect)}
              variant={isMultiSelect ? "secondary" : "outline"}
            >
              Select Multiple
            </Button>
          )}
        </div>
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