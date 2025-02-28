import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SiCurseforge } from "react-icons/si";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, ChevronDown } from "lucide-react";

interface DOMViewerProps {
  content: string;
  zoom: number;
  onElementSelect: (selector: string, isMultiSelect: boolean) => void;
  isSelectionMode: boolean;
  onSelectionModeChange: (mode: boolean) => void;
}

export default function DOMViewer({ content, zoom, onElementSelect, isSelectionMode, onSelectionModeChange }: DOMViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
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

    // Write content and wait for load
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <base href="https://en.wikipedia.org" />
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            * { 
              cursor: default !important;
              -webkit-tap-highlight-color: transparent !important;
              user-select: none !important;
              -webkit-touch-callout: none !important;
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
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `);
    doc.close();

    // Store iframe scroll position
    let scrollX = 0;
    let scrollY = 0;

    const handleScroll = () => {
      scrollX = iframe.contentWindow?.scrollX || 0;
      scrollY = iframe.contentWindow?.scrollY || 0;
    };

    const restoreScroll = () => {
      if (iframe.contentWindow) {
        iframe.contentWindow.scrollTo(scrollX, scrollY);
      }
    };

    const handleElementSelect = (element: HTMLElement) => {
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

      // Restore scroll position
      restoreScroll();
    };

    const handleMouseOver = (e: MouseEvent) => {
      if (!isSelectionMode || isPressingRef.current) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'HTML' || target.tagName === 'BODY') return;

      if (!target.classList.contains('selected-element')) {
        target.classList.add('highlight-target');
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      if (!isSelectionMode || isPressingRef.current) return;
      const target = e.target as HTMLElement;
      if (!target.classList.contains('selected-element')) {
        target.classList.remove('highlight-target');
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (!isSelectionMode) return;
      e.preventDefault();
      e.stopPropagation();
      handleElementSelect(e.target as HTMLElement);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (!isSelectionMode) return;
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
          e.preventDefault();
          e.stopPropagation();
          handleElementSelect(target);
        }
      }, 500);
    };

    // Add event listeners
    doc.addEventListener('scroll', handleScroll);
    doc.addEventListener('mouseover', handleMouseOver, true);
    doc.addEventListener('mouseout', handleMouseOut, true);
    doc.addEventListener('click', handleClick, true);
    doc.addEventListener('touchstart', handleTouchStart);
    doc.addEventListener('contextmenu', (e) => e.preventDefault(), true);

    // Toggle selection mode class
    doc.body.classList.toggle('selectable', isSelectionMode);

    return () => {
      if (pressTimerRef.current) {
        clearTimeout(pressTimerRef.current);
      }
      // Clean up event listeners
      doc.removeEventListener('scroll', handleScroll);
      doc.removeEventListener('mouseover', handleMouseOver, true);
      doc.removeEventListener('mouseout', handleMouseOut, true);
      doc.removeEventListener('click', handleClick, true);
      doc.removeEventListener('touchstart', handleTouchStart);
      doc.removeEventListener('contextmenu', (e) => e.preventDefault());
    };
  }, [content, onElementSelect, isSelectionMode, isMultiSelect]);

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
              onSelectionModeChange(!isSelectionMode);
              if (!isSelectionMode) {
                setIsMultiSelect(false);
              }
              if (iframeRef.current?.contentDocument) {
                iframeRef.current.contentDocument.querySelectorAll('.selected-element, .highlight-target').forEach(el => {
                  el.classList.remove('selected-element', 'highlight-target');
                });
                setSelectedHTML("");
              }
            }}
            variant={isSelectionMode ? "destructive" : "default"}
          >
            <SiCurseforge className="mr-2 h-4 w-4" />
            {isSelectionMode ? "Cancel Selection" : "Select Element"}
          </Button>
        </div>
        {isSelectionMode && (
          <div className="text-sm text-muted-foreground">
            {window.matchMedia('(hover: none)').matches
              ? "Long press any element to select it"
              : "Click any element to select it"}
          </div>
        )}
      </div>

      <div className="w-full h-[calc(100vh-8rem)] overflow-auto bg-white">
        <iframe
          ref={iframeRef}
          className="w-full h-full border-0"
          sandbox="allow-same-origin allow-scripts allow-popups"
          style={{ width: '100%', height: '100%' }}
          title="DOM Preview"
        />
      </div>
    </div>
  );
}