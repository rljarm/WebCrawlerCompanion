import { useEffect, useRef } from "react";

interface DOMViewerProps {
  content: string;
  zoom: number;
  onElementSelect: (selector: string) => void;
}

export default function DOMViewer({ content, zoom, onElementSelect }: DOMViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

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
      * { cursor: pointer; }
      .highlighted { outline: 2px solid blue !important; }
    `;
    doc.head.appendChild(style);

    // Add interaction handlers
    const handleMouseOver = (e: MouseEvent) => {
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
      e.preventDefault();
      e.stopPropagation();
      const target = e.target as HTMLElement;
      if (target.tagName !== 'HTML' && target.tagName !== 'BODY') {
        const selector = generateSelector(target);
        onElementSelect(selector);
      }
    };

    doc.body.addEventListener('mouseover', handleMouseOver);
    doc.body.addEventListener('mouseout', handleMouseOut);
    doc.body.addEventListener('click', handleClick);

    // Cleanup
    return () => {
      doc.body.removeEventListener('mouseover', handleMouseOver);
      doc.body.removeEventListener('mouseout', handleMouseOut);
      doc.body.removeEventListener('click', handleClick);
    };
  }, [content, onElementSelect]);

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
          .filter(className => className !== 'highlighted')
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