import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SiCurseforge } from "react-icons/si";
import { Eye } from "lucide-react";

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
  const [previewElement, setPreviewElement] = useState<HTMLElement | null>(null);
  const contentRef = useRef(content);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);

  useEffect(() => {
    contentRef.current = content;
    // Only rewrite content when it actually changes
    if (content && iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        const scrollPosition = {
          x: iframeRef.current.contentWindow?.scrollX || 0,
          y: iframeRef.current.contentWindow?.scrollY || 0
        };

        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <base href="https://en.wikipedia.org/" />
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
                }
                .preview-element {
                  outline: 3px solid #eab308 !important;
                  background: rgba(234, 179, 8, 0.1) !important;
                }
                .selected-element {
                  outline: 3px solid #16a34a !important;
                  background: rgba(22, 163, 74, 0.1) !important;
                }
              </style>
            </head>
            <body>
              ${contentRef.current}
              <script>
                document.addEventListener('click', function(e) {
                  if (e.target.tagName === 'A') {
                    e.preventDefault();
                  }
                });
              </script>
            </body>
          </html>
        `);
        doc.close();

        if (iframeRef.current.contentWindow) {
          iframeRef.current.contentWindow.scrollTo(scrollPosition.x, scrollPosition.y);
        }
        setIsIframeLoaded(true);
      }
    }
  }, [content]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !isIframeLoaded) return;

    const doc = iframe.contentDocument;
    if (!doc) return;

    // Toggle selection mode class
    doc.body.classList.toggle('selectable', isSelectionMode);

    // Add event listeners
    const handleMouseOver = (e: MouseEvent) => {
      if (!isSelectionMode) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'HTML' || target.tagName === 'BODY') return;

      if (!target.classList.contains('preview-element') && !target.classList.contains('selected-element')) {
        target.classList.add('highlight-target');
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      if (!isSelectionMode) return;
      const target = e.target as HTMLElement;
      if (!target.classList.contains('preview-element') && !target.classList.contains('selected-element')) {
        target.classList.remove('highlight-target');
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (!isSelectionMode) return;
      e.preventDefault();
      e.stopPropagation();

      const target = e.target as HTMLElement;
      if (target.tagName === 'HTML' || target.tagName === 'BODY') return;

      // Remove highlight
      target.classList.remove('highlight-target');
      setPreviewElement(target);
    };

    doc.addEventListener('mouseover', handleMouseOver);
    doc.addEventListener('mouseout', handleMouseOut);
    doc.addEventListener('click', handleClick);
    doc.addEventListener('contextmenu', (e) => e.preventDefault());

    return () => {
      doc.removeEventListener('mouseover', handleMouseOver);
      doc.removeEventListener('mouseout', handleMouseOut);
      doc.removeEventListener('click', handleClick);
      doc.removeEventListener('contextmenu', (e) => e.preventDefault());
    };
  }, [isSelectionMode, isIframeLoaded]);

  const handleConfirmSelection = () => {
    if (!previewElement) return;

    const selector = generateSelector(previewElement);
    onElementSelect(selector, isMultiSelect);
    setSelectedHTML(previewElement.outerHTML);
    setPreviewElement(null);
  };

  const generateSelector = (element: HTMLElement): string => {
    let selector = element.tagName.toLowerCase();
    if (element.id) {
      selector += `#${element.id}`;
    } else if (element.classList.length > 0) {
      selector += `.${Array.from(element.classList)
        .filter(c => !['highlight-target', 'preview-element', 'selected-element', 'selectable'].includes(c))
        .join('.')}`;
    }
    return selector;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button
            onClick={() => onSelectionModeChange(!isSelectionMode)}
            variant={isSelectionMode ? "destructive" : "default"}
          >
            <SiCurseforge className="mr-2 h-4 w-4" />
            {isSelectionMode ? "Cancel Selection" : "Select Element"}
          </Button>
          {previewElement && (
            <Button
              onClick={handleConfirmSelection}
              variant="secondary"
            >
              <Eye className="mr-2 h-4 w-4" />
              Preview Selection
            </Button>
          )}
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
          sandbox="allow-same-origin allow-scripts"
          style={{ width: '100%', height: '100%' }}
          title="DOM Preview"
        />
      </div>
    </div>
  );
}