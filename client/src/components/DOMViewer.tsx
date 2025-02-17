import { useEffect, useRef } from "react";

interface DOMViewerProps {
  content: string;
  zoom: number;
  onElementSelect: (selector: string) => void;
}

export default function DOMViewer({ content, zoom, onElementSelect }: DOMViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current && content) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(content);
        doc.close();

        // Add interaction handlers
        doc.body.addEventListener('mouseover', (e) => {
          const target = e.target as HTMLElement;
          target.style.outline = '2px solid blue';
        });

        doc.body.addEventListener('mouseout', (e) => {
          const target = e.target as HTMLElement;
          target.style.outline = '';
        });

        doc.body.addEventListener('click', (e) => {
          e.preventDefault();
          const target = e.target as HTMLElement;
          const selector = generateSelector(target);
          onElementSelect(selector);
        });
      }
    }
  }, [content, onElementSelect]);

  useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.style.transform = `scale(${zoom})`;
      iframeRef.current.style.transformOrigin = 'top left';
    }
  }, [zoom]);

  const generateSelector = (element: HTMLElement): string => {
    const path: string[] = [];
    while (element.parentElement) {
      let selector = element.tagName.toLowerCase();
      if (element.id) {
        path.unshift(`#${element.id}`);
        break;
      } else if (element.className) {
        selector += `.${element.className.split(' ').join('.')}`;
      }
      path.unshift(selector);
      element = element.parentElement;
    }
    return path.join(' > ');
  };

  return (
    <div className="w-full h-[600px] overflow-auto bg-white">
      <iframe
        ref={iframeRef}
        className="w-full h-full border-0"
        sandbox="allow-same-origin"
        title="DOM Preview"
      />
    </div>
  );
}
